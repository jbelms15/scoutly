'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, Globe } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ChipInput from '@/components/chip-input'
import KBSourceBadge from '@/components/kb-source-badge'
import { cn } from '@/lib/utils'

type GeoPriority = {
  id: string; tier_name: string; tier_label: string
  countries: string[]; regions: string[]
  score_multiplier: number; rationale: string
  source?: string; needs_review?: boolean
  active: boolean; sort_order: number
}

const TIER_COLOURS: Record<string, string> = {
  P1: 'bg-score-high/10 text-score-high border-score-high/30',
  P2: 'bg-warm/10 text-warm border-warm/30',
  P3: 'bg-border text-fg-3 border-border',
}

export default function GeoPage() {
  const [tiers, setTiers]     = useState<GeoPriority[]>([])
  const [editing, setEditing] = useState<Record<string, Partial<GeoPriority>>>({})
  const [editMode, setEditMode] = useState<Record<string, boolean>>({})
  const [saving, setSaving]   = useState<Record<string, boolean>>({})
  const [saved, setSaved]     = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data } = await createClient().from('kb_geographic_priorities').select('*').order('sort_order')
    if (data) {
      setTiers(data)
      const m: Record<string, Partial<GeoPriority>> = {}
      data.forEach(t => { m[t.id] = { ...t } })
      setEditing(m)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSave(id: string) {
    setSaving(s => ({ ...s, [id]: true }))
    const ed = editing[id]
    await createClient().from('kb_geographic_priorities').update({
      tier_label:       ed.tier_label,
      countries:        ed.countries,
      regions:          ed.regions,
      score_multiplier: ed.score_multiplier,
      rationale:        ed.rationale,
    }).eq('id', id)
    setSaving(s => ({ ...s, [id]: false }))
    setSaved(s => ({ ...s, [id]: true }))
    setEditMode(m => ({ ...m, [id]: false }))
    setTimeout(() => setSaved(s => ({ ...s, [id]: false })), 2000)
    load()
  }

  function upd<K extends keyof GeoPriority>(id: string, key: K, val: GeoPriority[K]) {
    setEditing(e => ({ ...e, [id]: { ...e[id], [key]: val } }))
  }

  function chipsToArray(val: string): string[] {
    return val.split(',').map(v => v.trim()).filter(Boolean)
  }

  function arrayToChips(arr: string[] | null | undefined): string {
    return (arr ?? []).join(', ')
  }

  if (loading) return <div className="flex items-center justify-center h-32 text-xs text-fg-3">Loading...</div>

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-fg">Geographic Priorities</h1>
          <p className="text-xs text-fg-3 mt-0.5">Score multipliers applied to fit_score based on company country/region. P1 core markets boost scoring; P3 long-tail markets reduce it.</p>
        </div>
        <Globe className="w-5 h-5 text-fg-3" />
      </div>

      {/* Visual summary */}
      <div className="grid grid-cols-3 gap-3">
        {tiers.map(tier => (
          <div key={tier.id} className={cn('rounded-lg border p-3 text-center', TIER_COLOURS[tier.tier_name] ?? 'bg-border text-fg-3 border-border')}>
            <p className="text-lg font-bold">×{tier.score_multiplier}</p>
            <p className="text-xs font-semibold mt-0.5">{tier.tier_name}</p>
            <p className="text-xs opacity-70 mt-0.5 line-clamp-1">{tier.tier_label.split('—')[1]?.trim()}</p>
          </div>
        ))}
      </div>

      {/* Edit cards */}
      {tiers.map(tier => {
        const isEditing = editMode[tier.id]
        const ed = editing[tier.id] ?? tier
        return (
          <div key={tier.id} className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border-soft">
              <div className="flex items-center gap-2">
                <span className={cn('px-2 py-0.5 rounded text-xs font-bold border', TIER_COLOURS[tier.tier_name] ?? 'bg-border text-fg-3 border-border')}>
                  {tier.tier_name}
                </span>
                <span className="text-sm font-semibold text-fg">{tier.tier_label}</span>
                <span className="text-xs text-fg-3">×{tier.score_multiplier}</span>
                <KBSourceBadge source={tier.source} />
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button onClick={() => setEditMode(m => ({ ...m, [tier.id]: false }))} className="px-3 py-1 text-xs text-fg-2 bg-card border border-border rounded hover:text-fg">Cancel</button>
                    <button onClick={() => handleSave(tier.id)} disabled={saving[tier.id]}
                      className="flex items-center gap-1.5 px-3 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim disabled:opacity-60">
                      {saving[tier.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      {saving[tier.id] ? 'Saving...' : saved[tier.id] ? 'Saved ✓' : 'Save'}
                    </button>
                  </>
                ) : (
                  <button onClick={() => setEditMode(m => ({ ...m, [tier.id]: true }))} className="px-3 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim">Edit</button>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="p-5 grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs text-fg-3 mb-1">Tier Label</label>
                  <input value={ed.tier_label ?? ''} onChange={e => upd(tier.id, 'tier_label', e.target.value)} className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="block text-xs text-fg-3 mb-1">Score Multiplier</label>
                  <input type="number" step="0.1" min="0" max="2" value={ed.score_multiplier ?? 1.0} onChange={e => upd(tier.id, 'score_multiplier', Number(e.target.value))} className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-fg-3 mb-1">Countries</label>
                  <ChipInput value={arrayToChips(ed.countries)} onChange={v => upd(tier.id, 'countries', chipsToArray(v))} placeholder="Germany, Austria..." />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-fg-3 mb-1">Regions</label>
                  <ChipInput value={arrayToChips(ed.regions)} onChange={v => upd(tier.id, 'regions', chipsToArray(v))} placeholder="DACH, UK..." />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-fg-3 mb-1">Rationale</label>
                  <textarea rows={2} value={ed.rationale ?? ''} onChange={e => upd(tier.id, 'rationale', e.target.value)} className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" />
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-3">
                <p className="text-xs text-fg-2">{tier.rationale}</p>
                <div className="space-y-1.5">
                  {tier.countries?.length > 0 && (
                    <div>
                      <span className="text-xs text-fg-3">Countries: </span>
                      <span className="inline-flex flex-wrap gap-1">
                        {tier.countries.map(c => <span key={c} className="px-1.5 py-0.5 bg-border text-fg-2 text-xs rounded">{c}</span>)}
                      </span>
                    </div>
                  )}
                  {tier.regions?.length > 0 && (
                    <div>
                      <span className="text-xs text-fg-3">Regions: </span>
                      <span className="inline-flex flex-wrap gap-1">
                        {tier.regions.map(r => <span key={r} className="px-1.5 py-0.5 bg-border text-fg-2 text-xs rounded">{r}</span>)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}

      <p className="text-xs text-fg-3">Score multipliers are applied to <code className="text-accent">fit_score</code> in the scoring engine before computing the final <code className="text-accent">icp_score</code>.</p>
    </div>
  )
}
