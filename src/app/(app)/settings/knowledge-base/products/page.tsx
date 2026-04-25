'use client'

import { useState, useEffect } from 'react'
import { Package, Save, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Product = { id: string; name: string; description: string; target_segments: string; key_differentiators: string; sort_order: number }

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([])
  const [editing, setEditing] = useState<Record<string, Product>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('kb_products').select('*').order('sort_order')
    if (data) { setItems(data); const m: Record<string, Product> = {}; data.forEach(i => { m[i.id] = {...i} }); setEditing(m) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSave(id: string) {
    setSaving(s => ({...s, [id]: true}))
    const supabase = createClient()
    const original = items.find(i => i.id === id)
    if (original) await supabase.from('kb_edit_history').insert({ table_name: 'kb_products', record_id: id, snapshot: original, note: `Updated ${original.name}` })
    const { description, target_segments, key_differentiators } = editing[id]
    await supabase.from('kb_products').update({ description, target_segments, key_differentiators }).eq('id', id)
    setSaving(s => ({...s, [id]: false}))
    setSaved(s => ({...s, [id]: true}))
    setTimeout(() => setSaved(s => ({...s, [id]: false})), 2000)
    load()
  }

  const f = (id: string, key: keyof Product, label: string, rows?: number) => (
    <div key={key}>
      <label className="block text-xs text-fg-3 mb-1">{label}</label>
      {rows ? (
        <textarea rows={rows} value={(editing[id]?.[key] as string) ?? ''} onChange={e => setEditing(ed => ({...ed, [id]: {...ed[id], [key]: e.target.value}}))}
          className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" />
      ) : (
        <input value={(editing[id]?.[key] as string) ?? ''} onChange={e => setEditing(ed => ({...ed, [id]: {...ed[id], [key]: e.target.value}}))}
          className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
      )}
    </div>
  )

  if (loading) return <div className="p-6 text-xs text-fg-3">Loading...</div>

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings/knowledge-base" className="text-fg-3 hover:text-fg"><ChevronLeft className="w-4 h-4" /></Link>
        <Package className="w-4 h-4 text-accent" />
        <h1 className="text-sm font-semibold text-fg">Shikenso Products</h1>
      </div>
      <div className="space-y-4">
        {items.map(item => (
          <div key={item.id} className="bg-surface border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-soft">
              <span className="text-sm font-semibold text-accent">{item.name}</span>
              <button onClick={() => handleSave(item.id)} disabled={saving[item.id]}
                className="flex items-center gap-1.5 px-3 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim disabled:opacity-60">
                <Save className="w-3 h-3" /> {saving[item.id] ? 'Saving...' : saved[item.id] ? 'Saved ✓' : 'Save'}
              </button>
            </div>
            <div className="p-4 space-y-3">
              {f(item.id, 'description', 'Description', 3)}
              {f(item.id, 'target_segments', 'Target Segments')}
              {f(item.id, 'key_differentiators', 'Key Differentiators', 3)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
