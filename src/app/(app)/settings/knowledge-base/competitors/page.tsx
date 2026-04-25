'use client'

import { useState, useEffect } from 'react'
import { Swords, Plus, Save, Trash2, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type Competitor = { id: string; name: string; positioning_notes: string; differentiation: string; active: boolean }

export default function CompetitorsPage() {
  const [items, setItems] = useState<Competitor[]>([])
  const [editing, setEditing] = useState<Record<string, Competitor>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', positioning_notes: '', differentiation: '' })

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('kb_competitors').select('*').order('name')
    if (data) { setItems(data); const m: Record<string, Competitor> = {}; data.forEach(i => { m[i.id] = {...i} }); setEditing(m) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSave(id: string) {
    setSaving(s => ({...s, [id]: true}))
    const supabase = createClient()
    const { name, positioning_notes, differentiation } = editing[id]
    await supabase.from('kb_competitors').update({ name, positioning_notes, differentiation }).eq('id', id)
    setSaving(s => ({...s, [id]: false}))
    load()
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()
    await supabase.from('kb_competitors').insert({ ...newItem, active: true })
    setNewItem({ name: '', positioning_notes: '', differentiation: '' })
    setShowAdd(false)
    load()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('kb_competitors').delete().eq('id', id)
    load()
  }

  if (loading) return <div className="p-6 text-xs text-fg-3">Loading...</div>

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/settings/knowledge-base" className="text-fg-3 hover:text-fg"><ChevronLeft className="w-4 h-4" /></Link>
          <Swords className="w-4 h-4 text-accent" />
          <h1 className="text-sm font-semibold text-fg">Competitor Awareness</h1>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded-md hover:bg-accent-dim">
          <Plus className="w-3.5 h-3.5" /> Add Competitor
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-surface border border-border rounded-lg p-4 mb-4 space-y-3">
          <div>
            <label className="block text-xs text-fg-3 mb-1">Competitor Name *</label>
            <input required value={newItem.name} onChange={e => setNewItem(n => ({...n, name: e.target.value}))}
              className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-xs text-fg-3 mb-1">Positioning Notes</label>
            <textarea rows={2} value={newItem.positioning_notes} onChange={e => setNewItem(n => ({...n, positioning_notes: e.target.value}))}
              className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" />
          </div>
          <div>
            <label className="block text-xs text-fg-3 mb-1">How Shikenso Differentiates</label>
            <textarea rows={2} value={newItem.differentiation} onChange={e => setNewItem(n => ({...n, differentiation: e.target.value}))}
              className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim">Add</button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 bg-card border border-border text-xs text-fg-2 rounded">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className={cn('bg-surface border border-border rounded-lg overflow-hidden', !item.active && 'opacity-50')}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-soft">
              <input value={editing[item.id]?.name ?? ''} onChange={e => setEditing(ed => ({...ed, [item.id]: {...ed[item.id], name: e.target.value}}))}
                className="text-sm font-semibold text-accent bg-transparent border-none outline-none focus:underline" />
              <div className="flex items-center gap-2">
                <button onClick={() => handleSave(item.id)} disabled={saving[item.id]}
                  className="flex items-center gap-1 px-3 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim disabled:opacity-60">
                  <Save className="w-3 h-3" /> {saving[item.id] ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => handleDelete(item.id)} className="text-fg-3 hover:text-score-low transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-fg-3 mb-1">Positioning Notes</label>
                <textarea rows={3} value={editing[item.id]?.positioning_notes ?? ''} onChange={e => setEditing(ed => ({...ed, [item.id]: {...ed[item.id], positioning_notes: e.target.value}}))}
                  className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" />
              </div>
              <div>
                <label className="block text-xs text-fg-3 mb-1">How Shikenso Differentiates</label>
                <textarea rows={3} value={editing[item.id]?.differentiation ?? ''} onChange={e => setEditing(ed => ({...ed, [item.id]: {...ed[item.id], differentiation: e.target.value}}))}
                  className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
