import { processLead } from '@/lib/pipeline'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await processLead(params.id)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Pipeline error' },
      { status: 500 }
    )
  }
}
