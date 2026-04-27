import { createClient } from '@/lib/supabase/server'

export type TaskType =
  | 'SCORE_LEAD'
  | 'GENERATE_FIRST_LINE'
  | 'GENERATE_FULL_EMAIL'
  | 'CLASSIFY_REPLY'
  | 'RESEARCH_COMPANY'
  | 'ENRICH_COMPANY'
  | 'SUGGEST_QUALIFICATION'

export type ClaudeMessage = { role: 'user' | 'assistant'; content: string }

export type ClaudePromptResult = {
  system: string
  messages: ClaudeMessage[]
  kb_snapshot: {
    segments:      number
    modules:       number
    channels:      number
    proof_points:  number
    competitors:   number
    copy_prefs:    number
    geo_tiers:     number
    pain_points:   number
    objections:    number
    framing_rules: number
  }
}

export async function buildKBContext() {
  const supabase = await createClient()

  const [
    { data: segments },
    { data: modules },
    { data: channels },
    { data: proofPoints },
    { data: competitors },
    { data: copyPrefs },
    { data: geoPriorities },
    { data: painPoints },
    { data: objections },
    { data: framingRules },
    { data: convPatterns },
  ] = await Promise.all([
    supabase.from('kb_icp_segments').select('*').eq('active', true).order('sort_order'),
    supabase.from('kb_modules').select('*').eq('active', true).order('sort_order'),
    supabase.from('kb_channels').select('*').eq('active', true).order('sort_order'),
    supabase.from('kb_proof_points').select('*').eq('active', true).order('sort_order'),
    supabase.from('kb_competitors').select('*').eq('active', true),
    supabase.from('kb_copy_preferences').select('*').eq('active', true),
    supabase.from('kb_geographic_priorities').select('*').eq('active', true).order('sort_order'),
    supabase.from('kb_pain_points').select('*').eq('active', true).order('sort_order'),
    supabase.from('kb_objections').select('*').eq('active', true).order('sort_order'),
    supabase.from('kb_framing_rules').select('*').eq('active', true).order('sort_order'),
    supabase.from('kb_conversation_patterns').select('*').eq('active', true).order('sort_order'),
  ])

  return {
    segments:      segments      ?? [],
    modules:       modules       ?? [],
    channels:      channels      ?? [],
    proofPoints:   proofPoints   ?? [],
    competitors:   competitors   ?? [],
    copyPrefs:     copyPrefs     ?? [],
    geoPriorities: geoPriorities ?? [],
    painPoints:    painPoints    ?? [],
    objections:    objections    ?? [],
    framingRules:  framingRules  ?? [],
    convPatterns:  convPatterns  ?? [],
  }
}

export type KBContext = Awaited<ReturnType<typeof buildKBContext>>

function getCopyPref(copyPrefs: KBContext['copyPrefs'], type: string): string {
  return copyPrefs.find(p => p.preference_type === type)?.preference_value ?? ''
}

