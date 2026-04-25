import { Target, Filter, Search } from 'lucide-react'

export default function QueuePage() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-soft">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-accent" />
          <h1 className="text-sm font-semibold text-fg">Review Queue</h1>
          <span className="ml-1 px-1.5 py-0.5 bg-accent-muted text-accent text-xs font-medium rounded">
            0
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-3" />
            <input
              type="text"
              placeholder="Search leads..."
              className="bg-surface border border-border text-xs text-fg placeholder:text-fg-3 rounded-md pl-8 pr-3 py-1.5 w-48 focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-md text-xs text-fg-2 hover:text-fg hover:border-border transition-colors">
            <Filter className="w-3.5 h-3.5" />
            Filter
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex items-center gap-2 px-6 py-2.5 border-b border-border-soft">
        {['All', 'HOT', 'WARM', 'COLD'].map((f) => (
          <button
            key={f}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              f === 'All'
                ? 'bg-accent-muted text-accent'
                : 'text-fg-3 hover:text-fg hover:bg-surface'
            }`}
          >
            {f}
          </button>
        ))}
        <div className="w-px h-4 bg-border mx-1" />
        {['All Segments', 'Rights Holder', 'Brand', 'Agency', 'Club'].map((s) => (
          <button
            key={s}
            className="px-2.5 py-1 rounded text-xs text-fg-3 hover:text-fg hover:bg-surface transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Empty state */}
      <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
        <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mb-4">
          <Target className="w-6 h-6 text-fg-3" />
        </div>
        <h2 className="text-sm font-semibold text-fg mb-1">Queue is empty</h2>
        <p className="text-xs text-fg-3 max-w-xs">
          Leads will appear here once signals fire or you import contacts.
          Set up your first signal to get started.
        </p>
        <button className="mt-4 px-4 py-2 bg-accent text-sidebar text-xs font-semibold rounded-md hover:bg-accent-dim transition-colors">
          Set up a signal
        </button>
      </div>
    </div>
  )
}
