import { createClient } from '@/lib/supabase/server'
import { isSuppressedSync } from '@/lib/suppression-client'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SourceType =
  | 'CSV_IMPORT' | 'MANUAL_ENTRY' | 'LEMLIST_WATCHER'
  | 'COWORK_EXPORT' | 'SCOUTLY_AGENT' | 'GOOGLE_ALERTS' | 'LINKEDIN_JOBS'

export type SourceWarmth = 'WARM' | 'COLD' | 'UNKNOWN'

export type RawLeadInput = {
  first_name?:        string
  last_name?:         string
  full_name?:         string
  title?:             string
  seniority?:         string
  linkedin_url?:      string
  email?:             string
  phone?:             string
  company_name?:      string
  company_domain?:    string
  company_linkedin?:  string
  company_industry?:  string
  company_size?:      string
  company_country?:   string
  company_id?:        string
  segment?:           string
  internal_notes?:    string
}

export type SourceContext = {
  source_type:         SourceType
  source_detail?:      string
  source_signal?:      string
  source_warmth?:      SourceWarmth
  source_signal_date?: string
}

export type IntakeAction = 'CREATED' | 'DUPLICATE' | 'SUPPRESSED' | 'INVALID'

export type IntakeResult = {
  success:    boolean
  lead_id:    string | null
  company_id: string | null
  action:     IntakeAction
  status:     string
  message:    string
}

// ─── Normalisation helpers ────────────────────────────────────────────────────

