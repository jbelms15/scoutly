'use client'

import { useState, useEffect } from 'react'
import { Archive, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import KBSourceBadge from '@/components/kb-source-badge'
import { cn } from '@/lib/utils'

type ArchivedItem = {
  id: string; table: string; tableLabel: string; name: string
  source: string | null; source_notes: string | null; archived_at?: string
}

const TABLES = [
  { name: 'kb_icp_segments',          label: 'ICP Segment',          nameField: 'segment_name' },
  { name: 'kb_geographic_priorities', label: 'Geographic Priority',  nameField: 'tier_name' },
  { name: 'kb_framing_rules',         label: 'Framing Rule',         nameField: 'rule_name' },
  { name: 'kb_modules',               label: 'Module',               nameField: 'product_name' },
  { name: 'kb_channels',              label: 'Channel',              nameField: 'channel_name' },
  { name: 'kb_proof_points',          label: 'Proof Point',          nameField: 'headline' },
  { name: 'kb_competitors',           label: 'Competitor',           nameField: 'competitor_name' },
  { name: 'kb_pain_points',           label: 'Pain Point',           nameField: 'pain_title' },
  { name: 'kb_objections',            label: 'Objection',            nameField: 'objection_text' },
  { name: 'kb_conversation_patterns', label: 'Conversation Pattern', nameField: 'pattern_name' },
  { name: 'kb_copy_preferences',      label: 'Copy Preference',      nameField: 'preference_type' },
]

const TABLE_COLOURS: Record<string, string> = {
  'ICP Segment': 'bg-accent/10 text-accent', 'Framing Rule': 'bg-accent/10 text-accent',
  'Geographic Priority': 'bg-score-high/10 text-score-high', 'Channel': 'bg-score-high/10 text-score-high',
  'Module': 'bg-accent-muted text-accent', 'Proof Point': 'bg-warm/10 text-warm',
  'Competitor': 'bg-score-low/10 text-score-low', 'Pain Point': 'bg-warm/10 text-warm',
  'Objection': 'bg-score-low/10 text-score-low', 'Conversation Pattern': 'bg-border text-fg-2',
  'Copy Preference': 'bg-border text-fg-2',
}

export default function ArchivePage() {
  const [items, setItems]     = useState<ArchivedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTable, setFilterTable] = useState('ALL')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const all: ArchivedItem[] = []
      await Promise.all(TABLES.map(async (t) => {
        try {
          const { data } = await supabase.from(t.name).select('*').eq('archived', true)
          if (data) {
            data.forEach(row => {
              const r = row as Record<string, unknown>
              const name = (r[t.nameField] as string | undefined)?.slice(0, 80) ?? (r.id as string).slice(0, 8)
              all.push({ id: r.id as string, table: t.name, tableLabel: t.label, name, source: r.source as string | null, source_notes: r.source_notes as string | null })
            })
          }
        } catch { /* table may not have archived column yet */ }
      }))
      all.sort((a, b) => a.tableLabel.localeCompare(b.tableLabel))
      setItems(all); setLoading(false)
    }
    load()
  }, [])

  const uniqueTables = [...new Set(items.map(i => i.tableLabel))].sort()
  const filtered = filterTable === 'ALL' ? items : items.filter(i => i.tableLabel === filterTable)
  const byTable = filtered.reduce<Record<string, ArchivedItem[]>>((acc, item) => {
    if (!acc[item.tableLabel]) acc[item.tableLabel] = []
    acc[item.tableLabel].push(item); return acc
  }, {})

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-2 mb-1">
        <Archive className="w-4 h-4 text-fg-3" />
        <h1 className="text-sm font-semibold text-fg">Archive</h1>
        {!loading && <span className="px-1.5 py-0.5 bg-border text-fg-3 text-xs rounded">{items.length}</span>}
      </div>
      <p className="text-xs text-fg-3 mb-5">
        AI-inferred records replaced by authoritative content from Benedikt's SDR materials. Kept as audit trail — not used in scoring or prompts.
      </p>

      {!loading && uniqueTables.length > 1 && (
        <div className="flex flex-wrap gap-1 mb-5">
          <button onClick={() => setFilterTable('ALL')}
            className={cn('px-2.5 py-1 rounded text-xs font-medium transition-colors', filterTable === 'ALL' ? 'bg-accent-muted text-accent' : 'text-fg-3 hover:text-fg hover:bg-surface')}>
            All ({items.length})
          </button>
          {uniqueTables.map(t => (
            <button key={t} onClick={() => setFilterTable(t)}
              className={cn('px-2.5 py-1 rounded text-xs font-medium transition-colors', filterTable === t ? 'bg-accent-muted text-accent' : 'text-fg-3 hover:text-fg hover:bg-surface')}>
              {t} ({items.filter(i => i.tableLabel === t).length})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32 gap-2 text-xs text-fg-3">
          <Loader2 className="w-4 h-4 animate-spin text-accent" /> Loading...
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <p className="text-xs text-fg-3">No archived records yet. Run migration 014 to archive existing AI-inferred content.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byTable).map(([tableLabel, tableItems]) => (
            <div key={tableLabel}>
              <div className="flex items-center gap-2 mb-2">
                <span className={cn('px-2 py-0.5 rounded text-xs font-semibold', TABLE_COLOURS[tableLabel] ?? 'bg-border text-fg-3')}>{tableLabel}</span>
                <span className="text-xs text-fg-3">{tableItems.length} archived</span>
              </div>
              <div className="bg-surface border border-border rounded-lg divide-y divide-border-soft">
                {tableItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs text-fg-2 flex-1 min-w-0 truncate">{item.name}</span>
                    <KBSourceBadge source={item.source} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
