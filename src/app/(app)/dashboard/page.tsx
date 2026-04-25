import { LayoutDashboard, TrendingUp, Users, CheckCircle, XCircle, Send } from 'lucide-react'

const STATS = [
  { label: 'Leads Surfaced', value: '0', sub: 'this week', icon: Users },
  { label: 'Approved', value: '0', sub: 'this week', icon: CheckCircle },
  { label: 'Rejected', value: '0', sub: 'this week', icon: XCircle },
  { label: 'Pushed to Lemlist', value: '0', sub: 'this week', icon: Send },
]

export default function DashboardPage() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <LayoutDashboard className="w-4 h-4 text-accent" />
        <h1 className="text-sm font-semibold text-fg">Dashboard</h1>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {STATS.map(({ label, value, sub, icon: Icon }) => (
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

      {/* Two column layout */}
      <div className="grid grid-cols-2 gap-4">
        {/* Top signal source */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-3.5 h-3.5 text-accent" />
            <h2 className="text-xs font-semibold text-fg">Top Signal Sources</h2>
          </div>
          <div className="flex flex-col items-center justify-center h-24 text-center">
            <p className="text-xs text-fg-3">No signals fired yet.</p>
            <p className="text-xs text-fg-3">Configure signals to start surfacing leads.</p>
          </div>
        </div>

        {/* Segment breakdown */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-3.5 h-3.5 text-accent" />
            <h2 className="text-xs font-semibold text-fg">Leads by Segment</h2>
          </div>
          <div className="flex flex-col items-center justify-center h-24 text-center">
            <p className="text-xs text-fg-3">Pipeline is empty.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
