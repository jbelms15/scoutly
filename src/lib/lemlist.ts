// Lemlist integration — placeholder mode
// Real API calls are wired in Phase 8 when the API key is available.

export type LemlistContact = {
  firstName?: string
  lastName?: string
  email?: string
  companyName?: string
  linkedinUrl?: string
  customFields?: Record<string, string>
}

export type LemlistPushResult =
  | { success: true; contactId: string }
  | { success: false; error: string; placeholder: true }

export async function pushContactToLemlist(
  contact: LemlistContact,
  campaignId: string
): Promise<LemlistPushResult> {
  const apiKey = process.env.LEMLIST_API_KEY

  if (!apiKey) {
    console.log('[Lemlist PLACEHOLDER] Would push contact:', contact, 'to campaign:', campaignId)
    return { success: false, error: 'Lemlist API key not configured', placeholder: true }
  }

  // Real implementation added in Phase 8
  console.log('[Lemlist] Pushing contact to campaign', campaignId, contact)
  return { success: false, error: 'Not implemented yet', placeholder: true }
}

export async function findAndEnrichContact(params: {
  firstName?: string
  lastName?: string
  companyDomain?: string
  linkedinUrl?: string
}): Promise<{ email?: string; found: boolean; placeholder?: true }> {
  const apiKey = process.env.LEMLIST_API_KEY

  if (!apiKey) {
    console.log('[Lemlist PLACEHOLDER] Would find & enrich:', params)
    return { found: false, placeholder: true }
  }

  // Real implementation added in Phase 8
  return { found: false }
}

export function isLemlistConnected(): boolean {
  return !!process.env.LEMLIST_API_KEY
}
