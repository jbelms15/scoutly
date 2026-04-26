import { createClient } from '@/lib/supabase/server'

export type TaskType =
  | 'SCORE_LEAD'
  | 'GENERATE_FIRST_LINE'
  | 'GENERATE_FULL_EMAIL'
  | 'CLASSIFY_REPLY'
  | 'RESEARCH_COMPANY'

export type ClaudeMessage = { role: 'user' | 'assistant'; content: string }

export type ClaudePromptResult = {
  system: string
  messages: ClaudeMessage[]
  kb_snapshot: {
    segments: number
    products: number
    proof_points: number
    competitors: number
    copy_prefs: number
  }
}

export async function buildKBContext() {
  const supabase = await createClient()

  const [
    { data: segments },
    { data: products },
    { data: proofPoints },
    { data: competitors },
    { data: copyPrefs },
  ] = await Promise.all([
    supabase.from('kb_icp_segments').select('*').eq('active', true).order('sort_order'),
    supabase.from('kb_products').select('*').eq('active', true).order('sort_order'),
    supabase.from('kb_proof_points').select('*').eq('active', true).order('sort_order'),
    supabase.from('kb_competitors').select('*').eq('active', true),
    supabase.from('kb_copy_preferences').select('*').eq('active', true),
  ])

  return {
    segments: segments ?? [],
    products: products ?? [],
    proofPoints: proofPoints ?? [],
    competitors: competitors ?? [],
    copyPrefs: copyPrefs ?? [],
  }
}

export type KBContext = Awaited<ReturnType<typeof buildKBContext>>

function getCopyPref(copyPrefs: KBContext['copyPrefs'], type: string): string {
  return copyPrefs.find(p => p.preference_type === type)?.preference_value ?? ''
}

