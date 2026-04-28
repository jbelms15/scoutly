import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { buildClaudePrompt } from '@/lib/claude'

const MODEL          = 'claude-sonnet-4-6'
const PROMPT_VERSION = '2.0.0'
const INPUT_COST_PER_M  = 3.0
const OUTPUT_COST_PER_M = 15.0

export type ScoreResult = {
  success:               boolean
  icp_score?:            number
  priority?:             string
  segment?:              string
  fit_score?:            number
  intent_score?:         number
  reachability_score?:   number
  score_reasoning?:      string
  signal_strength?:      string
  recommended_product?:  string
  disqualified?:         boolean
  error?:                string
}

// ─── Signal freshness computation ─────────────────────────────────────────────

export function computeSignalFreshness(signalDate?: string | null): number {
  if (!signalDate) return 1.0
  const daysOld = (Date.now() - new Date(signalDate).getTime()) / 86_400_000
  if (daysOld <= 3)  return 1.0
  if (daysOld <= 7)  return 0.8
  if (daysOld <= 14) return 0.5
  if (daysOld <= 30) return 0.3
  return 0.1
}

// ─── Weighted ICP score ───────────────────────────────────────────────────────

export function computeIcpScore(fit: number, intent: number, reachability: number): number {
  return Math.round(fit * 0.4 + intent * 0.4 + reachability * 0.2)
}

// ─── Geographic score multiplier ─────────────────────────────────────────────

type GeoPriority = { tier_name: string; countries: string[]; regions: string[]; score_multiplier: number }

export function getGeoMultiplier(
  country: string | null | undefined,
  region: string | null | undefined,
  geoPriorities: GeoPriority[]
): number {
  if (!country && !region) return 1.0
  for (const geo of geoPriorities) {
    const c = country?.toLowerCase() ?? ''
    const r = region?.toLowerCase() ?? ''
    const inCountries = geo.countries.some(gc => gc.toLowerCase() === c)
    const inRegions   = geo.regions.some(gr => r.includes(gr.toLowerCase()) || gr.toLowerCase().includes(r))
    if (inCountries || inRegions) return geo.score_multiplier
  }
  return 1.0
}

// ─── Priority from score + tier override ─────────────────────────────────────

export function derivePriority(icpScore: number, targetTier?: string, disqualified?: boolean): string {
  if (disqualified) return 'DISQUALIFIED'
  let priority: string
  if (icpScore >= 80)      priority = 'HOT'
  else if (icpScore >= 60) priority = 'WARM'
  else if (icpScore >= 40) priority = 'COLD'
  else                     priority = 'DISQUALIFIED'
  if (targetTier === 'TIER_1' && priority === 'COLD') priority = 'WARM'
  return priority
}

// ─── Parse Claude JSON response ───────────────────────────────────────────────

function parseScoreResponse(raw: string): Record<string, unknown> | null {
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    return JSON.parse(match?.[0] ?? raw)
  } catch {
    return null
  }
}

// ─── Post-process scores with programmatic rules ──────────────────────────────

