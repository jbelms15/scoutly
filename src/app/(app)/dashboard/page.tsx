import { LayoutDashboard, TrendingUp, Users, CheckCircle, XCircle, Send, BookOpen, ExternalLink, DollarSign, AlertTriangle } from 'lucide-react'
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
      { count: geoPriorities },
      { count: modules },
      { count: channels },
      { count: painPoints },
      { count: objections },
      { count: framingRules },
      { count: convPatterns },
      { data: scoringCost },
      { count: leadsThisWeek },
      { count: approvedThisWeek },
      { count: rejectedThisWeek },
      { count: pendingTotal },
      { count: hotLeads },
    ] = await Promise.all([
      supabase.from('kb_icp_segments').select('*', { count: 'exact', head: true }).eq('active', true).eq('archived', false),
      supabase.from('kb_proof_points').select('*', { count: 'exact', head: true }).eq('active', true).eq('archived', false),
      supabase.from('kb_signal_keywords').select('*', { count: 'exact', head: true }).eq('active', true),
      supabase.from('kb_copy_preferences').select('*', { count: 'exact', head: true }).eq('active', true),
      supabase.from('kb_geographic_priorities').select('*', { count: 'exact', head: true }).eq('active', true).eq('archived', false),
      supabase.from('kb_modules').select('*', { count: 'exact', head: true }).eq('active', true).eq('archived', false),
      supabase.from('kb_channels').select('*', { count: 'exact', head: true }).eq('active', true).eq('archived', false),
      supabase.from('kb_pain_points').select('*', { count: 'exact', head: true }).eq('active', true).eq('archived', false),
      supabase.from('kb_objections').select('*', { count: 'exact', head: true }).eq('active', true).eq('archived', false),
      supabase.from('kb_framing_rules').select('*', { count: 'exact', head: true }).eq('active', true).eq('archived', false),
      supabase.from('kb_conversation_patterns').select('*', { count: 'exact', head: true }).eq('active', true).eq('archived', false),
      supabase.from('scoring_runs').select('api_cost_usd, lead_id').gte('created_at', startOfMonth.toISOString()),
      supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', startOfWeek.toISOString()),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'APPROVED').gte('created_at', startOfWeek.toISOString()),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'REJECTED').gte('created_at', startOfWeek.toISOString()),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('priority', 'HOT').eq('status', 'PENDING'),
    ])

    // Count needs_review across all kb tables that have the column
    const needsReviewTables = [
      'kb_icp_segments','kb_geographic_priorities','kb_modules','kb_channels',
      'kb_proof_points','kb_competitors','kb_pain_points','kb_objections',
      'kb_framing_rules','kb_conversation_patterns','kb_copy_preferences',
    ]
    const reviewCounts = await Promise.all(
      needsReviewTables.map(t => supabase.from(t).select('*', { count: 'exact', head: true }).eq('needs_review', true).eq('archived', false))
    )
    const totalNeedsReview = reviewCounts.reduce((sum, r) => sum + (r.count ?? 0), 0)
    const reviewByTable = needsReviewTables.map((t, i) => ({ table: t, count: reviewCounts[i].count ?? 0 }))
      .filter(r => r.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)

    const totalCostUsd = (scoringCost ?? []).reduce((sum, r) => sum + Number(r.api_cost_usd ?? 0), 0)
    const uniqueLeadsScored = new Set((scoringCost ?? []).map(r => r.lead_id)).size

    const TABLE_SHORT: Record<string, string> = {
      kb_icp_segments: 'ICP', kb_geographic_priorities: 'Geography', kb_modules: 'Modules',
      kb_channels: 'Channels', kb_proof_points: 'Proof Points', kb_competitors: 'Competitors',
      kb_pain_points: 'Pain Points', kb_objections: 'Objections', kb_framing_rules: 'Framing Rules',
      kb_conversation_patterns: 'Patterns', kb_copy_preferences: 'Voice',
    }

    return {
      kb: {
        segments: segments ?? 0,
        proofPoints: proofPoints ?? 0,
        keywords: keywords ?? 0,
        voiceRules: voiceRules ?? 0,
        geoPriorities: geoPriorities ?? 0,
        modules: modules ?? 0,
        channels: channels ?? 0,
        painPoints: painPoints ?? 0,
        objections: objections ?? 0,
        framingRules: framingRules ?? 0,
        convPatterns: convPatterns ?? 0,
      },
      review: { total: totalNeedsReview, byTable: reviewByTable.map(r => ({ label: TABLE_SHORT[r.table] ?? r.table, count: r.count })) },
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

  const KB_ROWS = [
    { label: '🎯 ICP segments',          value: data?.kb.segments ?? 0 },
    { label: '📦 Modules',               value: data?.kb.modules ?? 0 },
    { label: '📡 Channels',              value: data?.kb.channels ?? 0, highlight: true },
    { label: '🌍 Geo tiers',             value: data?.kb.geoPriorities ?? 0 },
    { label: '💢 Pain points',           value: data?.kb.painPoints ?? 0 },
    { label: '🎭 Objections',            value: data?.kb.objections ?? 0 },
    { label: '🎯 Framing rules',         value: data?.kb.framingRules ?? 0 },
    { label: '💬 Proof points',          value: data?.kb.proofPoints ?? 0 },
    { label: '🔔 Signal keyword sets',   value: data?.kb.keywords ?? 0 },
    { label: '✍️ Voice rules',            value: data?.kb.voiceRules ?? 0 },
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
          <div className="space-y-1.5">
            {KB_ROWS.map(({ label, value, highlight }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-fg-3">{label}</span>
                <span className={`text-xs font-semibold ${highlight ? 'text-score-high' : 'text-fg'}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Needs Review widget */}
        <div className={`bg-surface border rounded-lg p-4 ${(data?.review.total ?? 0) > 0 ? 'border-warm/30' : 'border-border'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-3.5 h-3.5 ${(data?.review.total ?? 0) > 0 ? 'text-warm' : 'text-fg-3'}`} />
              <h2 className="text-xs font-semibold text-fg">KB Needs Review</h2>
            </div>
            <Link href="/settings/knowledge-base/review" className="text-xs text-accent hover:text-accent-dim flex items-center gap-1">
              Review <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          {(data?.review.total ?? 0) === 0 ? (
            <div className="flex items-center gap-2 text-score-high">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-medium">All KB content confirmed</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-warm">{data?.review.total}</span>
                <span className="text-xs text-fg-3">items need review</span>
              </div>
              {(data?.review.byTable ?? []).length > 0 && (
                <div className="space-y-1">
                  {data!.review.byTable.map(({ label, count }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs text-fg-3">· {label}</span>
                      <span className="text-xs font-semibold text-warm">{count}</span>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/settings/knowledge-base/review"
                className="inline-flex items-center gap-1 mt-1 text-xs text-warm font-medium hover:underline">
                Review with Benedikt →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
