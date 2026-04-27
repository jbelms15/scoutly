'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Check, User, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import KBSourceBadge from '@/components/kb-source-badge'
import { cn } from '@/lib/utils'

type ReviewItem = {
  id: string
  table: string
  tableLabel: string
  name: string
  source: string
  source_notes: string | null
  needs_review: boolean
}

const TABLES: { name: string; label: string; nameField: string }[] = [
  { name: 'kb_icp_segments',         label: 'ICP Segment',          nameField: 'segment_name' },
  { name: 'kb_geographic_priorities',label: 'Geographic Priority',  nameField: 'tier_name' },
  { name: 'kb_modules',              label: 'Module',               nameField: 'product_name' },
  { name: 'kb_channels',             label: 'Channel',              nameField: 'channel_name' },
  { name: 'kb_proof_points',         label: 'Proof Point',          nameField: 'headline' },
  { name: 'kb_competitors',          label: 'Competitor',           nameField: 'competitor_name' },
  { name: 'kb_pain_points',          label: 'Pain Point',           nameField: 'pain_title' },
  { name: 'kb_objections',           label: 'Objection',            nameField: 'objection_text' },
  { name: 'kb_framing_rules',        label: 'Framing Rule',         nameField: 'rule_name' },
  { name: 'kb_conversation_patterns',label: 'Conversation Pattern', nameField: 'pattern_name' },
  { name: 'kb_copy_preferences',     label: 'Copy Preference',      nameField: 'preference_type' },
]

const TABLE_LABEL_COLOURS: Record<string, string> = {
  'ICP Segment':          'bg-accent/10 text-accent',
  'Geographic Priority':  'bg-score-high/10 text-score-high',
  'Module':               'bg-accent-muted text-accent',
  'Channel':              'bg-score-high/10 text-score-high',
  'Proof Point':          'bg-warm/10 text-warm',
  'Competitor':           'bg-score-low/10 text-score-low',
  'Pain Point':           'bg-warm/10 text-warm',
  'Objection':            'bg-score-low/10 text-score-low',
  'Framing Rule':         'bg-accent/10 text-accent',
  'Conversation Pattern': 'bg-border text-fg-2',
  'Copy Preference':      'bg-border text-fg-2',
}

export default function ReviewPage() {
  const [items, setItems]       = useState<ReviewItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [acting, setActing]     = useState<Record<string, boolean>>({})
  const [filterTable, setFilterTable] = useState('ALL')

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const all: ReviewItem[] = []

    await Promise.all(TABLES.map(async (t) => {
      try {
        const { data } = await supabase
          .from(t.name)
          .select('*')
          .eq('needs_review', true)
        if (data) {
          data.forEach(row => {
            const r = row as Record<string, unknown>
            const name = (r[t.nameField] as string | undefined)?.slice(0, 80) ?? (r.id as string).slice(0, 8)
            all.push({ id: r.id as string, table: t.name, tableLabel: t.label, name, source: r.source as string, source_notes: r.source_notes as string | null, needs_review: r.needs_review as boolean })
          })
        }
      } catch {
        // table might not have source column yet
      }
    }))

    all.sort((a, b) => a.tableLabel.localeCompare(b.tableLabel))
    setItems(all)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function approve(item: ReviewItem) {
    setActing(a => ({ ...a, [item.id]: true }))
    await createClient().from(item.table).update({ needs_review: false }).eq('id', item.id)
    setActing(a => ({ ...a, [item.id]: false }))
    load()
  }

  async function markJoanna(item: ReviewItem) {
    setActing(a => ({ ...a, [`j_${item.id}`]: true }))
    await createClient().from(item.table).update({ source: 'JOANNA_INPUT', needs_review: false }).eq('id', item.id)
    setActing(a => ({ ...a, [`j_${item.id}`]: false }))
    load()
  }

  async function deleteItem(item: ReviewItem) {
    if (!confirm(`Delete "${item.name}" from ${item.tableLabel}? This cannot be undone.`)) return
    setActing(a => ({ ...a, [`d_${item.id}`]: true }))
    await createClient().from(item.table).delete().eq('id', item.id)
    setActing(a => ({ ...a, [`d_${item.id}`]: false }))
    load()
  }

  const uniqueTables = [...new Set(items.map(i => i.tableLabel))].sort()
  const filtered = filterTable === 'ALL' ? items : items.filter(i => i.tableLabel === filterTable)

  const byTable = filtered.reduce<Record<string, ReviewItem[]>>((acc, item) => {
    if (!acc[item.tableLabel]) acc[item.tableLabel] = []
    acc[item.tableLabel].push(item)
    return acc
  }, {})

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle className="w-4 h-4 text-warm" />
        <h1 className="text-sm font-semibold text-fg">Needs Review</h1>
        {!loading && (
          <span className="px-1.5 py-0.5 bg-warm/10 text-warm text-xs font-bold rounded">{items.length}</span>
        )}
      </div>
      <p className="text-xs text-fg-3 mb-5">
        AI-inferred or unconfirmed Knowledge Base content. Review each item with Benedikt, then approve, re-attribute, or delete.
      </p>

      {/* Filter tabs */}
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
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <Check className="w-8 h-8 text-score-high mb-3" />
          <p className="text-sm font-medium text-fg mb-1">All clear</p>
          <p className="text-xs text-fg-3">No items need review. Every Knowledge Base record has a confirmed source.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byTable).map(([tableLabel, tableItems]) => (
            <div key={tableLabel}>
              <div className="flex items-center gap-2 mb-2">
                <span className={cn('px-2 py-0.5 rounded text-xs font-semibold', TABLE_LABEL_COLOURS[tableLabel] ?? 'bg-border text-fg-3')}>
                  {tableLabel}
                </span>
                <span className="text-xs text-fg-3">{tableItems.length} item{tableItems.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-2">
                {tableItems.map(item => (
                  <div key={item.id} className="bg-surface border border-border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-fg truncate">{item.name}</span>
                          <KBSourceBadge source={item.source} />
                        </div>
                        {item.source_notes && (
                          <p className="text-xs text-fg-3 leading-relaxed">{item.source_notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => approve(item)}
                          disabled={acting[item.id]}
                          title="Approve as-is — confirms content is correct, clears the review flag"
                          className="flex items-center gap-1 px-2.5 py-1 bg-score-high/10 text-score-high border border-score-high/20 text-xs font-medium rounded hover:bg-score-high/20 disabled:opacity-50 transition-colors">
                          {acting[item.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Approve
                        </button>
                        <button
                          onClick={() => markJoanna(item)}
                          disabled={acting[`j_${item.id}`]}
                          title="Mark as Joanna Input — re-attributes this record to Joanna"
                          className="flex items-center gap-1 px-2.5 py-1 bg-border text-fg-2 text-xs font-medium rounded hover:text-fg disabled:opacity-50 transition-colors">
                          {acting[`j_${item.id}`] ? <Loader2 className="w-3 h-3 animate-spin" /> : <User className="w-3 h-3" />}
                          Joanna
                        </button>
                        <button
                          onClick={() => deleteItem(item)}
                          disabled={acting[`d_${item.id}`]}
                          title="Delete this record permanently"
                          className="p-1.5 text-fg-3 hover:text-score-low disabled:opacity-50 transition-colors">
                          {acting[`d_${item.id}`] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
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
