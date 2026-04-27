'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Target, Search, Upload, Plus, ChevronDown, Webhook,
  Building2, ExternalLink, Clock, RefreshCw, Loader2,
  Link2, AlertCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ManualLeadModal from '@/components/manual-lead-modal'
import { cn } from '@/lib/utils'

type SubTab = 'pending' | 'needs_research'

type Lead = {
  id: string; created_at: string; status: string
  first_name?: string; last_name?: string; title?: string
  linkedin_url?: string; email?: string
  source_type?: string; source_detail?: string; source_signal?: string
  source_warmth?: string
  // Scoring
  icp_score?: number; fit_score?: number; intent_score?: number
  reachability_score?: number; priority?: string
  score_reasoning?: string; signal_strength?: string; signal_explanation?: string
  segment?: string; recommended_campaign?: string; recommended_product?: string
  disqualified?: boolean; scoring_completed_at?: string
  enrichment_status?: string; enrichment_error?: string
  companies?: { id: string; name: string; website?: string; country?: string; segment?: string; target_tier?: string }
}

// ─── Badges & helpers ────────────────────────────────────────────────────────

const PRIORITY_META: Record<string, { label: string; color: string; dot: string }> = {
  HOT:          { label: 'HOT',          color: 'bg-score-low/10 text-score-low border border-score-low/20',     dot: '🔴' },
  WARM:         { label: 'WARM',         color: 'bg-warm/10 text-warm border border-warm/20',                   dot: '🟡' },
  COLD:         { label: 'COLD',         color: 'bg-cold/10 text-cold border border-cold/20',                   dot: '🔵' },
  DISQUALIFIED: { label: 'DISQUALIFIED', color: 'bg-border text-fg-3',                                          dot: '⚫' },
}
const WARMTH_BADGE: Record<string, string> = {
  WARM: 'bg-warm/10 text-warm', COLD: 'bg-cold/10 text-cold', UNKNOWN: 'bg-border text-fg-3',
}
const SIGNAL_DOT: Record<string, string> = { HIGH: 'text-score-high', MEDIUM: 'text-warm', LOW: 'text-fg-3' }
const SOURCE_ICONS: Record<string, string> = {
  CSV_IMPORT: '📥', MANUAL_ENTRY: '✋', LEMLIST_WATCHER: '🔗',
  COWORK_EXPORT: '📥', SCOUTLY_AGENT: '✨', GOOGLE_ALERTS: '📡', LINKEDIN_JOBS: '💼',
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function ScoreBar({ value, label }: { value?: number; label: string }) {
  if (value == null) return null
  const color = value >= 80 ? 'bg-score-high' : value >= 60 ? 'bg-warm' : value >= 40 ? 'bg-cold' : 'bg-score-low'
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-xs text-fg-3 w-16 shrink-0">{label}</span>
      <div className="flex-1 bg-border rounded-full h-1.5">
        <div className={cn('h-1.5 rounded-full transition-all', color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-semibold text-fg w-6 text-right">{value}</span>
    </div>
  )
}

// ─── Pending Lead Card (horizontal 3-column layout) ──────────────────────────

function PendingCard({ lead, onRefresh }: { lead: Lead; onRefresh: () => void }) {
  const router = useRouter()
  const [rescoring, setRescoring] = useState(false)
  const [rejecting, setRejecting]   = useState(false)
  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || '(No name)'
  const priority  = lead.priority ? PRIORITY_META[lead.priority] : null
  const isScored  = lead.icp_score != null

  const leftBorder =
    priority?.label === 'HOT'  ? 'border-l-score-low' :
    priority?.label === 'WARM' ? 'border-l-warm'       :
    priority?.label === 'COLD' ? 'border-l-cold'       : 'border-l-border'

  async function handleRescore() {
    setRescoring(true)
    try {
      const res  = await fetch(`/api/leads/${lead.id}/score`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ run_type: 'RE_SCORE' }) })
      const data = await res.json()
      if (!res.ok || !data.success) alert(`Scoring failed: ${data.error ?? 'Unknown error'}`)
    } catch (e) { alert(`Network error: ${e instanceof Error ? e.message : 'unknown'}`) }
    setRescoring(false)
    onRefresh()
  }

  async function handleReject() {
    setRejecting(true)
    await createClient().from('leads').update({ status: 'REJECTED' }).eq('id', lead.id)
    onRefresh()
  }

  return (
    <div className={cn(
      'flex bg-surface border border-l-4 rounded-xl overflow-hidden transition-colors hover:bg-surface/80',
      leftBorder,
      priority?.label === 'HOT'  ? 'border-score-low/20' :
      priority?.label === 'WARM' ? 'border-warm/20'      : 'border-border'
    )}>

      {/* ── COL 1: Priority + Score (fixed width) ── */}
      <div className={cn(
        'w-20 shrink-0 flex flex-col items-center justify-center gap-1 py-4 border-r border-border-soft',
        !isScored && 'opacity-50'
      )}>
        {isScored && priority ? (
          <>
            <span className="text-2xl leading-none">{priority.dot}</span>
            <span className="text-xl font-bold text-fg leading-none">{lead.icp_score}</span>
            <span className="text-xs text-fg-3">/100</span>
            <span className={cn('mt-1 px-1.5 py-0.5 rounded text-xs font-bold', priority.color)}>
              {priority.label}
            </span>
          </>
        ) : (
          <>
            <Loader2 className="w-5 h-5 text-fg-3 animate-spin" />
            <span className="text-xs text-fg-3 text-center leading-tight">Scoring...</span>
          </>
        )}
      </div>

      {/* ── COL 2: Identity + Signal + Reasoning (flexible) ── */}
      <div className="flex-1 min-w-0 px-4 py-3 flex flex-col justify-between">
        {/* Top: name / title / company */}
        <div>
          <div className="flex items-baseline gap-2 flex-wrap mb-0.5">
            <span className="text-sm font-semibold text-fg">{fullName}</span>
            {lead.title && <span className="text-xs text-fg-2">{lead.title}</span>}
            <span className="text-xs text-fg-3 ml-auto flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3" />{timeAgo(lead.created_at)}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {lead.companies && (
              <span className="text-xs text-fg-2 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-fg-3 shrink-0" />
                {lead.companies.name}
                {lead.companies.country && ` · ${lead.companies.country}`}
                {lead.companies.target_tier === 'TIER_1' && (
                  <span className="ml-1 px-1 bg-accent-muted text-accent text-xs rounded">T1</span>
                )}
              </span>
            )}
            {lead.segment && <span className="px-1.5 py-0.5 bg-accent-muted text-accent text-xs rounded">{lead.segment}</span>}
          </div>

          {/* Contact links */}
          <div className="flex items-center gap-3 mb-2">
            {lead.linkedin_url && (
              <a href={lead.linkedin_url} target="_blank" rel="noopener"
                className="text-xs text-accent hover:underline flex items-center gap-1 w-fit">
                <Link2 className="w-3 h-3" />linkedin
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
            {lead.email && <span className="text-xs text-fg-3">📧 {lead.email}</span>}
            {lead.source_type && (
              <span className="text-xs text-fg-3">
                {SOURCE_ICONS[lead.source_type] ?? '📥'} {lead.source_type.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </div>

        {/* Signal + reasoning */}
        <div className="space-y-1">
          {(lead.signal_strength || lead.signal_explanation) && (
            <p className="text-xs text-fg-3 leading-relaxed">
              {lead.signal_strength && (
                <span className={cn('font-semibold', SIGNAL_DOT[lead.signal_strength])}>
                  {lead.signal_strength} signal
                </span>
              )}
              {lead.signal_explanation && ` — ${lead.signal_explanation}`}
            </p>
          )}
          {!lead.signal_explanation && lead.source_signal && (
            <p className="text-xs text-fg-3 italic">"{lead.source_signal}"</p>
          )}
          {lead.score_reasoning && (
            <p className="text-xs text-fg-2 italic line-clamp-2">🤖 "{lead.score_reasoning}"</p>
          )}
        </div>
      </div>

      {/* ── COL 3: Scores + Recs + Actions (fixed width) ── */}
      <div className="w-52 shrink-0 border-l border-border-soft px-4 py-3 flex flex-col justify-between">
        {/* Score bars */}
        <div>
          {isScored ? (
            <div className="space-y-1.5 mb-3">
              {[
                { label: 'Fit',    value: lead.fit_score },
                { label: 'Intent', value: lead.intent_score },
                { label: 'Reach',  value: lead.reachability_score },
              ].map(({ label, value }) => {
                if (value == null) return null
                const color = value >= 80 ? 'bg-score-high' : value >= 60 ? 'bg-warm' : value >= 40 ? 'bg-cold' : 'bg-score-low'
                return (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-xs text-fg-3 w-9 shrink-0">{label}</span>
                    <div className="flex-1 bg-border rounded-full h-1.5">
                      <div className={cn('h-1.5 rounded-full', color)} style={{ width: `${value}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-fg w-5 text-right">{value}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-14 flex items-center justify-center">
              <span className="text-xs text-fg-3">Awaiting score</span>
            </div>
          )}

          {/* Recommendations */}
          <div className="flex flex-wrap gap-1 mb-3">
            {lead.recommended_product && (
              <span className="px-1.5 py-0.5 bg-accent-muted text-accent text-xs rounded">
                {lead.recommended_product}
              </span>
            )}
            {lead.recommended_campaign && (
              <span className="px-1.5 py-0.5 bg-card border border-border text-fg-3 text-xs rounded truncate max-w-full">
                {lead.recommended_campaign}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1">
            {lead.companies && (
              <button onClick={() => router.push(`/accounts/${lead.companies!.id}`)}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-card border border-border text-xs text-fg-2 rounded hover:text-fg transition-colors">
                <Building2 className="w-3 h-3" /> Account
              </button>
            )}
            <button onClick={handleRescore} disabled={rescoring}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-card border border-border text-xs text-fg-2 rounded hover:text-fg disabled:opacity-50 transition-colors">
              {rescoring ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              {rescoring ? '...' : 'Re-score'}
            </button>
          </div>
          <div className="flex gap-1">
            <button className="flex-1 px-2 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim opacity-40 cursor-not-allowed" disabled>
              Approve
            </button>
            <button onClick={handleReject} disabled={rejecting}
              className="px-3 py-1.5 text-xs text-score-low border border-score-low/20 rounded hover:bg-score-low/10 disabled:opacity-50 transition-colors">
              {rejecting ? '...' : 'Reject'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Needs Research Card ──────────────────────────────────────────────────────

function ResearchCard({ lead, onRefresh, onAddContact }: {
  lead: Lead; onRefresh: () => void; onAddContact: () => void
}) {
  const [retrying, setRetrying] = useState(false)

  async function handleRetry() {
    setRetrying(true)
    await fetch(`/api/leads/${lead.id}/process`, { method: 'POST' })
    setRetrying(false)
    onRefresh()
  }

  async function handleArchive() {
    await createClient().from('leads').update({ status: 'REJECTED' }).eq('id', lead.id)
    onRefresh()
  }

  return (
    <div className="bg-surface border-l-4 border-l-warm border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="px-2 py-0.5 bg-warm/10 text-warm text-xs font-medium rounded">🔍 NEEDS RESEARCH</span>
        <span className="text-xs text-fg-3 flex items-center gap-1">
          <Clock className="w-3 h-3" />{timeAgo(lead.created_at)}
        </span>
      </div>
      <div className="space-y-1 mb-3">
        {lead.companies ? (
          <>
            <p className="text-sm font-semibold text-fg">{lead.companies.name}</p>
            <p className="text-xs text-fg-2">{lead.companies.website ?? lead.companies.country ?? ''}</p>
          </>
        ) : <p className="text-sm font-semibold text-fg">Unknown company</p>}
        {lead.source_signal && <p className="text-xs text-fg-3 italic">Signal: "{lead.source_signal}"</p>}
        {lead.enrichment_error && (
          <div className="flex items-center gap-1 text-xs text-warm mt-1">
            <AlertCircle className="w-3 h-3" /> {lead.enrichment_error}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onAddContact}
          className="px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Add Contact
        </button>
        <button onClick={handleRetry} disabled={retrying}
          className="flex items-center gap-1 px-3 py-1.5 bg-card border border-border text-xs text-fg-2 rounded hover:text-fg disabled:opacity-50">
          {retrying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Retry
        </button>
        <button onClick={handleArchive} className="ml-auto text-xs text-fg-3 hover:text-score-low px-2 py-1 rounded">
          Won&apos;t pursue
        </button>
      </div>
    </div>
  )
}

// ─── Main Queue Page ──────────────────────────────────────────────────────────

export default function QueuePage() {
  const router = useRouter()
  const [subTab, setSubTab]           = useState<SubTab>('pending')
  const [leads, setLeads]             = useState<Lead[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filterPriority, setFilterPriority] = useState('ALL')
  const [filterSource, setFilterSource]     = useState('ALL')
  const [filterWarmth, setFilterWarmth]     = useState('ALL')
  const [filterTier1, setFilterTier1]       = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showManual, setShowManual]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const statuses = subTab === 'pending' ? ['PENDING'] : ['NEEDS_RESEARCH']
    const { data } = await supabase
      .from('leads')
      .select('*, companies(id, name, website, country, segment, target_tier)')
      .in('status', statuses)
      .order('icp_score', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(200)
    setLeads(data ?? [])
    setLoading(false)
  }, [subTab])

  useEffect(() => { load() }, [load])

  const counts = {
    pending:       leads.filter(l => l.status === 'PENDING').length,
    needs_research: leads.filter(l => l.status === 'NEEDS_RESEARCH').length,
  }

  const filtered = leads.filter(l => {
    const name = `${l.first_name ?? ''} ${l.last_name ?? ''}`.toLowerCase()
    const co = (l.companies?.name ?? '').toLowerCase()
    const matchSearch   = !search || name.includes(search.toLowerCase()) || co.includes(search.toLowerCase())
    const matchPriority = filterPriority === 'ALL' || l.priority === filterPriority
    const matchSource   = filterSource === 'ALL' || l.source_type === filterSource
    const matchWarmth   = filterWarmth === 'ALL' || l.source_warmth === filterWarmth
    const matchTier1    = !filterTier1 || l.companies?.target_tier === 'TIER_1'
    return matchSearch && matchPriority && matchSource && matchWarmth && matchTier1
  })

  const hotCount  = leads.filter(l => l.priority === 'HOT').length
  const warnCount = leads.filter(l => l.priority === 'WARM').length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-soft">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-accent" />
          <h1 className="text-sm font-semibold text-fg">Review Queue</h1>
          {hotCount > 0 && <span className="px-1.5 py-0.5 bg-score-low/10 text-score-low text-xs font-bold rounded">{hotCount} HOT</span>}
          {warnCount > 0 && <span className="px-1.5 py-0.5 bg-warm/10 text-warm text-xs font-bold rounded">{warnCount} WARM</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-3" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..."
              className="bg-surface border border-border text-xs text-fg placeholder:text-fg-3 rounded-md pl-8 pr-3 py-1.5 w-44 focus:outline-none focus:border-accent" />
          </div>
          <div className="relative">
            <button onClick={() => setShowAddMenu(m => !m)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded-md hover:bg-accent-dim">
              <Plus className="w-3.5 h-3.5" /> Add Leads <ChevronDown className="w-3 h-3" />
            </button>
            {showAddMenu && (
              <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-20 py-1 w-44">
                <button onClick={() => { setShowAddMenu(false); router.push('/leads/import') }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-fg hover:bg-surface">
                  <Upload className="w-3.5 h-3.5 text-fg-3" /> CSV Import
                </button>
                <button onClick={() => { setShowAddMenu(false); setShowManual(true) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-fg hover:bg-surface">
                  <Plus className="w-3.5 h-3.5 text-fg-3" /> Manual Entry
                </button>
                <button onClick={() => { setShowAddMenu(false); router.push('/settings/webhooks') }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-fg hover:bg-surface">
                  <Webhook className="w-3.5 h-3.5 text-fg-3" /> Webhook URL
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub-tabs + filters */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-border-soft bg-card flex-wrap gap-y-2">
        {([
          { key: 'pending' as SubTab,        label: 'Pending Review',  count: counts.pending },
          { key: 'needs_research' as SubTab, label: 'Needs Research',  count: counts.needs_research },
        ] as const).map(({ key, label, count }) => (
          <button key={key} onClick={() => setSubTab(key)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors',
              subTab === key ? 'bg-accent-muted text-accent' : 'text-fg-3 hover:text-fg hover:bg-surface')}>
            {label}
            <span className={cn('px-1.5 rounded text-xs', subTab === key ? 'bg-accent/20 text-accent' : 'bg-border text-fg-3')}>{count}</span>
          </button>
        ))}

        <div className="ml-auto flex items-center gap-1.5 flex-wrap">
          {subTab === 'pending' && (
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
              className="bg-surface border border-border text-xs text-fg rounded px-2 py-1 focus:outline-none focus:border-accent">
              <option value="ALL">All priority</option>
              <option value="HOT">🔴 HOT</option>
              <option value="WARM">🟡 WARM</option>
              <option value="COLD">🔵 COLD</option>
              <option value="DISQUALIFIED">⚫ Disqualified</option>
            </select>
          )}
          <select value={filterWarmth} onChange={e => setFilterWarmth(e.target.value)}
            className="bg-surface border border-border text-xs text-fg rounded px-2 py-1 focus:outline-none focus:border-accent">
            <option value="ALL">All warmth</option>
            <option value="WARM">Warm</option>
            <option value="COLD">Cold</option>
          </select>
          <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
            className="bg-surface border border-border text-xs text-fg rounded px-2 py-1 focus:outline-none focus:border-accent">
            <option value="ALL">All sources</option>
            <option value="MANUAL_ENTRY">Manual</option>
            <option value="CSV_IMPORT">CSV</option>
            <option value="LEMLIST_WATCHER">Lemlist</option>
            <option value="GOOGLE_ALERTS">Google Alerts</option>
            <option value="LINKEDIN_JOBS">LinkedIn Jobs</option>
          </select>
          <button onClick={() => setFilterTier1(t => !t)}
            className={cn('px-2.5 py-1 rounded text-xs font-medium transition-colors',
              filterTier1 ? 'bg-accent-muted text-accent' : 'bg-surface border border-border text-fg-3 hover:text-fg')}>
            Tier 1 only
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-xs text-fg-3">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-fg-3" />
            </div>
            <h2 className="text-sm font-semibold text-fg mb-1">
              {subTab === 'pending' ? 'No leads pending review' : 'No leads need research'}
            </h2>
            <p className="text-xs text-fg-3 max-w-xs mb-4">
              {subTab === 'pending'
                ? 'Import leads via CSV, add manually, or configure a webhook to receive them from Lemlist.'
                : 'Leads appear here when a company is surfaced but no specific contact has been found.'}
            </p>
            <button onClick={() => setShowManual(true)}
              className="px-4 py-2 bg-accent text-sidebar text-xs font-semibold rounded-md hover:bg-accent-dim">
              + Add Lead Manually
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {subTab === 'pending'
              ? filtered.map(l => <PendingCard key={l.id} lead={l} onRefresh={load} />)
              : filtered.map(l => <ResearchCard key={l.id} lead={l} onRefresh={load} onAddContact={() => setShowManual(true)} />)}
          </div>
        )}
      </div>

      <ManualLeadModal open={showManual} onClose={() => setShowManual(false)}
        onCreated={() => { setShowManual(false); load() }} />
    </div>
  )
}