function applyPostProcessingRules(
  parsed: Record<string, unknown>,
  lead: Record<string, unknown>,
  company: Record<string, unknown> | null,
  segments: Array<Record<string, unknown>>,
  geoPriorities: GeoPriority[]
): Record<string, unknown> {
  let fitScore = Number(parsed.fit_score ?? 0)
  const intentScore = Number(parsed.intent_score ?? 0)
  const reachScore  = Number(parsed.reachability_score ?? 0)
  const segment     = String(parsed.segment ?? 'Unknown')
  let disqualified  = Boolean(parsed.disqualified)
  let disqualReason = String(parsed.disqualification_reason ?? '')

  // 1. Geographic multiplier
  const geoMultiplier = getGeoMultiplier(
    company?.country as string,
    company?.region as string,
    geoPriorities
  )
  fitScore = Math.min(100, Math.round(fitScore * geoMultiplier))

  // 2. Esports deprioritisation — cap fit_score at 60 for cold outbound
  const isEsports = [
    company?.industry, company?.description, company?.name,
  ].some(v => typeof v === 'string' && v.toLowerCase().includes('esport'))
  const isColdOutbound = !['INBOUND', 'REFERRAL', 'HOT'].includes(String(lead.source_warmth ?? ''))
  if (isEsports && isColdOutbound && fitScore > 60) {
    fitScore = 60
  }

  // 3. Specialist title boost (+10 to fit_score)
  const specialistTitles = ['head of sponsorship', 'sponsorship manager', 'partnership manager', 'head of partnerships']
  const titleLower = String(lead.title ?? '').toLowerCase()
  if (specialistTitles.some(t => titleLower.includes(t))) {
    fitScore = Math.min(100, fitScore + 10)
  }

  // 4. Title disqualification from do_not_target_titles
  if (!disqualified && titleLower) {
    const relevantSeg = segments.find(s => s.segment_name === segment) as Record<string, unknown> | undefined
    const doNotTarget = (relevantSeg?.do_not_target_titles as string[] | undefined) ?? []
    const isDoNotTarget = doNotTarget.some(t => titleLower.includes(t.toLowerCase()))
    if (isDoNotTarget) {
      disqualified  = true
      disqualReason = `Title "${lead.title}" is on the do-not-target list for the ${segment} segment`
    }
  }

  // Recompute icp_score after adjustments
  const icpScore = computeIcpScore(fitScore, intentScore, reachScore)

  return {
    ...parsed,
    fit_score:              fitScore,
    icp_score:              icpScore,
    disqualified,
    disqualification_reason: disqualReason,
  }
}

// ─── Main scoring function ────────────────────────────────────────────────────

