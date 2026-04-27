import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { buildClaudePrompt } from '@/lib/claude'

const MODEL = 'claude-sonnet-4-6'

// ─── Person enrichment (Lemlist Find & Enrich) ───────────────────────────────

export type PersonEnrichmentResult = {
  email: string | null
  email_verified: boolean
  enrichment_source: string
  mock_mode: boolean
}

export async function enrichPerson(leadId: string): Promise<PersonEnrichmentResult> {
  const supabase = await createClient()
  const { data: lead } = await supabase
    .from('leads')
    .select('*, companies(name, domain)')
    .eq('id', leadId)
    .single()

  if (!lead) throw new Error('Lead not found')

  const apiKey = process.env.LEMLIST_API_KEY

  if (!apiKey) {
    // Placeholder mode — log intent, return mock
    const domain = (lead.companies as any)?.domain
    const firstName = lead.first_name?.toLowerCase() ?? 'unknown'
    const lastName = lead.last_name?.toLowerCase() ?? ''
    const mockEmail = domain ? `${firstName}.${lastName}@${domain}` : null

    console.log(`[Lemlist PLACEHOLDER] Find & Enrich called for ${lead.first_name} ${lead.last_name} at ${(lead.companies as any)?.name}`)

    const result: PersonEnrichmentResult = {
      email: lead.email ?? mockEmail,
      email_verified: false,
      enrichment_source: 'Lemlist (mock)',
      mock_mode: true,
    }

    await supabase.from('leads').update({
      email:              result.email,
      enrichment_source:  result.enrichment_source,
      enrichment_status:  'COMPLETE',
      enrichment_completed_at: new Date().toISOString(),
    }).eq('id', leadId)

    return result
  }

  // ── Live Lemlist API (Phase 8) ────────────────────────────────────────────
  // TODO: implement when LEMLIST_API_KEY is active
  // Endpoint: POST https://api.lemlist.com/api/enrichment
  // Body: { firstName, lastName, companyName, companyDomain }

  await supabase.from('leads').update({
    enrichment_status: 'FAILED',
    enrichment_error: 'Lemlist live integration not yet implemented',
  }).eq('id', leadId)

  return { email: lead.email ?? null, email_verified: false, enrichment_source: 'Lemlist', mock_mode: false }
}

// ─── Company enrichment via Claude ───────────────────────────────────────────

export type CompanyEnrichmentResult = {
  description:          string | null
  industry:             string | null
  size_range:           string | null
  country:              string | null
  region:               string | null
  sponsorship_activity: string | null
  sponsorship_evidence: string | null
  segment:              string | null
  skipped:              boolean
}

export async function enrichCompany(companyId: string): Promise<CompanyEnrichmentResult> {
  const supabase = await createClient()
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single()

  if (!company) throw new Error('Company not found')

  // Skip if enriched in last 30 days
  if (company.last_enriched_at) {
    const daysOld = (Date.now() - new Date(company.last_enriched_at).getTime()) / 86_400_000
    if (daysOld < 30) {
      return {
        description: company.description, industry: company.industry,
        size_range: company.size_range, country: company.country,
        region: null, sponsorship_activity: company.sponsorship_activity,
        sponsorship_evidence: company.sponsorship_evidence, segment: company.segment,
        skipped: true,
      }
    }
  }

  await supabase.from('companies').update({ enrichment_status: 'IN_PROGRESS' }).eq('id', companyId)

  // Fetch website content
  let websiteContent = '(No website provided)'
  if (company.website) {
    try {
      const url = company.website.startsWith('http') ? company.website : `https://${company.website}`
      const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Mozilla/5.0 (Scoutly enrichment bot)' } })
      const html = await res.text()
      websiteContent = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .slice(0, 5000)
    } catch (err) {
      websiteContent = `(Website fetch failed: ${err instanceof Error ? err.message : 'unknown error'})`
    }
  }

  const prompt = await buildClaudePrompt('ENRICH_COMPANY', {
    company_name: company.name,
    website: company.website,
    known_industry: company.industry,
    known_country: company.country,
    website_content: websiteContent,
  })

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  let parsed: Record<string, string | null> = {}
  let enrichmentError: string | null = null

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      system: prompt.system,
      messages: prompt.messages as Anthropic.MessageParam[],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    const match = raw.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(match?.[0] ?? raw)
  } catch (err) {
    enrichmentError = err instanceof Error ? err.message : 'Enrichment failed'
  }

  const result: CompanyEnrichmentResult = {
    description:          parsed.description          ?? null,
    industry:             parsed.industry             ?? company.industry ?? null,
    size_range:           parsed.size_range           ?? company.size_range ?? null,
    country:              parsed.country              ?? company.country ?? null,
    region:               parsed.region               ?? null,
    sponsorship_activity: parsed.sponsorship_activity ?? company.sponsorship_activity ?? null,
    sponsorship_evidence: parsed.sponsorship_evidence ?? null,
    segment:              parsed.segment              ?? company.segment ?? null,
    skipped: false,
  }

  await supabase.from('companies').update({
    description:          result.description,
    industry:             result.industry,
    size_range:           result.size_range,
    country:              result.country,
    region:               result.region,
    sponsorship_activity: result.sponsorship_activity,
    sponsorship_evidence: result.sponsorship_evidence,
    segment:              result.segment,
    enrichment_status:    enrichmentError ? 'FAILED' : 'COMPLETE',
    enrichment_completed_at: new Date().toISOString(),
    last_enriched_at:     new Date().toISOString(),
  }).eq('id', companyId)

  return result
}
