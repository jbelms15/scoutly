'use client'

import { useState, useEffect } from 'react'
import { Plus, Save, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ChipInput from '@/components/chip-input'
import { cn } from '@/lib/utils'

type PainPoint = {
  id: string; category: string; pain_title: string; pain_description: string
  affected_segments: string[]; discovery_questions: string[]; our_solution: string; active: boolean; sort_order: number
}
type Objection = {
  id: string; objection_text: string; objection_category: string; reframe: string
  response_short: string; response_full: string; follow_up_question: string
  affected_segments: string[]; active: boolean; sort_order: number
}
type FramingRule = {
  id: string; rule_name: string; target_segment: string; core_frame: string
  opening_hook: string; value_angle: string; proof_point_focus: string; active: boolean
}
type ConvPattern = {
  id: string; pattern_name: string; pattern_type: string; description: string
  steps: string[]; example_script: string; active: boolean; sort_order: number
}

type Tab = 'pain' | 'objections' | 'framing' | 'patterns'

const TABS: { id: Tab; label: string; description: string }[] = [
  { id: 'pain',       label: 'Pain Points',          description: '18 pains mapped to segments' },
  { id: 'objections', label: 'Objections',            description: '11 objections with responses' },
  { id: 'framing',    label: 'Framing Rules',         description: '4 segment-specific angles' },
  { id: 'patterns',   label: 'Conversation Patterns', description: '4 structured talk tracks' },
]

const CATEGORY_COLOURS: Record<string, string> = {
  ROI:          'bg-score-high/10 text-score-high',
  REPORTING:    'bg-accent/10 text-accent',
  DATA:         'bg-warm/10 text-warm',
  COMMERCIAL:   'bg-score-high/10 text-score-high',
  COMPETITIVE:  'bg-warm/10 text-warm',
  MEASUREMENT:  'bg-accent/10 text-accent',
  BENCHMARKING: 'bg-border text-fg-2',
  BUDGET:       'bg-score-low/10 text-score-low',
}
const OBJ_CATEGORY_COLOURS: Record<string, string> = {
  COMPETITOR: 'bg-score-low/10 text-score-low',
  BUDGET:     'bg-warm/10 text-warm',
  NEED:       'bg-accent/10 text-accent',
  TIMING:     'bg-border text-fg-2',
  PROCESS:    'bg-border text-fg-2',
  INTERNAL:   'bg-border text-fg-2',
}

// ─── Pain Points Tab ──────────────────────────────────────────────────────────

function PainPointsTab() {
  const [items, setItems]       = useState<PainPoint[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing]   = useState<Record<string, Partial<PainPoint>>>({})
  const [editMode, setEditMode] = useState<Record<string, boolean>>({})
  const [saving, setSaving]     = useState<Record<string, boolean>>({})
  const [showAdd, setShowAdd]   = useState(false)
  const [newItem, setNewItem]   = useState({ category: '', pain_title: '', pain_description: '', our_solution: '' })

  async function load() {
    const { data } = await createClient().from('kb_pain_points').select('*').order('sort_order')
    if (data) { setItems(data); const m: Record<string, Partial<PainPoint>> = {}; data.forEach(i => { m[i.id] = { ...i } }); setEditing(m) }
  }
  useEffect(() => { load() }, [])

  async function handleSave(id: string) {
    setSaving(s => ({ ...s, [id]: true }))
    const ed = editing[id]
    await createClient().from('kb_pain_points').update({
      category: ed.category, pain_title: ed.pain_title, pain_description: ed.pain_description,
      our_solution: ed.our_solution, affected_segments: ed.affected_segments, discovery_questions: ed.discovery_questions,
    }).eq('id', id)
    setSaving(s => ({ ...s, [id]: false })); setEditMode(m => ({ ...m, [id]: false })); load()
  }
  async function handleDelete(id: string) { await createClient().from('kb_pain_points').delete().eq('id', id); load() }
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    await createClient().from('kb_pain_points').insert({ ...newItem, active: true, sort_order: items.length + 1 })
    setNewItem({ category: '', pain_title: '', pain_description: '', our_solution: '' }); setShowAdd(false); load()
  }
  function upd(id: string, key: keyof PainPoint, val: unknown) { setEditing(e => ({ ...e, [id]: { ...e[id], [key]: val } })) }

  return (
    <div className="space-y-2">
      <div className="flex justify-end mb-3">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 px-2.5 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim"><Plus className="w-3 h-3" /> Add Pain Point</button>
      </div>
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-card border border-border rounded-lg p-4 space-y-3 mb-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-fg-3 mb-1">Category</label><input required value={newItem.category} onChange={e => setNewItem(n => ({ ...n, category: e.target.value }))} placeholder="ROI, REPORTING, DATA..." className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" /></div>
            <div><label className="block text-xs text-fg-3 mb-1">Pain Title *</label><input required value={newItem.pain_title} onChange={e => setNewItem(n => ({ ...n, pain_title: e.target.value }))} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" /></div>
          </div>
          <div><label className="block text-xs text-fg-3 mb-1">Description</label><textarea rows={2} value={newItem.pain_description} onChange={e => setNewItem(n => ({ ...n, pain_description: e.target.value }))} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" /></div>
          <div><label className="block text-xs text-fg-3 mb-1">Our Solution</label><textarea rows={2} value={newItem.our_solution} onChange={e => setNewItem(n => ({ ...n, our_solution: e.target.value }))} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" /></div>
          <div className="flex gap-2"><button type="submit" className="px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded">Add</button><button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 bg-surface border border-border text-xs text-fg-2 rounded">Cancel</button></div>
        </form>
      )}
      {items.map(item => {
        const isOpen    = expanded === item.id
        const isEditing = editMode[item.id]
        const ed        = editing[item.id] ?? item
        return (
          <div key={item.id} className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-surface/50" onClick={() => setExpanded(isOpen ? null : item.id)}>
              <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium shrink-0', CATEGORY_COLOURS[item.category] ?? 'bg-border text-fg-3')}>{item.category}</span>
              <span className="text-xs font-medium text-fg flex-1 min-w-0 truncate">{item.pain_title}</span>
              <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                {!isEditing && <button onClick={() => { setEditMode(m => ({ ...m, [item.id]: true })); setExpanded(item.id) }} className="text-xs text-fg-3 hover:text-accent">Edit</button>}
                <button onClick={() => handleDelete(item.id)} className="text-fg-3 hover:text-score-low"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
            {isOpen && (
              isEditing ? (
                <div className="px-4 pb-4 space-y-3 border-t border-border-soft pt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs text-fg-3 mb-1">Category</label><input value={ed.category ?? ''} onChange={e => upd(item.id, 'category', e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" /></div>
                    <div><label className="block text-xs text-fg-3 mb-1">Pain Title</label><input value={ed.pain_title ?? ''} onChange={e => upd(item.id, 'pain_title', e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" /></div>
                  </div>
                  <div><label className="block text-xs text-fg-3 mb-1">Description</label><textarea rows={2} value={ed.pain_description ?? ''} onChange={e => upd(item.id, 'pain_description', e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" /></div>
                  <div><label className="block text-xs text-fg-3 mb-1">Our Solution</label><textarea rows={2} value={ed.our_solution ?? ''} onChange={e => upd(item.id, 'our_solution', e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" /></div>
                  <div className="flex gap-2">
                    <button onClick={() => handleSave(item.id)} disabled={saving[item.id]} className="flex items-center gap-1 px-3 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim disabled:opacity-60">{saving[item.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save</button>
                    <button onClick={() => setEditMode(m => ({ ...m, [item.id]: false }))} className="px-3 py-1 bg-surface border border-border text-xs text-fg-2 rounded">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="px-4 pb-4 space-y-2 border-t border-border-soft pt-3">
                  <p className="text-xs text-fg-2">{item.pain_description}</p>
                  {item.our_solution && <p className="text-xs text-accent">Solution: {item.our_solution}</p>}
                  {item.discovery_questions?.length > 0 && (
                    <div>
                      <p className="text-xs text-fg-3 mb-1">Discovery questions:</p>
                      <ul className="space-y-0.5">{item.discovery_questions.map((q, i) => <li key={i} className="text-xs text-fg-2">• {q}</li>)}</ul>
                    </div>
                  )}
                  {item.affected_segments?.length > 0 && (
                    <div className="flex flex-wrap gap-1">{item.affected_segments.map(s => <span key={s} className="px-1.5 py-0.5 bg-border text-fg-3 text-xs rounded">{s}</span>)}</div>
                  )}
                </div>
              )
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Objections Tab ───────────────────────────────────────────────────────────

function ObjectionsTab() {
  const [items, setItems]       = useState<Objection[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing]   = useState<Record<string, Partial<Objection>>>({})
  const [editMode, setEditMode] = useState<Record<string, boolean>>({})
  const [saving, setSaving]     = useState<Record<string, boolean>>({})
  const [showAdd, setShowAdd]   = useState(false)
  const [newItem, setNewItem]   = useState({ objection_text: '', objection_category: 'NEED', reframe: '', response_short: '', response_full: '', follow_up_question: '' })

  async function load() {
    const { data } = await createClient().from('kb_objections').select('*').order('sort_order')
    if (data) { setItems(data); const m: Record<string, Partial<Objection>> = {}; data.forEach(i => { m[i.id] = { ...i } }); setEditing(m) }
  }
  useEffect(() => { load() }, [])

  async function handleSave(id: string) {
    setSaving(s => ({ ...s, [id]: true }))
    const ed = editing[id]
    await createClient().from('kb_objections').update({
      objection_text: ed.objection_text, objection_category: ed.objection_category,
      reframe: ed.reframe, response_short: ed.response_short,
      response_full: ed.response_full, follow_up_question: ed.follow_up_question,
    }).eq('id', id)
    setSaving(s => ({ ...s, [id]: false })); setEditMode(m => ({ ...m, [id]: false })); load()
  }
  async function handleDelete(id: string) { await createClient().from('kb_objections').delete().eq('id', id); load() }
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    await createClient().from('kb_objections').insert({ ...newItem, active: true, sort_order: items.length + 1 })
    setNewItem({ objection_text: '', objection_category: 'NEED', reframe: '', response_short: '', response_full: '', follow_up_question: '' }); setShowAdd(false); load()
  }
  function upd(id: string, key: keyof Objection, val: string) { setEditing(e => ({ ...e, [id]: { ...e[id], [key]: val } })) }

  return (
    <div className="space-y-2">
      <div className="flex justify-end mb-3">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 px-2.5 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim"><Plus className="w-3 h-3" /> Add Objection</button>
      </div>
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-card border border-border rounded-lg p-4 space-y-3 mb-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-fg-3 mb-1">Objection *</label><input required value={newItem.objection_text} onChange={e => setNewItem(n => ({ ...n, objection_text: e.target.value }))} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" /></div>
            <div>
              <label className="block text-xs text-fg-3 mb-1">Category</label>
              <select value={newItem.objection_category} onChange={e => setNewItem(n => ({ ...n, objection_category: e.target.value }))} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent">
                {['COMPETITOR','BUDGET','NEED','TIMING','PROCESS','INTERNAL'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div><label className="block text-xs text-fg-3 mb-1">Reframe</label><textarea rows={2} value={newItem.reframe} onChange={e => setNewItem(n => ({ ...n, reframe: e.target.value }))} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" /></div>
          <div><label className="block text-xs text-fg-3 mb-1">Short Response</label><textarea rows={2} value={newItem.response_short} onChange={e => setNewItem(n => ({ ...n, response_short: e.target.value }))} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" /></div>
          <div className="flex gap-2"><button type="submit" className="px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded">Add</button><button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 bg-surface border border-border text-xs text-fg-2 rounded">Cancel</button></div>
        </form>
      )}
      {items.map(item => {
        const isOpen    = expanded === item.id
        const isEditing = editMode[item.id]
        const ed        = editing[item.id] ?? item
        return (
          <div key={item.id} className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-surface/50" onClick={() => setExpanded(isOpen ? null : item.id)}>
              <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium shrink-0', OBJ_CATEGORY_COLOURS[item.objection_category] ?? 'bg-border text-fg-3')}>{item.objection_category}</span>
              <span className="text-xs font-medium text-fg flex-1 min-w-0 truncate">"{item.objection_text}"</span>
              <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                {!isEditing && <button onClick={() => { setEditMode(m => ({ ...m, [item.id]: true })); setExpanded(item.id) }} className="text-xs text-fg-3 hover:text-accent">Edit</button>}
                <button onClick={() => handleDelete(item.id)} className="text-fg-3 hover:text-score-low"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
            {isOpen && (
              isEditing ? (
                <div className="px-4 pb-4 space-y-3 border-t border-border-soft pt-3">
                  <div><label className="block text-xs text-fg-3 mb-1">Objection Text</label><textarea rows={2} value={ed.objection_text ?? ''} onChange={e => upd(item.id, 'objection_text', e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" /></div>
                  <div><label className="block text-xs text-fg-3 mb-1">Reframe</label><textarea rows={2} value={ed.reframe ?? ''} onChange={e => upd(item.id, 'reframe', e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" /></div>
                  <div><label className="block text-xs text-fg-3 mb-1">Short Response</label><textarea rows={3} value={ed.response_short ?? ''} onChange={e => upd(item.id, 'response_short', e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" /></div>
                  <div><label className="block text-xs text-fg-3 mb-1">Full Response Script</label><textarea rows={5} value={ed.response_full ?? ''} onChange={e => upd(item.id, 'response_full', e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" /></div>
                  <div><label className="block text-xs text-fg-3 mb-1">Follow-up Question</label><input value={ed.follow_up_question ?? ''} onChange={e => upd(item.id, 'follow_up_question', e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" /></div>
                  <div className="flex gap-2">
                    <button onClick={() => handleSave(item.id)} disabled={saving[item.id]} className="flex items-center gap-1 px-3 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim disabled:opacity-60">{saving[item.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save</button>
                    <button onClick={() => setEditMode(m => ({ ...m, [item.id]: false }))} className="px-3 py-1 bg-surface border border-border text-xs text-fg-2 rounded">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="px-4 pb-4 space-y-3 border-t border-border-soft pt-3">
                  <div className="bg-surface border border-border-soft rounded p-2.5">
                    <p className="text-xs text-fg-3 mb-1">Reframe</p>
                    <p className="text-xs text-fg-2 italic">{item.reframe}</p>
                  </div>
                  <div>
                    <p className="text-xs text-fg-3 mb-1">Short response:</p>
                    <p className="text-xs text-fg-2">{item.response_short}</p>
                  </div>
                  {item.response_full && (
                    <div>
                      <p className="text-xs text-fg-3 mb-1">Full script:</p>
                      <p className="text-xs text-fg-2 whitespace-pre-wrap">{item.response_full}</p>
                    </div>
                  )}
                  {item.follow_up_question && (
                    <p className="text-xs text-accent">Follow-up: "{item.follow_up_question}"</p>
                  )}
                </div>
              )
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Framing Rules Tab ────────────────────────────────────────────────────────

function FramingTab() {
  const [items, setItems]     = useState<FramingRule[]>([])
  const [editing, setEditing] = useState<Record<string, Partial<FramingRule>>>({})
  const [editMode, setEditMode] = useState<Record<string, boolean>>({})
  const [saving, setSaving]   = useState<Record<string, boolean>>({})

  async function load() {
    const { data } = await createClient().from('kb_framing_rules').select('*').order('sort_order')
    if (data) { setItems(data); const m: Record<string, Partial<FramingRule>> = {}; data.forEach(i => { m[i.id] = { ...i } }); setEditing(m) }
  }
  useEffect(() => { load() }, [])

  async function handleSave(id: string) {
    setSaving(s => ({ ...s, [id]: true }))
    const ed = editing[id]
    await createClient().from('kb_framing_rules').update({
      core_frame: ed.core_frame, opening_hook: ed.opening_hook,
      value_angle: ed.value_angle, proof_point_focus: ed.proof_point_focus,
    }).eq('id', id)
    setSaving(s => ({ ...s, [id]: false })); setEditMode(m => ({ ...m, [id]: false })); load()
  }
  function upd(id: string, key: keyof FramingRule, val: string) { setEditing(e => ({ ...e, [id]: { ...e[id], [key]: val } })) }

  return (
    <div className="space-y-3">
      {items.map(item => {
        const isEditing = editMode[item.id]; const ed = editing[item.id] ?? item
        return (
          <div key={item.id} className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-soft">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-accent">{item.rule_name}</span>
                <span className="px-1.5 py-0.5 bg-border text-fg-3 text-xs rounded">{item.target_segment}</span>
              </div>
              <div className="flex gap-1.5">
                {isEditing ? (
                  <>
                    <button onClick={() => setEditMode(m => ({ ...m, [item.id]: false }))} className="px-2 py-1 text-xs text-fg-2 bg-surface border border-border rounded">Cancel</button>
                    <button onClick={() => handleSave(item.id)} disabled={saving[item.id]} className="flex items-center gap-1 px-2 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim disabled:opacity-60">{saving[item.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save</button>
                  </>
                ) : (
                  <button onClick={() => setEditMode(m => ({ ...m, [item.id]: true }))} className="px-2 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim">Edit</button>
                )}
              </div>
            </div>
            {isEditing ? (
              <div className="p-4 space-y-3">
                <div><label className="block text-xs text-fg-3 mb-1">Core Frame</label><textarea rows={2} value={ed.core_frame ?? ''} onChange={e => upd(item.id, 'core_frame', e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" /></div>
                <div><label className="block text-xs text-fg-3 mb-1">Opening Hook</label><textarea rows={2} value={ed.opening_hook ?? ''} onChange={e => upd(item.id, 'opening_hook', e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" /></div>
                <div><label className="block text-xs text-fg-3 mb-1">Value Angle</label><textarea rows={2} value={ed.value_angle ?? ''} onChange={e => upd(item.id, 'value_angle', e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" /></div>
                <div><label className="block text-xs text-fg-3 mb-1">Lead Proof Point</label><input value={ed.proof_point_focus ?? ''} onChange={e => upd(item.id, 'proof_point_focus', e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" /></div>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                <p className="text-xs font-medium text-fg">{item.core_frame}</p>
                {item.opening_hook && <div><span className="text-xs text-fg-3">Hook: </span><span className="text-xs text-fg-2">{item.opening_hook}</span></div>}
                {item.value_angle && <div><span className="text-xs text-fg-3">Value: </span><span className="text-xs text-fg-2">{item.value_angle}</span></div>}
                {item.proof_point_focus && <div><span className="text-xs text-fg-3">Lead with: </span><span className="text-xs text-accent">{item.proof_point_focus}</span></div>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Conversation Patterns Tab ────────────────────────────────────────────────

function PatternsTab() {
  const [items, setItems]     = useState<ConvPattern[]>([])
  const [editing, setEditing] = useState<Record<string, Partial<ConvPattern>>>({})
  const [editMode, setEditMode] = useState<Record<string, boolean>>({})
  const [saving, setSaving]   = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<string | null>(null)

  async function load() {
    const { data } = await createClient().from('kb_conversation_patterns').select('*').order('sort_order')
    if (data) { setItems(data); const m: Record<string, Partial<ConvPattern>> = {}; data.forEach(i => { m[i.id] = { ...i } }); setEditing(m) }
  }
  useEffect(() => { load() }, [])

  async function handleSave(id: string) {
    setSaving(s => ({ ...s, [id]: true }))
    const ed = editing[id]
    await createClient().from('kb_conversation_patterns').update({
      description: ed.description, steps: ed.steps, example_script: ed.example_script,
    }).eq('id', id)
    setSaving(s => ({ ...s, [id]: false })); setEditMode(m => ({ ...m, [id]: false })); load()
  }
  function upd(id: string, key: keyof ConvPattern, val: unknown) { setEditing(e => ({ ...e, [id]: { ...e[id], [key]: val } })) }

  const PATTERN_TYPE_COLOURS: Record<string, string> = {
    OPENING:   'bg-score-high/10 text-score-high',
    DISCOVERY: 'bg-accent/10 text-accent',
    OBJECTION: 'bg-warm/10 text-warm',
    CLOSING:   'bg-border text-fg-2',
  }

  return (
    <div className="space-y-3">
      {items.map(item => {
        const isOpen    = expanded === item.id
        const isEditing = editMode[item.id]
        const ed        = editing[item.id] ?? item
        return (
          <div key={item.id} className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-soft cursor-pointer" onClick={() => setExpanded(isOpen ? null : item.id)}>
              <div className="flex items-center gap-2">
                <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', PATTERN_TYPE_COLOURS[item.pattern_type] ?? 'bg-border text-fg-3')}>{item.pattern_type}</span>
                <span className="text-xs font-semibold text-fg">{item.pattern_name}</span>
              </div>
              <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                {!isEditing && <button onClick={() => { setEditMode(m => ({ ...m, [item.id]: true })); setExpanded(item.id) }} className="text-xs text-fg-3 hover:text-accent">Edit</button>}
              </div>
            </div>
            {isOpen && (
              isEditing ? (
                <div className="px-4 pb-4 space-y-3 pt-3">
                  <div><label className="block text-xs text-fg-3 mb-1">Description</label><textarea rows={2} value={ed.description ?? ''} onChange={e => upd(item.id, 'description', e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" /></div>
                  <div><label className="block text-xs text-fg-3 mb-1">Steps (one per line)</label><textarea rows={6} value={(ed.steps ?? []).join('\n')} onChange={e => upd(item.id, 'steps', e.target.value.split('\n'))} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" /></div>
                  <div><label className="block text-xs text-fg-3 mb-1">Example Script</label><textarea rows={8} value={ed.example_script ?? ''} onChange={e => upd(item.id, 'example_script', e.target.value)} className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" /></div>
                  <div className="flex gap-2">
                    <button onClick={() => handleSave(item.id)} disabled={saving[item.id]} className="flex items-center gap-1 px-3 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim disabled:opacity-60">{saving[item.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save</button>
                    <button onClick={() => setEditMode(m => ({ ...m, [item.id]: false }))} className="px-3 py-1 bg-surface border border-border text-xs text-fg-2 rounded">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="px-4 pb-4 space-y-3 pt-3">
                  {item.description && <p className="text-xs text-fg-2">{item.description}</p>}
                  {item.steps?.length > 0 && (
                    <div>
                      <p className="text-xs text-fg-3 mb-1.5">Steps:</p>
                      <ul className="space-y-1">{item.steps.map((s, i) => <li key={i} className="text-xs text-fg-2">{s}</li>)}</ul>
                    </div>
                  )}
                  {item.example_script && (
                    <div>
                      <p className="text-xs text-fg-3 mb-1.5">Example script:</p>
                      <div className="bg-surface border border-border-soft rounded p-3">
                        <p className="text-xs text-fg-2 whitespace-pre-wrap font-mono leading-relaxed">{item.example_script}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Playbook Page ───────────────────────────────────────────────────────

export default function PlaybookPage() {
  const [activeTab, setActiveTab] = useState<Tab>('pain')
  const [counts, setCounts]       = useState({ pain: 0, objections: 0, framing: 0, patterns: 0 })

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('kb_pain_points').select('*', { count: 'exact', head: true }).eq('active', true),
      supabase.from('kb_objections').select('*', { count: 'exact', head: true }).eq('active', true),
      supabase.from('kb_framing_rules').select('*', { count: 'exact', head: true }).eq('active', true),
      supabase.from('kb_conversation_patterns').select('*', { count: 'exact', head: true }).eq('active', true),
    ]).then(([p, o, f, c]) => setCounts({ pain: p.count ?? 0, objections: o.count ?? 0, framing: f.count ?? 0, patterns: c.count ?? 0 }))
  }, [])

  const countMap: Record<Tab, number> = { pain: counts.pain, objections: counts.objections, framing: counts.framing, patterns: counts.patterns }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-5">
        <h1 className="text-sm font-semibold text-fg">Playbook</h1>
        <p className="text-xs text-fg-3 mt-0.5">Pain points, objection handling, framing rules, and conversation patterns — all injected into Claude prompts for scoring and qualification.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-surface border border-border rounded-lg p-1 mb-5">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition-colors',
              activeTab === tab.id ? 'bg-card text-fg shadow-sm' : 'text-fg-3 hover:text-fg'
            )}>
            {tab.label}
            <span className={cn('px-1 py-0 rounded text-xs', activeTab === tab.id ? 'bg-accent-muted text-accent' : 'bg-border text-fg-3')}>
              {countMap[tab.id]}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'pain'       && <PainPointsTab />}
      {activeTab === 'objections' && <ObjectionsTab />}
      {activeTab === 'framing'    && <FramingTab />}
      {activeTab === 'patterns'   && <PatternsTab />}
    </div>
  )
}
