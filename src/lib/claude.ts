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
    deal_patterns: number
  }
}

// SDR meta-warning from Benedikt (SDR-0-README.md)
const SDR_META_WARNING = 'CRITICAL SDR RULE: "The single biggest mistake new SDRs make is opening every call as if the prospect needs educating on what measurement is — half of them don\'t, and they will hang up on you for it." (Benedikt Becker, SDR-0-README.md)'

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
    { data: dealPatterns },
  ] = await Promise.all([
    supabase.from('kb_icp_segments').select('*').eq('active', true).eq('archived', false).order('sort_order'),
    supabase.from('kb_modules').select('*').eq('active', true).eq('archived', false).order('sort_order'),
    supabase.from('kb_channels').select('*').eq('active', true).eq('archived', false).order('sort_order'),
    supabase.from('kb_proof_points').select('*').eq('active', true).eq('archived', false).order('sort_order'),
    supabase.from('kb_competitors').select('*').eq('active', true).eq('archived', false),
    supabase.from('kb_copy_preferences').select('*').eq('active', true),
    supabase.from('kb_geographic_priorities').select('*').eq('active', true).eq('archived', false).order('sort_order'),
    supabase.from('kb_pain_points').select('*').eq('active', true).eq('archived', false).order('sort_order'),
    supabase.from('kb_objections').select('*').eq('active', true).eq('archived', false).order('sort_order'),
    supabase.from('kb_framing_rules').select('*').eq('active', true).eq('archived', false).order('sort_order'),
    supabase.from('kb_conversation_patterns').select('*').eq('active', true).eq('archived', false).order('sort_order'),
    supabase.from('kb_deal_patterns').select('*').eq('active', true).eq('archived', false).order('sort_order'),
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
    dealPatterns:  dealPatterns  ?? [],
  }
}

export type KBContext = Awaited<ReturnType<typeof buildKBContext>>

function getCopyPref(copyPrefs: KBContext['copyPrefs'], type: string): string {
  return copyPrefs.find(p => p.preference_type === type)?.preference_value ?? ''
}

