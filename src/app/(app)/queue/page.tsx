'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Target, Search, Plus, ChevronDown, Upload, Webhook,
  Building2, Link2, ExternalLink, Clock, RefreshCw,
  Loader2, CheckSquare, Square, Check, AlertCircle, MessageSquare,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ManualLeadModal from '@/components/manual-lead-modal'
import RejectModal from '@/components/reject-modal'
import EditLeadPanel from '@/components/edit-lead-panel'
import QualificationCard from '@/components/qualification-card'
import AddTestReplyModal from '@/components/add-test-reply-modal'
import { cn } from '@/lib/utils'

type TabKey = 'pending' | 'replies' | 'needs_research' | 'approved'

type Lead = {
  id: string; created_at: string; status: string
  first_name?: string; last_name?: string; title?: string
  linkedin_url?: string; email?: string
  source_type?: string; source_detail?: string; source_signal?: string; source_warmth?: string
  icp_score?: number; fit_score?: number; intent_score?: number; reachability_score?: number
  priority?: string; score_reasoning?: string; signal_strength?: string; signal_explanation?: string
  segment?: string; recommended_campaign?: string; recommended_product?: string
  disqualified?: boolean; scoring_completed_at?: string; enrichment_error?: string
  reply_sentiment?: string; reply_count?: number; last_reply_at?: string
  companies?: { id: string; name: string; website?: string; country?: string; segment?: string; target_tier?: string }
}

// ─── Constants ─────────────────────────────────────────────────────────────

const PRIORITY_META: Record<string, { label: string; color: string; dot: string }> = {
  HOT:          { label: 'HOT',          color: 'bg-score-low/10 text-score-low border border-score-low/20',  dot: '🔴' },
  WARM:         { label: 'WARM',         color: 'bg-warm/10 text-warm border border-warm/20',                 dot: '🟡' },
  COLD:         { label: 'COLD',         color: 'bg-cold/10 text-cold border border-cold/20',                 dot: '🔵' },
  DISQUALIFIED: { label: 'DISQUALIFIED', color: 'bg-border text-fg-3',                                        dot: '⚫' },
}
const SENTIMENT_META: Record<string, { label: string; color: string; dot: string }> = {
  INTERESTED:  { label: 'INTERESTED',  color: 'bg-score-high/10 text-score-high border border-score-high/20', dot: '🟢' },
  NOT_NOW:     { label: 'NOT NOW',     color: 'bg-warm/10 text-warm border border-warm/20',                   dot: '🟡' },
  NOT_FIT:     { label: 'NOT FIT',     color: 'bg-score-low/10 text-score-low border border-score-low/20',    dot: '🔴' },
  OOO:         { label: 'OOO',         color: 'bg-border text-fg-3',                                          dot: '⚪' },
  UNSUBSCRIBE: { label: 'UNSUBSCRIBE', color: 'bg-score-low/10 text-score-low border border-score-low/20',    dot: '🚫' },
  NEUTRAL:     { label: 'NEUTRAL',     color: 'bg-border text-fg-2',                                          dot: '⚪' },
}
const SIGNAL_DOT: Record<string, string> = { HIGH: 'text-score-high', MEDIUM: 'text-warm', LOW: 'text-fg-3' }
const SOURCE_ICONS: Record<string, string> = { CSV_IMPORT: '📥', MANUAL_ENTRY: '✋', LEMLIST_WATCHER: '🔗', COWORK_EXPORT: '📥', SCOUTLY_AGENT: '✨', GOOGLE_ALERTS: '📡', LINKEDIN_JOBS: '💼' }

function timeAgo(ts: string) {
  const d = (Date.now() - new Date(ts).getTime()) / 60000
  if (d < 60) return `${Math.floor(d)}m ago`
  if (d < 1440) return `${Math.floor(d / 60)}h ago`
  return `${Math.floor(d / 1440)}d ago`
}

// ─── Toast ─────────────────────────────────────────────────────────────────

function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  function show(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }
  return { toast, show }
}

// ─── Pending Card ───────────────────────────────────────────────────────────

