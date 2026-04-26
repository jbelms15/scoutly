import { ingestLead } from '@/lib/intake'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { raw, source } = await req.json()
    if (!raw || !source) {
      return NextResponse.json({ action: 'INVALID', message: 'Missing raw or source' }, { status: 400 })
    }
    const result = await ingestLead(raw, source)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ action: 'INVALID', message: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
