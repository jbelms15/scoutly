import { scoreLead } from '@/lib/scoring'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}))
    const runType = body.run_type ?? 'RE_SCORE'
    const result = await scoreLead(params.id, runType)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Scoring error' },
      { status: 500 }
    )
  }
}