function buildSystemPrompt(kb: KBContext, task: TaskType): string {
  const { segments, modules, channels, proofPoints, competitors, copyPrefs,
          geoPriorities, painPoints, objections, framingRules, convPatterns } = kb
  const lines: string[] = []

  lines.push('You are an AI prospecting assistant for Shikenso Analytics, a German AI-powered sponsorship measurement platform.')
  lines.push(`Today: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`)
  lines.push('')

  // ── Modules + Channels ────────────────────────────────────────────────────────
  if (modules.length > 0 || channels.length > 0) {
    lines.push('## SHIKENSO PRODUCTS & CHANNELS')
    lines.push('Shikenso sells 3 products: Sports Analytics, Esports Analytics, Campaign Measurement.')
    lines.push('Underneath these products are 6 measurement channels: Video/Broadcast, Social, Audio, On-site/LED, Print/Press, Chat.')
    lines.push('IMPORTANT: The specific channel inclusion per product is being confirmed with the product team. Do NOT assume a channel belongs to a specific product.')
    lines.push('')
    for (const m of modules) {
      lines.push(`### Product: ${m.product_name || m.name}`)
      if (m.description) lines.push(m.description)
      if (m.positioning_statement) lines.push(`Positioning: ${m.positioning_statement}`)
      if (m.target_segments) lines.push(`Target: ${m.target_segments}`)
      if (m.key_differentiators) lines.push(`Differentiators: ${m.key_differentiators}`)
      lines.push('')
    }
    if (channels.length > 0) {
      lines.push('### Measurement Channels (6 total):')
      for (const c of channels) {
        lines.push(`- **${c.channel_name}**: ${c.description ?? ''}${c.differentiation_note ? ` (Differentiator: ${c.differentiation_note})` : ''}`)
      }
      lines.push('')
    }
  }

  // ── ICP Segments ─────────────────────────────────────────────────────────────
  lines.push('## ICP SEGMENTS')
  for (const s of segments) {
    lines.push(`### ${s.segment_name}`)
    if (s.definition) lines.push(s.definition)
    if (s.buyer_psyche_one_liner) lines.push(`Buyer psyche: ${s.buyer_psyche_one_liner}`)
    if (s.framing_rule) lines.push(`Framing rule: ${s.framing_rule}`)
    if (s.criteria) lines.push(`Criteria: ${s.criteria}`)
    if (s.pain_points) lines.push(`Pain points: ${s.pain_points}`)
    if (s.target_titles) lines.push(`Target titles (text): ${s.target_titles}`)
    if (s.target_title_array?.length) lines.push(`Target titles: ${s.target_title_array.join(', ')}`)
    if (s.do_not_target_titles?.length) lines.push(`DO NOT TARGET titles: ${s.do_not_target_titles.join(', ')}`)
    if (s.typical_deal_size) lines.push(`Typical deal size: ${s.typical_deal_size}`)
    if (s.why_they_buy_us) lines.push(`Why they buy us: ${s.why_they_buy_us}`)
    if (s.priority_regions) lines.push(`Priority regions: ${s.priority_regions}`)
    if (s.priority_sports) lines.push(`Priority sports: ${s.priority_sports}`)
    if (s.example_companies) lines.push(`Examples: ${s.example_companies}`)
    if (s.min_company_size || s.max_company_size) lines.push(`Size: ${s.min_company_size ?? '?'}–${s.max_company_size ?? '?'} employees`)
    if (s.recommended_product) lines.push(`Recommended module: ${s.recommended_product}`)
    lines.push('')
  }

  // ── Geographic Priorities ────────────────────────────────────────────────────
  if (geoPriorities.length > 0) {
    lines.push('## GEOGRAPHIC PRIORITIES')
    for (const g of geoPriorities) {
      lines.push(`### ${g.tier_name} — ${g.tier_label} (score multiplier: ×${g.score_multiplier})`)
      if (g.countries?.length) lines.push(`Countries: ${g.countries.join(', ')}`)
      if (g.regions?.length) lines.push(`Regions: ${g.regions.join(', ')}`)
      if (g.rationale) lines.push(`Rationale: ${g.rationale}`)
      lines.push('')
    }
  }

  // ── Framing Rules ─────────────────────────────────────────────────────────────
  if (framingRules.length > 0 && (task === 'SCORE_LEAD' || task === 'GENERATE_FULL_EMAIL' || task === 'GENERATE_FIRST_LINE')) {
    lines.push('## FRAMING RULES BY SEGMENT')
    for (const f of framingRules) {
      lines.push(`### ${f.rule_name} (${f.target_segment})`)
      lines.push(`Core frame: ${f.core_frame}`)
      if (f.opening_hook) lines.push(`Opening hook: ${f.opening_hook}`)
      if (f.value_angle) lines.push(`Value angle: ${f.value_angle}`)
      if (f.proof_point_focus) lines.push(`Lead proof point: ${f.proof_point_focus}`)
      lines.push('')
    }
  }

  // ── Pain Points (for scoring and qualification tasks) ─────────────────────────
  if (painPoints.length > 0 && (task === 'SCORE_LEAD' || task === 'SUGGEST_QUALIFICATION')) {
    lines.push('## PAIN POINTS LIBRARY')
    for (const p of painPoints) {
      lines.push(`[${p.category}] ${p.pain_title}`)
      if (p.pain_description) lines.push(`  ${p.pain_description}`)
      if (p.our_solution) lines.push(`  Solution: ${p.our_solution}`)
    }
    lines.push('')
  }

  // ── Objections (for qualification tasks) ─────────────────────────────────────
  if (objections.length > 0 && task === 'SUGGEST_QUALIFICATION') {
    lines.push('## OBJECTION LIBRARY')
    for (const o of objections) {
      lines.push(`[${o.objection_category}] "${o.objection_text}"`)
      lines.push(`  Reframe: ${o.reframe}`)
      lines.push(`  Short response: ${o.response_short}`)
      if (o.follow_up_question) lines.push(`  Follow-up: ${o.follow_up_question}`)
    }
    lines.push('')
  }

  // ── Conversation Patterns (for email generation tasks) ───────────────────────
  if (convPatterns.length > 0 && (task === 'GENERATE_FULL_EMAIL' || task === 'GENERATE_FIRST_LINE')) {
    const openingPattern = convPatterns.find(p => p.pattern_type === 'OPENING')
    if (openingPattern) {
      lines.push('## EMAIL OPENING FRAMEWORK')
      if (openingPattern.steps?.length) lines.push(openingPattern.steps.join('\n'))
      lines.push('')
    }
  }

  // ── Proof Points ──────────────────────────────────────────────────────────────
  lines.push('## PROOF POINTS')
  for (const p of proofPoints) {
    const segs = p.best_segments ? ` [${p.best_segments}]` : ''
    lines.push(`- "${p.headline}"${p.full_context ? ` — ${p.full_context}` : ''}${segs}`)
  }
  lines.push('')

  // ── Competitors ───────────────────────────────────────────────────────────────
  lines.push('## COMPETITOR AWARENESS')
  for (const c of competitors) {
    const name = c.competitor_name || c.name
    lines.push(`### ${name}${c.website ? ` (${c.website})` : ''}`)
    if (c.positioning_notes) lines.push(c.positioning_notes)
    const diff = c.shikenso_differentiation || c.differentiation
    if (diff) lines.push(`Shikenso advantage: ${diff}`)
    lines.push('')
  }

  // ── Copy Preferences ─────────────────────────────────────────────────────────
  lines.push('## COPY PREFERENCES')
  const tone    = getCopyPref(copyPrefs, 'TONE_DESCRIPTION')
  const use     = getCopyPref(copyPrefs, 'WORDS_TO_USE')
  const avoid   = getCopyPref(copyPrefs, 'WORDS_TO_AVOID')
  const opening = getCopyPref(copyPrefs, 'OPENING_STYLE')
  const cta     = getCopyPref(copyPrefs, 'CTA_STYLE')
  const signoff = getCopyPref(copyPrefs, 'SIGN_OFF_FORMAT')
  if (tone)    lines.push(`Tone: ${tone}`)
  if (use)     lines.push(`Words to use: ${use}`)
  if (avoid)   lines.push(`Words to avoid: ${avoid}`)
  if (opening) lines.push(`Opening style: ${opening}`)
  if (cta)     lines.push(`CTA style: ${cta}`)
  if (signoff) lines.push(`Sign-off: ${signoff}`)
  lines.push('')

  // ─── Task-specific instructions ──────────────────────────────────────────────

  if (task === 'SCORE_LEAD') {
    lines.push('## YOUR TASK: SCORE THIS LEAD')
    lines.push('')
    lines.push('Analyse the lead and company data. Return ONLY valid JSON — no prose, no markdown, no code fences.')
    lines.push('')
    lines.push('SCORING DIMENSIONS:')
    lines.push('- fit_score (0-100): How well does this company/person match our ICP? (industry, size, region, title)')
    lines.push('- intent_score (0-100): How strong is the signal that they need this NOW? (source warmth, signal freshness, signal type)')
    lines.push('- reachability_score (0-100): Can we actually contact them? (LinkedIn +30, verified email +50, unverified email +20, decision-maker title +20)')
    lines.push('- icp_score (0-100): Weighted average = (fit × 0.4) + (intent × 0.4) + (reachability × 0.2)')
    lines.push('')
    lines.push('GEOGRAPHIC WEIGHTING: Apply the geographic multiplier from the Geo Priorities above.')
    lines.push('  P1 countries/regions → fit_score × 1.2 (cap at 100)')
    lines.push('  P2 countries/regions → no adjustment')
    lines.push('  P3 countries/regions → fit_score × 0.5')
    lines.push('')
    lines.push('ESPORTS RULE: If the company is primarily an esports/gaming property with NO traditional sports component, cap fit_score at 60 for cold outbound (source_warmth = COLD).')
    lines.push('')
    lines.push('TITLE RULES: Check the lead title against the do_not_target_titles for their segment. If the title matches, set disqualified=true.')
    lines.push('Specialist title boost: if the lead title is a primary sponsorship/partnership title (Head of Sponsorship, Sponsorship Manager, Partnership Manager, Head of Partnerships), add +10 to fit_score.')
    lines.push('')
    lines.push('PRIORITY RULES:')
    lines.push('- icp_score >= 80 → HOT')
    lines.push('- icp_score 60-79 → WARM')
    lines.push('- icp_score 40-59 → COLD')
    lines.push('- icp_score < 40 OR clearly wrong target → DISQUALIFIED')
    lines.push('- If company.target_tier is TIER_1, minimum priority is WARM (never COLD)')
    lines.push('')
    lines.push('FRAMING: Include the applicable framing_rule name in your score_reasoning so the SDR knows which angle to use.')
    lines.push('')
    lines.push('Return exactly this JSON:')
    lines.push('{')
    lines.push('  "segment": "Rights Holder | Brand | Agency | Club & Team | Unknown",')
    lines.push('  "segment_confidence": "HIGH | MEDIUM | LOW",')
    lines.push('  "fit_score": 0-100,')
    lines.push('  "intent_score": 0-100,')
    lines.push('  "reachability_score": 0-100,')
    lines.push('  "icp_score": 0-100,')
    lines.push('  "priority": "HOT | WARM | COLD | DISQUALIFIED",')
    lines.push('  "score_reasoning": "2-3 sentence plain English explanation including framing rule to use",')
    lines.push('  "signal_strength": "HIGH | MEDIUM | LOW",')
    lines.push('  "signal_explanation": "Why this lead is worth contacting RIGHT NOW",')
    lines.push('  "recommended_campaign": "Which Lemlist campaign to use",')
    lines.push('  "recommended_product": "Sports | Esports | Campaign",')
    lines.push('  "disqualified": false,')
    lines.push('  "disqualification_reason": ""')
    lines.push('}')
  }

  if (task === 'ENRICH_COMPANY') {
    lines.push('## YOUR TASK: ENRICH THIS COMPANY')
    lines.push('')
    lines.push('Analyse the company name and website content. Return ONLY valid JSON.')
    lines.push('')
    lines.push('Return exactly this JSON:')
    lines.push('{')
    lines.push('  "description": "2-sentence company description",')
    lines.push('  "industry": "Industry classification",')
    lines.push('  "size_range": "1-10 | 11-50 | 51-200 | 201-500 | 501-1000 | 1000+",')
    lines.push('  "country": "Country name",')
    lines.push('  "region": "Europe | DACH | UK | BENELUX | etc.",')
    lines.push('  "sponsorship_activity": "YES | LIKELY | UNCLEAR | NO",')
    lines.push('  "sponsorship_evidence": "Direct quote or evidence from website showing sponsorship activity, or null",')
    lines.push('  "segment": "Rights Holder | Brand | Agency | Club & Team | Unknown"')
    lines.push('}')
    lines.push('')
    lines.push('Base your answer ONLY on the website content provided. If information is not available, use null or Unknown.')
  }

  if (task === 'GENERATE_FIRST_LINE') {
    lines.push('## YOUR TASK: WRITE A SIGNAL-AWARE OPENING LINE')
    lines.push('Write exactly one opening paragraph (max 2 sentences) that references WHY we are reaching out RIGHT NOW.')
    lines.push('Use the framing rule for their segment. Does NOT start with "I" or "We". Sounds human, not templated.')
    lines.push('Return only the text. No quotes, no subject line, no sign-off.')
  }

  if (task === 'GENERATE_FULL_EMAIL') {
    lines.push('## YOUR TASK: WRITE A COMPLETE OUTREACH EMAIL')
    lines.push('Keep total body under 150 words.')
    lines.push("Use the Email Opening Framework above. Apply the correct framing rule for the lead's segment.")
    lines.push('Return as JSON: { "subject": "...", "body": "...", "linkedin_variant": "..." }')
    lines.push('Subject: concise, reference the signal. Body: opener → value prop → CTA (20-min call).')
    lines.push('LinkedIn variant: shorter, casual, same hook, under 80 words.')
  }

  if (task === 'CLASSIFY_REPLY') {
    lines.push('## YOUR TASK: CLASSIFY THIS EMAIL REPLY')
    lines.push('Classify as one of:')
    lines.push('INTERESTED — wants to learn more, book a call, has questions')
    lines.push('NOT_NOW — interested but timing wrong, asks to follow up later')
    lines.push('NOT_FIT — clearly not a fit (wrong company, role, etc.)')
    lines.push('OOO — out of office auto-reply')
    lines.push('UNSUBSCRIBE — opt out, do not contact')
    lines.push('NEUTRAL — ambiguous, low signal')
    lines.push('Return ONLY JSON: { "sentiment": "...", "confidence": "HIGH|MEDIUM|LOW", "brief_reasoning": "1 sentence" }')
  }

  if (task === 'SUGGEST_QUALIFICATION') {
    lines.push('## YOUR TASK: SUGGEST QUALIFICATION SIGNALS')
    lines.push('')
    lines.push('Based on the lead, company, and latest reply, assess qualification signals using the BANT framework.')
    lines.push('Cross-reference the Pain Points Library above to identify which pains are evident from the reply.')
    lines.push('Cross-reference the Objection Library to flag any objections that may arise and suggest the pre-emptive response.')
    lines.push('Return ONLY valid JSON.')
    lines.push('')
    lines.push('Return exactly this JSON:')
    lines.push('{')
    lines.push('  "budget_signal": true/false,')
    lines.push('  "budget_notes": "evidence or lack of evidence for budget",')
    lines.push('  "decision_maker": true/false,')
    lines.push('  "decision_maker_notes": "why this person is/isnt the decision maker",')
    lines.push('  "pain_identified": true/false,')
    lines.push('  "pain_notes": "specific pain signals found in reply — quote the reply where possible",')
    lines.push('  "timeline_indicated": true/false,')
    lines.push('  "timeline_notes": "any timing signals from the reply",')
    lines.push('  "competitor_in_play": "competitor name if mentioned, or null",')
    lines.push('  "competitor_notes": "context if competitor mentioned and how to handle",')
    lines.push('  "likely_objections": ["list of objection categories likely to arise in next call"],')
    lines.push('  "objection_prep": "one-paragraph briefing on likely objections and suggested responses from the Objection Library",')
    lines.push('  "handoff_notes": "3-paragraph AE briefing: (1) how surfaced and pain identified, (2) what they said verbatim, (3) recommended angle + proof point + watch-outs",')
    lines.push('  "qualification_status": "QUALIFIED|NURTURE|NOT_QUALIFIED"')
    lines.push('}')
    lines.push('')
    lines.push('QUALIFIED = clear intent + reachable decision maker. NURTURE = interest but missing signals. NOT_QUALIFIED = clear disqualifier.')
  }

  if (task === 'RESEARCH_COMPANY') {
    lines.push('## YOUR TASK: RESEARCH AND ASSESS THIS COMPANY')
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
    : 'No additional context provided.'

  return {
    system,
    messages: [{ role: 'user', content: userMessage }],
    kb_snapshot: {
      segments:      kb.segments.length,
      modules:       kb.modules.length,
      channels:      kb.channels.length,
      proof_points:  kb.proofPoints.length,
      competitors:   kb.competitors.length,
      copy_prefs:    kb.copyPrefs.length,
      geo_tiers:     kb.geoPriorities.length,
      pain_points:   kb.painPoints.length,
      objections:    kb.objections.length,
      framing_rules: kb.framingRules.length,
    },
  }
}
