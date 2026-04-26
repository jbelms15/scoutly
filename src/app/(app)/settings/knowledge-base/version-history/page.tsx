'use client'

import { useState, useEffect } from 'react'
import { Clock, RotateCcw, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type HistoryEntry = {
  id: string; created_at: string; table_name: string; record_id: string
  previous_data: Record<string, any> | null; new_data: Record<string, any> | null
  changed_by: string; change_reason: string
}

const TABLE_LABELS: Record<string, { label: string; color: string }> = {
  kb_icp_segments:    { label: 'ICP Segment',       color: 'bg-cold/10 text-cold' },
  kb_products:        { label: 'Product',            color: 'bg-accent/10 text-accent' },
  kb_proof_points:    { label: 'Proof Point',        color: 'bg-warm/10 text-warm' },
  kb_competitors:     { label: 'Competitor',         color: 'bg-score-low/10 text-score-low' },
  kb_signal_keywords: { label: 'Signal Keywords',   color: 'bg-score-high/10 text-score-high' },
  kb_copy_preferences:{ label: 'Copy Preferences',  color: 'bg-fg-3/10 text-fg-2' },
}

const KB_TABLES = Object.keys(TABLE_LABELS)

async function restoreRecord(tableName: string, recordId: string, previousData: Record<string, any>) {
  const supabase = createClient()
  const { id, created_at, updated_at, version, ...fieldsToRestore } = previousData
  return supabase.from(tableName).update(fieldsToRestore).eq('id', recordId)
}

function getRecordName(entry: HistoryEntry): string {
  const d = entry.new_data || entry.previous_data
  if (!d) return entry.record_id.slice(0, 8)
  return d.segment_name || d.product_name || d.name || d.competitor_name ||
    d.keyword_set_name || d.preference_type || d.headline || entry.record_id.slice(0, 8)
}

export default function VersionHistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTable, setFilterTable] = useState('ALL')
  const [restoring, setRestoring] = useState<Record<string, boolean>>({})

  async function load() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('kb_version_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    setEntries(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleRestore(entry: HistoryEntry) {
    if (!entry.previous_data) return
    if (!confirm('Restore this version? Current data will be replaced.')) return
    setRestoring(r => ({ ...r, [entry.id]: true }))
    await restoreRecord(entry.table_name, entry.record_id, entry.previous_data)
    setRestoring(r => ({ ...r, [entry.id]: false }))
    load()
  }

  const filtered = entries.filter(e => {
    const matchSearch = !search || getRecordName(e).toLowerCase().includes(search.toLowerCase())
    const matchTable = filterTable === 'ALL' || e.table_name === filterTable
    return matchSearch && matchTable
  })

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-4 h-4 text-accent" />
        <h1 className="text-sm font-semibold text-fg">Version History</h1>
      </div>
      <p className="text-xs text-fg-3 mb-5">Every edit to any Knowledge Base record is captured here automatically. Restore any previous version with one click.</p>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-3" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by record name..."
            className="w-full bg-surface border border-border text-xs text-fg placeholder:text-fg-3 rounded-md pl-8 pr-3 py-1.5 focus:outline-none focus:border-accent" />
        </div>
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setFilterTable('ALL')}
            className={cn('px-2.5 py-1 rounded text-xs font-medium transition-colors', filterTable === 'ALL' ? 'bg-accent-muted text-accent' : 'text-fg-3 hover:text-fg hover:bg-surface')}>
            All
          </button>
          {KB_TABLES.map(t => (
            <button key={t} onClick={() => setFilterTable(t)}
              className={cn('px-2.5 py-1 rounded text-xs font-medium transition-colors', filterTable === t ? 'bg-accent-muted text-accent' : 'text-fg-3 hover:text-fg hover:bg-surface')}>
              {TABLE_LABELS[t]?.label ?? t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-xs text-fg-3">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <Clock className="w-8 h-8 text-fg-3 mb-3" />
          <p className="text-sm font-medium text-fg mb-1">No version history yet</p>
          <p className="text-xs text-fg-3">Version history is recorded automatically whenever you save a change to any Knowledge Base section.</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-soft">
                {['Timestamp', 'Section', 'Record', 'Version', 'Changed By', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-fg-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(entry => {
                const meta = TABLE_LABELS[entry.table_name]
                const recordName = getRecordName(entry)
                const prevVersion = entry.previous_data?.version
                const newVersion = entry.new_data?.version
                return (
                  <tr key={entry.id} className="border-b border-border-soft last:border-0 hover:bg-card/50 transition-colors group">
                    <td className="px-4 py-3 text-xs text-fg-3 whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded text-xs font-medium', meta?.color ?? 'bg-border text-fg-3')}>
                        {meta?.label ?? entry.table_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-fg">{recordName}</td>
                    <td className="px-4 py-3 text-xs text-fg-3">
                      {prevVersion && newVersion ? `v${prevVersion} → v${newVersion}` : prevVersion ? `v${prevVersion}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-fg-3">{entry.changed_by ?? 'user'}</td>
                    <td className="px-4 py-3">
                      {entry.previous_data && (
                        <button
                          onClick={() => handleRestore(entry)}
                          disabled={restoring[entry.id]}
                          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2.5 py-1 bg-card border border-border rounded text-xs text-fg-2 hover:text-accent hover:border-accent/30 transition-all disabled:opacity-50"
                        >
                          <RotateCcw className="w-3 h-3" />
                          {restoring[entry.id] ? 'Restoring...' : 'Restore'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-border-soft">
            <p className="text-xs text-fg-3">{filtered.length} entries shown</p>
          </div>
        </div>
      )}
    </div>
  )
}
