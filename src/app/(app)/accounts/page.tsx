'use client'

import { useState, useEffect } from 'react'
import { Building2, Plus, Upload, Search, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type Tier = 'TIER_1' | 'TIER_2' | 'TIER_3'
type AccountState = 'NEW' | 'ACTIVE' | 'CONTACTED' | 'RESPONDED' | 'IN_OPPORTUNITY' | 'CUSTOMER' | 'SUPPRESSED'

type Company = {
  id: string
  name: string
  website?: string
  industry?: string
  size_range?: string
  country?: string
  segment?: string
  target_tier: Tier
  account_state: AccountState
  sponsorship_activity?: string
}

const TIER_LABELS: Record<Tier, { label: string; desc: string; color: string }> = {
  TIER_1: { label: 'Tier 1', desc: 'Top 50 dream accounts', color: 'text-accent' },
  TIER_2: { label: 'Tier 2', desc: 'Strong fit — 200–300 accounts', color: 'text-warm' },
  TIER_3: { label: 'Tier 3', desc: 'Open universe / watch list', color: 'text-cold' },
}

const STATE_COLORS: Record<AccountState, string> = {
  NEW:            'bg-border text-fg-2',
  ACTIVE:         'bg-accent-muted text-accent',
  CONTACTED:      'bg-cold/10 text-cold',
  RESPONDED:      'bg-warm/10 text-warm',
  IN_OPPORTUNITY: 'bg-score-high/10 text-score-high',
  CUSTOMER:       'bg-score-high/20 text-score-high',
  SUPPRESSED:     'bg-score-low/10 text-score-low',
}

export default function AccountsPage() {
  const [activeTier, setActiveTier] = useState<Tier>('TIER_1')
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({
    name: '', website: '', industry: '', size_range: '',
    country: '', segment: '', target_tier: activeTier as string,
  })

  async function load() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('companies')
      .select('*')
      .order('name')
    setCompanies(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    const supabase = createClient()
    await supabase.from('companies').insert({ ...form, account_state: 'NEW' })
    setForm({ name: '', website: '', industry: '', size_range: '', country: '', segment: '', target_tier: activeTier })
    setShowAdd(false)
    setAdding(false)
    load()
  }

  const filtered = companies.filter(c =>
    c.target_tier === activeTier &&
    (search === '' || c.name.toLowerCase().includes(search.toLowerCase()))
  )

  const counts: Record<Tier, number> = {
    TIER_1: companies.filter(c => c.target_tier === 'TIER_1').length,
    TIER_2: companies.filter(c => c.target_tier === 'TIER_2').length,
    TIER_3: companies.filter(c => c.target_tier === 'TIER_3').length,
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-soft">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-accent" />
          <h1 className="text-sm font-semibold text-fg">Target Accounts</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-3" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search accounts..."
              className="bg-surface border border-border text-xs text-fg placeholder:text-fg-3 rounded-md pl-8 pr-3 py-1.5 w-48 focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded-md hover:bg-accent-dim transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Account
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border text-xs text-fg-2 rounded-md hover:text-fg transition-colors opacity-50 cursor-not-allowed" disabled>
            <Upload className="w-3.5 h-3.5" />
            Import CSV
          </button>
        </div>
      </div>

      {/* Tier tabs */}
      <div className="flex items-center gap-1 px-6 py-2.5 border-b border-border-soft">
        {(Object.keys(TIER_LABELS) as Tier[]).map(tier => (
          <button
            key={tier}
            onClick={() => setActiveTier(tier)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              activeTier === tier
                ? 'bg-accent-muted text-accent'
                : 'text-fg-3 hover:text-fg hover:bg-surface'
            )}
          >
            {TIER_LABELS[tier].label}
            <span className={cn(
              'px-1.5 py-0.5 rounded text-xs font-semibold',
              activeTier === tier ? 'bg-accent/20 text-accent' : 'bg-border text-fg-3'
            )}>
              {counts[tier]}
            </span>
          </button>
        ))}
        <span className="text-xs text-fg-3 ml-2">— {TIER_LABELS[activeTier].desc}</span>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="px-6 py-4 border-b border-border-soft bg-surface/50">
          <form onSubmit={handleAdd}>
            <div className="grid grid-cols-4 gap-3 mb-3">
              <div className="col-span-2">
                <label className="block text-xs text-fg-3 mb-1">Company Name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                  className="w-full bg-card border border-border rounded px-3 py-1.5 text-xs text-fg focus:outline-none focus:border-accent transition-colors" />
              </div>
              <div>
                <label className="block text-xs text-fg-3 mb-1">Website</label>
                <input value={form.website} onChange={e => setForm(f => ({...f, website: e.target.value}))}
                  placeholder="https://" className="w-full bg-card border border-border rounded px-3 py-1.5 text-xs text-fg focus:outline-none focus:border-accent transition-colors" />
              </div>
              <div>
                <label className="block text-xs text-fg-3 mb-1">Segment</label>
                <select value={form.segment} onChange={e => setForm(f => ({...f, segment: e.target.value}))}
                  className="w-full bg-card border border-border rounded px-3 py-1.5 text-xs text-fg focus:outline-none focus:border-accent transition-colors">
                  <option value="">Unknown</option>
                  <option>Rights Holder</option>
                  <option>Brand</option>
                  <option>Agency</option>
                  <option>Club</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-fg-3 mb-1">Country</label>
                <input value={form.country} onChange={e => setForm(f => ({...f, country: e.target.value}))}
                  className="w-full bg-card border border-border rounded px-3 py-1.5 text-xs text-fg focus:outline-none focus:border-accent transition-colors" />
              </div>
              <div>
                <label className="block text-xs text-fg-3 mb-1">Size</label>
                <select value={form.size_range} onChange={e => setForm(f => ({...f, size_range: e.target.value}))}
                  className="w-full bg-card border border-border rounded px-3 py-1.5 text-xs text-fg focus:outline-none focus:border-accent transition-colors">
                  <option value="">Unknown</option>
                  <option>1–10</option><option>11–50</option><option>51–200</option>
                  <option>201–500</option><option>501–1000</option><option>1000+</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-fg-3 mb-1">Tier</label>
                <select value={form.target_tier} onChange={e => setForm(f => ({...f, target_tier: e.target.value}))}
                  className="w-full bg-card border border-border rounded px-3 py-1.5 text-xs text-fg focus:outline-none focus:border-accent transition-colors">
                  <option value="TIER_1">Tier 1</option>
                  <option value="TIER_2">Tier 2</option>
                  <option value="TIER_3">Tier 3</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={adding}
                className="px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim transition-colors disabled:opacity-60">
                {adding ? 'Adding...' : 'Add Account'}
              </button>
              <button type="button" onClick={() => setShowAdd(false)}
                className="px-3 py-1.5 bg-surface border border-border text-xs text-fg-2 rounded hover:text-fg transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Account list */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-xs text-fg-3">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center mb-3">
              <Building2 className="w-5 h-5 text-fg-3" />
            </div>
            <p className="text-sm font-medium text-fg mb-1">No {TIER_LABELS[activeTier].label} accounts yet</p>
            <p className="text-xs text-fg-3 max-w-xs">
              {activeTier === 'TIER_1'
                ? 'Add your top 50 dream accounts. Signals on these will auto-trigger HOT priority leads.'
                : activeTier === 'TIER_2'
                ? 'Add 200–300 strong-fit accounts. Signals on these will auto-trigger WARM priority.'
                : 'Add companies to watch. These get standard signal scoring.'}
            </p>
            <button onClick={() => setShowAdd(true)}
              className="mt-4 px-4 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded-md hover:bg-accent-dim transition-colors">
              Add first account
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-soft">
                {['Company', 'Segment', 'Country', 'Size', 'State', ''].map(h => (
                  <th key={h} className="px-6 py-2.5 text-left text-xs font-medium text-fg-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(co => (
                <tr key={co.id} className="border-b border-border-soft hover:bg-surface/50 transition-colors group">
                  <td className="px-6 py-3">
                    <div className="text-xs font-medium text-fg">{co.name}</div>
                    {co.website && <div className="text-xs text-fg-3">{co.website}</div>}
                  </td>
                  <td className="px-6 py-3 text-xs text-fg-2">{co.segment ?? '—'}</td>
                  <td className="px-6 py-3 text-xs text-fg-2">{co.country ?? '—'}</td>
                  <td className="px-6 py-3 text-xs text-fg-2">{co.size_range ?? '—'}</td>
                  <td className="px-6 py-3">
                    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', STATE_COLORS[co.account_state])}>
                      {co.account_state}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <ChevronRight className="w-3.5 h-3.5 text-fg-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
