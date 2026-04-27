'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, RefreshCw, Check, Loader2, Building2, Link2, ExternalLink, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ConversationThread from '@/components/conversation-thread'
import RejectModal from '@/components/reject-modal'
import { cn } from '@/lib/utils'

type Lead = {
  id: string; created_at: string; updated_at: string; status: string
  first_name?: string; last_name?: string; title?: string; seniority?: string
  linkedin_url?: string; email?: string; phone?: string
  source_type?: string; source_detail?: string; source_signal?: string; source_warmth?: string; source_imported_at?: string
  icp_score?: number; fit_score?: number; intent_score?: number; reachability_score?: number
  priority?: string; score_reasoning?: string; signal_strength?: string; signal_explanation?: string
  signal_freshness_score?: number; scoring_completed_at?: string; scoring_model_version?: string
  segment?: string; segment_confidence?: string; recommended_campaign?: string; recommended_product?: string
  disqualified?: boolean; disqualification_reason?: string
  enrichment_status?: string; enrichment_source?: string; enrichment_error?: string
  reply_sentiment?: string; reply_count?: number; last_reply_at?: string; qualification_status?: string
  internal_notes?: string
  companies?: Record<string, unknown>
}

const PRIORITY_COLORS: Record<string, string> = {
  HOT:          'bg-score-low/10 text-score-low border border-score-low/20',
  WARM:         'bg-warm/10 text-warm border border-warm/20',
  COLD:         'bg-cold/10 text-cold border border-cold/20',
  DISQUALIFIED: 'bg-border text-fg-3',
}
const STATUS_COLORS: Record<string, string> = {
  PENDING:      'bg-border text-fg-2',
  APPROVED:     'bg-score-high/10 text-score-high',
  REJECTED:     'bg-score-low/10 text-score-low',
  QUALIFIED:    'bg-accent/10 text-accent',
  RESPONDED:    'bg-warm/10 text-warm',
  NEEDS_RESEARCH: 'bg-warm/10 text-warm',
}

