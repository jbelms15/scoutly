'use client'

import { useState, useEffect } from 'react'
import { ShieldOff, Plus, Trash2, Search, Pencil, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type SuppressionType = 'SHIKENSO_CUSTOMER' | 'PARTNER_CONFLICT' | 'INTERNAL_OWNED' | 'DO_NOT_CONTACT'
type MatchType = 'DOMAIN' | 'COMPANY_NAME' | 'EMAIL' | 'LINKEDIN_URL'

type Entry = {
  id: string; created_at: string
  suppression_type: SuppressionType
  match_type: MatchType
  match_value: string
  reason?: string
  added_by?: string
}

const TYPE_META: Record<SuppressionType, { label: string; color: string }> = {
  SHIKENSO_CUSTOMER: { label: 'Customer',         color: 'bg-score-high/10 text-score-high' },
  PARTNER_CONFLICT:  { label: 'Partner Conflict', color: 'bg-warm/10 text-warm' },
  INTERNAL_OWNED:    { label: 'Internal Owned',   color: 'bg-cold/10 text-cold' },
  DO_NOT_CONTACT:    { label: 'Do Not Contact',   color: 'bg-score-low/10 text-score-low' },
}

export default function SuppressionPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('ALL')
  const [showAdd, setShowAdd] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Entry>>({})
  const [form, setForm] = useState<{
    suppression_type: SuppressionType; match_type: MatchType; match_value: string; reason: string
  }>({ suppression_type: 'DO_NOT_CONTACT', match_type: 'COMPANY_NAME', match_value: '', reason: '' })

  async function load() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('suppression_list')
      .select('*')
      .order('suppression_type')
      .order('match_value')
    setEntries(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    const supabase = createClient()
    await supabase.from('suppression_list').insert({ ...form, added_by: 'user' })
    setForm({ suppression_type: 'DO_NOT_CONTACT', match_type: 'COMPANY_NAME', match_value: '', reason: '' })
    setShowAdd(false); setAdding(false); load()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('suppression_list').delete().eq('id', id)
    load()
  }

  async function handleSaveEdit(id: string) {
    const supabase = createClient()
    await supabase.from('suppression_list').update(editForm).eq('id', id)
    setEditingId(null); load()
  }

  const filtered = entries.filter(e => {
    const matchSearch = !search || e.match_value.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'ALL' || e.suppression_type === filterType
    return matchSearch && matchType
  })

  const counts = entries.reduce((acc, e) => { acc[e.suppression_type] = (acc[e.suppression_type] ?? 0) + 1; return acc }, {} as Record<string, number>)

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ShieldOff className="w-4 h-4 text-accent" />
          <h1 className="text-sm font-semibold text-fg">Suppression List</h1>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded-md hover:bg-accent-dim transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Entry
        </button>
      </div>
      <p className="text-xs text-fg-3 mb-5">
        Suppressed entries are checked at signal-fire time. No lead is ever created for a suppressed company.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {(Object.keys(TYPE_META) as SuppressionType[]).map(t => (
          <div key={t} className="bg-surface border border-border rounded-lg p-3">
            <div className="text-xs text-fg-3 mb-1">{TYPE_META[t].label}</div>
            <div className="text-xl font-bold text-fg">{counts[t] ?? 0}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-3" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
            className="w-full bg-surface border border-border text-xs text-fg placeholder:text-fg-3 rounded-md pl-8 pr-3 py-1.5 focus:outline-none focus:border-accent transition-colors" />
        </div>
        <div className="flex gap-1">
          {(['ALL', ...Object.keys(TYPE_META)] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={cn('px-2.5 py-1 rounded text-xs font-medium transition-colors',
                filterType === t ? 'bg-accent-muted text-accent' : 'text-fg-3 hover:text-fg hover:bg-surface')}>
              {t === 'ALL' ? 'All' : TYPE_META[t as SuppressionType].label}
            </button>
          ))}
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-surface border border-border rounded-lg p-4 mb-4">
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div>
              <label className="block text-xs text-fg-3 mb-1">Type</label>
              <select value={form.suppression_type} onChange={e => setForm(f => ({ ...f, suppression_type: e.target.value as SuppressionType }))}
                className="w-full bg-card border border-border rounded px-2 py-1.5 text-xs text-fg focus:outline-none focus:border-accent">
                {(Object.keys(TYPE_META) as SuppressionType[]).map(t => (
                  <option key={t} value={t}>{TYPE_META[t].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-fg-3 mb-1">Match By</label>
              <select value={form.match_type} onChange={e => setForm(f => ({ ...f, match_type: e.target.value as MatchType }))}
                className="w-full bg-card border border-border rounded px-2 py-1.5 text-xs text-fg focus:outline-none focus:border-accent">
                <option value="COMPANY_NAME">Company Name</option>
                <option value="DOMAIN">Domain</option>
                <option value="EMAIL">Email</option>
                <option value="LINKEDIN_URL">LinkedIn URL</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-fg-3 mb-1">Value *</label>
              <input required value={form.match_value} onChange={e => setForm(f => ({ ...f, match_value: e.target.value }))}
                placeholder="e.g. Vodafone or vodafone.com"
                className="w-full bg-card border border-border rounded px-2 py-1.5 text-xs text-fg focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block text-xs text-fg-3 mb-1">Reason</label>
              <input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                className="w-full bg-card border border-border rounded px-2 py-1.5 text-xs text-fg focus:outline-none focus:border-accent" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={adding}
              className="px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim disabled:opacity-60">
              {adding ? 'Adding...' : 'Add'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 bg-card border border-border text-xs text-fg-2 rounded hover:text-fg">Cancel</button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-24 text-xs text-fg-3">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs text-fg-3">No entries match.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-soft">
                {['Match Value', 'Match By', 'Type', 'Reason', 'Added By', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-fg-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(entry => {
                const isEditing = editingId === entry.id
                return (
                  <tr key={entry.id} className="border-b border-border-soft last:border-0 group">
                    <td className="px-4 py-2.5">
                      {isEditing ? (
                        <input value={editForm.match_value ?? ''} onChange={e => setEditForm(f => ({ ...f, match_value: e.target.value }))}
                          className="bg-card border border-border rounded px-2 py-1 text-xs text-fg focus:outline-none focus:border-accent w-40" />
                      ) : (
                        <span className="text-xs font-medium text-fg">{entry.match_value}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-fg-2">{entry.match_type.replace('_', ' ')}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn('px-2 py-0.5 rounded text-xs font-medium', TYPE_META[entry.suppression_type].color)}>
                        {TYPE_META[entry.suppression_type].label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {isEditing ? (
                        <input value={editForm.reason ?? ''} onChange={e => setEditForm(f => ({ ...f, reason: e.target.value }))}
                          className="bg-card border border-border rounded px-2 py-1 text-xs text-fg focus:outline-none focus:border-accent w-40" />
                      ) : (
                        <span className="text-xs text-fg-3">{entry.reason ?? '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-fg-3">{entry.added_by ?? 'system'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isEditing ? (
                          <>
                            <button onClick={() => handleSaveEdit(entry.id)} className="text-score-high hover:text-score-high/80">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditingId(null)} className="text-fg-3 hover:text-fg">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { setEditingId(entry.id); setEditForm(entry) }} className="text-fg-3 hover:text-fg transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(entry.id)} className="text-fg-3 hover:text-score-low transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-fg-3 mt-2">{entries.length} total entries</p>
    </div>
  )
}
