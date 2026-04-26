'use client'

import { useState, useEffect } from 'react'
import { Plus, Save, History, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ChipInput from '@/components/chip-input'
import { cn } from '@/lib/utils'

type Segment = {
  id: string; segment_name: string; definition: string; criteria: string
  example_companies: string; pain_points: string; priority_sports: string
  priority_regions: string; target_titles: string; min_company_size: number | null
  max_company_size: number | null; recommended_product: string
  active: boolean; version: number; sort_order: number; updated_at: string
}

export default function ICPPage() {
  const [segments, setSegments] = useState<Segment[]>([])
  const [editing, setEditing] = useState<Record<string, Partial<Segment>>>({})
  const [editMode, setEditMode] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [historyOpen, setHistoryOpen] = useState<Record<string, boolean>>({})
  const [history, setHistory] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('kb_icp_segments').select('*').order('sort_order')
    if (data) {
      setSegments(data)
      const m: Record<string, Partial<Segment>> = {}
      data.forEach(s => { m[s.id] = { ...s } })
      setEditing(m)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSave(id: string) {
    setSaving(s => ({ ...s, [id]: true }))
    const supabase = createClient()
    const { definition, criteria, example_companies, pain_points, priority_sports,
      priority_regions, target_titles, min_company_size, max_company_size, recommended_product } = editing[id]
    await supabase.from('kb_icp_segments').update({
      definition, criteria, example_companies, pain_points, priority_sports,
      priority_regions, target_titles, min_company_size, max_company_size, recommended_product,
    }).eq('id', id)
    setSaving(s => ({ ...s, [id]: false }))
    setSaved(s => ({ ...s, [id]: true }))
    setEditMode(m => ({ ...m, [id]: false }))
    setTimeout(() => setSaved(s => ({ ...s, [id]: false })), 2000)
    load()
  }

  async function handleToggleActive(id: string, active: boolean) {
    const supabase = createClient()
    await supabase.from('kb_icp_segments').update({ active: !active }).eq('id', id)
    load()
  }

  async function loadHistory(id: string) {
    const supabase = createClient()
    const { data } = await supabase.from('kb_version_history')
      .select('*').eq('table_name', 'kb_icp_segments').eq('record_id', id)
      .order('created_at', { ascending: false }).limit(5)
    setHistory(h => ({ ...h, [id]: data ?? [] }))
    setHistoryOpen(h => ({ ...h, [id]: !h[id] }))
  }

  async function handleRestore(id: string, snapshot: any) {
    const supabase = createClient()
    const { definition, criteria, example_companies, pain_points, priority_sports,
      priority_regions, target_titles, min_company_size, max_company_size, recommended_product } = snapshot
    await supabase.from('kb_icp_segments').update({
      definition, criteria, example_companies, pain_points, priority_sports,
      priority_regions, target_titles, min_company_size, max_company_size, recommended_product,
    }).eq('id', id)
    setHistoryOpen(h => ({ ...h, [id]: false }))
    load()
  }

  function upd(id: string, key: keyof Segment, val: string | number | null) {
    setEditing(e => ({ ...e, [id]: { ...e[id], [key]: val } }))
  }

  const chips = (id: string, key: keyof Segment, label: string) => (
    <div>
      <label className="block text-xs text-fg-3 mb-1">{label}</label>
      <ChipInput value={(editing[id]?.[key] as string) ?? ''} onChange={v => upd(id, key, v)} />
    </div>
  )

  if (loading) return <div className="flex items-center justify-center h-32 text-xs text-fg-3">Loading...</div>

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-fg">ICP & Segments</h1>
          <p className="text-xs text-fg-3 mt-0.5">{segments.filter(s => s.active).length} active segments · Every Claude call pulls these dynamically.</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border text-xs text-fg-3 rounded-md opacity-50 cursor-not-allowed" disabled>
          <Plus className="w-3.5 h-3.5" /> Add Segment
        </button>
      </div>

      {segments.map(seg => {
        const isEditing = editMode[seg.id]
        const ed = editing[seg.id] ?? seg
        return (
          <div key={seg.id} className={cn('bg-surface border border-border rounded-xl overflow-hidden', !seg.active && 'opacity-60')}>
            {/* Card header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border-soft">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-fg">{seg.segment_name}</span>
                <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', seg.active ? 'bg-accent-muted text-accent' : 'bg-border text-fg-3')}>
                  {seg.active ? 'Active' : 'Inactive'} · v{seg.version}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => loadHistory(seg.id)} className="text-xs text-fg-3 hover:text-fg flex items-center gap-1 transition-colors">
                  <History className="w-3.5 h-3.5" /> History
                </button>
                {isEditing ? (
                  <>
                    <button onClick={() => setEditMode(m => ({ ...m, [seg.id]: false }))}
                      className="px-3 py-1 text-xs text-fg-2 bg-card border border-border rounded hover:text-fg transition-colors">
                      Cancel
                    </button>
                    <button onClick={() => handleSave(seg.id)} disabled={saving[seg.id]}
                      className="flex items-center gap-1.5 px-3 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim disabled:opacity-60 transition-colors">
                      {saving[seg.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      {saving[seg.id] ? 'Saving...' : saved[seg.id] ? 'Saved ✓' : 'Save'}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleToggleActive(seg.id, seg.active)}
                      className="px-3 py-1 text-xs text-fg-2 bg-card border border-border rounded hover:text-fg transition-colors">
                      {seg.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => setEditMode(m => ({ ...m, [seg.id]: true }))}
                      className="px-3 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim transition-colors">
                      Edit
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Card body */}
            {isEditing ? (
              <div className="p-5 grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs text-fg-3 mb-1">Definition</label>
                  <textarea rows={2} value={ed.definition ?? ''} onChange={e => upd(seg.id, 'definition', e.target.value)}
                    className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-fg-3 mb-1">Criteria / Qualification rules</label>
                  <textarea rows={2} value={ed.criteria ?? ''} onChange={e => upd(seg.id, 'criteria', e.target.value)}
                    className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" />
                </div>
                {chips(seg.id, 'example_companies', 'Example Companies')}
                {chips(seg.id, 'pain_points', 'Pain Points')}
                {chips(seg.id, 'priority_sports', 'Priority Sports')}
                {chips(seg.id, 'priority_regions', 'Priority Regions')}
                <div className="col-span-2">{chips(seg.id, 'target_titles', 'Target Titles')}</div>
                <div>
                  <label className="block text-xs text-fg-3 mb-1">Min company size (employees)</label>
                  <input type="number" value={ed.min_company_size ?? ''} onChange={e => upd(seg.id, 'min_company_size', Number(e.target.value))}
                    className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="block text-xs text-fg-3 mb-1">Max company size (employees)</label>
                  <input type="number" value={ed.max_company_size ?? ''} onChange={e => upd(seg.id, 'max_company_size', Number(e.target.value))}
                    className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-fg-3 mb-1">Recommended Shikenso Product</label>
                  <input value={ed.recommended_product ?? ''} onChange={e => upd(seg.id, 'recommended_product', e.target.value)}
                    className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-3">
                <p className="text-xs text-fg-2">{seg.definition}</p>
                {[
                  { label: 'Examples', val: seg.example_companies },
                  { label: 'Pain points', val: seg.pain_points },
                  { label: 'Priority sports', val: seg.priority_sports },
                  { label: 'Priority regions', val: seg.priority_regions },
                  { label: 'Target titles', val: seg.target_titles },
                ].map(({ label, val }) => val && (
                  <div key={label}>
                    <span className="text-xs text-fg-3">{label}: </span>
                    <span className="inline-flex flex-wrap gap-1">
                      {val.split(',').map(v => v.trim()).filter(Boolean).map(v => (
                        <span key={v} className="px-1.5 py-0.5 bg-border text-fg-2 text-xs rounded">{v}</span>
                      ))}
                    </span>
                  </div>
                ))}
                <div className="flex items-center gap-4 text-xs text-fg-3">
                  {(seg.min_company_size || seg.max_company_size) && (
                    <span>Size: {seg.min_company_size ?? '?'}–{seg.max_company_size ?? '?'} employees</span>
                  )}
                  {seg.recommended_product && <span>Product: <span className="text-accent">{seg.recommended_product}</span></span>}
                </div>
              </div>
            )}

            {/* Version history */}
            {historyOpen[seg.id] && (
              <div className="border-t border-border-soft px-5 py-3 bg-card/50">
                <p className="text-xs font-medium text-fg-2 mb-2">Version history</p>
                {(history[seg.id] ?? []).length === 0 ? (
                  <p className="text-xs text-fg-3">No history yet — will populate after first edit.</p>
                ) : (history[seg.id]).map((h: any) => (
                  <div key={h.id} className="flex items-center justify-between py-1 border-b border-border-soft last:border-0">
                    <span className="text-xs text-fg-3">{new Date(h.created_at).toLocaleString()} — v{h.previous_data?.version}</span>
                    <button onClick={() => handleRestore(seg.id, h.previous_data)} className="text-xs text-accent hover:text-accent-dim transition-colors">
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
