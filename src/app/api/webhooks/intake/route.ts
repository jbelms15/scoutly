import { ingestLead } from '@/lib/intake'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('X-Scoutly-Webhook-Secret')

  if (!secret) {
    return NextResponse.json({ error: 'Missing X-Scoutly-Webhook-Secret header' }, { status: 401 })
  }

  const supabase = await createClient()

  // Validate secret against webhook_configs
  const { data: config, error } = await supabase
    .from('webhook_configs')
    .select('*')
    .eq('secret', secret)
    .eq('active', true)
    .single()

  if (error || !config) {
    return NextResponse.json({ error: 'Invalid or inactive webhook secret' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Normalise Lemlist Watcher payload to RawLeadInput
  const raw = {
    first_name:       body.first_name as string | undefined,
    last_name:        body.last_name  as string | undefined,
    full_name:        body.full_name  as string | undefined,
    title:            body.title      as string | undefined,
    linkedin_url:     body.linkedin_url as string | undefined,
    email:            body.email      as string | undefined,
    company_name:     body.company_name as string | undefined,
    company_domain:   body.company_domain as string | undefined,
    internal_notes:   body.signal_context as string | undefined,
  }

  const source = {
    source_type:         config.source_type as any,
    source_warmth:       config.default_warmth as any,
    source_detail:       `Webhook: ${config.name}`,
    source_signal:       body.signal_context as string | undefined,
    source_signal_date:  body.signal_date as string | undefined,
  }

  const result = await ingestLead(raw, source)

  // Update webhook stats
  await supabase.from('webhook_configs').update({
    last_received_at: new Date().toISOString(),
    total_received:   config.total_received + 1,
  }).eq('id', config.id)

  return NextResponse.json(result)
}
