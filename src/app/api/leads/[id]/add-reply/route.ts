import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildClaudePrompt } from '@/lib/claude'
import { NextRequest, NextResponse } from 'next/server'

const MODEL = 'claude-sonnet-4-6'
const INPUT_COST  = 3.0
const OUTPUT_COST = 15.0

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { body, subject, channel = 'EMAIL' } = await req.json()
    if (!body) return NextResponse.json({ success: false, error: 'body required' }, { status: 400 })

    const supabase = await createClient()

    // Insert conversation record
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({ lead_id: params.id, channel, direction: 'RECEIVED', subject: subject ?? null, body, sent_at: new Date().toISOString() })
      .select('id').single()

    if (convErr) return NextResponse.json({ success: false, error: convErr.message }, { status: 500 })

    // Fetch lead context
    const { data: lead } = await supabase
      .from('leads').select('*, companies(name)').eq('id', params.id).single()

    // Classify sentiment via Claude
    let sentiment = 'NEUTRAL'
    let classificationError: string | null = null

    try {
      const prompt = await buildClaudePrompt('CLASSIFY_REPLY', {
        reply_body: body,
        lead: { name: `${lead?.first_name ?? ''} ${lead?.last_name ?? ''}`, title: lead?.title, company: (lead?.companies as any)?.name },
      })

      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
      const start = Date.now()
      const response = await client.messages.create({
        model: MODEL, max_tokens: 300,
        system: prompt.system,
        messages: prompt.messages as Anthropic.MessageParam[],
      })
      const raw = response.content[0].type === 'text' ? response.content[0].text : ''
      const match = raw.match(/\{[\s\S]*\}/)
      const parsed = match ? JSON.parse(match[0]) : null
      if (parsed?.sentiment) sentiment = parsed.sentiment

      // Log to scoring_runs
      const inputTokens = response.usage.input_tokens
      const outputTokens = response.usage.output_tokens
      await supabase.from('scoring_runs').insert({
        lead_id: params.id, run_type: 'REPLY_CLASSIFICATION',
        input_tokens: inputTokens, output_tokens: outputTokens,
        api_cost_usd: (inputTokens * INPUT_COST + outputTokens * OUTPUT_COST) / 1_000_000,
        duration_ms: Date.now() - start, success: true, raw_response: parsed,
      })

      // Update conversation with sentiment
      await supabase.from('conversations').update({ sentiment, classified_at: new Date().toISOString() }).eq('id', conv?.id)
    } catch (e) {
      classificationError = e instanceof Error ? e.message : 'classification failed'
    }

    // Update lead reply stats
    const { data: countData } = await supabase
      .from('conversations').select('id', { count: 'exact', head: true })
      .eq('lead_id', params.id).eq('direction', 'RECEIVED')
    const replyCount = (countData as any)?.count ?? 1

    await supabase.from('leads').update({
      last_reply_at: new Date().toISOString(),
      reply_sentiment: sentiment,
      reply_count: replyCount,
      status: 'RESPONDED',
    }).eq('id', params.id)

    return NextResponse.json({ success: true, sentiment, classification_error: classificationError })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}
