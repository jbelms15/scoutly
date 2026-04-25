import { Radio, Plus, Link2, Rss, Webhook, Upload, Sparkles } from 'lucide-react'

const SIGNAL_TYPES = [
  {
    type: 'linkedin_jobs',
    label: 'LinkedIn Jobs Monitor',
    description: 'Surface companies hiring for sponsorship & partnerships roles',
    icon: Link2,
    status: 'coming_soon' as const,
  },
  {
    type: 'google_alerts',
    label: 'Google Alerts Feed',
    description: 'Parse RSS feeds for sponsorship deal announcements',
    icon: Rss,
    status: 'coming_soon' as const,
  },
  {
    type: 'lemlist_webhook',
    label: 'Lemlist Watcher',
    description: 'Auto-receive warm leads from Lemlist campaign engagement',
    icon: Webhook,
    status: 'coming_soon' as const,
  },
  {
    type: 'csv_import',
    label: 'CSV Import',
    description: 'Batch import contacts from Cowork or any CSV export',
    icon: Upload,
    status: 'coming_soon' as const,
  },
  {
    type: 'agent',
    label: 'Scoutly Agent',
    description: 'On-demand AI prospecting via the chat panel',
    icon: Sparkles,
    status: 'coming_soon' as const,
  },
]

export default function SignalsPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-accent" />
          <h1 className="text-sm font-semibold text-fg">Signals</h1>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded-md hover:bg-accent-dim transition-colors">
          <Plus className="w-3.5 h-3.5" />
          Add Signal
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {SIGNAL_TYPES.map(({ type, label, description, icon: Icon }) => (
          <div
            key={type}
            className="flex items-center gap-4 bg-surface border border-border rounded-lg p-4 opacity-60"
          >
            <div className="w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-fg-2" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-fg">{label}</span>
                <span className="px-1.5 py-0.5 bg-border text-fg-3 text-xs rounded">
                  Phase 6
                </span>
              </div>
              <p className="text-xs text-fg-3 mt-0.5">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
