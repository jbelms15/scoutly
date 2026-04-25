import { Settings, User, Key, Target, Palette, ShieldOff, BookOpen, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { isLemlistConnected } from '@/lib/lemlist'
import { isHubSpotConnected } from '@/lib/hubspot'

export default function SettingsPage() {
  const lemlistOn = isLemlistConnected()
  const hubspotOn = isHubSpotConnected()

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-4 h-4 text-accent" />
        <h1 className="text-sm font-semibold text-fg">Settings</h1>
      </div>

      <div className="space-y-4">
        {/* User profile */}
        <section className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-3.5 h-3.5 text-accent" />
            <h2 className="text-xs font-semibold text-fg">User Profile</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-fg-3 mb-1">Full Name</label>
              <input
                type="text"
                placeholder="Your name (used in email sign-off)"
                className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg placeholder:text-fg-3 focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-fg-3 mb-1">Title</label>
              <input
                type="text"
                defaultValue="Growth BDR, Shikenso Analytics"
                className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg placeholder:text-fg-3 focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>
        </section>

        {/* API Connections */}
        <section className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-3.5 h-3.5 text-accent" />
            <h2 className="text-xs font-semibold text-fg">API Connections</h2>
            <span className="text-xs text-fg-3 ml-1">— wired in Phase 8</span>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Lemlist API Key', connected: lemlistOn, envKey: 'LEMLIST_API_KEY' },
              { label: 'HubSpot API Key', connected: hubspotOn, envKey: 'HUBSPOT_API_KEY' },
            ].map(({ label, connected, envKey }) => (
              <div key={label} className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-fg">{label}</div>
                  <div className="text-xs text-fg-3">{envKey}</div>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${connected ? 'bg-score-high/10 text-score-high' : 'bg-border text-fg-3'}`}>
                  {connected ? 'Connected' : 'Not connected'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ICP Preferences */}
        <section className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-3.5 h-3.5 text-accent" />
            <h2 className="text-xs font-semibold text-fg">ICP Preferences</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-fg-3 mb-1">Primary Region</label>
              <select className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent transition-colors">
                <option>Europe</option>
                <option>Global</option>
                <option>DACH</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-fg-3 mb-1">Min Company Size</label>
              <select className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent transition-colors">
                <option>10+ employees</option>
                <option>50+ employees</option>
                <option>100+ employees</option>
              </select>
            </div>
          </div>
        </section>

        {/* Suppression List */}
        <Link href="/settings/suppression"
          className="flex items-center gap-4 p-4 bg-surface border border-border rounded-lg hover:border-accent/40 transition-all group">
          <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center shrink-0 group-hover:border-accent/40 transition-colors">
            <ShieldOff className="w-4 h-4 text-fg-2 group-hover:text-accent transition-colors" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-fg">Suppression List</div>
            <div className="text-xs text-fg-3">Block companies from ever entering the pipeline — pre-loaded with Shikenso customers</div>
          </div>
          <ChevronRight className="w-4 h-4 text-fg-3 group-hover:text-accent transition-colors" />
        </Link>

        {/* Knowledge Base */}
        <Link href="/settings/knowledge-base"
          className="flex items-center gap-4 p-4 bg-surface border border-border rounded-lg hover:border-accent/40 transition-all group">
          <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center shrink-0 group-hover:border-accent/40 transition-colors">
            <BookOpen className="w-4 h-4 text-fg-2 group-hover:text-accent transition-colors" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-fg">Knowledge Base</div>
            <div className="text-xs text-fg-3">ICP segments, products, proof points, competitors, keywords, copy tone — all pulled dynamically into Claude prompts</div>
          </div>
          <ChevronRight className="w-4 h-4 text-fg-3 group-hover:text-accent transition-colors" />
        </Link>

        {/* Accent color */}
        <section className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-3.5 h-3.5 text-accent" />
            <h2 className="text-xs font-semibold text-fg">Accent Color</h2>
          </div>
          <Link href="/setup"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-md text-xs text-fg-2 hover:text-fg hover:border-border transition-colors">
            Open color picker
          </Link>
        </section>
      </div>
    </div>
  )
}
