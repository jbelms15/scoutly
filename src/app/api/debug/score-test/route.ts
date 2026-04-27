import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { buildClaudePrompt } from '@/lib/claude'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const leadId = req.nextUrl.searchParams.get('lead_id')
  const checks: Record<string, unknown> = {}

  // 1. Claude API connectivity
  const apiKey = process.env.ANTHROPIC_API_KEY
  checks.api_key_present = !!apiKey
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY missing', checks })

  try {
    const client = new Anthropic({ apiKey })
    const ping = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Reply: OK' }],
    })
    checks.claude_ping = ping.content[0].type === 'text' ? ping.content[0].text.trim() : 'no text'
  } catch (e) {
    checks.claude_error = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: 'Claude API failed', checks })
  }

  // 2. Supabase connectivity + KB context
  try {
    const supabase = await createClient()
    const [{ data: segs }, { data: prods }, { data: prefs }] = await Promise.all([
      supabase.from('kb_icp_segments').select('id, segment_name').eq('active', true),
      supabase.from('kb_products').select('id, name').eq('active', true),
      supabase.from('kb_copy_preferences').select('id').eq('active', true),
    ])
    checks.kb_segments     = segs?.length ?? 0
    checks.kb_products     = prods?.length ?? 0
    checks.kb_copy_prefs   = prefs?.length ?? 0
    checks.kb_note         = (segs?.length ?? 0) === 0 ? 'WARNING: KB tables empty — scoring prompt will have no context' : 'OK'
  } catch (e) {
    checks.supabase_error = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: 'Supabase query failed', checks })
  }

  // 3. If lead_id provided, run full scoring on it
  if (leadId) {
    try {
      const supabase = await createClient()
      const { data: lead, error: leadErr } = await supabase
        .from('leads').select('*, companies(*)').eq('id', leadId).single()

      if (leadErr || !lead) {
        checks.lead_error = leadErr?.message ?? 'Lead not found'
        return NextResponse.json({ error: 'Lead not found', checks })
      }

      checks.lead_found = `${lead.first_name} ${lead.last_name} at ${(lead.companies as any)?.name}`

      // Build prompt
      const prompt = await buildClaudePrompt('SCORE_LEAD', {
        lead: { first_name: lead.first_name, last_name: lead.last_name, title: lead.title,
          linkedin_url: lead.linkedin_url, email: lead.email,
          source_type: lead.source_type, source_warmth: lead.source_warmth,
          source_signal: lead.source_signal },
        company: lead.companies ? {
          name: (lead.companies as any).name,
          country: (lead.companies as any).country,
          segment: (lead.companies as any).segment,
          target_tier: (lead.companies as any).target_tier,
        } : null,
      })
      checks.prompt_system_chars = prompt.system.length
      checks.kb_snapshot         = prompt.kb_snapshot

      // Call Claude
      const client = new Anthropic({ apiKey })
      const start = Date.now()
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: prompt.system,
        messages: prompt.messages as Anthropic.MessageParam[],
      })
      checks.claude_duration_ms = Date.now() - start
      checks.input_tokens  = response.usage.input_tokens
      checks.output_tokens = response.usage.output_tokens

      const raw = response.content[0].type === 'text' ? response.content[0].text : ''
      checks.raw_response_preview = raw.slice(0, 300)

      // Parse JSON
      try {
        const match = raw.match(/\{[\s\S]*\}/)
        const parsed = JSON.parse(match?.[0] ?? raw)
        checks.parsed_segment   = parsed.segment
        checks.parsed_icp_score = parsed.icp_score
        checks.parsed_priority  = parsed.priority
        checks.parse_success    = true
      } catch {
        checks.parse_success = false
        checks.parse_error   = 'JSON parse failed — Claude returned non-JSON'
      }

      // Check if scoring_runs table exists
      const { error: srErr } = await supabase
        .from('scoring_runs').select('id').limit(1)
      checks.scoring_runs_table = srErr ? `ERROR: ${srErr.message}` : 'OK'

      // Check new lead columns exist
      const { data: colCheck } = await supabase
        .from('leads').select('fit_score, intent_score, reachability_score, enrichment_status').eq('id', leadId).single()
      checks.new_columns_accessible = colCheck !== null

    } catch (e) {
      checks.full_score_error = e instanceof Error ? e.message : String(e)
    }
  } else {
    checks.hint = 'Add ?lead_id=YOUR_LEAD_UUID to test full scoring on a specific lead'
  }

  // 4. Check recent scoring_runs
  try {
    const supabase = await createClient()
    const { data: runs } = await supabase
      .from('scoring_runs').select('lead_id, success, error_message, created_at')
      .order('created_at', { ascending: false }).limit(5)
    checks.recent_scoring_runs = runs ?? []
  } catch (e) {
    checks.scoring_runs_error = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json({ status: 'ok', checks }, { headers: { 'Content-Type': 'application/json' } })
}
