import { ingestLead, normalizeLinkedInUrl, extractDomain, parseName } from '@/lib/intake'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const TEST_PREFIX = '__SCOUTLY_TEST__'

type TestCase = { name: string; fn: () => Promise<{ pass: boolean; detail: string }> }

export async function GET() {
  const supabase = await createClient()
  const results: { name: string; pass: boolean; detail: string }[] = []
  const createdLeadIds: string[] = []
  const createdCompanyIds: string[] = []

  // ── Pure function tests (no DB) ──────────────────────────────────────────

  results.push({
    name: 'normalizeLinkedInUrl strips tracking params',
    pass: normalizeLinkedInUrl('https://linkedin.com/in/test-user?utm_source=share') === 'https://www.linkedin.com/in/test-user',
    detail: normalizeLinkedInUrl('https://linkedin.com/in/test-user?utm_source=share'),
  })

  results.push({
    name: 'extractDomain from email',
    pass: extractDomain('john@shikenso.com') === 'shikenso.com',
    detail: extractDomain('john@shikenso.com'),
  })

  results.push({
    name: 'extractDomain from URL',
    pass: extractDomain('https://www.shikenso.com') === 'shikenso.com',
    detail: extractDomain('https://www.shikenso.com'),
  })

  results.push({
    name: 'parseName handles "First Last"',
    pass: parseName('Max Mustermann').first_name === 'Max' && parseName('Max Mustermann').last_name === 'Mustermann',
    detail: JSON.stringify(parseName('Max Mustermann')),
  })

  results.push({
    name: 'parseName handles "Last, First"',
    pass: parseName('Mustermann, Max').first_name === 'Max' && parseName('Mustermann, Max').last_name === 'Mustermann',
    detail: JSON.stringify(parseName('Mustermann, Max')),
  })

  // ── Integration tests (DB required) ─────────────────────────────────────

  const src = { source_type: 'MANUAL_ENTRY' as const, source_detail: 'Test run', source_warmth: 'COLD' as const }

  // Test: Missing required fields → INVALID
  const r1 = await ingestLead({}, src)
  results.push({ name: 'Missing fields → INVALID', pass: r1.action === 'INVALID', detail: r1.message })

  // Test: Valid lead → CREATED
  const r2 = await ingestLead({
    first_name: `${TEST_PREFIX}Test`, last_name: 'Lead',
    linkedin_url: `https://www.linkedin.com/in/${TEST_PREFIX}test-lead-intake`,
    email: `${TEST_PREFIX}test@example-intake-test.com`,
    company_name: `${TEST_PREFIX}Test Company Intake`,
  }, src)
  results.push({ name: 'Valid lead → CREATED', pass: r2.action === 'CREATED', detail: r2.message })
  if (r2.lead_id) createdLeadIds.push(r2.lead_id)
  if (r2.company_id) createdCompanyIds.push(r2.company_id)

  // Test: Duplicate by LinkedIn URL → DUPLICATE
  const r3 = await ingestLead({
    first_name: `${TEST_PREFIX}Test`, last_name: 'Lead',
    linkedin_url: `https://www.linkedin.com/in/${TEST_PREFIX}test-lead-intake`,
  }, src)
  results.push({ name: 'Duplicate by LinkedIn URL → DUPLICATE', pass: r3.action === 'DUPLICATE', detail: r3.message })

  // Test: Duplicate by email → DUPLICATE
  const r4 = await ingestLead({
    first_name: 'Someone', last_name: 'Else',
    email: `${TEST_PREFIX}test@example-intake-test.com`,
    company_name: 'Any Company',
  }, src)
  results.push({ name: 'Duplicate by email → DUPLICATE', pass: r4.action === 'DUPLICATE', detail: r4.message })

  // Test: Suppressed company → SUPPRESSED (use known suppressed company from seed data)
  const r5 = await ingestLead({
    first_name: 'John', last_name: 'Doe',
    company_name: 'DFL',
    linkedin_url: `https://www.linkedin.com/in/${TEST_PREFIX}suppression-test-unique`,
  }, src)
  results.push({ name: 'Suppressed company → SUPPRESSED', pass: r5.action === 'SUPPRESSED', detail: r5.message })

  // Test: Company-only (no person) → NEEDS_RESEARCH
  const r6 = await ingestLead({
    company_name: `${TEST_PREFIX}Company Only No Person`,
    company_domain: `${TEST_PREFIX}noperson.com`,
  }, src)
  results.push({ name: 'Company-only → NEEDS_RESEARCH', pass: r6.action === 'CREATED' && r6.status === 'NEEDS_RESEARCH', detail: `action=${r6.action} status=${r6.status}` })
  if (r6.lead_id) createdLeadIds.push(r6.lead_id)
  if (r6.company_id) createdCompanyIds.push(r6.company_id)

  // ── Cleanup ───────────────────────────────────────────────────────────────

  if (createdLeadIds.length > 0) {
    await supabase.from('leads').delete().in('id', createdLeadIds)
  }
  if (createdCompanyIds.length > 0) {
    await supabase.from('companies').delete().in('id', createdCompanyIds)
  }

  const passed = results.filter(r => r.pass).length
  const failed = results.filter(r => !r.pass).length

  return NextResponse.json({
    summary: { total: results.length, passed, failed },
    results,
  })
}
