import { createClient } from '@/lib/supabase/server'

export async function getKnowledgeBaseContext() {
  const supabase = await createClient()

  const [segments, products, proofPoints, competitors, tone] = await Promise.all([
    supabase.from('kb_icp_segments').select('*').order('sort_order'),
    supabase.from('kb_modules').select('*').order('sort_order'),
    supabase.from('kb_proof_points').select('*').eq('active', true).order('sort_order'),
    supabase.from('kb_competitors').select('*').eq('active', true),
    supabase.from('kb_copy_tone').select('*').limit(1).single(),
  ])

  return {
    segments: segments.data ?? [],
    products: products.data ?? [],
    proofPoints: proofPoints.data ?? [],
    competitors: competitors.data ?? [],
    tone: tone.data ?? null,
  }
}

export type KBContext = Awaited<ReturnType<typeof getKnowledgeBaseContext>>

export function buildSystemPrompt(kb: KBContext): string {
  const segmentBlock = kb.segments.map((s) => `
### ${s.segment_name}
${s.definition ?? ''}
- Pain points: ${s.pain_points ?? ''}
- Target titles: ${s.target_titles ?? ''}
- Priority regions: ${s.priority_regions ?? ''}
- Min company size: ${s.min_company_size ?? 'Any'}
- Recommended product: ${s.recommended_product ?? ''}
- Example companies: ${s.example_companies ?? ''}`).join('\n')

  const productBlock = kb.products.map((p) => `
### ${p.name}
${p.description ?? ''}
Target: ${p.target_segments ?? ''}
Differentiators: ${p.key_differentiators ?? ''}`).join('\n')

  const proofBlock = kb.proofPoints
    .map((p) => `- ${p.headline}${p.context ? ` (${p.context})` : ''}`)
    .join('\n')

  const competitorBlock = kb.competitors.map((c) => `
### ${c.name}
Positioning: ${c.positioning_notes ?? ''}
How Shikenso differentiates: ${c.differentiation ?? ''}`).join('\n')

  const tone = kb.tone

  return `You are an AI prospecting assistant for Shikenso Analytics, an AI-powered sponsorship measurement platform based in Germany.

## ICP SEGMENTS
${segmentBlock}

## SHIKENSO PRODUCTS
${productBlock}

## PROOF POINTS (use these in copy)
${proofBlock}

## COMPETITOR AWARENESS
${competitorBlock}

## COPY TONE
${tone?.tone_description ?? ''}
Words to use: ${tone?.words_to_use ?? ''}
Words to avoid: ${tone?.words_to_avoid ?? ''}
Sign-off format: ${tone?.signoff_format ?? ''}
Additional rules: ${tone?.additional_rules ?? ''}

IMPORTANT: Always pull the latest version of this knowledge base. Never use cached or hardcoded context. Reference specific signals in all outreach.`.trim()
}

export async function checkSuppression(
  companyName: string,
  domain?: string,
  email?: string,
  linkedinUrl?: string
): Promise<{ suppressed: boolean; reason?: string }> {
  const supabase = await createClient()

  const conditions: string[] = []
  if (companyName) conditions.push(`value.ilike.${companyName}`)
  if (domain) conditions.push(`value.ilike.${domain}`)
  if (email) conditions.push(`value.ilike.${email}`)
  if (linkedinUrl) conditions.push(`value.ilike.${linkedinUrl}`)

  if (conditions.length === 0) return { suppressed: false }

  const { data } = await supabase
    .from('suppressions')
    .select('type, value, notes')
    .eq('is_active', true)
    .or(conditions.join(','))
    .limit(1)

  if (data && data.length > 0) {
    return { suppressed: true, reason: `${data[0].type}: ${data[0].value}` }
  }

  return { suppressed: false }
}
