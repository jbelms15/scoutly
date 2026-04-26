// Client-safe suppression utilities — no server imports

export type SuppressionEntry = {
  id: string
  suppression_type: string
  match_type: string
  match_value: string
  reason?: string
}

export type SuppressionResult =
  | { suppressed: false }
  | { suppressed: true; reason: string; type: string; matched_on: string }

function extractDomain(input: string): string {
  try {
    const url = input.includes('://') ? input : 'https://' + input
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return input.toLowerCase()
  }
}

function normalizeName(name: string): string {
  return name.toLowerCase().trim()
}

export function isSuppressedSync(
  params: { companyName?: string; domain?: string; email?: string; linkedinUrl?: string },
  list: SuppressionEntry[]
): SuppressionResult {
  const inputDomain = params.domain ? extractDomain(params.domain) : null
  const emailDomain = params.email ? params.email.split('@')[1]?.toLowerCase() : null

  for (const entry of list) {
    const val = entry.match_value.toLowerCase().trim()

    switch (entry.match_type) {
      case 'COMPANY_NAME':
        if (params.companyName) {
          const norm = normalizeName(params.companyName)
          if (norm === val || norm.includes(val) || val.includes(norm)) {
            return { suppressed: true, reason: entry.reason ?? entry.suppression_type, type: entry.suppression_type, matched_on: 'company name' }
          }
        }
        break
      case 'DOMAIN':
        if (inputDomain && extractDomain(val) === inputDomain)
          return { suppressed: true, reason: entry.reason ?? entry.suppression_type, type: entry.suppression_type, matched_on: 'domain' }
        if (emailDomain && extractDomain(val) === emailDomain)
          return { suppressed: true, reason: entry.reason ?? entry.suppression_type, type: entry.suppression_type, matched_on: 'email domain' }
        break
      case 'EMAIL':
        if (params.email && params.email.toLowerCase() === val)
          return { suppressed: true, reason: entry.reason ?? entry.suppression_type, type: entry.suppression_type, matched_on: 'email' }
        break
      case 'LINKEDIN_URL':
        if (params.linkedinUrl && params.linkedinUrl.toLowerCase().includes(val))
          return { suppressed: true, reason: entry.reason ?? entry.suppression_type, type: entry.suppression_type, matched_on: 'LinkedIn URL' }
        break
    }
  }
  return { suppressed: false }
}
