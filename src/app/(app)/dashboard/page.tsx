import { LayoutDashboard, TrendingUp, Users, CheckCircle, XCircle, Send, BookOpen, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const WEEK_STATS = [
  { label: 'Leads Surfaced',      value: '0', sub: 'this week', icon: Users },
  { label: 'Approved',            value: '0', sub: 'this week', icon: CheckCircle },
  { label: 'Rejected',            value: '0', sub: 'this week', icon: XCircle },
  { label: 'Pushed to Lemlist',   value: '0', sub: 'this week', icon: Send },
]

async function getKBStats() {
  try {
    const supabase = await createClient()
    const [
      { count: segments },
      { count: proofPoints },
      { count: keywords },
      { count: voiceRules },
    ] = await Promise.all([
      supabase.from('kb_icp_segments').select('*', { count: 'exact', head: true }).eq('active', true),
      supabase.from('kb_proof_points').select('*', { count: 'exact', head: true }).eq('active', true),
      supabase.from('kb_signal_keywords').select('*', { count: 'exact', head: true }).eq('active', true),
      supabase.from('kb_copy_preferences').select('*', { count: 'exact', head: true }).eq('active', true),
    ])
    return {
      segments: segments ?? 0,
      proofPoints: proofPoints ?? 0,
      keywords: keywords ?? 0,
      voiceRules: voiceRules ?? 0,
    }
  } catch {
    return null
  }
}

export default async function DashboardPage() {
  const kb = await getKBStats()

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <LayoutDashboard className="w-4 h-4 text-accent" />
        <h1 className="text-sm font-semibold text-fg">Dashboard</h1>
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
            <p className="text-xs text-fg-3 text-center">No signals fired yet. Configure signals to start surfacing leads.</p>
          </div>
        </div>

        {/* Segment breakdown placeholder */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-3.5 h-3.5 text-accent" />
            <h2 className="text-xs font-semibold text-fg">Leads by Segment</h2>
          </div>
          <div className="flex items-center justify-center h-20">
            <p className="text-xs text-fg-3 text-center">Pipeline is empty.</p>
          </div>
        </div>

        {/* Knowledge Base widget */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-accent" />
              <h2 className="text-xs font-semibold text-fg">Knowledge Base</h2>
            </div>
            <Link href="/settings/knowledge-base" className="text-xs text-accent hover:text-accent-dim flex items-center gap-1 transition-colors">
              Manage <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          {kb ? (
            <div className="space-y-1.5">
              {[
                { label: '🎯 ICP — segments active',     value: kb.segments },
                { label: '📦 Shikenso — proof points',   value: kb.proofPoints },
                { label: '🔔 Signals — keyword sets',    value: kb.keywords },
                { label: '✍️ Voice — rules',              value: kb.voiceRules },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-fg-3">{label}</span>
                  <span className="text-xs font-semibold text-fg">{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-fg-3">Run migration 005 to activate the Knowledge Base.</p>
          )}
        </div>

        {/* Accounts snapshot */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-accent" />
              <h2 className="text-xs font-semibold text-fg">Target Accounts</h2>
            </div>
            <Link href="/accounts" className="text-xs text-accent hover:text-accent-dim flex items-center gap-1 transition-colors">
              Manage <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex items-center justify-center h-20">
            <p className="text-xs text-fg-3 text-center">Add your Tier 1 accounts to prioritise signal-triggered leads.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