function ScoreBar({ value, label }: { value?: number; label: string }) {
  if (value == null) return null
  const color = value >= 80 ? 'bg-score-high' : value >= 60 ? 'bg-warm' : value >= 40 ? 'bg-cold' : 'bg-score-low'
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-fg-3 w-20 shrink-0">{label}</span>
      <div className="flex-1 bg-border rounded-full h-2">
        <div className={cn('h-2 rounded-full', color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-sm font-bold text-fg w-8 text-right">{value}</span>
    </div>
  )
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [lead, setLead]         = useState<Lead | null>(null)
  const [loading, setLoading]   = useState(true)
  const [notes, setNotes]       = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [rescoring, setRescoring]   = useState(false)
  const [approving, setApproving]   = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [toast, setToast]       = useState('')

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    const supabase = createClient()
    supabase.from('leads').select('*, companies(*)').eq('id', id).single()
      .then(({ data }) => {
        if (data) { setLead(data); setNotes(data.internal_notes ?? '') }
        setLoading(false)
      })
  }, [id])

  async function handleSaveNotes() {
    setSavingNotes(true)
    await createClient().from('leads').update({ internal_notes: notes }).eq('id', id)
    setSavingNotes(false)
    showToast('Notes saved')
  }

  async function handleApprove() {
    setApproving(true)
    await fetch(`/api/leads/${id}/approve`, { method: 'POST' })
    setApproving(false)
    showToast('Approved — will push to Lemlist when API is connected')
    const { data } = await createClient().from('leads').select('*, companies(*)').eq('id', id).single()
    if (data) setLead(data)
  }

  async function handleRescore() {
    setRescoring(true)
    const res = await fetch(`/api/leads/${id}/score`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ run_type: 'RE_SCORE' }) })
    const data = await res.json()
    setRescoring(false)
    if (data.success) {
      showToast(`Re-scored → ${data.priority} · ${data.icp_score}/100`)
      const { data: updated } = await createClient().from('leads').select('*, companies(*)').eq('id', id).single()
      if (updated) setLead(updated)
    } else alert(`Re-score failed: ${data.error}`)
  }

  async function handleReject(reasonTag: string, rejectNotes: string) {
    await fetch(`/api/leads/${id}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason_tag: reasonTag, notes: rejectNotes }) })
    setShowReject(false)
    showToast('Lead rejected')
    router.push('/queue')
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-xs text-fg-3"><Loader2 className="w-4 h-4 animate-spin mr-2" />Loading...</div>
  if (!lead) return <div className="flex items-center justify-center h-64 text-xs text-fg-3">Lead not found.</div>

  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || '(No name)'
  const company  = lead.companies as Record<string, string | undefined> | null

  return (
    <div className="flex flex-col h-full">
      {/* Toast */}
      {toast && <div className="fixed top-4 right-4 z-50 px-4 py-2.5 bg-score-high text-white text-xs font-semibold rounded-lg shadow-xl">{toast}</div>}

      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border-soft">
        <button onClick={() => router.push('/queue')} className="text-fg-3 hover:text-fg transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-sm font-semibold text-fg">{fullName}</h1>
            {lead.title && <span className="text-xs text-fg-2">{lead.title}</span>}
            {lead.priority && <span className={cn('px-2 py-0.5 rounded text-xs font-bold', PRIORITY_COLORS[lead.priority] ?? 'bg-border text-fg-3')}>{lead.priority} · {lead.icp_score ?? '?'}/100</span>}
            {lead.status && <span className={cn('px-2 py-0.5 rounded text-xs font-medium', STATUS_COLORS[lead.status] ?? 'bg-border text-fg-2')}>{lead.status}</span>}
          </div>
          {company && (
            <p className="text-xs text-fg-2 mt-0.5 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-fg-3 shrink-0" />
              {company.name}{company.country && ` · ${company.country}`}
              {company.id && <button onClick={() => router.push(`/accounts/${company.id}`)} className="text-accent hover:underline ml-1">View Account →</button>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handleRescore} disabled={rescoring} className="flex items-center gap-1 px-3 py-1.5 bg-surface border border-border text-xs text-fg-2 rounded-md hover:text-fg disabled:opacity-50 transition-colors">
            {rescoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {rescoring ? 'Scoring...' : 'Re-score'}
          </button>
          <button onClick={() => setShowReject(true)} className="px-3 py-1.5 text-xs text-score-low border border-score-low/20 rounded-md hover:bg-score-low/10 transition-colors">Reject</button>
          <button onClick={handleApprove} disabled={approving || lead.status === 'APPROVED'} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-sidebar text-xs font-bold rounded-md hover:bg-accent-dim disabled:opacity-60 transition-colors">
            {approving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {lead.status === 'APPROVED' ? 'Approved ✓' : approving ? 'Approving...' : 'Approve'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        <div className="flex h-full">
          {/* Left column */}
          <div className="flex-[3] p-6 border-r border-border-soft space-y-6 overflow-auto">

            {/* Scoring breakdown */}
            <section>
              <h2 className="text-xs font-semibold text-fg-2 uppercase tracking-wide mb-3">Scoring Breakdown</h2>
              <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
                <ScoreBar value={lead.icp_score}        label="ICP Score" />
                <ScoreBar value={lead.fit_score}        label="Fit" />
                <ScoreBar value={lead.intent_score}     label="Intent" />
                <ScoreBar value={lead.reachability_score} label="Reach" />
                {lead.score_reasoning && (
                  <div className="border-t border-border-soft pt-3 mt-3">
                    <p className="text-xs text-fg-2 italic">🤖 "{lead.score_reasoning}"</p>
                  </div>
                )}
                {lead.scoring_completed_at && (
                  <p className="text-xs text-fg-3">Scored {new Date(lead.scoring_completed_at).toLocaleString()} · Model {lead.scoring_model_version}</p>
                )}
              </div>
            </section>

            {/* Signal context */}
            <section>
              <h2 className="text-xs font-semibold text-fg-2 uppercase tracking-wide mb-3">Signal Context</h2>
              <div className="bg-surface border border-border rounded-lg p-4 space-y-2">
                {lead.source_type && <p className="text-xs text-fg-2"><span className="text-fg-3">Source:</span> {lead.source_type.replace(/_/g, ' ')}{lead.source_detail && ` — ${lead.source_detail}`}</p>}
                {lead.source_warmth && <p className="text-xs text-fg-2"><span className="text-fg-3">Warmth:</span> {lead.source_warmth}</p>}
                {lead.source_signal && <p className="text-xs text-fg-2"><span className="text-fg-3">Signal:</span> {lead.source_signal}</p>}
                {lead.signal_strength && <p className="text-xs text-fg-2"><span className="text-fg-3">Signal strength:</span> {lead.signal_strength}{lead.signal_explanation && ` — ${lead.signal_explanation}`}</p>}
                {lead.signal_freshness_score != null && <p className="text-xs text-fg-3">Freshness: {(lead.signal_freshness_score * 100).toFixed(0)}%</p>}
                {lead.source_imported_at && <p className="text-xs text-fg-3">Imported {new Date(lead.source_imported_at).toLocaleString()}</p>}
              </div>
            </section>

            {/* Conversation thread */}
            <section>
              <h2 className="text-xs font-semibold text-fg-2 uppercase tracking-wide mb-3">Conversation Thread {lead.reply_count != null && lead.reply_count > 0 && `(${lead.reply_count} replies)`}</h2>
              <div className="bg-surface border border-border rounded-lg p-4">
                <ConversationThread leadId={id} />
              </div>
            </section>

            {/* Internal notes */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-fg-2 uppercase tracking-wide">Internal Notes</h2>
                <button onClick={handleSaveNotes} disabled={savingNotes}
                  className="flex items-center gap-1 px-2.5 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim disabled:opacity-60">
                  {savingNotes ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  {savingNotes ? 'Saving...' : 'Save'}
                </button>
              </div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={5}
                placeholder="Private notes — visible only in Scoutly..."
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-fg placeholder:text-fg-3 focus:outline-none focus:border-accent resize-none" />
            </section>

            {/* Audit log */}
            <section>
              <h2 className="text-xs font-semibold text-fg-2 uppercase tracking-wide mb-3">Audit Log</h2>
              <div className="bg-surface border border-border rounded-lg p-4 space-y-1.5">
                <p className="text-xs text-fg-3">Created {new Date(lead.created_at).toLocaleString()}</p>
                {lead.source_imported_at && <p className="text-xs text-fg-3">Imported {new Date(lead.source_imported_at).toLocaleString()}</p>}
                {lead.scoring_completed_at && <p className="text-xs text-fg-3">Scored {new Date(lead.scoring_completed_at).toLocaleString()}</p>}
                {lead.last_reply_at && <p className="text-xs text-fg-3">Last reply {new Date(lead.last_reply_at).toLocaleString()} · {lead.reply_sentiment}</p>}
                <p className="text-xs text-fg-3">Last updated {new Date(lead.updated_at).toLocaleString()}</p>
              </div>
            </section>
          </div>

          {/* Right column */}
          <div className="flex-[2] p-6 space-y-4 overflow-auto">
            {/* Enrichment data */}
            <div className="bg-surface border border-border rounded-lg p-4">
              <h2 className="text-xs font-semibold text-fg-2 mb-3">Contact Data</h2>
              <div className="space-y-2">
                {lead.linkedin_url && <a href={lead.linkedin_url} target="_blank" rel="noopener" className="flex items-center gap-1.5 text-xs text-accent hover:underline"><Link2 className="w-3.5 h-3.5" />{lead.linkedin_url.replace('https://www.linkedin.com/in/', 'linkedin.com/in/')}<ExternalLink className="w-3 h-3" /></a>}
                {lead.email && <p className="text-xs text-fg-2">📧 {lead.email}</p>}
                {lead.phone && <p className="text-xs text-fg-2">📞 {lead.phone}</p>}
                {lead.enrichment_source && <p className="text-xs text-fg-3">Enriched via {lead.enrichment_source}</p>}
                {lead.enrichment_error && <p className="text-xs text-score-low">⚠️ {lead.enrichment_error}</p>}
              </div>
            </div>

            {/* Recommendations */}
            {(lead.recommended_product || lead.recommended_campaign) && (
              <div className="bg-surface border border-border rounded-lg p-4">
                <h2 className="text-xs font-semibold text-fg-2 mb-3">Recommendations</h2>
                {lead.segment && <p className="text-xs text-fg-2 mb-1"><span className="text-fg-3">Segment:</span> {lead.segment} <span className="text-fg-3">({lead.segment_confidence})</span></p>}
                {lead.recommended_product && <p className="text-xs text-fg-2 mb-1"><span className="text-fg-3">Product:</span> {lead.recommended_product}</p>}
                {lead.recommended_campaign && <p className="text-xs text-fg-2"><span className="text-fg-3">Campaign:</span> {lead.recommended_campaign}</p>}
              </div>
            )}

            {/* Qualification status */}
            {lead.qualification_status && (
              <div className="bg-surface border border-border rounded-lg p-4">
                <h2 className="text-xs font-semibold text-fg-2 mb-2">Qualification</h2>
                <span className={cn('px-2 py-0.5 rounded text-xs font-semibold',
                  lead.qualification_status === 'QUALIFIED' ? 'bg-score-high/10 text-score-high' :
                  lead.qualification_status === 'NOT_QUALIFIED' ? 'bg-score-low/10 text-score-low' : 'bg-warm/10 text-warm')}>
                  {lead.qualification_status}
                </span>
              </div>
            )}

            {/* Disqualification */}
            {lead.disqualified && lead.disqualification_reason && (
              <div className="bg-score-low/5 border border-score-low/20 rounded-lg p-4">
                <h2 className="text-xs font-semibold text-score-low mb-1">Disqualified</h2>
                <p className="text-xs text-fg-2">{lead.disqualification_reason}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showReject && (
        <RejectModal
          leadName={fullName}
          onConfirm={handleReject}
          onClose={() => setShowReject(false)}
        />
      )}
    </div>
  )
}