function PendingCard({ lead, selected, onToggle, onRefresh, showReject, showEdit }: {
  lead: Lead; selected: boolean; onToggle: () => void
  onRefresh: () => void; showReject: (l: Lead) => void; showEdit: (l: Lead) => void
}) {
  const router = useRouter()
  const [approving, setApproving] = useState(false)
  const [rescoring, setRescoring] = useState(false)
  const priority  = lead.priority ? PRIORITY_META[lead.priority] : null
  const isScored  = lead.icp_score != null
  const fullName  = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || '(No name)'

  const leftBorder =
    priority?.label === 'HOT'  ? 'border-l-score-low' :
    priority?.label === 'WARM' ? 'border-l-warm' :
    priority?.label === 'COLD' ? 'border-l-cold' : 'border-l-border'

  async function handleApprove() {
    setApproving(true)
    await fetch(`/api/leads/${lead.id}/approve`, { method: 'POST' })
    setApproving(false)
    onRefresh()
  }

  async function handleRescore() {
    setRescoring(true)
    const res = await fetch(`/api/leads/${lead.id}/score`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ run_type: 'RE_SCORE' }) })
    const data = await res.json()
    if (!data.success) alert(`Scoring failed: ${data.error ?? 'unknown'}`)
    setRescoring(false)
    onRefresh()
  }

  return (
    <div className={cn('flex bg-surface border border-l-4 rounded-xl overflow-hidden hover:bg-surface/80 transition-colors', leftBorder,
      priority?.label === 'HOT' ? 'border-score-low/20' : priority?.label === 'WARM' ? 'border-warm/20' : 'border-border',
      selected && 'ring-1 ring-accent')}>

      {/* Checkbox */}
      <button onClick={onToggle} className="w-8 shrink-0 flex items-start justify-center pt-4 text-fg-3 hover:text-accent transition-colors">
        {selected ? <CheckSquare className="w-4 h-4 text-accent" /> : <Square className="w-4 h-4" />}
      </button>

      {/* Col 1: Priority */}
      <div className={cn('w-28 shrink-0 flex flex-col items-center justify-center gap-1 py-4 border-r border-border-soft', !isScored && 'opacity-50')}>
        {isScored && priority ? (
          <>
            <span className="text-2xl">{priority.dot}</span>
            <span className="text-xl font-bold text-fg">{lead.icp_score}</span>
            <span className="text-xs text-fg-3">/100</span>
            <span className={cn('mt-1 px-1.5 py-0.5 rounded text-xs font-bold', priority.color)}>{priority.label}</span>
          </>
        ) : (
          <>
            <Loader2 className="w-5 h-5 text-fg-3 animate-spin" />
            <span className="text-xs text-fg-3 text-center">Scoring...</span>
          </>
        )}
      </div>

      {/* Col 2: Identity + Signal */}
      <div className="flex-1 min-w-0 px-4 py-3 flex flex-col justify-between">
        <div>
          <div className="flex items-baseline gap-2 flex-wrap mb-0.5">
            <span className="text-sm font-semibold text-fg">{fullName}</span>
            {lead.title && <span className="text-xs text-fg-2">{lead.title}</span>}
            <span className="text-xs text-fg-3 ml-auto flex items-center gap-1 shrink-0"><Clock className="w-3 h-3" />{timeAgo(lead.created_at)}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {lead.companies && <span className="text-xs text-fg-2 flex items-center gap-1"><Building2 className="w-3 h-3 text-fg-3 shrink-0" />{lead.companies.name}{lead.companies.country && ` · ${lead.companies.country}`}{lead.companies.target_tier === 'TIER_1' && <span className="ml-1 px-1 bg-accent-muted text-accent text-xs rounded">T1</span>}</span>}
            {lead.segment && <span className="px-1.5 py-0.5 bg-accent-muted text-accent text-xs rounded">{lead.segment}</span>}
          </div>
          <div className="flex items-center gap-3 mb-2">
            {lead.linkedin_url && <a href={lead.linkedin_url} target="_blank" rel="noopener" className="text-xs text-accent hover:underline flex items-center gap-1"><Link2 className="w-3 h-3" />linkedin<ExternalLink className="w-2.5 h-2.5" /></a>}
            {lead.email && <span className="text-xs text-fg-3">📧 {lead.email}</span>}
            {lead.source_type && <span className="text-xs text-fg-3">{SOURCE_ICONS[lead.source_type] ?? '📥'} {lead.source_type.replace(/_/g, ' ')}</span>}
          </div>
        </div>
        <div className="space-y-0.5">
          {(lead.signal_strength || lead.signal_explanation) && (
            <p className="text-xs text-fg-3">{lead.signal_strength && <span className={cn('font-semibold', SIGNAL_DOT[lead.signal_strength])}>{lead.signal_strength} signal</span>}{lead.signal_explanation && ` — ${lead.signal_explanation}`}</p>
          )}
          {!lead.signal_explanation && lead.source_signal && <p className="text-xs text-fg-3 italic">"{lead.source_signal}"</p>}
          {lead.score_reasoning && <p className="text-xs text-fg-2 italic line-clamp-2">🤖 "{lead.score_reasoning}"</p>}
        </div>
      </div>

      {/* Col 3: Scores + Actions */}
      <div className="w-72 shrink-0 border-l border-border-soft px-4 py-3 flex flex-col justify-between">
        <div>
          {isScored ? (
            <div className="space-y-1.5 mb-3">
              {[{ label: 'Fit', v: lead.fit_score }, { label: 'Intent', v: lead.intent_score }, { label: 'Reach', v: lead.reachability_score }].map(({ label, v }) => {
                if (v == null) return null
                const c = v >= 80 ? 'bg-score-high' : v >= 60 ? 'bg-warm' : v >= 40 ? 'bg-cold' : 'bg-score-low'
                return <div key={label} className="flex items-center gap-2"><span className="text-xs text-fg-3 w-9 shrink-0">{label}</span><div className="flex-1 bg-border rounded-full h-1.5"><div className={cn('h-1.5 rounded-full', c)} style={{ width: `${v}%` }} /></div><span className="text-xs font-semibold text-fg w-5 text-right">{v}</span></div>
              })}
            </div>
          ) : <div className="h-14 flex items-center"><span className="text-xs text-fg-3">Awaiting score</span></div>}
          <div className="flex flex-wrap gap-1 mb-3">
            {lead.recommended_product && <span className="px-1.5 py-0.5 bg-accent-muted text-accent text-xs rounded">{lead.recommended_product}</span>}
            {lead.recommended_campaign && <span className="px-1.5 py-0.5 bg-card border border-border text-fg-3 text-xs rounded">{lead.recommended_campaign}</span>}
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex gap-1">
            <button onClick={() => router.push(`/leads/${lead.id}`)} className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-card border border-border text-xs text-fg-2 rounded hover:text-fg transition-colors">
              <ExternalLink className="w-3 h-3" /> Detail
            </button>
            <button onClick={() => showEdit(lead)} className="flex-1 px-2 py-1 bg-card border border-border text-xs text-fg-2 rounded hover:text-fg transition-colors">✏️ Edit</button>
            <button onClick={handleRescore} disabled={rescoring} className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-card border border-border text-xs text-fg-2 rounded hover:text-fg disabled:opacity-50 transition-colors">
              {rescoring ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            </button>
          </div>
          <div className="flex gap-1">
            <button onClick={handleApprove} disabled={approving} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim disabled:opacity-60 transition-colors">
              {approving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {approving ? '...' : 'Approve'}
            </button>
            <button onClick={() => showReject(lead)} className="px-3 py-1.5 text-xs text-score-low border border-score-low/20 rounded hover:bg-score-low/10 transition-colors">
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Reply Card ─────────────────────────────────────────────────────────────

function ReplyCard({ lead, onRefresh, showQualify, showReject }: {
  lead: Lead; onRefresh: () => void
  showQualify: (l: Lead) => void; showReject: (l: Lead) => void
}) {
  const router = useRouter()
  const sentiment = lead.reply_sentiment ? SENTIMENT_META[lead.reply_sentiment] : null
  const fullName  = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || '(No name)'

  async function handlePause() {
    await createClient().from('leads').update({ sequence_status: 'PAUSED' }).eq('id', lead.id)
    onRefresh()
  }

  return (
    <div className={cn('flex bg-surface border border-l-4 rounded-xl overflow-hidden transition-colors',
      sentiment?.label === 'INTERESTED' ? 'border-l-score-high border-score-high/20' :
      sentiment?.label === 'NOT NOW'    ? 'border-l-warm border-warm/20' :
      sentiment?.label === 'NOT FIT'   ? 'border-l-score-low border-score-low/20' : 'border-l-border border-border')}>

      {/* Col 1: Sentiment */}
      <div className="w-28 shrink-0 flex flex-col items-center justify-center gap-1 py-4 border-r border-border-soft">
        {sentiment ? (
          <>
            <span className="text-2xl">{sentiment.dot}</span>
            <span className={cn('px-2 py-0.5 rounded text-xs font-bold text-center', sentiment.color)}>{sentiment.label}</span>
            {lead.last_reply_at && <span className="text-xs text-fg-3 text-center mt-1">{timeAgo(lead.last_reply_at)}</span>}
          </>
        ) : <span className="text-xs text-fg-3">No reply yet</span>}
      </div>

      {/* Col 2: Identity */}
      <div className="flex-1 min-w-0 px-4 py-3 flex flex-col justify-between">
        <div>
          <p className="text-sm font-semibold text-fg">{fullName}{lead.title && <span className="text-fg-2 font-normal text-xs"> · {lead.title}</span>}</p>
          {lead.companies && <p className="text-xs text-fg-2 flex items-center gap-1 mt-0.5"><Building2 className="w-3 h-3 text-fg-3" />{lead.companies.name}{lead.companies.country && ` · ${lead.companies.country}`}{lead.companies.target_tier === 'TIER_1' && <span className="ml-1 px-1 bg-accent-muted text-accent text-xs rounded">T1</span>}</p>}
          {lead.segment && <span className="mt-1 inline-block px-1.5 py-0.5 bg-accent-muted text-accent text-xs rounded">{lead.segment}</span>}
          {lead.score_reasoning && <p className="text-xs text-fg-2 italic mt-2 line-clamp-2">🤖 "{lead.score_reasoning}"</p>}
        </div>
        <div className="flex items-center gap-3 mt-2">
          {lead.reply_count != null && <span className="text-xs text-fg-3">💬 {lead.reply_count} {lead.reply_count === 1 ? 'reply' : 'replies'}</span>}
          {lead.icp_score != null && <span className="text-xs text-fg-3">Score: {lead.icp_score}/100</span>}
        </div>
      </div>

      {/* Col 3: Actions */}
      <div className="w-52 shrink-0 border-l border-border-soft px-4 py-3 flex flex-col justify-between">
        <div />
        <div className="space-y-1.5">
          {(lead.reply_sentiment === 'INTERESTED' || lead.reply_sentiment === 'NOT_NOW') && (
            <button onClick={() => showQualify(lead)}
              className="w-full flex items-center justify-center gap-1 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim transition-colors">
              🎯 Qualify & Push to HubSpot
            </button>
          )}
          <div className="flex gap-1">
            <button onClick={() => router.push(`/leads/${lead.id}`)} className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-card border border-border text-xs text-fg-2 rounded hover:text-fg transition-colors">
              <MessageSquare className="w-3 h-3" /> Thread
            </button>
            <button onClick={handlePause} className="flex-1 px-2 py-1 bg-card border border-border text-xs text-fg-2 rounded hover:text-fg transition-colors">⏸ Pause</button>
            <button onClick={() => showReject(lead)} className="flex-1 px-2 py-1 text-xs text-score-low border border-score-low/20 rounded hover:bg-score-low/10">❌ DQ</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Research Card ──────────────────────────────────────────────────────────

function ResearchCard({ lead, onRefresh, onAddContact }: { lead: Lead; onRefresh: () => void; onAddContact: (l: Lead) => void }) {
  const [retrying, setRetrying] = useState(false)

  async function handleRetry() {
    setRetrying(true)
    await fetch(`/api/leads/${lead.id}/process`, { method: 'POST' })
    setRetrying(false)
    onRefresh()
  }

  async function handleBacklog() {
    await createClient().from('leads').update({ status: 'BACKLOG' }).eq('id', lead.id)
    onRefresh()
  }

  async function handleWontPursue() {
    await createClient().from('leads').update({ status: 'REJECTED' }).eq('id', lead.id)
    onRefresh()
  }

  return (
    <div className="flex bg-surface border border-l-4 border-l-warm border-warm/20 rounded-xl overflow-hidden">
      <div className="w-28 shrink-0 flex flex-col items-center justify-center gap-1 py-4 border-r border-border-soft">
        <span className="text-xl">🔍</span>
        <span className="text-xs text-warm font-semibold text-center">NEEDS CONTACT</span>
      </div>
      <div className="flex-1 min-w-0 px-4 py-3">
        <p className="text-sm font-semibold text-fg">{lead.companies?.name ?? 'Unknown company'}</p>
        {lead.companies?.website && <p className="text-xs text-fg-3">{lead.companies.website}</p>}
        {lead.companies?.country && <p className="text-xs text-fg-3">{lead.companies.country}</p>}
        {lead.source_signal && <p className="text-xs text-fg-3 italic mt-1">Signal: "{lead.source_signal}"</p>}
        {lead.enrichment_error && (
          <div className="flex items-center gap-1 text-xs text-warm mt-1.5">
            <AlertCircle className="w-3 h-3 shrink-0" />{lead.enrichment_error}
          </div>
        )}
      </div>
      <div className="w-52 shrink-0 border-l border-border-soft px-4 py-3 flex flex-col justify-between">
        <div />
        <div className="space-y-1.5">
          <button onClick={() => onAddContact(lead)} className="w-full flex items-center justify-center gap-1 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Contact
          </button>
          <div className="flex gap-1">
            <button onClick={handleRetry} disabled={retrying} className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-card border border-border text-xs text-fg-2 rounded hover:text-fg disabled:opacity-50">
              {retrying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Retry
            </button>
            <button onClick={handleBacklog} className="flex-1 px-2 py-1 bg-card border border-border text-xs text-fg-2 rounded hover:text-fg">📦 Backlog</button>
            <button onClick={handleWontPursue} className="flex-1 px-2 py-1 text-xs text-fg-3 border border-border rounded hover:text-score-low">✗ Skip</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Queue Page ─────────────────────────────────────────────────────────

export default function QueuePage() {
  const router = useRouter()
  const { toast, show: showToast } = useToast()
  const [tab, setTab]                   = useState<TabKey>('pending')
  const [leads, setLeads]               = useState<Lead[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [filterPriority, setFilterPriority] = useState('ALL')
  const [filterSource, setFilterSource]     = useState('ALL')
  const [selected, setSelected]         = useState<Set<string>>(new Set())
  const [showAddMenu, setShowAddMenu]   = useState(false)
  const [showManual, setShowManual]     = useState(false)
  const [rejectLead, setRejectLead]     = useState<Lead | null>(null)
  const [editLead, setEditLead]         = useState<Lead | null>(null)
  const [qualifyLead, setQualifyLead]   = useState<Lead | null>(null)
  const [testReplyLead, setTestReplyLead] = useState<Lead | null>(null)
  const [showLeadPicker, setShowLeadPicker] = useState(false)
  const [allLeads, setAllLeads] = useState<Lead[]>([])
  const [prefillCompany, setPrefillCompany] = useState<{ id: string; name: string } | undefined>()

  // Fetch all pending/approved leads for the lead picker
  useEffect(() => {
    if (!showLeadPicker) return
    createClient().from('leads')
      .select('id, first_name, last_name, companies(name)')
      .in('status', ['PENDING', 'APPROVED', 'RESPONDED'])
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setAllLeads((data ?? []) as Lead[]))
  }, [showLeadPicker])

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    let query = supabase
      .from('leads')
      .select('*, companies(id, name, website, country, segment, target_tier)')
      .order('icp_score', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(300)

    if (tab === 'pending')        query = query.in('status', ['PENDING'])
    else if (tab === 'replies')   query = query.gt('reply_count', 0).not('reply_sentiment', 'is', null)
    else if (tab === 'needs_research') query = query.eq('status', 'NEEDS_RESEARCH')
    else if (tab === 'approved')  {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      query = query.eq('status', 'APPROVED').gte('updated_at', today.toISOString())
    }

    const { data } = await query
    setLeads(data ?? [])
    setLoading(false)
  }, [tab])

  useEffect(() => { load(); setSelected(new Set()) }, [load])

  const filtered = leads.filter(l => {
    const name = `${l.first_name ?? ''} ${l.last_name ?? ''}`.toLowerCase()
    const co = (l.companies?.name ?? '').toLowerCase()
    const matchSearch   = !search || name.includes(search.toLowerCase()) || co.includes(search.toLowerCase())
    const matchPriority = filterPriority === 'ALL' || l.priority === filterPriority
    const matchSource   = filterSource === 'ALL' || l.source_type === filterSource
    return matchSearch && matchPriority && matchSource
  })

  // Tab counts (approximate from loaded leads)
  const pendingCount  = tab === 'pending'        ? filtered.length : leads.length
  const repliesCount  = tab === 'replies'        ? filtered.length : 0
  const researchCount = tab === 'needs_research' ? filtered.length : 0

  async function handleBulkApprove() {
    await Promise.all([...selected].map(id => fetch(`/api/leads/${id}/approve`, { method: 'POST' })))
    setSelected(new Set())
    showToast(`${selected.size} leads approved`)
    load()
  }

  async function handleBulkReject(reasonTag: string, notes: string) {
    await Promise.all([...selected].map(id =>
      fetch(`/api/leads/${id}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason_tag: reasonTag, notes }) })
    ))
    setSelected(new Set())
    setRejectLead(null)
    showToast(`${selected.size} leads rejected`)
    load()
  }

  async function handleSingleReject(reasonTag: string, notes: string) {
    if (!rejectLead) return
    await fetch(`/api/leads/${rejectLead.id}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason_tag: reasonTag, notes }) })
    setRejectLead(null)
    showToast('Lead rejected')
    load()
  }

  async function handleEdit(data: Record<string, unknown>) {
    if (!editLead) return
    await fetch(`/api/leads/${editLead.id}/edit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    setEditLead(null)
    showToast('Lead updated')
    load()
  }

  async function handleEditAndApprove(data: Record<string, unknown>) {
    if (!editLead) return
    await fetch(`/api/leads/${editLead.id}/edit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    await fetch(`/api/leads/${editLead.id}/approve`, { method: 'POST' })
    setEditLead(null)
    showToast('Lead updated and approved')
    load()
  }

  const TABS = [
    { key: 'pending' as TabKey,        label: '📥 Pending Review',  count: pendingCount },
    { key: 'replies' as TabKey,        label: '💬 Replies',         count: repliesCount, pulse: repliesCount > 0 },
    { key: 'needs_research' as TabKey, label: '🔍 Needs Research',  count: researchCount },
    { key: 'approved' as TabKey,       label: '✅ Approved Today',  count: null },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Toast */}
      {toast && (
        <div className={cn('fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg text-xs font-semibold shadow-xl transition-all',
          toast.type === 'ok' ? 'bg-score-high text-white' : 'bg-score-low text-white')}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-soft">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-accent" />
          <h1 className="text-sm font-semibold text-fg">Review Queue</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-3" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..."
              className="bg-surface border border-border text-xs text-fg placeholder:text-fg-3 rounded-md pl-8 pr-3 py-1.5 w-44 focus:outline-none focus:border-accent" />
          </div>
          {(tab === 'replies' || tab === 'pending') && (
            <button onClick={() => setShowLeadPicker(true)}
              className="px-3 py-1.5 bg-surface border border-border text-xs text-fg-2 rounded-md hover:text-fg transition-colors">
              💬 Add Test Reply
            </button>
          )}
          <div className="relative">
            <button onClick={() => setShowAddMenu(m => !m)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded-md hover:bg-accent-dim">
              <Plus className="w-3.5 h-3.5" /> Add Leads <ChevronDown className="w-3 h-3" />
            </button>
            {showAddMenu && (
              <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-20 py-1 w-44">
                <button onClick={() => { setShowAddMenu(false); router.push('/leads/import') }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-fg hover:bg-surface"><Upload className="w-3.5 h-3.5 text-fg-3" /> CSV Import</button>
                <button onClick={() => { setShowAddMenu(false); setShowManual(true) }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-fg hover:bg-surface"><Plus className="w-3.5 h-3.5 text-fg-3" /> Manual Entry</button>
                <button onClick={() => { setShowAddMenu(false); router.push('/settings/webhooks') }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-fg hover:bg-surface"><Webhook className="w-3.5 h-3.5 text-fg-3" /> Webhook URL</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs + filters */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-border-soft bg-card flex-wrap">
        {TABS.map(({ key, label, count, pulse }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn('relative flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors',
              tab === key ? 'bg-accent-muted text-accent' : 'text-fg-3 hover:text-fg hover:bg-surface')}>
            {label}
            {count !== null && count > 0 && (
              <span className={cn('px-1.5 rounded text-xs', tab === key ? 'bg-accent/20 text-accent' : 'bg-border text-fg-3')}>{count}</span>
            )}
            {pulse && count !== null && count > 0 && tab !== key && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-score-high rounded-full animate-pulse" />
            )}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          {tab === 'pending' && (
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
              className="bg-surface border border-border text-xs text-fg rounded px-2 py-1 focus:outline-none focus:border-accent">
              <option value="ALL">All priority</option>
              <option value="HOT">🔴 HOT</option><option value="WARM">🟡 WARM</option>
              <option value="COLD">🔵 COLD</option><option value="DISQUALIFIED">⚫ Disqualified</option>
            </select>
          )}
          <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
            className="bg-surface border border-border text-xs text-fg rounded px-2 py-1 focus:outline-none focus:border-accent">
            <option value="ALL">All sources</option>
            <option value="MANUAL_ENTRY">Manual</option><option value="CSV_IMPORT">CSV</option>
            <option value="LEMLIST_WATCHER">Lemlist</option><option value="GOOGLE_ALERTS">Google Alerts</option>
          </select>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && tab === 'pending' && (
        <div className="flex items-center gap-3 px-6 py-2 bg-accent-muted border-b border-accent/20">
          <span className="text-xs font-medium text-accent">{selected.size} selected</span>
          <button onClick={handleBulkApprove} className="flex items-center gap-1 px-3 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim">
            <Check className="w-3 h-3" /> Approve All
          </button>
          <button onClick={() => setRejectLead({ id: 'bulk', first_name: `${selected.size} leads`, last_name: '', companies: undefined } as any)}
            className="px-3 py-1 bg-card border border-score-low/20 text-xs text-score-low rounded hover:bg-score-low/10">
            Reject All
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-fg-3 hover:text-fg">Clear</button>
        </div>
      )}

      {/* Cards */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-xs text-fg-3"><Loader2 className="w-4 h-4 animate-spin mr-2" />Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Target className="w-10 h-10 text-fg-3 mb-3" />
            <p className="text-sm font-semibold text-fg mb-1">
              {tab === 'pending' ? 'No leads pending review' :
               tab === 'replies' ? 'No replies yet' :
               tab === 'needs_research' ? 'No leads need research' : 'No leads approved today'}
            </p>
            {tab === 'replies' && (
              <p className="text-xs text-fg-3 mb-3">Use "Add Test Reply" to simulate a reply and test the sentiment pipeline.</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {tab === 'pending' && filtered.map(l => (
              <PendingCard key={l.id} lead={l}
                selected={selected.has(l.id)}
                onToggle={() => setSelected(s => { const n = new Set(s); n.has(l.id) ? n.delete(l.id) : n.add(l.id); return n })}
                onRefresh={load}
                showReject={setRejectLead}
                showEdit={setEditLead}
              />
            ))}
            {tab === 'replies' && filtered.map(l => (
              <ReplyCard key={l.id} lead={l} onRefresh={load}
                showQualify={setQualifyLead}
                showReject={setRejectLead}
              />
            ))}
            {tab === 'needs_research' && filtered.map(l => (
              <ResearchCard key={l.id} lead={l} onRefresh={load} onAddContact={l => {
                if (l.companies) setPrefillCompany({ id: l.companies.id, name: l.companies.name })
                setShowManual(true)
              }} />
            ))}
            {tab === 'approved' && filtered.map(l => (
              <div key={l.id} className="flex items-center gap-4 px-5 py-3 bg-surface border border-border rounded-xl">
                <span className="text-xs text-score-high font-semibold">✅ APPROVED</span>
                <span className="text-sm font-semibold text-fg">{[l.first_name, l.last_name].filter(Boolean).join(' ')}</span>
                <span className="text-xs text-fg-2">{l.companies?.name}</span>
                <span className="text-xs text-fg-3 ml-auto">{timeAgo(l.created_at)}</span>
                <button onClick={() => router.push(`/leads/${l.id}`)} className="text-xs text-accent hover:underline">View →</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showManual && (
        <ManualLeadModal open={showManual} onClose={() => { setShowManual(false); setPrefillCompany(undefined) }}
          onCreated={() => { setShowManual(false); setPrefillCompany(undefined); load() }}
          prefillCompany={prefillCompany}
        />
      )}

      {rejectLead && (
        <RejectModal
          leadName={rejectLead.id === 'bulk' ? rejectLead.first_name ?? '' : `${rejectLead.first_name ?? ''} ${rejectLead.last_name ?? ''}`.trim()}
          onConfirm={rejectLead.id === 'bulk' ? handleBulkReject : handleSingleReject}
          onClose={() => setRejectLead(null)}
        />
      )}

      {editLead && (
        <EditLeadPanel
          lead={editLead}
          onSave={async (d) => { await handleEdit(d as Record<string, unknown>) }}
          onSaveAndApprove={async (d) => { await handleEditAndApprove(d as Record<string, unknown>) }}
          onClose={() => setEditLead(null)}
        />
      )}

      {qualifyLead && (
        <QualificationCard
          leadId={qualifyLead.id}
          leadName={[qualifyLead.first_name, qualifyLead.last_name].filter(Boolean).join(' ')}
          companyName={qualifyLead.companies?.name ?? ''}
          onSaved={() => { setQualifyLead(null); showToast('Qualified — will push to HubSpot when API is connected'); load() }}
          onClose={() => setQualifyLead(null)}
        />
      )}

      {testReplyLead && (
        <AddTestReplyModal
          leadId={testReplyLead.id}
          leadName={[testReplyLead.first_name, testReplyLead.last_name].filter(Boolean).join(' ')}
          onAdded={(sentiment) => { setTestReplyLead(null); showToast(`Reply added · Classified: ${sentiment}`); load() }}
          onClose={() => setTestReplyLead(null)}
        />
      )}

      {/* Lead picker for test reply */}
      {showLeadPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowLeadPicker(false)} />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-soft">
              <h2 className="text-sm font-semibold text-fg">💬 Pick a lead to reply to</h2>
              <button onClick={() => setShowLeadPicker(false)} className="text-fg-3 hover:text-fg text-lg leading-none">×</button>
            </div>
            <div className="max-h-72 overflow-y-auto py-1">
              {allLeads.length === 0 ? (
                <p className="text-xs text-fg-3 text-center py-6">No leads found. Add leads via CSV or Manual Entry first.</p>
              ) : allLeads.map(l => (
                <button key={l.id} onClick={() => { setShowLeadPicker(false); setTestReplyLead(l) }}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-surface transition-colors text-left">
                  <div>
                    <p className="text-xs font-semibold text-fg">{[l.first_name, l.last_name].filter(Boolean).join(' ')}</p>
                    <p className="text-xs text-fg-3">{(l.companies as any)?.name ?? '—'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
