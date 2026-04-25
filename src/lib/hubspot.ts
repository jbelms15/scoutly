// HubSpot integration — placeholder mode
// Real API calls are wired in Phase 8 when the API key is available.

export type HubSpotContact = {
  firstName?: string
  lastName?: string
  email?: string
  company?: string
  linkedinUrl?: string
  icpScore?: number
  segment?: string
  signalSource?: string
}

export type HubSpotPushResult =
  | { success: true; contactId: string; dealId?: string }
  | { success: false; error: string; placeholder: true }

export async function pushContactAndDeal(
  contact: HubSpotContact
): Promise<HubSpotPushResult> {
  const apiKey = process.env.HUBSPOT_API_KEY

  if (!apiKey) {
    console.log('[HubSpot PLACEHOLDER] Would push contact + deal:', contact)
    return { success: false, error: 'HubSpot API key not configured', placeholder: true }
  }

  // Real implementation added in Phase 8
  return { success: false, error: 'Not implemented yet', placeholder: true }
}

export function isHubSpotConnected(): boolean {
  return !!process.env.HUBSPOT_API_KEY
}
