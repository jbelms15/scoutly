'use client'

import { useState, useEffect } from 'react'
import { Plus, Save, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ChipInput from '@/components/chip-input'
import { cn } from '@/lib/utils'

type KWSet = {
  id: string; name: string; keyword_set_name: string; keywords: string
  signal_source: string; segment: string; target_tier: string; active: boolean; version: number
}

const SOURCE_META: Record<string, { label: string; color: string }> = {
  GOOGLE_ALERTS:   { label: 'Google Alerts',   color: 'bg-warm/10 text-warm' },
  LINKEDIN_JOBS:   { label: 'LinkedIn Jobs',   color: 'bg-cold/10 text-cold' },
  LEMLIST_WATCHER: { label: 'Lemlist Watcher', color: 'bg-accent/10 text-accent' },
  OTHER:           { label: 'Other',           color: 'bg-border text-fg-3' },
}

const SOURCES = Object.keys(SOURCE_META)
const TIERS = ['ANY', 'TIER_1', 'TIER_2', 'TIER_3']
const EMPTY = { keyword_set_name: '', keywords: '', signal_source: 'GOOGLE_ALERTS', segment: '', target_tier: 'ANY' }

export default function SignalKeywordsPage() {
  const [items, setItems] = useState<KWSet[]>([])
  const [editing, setEditing] = useState<Record<string, Partial<KWSet>>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState(EMPTY)

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('kb_signal_keywords').select('*').order('signal_source').order('name')
    if (data) {
      setItems(data)
      const m: Record<string, Partial<KWSet>> = {}
      data.forEach(i => { m[i.id] = { ...i } })
      setEditing(m)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSave(id: string) {
    setSaving(s => ({ ...s, [id]: true }))
    const supabase = createClient()
    const ed = editing[id]
    await supabase.from('kb_signal_keywords').update({
      name: ed.keyword_set_name || ed.name, keyword_set_name: ed.keyword_set_name,
      keywords: ed.keywords, signal_source: ed.signal_source,
      segment: ed.segment, target_tier: ed.target_tier,
    }).eq('id', id)
    setSaving(s => ({ ...s, [id]: false }))
    load()
  }

  async function handleToggle(id: string, active: boolean) {
    const supabase = createClient()
    await supabase.from('kb_signal_keywords').update({ active: !active }).eq('id', id)
    load()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('kb_signal_keywords').delete().eq('id', id)
    load()
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()
    await supabase.from('kb_signal_keywords').insert({ ...newItem, name: newItem.keyword_set_name, active: true })
    setNewItem(EMPTY); setShowAdd(false); load()
  }

  function upd(id: string, key: keyof KWSet, val: string) {
    setEditing(e => ({ ...e, [id]: { ...e[id], [key]: val } }))
  }

  const grouped = SOURCES.reduce((acc, src) => {
    acc[src] = items.filter(i => i.signal_source === src)
    return acc
  }, {} as Record<string, KWSet[]>)

  if (loading) return <div className="flex items-center justify-center h-32 text-xs text-fg-3">Loading...</div>

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-fg">Signal Keywords</h1>
          <p className="text-xs text-fg-3 mt-0.5">{items.filter(i => i.active).length} active keyword sets across {SOURCES.length} signal sources.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded-md hover:bg-accent-dim">
          <Plus className="w-3.5 h-3.5" /> Add Keyword Set
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-surface border border-border rounded-xl p-5 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-fg-3 mb-1">Name *</label>
              <input required value={newItem.keyword_set_name} onChange={e => setNewItem(n => ({ ...n, keyword_set_name: e.target.value }))}
                className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block text-xs text-fg-3 mb-1">Signal Source</label>
              <select value={newItem.signal_source} onChange={e => setNewItem(n => ({ ...n, signal_source: e.target.value }))}
                className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent">
                {SOURCES.map(s => <option key={s} value={s}>{SOURCE_META[s].label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-fg-3 mb-1">Target Tier</label>
              <select value={newItem.target_tier} onChange={e => setNewItem(n => ({ ...n, target_tier: e.target.value }))}
                className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent">
                {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-fg-3 mb-1">Keywords</label>
            <ChipInput value={newItem.keywords} onChange={v => setNewItem(n => ({ ...n, keywords: v }))} placeholder="Add keyword and press Enter..." />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim">Add</button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 bg-card border border-border text-xs text-fg-2 rounded hover:text-fg">Cancel</button>
          </div>
        </form>
      )}

      {SOURCES.map(src => {
        const group = grouped[src]
        if (group.length === 0) return null
        const meta = SOURCE_META[src]
        return (
          <div key={src}>
            <div className="flex items-center gap-2 mb-3">
              <span className={cn('px-2 py-0.5 rounded text-xs font-semibold', meta.color)}>{meta.label}</span>
              <span className="text-xs text-fg-3">{group.filter(i => i.active).length} active sets</span>
            </div>
            <div className="space-y-2">
              {group.map(item => (
                <div key={item.id} className={cn('bg-surface border border-border rounded-lg p-4', !item.active && 'opacity-50')}>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-fg-3 mb-1">Name</label>
                      <input value={editing[item.id]?.keyword_set_name ?? editing[item.id]?.name ?? ''}
                        onChange={e => upd(item.id, 'keyword_set_name', e.target.value)}
                        className="w-full bg-card border border-border rounded px-2 py-1.5 text-xs text-fg focus:outline-none focus:border-accent" />
                    </div>
                    <div>
                      <label className="block text-xs text-fg-3 mb-1">Source</label>
                      <select value={editing[item.id]?.signal_source ?? ''} onChange={e => upd(item.id, 'signal_source', e.target.value)}
                        className="w-full bg-card border border-border rounded px-2 py-1.5 text-xs text-fg focus:outline-none focus:border-accent">
                        {SOURCES.map(s => <option key={s} value={s}>{SOURCE_META[s].label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-fg-3 mb-1">Target Tier</label>
                      <select value={editing[item.id]?.target_tier ?? 'ANY'} onChange={e => upd(item.id, 'target_tier', e.target.value)}
                        className="w-full bg-card border border-border rounded px-2 py-1.5 text-xs text-fg focus:outline-none focus:border-accent">
                        {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="block text-xs text-fg-3 mb-1">Keywords</label>
                    <ChipInput value={editing[item.id]?.keywords ?? ''} onChange={v => upd(item.id, 'keywords', v)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSave(item.id)} disabled={saving[item.id]}
                      className="flex items-center gap-1 px-3 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim disabled:opacity-60">
                      {saving[item.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      {saving[item.id] ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => handleToggle(item.id, item.active)} className="px-3 py-1 bg-card border border-border text-xs text-fg-2 rounded hover:text-fg">
                      {item.active ? 'Pause' : 'Activate'}
                    </button>
                    <span className="text-xs text-fg-3">v{item.version}</span>
                    <button onClick={() => handleDelete(item.id)} className="ml-auto text-fg-3 hover:text-score-low">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
