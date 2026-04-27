'use client'

import { useState, useEffect } from 'react'
import { Plus, Save, History, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ChipInput from '@/components/chip-input'
import KBSourceBadge from '@/components/kb-source-badge'
import { cn } from '@/lib/utils'

type Segment = {
  id: string; segment_name: string; definition: string; criteria: string
  example_companies: string; pain_points: string; priority_sports: string
  priority_regions: string; target_titles: string; min_company_size: number | null
  max_company_size: number | null; recommended_product: string
  framing_rule: string; buyer_psyche_one_liner: string; typical_deal_size: string
  why_they_buy_us: string; target_title_array: string[]; do_not_target_titles: string[]
  source?: string; needs_review?: boolean
  active: boolean; version: number; sort_order: number; updated_at: string
}

const FRAMING_COLOURS: Record<string, string> = {
  ROI_FIRST:      'bg-score-high/10 text-score-high',
  REVENUE_GROWTH: 'bg-accent/10 text-accent',
  EFFICIENCY:     'bg-warm/10 text-warm',
  VISIBILITY:     'bg-border text-fg-2',
}

function arrayToChips(arr: string[] | null | undefined): string {
  return (arr ?? []).join(', ')
}
function chipsToArray(val: string): string[] {
  return val.split(',').map(v => v.trim()).filter(Boolean)
}

export default function ICPPage() {
  const [segments, setSegments] = useState<Segment[]>([])
  const [editing, setEditing]   = useState<Record<string, Partial<Segment>>>({})
  const [editMode, setEditMode] = useState<Record<string, boolean>>({})
  const [saving, setSaving]     = useState<Record<string, boolean>>({})
  const [saved, setSaved]       = useState<Record<string, boolean>>({})
  const [historyOpen, setHistoryOpen] = useState<Record<string, boolean>>({})
  const [history, setHistory]   = useState<Record<string, unknown[]>>({})
  const [loading, setLoading]   = useState(true)

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
    const ed = editing[id]
    await supabase.from('kb_icp_segments').update({
      definition: ed.definition, criteria: ed.criteria,
      example_companies: ed.example_companies, pain_points: ed.pain_points,
      priority_sports: ed.priority_sports, priority_regions: ed.priority_regions,
      target_titles: ed.target_titles, min_company_size: ed.min_company_size,
      max_company_size: ed.max_company_size, recommended_product: ed.recommended_product,
      framing_rule: ed.framing_rule, buyer_psyche_one_liner: ed.buyer_psyche_one_liner,
      typical_deal_size: ed.typical_deal_size, why_they_buy_us: ed.why_they_buy_us,
      target_title_array: ed.target_title_array, do_not_target_titles: ed.do_not_target_titles,
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

  async function handleRestore(id: string, snapshot: Partial<Segment>) {
    const supabase = createClient()
    await supabase.from('kb_icp_segments').update({
      definition: snapshot.definition, criteria: snapshot.criteria,
      example_companies: snapshot.example_companies, pain_points: snapshot.pain_points,
      priority_sports: snapshot.priority_sports, priority_regions: snapshot.priority_regions,
      target_titles: snapshot.target_titles, min_company_size: snapshot.min_company_size,
      max_company_size: snapshot.max_company_size, recommended_product: snapshot.recommended_product,
    }).eq('id', id)
    setHistoryOpen(h => ({ ...h, [id]: false }))
    load()
  }

  function upd(id: string, key: keyof Segment, val: string | number | null | string[]) {
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
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border-soft">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-fg">{seg.segment_name}</span>
                <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', seg.active ? 'bg-accent-muted text-accent' : 'bg-border text-fg-3')}>
                  {seg.active ? 'Active' : 'Inactive'} · v{seg.version}
                </span>
                {seg.framing_rule && (
                  <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium border', FRAMING_COLOURS[seg.framing_rule] ?? 'bg-border text-fg-3 border-border')}>
                    {seg.framing_rule}
                  </span>
                )}
                <KBSourceBadge source={seg.source} />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => loadHistory(seg.id)} className="text-xs text-fg-3 hover:text-fg flex items-center gap-1">
                  <History className="w-3.5 h-3.5" /> History
                </button>
                {isEditing ? (
                  <>
                    <button onClick={() => setEditMode(m => ({ ...m, [seg.id]: false }))} className="px-3 py-1 text-xs text-fg-2 bg-card border border-border rounded hover:text-fg">Cancel</button>
                    <button onClick={() => handleSave(seg.id)} disabled={saving[seg.id]}
                      className="flex items-center gap-1.5 px-3 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim disabled:opacity-60">
                      {saving[seg.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      {saving[seg.id] ? 'Saving...' : saved[seg.id] ? 'Saved ✓' : 'Save'}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleToggleActive(seg.id, seg.active)} className="px-3 py-1 text-xs text-fg-2 bg-card border border-border rounded hover:text-fg">
                      {seg.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => setEditMode(m => ({ ...m, [seg.id]: true }))} className="px-3 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim">Edit</button>
                  </>
                )}
              </div>
            </div>

            {/* Body */}
            {isEditing ? (
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs text-fg-3 mb-1">Definition</label>
                    <textarea rows={2} value={ed.definition ?? ''} onChange={e => upd(seg.id, 'definition', e.target.value)} className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-fg-3 mb-1">Buyer Psyche (one liner)</label>
                    <input value={ed.buyer_psyche_one_liner ?? ''} onChange={e => upd(seg.id, 'buyer_psyche_one_liner', e.target.value)} className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="block text-xs text-fg-3 mb-1">Framing Rule</label>
                    <select value={ed.framing_rule ?? ''} onChange={e => upd(seg.id, 'framing_rule', e.target.value)} className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent">
                      <option value="">—</option>
                      {['ROI_FIRST','REVENUE_GROWTH','EFFICIENCY','VISIBILITY'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-fg-3 mb-1">Typical Deal Size</label>
                    <input value={ed.typical_deal_size ?? ''} onChange={e => upd(seg.id, 'typical_deal_size', e.target.value)} placeholder="€20,000–€120,000/year" className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-fg-3 mb-1">Why They Buy Us</label>
                    <textarea rows={2} value={ed.why_they_buy_us ?? ''} onChange={e => upd(seg.id, 'why_they_buy_us', e.target.value)} className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-fg-3 mb-1">Criteria / Qualification rules</label>
                    <textarea rows={2} value={ed.criteria ?? ''} onChange={e => upd(seg.id, 'criteria', e.target.value)} className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" />
                  </div>
                  {chips(seg.id, 'example_companies', 'Example Companies')}
                  {chips(seg.id, 'priority_sports', 'Priority Sports')}
                  {chips(seg.id, 'priority_regions', 'Priority Regions')}
                  <div />
                  <div className="col-span-2">
                    <label className="block text-xs text-fg-3 mb-1">Target Titles (comma-separated array)</label>
                    <ChipInput value={arrayToChips(ed.target_title_array)} onChange={v => upd(seg.id, 'target_title_array', chipsToArray(v))} placeholder="Head of Sponsorship, CMO..." />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-fg-3 mb-1 text-score-low">Do-Not-Target Titles</label>
                    <ChipInput value={arrayToChips(ed.do_not_target_titles)} onChange={v => upd(seg.id, 'do_not_target_titles', chipsToArray(v))} placeholder="IT Manager, HR Manager..." />
                    <p className="text-xs text-fg-3 mt-1">Leads with these titles are automatically disqualified during scoring.</p>
                  </div>
                  <div>
                    <label className="block text-xs text-fg-3 mb-1">Min company size (employees)</label>
                    <input type="number" value={ed.min_company_size ?? ''} onChange={e => upd(seg.id, 'min_company_size', Number(e.target.value))} className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="block text-xs text-fg-3 mb-1">Max company size (employees)</label>
                    <input type="number" value={ed.max_company_size ?? ''} onChange={e => upd(seg.id, 'max_company_size', Number(e.target.value))} className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-fg-3 mb-1">Recommended Module</label>
                    <input value={ed.recommended_product ?? ''} onChange={e => upd(seg.id, 'recommended_product', e.target.value)} className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-3">
                <p className="text-xs text-fg-2">{seg.definition}</p>
                {seg.buyer_psyche_one_liner && (
                  <p className="text-xs text-fg italic">"{seg.buyer_psyche_one_liner}"</p>
                )}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {seg.typical_deal_size && <div><span className="text-fg-3">Deal size: </span><span className="text-accent font-medium">{seg.typical_deal_size}</span></div>}
                  {seg.why_they_buy_us && <div className="col-span-2"><span className="text-fg-3">Why us: </span><span className="text-fg-2">{seg.why_they_buy_us}</span></div>}
                </div>
                {[
                  { label: 'Examples', val: seg.example_companies },
                  { label: 'Priority sports', val: seg.priority_sports },
                  { label: 'Priority regions', val: seg.priority_regions },
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
                {seg.target_title_array?.length > 0 && (
                  <div>
                    <span className="text-xs text-fg-3">Target titles: </span>
                    <span className="inline-flex flex-wrap gap-1">
                      {seg.target_title_array.map(t => <span key={t} className="px-1.5 py-0.5 bg-score-high/10 text-score-high text-xs rounded">{t}</span>)}
                    </span>
                  </div>
                )}
                {seg.do_not_target_titles?.length > 0 && (
                  <div>
                    <span className="text-xs text-score-low">Do not target: </span>
                    <span className="inline-flex flex-wrap gap-1">
                      {seg.do_not_target_titles.map(t => <span key={t} className="px-1.5 py-0.5 bg-score-low/10 text-score-low text-xs rounded">{t}</span>)}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-4 text-xs text-fg-3">
                  {(seg.min_company_size || seg.max_company_size) && (
                    <span>Size: {seg.min_company_size ?? '?'}–{seg.max_company_size ?? '?'} employees</span>
                  )}
                  {seg.recommended_product && <span>Module: <span className="text-accent">{seg.recommended_product}</span></span>}
                </div>
              </div>
            )}

            {/* Version history */}
            {historyOpen[seg.id] && (
              <div className="border-t border-border-soft px-5 py-3 bg-card/50">
                <p className="text-xs font-medium text-fg-2 mb-2">Version history</p>
                {(history[seg.id] ?? []).length === 0 ? (
                  <p className="text-xs text-fg-3">No history yet — will populate after first edit.</p>
                ) : (history[seg.id] as Array<{ id: string; created_at: string; previous_data: Partial<Segment> }>).map(h => (
                  <div key={h.id} className="flex items-center justify-between py-1 border-b border-border-soft last:border-0">
                    <span className="text-xs text-fg-3">{new Date(h.created_at).toLocaleString()} — v{h.previous_data?.version}</span>
                    <button onClick={() => handleRestore(seg.id, h.previous_data)} className="text-xs text-accent hover:text-accent-dim">Restore</button>
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