export function normalizeLinkedInUrl(raw: string): string {
  try {
    const url = raw.trim().includes('://') ? raw.trim() : 'https://' + raw.trim()
    const u = new URL(url)
    const match = u.pathname.match(/\/in\/([^/?#]+)/)
    if (match) return `https://www.linkedin.com/in/${match[1]}`
  } catch {}
  return raw.trim()
}

export function extractDomain(input: string): string {
  const s = input.trim()
  if (s.includes('@')) return s.split('@')[1]?.toLowerCase() ?? ''
  try {
    const u = new URL(s.includes('://') ? s : 'https://' + s)
    return u.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return s.toLowerCase()
  }
}

export function parseName(fullName: string): { first_name: string; last_name: string } {
  const t = fullName.trim()
  if (t.includes(',')) {
    const [last, first] = t.split(',').map(s => s.trim())
    return { first_name: first ?? '', last_name: last ?? '' }
  }
  const parts = t.split(/\s+/)
  return parts.length >= 2
    ? { first_name: parts[0], last_name: parts.slice(1).join(' ') }
    : { first_name: t, last_name: '' }
}

function fuzzyCompanyMatch(a: string, b: string): boolean {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim()
  const na = norm(a); const nb = norm(b)
  if (na === nb) return true
  if (na.length > 4 && nb.includes(na)) return true
  if (nb.length > 4 && na.includes(nb)) return true
  return false
}

function computeFreshness(signalDate: string): number {
  const daysOld = (Date.now() - new Date(signalDate).getTime()) / 86_400_000
  if (daysOld <= 3)  return 1.0
  if (daysOld <= 7)  return 0.8
  if (daysOld <= 14) return 0.5
  if (daysOld <= 30) return 0.3
  return 0.1
}

function defaultWarmth(sourceType: SourceType): SourceWarmth {
  if (sourceType === 'LEMLIST_WATCHER') return 'WARM'
  if (sourceType === 'GOOGLE_ALERTS' || sourceType === 'LINKEDIN_JOBS') return 'COLD'
  return 'UNKNOWN'
}

// ─── Main intake function ─────────────────────────────────────────────────────

export async function ingestLead(
  raw: RawLeadInput,
  source: SourceContext
): Promise<IntakeResult> {
  const supabase = await createClient()

  // STEP 1: Normalise
  const n: RawLeadInput = { ...raw }
  if (n.email)         n.email         = n.email.trim().toLowerCase()
  if (n.linkedin_url)  n.linkedin_url  = normalizeLinkedInUrl(n.linkedin_url)
  if (n.company_name)  n.company_name  = n.company_name.trim()
  if (n.company_domain) n.company_domain = extractDomain(n.company_domain)
  if (n.full_name && !n.first_name && !n.last_name) {
    const p = parseName(n.full_name)
    n.first_name = p.first_name
    n.last_name  = p.last_name
  }
  if (n.first_name) n.first_name = n.first_name.trim()
  if (n.last_name)  n.last_name  = n.last_name.trim()

  // STEP 2: Validate minimum fields
  const hasPerson  = !!(n.linkedin_url || n.email || (n.first_name && n.last_name))
  const hasCompany = !!(n.company_name || n.company_domain || n.company_id)
  if (!hasPerson && !hasCompany) {
    return { success: false, lead_id: null, company_id: null, action: 'INVALID', status: 'FAILED',
      message: 'Missing required fields: need a LinkedIn URL, email, or name + company' }
  }

  // STEP 3: Suppression check
  if (n.company_name || n.company_domain || n.email || n.linkedin_url) {
    const { data: sl } = await supabase
      .from('suppression_list')
      .select('id, suppression_type, match_type, match_value, reason')
    if (sl) {
      const check = isSuppressedSync(
        { companyName: n.company_name, domain: n.company_domain, email: n.email, linkedinUrl: n.linkedin_url },
        sl
      )
      if (check.suppressed) {
        return { success: false, lead_id: null, company_id: null, action: 'SUPPRESSED', status: 'BLOCKED',
          message: `Suppressed: ${check.reason} (matched on ${check.matched_on})` }
      }
    }
  }

  // STEP 4: Resolve company
  let companyId: string | null = n.company_id ?? null
  if (!companyId && (n.company_name || n.company_domain)) {
    const { data: existing } = await supabase.from('companies').select('id, name, domain')
    if (existing) {
      const match = existing.find(co =>
        (n.company_domain && co.domain && extractDomain(co.domain) === n.company_domain) ||
        (n.company_name && co.name && fuzzyCompanyMatch(co.name, n.company_name))
      )
      if (match) {
        companyId = match.id
      } else {
        const { data: newCo } = await supabase.from('companies').insert({
          name:                 n.company_name ?? n.company_domain ?? 'Unknown',
          domain:               n.company_domain ?? null,
          linkedin_company_url: n.company_linkedin ?? null,
          industry:             n.company_industry ?? null,
          size_range:           n.company_size ?? null,
          country:              n.company_country ?? null,
          target_tier:          'NONE',
        }).select('id').single()
        if (newCo) companyId = newCo.id
      }
    }
  }

  // STEP 5: Deduplicate
  const orConditions: string[] = []
  if (n.linkedin_url) orConditions.push(`linkedin_url.eq.${n.linkedin_url}`)
  if (n.email)        orConditions.push(`email.eq.${n.email}`)

  if (orConditions.length > 0) {
    const { data: byId } = await supabase
      .from('leads').select('id, status').or(orConditions.join(',')).limit(1)
    if (byId && byId.length > 0) {
      return { success: false, lead_id: byId[0].id, company_id: companyId, action: 'DUPLICATE', status: byId[0].status,
        message: 'Lead already exists (matched by LinkedIn URL or email)' }
    }
  }

  if (companyId && n.first_name && n.last_name) {
    const { data: byName } = await supabase
      .from('leads').select('id, status')
      .eq('company_id', companyId)
      .ilike('first_name', n.first_name)
      .ilike('last_name', n.last_name)
      .limit(1)
    if (byName && byName.length > 0) {
      return { success: false, lead_id: byName[0].id, company_id: companyId, action: 'DUPLICATE', status: byName[0].status,
        message: 'Lead already exists (matched by name + company)' }
    }
  }

  // STEP 6: Determine status
  const hasPerson2 = !!(n.linkedin_url || n.email || (n.first_name && n.last_name))
  const status = hasPerson2 ? 'PENDING' : 'NEEDS_RESEARCH'

  // STEP 7: Insert
  const warmth = source.source_warmth ?? defaultWarmth(source.source_type)
  const freshness = source.source_signal_date ? computeFreshness(source.source_signal_date) : null

  const { data: newLead, error } = await supabase.from('leads').insert({
    company_id:           companyId,
    first_name:           n.first_name ?? null,
    last_name:            n.last_name  ?? null,
    title:                n.title      ?? null,
    seniority:            n.seniority  ?? null,
    linkedin_url:         n.linkedin_url ?? null,
    email:                n.email       ?? null,
    phone:                n.phone       ?? null,
    segment:              n.segment     ?? null,
    internal_notes:       n.internal_notes ?? null,
    source_type:          source.source_type,
    source_detail:        source.source_detail  ?? null,
    source_signal:        source.source_signal  ?? null,
    source_imported_at:   new Date().toISOString(),
    source_warmth:        warmth,
    status,
    signal_freshness_score: freshness,
  }).select('id').single()

  if (error || !newLead) {
    return { success: false, lead_id: null, company_id: companyId, action: 'INVALID', status: 'FAILED',
      message: error?.message ?? 'Insert failed' }
  }

  return { success: true, lead_id: newLead.id, company_id: companyId, action: 'CREATED', status, message: `Created with status ${status}` }
}

// ─── Batch helper for CSV imports ─────────────────────────────────────────────

export type BatchResult = {
  imported:   number
  duplicates: number
  suppressed: number
  invalid:    number
  lead_ids:   string[]
}

export async function ingestBatch(
  rows: RawLeadInput[],
  source: SourceContext
): Promise<BatchResult> {
  const result: BatchResult = { imported: 0, duplicates: 0, suppressed: 0, invalid: 0, lead_ids: [] }

  for (const row of rows) {
    const r = await ingestLead(row, source)
    if (r.action === 'CREATED')    { result.imported++;   if (r.lead_id) result.lead_ids.push(r.lead_id) }
    if (r.action === 'DUPLICATE')   result.duplicates++
    if (r.action === 'SUPPRESSED')  result.suppressed++
    if (r.action === 'INVALID')     result.invalid++
  }

  return result
}
