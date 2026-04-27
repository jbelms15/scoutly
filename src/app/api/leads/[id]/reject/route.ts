import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { reason_tag, notes } = await req.json()
    if (!reason_tag) return NextResponse.json({ success: false, error: 'reason_tag required' }, { status: 400 })

    const supabase = await createClient()

    await supabase.from('rejections').insert({
      lead_id: params.id,
      reason_tag,
      notes: notes ?? null,
      rejected_by: 'user',
    })

    const { error } = await supabase
      .from('leads')
      .update({ status: 'REJECTED' })
      .eq('id', params.id)

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}
