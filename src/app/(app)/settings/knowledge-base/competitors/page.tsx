'use client'

import { useState, useEffect } from 'react'
import { Plus, Save, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type Competitor = {
  id: string; name: string; competitor_name: string; website: string
  positioning_notes: string; shikenso_differentiation: string; differentiation: string
  when_likely_encountered: string; active: boolean; version: number
}

const EMPTY = { name: '', competitor_name: '', website: '', positioning_notes: '', shikenso_differentiation: '', when_likely_encountered: '' }

export default function CompetitorsPage() {
  const [items, setItems] = useState<Competitor[]>([])
  const [editing, setEditing] = useState<Record<string, Partial<Competitor>>>({})
  const [editMode, setEditMode] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState(EMPTY)

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('kb_competitors').select('*').order('name')
    if (data) {
      setItems(data)
      const m: Record<string, Partial<Competitor>> = {}
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
    const displayName = ed.competitor_name || ed.name
    await supabase.from('kb_competitors').update({
      name: displayName, competitor_name: displayName,
      website: ed.website, positioning_notes: ed.positioning_notes,
      shikenso_differentiation: ed.shikenso_differentiation,
      differentiation: ed.shikenso_differentiation,
      when_likely_encountered: ed.when_likely_encountered,
    }).eq('id', id)
    setSaving(s => ({ ...s, [id]: false }))
    setEditMode(m => ({ ...m, [id]: false }))
    load()
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()
    await supabase.from('kb_competitors').insert({
      ...newItem, name: newItem.competitor_name,
      differentiation: newItem.shikenso_differentiation, active: true,
    })
    setNewItem(EMPTY); setShowAdd(false); load()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('kb_competitors').delete().eq('id', id)
    load()
  }

  function upd(id: string, key: keyof Competitor, val: string) {
    setEditing(e => ({ ...e, [id]: { ...e[id], [key]: val } }))
  }

  const ta = (id: string, key: keyof Competitor, label: string, rows = 3) => (
    <div>
      <label className="block text-xs text-fg-3 mb-1">{label}</label>
      <textarea rows={rows} value={(editing[id]?.[key] as string) ?? ''} onChange={e => upd(id, key, e.target.value)}
        className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" />
    </div>
  )

  if (loading) return <div className="flex items-center justify-center h-32 text-xs text-fg-3">Loading...</div>

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-fg">Competitor Awareness</h1>
          <p className="text-xs text-fg-3 mt-0.5">Used by Claude to position Shikenso correctly in outreach and scoring.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded-md hover:bg-accent-dim">
          <Plus className="w-3.5 h-3.5" /> Add Competitor
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-surface border border-border rounded-xl p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-fg-3 mb-1">Competitor Name *</label>
              <input required value={newItem.competitor_name} onChange={e => setNewItem(n => ({ ...n, competitor_name: e.target.value, name: e.target.value }))}
                className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block text-xs text-fg-3 mb-1">Website</label>
              <input value={newItem.website} onChange={e => setNewItem(n => ({ ...n, website: e.target.value }))}
                className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-fg-3 mb-1">Their Positioning</label>
            <textarea rows={2} value={newItem.positioning_notes} onChange={e => setNewItem(n => ({ ...n, positioning_notes: e.target.value }))}
              className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" />
          </div>
          <div>
            <label className="block text-xs text-fg-3 mb-1">Shikenso Differentiates Because…</label>
            <textarea rows={2} value={newItem.shikenso_differentiation} onChange={e => setNewItem(n => ({ ...n, shikenso_differentiation: e.target.value }))}
              className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim">Add</button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 bg-card border border-border text-xs text-fg-2 rounded hover:text-fg">Cancel</button>
          </div>
        </form>
      )}

      {items.map(item => {
        const isEditing = editMode[item.id]
        const displayName = item.competitor_name || item.name
        return (
          <div key={item.id} className={cn('bg-surface border border-border rounded-xl overflow-hidden', !item.active && 'opacity-60')}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border-soft">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-fg">{displayName}</span>
                {item.website && <a href={`https://${item.website}`} target="_blank" rel="noopener" className="text-xs text-fg-3 hover:text-accent">{item.website}</a>}
                <span className="text-xs text-fg-3">v{item.version}</span>
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button onClick={() => setEditMode(m => ({ ...m, [item.id]: false }))} className="px-3 py-1 text-xs text-fg-2 bg-card border border-border rounded">Cancel</button>
                    <button onClick={() => handleSave(item.id)} disabled={saving[item.id]}
                      className="flex items-center gap-1.5 px-3 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim disabled:opacity-60">
                      {saving[item.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      {saving[item.id] ? 'Saving...' : 'Save'}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setEditMode(m => ({ ...m, [item.id]: true }))} className="px-3 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim">Edit</button>
                    <button onClick={() => handleDelete(item.id)} className="text-fg-3 hover:text-score-low transition-colors p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
            {isEditing ? (
              <div className="p-5 grid grid-cols-1 gap-4">
                {ta(item.id, 'positioning_notes', 'Their Positioning')}
                {ta(item.id, 'shikenso_differentiation', 'Shikenso Differentiates Because…')}
                {ta(item.id, 'when_likely_encountered', 'When Likely Encountered', 2)}
              </div>
            ) : (
              <div className="p-5 space-y-3">
                {item.positioning_notes && (
                  <div>
                    <p className="text-xs text-fg-3 mb-0.5">Their positioning</p>
                    <p className="text-xs text-fg-2">{item.positioning_notes}</p>
                  </div>
                )}
                {(item.shikenso_differentiation || item.differentiation) && (
                  <div>
                    <p className="text-xs text-fg-3 mb-0.5">Shikenso advantage</p>
                    <p className="text-xs text-accent">{item.shikenso_differentiation || item.differentiation}</p>
                  </div>
                )}
                {item.when_likely_encountered && (
                  <p className="text-xs text-fg-3">Encountered: {item.when_likely_encountered}</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