function buildSystemPrompt(kb: KBContext, task: TaskType): string {
  const { segments, products, proofPoints, competitors, copyPrefs } = kb
  const lines: string[] = []

  lines.push('You are an AI prospecting assistant for Shikenso Analytics, a German AI-powered sponsorship measurement platform.')
  lines.push(`Today: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`)
  lines.push('')

  // Products
  lines.push('## SHIKENSO PRODUCTS')
  for (const p of products) {
    lines.push(`### ${p.product_name || p.name}`)
    if (p.description) lines.push(p.description)
    if (p.positioning_statement) lines.push(`Positioning: ${p.positioning_statement}`)
    if (p.target_segments) lines.push(`Target: ${p.target_segments}`)
    if (p.key_differentiators) lines.push(`Differentiators: ${p.key_differentiators}`)
    lines.push('')
  }

  // ICP Segments
  lines.push('## ICP SEGMENTS')
  for (const s of segments) {
    lines.push(`### ${s.segment_name}`)
    if (s.definition) lines.push(s.definition)
    if (s.pain_points) lines.push(`Pain points: ${s.pain_points}`)
    if (s.target_titles) lines.push(`Target titles: ${s.target_titles}`)
    if (s.priority_regions) lines.push(`Priority regions: ${s.priority_regions}`)
    if (s.priority_sports) lines.push(`Priority sports: ${s.priority_sports}`)
    if (s.example_companies) lines.push(`Examples: ${s.example_companies}`)
    if (s.min_company_size || s.max_company_size) lines.push(`Size: ${s.min_company_size ?? '?'}–${s.max_company_size ?? '?'} employees`)
    if (s.recommended_product) lines.push(`Recommended product: ${s.recommended_product}`)
    lines.push('')
  }

  // Proof points
  lines.push('## PROOF POINTS (use selectively — pick the most relevant for the segment)')
  for (const p of proofPoints) {
    const segments = p.best_segments ? ` [${p.best_segments}]` : ''
    lines.push(`- "${p.headline}"${p.full_context ? ` — ${p.full_context}` : ''}${segments}`)
  }
  lines.push('')

  // Competitors
  lines.push('## COMPETITOR AWARENESS')
  for (const c of competitors) {
    const name = c.competitor_name || c.name
    lines.push(`### ${name}${c.website ? ` (${c.website})` : ''}`)
    if (c.positioning_notes) lines.push(c.positioning_notes)
    const diff = c.shikenso_differentiation || c.differentiation
    if (diff) lines.push(`Shikenso advantage: ${diff}`)
    if (c.when_likely_encountered) lines.push(`When encountered: ${c.when_likely_encountered}`)
    lines.push('')
  }

  // Copy preferences
  lines.push('## COPY PREFERENCES')
  const tone = getCopyPref(copyPrefs, 'TONE_DESCRIPTION')
  const use = getCopyPref(copyPrefs, 'WORDS_TO_USE')
  const avoid = getCopyPref(copyPrefs, 'WORDS_TO_AVOID')
  const opening = getCopyPref(copyPrefs, 'OPENING_STYLE')
  const cta = getCopyPref(copyPrefs, 'CTA_STYLE')
  const signoff = getCopyPref(copyPrefs, 'SIGN_OFF_FORMAT')
  if (tone) lines.push(`Tone: ${tone}`)
  if (use) lines.push(`Words to use: ${use}`)
  if (avoid) lines.push(`Words to avoid: ${avoid}`)
  if (opening) lines.push(`Opening style: ${opening}`)
  if (cta) lines.push(`CTA style: ${cta}`)
  if (signoff) lines.push(`Sign-off: ${signoff}`)
  lines.push('')

  // Task-specific instructions
  if (task === 'SCORE_LEAD') {
    lines.push('## YOUR TASK: SCORE THIS LEAD')
    lines.push('Analyze the lead and return a JSON object. No prose before or after the JSON.')
    lines.push('')
    lines.push('Return exactly:')
    lines.push('{')
    lines.push('  "segment": "Rights Holder | Brand | Agency | Club | Unknown",')
    lines.push('  "icp_score": 0-100,')
    lines.push('  "score_reasoning": "2-3 sentence plain English explanation of the score",')
    lines.push('  "signal_strength": "HIGH | MEDIUM | LOW",')
    lines.push('  "signal_explanation": "why this lead is relevant RIGHT NOW based on the signal",')
    lines.push('  "recommended_campaign": "Lemlist campaign name to use",')
    lines.push('  "recommended_product": "Sports | Esports | Campaign",')
    lines.push('  "priority": "HOT | WARM | COLD",')
    lines.push('  "disqualify": false,')
    lines.push('  "disqualify_reason": ""')
    lines.push('}')
    lines.push('')
    lines.push('HOT priority: Tier 1 account signal, active sponsorships, hiring for partnerships, just announced a deal.')
    lines.push('HIGH score (80+): Active sponsorships, European base, 50+ employees, sports/esports industry.')
    lines.push('LOW score (<50): No visible sponsorship, B2C only, <10 employees, outside sports/esports entirely.')
  }

  if (task === 'GENERATE_FIRST_LINE') {
    lines.push('## YOUR TASK: WRITE A SIGNAL-AWARE OPENING LINE')
    lines.push('Write exactly one opening paragraph (max 2 sentences) that:')
    lines.push('- References WHY we are reaching out RIGHT NOW using the signal context provided')
    lines.push('- Does NOT start with "I" or "We"')
    lines.push('- Sounds human, not templated')
    lines.push('- Proves you know the company and the industry')
    lines.push('Return only the text. No quotes, no subject line, no sign-off.')
  }

  if (task === 'GENERATE_FULL_EMAIL') {
    lines.push('## YOUR TASK: WRITE A COMPLETE OUTREACH EMAIL')
    lines.push('Write a full cold email. Keep total body under 150 words.')
    lines.push('Return as JSON:')
    lines.push('{ "subject": "...", "body": "...", "linkedin_variant": "..." }')
    lines.push('')
    lines.push('Subject: concise, reference the signal, no clickbait.')
    lines.push('Body: signal-aware opener → value prop (segment-specific, pick 1-2 proof points) → CTA (30-min call, this week/next week).')
    lines.push('LinkedIn variant: shorter, more casual, same hook, under 80 words.')
  }

  if (task === 'CLASSIFY_REPLY') {
    lines.push('## YOUR TASK: CLASSIFY THIS EMAIL REPLY')
    lines.push('Classify as one of: POSITIVE_INTEREST | OBJECTION_PRICE | OBJECTION_TIMING | OBJECTION_NOT_RELEVANT | MEETING_BOOKED | UNSUBSCRIBE | OUT_OF_OFFICE | OTHER')
    lines.push('Return JSON: { "classification": "...", "reasoning": "1 sentence", "suggested_response": "..." }')
  }

  if (task === 'RESEARCH_COMPANY') {
    lines.push('## YOUR TASK: RESEARCH AND ASSESS THIS COMPANY')
    lines.push('Based on the company information provided, assess:')
    lines.push('1. Do they have active sports/esports sponsorships? (YES/LIKELY/UNCLEAR/NO)')
    lines.push('2. Which ICP segment do they fit?')
    lines.push('3. Signal strength for Shikenso outreach (HIGH/MEDIUM/LOW)')
    lines.push('Return JSON: { "sponsorship_activity": "...", "segment": "...", "signal_strength": "...", "reasoning": "2-3 sentences" }')
  }

  return lines.join('\n')
}

export async function buildClaudePrompt(
  task: TaskType,
  context?: Record<string, unknown>
): Promise<ClaudePromptResult> {
  const kb = await buildKBContext()
  const system = buildSystemPrompt(kb, task)

  const userMessage = context
    ? `Here is the context for this task:\n\n${JSON.stringify(context, null, 2)}`
    : 'No additional context provided — use general Shikenso knowledge base only.'

  return {
    system,
    messages: [{ role: 'user', content: userMessage }],
    kb_snapshot: {
      segments: kb.segments.length,
      products: kb.products.length,
      proof_points: kb.proofPoints.length,
      competitors: kb.competitors.length,
      copy_prefs: kb.copyPrefs.length,
    },
  }
}
