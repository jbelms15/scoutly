'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, History } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ChipInput from '@/components/chip-input'

type Product = {
  id: string; name: string; product_name: string; description: string
  target_segments: string; key_differentiators: string
  positioning_statement: string; active: boolean; version: number; sort_order: number
}

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([])
  const [editing, setEditing] = useState<Record<string, Partial<Product>>>({})
  const [editMode, setEditMode] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('kb_modules').select('*').order('sort_order')
    if (data) {
      setItems(data)
      const m: Record<string, Partial<Product>> = {}
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
    await supabase.from('kb_modules').update({
      description: ed.description, target_segments: ed.target_segments,
      key_differentiators: ed.key_differentiators, positioning_statement: ed.positioning_statement,
    }).eq('id', id)
    setSaving(s => ({ ...s, [id]: false }))
    setSaved(s => ({ ...s, [id]: true }))
    setEditMode(m => ({ ...m, [id]: false }))
    setTimeout(() => setSaved(s => ({ ...s, [id]: false })), 2000)
    load()
  }

  function upd(id: string, key: keyof Product, val: string) {
    setEditing(e => ({ ...e, [id]: { ...e[id], [key]: val } }))
  }

  if (loading) return <div className="flex items-center justify-center h-32 text-xs text-fg-3">Loading...</div>

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div>
        <h1 className="text-sm font-semibold text-fg">Shikenso Products</h1>
        <p className="text-xs text-fg-3 mt-0.5">{items.filter(i => i.active).length} active products · Referenced in every outreach email and scoring prompt.</p>
      </div>

      {items.map(item => {
        const isEditing = editMode[item.id]
        const ed = editing[item.id] ?? item
        const displayName = item.product_name || item.name

        return (
          <div key={item.id} className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border-soft">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-accent">{displayName}</span>
                <span className="px-1.5 py-0.5 bg-accent-muted text-accent text-xs rounded">v{item.version}</span>
              </div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button onClick={() => setEditMode(m => ({ ...m, [item.id]: false }))}
                      className="px-3 py-1 text-xs text-fg-2 bg-card border border-border rounded hover:text-fg">Cancel</button>
                    <button onClick={() => handleSave(item.id)} disabled={saving[item.id]}
                      className="flex items-center gap-1.5 px-3 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim disabled:opacity-60">
                      {saving[item.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      {saving[item.id] ? 'Saving...' : saved[item.id] ? 'Saved ✓' : 'Save'}
                    </button>
                  </>
                ) : (
                  <button onClick={() => setEditMode(m => ({ ...m, [item.id]: true }))}
                    className="px-3 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim">Edit</button>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs text-fg-3 mb-1">Description</label>
                  <textarea rows={3} value={ed.description ?? ''} onChange={e => upd(item.id, 'description', e.target.value)}
                    className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" />
                </div>
                <div>
                  <label className="block text-xs text-fg-3 mb-1">Positioning Statement</label>
                  <input value={ed.positioning_statement ?? ''} onChange={e => upd(item.id, 'positioning_statement', e.target.value)}
                    className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="block text-xs text-fg-3 mb-1">Target Segments</label>
                  <ChipInput value={ed.target_segments ?? ''} onChange={v => upd(item.id, 'target_segments', v)} />
                </div>
                <div>
                  <label className="block text-xs text-fg-3 mb-1">Key Differentiators</label>
                  <ChipInput value={ed.key_differentiators ?? ''} onChange={v => upd(item.id, 'key_differentiators', v)} />
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-3">
                <p className="text-xs text-fg-2">{item.description}</p>
                {item.positioning_statement && (
                  <p className="text-xs text-accent italic">"{item.positioning_statement}"</p>
                )}
                {item.target_segments && (
                  <div>
                    <span className="text-xs text-fg-3">Target: </span>
                    {item.target_segments.split(',').map(s => s.trim()).filter(Boolean).map(s => (
                      <span key={s} className="inline-block mr-1 mb-1 px-1.5 py-0.5 bg-border text-fg-2 text-xs rounded">{s}</span>
                    ))}
                  </div>
                )}
                {item.key_differentiators && (
                  <div>
                    <span className="text-xs text-fg-3">Differentiators: </span>
                    {item.key_differentiators.split(',').map(s => s.trim()).filter(Boolean).map(s => (
                      <span key={s} className="inline-block mr-1 mb-1 px-1.5 py-0.5 bg-accent-muted text-accent text-xs rounded">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
