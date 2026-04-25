'use client'

import { useState, useEffect } from 'react'
import { Users, Save, History, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Segment = {
  id: string
  segment_name: string
  definition: string
  example_companies: string
  pain_points: string
  priority_sports: string
  priority_regions: string
  target_titles: string
  min_company_size: number | null
  recommended_product: string
  updated_at: string
  sort_order: number
}

export default function ICPPage() {
  const [segments, setSegments] = useState<Segment[]>([])
  const [editing, setEditing] = useState<Record<string, Segment>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [history, setHistory] = useState<Record<string, any[]>>({})
  const [showHistory, setShowHistory] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('kb_icp_segments').select('*').order('sort_order')
    if (data) {
      setSegments(data)
      const editMap: Record<string, Segment> = {}
      data.forEach(s => { editMap[s.id] = { ...s } })
      setEditing(editMap)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSave(id: string) {
    setSaving(s => ({ ...s, [id]: true }))
    const supabase = createClient()
    const original = segments.find(s => s.id === id)

    // Save snapshot to history
    if (original) {
      await supabase.from('kb_edit_history').insert({
        table_name: 'kb_icp_segments',
        record_id: id,
        snapshot: original,
        note: `Updated ${original.segment_name}`,
      })
    }

    const { definition, example_companies, pain_points, priority_sports,
      priority_regions, target_titles, min_company_size, recommended_product } = editing[id]

    await supabase.from('kb_icp_segments').update({
      definition, example_companies, pain_points, priority_sports,
      priority_regions, target_titles, min_company_size, recommended_product,
    }).eq('id', id)

    setSaving(s => ({ ...s, [id]: false }))
    setSaved(s => ({ ...s, [id]: true }))
    setTimeout(() => setSaved(s => ({ ...s, [id]: false })), 2000)
    load()
  }

  async function loadHistory(id: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('kb_edit_history')
      .select('*')
      .eq('table_name', 'kb_icp_segments')
      .eq('record_id', id)
      .order('created_at', { ascending: false })
      .limit(5)
    setHistory(h => ({ ...h, [id]: data ?? [] }))
    setShowHistory(h => ({ ...h, [id]: true }))
  }

  async function handleRestore(id: string, snapshot: any) {
    const supabase = createClient()
    const { definition, example_companies, pain_points, priority_sports,
      priority_regions, target_titles, min_company_size, recommended_product } = snapshot
    await supabase.from('kb_icp_segments').update({
      definition, example_companies, pain_points, priority_sports,
      priority_regions, target_titles, min_company_size, recommended_product,
    }).eq('id', id)
    setShowHistory(h => ({ ...h, [id]: false }))
    load()
  }

  const field = (id: string, key: keyof Segment, label: string, multiline = false) => (
    <div key={key}>
      <label className="block text-xs text-fg-3 mb-1">{label}</label>
      {multiline ? (
        <textarea
          value={(editing[id]?.[key] as string) ?? ''}
          onChange={e => setEditing(ed => ({ ...ed, [id]: { ...ed[id], [key]: e.target.value } }))}
          rows={3}
          className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent transition-colors resize-none"
        />
      ) : (
        <input
          type={key === 'min_company_size' ? 'number' : 'text'}
          value={(editing[id]?.[key] as string | number) ?? ''}
          onChange={e => setEditing(ed => ({
            ...ed,
            [id]: { ...ed[id], [key]: key === 'min_company_size' ? Number(e.target.value) : e.target.value }
          }))}
          className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent transition-colors"
        />
      )}
    </div>
  )

  if (loading) return <div className="p-6 text-xs text-fg-3">Loading...</div>

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings/knowledge-base" className="text-fg-3 hover:text-fg transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <Users className="w-4 h-4 text-accent" />
        <h1 className="text-sm font-semibold text-fg">ICP & Segments</h1>
      </div>

      <div className="space-y-4">
        {segments.map(seg => (
          <div key={seg.id} className="bg-surface border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-soft">
              <span className="text-sm font-semibold text-accent">{seg.segment_name}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => loadHistory(seg.id)}
                  className="flex items-center gap-1 text-xs text-fg-3 hover:text-fg transition-colors">
                  <History className="w-3.5 h-3.5" /> History
                </button>
                <button
                  onClick={() => handleSave(seg.id)}
                  disabled={saving[seg.id]}
                  className="flex items-center gap-1.5 px-3 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim transition-colors disabled:opacity-60"
                >
                  <Save className="w-3 h-3" />
                  {saving[seg.id] ? 'Saving...' : saved[seg.id] ? 'Saved ✓' : 'Save'}
                </button>
              </div>
            </div>

            <div className="p-4 grid grid-cols-2 gap-3">
              {field(seg.id, 'definition', 'Definition / Criteria', true)}
              {field(seg.id, 'pain_points', 'Pain Points', true)}
              {field(seg.id, 'example_companies', 'Example Companies')}
              {field(seg.id, 'recommended_product', 'Recommended Shikenso Product')}
              {field(seg.id, 'target_titles', 'Target Titles (comma-separated)', true)}
              {field(seg.id, 'priority_regions', 'Priority Regions')}
              {field(seg.id, 'priority_sports', 'Priority Sports')}
              {field(seg.id, 'min_company_size', 'Min Company Size (employees)')}
            </div>

            {/* Version history */}
            {showHistory[seg.id] && history[seg.id] && (
              <div className="border-t border-border-soft p-4 bg-card/50">
                <p className="text-xs font-semibold text-fg-2 mb-2">Recent versions</p>
                {history[seg.id].length === 0 ? (
                  <p className="text-xs text-fg-3">No history yet.</p>
                ) : (
                  <div className="space-y-2">
                    {history[seg.id].map((h: any) => (
                      <div key={h.id} className="flex items-center justify-between text-xs">
                        <span className="text-fg-3">
                          {new Date(h.created_at).toLocaleString()} — {h.note}
                        </span>
                        <button
                          onClick={() => handleRestore(seg.id, h.snapshot)}
                          className="text-accent hover:text-accent-dim transition-colors"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
