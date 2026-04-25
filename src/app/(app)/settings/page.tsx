import { Settings, User, Key, Target, Palette } from 'lucide-react'

export default function SettingsPage() {
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

        {/* API Keys */}
        <section className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-3.5 h-3.5 text-accent" />
            <h2 className="text-xs font-semibold text-fg">API Keys</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Lemlist API Key', placeholder: 'Placeholder — Phase 5' },
              { label: 'HubSpot API Key', placeholder: 'Placeholder — Phase 5' },
            ].map(({ label, placeholder }) => (
              <div key={label}>
                <label className="block text-xs text-fg-3 mb-1">{label}</label>
                <input
                  type="password"
                  placeholder={placeholder}
                  disabled
                  className="w-full bg-card border border-border-soft rounded px-3 py-2 text-xs text-fg-3 placeholder:text-fg-3 opacity-50 cursor-not-allowed"
                />
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

        {/* Accent color */}
        <section className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-3.5 h-3.5 text-accent" />
            <h2 className="text-xs font-semibold text-fg">Accent Color</h2>
          </div>
          <p className="text-xs text-fg-3 mb-3">
            Change your Scoutly color theme at any time.
          </p>
          <a
            href="/setup"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-md text-xs text-fg-2 hover:text-fg hover:border-border transition-colors"
          >
            Open color picker
          </a>
        </section>
      </div>
    </div>
  )
}
