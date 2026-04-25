'use client'

import { useState, useEffect } from 'react'
import { Star, Plus, Trash2, Save, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type ProofPoint = {
  id: string
  headline: string
  context: string
  best_segments: string
  active: boolean
  sort_order: number
}

export default function ProofPointsPage() {
  const [items, setItems] = useState<ProofPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [editing, setEditing] = useState<Record<string, ProofPoint>>({})
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState({ headline: '', context: '', best_segments: '' })

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('kb_proof_points').select('*').order('sort_order')
    if (data) {
      setItems(data)
      const map: Record<string, ProofPoint> = {}
      data.forEach(i => { map[i.id] = { ...i } })
      setEditing(map)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSave(id: string) {
    setSaving(s => ({ ...s, [id]: true }))
    const supabase = createClient()
    const { headline, context, best_segments } = editing[id]
    await supabase.from('kb_proof_points').update({ headline, context, best_segments }).eq('id', id)
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
    const supabase = createClient()
    await supabase.from('kb_proof_points').insert({ ...newItem, active: true, sort_order: items.length + 1 })
    setNewItem({ headline: '', context: '', best_segments: '' })
    setShowAdd(false)
    load()
  }

  if (loading) return <div className="p-6 text-xs text-fg-3">Loading...</div>

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/settings/knowledge-base" className="text-fg-3 hover:text-fg transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <Star className="w-4 h-4 text-accent" />
          <h1 className="text-sm font-semibold text-fg">Proof Points</h1>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded-md hover:bg-accent-dim transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Proof Point
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-surface border border-border rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="col-span-2">
              <label className="block text-xs text-fg-3 mb-1">Headline *</label>
              <input required value={newItem.headline} onChange={e => setNewItem(n => ({...n, headline: e.target.value}))}
                placeholder="e.g. 300% faster reporting than closest competitors"
                className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block text-xs text-fg-3 mb-1">Context / Source</label>
              <input value={newItem.context} onChange={e => setNewItem(n => ({...n, context: e.target.value}))}
                className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block text-xs text-fg-3 mb-1">Best Segments</label>
              <input value={newItem.best_segments} onChange={e => setNewItem(n => ({...n, best_segments: e.target.value}))}
                placeholder="e.g. Brand, Agency"
                className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim">Add</button>
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
                <input value={editing[item.id]?.headline ?? ''} onChange={e => setEditing(ed => ({...ed, [item.id]: {...ed[item.id], headline: e.target.value}}))}
                  className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-xs text-fg-3 mb-1">Context</label>
                <input value={editing[item.id]?.context ?? ''} onChange={e => setEditing(ed => ({...ed, [item.id]: {...ed[item.id], context: e.target.value}}))}
                  className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-xs text-fg-3 mb-1">Best Segments</label>
                <input value={editing[item.id]?.best_segments ?? ''} onChange={e => setEditing(ed => ({...ed, [item.id]: {...ed[item.id], best_segments: e.target.value}}))}
                  className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleSave(item.id)} disabled={saving[item.id]}
                className="flex items-center gap-1 px-3 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim disabled:opacity-60">
                <Save className="w-3 h-3" /> {saving[item.id] ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => handleToggle(item.id, item.active)}
                className="px-3 py-1 bg-surface border border-border text-xs text-fg-2 rounded hover:text-fg transition-colors">
                {item.active ? 'Deactivate' : 'Activate'}
              </button>
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
