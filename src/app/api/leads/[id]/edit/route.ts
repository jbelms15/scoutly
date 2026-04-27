import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const allowed = ['segment', 'recommended_campaign', 'recommended_product', 'internal_notes', 'priority', 'manually_promoted']
    const update: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }
    if (body.priority && body.priority !== 'DISQUALIFIED') {
      update.manually_promoted = true
      update.manually_promoted_at = new Date().toISOString()
      update.manually_promoted_by = 'user'
    }

    const supabase = await createClient()
    const { error } = await supabase.from('leads').update(update).eq('id', params.id)
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}
