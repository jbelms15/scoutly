import { BarChart3 } from 'lucide-react'

const ALL_TIME_STATS = [
  { label: 'Total Leads Created', value: '0' },
  { label: 'Avg ICP Score (Approved)', value: '—' },
  { label: 'Approval Rate', value: '—' },
  { label: 'Pushed to CRM', value: '0' },
]

export default function PipelinePage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-4 h-4 text-accent" />
        <h1 className="text-sm font-semibold text-fg">Pipeline</h1>
      </div>

      {/* All-time stats */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {ALL_TIME_STATS.map(({ label, value }) => (
          <div key={label} className="bg-surface border border-border rounded-lg p-4">
            <div className="text-xs text-fg-3 mb-2">{label}</div>
            <div className="text-2xl font-bold text-fg">{value}</div>
          </div>
        ))}
      </div>

      {/* Charts placeholder */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-lg p-4 h-48 flex items-center justify-center">
          <p className="text-xs text-fg-3">Rejection reasons chart — available once data flows in</p>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4 h-48 flex items-center justify-center">
          <p className="text-xs text-fg-3">Segment breakdown — available once data flows in</p>
        </div>
      </div>
    </div>
  )
}
