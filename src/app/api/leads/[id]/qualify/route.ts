import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildClaudePrompt } from '@/lib/claude'
import { NextRequest, NextResponse } from 'next/server'

const MODEL = 'claude-sonnet-4-6'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Return Claude suggestions for the qualification card
  try {
    const supabase = await createClient()
    const { data: lead } = await supabase
      .from('leads').select('*, companies(*)').eq('id', params.id).single()
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    const { data: convs } = await supabase
      .from('conversations').select('body, direction, sent_at, sentiment')
      .eq('lead_id', params.id).order('sent_at', { ascending: false }).limit(5)

    const latestReply = convs?.find(c => c.direction === 'RECEIVED')

    const prompt = await buildClaudePrompt('SUGGEST_QUALIFICATION', {
      lead: { first_name: lead.first_name, last_name: lead.last_name, title: lead.title, email: lead.email, linkedin_url: lead.linkedin_url, source_signal: lead.source_signal, score_reasoning: lead.score_reasoning },
      company: lead.companies ? { name: (lead.companies as any).name, country: (lead.companies as any).country, segment: (lead.companies as any).segment, sponsorship_evidence: (lead.companies as any).sponsorship_evidence } : null,
      latest_reply: latestReply?.body ?? null,
      reply_sentiment: lead.reply_sentiment,
      icp_score: lead.icp_score,
      segment: lead.segment,
    })

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const response = await client.messages.create({
      model: MODEL, max_tokens: 1000,
      system: prompt.system,
      messages: prompt.messages as Anthropic.MessageParam[],
    })
    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    const match = raw.match(/\{[\s\S]*\}/)
    const parsed = match ? JSON.parse(match[0]) : {}

    return NextResponse.json({ success: true, suggestions: parsed, latest_reply: latestReply?.body })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const supabase = await createClient()

    const { error: qErr } = await supabase.from('qualifications').insert({
      lead_id: params.id,
      budget_signal: body.budget_signal ?? null,
      budget_notes: body.budget_notes ?? null,
      decision_maker: body.decision_maker ?? null,
      decision_maker_notes: body.decision_maker_notes ?? null,
      pain_identified: body.pain_identified ?? null,
      pain_notes: body.pain_notes ?? null,
      timeline_indicated: body.timeline_indicated ?? null,
      timeline_notes: body.timeline_notes ?? null,
      competitor_in_play: body.competitor_in_play ?? null,
      competitor_notes: body.competitor_notes ?? null,
      suggested_ae: body.suggested_ae ?? null,
      handoff_notes: body.handoff_notes ?? null,
      qualified: body.qualification_status === 'QUALIFIED',
      qualification_status: body.qualification_status ?? 'PENDING',
      pushed_to_hubspot: false,
    })

    if (qErr) return NextResponse.json({ success: false, error: qErr.message }, { status: 500 })

    // Update lead status
    const newStatus = body.qualification_status === 'QUALIFIED' ? 'QUALIFIED' : body.qualification_status === 'NOT_QUALIFIED' ? 'REJECTED' : 'RESPONDED'
    await supabase.from('leads').update({ status: newStatus, qualification_status: body.qualification_status }).eq('id', params.id)

    return NextResponse.json({ success: true, status: newStatus })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}