function buildSystemPrompt(kb: KBContext, task: TaskType): string {
  const { segments, modules, channels, proofPoints, competitors, copyPrefs,
          geoPriorities, painPoints, objections, framingRules, convPatterns, dealPatterns } = kb
  const lines: string[] = []

  lines.push('You are an AI prospecting assistant for Shikenso Analytics, a German AI-powered sponsorship measurement platform.')
  lines.push(`Today: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`)
  lines.push('')
  lines.push(SDR_META_WARNING)
  lines.push('')

  // ── Framing Rules (by segment) ────────────────────────────────────────────────
  if (framingRules.length > 0) {
    lines.push('## FRAMING RULES BY SEGMENT')
    lines.push('These determine HOW to open — not what to say, but what to assume about the prospect.')
    lines.push('')
    for (const f of framingRules) {
      const label = f.rule_label ? ` — ${f.rule_label}` : ''
      lines.push(`### ${f.rule_name}${label} (${f.target_segment})`)
      if (f.starting_state)   lines.push(`Starting state: ${f.starting_state}`)
      if (f.selling_motion)   lines.push(`Selling motion: ${f.selling_motion}`)
      if (f.copy_implication) lines.push(`Copy implication: ${f.copy_implication}`)
      // fallback to old columns
      if (!f.starting_state && f.core_frame)      lines.push(`Core frame: ${f.core_frame}`)
      if (!f.selling_motion  && f.opening_hook)   lines.push(`Opening hook: ${f.opening_hook}`)
      if (!f.copy_implication && f.proof_point_focus) lines.push(`Lead proof point: ${f.proof_point_focus}`)
      lines.push('')
    }
  }

  // ── ICP Segments ─────────────────────────────────────────────────────────────
  lines.push('## ICP SEGMENTS')
  for (const s of segments) {
    lines.push(`### ${s.segment_name}`)
    if (s.one_line_summary)         lines.push(`Summary: ${s.one_line_summary}`)
    if (s.buyer_psyche_one_liner)   lines.push(`Buyer psyche: ${s.buyer_psyche_one_liner}`)
    if (s.framing_rule)             lines.push(`Framing rule: ${s.framing_rule}`)
    if (s.definition)               lines.push(s.definition)
    if (s.why_they_buy_us_long_form) lines.push(`Why they buy us: ${s.why_they_buy_us_long_form}`)
    if (s.switch_story_legs?.length) {
      lines.push('Switch story legs:')
      s.switch_story_legs.forEach((leg: string, i: number) => lines.push(`  ${i + 1}. ${leg}`))
    }
    if (s.enrichment_caveat)        lines.push(`Enrichment caveat: ${s.enrichment_caveat}`)
    if (s.two_buyer_profiles)       lines.push(`Two buyer profiles: ${s.two_buyer_profiles}`)
    if (s.esports_outbound_rule)    lines.push(`Esports outbound rule: ${s.esports_outbound_rule}`)
    if (s.default_first_touch_titles?.length) lines.push(`First-touch titles: ${s.default_first_touch_titles.join(', ')}`)
    if (s.target_title_array?.length)         lines.push(`Target titles: ${s.target_title_array.join(', ')}`)
    if (s.specialist_titles?.length)          lines.push(`Specialist titles (high value): ${s.specialist_titles.join(', ')}`)
    if (s.influencer_titles?.length)          lines.push(`Parallel influencer titles: ${s.influencer_titles.join(', ')}`)
    if (s.do_not_target_titles?.length)       lines.push(`DO NOT TARGET titles: ${s.do_not_target_titles.join(', ')}`)
    if (s.c_suite_note)             lines.push(`C-suite note: ${s.c_suite_note}`)
    if (s.typical_deal_size)        lines.push(`Typical deal size: ${s.typical_deal_size}`)
    if (s.typical_deal_pattern)     lines.push(`Deal pattern: ${s.typical_deal_pattern}`)
    if (s.recommended_modules?.length) lines.push(`Recommended modules: ${s.recommended_modules.join(', ')}`)
    if (s.recommended_product)      lines.push(`Recommended module: ${s.recommended_product}`)
    if (s.priority_regions)         lines.push(`Priority regions: ${s.priority_regions}`)
    if (s.priority_sports)          lines.push(`Priority sports: ${s.priority_sports}`)
    if (s.example_companies)        lines.push(`Examples: ${s.example_companies}`)
    lines.push('')
  }

  // ── Geographic Priorities ─────────────────────────────────────────────────────
  if (geoPriorities.length > 0) {
    lines.push('## GEOGRAPHIC PRIORITIES')
    for (const g of geoPriorities) {
      lines.push(`### ${g.tier_name} — ${g.tier_label} (score multiplier: ×${g.score_multiplier})`)
      if (g.countries?.length) lines.push(`Countries: ${g.countries.join(', ')}`)
      if (g.regions?.length)   lines.push(`Regions: ${g.regions.join(', ')}`)
      if (g.priority_rationale) lines.push(`Rationale: ${g.priority_rationale}`)
      else if (g.rationale)     lines.push(`Rationale: ${g.rationale}`)
      lines.push('')
    }
  }

  // ── Deal Patterns ─────────────────────────────────────────────────────────────
  if (dealPatterns.length > 0 && (task === 'SCORE_LEAD' || task === 'SUGGEST_QUALIFICATION')) {
    lines.push('## DEAL ENTRY PATTERNS')
    for (const d of dealPatterns) {
      lines.push(`**${d.segment} — ${d.entry_pattern}**`)
      if (d.pattern_implications) lines.push(d.pattern_implications)
      if (d.reference_customer)   lines.push(`Reference: ${d.reference_customer}`)
      if (d.timeline)             lines.push(`Timeline: ${d.timeline}`)
      if (d.unusual_signals)      lines.push(`Watch for: ${d.unusual_signals}`)
      lines.push('')
    }
  }

  // ── Modules + Channels ────────────────────────────────────────────────────────
  if (modules.length > 0 || channels.length > 0) {
    lines.push('## SHIKENSO PRODUCTS & CHANNELS')
    lines.push('Shikenso sells 3 products: Sports Analytics, Esports Analytics, Campaign Measurement.')
    lines.push('Underneath these products are 6 measurement channels: Video/Broadcast, Social, Audio, On-site/LED, Print/Press, Chat.')
    lines.push('IMPORTANT: The specific channel inclusion per product is being confirmed with the product team. Do NOT assume a channel belongs to a specific product.')
    lines.push('')
    for (const m of modules) {
      lines.push(`### Product: ${m.product_name || m.name}`)
      if (m.description)           lines.push(m.description)
      if (m.positioning_statement) lines.push(`Positioning: ${m.positioning_statement}`)
      lines.push('')
    }
    if (channels.length > 0) {
      lines.push('### Measurement Channels (6 total):')
      for (const c of channels) {
        lines.push(`- **${c.channel_name}**: ${c.description ?? ''}${c.differentiation_note ? ` (${c.differentiation_note})` : ''}`)
      }
      lines.push('')
    }
  }

  // ── Pain Points ───────────────────────────────────────────────────────────────
  if (painPoints.length > 0 && (task === 'SCORE_LEAD' || task === 'SUGGEST_QUALIFICATION')) {
    lines.push('## PAIN POINTS LIBRARY')
    for (const p of painPoints) {
      lines.push(`[${p.pain_category ?? p.category}] ${p.pain_title}`)
      if (p.prospect_language)  lines.push(`  Prospect says: "${p.prospect_language}"`)
      if (p.pain_description)   lines.push(`  ${p.pain_description}`)
      if (p.our_solution)       lines.push(`  Solution: ${p.our_solution}`)
    }
    lines.push('')
  }

  // ── Objections ────────────────────────────────────────────────────────────────
  if (objections.length > 0 && task === 'SUGGEST_QUALIFICATION') {
    lines.push('## OBJECTION LIBRARY')
    for (const o of objections) {
      lines.push(`[${o.objection_category}] "${o.objection_text}"`)
      lines.push(`  Reframe: ${o.reframe}`)
      lines.push(`  Short response: ${o.response_short}`)
      if (o.follow_up_question) lines.push(`  Follow-up: ${o.follow_up_question}`)
      if (o.escalation_path)    lines.push(`  Escalation: ${o.escalation_path}`)
    }
    lines.push('')
  }

  // ── Conversation Patterns ─────────────────────────────────────────────────────
  if (convPatterns.length > 0 && (task === 'GENERATE_FULL_EMAIL' || task === 'GENERATE_FIRST_LINE')) {
    const openingPattern = convPatterns.find((p: Record<string, unknown>) => p.pattern_type === 'OPENING')
    if (openingPattern) {
      lines.push('## EMAIL OPENING FRAMEWORK')
      const steps = openingPattern.steps as string[] | undefined
      if (steps?.length) lines.push(steps.join('\n'))
      lines.push('')
    }
  }

  // ── Proof Points ──────────────────────────────────────────────────────────────
  if (proofPoints.length > 0) {
    lines.push('## PROOF POINTS')
    for (const p of proofPoints) {
      const segs = p.best_segments ? ` [${p.best_segments}]` : ''
      lines.push(`- "${p.headline}"${p.full_context ? ` — ${p.full_context}` : ''}${segs}`)
    }
    lines.push('')
  }

  // ── Competitors ───────────────────────────────────────────────────────────────
  if (competitors.length > 0) {
    lines.push('## COMPETITOR AWARENESS')
    for (const c of competitors) {
      const name = c.competitor_name || c.name
      lines.push(`### ${name}${c.website ? ` (${c.website})` : ''}`)
      if (c.positioning_notes) lines.push(c.positioning_notes)
      const diff = c.shikenso_differentiation || c.differentiation
      if (diff) lines.push(`Shikenso advantage: ${diff}`)
      lines.push('')
    }
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
    lines.push('Analyse the lead and company data against the ICP segments and framing rules above. Return ONLY valid JSON.')
    lines.push('')
    lines.push('SCORING DIMENSIONS:')
    lines.push('- fit_score (0-100): ICP match — industry, size, region, title against default_first_touch_titles')
    lines.push('- intent_score (0-100): Signal strength and freshness')
    lines.push('- reachability_score (0-100): LinkedIn +30, verified email +50, unverified email +20, specialist title +20')
    lines.push('- icp_score (0-100): (fit × 0.4) + (intent × 0.4) + (reachability × 0.2)')
    lines.push('')
    lines.push('GEOGRAPHIC WEIGHTING: Apply score_multiplier from Geographic Priorities.')
    lines.push('ESPORTS RULE: If the company is primarily esports with no traditional sports — cap fit_score at 60 for cold outbound. Esports outbound is deprioritised per Arwin April 2026.')
    lines.push('TITLE RULES: If title matches do_not_target_titles for their segment → disqualified=true. Specialist titles (Senior Partner Integration Manager, Partnership Activation Manager, Head of Consumer Insights, etc.) → +10 fit_score bonus.')
    lines.push('FRAMING: Include the framing_rule name and one sentence on which selling motion to use in score_reasoning.')
    lines.push('')
    lines.push('PRIORITY:')
    lines.push('  icp_score ≥ 80 → HOT | 60-79 → WARM | 40-59 → COLD | < 40 → DISQUALIFIED')
    lines.push('  TIER_1 company → minimum WARM')
    lines.push('')
    lines.push('Return exactly this JSON:')
    lines.push('{ "segment": "Rights Holder|Brand|Agency|Team|Unknown", "segment_confidence": "HIGH|MEDIUM|LOW",')
    lines.push('  "fit_score": 0-100, "intent_score": 0-100, "reachability_score": 0-100, "icp_score": 0-100,')
    lines.push('  "priority": "HOT|WARM|COLD|DISQUALIFIED",')
    lines.push('  "score_reasoning": "2-3 sentences including framing rule and selling motion to use",')
    lines.push('  "signal_strength": "HIGH|MEDIUM|LOW", "signal_explanation": "Why contact NOW",')
    lines.push('  "recommended_campaign": "Lemlist campaign name", "recommended_product": "Sports|Esports|Campaign",')
    lines.push('  "disqualified": false, "disqualification_reason": "" }')
  }

  if (task === 'ENRICH_COMPANY') {
    lines.push('## YOUR TASK: ENRICH THIS COMPANY')
    lines.push('Analyse the company name and website content. Return ONLY valid JSON.')
    lines.push('{ "description": "2-sentence description", "industry": "...", "size_range": "1-10|11-50|51-200|201-500|501-1000|1000+",')
    lines.push('  "country": "...", "region": "...", "sponsorship_activity": "YES|LIKELY|UNCLEAR|NO",')
    lines.push('  "sponsorship_evidence": "quote or null", "segment": "Rights Holder|Brand|Agency|Team|Unknown" }')
    lines.push('Base ONLY on website content provided.')
  }

  if (task === 'GENERATE_FIRST_LINE') {
    lines.push('## YOUR TASK: WRITE A SIGNAL-AWARE OPENING LINE')
    lines.push('Write exactly one opening paragraph (max 2 sentences) referencing WHY we reach out RIGHT NOW.')
    lines.push('Apply the framing rule for their segment — do NOT educate if they are PRE_EDUCATED.')
    lines.push('Does NOT start with "I" or "We". Sounds human, not templated.')
    lines.push('Return only the text. No quotes, no subject line, no sign-off.')
  }

  if (task === 'GENERATE_FULL_EMAIL') {
    lines.push('## YOUR TASK: WRITE A COMPLETE OUTREACH EMAIL')
    lines.push('Keep total body under 150 words. Apply the correct framing rule for their segment.')
    lines.push("Use the Email Opening Framework above. Never educate a PRE_EDUCATED prospect on what measurement is.")
    lines.push('Return as JSON: { "subject": "...", "body": "...", "linkedin_variant": "..." }')
    lines.push('Subject: concise, reference the signal. Body: opener → value prop → CTA (20-min call). LinkedIn: under 80 words.')
  }

  if (task === 'CLASSIFY_REPLY') {
    lines.push('## YOUR TASK: CLASSIFY THIS EMAIL REPLY')
    lines.push('INTERESTED | NOT_NOW | NOT_FIT | OOO | UNSUBSCRIBE | NEUTRAL')
    lines.push('Return ONLY JSON: { "sentiment": "...", "confidence": "HIGH|MEDIUM|LOW", "brief_reasoning": "1 sentence" }')
  }

  if (task === 'SUGGEST_QUALIFICATION') {
    lines.push('## YOUR TASK: SUGGEST QUALIFICATION SIGNALS')
    lines.push('Assess BANT, cross-reference Pain Points Library, flag likely objections from Objection Library.')
    lines.push('Return ONLY valid JSON:')
    lines.push('{ "budget_signal": bool, "budget_notes": "...", "decision_maker": bool, "decision_maker_notes": "...",')
    lines.push('  "pain_identified": bool, "pain_notes": "quote reply", "timeline_indicated": bool, "timeline_notes": "...",')
    lines.push('  "competitor_in_play": "name or null", "competitor_notes": "...",')
    lines.push('  "likely_objections": ["list"], "objection_prep": "paragraph on likely objections + responses",')
    lines.push('  "handoff_notes": "3-para AE brief: (1) surfaced+pain, (2) verbatim quote, (3) angle+proof+watchouts",')
    lines.push('  "qualification_status": "QUALIFIED|NURTURE|NOT_QUALIFIED" }')
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
      deal_patterns: kb.dealPatterns.length,
    },
  }
}
