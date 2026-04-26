'use client'

import { useState, useEffect } from 'react'
import { Plus, Save, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ChipInput from '@/components/chip-input'
import { cn } from '@/lib/utils'

type ProofPoint = {
  id: string; headline: string; full_context: string; source_url: string
  best_segments: string; stat_value: string; stat_unit: string
  case_study_company: string; active: boolean; version: number; sort_order: number
}

const EMPTY = { headline: '', full_context: '', source_url: '', best_segments: '', stat_value: '', stat_unit: '', case_study_company: '' }

export default function ProofPointsPage() {
  const [items, setItems] = useState<ProofPoint[]>([])
  const [editing, setEditing] = useState<Record<string, Partial<ProofPoint>>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState(EMPTY)
  const [adding, setAdding] = useState(false)

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('kb_proof_points').select('*').order('sort_order')
    if (data) {
      setItems(data)
      const m: Record<string, Partial<ProofPoint>> = {}
      data.forEach(i => { m[i.id] = { ...i } })
      setEditing(m)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSave(id: string) {
    setSaving(s => ({ ...s, [id]: true }))
    const supabase = createClient()
    const { headline, full_context, source_url, best_segments, stat_value, stat_unit, case_study_company } = editing[id]
    await supabase.from('kb_proof_points').update({ headline, full_context, source_url, best_segments, stat_value, stat_unit, case_study_company }).eq('id', id)
    setSaving(s => ({ ...s, [id]: false }))
    load()
  }

  async function handleToggle(id: string, active: boolean) {
    const supabase = createClient()
    await supabase.from('kb_proof_points').update({ active: !active }).eq('id', id)
    load()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('kb_proof_points').delete().eq('id', id)
    load()
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    const supabase = createClient()
    await supabase.from('kb_proof_points').insert({ ...newItem, active: true, sort_order: items.length + 1 })
    setNewItem(EMPTY)
    setShowAdd(false)
    setAdding(false)
    load()
  }

  function upd(id: string, key: keyof ProofPoint, val: string) {
    setEditing(e => ({ ...e, [id]: { ...e[id], [key]: val } }))
  }

  if (loading) return <div className="flex items-center justify-center h-32 text-xs text-fg-3">Loading...</div>

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-sm font-semibold text-fg">Proof Points</h1>
          <p className="text-xs text-fg-3 mt-0.5">{items.filter(i => i.active).length} active · Selectively referenced in outreach based on segment.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded-md hover:bg-accent-dim">
          <Plus className="w-3.5 h-3.5" /> Add Proof Point
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-surface border border-border rounded-xl p-5 mb-4 space-y-3">
          <div>
            <label className="block text-xs text-fg-3 mb-1">Headline *</label>
            <input required value={newItem.headline} onChange={e => setNewItem(n => ({ ...n, headline: e.target.value }))}
              placeholder="e.g. 300% faster reporting time..."
              className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-fg-3 mb-1">Context / Source</label>
              <input value={newItem.full_context} onChange={e => setNewItem(n => ({ ...n, full_context: e.target.value }))}
                className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block text-xs text-fg-3 mb-1">Case Study Company</label>
              <input value={newItem.case_study_company} onChange={e => setNewItem(n => ({ ...n, case_study_company: e.target.value }))}
                className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-fg-3 mb-1">Best Segments</label>
            <ChipInput value={newItem.best_segments} onChange={v => setNewItem(n => ({ ...n, best_segments: v }))} placeholder="Rights Holder, Brand, All..." />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={adding} className="px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim disabled:opacity-60">
              {adding ? 'Adding...' : 'Add'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 bg-card border border-border text-xs text-fg-2 rounded hover:text-fg">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className={cn('bg-surface border border-border rounded-lg p-4', !item.active && 'opacity-50')}>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="col-span-2">
                <label className="block text-xs text-fg-3 mb-1">Headline</label>
                <input value={editing[item.id]?.headline ?? ''} onChange={e => upd(item.id, 'headline', e.target.value)}
                  className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-xs text-fg-3 mb-1">Context</label>
                <input value={editing[item.id]?.full_context ?? ''} onChange={e => upd(item.id, 'full_context', e.target.value)}
                  className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-xs text-fg-3 mb-1">Case Study Company</label>
                <input value={editing[item.id]?.case_study_company ?? ''} onChange={e => upd(item.id, 'case_study_company', e.target.value)}
                  className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-fg-3 mb-1">Best Segments</label>
                <ChipInput value={editing[item.id]?.best_segments ?? ''} onChange={v => upd(item.id, 'best_segments', v)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleSave(item.id)} disabled={saving[item.id]}
                className="flex items-center gap-1 px-3 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim disabled:opacity-60">
                {saving[item.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                {saving[item.id] ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => handleToggle(item.id, item.active)}
                className="px-3 py-1 bg-card border border-border text-xs text-fg-2 rounded hover:text-fg">
                {item.active ? 'Deactivate' : 'Activate'}
              </button>
              <span className="text-xs text-fg-3 ml-1">v{item.version}</span>
              <button onClick={() => handleDelete(item.id)} className="ml-auto text-fg-3 hover:text-score-low transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
