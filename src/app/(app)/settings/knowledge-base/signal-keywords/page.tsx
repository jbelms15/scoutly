'use client'

import { useState, useEffect } from 'react'
import { Radio, Plus, Save, Trash2, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type KW = { id: string; name: string; signal_source: string; keywords: string; segment: string; target_tier: string; active: boolean }

export default function SignalKeywordsPage() {
  const [items, setItems] = useState<KW[]>([])
  const [editing, setEditing] = useState<Record<string, KW>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', signal_source: 'linkedin_jobs', keywords: '', segment: '', target_tier: 'ANY' })

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('kb_signal_keywords').select('*').order('signal_source').order('name')
    if (data) { setItems(data); const m: Record<string, KW> = {}; data.forEach(i => { m[i.id] = {...i} }); setEditing(m) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSave(id: string) {
    setSaving(s => ({...s, [id]: true}))
    const supabase = createClient()
    const { name, signal_source, keywords, segment, target_tier } = editing[id]
    await supabase.from('kb_signal_keywords').update({ name, signal_source, keywords, segment, target_tier }).eq('id', id)
    setSaving(s => ({...s, [id]: false}))
    load()
  }

  async function handleToggle(id: string, active: boolean) {
    const supabase = createClient()
    await supabase.from('kb_signal_keywords').update({ active: !active }).eq('id', id)
    load()
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()
    await supabase.from('kb_signal_keywords').insert({ ...newItem, active: true })
    setNewItem({ name: '', signal_source: 'linkedin_jobs', keywords: '', segment: '', target_tier: 'ANY' })
    setShowAdd(false)
    load()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('kb_signal_keywords').delete().eq('id', id)
    load()
  }

  const SOURCE_LABELS: Record<string, string> = {
    linkedin_jobs: 'LinkedIn Jobs',
    google_alerts: 'Google Alerts',
    agent: 'Agent',
    all: 'All Sources',
  }

  if (loading) return <div className="p-6 text-xs text-fg-3">Loading...</div>

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/settings/knowledge-base" className="text-fg-3 hover:text-fg"><ChevronLeft className="w-4 h-4" /></Link>
          <Radio className="w-4 h-4 text-accent" />
          <h1 className="text-sm font-semibold text-fg">Signal Keywords</h1>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded-md hover:bg-accent-dim">
          <Plus className="w-3.5 h-3.5" /> Add Keyword Set
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-surface border border-border rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-fg-3 mb-1">Name *</label>
              <input required value={newItem.name} onChange={e => setNewItem(n => ({...n, name: e.target.value}))}
                className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block text-xs text-fg-3 mb-1">Signal Source</label>
              <select value={newItem.signal_source} onChange={e => setNewItem(n => ({...n, signal_source: e.target.value}))}
                className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent">
                {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-fg-3 mb-1">Target Tier</label>
              <select value={newItem.target_tier} onChange={e => setNewItem(n => ({...n, target_tier: e.target.value}))}
                className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent">
                <option value="ANY">Any</option><option value="TIER_1">Tier 1</option>
                <option value="TIER_2">Tier 2</option><option value="TIER_3">Tier 3</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-fg-3 mb-1">Keywords (comma-separated) *</label>
            <textarea required rows={2} value={newItem.keywords} onChange={e => setNewItem(n => ({...n, keywords: e.target.value}))}
              placeholder="sponsorship manager, head of partnerships, ..."
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
          <div key={item.id} className={cn('bg-surface border border-border rounded-lg p-4', !item.active && 'opacity-50')}>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs text-fg-3 mb-1">Name</label>
                <input value={editing[item.id]?.name ?? ''} onChange={e => setEditing(ed => ({...ed, [item.id]: {...ed[item.id], name: e.target.value}}))}
                  className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-xs text-fg-3 mb-1">Source</label>
                <select value={editing[item.id]?.signal_source ?? ''} onChange={e => setEditing(ed => ({...ed, [item.id]: {...ed[item.id], signal_source: e.target.value}}))}
                  className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent">
                  {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-fg-3 mb-1">Target Tier</label>
                <select value={editing[item.id]?.target_tier ?? 'ANY'} onChange={e => setEditing(ed => ({...ed, [item.id]: {...ed[item.id], target_tier: e.target.value}}))}
                  className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent">
                  <option value="ANY">Any</option><option value="TIER_1">Tier 1</option>
                  <option value="TIER_2">Tier 2</option><option value="TIER_3">Tier 3</option>
                </select>
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-xs text-fg-3 mb-1">Keywords</label>
              <textarea rows={2} value={editing[item.id]?.keywords ?? ''} onChange={e => setEditing(ed => ({...ed, [item.id]: {...ed[item.id], keywords: e.target.value}}))}
                className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleSave(item.id)} disabled={saving[item.id]}
                className="flex items-center gap-1 px-3 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim disabled:opacity-60">
                <Save className="w-3 h-3" /> {saving[item.id] ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => handleToggle(item.id, item.active)}
                className="px-3 py-1 bg-surface border border-border text-xs text-fg-2 rounded hover:text-fg">
                {item.active ? 'Pause' : 'Activate'}
              </button>
              <button onClick={() => handleDelete(item.id)} className="ml-auto text-fg-3 hover:text-score-low">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
