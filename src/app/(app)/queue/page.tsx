'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Target, Search, Upload, Plus, Link2, ChevronDown,
  Webhook, Building2, ExternalLink, Clock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ManualLeadModal from '@/components/manual-lead-modal'
import { cn } from '@/lib/utils'

type SubTab = 'pending' | 'needs_research'

type Lead = {
  id: string; created_at: string
  first_name?: string; last_name?: string; title?: string
  linkedin_url?: string; email?: string
  source_type?: string; source_detail?: string; source_signal?: string
  source_warmth?: string; status: string
  companies?: { id: string; name: string; website?: string; country?: string; segment?: string }
}

const WARMTH_BADGE: Record<string, string> = {
  WARM: 'bg-warm/10 text-warm border border-warm/20',
  COLD: 'bg-cold/10 text-cold border border-cold/20',
  UNKNOWN: 'bg-border text-fg-3',
}

const SOURCE_ICONS: Record<string, string> = {
  CSV_IMPORT: '📥', MANUAL_ENTRY: '✋', LEMLIST_WATCHER: '🔗',
  COWORK_EXPORT: '📥', SCOUTLY_AGENT: '✨',
  GOOGLE_ALERTS: '📡', LINKEDIN_JOBS: '💼',
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function QueuePage() {
  const router = useRouter()
  const [subTab, setSubTab] = useState<SubTab>('pending')
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSource, setFilterSource] = useState('ALL')
  const [filterWarmth, setFilterWarmth] = useState('ALL')
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showManual, setShowManual] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const statuses = subTab === 'pending' ? ['PENDING'] : ['NEEDS_RESEARCH']
    const { data } = await supabase
      .from('leads')
      .select('*, companies(id, name, website, country, segment)')
      .in('status', statuses)
      .order('created_at', { ascending: false })
      .limit(200)
    setLeads(data ?? [])
    setLoading(false)
  }, [subTab])

  useEffect(() => { load() }, [load])

  const filtered = leads.filter(l => {
    const name = `${l.first_name ?? ''} ${l.last_name ?? ''}`.toLowerCase()
    const co = (l.companies?.name ?? '').toLowerCase()
    const matchSearch = !search || name.includes(search.toLowerCase()) || co.includes(search.toLowerCase())
    const matchSource = filterSource === 'ALL' || l.source_type === filterSource
    const matchWarmth = filterWarmth === 'ALL' || l.source_warmth === filterWarmth
    return matchSearch && matchSource && matchWarmth
  })

  const pendingCount = leads.filter(l => l.status === 'PENDING').length
  const researchCount = leads.filter(l => l.status === 'NEEDS_RESEARCH').length

  return (
    <div className="flex flex-col h-full">
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
              className="bg-surface border border-border text-xs text-fg placeholder:text-fg-3 rounded-md pl-8 pr-3 py-1.5 w-48 focus:outline-none focus:border-accent transition-colors" />
          </div>

          {/* Add Leads dropdown */}
          <div className="relative">
            <button onClick={() => setShowAddMenu(m => !m)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded-md hover:bg-accent-dim transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Leads <ChevronDown className="w-3 h-3" />
            </button>
            {showAddMenu && (
              <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-20 py-1 w-44">
                <button onClick={() => { setShowAddMenu(false); router.push('/leads/import') }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-fg hover:bg-surface transition-colors">
                  <Upload className="w-3.5 h-3.5 text-fg-3" /> CSV Import
                </button>
                <button onClick={() => { setShowAddMenu(false); setShowManual(true) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-fg hover:bg-surface transition-colors">
                  <Plus className="w-3.5 h-3.5 text-fg-3" /> Manual Entry
                </button>
                <button onClick={() => { setShowAddMenu(false); router.push('/settings/webhooks') }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-fg hover:bg-surface transition-colors">
                  <Webhook className="w-3.5 h-3.5 text-fg-3" /> Webhook URL
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-border-soft bg-card">
        {[
          { key: 'pending' as SubTab,        label: 'Pending Review',  count: pendingCount },
          { key: 'needs_research' as SubTab, label: 'Needs Research',  count: researchCount },
        ].map(({ key, label, count }) => (
          <button key={key} onClick={() => setSubTab(key)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors',
              subTab === key ? 'bg-accent-muted text-accent' : 'text-fg-3 hover:text-fg hover:bg-surface')}>
            {label}
            <span className={cn('px-1.5 rounded text-xs', subTab === key ? 'bg-accent/20 text-accent' : 'bg-border text-fg-3')}>
              {count}
            </span>
          </button>
        ))}

        {/* Filters */}
        <div className="ml-auto flex items-center gap-2">
          <select value={filterWarmth} onChange={e => setFilterWarmth(e.target.value)}
            className="bg-surface border border-border text-xs text-fg rounded px-2 py-1 focus:outline-none focus:border-accent">
            <option value="ALL">All warmth</option>
            <option value="WARM">Warm</option>
            <option value="COLD">Cold</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
          <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
            className="bg-surface border border-border text-xs text-fg rounded px-2 py-1 focus:outline-none focus:border-accent">
            <option value="ALL">All sources</option>
            <option value="MANUAL_ENTRY">Manual</option>
            <option value="CSV_IMPORT">CSV</option>
            <option value="COWORK_EXPORT">Cowork</option>
            <option value="LEMLIST_WATCHER">Lemlist</option>
            <option value="GOOGLE_ALERTS">Google Alerts</option>
            <option value="LINKEDIN_JOBS">LinkedIn Jobs</option>
          </select>
        </div>
      </div>

      {/* Lead cards */}
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
                : 'Leads appear here when a company is surfaced but no specific contact has been found yet.'}
            </p>
            <button onClick={() => setShowManual(true)}
              className="px-4 py-2 bg-accent text-sidebar text-xs font-semibold rounded-md hover:bg-accent-dim">
              + Add Lead Manually
            </button>
          </div>
        ) : subTab === 'pending' ? (
          <div className="grid grid-cols-1 gap-3 max-w-3xl">
            {filtered.map(lead => <PendingCard key={lead.id} lead={lead} onRefresh={load} router={router} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 max-w-3xl">
            {filtered.map(lead => <ResearchCard key={lead.id} lead={lead} onRefresh={load} onAddContact={() => setShowManual(true)} router={router} />)}
          </div>
        )}
      </div>

      <ManualLeadModal open={showManual} onClose={() => setShowManual(false)} onCreated={() => { setShowManual(false); load() }} />
    </div>
  )
}

// ─── Pending Lead Card ────────────────────────────────────────────────────────

function PendingCard({ lead, onRefresh, router }: { lead: Lead; onRefresh: () => void; router: ReturnType<typeof useRouter> }) {
  const [rejecting, setRejecting] = useState(false)
  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || '(No name)'

  async function handleReject() {
    setRejecting(true)
    await createClient().from('leads').update({ status: 'REJECTED' }).eq('id', lead.id)
    onRefresh()
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-5 hover:border-border/80 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-border text-fg-2 text-xs font-medium rounded">⚪ PENDING</span>
          {lead.source_warmth && lead.source_warmth !== 'UNKNOWN' && (
            <span className={cn('px-2 py-0.5 text-xs font-medium rounded', WARMTH_BADGE[lead.source_warmth])}>
              {lead.source_warmth}
            </span>
          )}
          <span className="text-xs text-fg-3 flex items-center gap-1">
            <Clock className="w-3 h-3" />{timeAgo(lead.created_at)}
          </span>
        </div>
        <span className="text-xs text-accent italic">Scoring in Phase 5</span>
      </div>

      <div className="space-y-1 mb-3">
        <p className="text-sm font-semibold text-fg">{fullName} {lead.title && <span className="text-fg-2 font-normal">· {lead.title}</span>}</p>
        {lead.companies && (
          <p className="text-xs text-fg-2 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-fg-3" />
            {lead.companies.name}
            {lead.companies.country && ` · ${lead.companies.country}`}
          </p>
        )}
        {lead.linkedin_url && (
          <a href={lead.linkedin_url} target="_blank" rel="noopener"
            className="text-xs text-accent hover:underline flex items-center gap-1 w-fit">
            <Link2 className="w-3 h-3" />
            {lead.linkedin_url.replace('https://www.linkedin.com/in/', 'linkedin.com/in/')}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
        {lead.email && <p className="text-xs text-fg-3">📧 {lead.email}</p>}
      </div>

      {(lead.source_type || lead.source_signal) && (
        <div className="border-t border-border-soft pt-3 mb-3">
          <p className="text-xs text-fg-3">
            {SOURCE_ICONS[lead.source_type ?? ''] ?? '📥'} <span className="text-fg-2">{lead.source_type?.replace('_', ' ')}</span>
            {lead.source_detail && <span> — {lead.source_detail}</span>}
          </p>
          {lead.source_signal && <p className="text-xs text-fg-3 mt-0.5 italic">"{lead.source_signal}"</p>}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        {lead.companies && (
          <button onClick={() => router.push(`/accounts/${lead.companies!.id}`)}
            className="px-3 py-1.5 bg-card border border-border text-xs text-fg-2 rounded hover:text-fg transition-colors flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" /> View Account
          </button>
        )}
        <button className="px-3 py-1.5 bg-card border border-border text-xs text-fg-2 rounded hover:text-fg transition-colors opacity-50 cursor-not-allowed" disabled>
          Score (Phase 5)
        </button>
        <button onClick={handleReject} disabled={rejecting}
          className="ml-auto px-3 py-1.5 text-xs text-score-low hover:bg-score-low/10 rounded transition-colors disabled:opacity-50">
          {rejecting ? 'Rejecting...' : 'Reject'}
        </button>
      </div>
    </div>
  )
}

// ─── Needs Research Card ──────────────────────────────────────────────────────

function ResearchCard({ lead, onRefresh, onAddContact, router }: {
  lead: Lead; onRefresh: () => void; onAddContact: () => void; router: ReturnType<typeof useRouter>
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 border-l-4 border-l-warm">
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
        ) : (
          <p className="text-sm font-semibold text-fg">Unknown company</p>
        )}
        {lead.source_signal && (
          <p className="text-xs text-fg-3 italic">Signal: "{lead.source_signal}"</p>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button onClick={onAddContact}
          className="px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim transition-colors flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Add Contact
        </button>
        {lead.companies && (
          <button onClick={() => router.push(`/accounts/${lead.companies!.id}`)}
            className="px-3 py-1.5 bg-card border border-border text-xs text-fg-2 rounded hover:text-fg transition-colors">
            View Account
          </button>
        )}
      </div>
    </div>
  )
}
