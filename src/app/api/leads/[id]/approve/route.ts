import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const ts = new Date().toISOString()

    const { data: lead } = await supabase
      .from('leads').select('internal_notes').eq('id', params.id).single()

    const newNote = `[${ts.slice(0, 16).replace('T', ' ')}] Approved`
    const notes = lead?.internal_notes ? `${lead.internal_notes}\n${newNote}` : newNote

    const { error } = await supabase
      .from('leads')
      .update({ status: 'APPROVED', internal_notes: notes })
      .eq('id', params.id)

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'error' }, { status: 500 })
  }
}
