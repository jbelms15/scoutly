'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Plus, Save, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ChipInput from '@/components/chip-input'
import { cn } from '@/lib/utils'

type Module    = { id: string; name: string; product_name: string; description: string; target_segments: string; key_differentiators: string; positioning_statement: string; active: boolean; sort_order: number }
type ProofPoint = { id: string; headline: string; full_context: string; best_segments: string; case_study_company: string; active: boolean; sort_order: number }
type Competitor = { id: string; name: string; competitor_name: string; website: string; positioning_notes: string; shikenso_differentiation: string; differentiation: string; when_likely_encountered: string; active: boolean }

function Section({ title, count, children, defaultOpen = true }: { title: string; count: number; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-card/50 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-fg">{title}</span>
          <span className="px-1.5 py-0.5 bg-accent-muted text-accent text-xs rounded font-medium">{count}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-fg-3" /> : <ChevronDown className="w-4 h-4 text-fg-3" />}
      </button>
      {open && <div className="border-t border-border-soft">{children}</div>}
    </div>
  )
}

function ModulesSection() {
  const [items, setItems]     = useState<Module[]>([])
  const [editing, setEditing] = useState<Record<string, Partial<Module>>>({})
  const [editMode, setEditMode] = useState<Record<string, boolean>>({})
  const [saving, setSaving]   = useState<Record<string, boolean>>({})

  async function load() {
    const { data } = await createClient().from('kb_modules').select('*').order('sort_order')
    if (data) { setItems(data); const m: Record<string, Partial<Module>> = {}; data.forEach(i => { m[i.id] = { ...i } }); setEditing(m) }
  }
  useEffect(() => { load() }, [])

  async function handleSave(id: string) {
    setSaving(s => ({ ...s, [id]: true }))
    const ed = editing[id]
    await createClient().from('kb_modules').update({
      description: ed.description, positioning_statement: ed.positioning_statement,
      target_segments: ed.target_segments, key_differentiators: ed.key_differentiators,
    }).eq('id', id)
    setSaving(s => ({ ...s, [id]: false })); setEditMode(m => ({ ...m, [id]: false })); load()
  }

  function upd(id: string, key: keyof Module, val: string) { setEditing(e => ({ ...e, [id]: { ...e[id], [key]: val } })) }

  return (
    <div className="p-5 space-y-4">
      {items.map(item => {
        const isEditing = editMode[item.id]; const ed = editing[item.id] ?? item
        return (
          <div key={item.id} className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-soft">
              <span className="text-xs font-semibold text-accent">{item.product_name || item.name}</span>
              <div className="flex gap-1.5">
                {isEditing ? (
                  <>
                    <button onClick={() => setEditMode(m => ({ ...m, [item.id]: false }))} className="px-2 py-1 text-xs text-fg-2 bg-surface border border-border rounded">Cancel</button>
                    <button onClick={() => handleSave(item.id)} disabled={saving[item.id]} className="flex items-center gap-1 px-2 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim disabled:opacity-60">
                      {saving[item.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                    </button>
                  </>
                ) : (
                  <button onClick={() => setEditMode(m => ({ ...m, [item.id]: true }))} className="px-2 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim">Edit</button>
                )}
              </div>
            </div>
            {isEditing ? (
              <div className="p-4 space-y-3">
                <div><label className="block text-xs text-fg-3 mb-1">Description</label><textarea rows={2} value={ed.description ?? ''} onChange={e => upd(item.id, 'description', e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" /></div>
                <div><label className="block text-xs text-fg-3 mb-1">Positioning Statement</label><input value={ed.positioning_statement ?? ''} onChange={e => upd(item.id, 'positioning_statement', e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" /></div>
                <div><label className="block text-xs text-fg-3 mb-1">Target Segments</label><ChipInput value={ed.target_segments ?? ''} onChange={v => upd(item.id, 'target_segments', v)} /></div>
                <div><label className="block text-xs text-fg-3 mb-1">Key Differentiators</label><ChipInput value={ed.key_differentiators ?? ''} onChange={v => upd(item.id, 'key_differentiators', v)} /></div>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                <p className="text-xs text-fg-2">{item.description}</p>
                {item.positioning_statement && <p className="text-xs text-accent italic">"{item.positioning_statement}"</p>}
                {item.key_differentiators && <div className="flex flex-wrap gap-1">{item.key_differentiators.split(',').map(d => d.trim()).filter(Boolean).map(d => <span key={d} className="px-1.5 py-0.5 bg-accent-muted text-accent text-xs rounded">{d}</span>)}</div>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ProofPointsSection() {
  const [items, setItems]     = useState<ProofPoint[]>([])
  const [editing, setEditing] = useState<Record<string, Partial<ProofPoint>>>({})
  const [saving, setSaving]   = useState<Record<string, boolean>>({})
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState({ headline: '', full_context: '', best_segments: '', case_study_company: '' })

  async function load() {
    const { data } = await createClient().from('kb_proof_points').select('*').order('sort_order')
    if (data) { setItems(data); const m: Record<string, Partial<ProofPoint>> = {}; data.forEach(i => { m[i.id] = { ...i } }); setEditing(m) }
  }
  useEffect(() => { load() }, [])

  async function handleSave(id: string) {
    setSaving(s => ({ ...s, [id]: true }))
    const { headline, full_context, best_segments, case_study_company } = editing[id]
    await createClient().from('kb_proof_points').update({ headline, full_context, best_segments, case_study_company }).eq('id', id)
    setSaving(s => ({ ...s, [id]: false })); load()
  }
  async function handleToggle(id: string, active: boolean) { await createClient().from('kb_proof_points').update({ active: !active }).eq('id', id); load() }
  async function handleDelete(id: string) { await createClient().from('kb_proof_points').delete().eq('id', id); load() }
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    await createClient().from('kb_proof_points').insert({ ...newItem, active: true, sort_order: items.length + 1 })
    setNewItem({ headline: '', full_context: '', best_segments: '', case_study_company: '' }); setShowAdd(false); load()
  }
  function upd(id: string, key: keyof ProofPoint, val: string) { setEditing(e => ({ ...e, [id]: { ...e[id], [key]: val } })) }

  return (
    <div className="p-5 space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 px-2.5 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim"><Plus className="w-3 h-3" /> Add</button>
      </div>
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div><label className="block text-xs text-fg-3 mb-1">Headline *</label><input required value={newItem.headline} onChange={e => setNewItem(n => ({ ...n, headline: e.target.value }))} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-fg-3 mb-1">Context</label><input value={newItem.full_context} onChange={e => setNewItem(n => ({ ...n, full_context: e.target.value }))} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" /></div>
            <div><label className="block text-xs text-fg-3 mb-1">Best Segments</label><ChipInput value={newItem.best_segments} onChange={v => setNewItem(n => ({ ...n, best_segments: v }))} placeholder="All, Brand..." /></div>
          </div>
          <div className="flex gap-2"><button type="submit" className="px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded">Add</button><button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 bg-surface border border-border text-xs text-fg-2 rounded">Cancel</button></div>
        </form>
      )}
      {items.map(item => (
        <div key={item.id} className={cn('bg-card border border-border rounded-lg p-4', !item.active && 'opacity-50')}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="col-span-2"><label className="block text-xs text-fg-3 mb-1">Headline</label><input value={editing[item.id]?.headline ?? ''} onChange={e => upd(item.id, 'headline', e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" /></div>
            <div><label className="block text-xs text-fg-3 mb-1">Context</label><input value={editing[item.id]?.full_context ?? ''} onChange={e => upd(item.id, 'full_context', e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" /></div>
            <div><label className="block text-xs text-fg-3 mb-1">Best Segments</label><ChipInput value={editing[item.id]?.best_segments ?? ''} onChange={v => upd(item.id, 'best_segments', v)} /></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleSave(item.id)} disabled={saving[item.id]} className="flex items-center gap-1 px-3 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim disabled:opacity-60">{saving[item.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save</button>
            <button onClick={() => handleToggle(item.id, item.active)} className="px-3 py-1 bg-surface border border-border text-xs text-fg-2 rounded hover:text-fg">{item.active ? 'Deactivate' : 'Activate'}</button>
            <button onClick={() => handleDelete(item.id)} className="ml-auto text-fg-3 hover:text-score-low"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      ))}
    </div>
  )
}

function CompetitorsSection() {
  const [items, setItems]     = useState<Competitor[]>([])
  const [editing, setEditing] = useState<Record<string, Partial<Competitor>>>({})
  const [editMode, setEditMode] = useState<Record<string, boolean>>({})
  const [saving, setSaving]   = useState<Record<string, boolean>>({})
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState({ competitor_name: '', website: '', positioning_notes: '', shikenso_differentiation: '', when_likely_encountered: '' })

  async function load() {
    const { data } = await createClient().from('kb_competitors').select('*').order('name')
    if (data) { setItems(data); const m: Record<string, Partial<Competitor>> = {}; data.forEach(i => { m[i.id] = { ...i } }); setEditing(m) }
  }
  useEffect(() => { load() }, [])

  async function handleSave(id: string) {
    setSaving(s => ({ ...s, [id]: true }))
    const ed = editing[id]; const displayName = ed.competitor_name || ed.name
    await createClient().from('kb_competitors').update({ name: displayName, competitor_name: displayName, website: ed.website, positioning_notes: ed.positioning_notes, shikenso_differentiation: ed.shikenso_differentiation, differentiation: ed.shikenso_differentiation, when_likely_encountered: ed.when_likely_encountered }).eq('id', id)
    setSaving(s => ({ ...s, [id]: false })); setEditMode(m => ({ ...m, [id]: false })); load()
  }
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    await createClient().from('kb_competitors').insert({ ...newItem, name: newItem.competitor_name, differentiation: newItem.shikenso_differentiation, active: true })
    setNewItem({ competitor_name: '', website: '', positioning_notes: '', shikenso_differentiation: '', when_likely_encountered: '' }); setShowAdd(false); load()
  }
  function upd(id: string, key: keyof Competitor, val: string) { setEditing(e => ({ ...e, [id]: { ...e[id], [key]: val } })) }
  const ta = (id: string, key: keyof Competitor, label: string, rows = 2) => (<div><label className="block text-xs text-fg-3 mb-1">{label}</label><textarea rows={rows} value={(editing[id]?.[key] as string) ?? ''} onChange={e => upd(id, key, e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" /></div>)

  return (
    <div className="p-5 space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 px-2.5 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim"><Plus className="w-3 h-3" /> Add</button>
      </div>
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-fg-3 mb-1">Name *</label><input required value={newItem.competitor_name} onChange={e => setNewItem(n => ({ ...n, competitor_name: e.target.value }))} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" /></div>
            <div><label className="block text-xs text-fg-3 mb-1">Website</label><input value={newItem.website} onChange={e => setNewItem(n => ({ ...n, website: e.target.value }))} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" /></div>
          </div>
          <div><label className="block text-xs text-fg-3 mb-1">Their Positioning</label><textarea rows={2} value={newItem.positioning_notes} onChange={e => setNewItem(n => ({ ...n, positioning_notes: e.target.value }))} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" /></div>
          <div><label className="block text-xs text-fg-3 mb-1">Shikenso Differentiates Because…</label><textarea rows={2} value={newItem.shikenso_differentiation} onChange={e => setNewItem(n => ({ ...n, shikenso_differentiation: e.target.value }))} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" /></div>
          <div className="flex gap-2"><button type="submit" className="px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded">Add</button><button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 bg-surface border border-border text-xs text-fg-2 rounded">Cancel</button></div>
        </form>
      )}
      {items.map(item => {
        const isEditing = editMode[item.id]
        return (
          <div key={item.id} className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-soft">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-fg">{item.competitor_name || item.name}</span>
                {item.website && <span className="text-xs text-fg-3">{item.website}</span>}
              </div>
              <div className="flex gap-1.5">
                {isEditing ? (
                  <><button onClick={() => setEditMode(m => ({ ...m, [item.id]: false }))} className="px-2 py-1 text-xs text-fg-2 bg-surface border border-border rounded">Cancel</button>
                  <button onClick={() => handleSave(item.id)} disabled={saving[item.id]} className="flex items-center gap-1 px-2 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim disabled:opacity-60">{saving[item.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save</button></>
                ) : (
                  <button onClick={() => setEditMode(m => ({ ...m, [item.id]: true }))} className="px-2 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim">Edit</button>
                )}
              </div>
            </div>
            {isEditing ? (
              <div className="p-4 grid grid-cols-2 gap-3">{ta(item.id, 'positioning_notes', 'Their Positioning')}{ta(item.id, 'shikenso_differentiation', 'Shikenso Advantage')}{ta(item.id, 'when_likely_encountered', 'When Encountered', 1)}</div>
            ) : (
              <div className="p-4 space-y-2">
                {item.positioning_notes && <p className="text-xs text-fg-2">{item.positioning_notes}</p>}
                {(item.shikenso_differentiation || item.differentiation) && <p className="text-xs text-accent">{item.shikenso_differentiation || item.differentiation}</p>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function ModulesPage() {
  const [moduleCount, setModuleCount]     = useState(0)
  const [proofCount, setProofCount]       = useState(0)
  const [competitorCount, setCompetitorCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('kb_modules').select('*', { count: 'exact', head: true }).eq('active', true),
      supabase.from('kb_proof_points').select('*', { count: 'exact', head: true }).eq('active', true),
      supabase.from('kb_competitors').select('*', { count: 'exact', head: true }).eq('active', true),
    ]).then(([m, pp, c]) => {
      setModuleCount(m.count ?? 0)
      setProofCount(pp.count ?? 0)
      setCompetitorCount(c.count ?? 0)
    })
  }, [])

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div>
        <h1 className="text-sm font-semibold text-fg">Modules</h1>
        <p className="text-xs text-fg-3 mt-0.5">Shikenso products, proof points, and competitor positioning — all pulled into Claude prompts dynamically.</p>
      </div>
      <Section title="Shikenso Modules" count={moduleCount}><ModulesSection /></Section>
      <Section title="Proof Points" count={proofCount} defaultOpen={false}><ProofPointsSection /></Section>
      <Section title="Competitor Positioning" count={competitorCount} defaultOpen={false}><CompetitorsSection /></Section>
    </div>
  )
}
