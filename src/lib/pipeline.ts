import { createClient } from '@/lib/supabase/server'
import { enrichPerson, enrichCompany } from '@/lib/enrichment'
import { scoreLead } from '@/lib/scoring'

export type PipelineResult = {
  lead_id:    string
  success:    boolean
  icp_score?: number
  priority?:  string
  status?:    string
  error?:     string
  steps: {
    company_enrichment:  'skipped' | 'done' | 'failed'
    person_enrichment:   'done' | 'failed'
    scoring:             'done' | 'failed'
  }
}

/**
 * Full enrichment + scoring pipeline for a single lead.
 * Called after lead intake for manual entries, or in batch after CSV import.
 */
export async function processLead(leadId: string): Promise<PipelineResult> {
  const supabase = await createClient()
  const steps: PipelineResult['steps'] = {
    company_enrichment: 'skipped',
    person_enrichment: 'failed',
    scoring: 'failed',
  }

  const { data: lead } = await supabase
    .from('leads')
    .select('*, companies(id, name, domain, last_enriched_at)')
    .eq('id', leadId)
    .single()

  if (!lead) return { lead_id: leadId, success: false, error: 'Lead not found', steps }

  const company = lead.companies as { id: string; name: string; domain?: string; last_enriched_at?: string } | null

  // STEP A: Company enrichment (skip if enriched < 30 days ago)
  if (company?.id) {
    try {
      const result = await enrichCompany(company.id)
      steps.company_enrichment = result.skipped ? 'skipped' : 'done'
    } catch {
      steps.company_enrichment = 'failed'
    }
  }

  // STEP B: Person enrichment via Lemlist placeholder
  try {
    await enrichPerson(leadId)
    steps.person_enrichment = 'done'
  } catch {
    steps.person_enrichment = 'failed'
    // If no person data and enrichment failed → NEEDS_RESEARCH
    if (!lead.linkedin_url && !lead.email && !lead.first_name) {
      await supabase.from('leads').update({
        status: 'NEEDS_RESEARCH',
        enrichment_status: 'FAILED',
        enrichment_error: 'No person data and enrichment unavailable',
      }).eq('id', leadId)
      return { lead_id: leadId, success: false, error: 'No person data', status: 'NEEDS_RESEARCH', steps }
    }
  }

  // STEP C: Score via Claude
  try {
    const scoreResult = await scoreLead(leadId, 'INITIAL_SCORE')
    if (scoreResult.success) {
      steps.scoring = 'done'
      return {
        lead_id: leadId,
        success: true,
        icp_score: scoreResult.icp_score,
        priority: scoreResult.priority,
        status: 'PENDING',
        steps,
      }
    } else {
      steps.scoring = 'failed'
      return { lead_id: leadId, success: false, error: scoreResult.error, steps }
    }
  } catch (err) {
    steps.scoring = 'failed'
    const message = err instanceof Error ? err.message : 'Scoring error'
    await supabase.from('leads').update({ enrichment_error: message }).eq('id', leadId)
    return { lead_id: leadId, success: false, error: message, steps }
  }
}

/**
 * Process multiple leads sequentially with a concurrency limit.
 * Returns per-lead results so the UI can show granular progress.
 */
export async function processBatch(
  leadIds: string[],
  onProgress?: (done: number, total: number, latest: PipelineResult) => void
): Promise<PipelineResult[]> {
  const results: PipelineResult[] = []

  for (const [i, id] of leadIds.entries()) {
    const result = await processLead(id)
    results.push(result)
    onProgress?.(i + 1, leadIds.length, result)
  }

  return results
}
