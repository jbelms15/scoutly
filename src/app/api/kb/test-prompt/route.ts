import { buildClaudePrompt } from '@/lib/claude'
import { NextResponse } from 'next/server'

const MOCK_LEAD = {
  company: 'Acme Sports League',
  first_name: 'Max',
  last_name: 'Mustermann',
  title: 'Head of Partnerships',
  country: 'Germany',
  industry: 'Sports & Entertainment',
  company_size: '200',
  website: 'acmesportsleague.de',
  signal_context: 'Posted a LinkedIn job for a "Sponsorship Manager" — suggests active commercial expansion',
  signal_type: 'LinkedIn Jobs',
  signal_fired_at: new Date().toISOString(),
}

export async function GET() {
  try {
    const prompt = await buildClaudePrompt('SCORE_LEAD', MOCK_LEAD)

    return NextResponse.json({
      status: 'ok',
      task: 'SCORE_LEAD',
      kb_loaded: prompt.kb_snapshot,
      system_prompt_chars: prompt.system.length,
      system_prompt_sections: prompt.system.split('##').length - 1,
      messages: prompt.messages,
      full_system_prompt: prompt.system,
    })
  } catch (err) {
    return NextResponse.json(
      { status: 'error', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
