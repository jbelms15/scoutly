import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

export async function GET() {
  const checks: Record<string, unknown> = {}

  // 1. Check env var
  const apiKey = process.env.ANTHROPIC_API_KEY
  checks.api_key_present = !!apiKey
  checks.api_key_prefix  = apiKey ? apiKey.slice(0, 12) + '...' : 'MISSING'

  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not set in Vercel environment variables', checks })
  }

  // 2. Test minimal Claude call
  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Reply with only the word: OK' }],
    })
    checks.claude_response = response.content[0].type === 'text' ? response.content[0].text : 'no text'
    checks.model_used      = response.model
    checks.input_tokens    = response.usage.input_tokens
    checks.output_tokens   = response.usage.output_tokens
    return NextResponse.json({ status: 'ok', checks })
  } catch (err) {
    checks.claude_error = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ status: 'error', checks }, { status: 500 })
  }
}
