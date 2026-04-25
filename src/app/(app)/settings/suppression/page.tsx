'use client'

import { useState, useEffect } from 'react'
import { ShieldOff, Plus, Trash2, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type SuppressionType = 'SHIKENSO_CUSTOMER' | 'PARTNER_CONFLICT' | 'INTERNAL_OWNED' | 'DO_NOT_CONTACT'
type MatchType = 'DOMAIN' | 'COMPANY_NAME' | 'EMAIL' | 'LINKEDIN_URL'

type Suppression = {
  id: string
  type: SuppressionType
  match_type: MatchType
  value: string
  notes?: string
  is_active: boolean
  created_at: string
}

const TYPE_COLORS: Record<SuppressionType, string> = {
  SHIKENSO_CUSTOMER: 'bg-score-high/10 text-score-high',
  PARTNER_CONFLICT:  'bg-warm/10 text-warm',
  INTERNAL_OWNED:    'bg-cold/10 text-cold',
  DO_NOT_CONTACT:    'bg-score-low/10 text-score-low',
}

const TYPE_LABELS: Record<SuppressionType, string> = {
  SHIKENSO_CUSTOMER: 'Customer',
  PARTNER_CONFLICT:  'Partner Conflict',
  INTERNAL_OWNED:    'Internal Owned',
  DO_NOT_CONTACT:    'Do Not Contact',
}

export default function SuppressionPage() {
  const [suppressions, setSuppressions] = useState<Suppression[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('ALL')
  const [showAdd, setShowAdd] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({
    type: 'DO_NOT_CONTACT' as SuppressionType,
    match_type: 'COMPANY_NAME' as MatchType,
    value: '',
    notes: '',
  })

  async function load() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('suppressions')
      .select('*')
      .order('type')
      .order('value')
    setSuppressions(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    const supabase = createClient()
    await supabase.from('suppressions').insert({ ...form, is_active: true })
    setForm({ type: 'DO_NOT_CONTACT', match_type: 'COMPANY_NAME', value: '', notes: '' })
    setShowAdd(false)
    setAdding(false)
    load()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('suppressions').delete().eq('id', id)
    load()
  }

  async function handleToggle(id: string, current: boolean) {
    const supabase = createClient()
    await supabase.from('suppressions').update({ is_active: !current }).eq('id', id)
    load()
  }

  const filtered = suppressions.filter(s => {
    const matchesSearch = search === '' || s.value.toLowerCase().includes(search.toLowerCase())
    const matchesType = filterType === 'ALL' || s.type === filterType
    return matchesSearch && matchesType
  })

  const counts = suppressions.reduce((acc, s) => {
    acc[s.type] = (acc[s.type] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <ShieldOff className="w-4 h-4 text-accent" />
            <h1 className="text-sm font-semibold text-fg">Suppression List</h1>
          </div>
          <p className="text-xs text-fg-3">
            Suppressed companies are blocked at signal fire time — no leads are ever created for them.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded-md hover:bg-accent-dim transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Entry
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {(Object.keys(TYPE_LABELS) as SuppressionType[]).map(type => (
          <div key={type} className="bg-surface border border-border rounded-lg p-3">
            <div className="text-xs text-fg-3 mb-1">{TYPE_LABELS[type]}</div>
            <div className="text-xl font-bold text-fg">{counts[type] ?? 0}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full bg-surface border border-border text-xs text-fg placeholder:text-fg-3 rounded-md pl-8 pr-3 py-1.5 focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <div className="flex gap-1">
          {['ALL', ...Object.keys(TYPE_LABELS)].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={cn(
                'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                filterType === t ? 'bg-accent-muted text-accent' : 'text-fg-3 hover:text-fg hover:bg-surface'
              )}
            >
              {t === 'ALL' ? 'All' : TYPE_LABELS[t as SuppressionType]}
            </button>
          ))}
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-surface border border-border rounded-lg p-4 mb-4">
          <form onSubmit={handleAdd}>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs text-fg-3 mb-1">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value as SuppressionType}))}
                  className="w-full bg-card border border-border rounded px-2 py-1.5 text-xs text-fg focus:outline-none focus:border-accent">
                  {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-fg-3 mb-1">Match By</label>
                <select value={form.match_type} onChange={e => setForm(f => ({...f, match_type: e.target.value as MatchType}))}
                  className="w-full bg-card border border-border rounded px-2 py-1.5 text-xs text-fg focus:outline-none focus:border-accent">
                  <option value="COMPANY_NAME">Company Name</option>
                  <option value="DOMAIN">Domain</option>
                  <option value="EMAIL">Email</option>
                  <option value="LINKEDIN_URL">LinkedIn URL</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-fg-3 mb-1">Value *</label>
                <input required value={form.value} onChange={e => setForm(f => ({...f, value: e.target.value}))}
                  placeholder="e.g. Acme Corp or acme.com"
                  className="w-full bg-card border border-border rounded px-2 py-1.5 text-xs text-fg focus:outline-none focus:border-accent" />
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-xs text-fg-3 mb-1">Notes (optional)</label>
              <input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                className="w-full bg-card border border-border rounded px-2 py-1.5 text-xs text-fg focus:outline-none focus:border-accent" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={adding}
                className="px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim transition-colors disabled:opacity-60">
                {adding ? 'Adding...' : 'Add'}
              </button>
              <button type="button" onClick={() => setShowAdd(false)}
                className="px-3 py-1.5 bg-card border border-border text-xs text-fg-2 rounded hover:text-fg transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-24 text-xs text-fg-3">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs text-fg-3">No entries match your filter.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-soft">
                {['Company / Value', 'Match By', 'Type', 'Notes', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-fg-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className={cn('border-b border-border-soft last:border-0', !s.is_active && 'opacity-40')}>
                  <td className="px-4 py-2.5 text-xs font-medium text-fg">{s.value}</td>
                  <td className="px-4 py-2.5 text-xs text-fg-2">{s.match_type.replace('_', ' ')}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', TYPE_COLORS[s.type])}>
                      {TYPE_LABELS[s.type]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-fg-3">{s.notes ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => handleToggle(s.id, s.is_active)}
                      className={cn('text-xs px-2 py-0.5 rounded transition-colors',
                        s.is_active ? 'text-score-high hover:bg-surface' : 'text-fg-3 hover:bg-surface')}>
                      {s.is_active ? 'Active' : 'Paused'}
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => handleDelete(s.id)}
                      className="text-fg-3 hover:text-score-low transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-fg-3 mt-3">
        {suppressions.length} total entries · {suppressions.filter(s => s.is_active).length} active
      </p>
    </div>
  )
}