export async function scoreLead(
  leadId: string,
  runType: 'INITIAL_SCORE' | 'RE_SCORE' | 'MANUAL_TRIGGER' = 'INITIAL_SCORE'
): Promise<ScoreResult> {
  const supabase = await createClient()

  const { data: lead } = await supabase
    .from('leads')
    .select('*, companies(*)')
    .eq('id', leadId)
    .single()

  if (!lead) return { success: false, error: 'Lead not found' }

  const company = lead.companies as Record<string, unknown> | null

  // Load KB data for post-processing
  const [{ data: segments }, { data: geoPriorities }] = await Promise.all([
    supabase.from('kb_icp_segments').select('segment_name, do_not_target_titles, target_title_array, default_first_touch_titles, specialist_titles').eq('active', true).eq('archived', false),
    supabase.from('kb_geographic_priorities').select('tier_name, countries, regions, score_multiplier').eq('active', true).eq('archived', false).order('sort_order'),
  ])

  const freshness = computeSignalFreshness(lead.source_imported_at)

  const prompt = await buildClaudePrompt('SCORE_LEAD', {
    lead: {
      first_name:             lead.first_name,
      last_name:              lead.last_name,
      title:                  lead.title,
      linkedin_url:           lead.linkedin_url,
      email:                  lead.email,
      source_type:            lead.source_type,
      source_warmth:          lead.source_warmth,
      source_signal:          lead.source_signal,
      signal_freshness_score: freshness,
      internal_notes:         lead.internal_notes,
    },
    company: company ? {
      name:                 company.name,
      website:              company.website,
      industry:             company.industry,
      size_range:           company.size_range,
      country:              company.country,
      region:               company.region,
      segment:              company.segment,
      target_tier:          company.target_tier,
      sponsorship_activity: company.sponsorship_activity,
      description:          company.description,
      sponsorship_evidence: company.sponsorship_evidence,
    } : null,
  })

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const startTime = Date.now()

  let rawText      = ''
  let inputTokens  = 0
  let outputTokens = 0
  let parsed: Record<string, unknown> | null = null
  let error: string | null = null

  try {
    const response = await client.messages.create({
      model:      MODEL,
      max_tokens: 1500,
      system:     prompt.system,
      messages:   prompt.messages as Anthropic.MessageParam[],
    })

    rawText      = response.content[0].type === 'text' ? response.content[0].text : ''
    inputTokens  = response.usage.input_tokens
    outputTokens = response.usage.output_tokens
    parsed       = parseScoreResponse(rawText)

    if (!parsed) {
      const retryResponse = await client.messages.create({
        model:      MODEL,
        max_tokens: 1500,
        system:     prompt.system,
        messages:   [
          ...(prompt.messages as Anthropic.MessageParam[]),
          { role: 'assistant', content: rawText },
          { role: 'user', content: 'Your response was not valid JSON. Return ONLY the JSON object, nothing else.' },
        ],
      })
      const retryRaw  = retryResponse.content[0].type === 'text' ? retryResponse.content[0].text : ''
      inputTokens  += retryResponse.usage.input_tokens
      outputTokens += retryResponse.usage.output_tokens
      parsed = parseScoreResponse(retryRaw)
      if (!parsed) error = 'JSON parse failed after retry'
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'API call failed'
  }

  const durationMs  = Date.now() - startTime
  const apiCostUsd  = (inputTokens * INPUT_COST_PER_M + outputTokens * OUTPUT_COST_PER_M) / 1_000_000

  await supabase.from('scoring_runs').insert({
    lead_id:        leadId,
    run_type:       runType,
    prompt_version: PROMPT_VERSION,
    input_tokens:   inputTokens,
    output_tokens:  outputTokens,
    api_cost_usd:   apiCostUsd,
    duration_ms:    durationMs,
    success:        !error && !!parsed,
    error_message:  error,
    raw_response:   parsed ?? { raw: rawText },
  })

  if (error || !parsed) {
    await supabase.from('leads').update({
      enrichment_status: 'FAILED',
      enrichment_error:  error ?? 'Scoring failed',
    }).eq('id', leadId)
    return { success: false, error: error ?? 'Scoring failed' }
  }

  // Apply post-processing rules (geo multiplier, esports cap, title checks)
  const adjusted = applyPostProcessingRules(
    parsed,
    lead as Record<string, unknown>,
    company,
    (segments ?? []) as Array<Record<string, unknown>>,
    (geoPriorities ?? []) as GeoPriority[]
  )

  const fitScore          = Number(adjusted.fit_score ?? 0)
  const intentScore       = Number(adjusted.intent_score ?? 0)
  const reachabilityScore = Number(adjusted.reachability_score ?? 0)
  const icpScore          = Number(adjusted.icp_score ?? computeIcpScore(fitScore, intentScore, reachabilityScore))
  const disqualified      = Boolean(adjusted.disqualified)
  const priority          = derivePriority(icpScore, String(company?.target_tier ?? ''), disqualified)

  const { error: updateError } = await supabase.from('leads').update({
    segment:                 String(adjusted.segment ?? 'Unknown'),
    segment_confidence:      String(adjusted.segment_confidence ?? 'LOW'),
    fit_score:               fitScore,
    intent_score:            intentScore,
    reachability_score:      reachabilityScore,
    icp_score:               icpScore,
    score_reasoning:         String(adjusted.score_reasoning ?? ''),
    signal_strength:         String(adjusted.signal_strength ?? 'LOW'),
    signal_explanation:      String(adjusted.signal_explanation ?? ''),
    priority,
    recommended_campaign:    String(adjusted.recommended_campaign ?? ''),
    recommended_product:     String(adjusted.recommended_product ?? ''),
    disqualified,
    disqualification_reason: disqualified ? String(adjusted.disqualification_reason ?? '') : null,
    signal_freshness_score:  freshness,
    scoring_completed_at:    new Date().toISOString(),
    scoring_model_version:   PROMPT_VERSION,
    status:                  'PENDING',
    enrichment_status:       'COMPLETE',
    enrichment_completed_at: new Date().toISOString(),
  }).eq('id', leadId)

  if (updateError) {
    console.error('[scoring] Lead update failed:', updateError.message)
    return { success: false, error: `DB update failed: ${updateError.message}` }
  }

  return {
    success:             true,
    icp_score:           icpScore,
    priority,
    segment:             String(adjusted.segment ?? ''),
    fit_score:           fitScore,
    intent_score:        intentScore,
    reachability_score:  reachabilityScore,
    score_reasoning:     String(adjusted.score_reasoning ?? ''),
    signal_strength:     String(adjusted.signal_strength ?? ''),
    recommended_product: String(adjusted.recommended_product ?? ''),
    disqualified,
  }
}
