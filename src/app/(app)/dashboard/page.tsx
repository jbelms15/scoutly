import { LayoutDashboard, TrendingUp, Users, CheckCircle, XCircle, Send, BookOpen, ExternalLink, DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

async function getDashboardData() {
  try {
    const supabase = await createClient()

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const [
      { count: segments },
      { count: proofPoints },
      { count: keywords },
      { count: voiceRules },
      { data: scoringCost },
      { count: leadsThisWeek },
      { count: approvedThisWeek },
      { count: rejectedThisWeek },
      { count: pendingTotal },
      { count: hotLeads },
    ] = await Promise.all([
      supabase.from('kb_icp_segments').select('*', { count: 'exact', head: true }).eq('active', true),
      supabase.from('kb_proof_points').select('*', { count: 'exact', head: true }).eq('active', true),
      supabase.from('kb_signal_keywords').select('*', { count: 'exact', head: true }).eq('active', true),
      supabase.from('kb_copy_preferences').select('*', { count: 'exact', head: true }).eq('active', true),
      supabase.from('scoring_runs').select('api_cost_usd, lead_id').gte('created_at', startOfMonth.toISOString()),
      supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', startOfWeek.toISOString()),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'APPROVED').gte('created_at', startOfWeek.toISOString()),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'REJECTED').gte('created_at', startOfWeek.toISOString()),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('priority', 'HOT').eq('status', 'PENDING'),
    ])

    const totalCostUsd = (scoringCost ?? []).reduce((sum, r) => sum + Number(r.api_cost_usd ?? 0), 0)
    const uniqueLeadsScored = new Set((scoringCost ?? []).map(r => r.lead_id)).size

    return {
      kb: { segments: segments ?? 0, proofPoints: proofPoints ?? 0, keywords: keywords ?? 0, voiceRules: voiceRules ?? 0 },
      cost: { totalCostUsd, leadsScored: uniqueLeadsScored, avgCostPerLead: uniqueLeadsScored > 0 ? totalCostUsd / uniqueLeadsScored : 0 },
      week: { leads: leadsThisWeek ?? 0, approved: approvedThisWeek ?? 0, rejected: rejectedThisWeek ?? 0 },
      queue: { pending: pendingTotal ?? 0, hot: hotLeads ?? 0 },
    }
  } catch {
    return null
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  const WEEK_STATS = [
    { label: 'Leads Surfaced',    value: String(data?.week.leads ?? 0),    sub: 'this week', icon: Users },
    { label: 'Approved',          value: String(data?.week.approved ?? 0),  sub: 'this week', icon: CheckCircle },
    { label: 'Rejected',          value: String(data?.week.rejected ?? 0),  sub: 'this week', icon: XCircle },
    { label: 'Pending in Queue',  value: String(data?.queue.pending ?? 0),  sub: 'total',     icon: Send },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <LayoutDashboard className="w-4 h-4 text-accent" />
        <h1 className="text-sm font-semibold text-fg">Dashboard</h1>
        {(data?.queue.hot ?? 0) > 0 && (
          <Link href="/queue" className="px-2 py-0.5 bg-score-low/10 text-score-low text-xs font-bold rounded animate-pulse">
            {data!.queue.hot} HOT leads waiting
          </Link>
        )}
      </div>

      {/* Week stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {WEEK_STATS.map(({ label, value, sub, icon: Icon }) => (
          <div key={label} className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-fg-3">{label}</span>
              <Icon className="w-3.5 h-3.5 text-fg-3" />
            </div>
            <div className="text-2xl font-bold text-fg">{value}</div>
            <div className="text-xs text-fg-3 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Lower grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Signal sources placeholder */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-3.5 h-3.5 text-accent" />
            <h2 className="text-xs font-semibold text-fg">Top Signal Sources</h2>
          </div>
          <div className="flex items-center justify-center h-20">
            <p className="text-xs text-fg-3 text-center">Configure signals to start surfacing leads.</p>
          </div>
        </div>

        {/* API cost widget */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-accent" />
              <h2 className="text-xs font-semibold text-fg">API Usage This Month</h2>
            </div>
          </div>
          {data?.cost ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-fg-3">Total cost</span>
                <span className="text-sm font-bold text-fg">${data.cost.totalCostUsd.toFixed(4)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-fg-3">Leads scored</span>
                <span className="text-xs font-semibold text-fg">{data.cost.leadsScored}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-fg-3">Avg cost per lead</span>
                <span className="text-xs font-semibold text-fg">
                  {data.cost.leadsScored > 0 ? `$${data.cost.avgCostPerLead.toFixed(4)}` : '—'}
                </span>
              </div>
              {data.cost.leadsScored === 0 && (
                <p className="text-xs text-fg-3 pt-1">Costs appear here after leads are scored.</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-fg-3">Run migration 008 to activate cost tracking.</p>
          )}
        </div>

        {/* Knowledge Base widget */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-accent" />
              <h2 className="text-xs font-semibold text-fg">Knowledge Base</h2>
            </div>
            <Link href="/settings/knowledge-base/icp" className="text-xs text-accent hover:text-accent-dim flex items-center gap-1">
              Manage <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          {data?.kb ? (
            <div className="space-y-1.5">
              {[
                { label: '🎯 ICP segments',        value: data.kb.segments },
                { label: '📦 Proof points',        value: data.kb.proofPoints },
                { label: '🔔 Signal keyword sets', value: data.kb.keywords },
                { label: '✍️ Voice rules',          value: data.kb.voiceRules },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-fg-3">{label}</span>
                  <span className="text-xs font-semibold text-fg">{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-fg-3">Knowledge Base loading...</p>
          )}
        </div>

        {/* Target Accounts snapshot */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-accent" />
              <h2 className="text-xs font-semibold text-fg">Target Accounts</h2>
            </div>
            <Link href="/accounts" className="text-xs text-accent hover:text-accent-dim flex items-center gap-1">
              Manage <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex items-center justify-center h-20">
            <p className="text-xs text-fg-3 text-center">Add Tier 1 accounts to prioritise signal-triggered leads.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
