'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export type KBSegment = {
  segment_name: string
  definition: string
  sort_order: number
}

const FALLBACK_SEGMENTS: KBSegment[] = [
  { segment_name: 'Rights Holder', definition: 'Leagues, tournaments, and event organizers', sort_order: 1 },
  { segment_name: 'Brand',         definition: 'Brands with active sponsorship relationships', sort_order: 2 },
  { segment_name: 'Agency',        definition: 'Sports and esports marketing agencies', sort_order: 3 },
  { segment_name: 'Club',          definition: 'Professional sports clubs and esports teams', sort_order: 4 },
]

export function useKBSegments() {
  const [segments, setSegments] = useState<KBSegment[]>(FALLBACK_SEGMENTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('kb_icp_segments')
      .select('segment_name, definition, sort_order')
      .eq('active', true)
      .eq('archived', false)
      .order('sort_order')
      .then(({ data }) => {
        if (data && data.length > 0) setSegments(data)
        setLoading(false)
      })
  }, [])

  return { segments, loading }
}
