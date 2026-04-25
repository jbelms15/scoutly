'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2, Plus, Upload, Search, ChevronRight,
  CheckSquare, Square, ChevronDown, Trash2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useKBSegments } from '@/lib/hooks'
import AddCompanyModal from '@/components/add-company-modal'
import { cn } from '@/lib/utils'

type Company = {
  id: string; name: string; website?: string; domain?: string
  segment?: string; target_tier: string; country?: string
  account_state: string; sponsorship_activity?: string
  last_activity_at?: string; industry?: string; size_range?: string
}

type Tab = 'all' | 'tier1' | 'tier2' | 'tier3' | 'untagged'

const TIER_BADGE: Record<string, string> = {
  TIER_1: 'bg-accent/10 text-accent border border-accent/20',
  TIER_2: 'bg-warm/10 text-warm border border-warm/20',
  TIER_3: 'bg-cold/10 text-cold border border-cold/20',
  NONE:   'bg-border text-fg-3',
}
const TIER_LABEL: Record<string, string> = { TIER_1: 'Tier 1', TIER_2: 'Tier 2', TIER_3: 'Tier 3', NONE: '—' }

const STATE_BADGE: Record<string, string> = {
  NEW:            'bg-border text-fg-2',
  ACTIVE:         'bg-accent/10 text-accent',
  CONTACTED:      'bg-cold/10 text-cold',
  RESPONDED:      'bg-warm/10 text-warm',
  IN_OPPORTUNITY: 'bg-score-high/10 text-score-high',
  CUSTOMER:       'bg-score-high/20 text-score-high font-semibold',
  SUPPRESSED:     'bg-score-low/10 text-score-low',
}

export default function AccountsPage() {
  const router = useRouter()
  const { segments } = useKBSegments()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showAdd, setShowAdd] = useState(false)
  const [bulkOpen, setBulkOpen] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase.from('companies').select('*').order('name')
    setCompanies(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = companies.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.domain?.toLowerCase().includes(search.toLowerCase())
    const matchTab = activeTab === 'all' ? true
      : activeTab === 'tier1' ? c.target_tier === 'TIER_1'
      : activeTab === 'tier2' ? c.target_tier === 'TIER_2'
      : activeTab === 'tier3' ? c.target_tier === 'TIER_3'
      : c.target_tier === 'NONE'
    return matchSearch && matchTab
  })

  const counts = {
    all: companies.length,
    tier1: companies.filter(c => c.target_tier === 'TIER_1').length,
    tier2: companies.filter(c => c.target_tier === 'TIER_2').length,
    tier3: companies.filter(c => c.target_tier === 'TIER_3').length,
    untagged: companies.filter(c => c.target_tier === 'NONE').length,
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  function toggleAll() {
    setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(c => c.id)))
  }

  async function bulkUpdate(field: string, value: string) {
    const supabase = createClient()
    await supabase.from('companies').update({ [field]: value }).in('id', [...selected])
    setSelected(new Set())
    setBulkOpen(null)
    load()
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selected.size} company${selected.size > 1 ? 'ies' : ''}? This cannot be undone.`)) return
    const supabase = createClient()
    await supabase.from('companies').delete().in('id', [...selected])
    setSelected(new Set())
    load()
  }

  async function bulkSuppress() {
    const supabase = createClient()
    const entries = companies
      .filter(c => selected.has(c.id))
      .map(c => ({ suppression_type: 'DO_NOT_CONTACT', match_type: 'COMPANY_NAME', match_value: c.name, reason: 'Manually suppressed', added_by: 'user' }))
    await supabase.from('suppression_list').insert(entries)
    await supabase.from('companies').update({ account_state: 'SUPPRESSED' }).in('id', [...selected])
    setSelected(new Set())
    load()
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'all',      label: 'All Accounts' },
    { key: 'tier1',    label: 'Tier 1' },
    { key: 'tier2',    label: 'Tier 2' },
    { key: 'tier3',    label: 'Tier 3' },
    { key: 'untagged', label: 'Untagged' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-soft">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-accent" />
          <h1 className="text-sm font-semibold text-fg">Accounts</h1>
          <span className="px-1.5 py-0.5 bg-accent-muted text-accent text-xs font-medium rounded">{counts.all}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-3" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search accounts..." className="bg-surface border border-border text-xs text-fg placeholder:text-fg-3 rounded-md pl-8 pr-3 py-1.5 w-48 focus:outline-none focus:border-accent transition-colors" />
          </div>
          <button onClick={() => router.push('/accounts/import')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border text-xs text-fg-2 rounded-md hover:text-fg transition-colors">
            <Upload className="w-3.5 h-3.5" /> Import CSV
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded-md hover:bg-accent-dim transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Company
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-border-soft bg-card">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors',
              activeTab === key ? 'bg-accent-muted text-accent' : 'text-fg-3 hover:text-fg hover:bg-surface')}>
            {label}
            <span className={cn('px-1.5 rounded text-xs', activeTab === key ? 'bg-accent/20 text-accent' : 'bg-border text-fg-3')}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-6 py-2 bg-accent-muted border-b border-accent/20">
          <span className="text-xs font-medium text-accent">{selected.size} selected</span>
          <div className="h-3.5 w-px bg-accent/20" />

          {/* Move to tier */}
          <div className="relative">
            <button onClick={() => setBulkOpen(bulkOpen === 'tier' ? null : 'tier')}
              className="flex items-center gap-1 px-2.5 py-1 bg-card border border-border rounded text-xs text-fg-2 hover:text-fg transition-colors">
              Move to Tier <ChevronDown className="w-3 h-3" />
            </button>
            {bulkOpen === 'tier' && (
              <div className="absolute top-full mt-1 left-0 bg-card border border-border rounded-lg shadow-xl z-10 py-1 w-36">
                {['TIER_1','TIER_2','TIER_3','NONE'].map(t => (
                  <button key={t} onClick={() => bulkUpdate('target_tier', t)}
                    className="w-full text-left px-3 py-1.5 text-xs text-fg hover:bg-surface transition-colors">
                    {TIER_LABEL[t] === '—' ? 'No tier' : TIER_LABEL[t]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Update segment */}
          <div className="relative">
            <button onClick={() => setBulkOpen(bulkOpen === 'segment' ? null : 'segment')}
              className="flex items-center gap-1 px-2.5 py-1 bg-card border border-border rounded text-xs text-fg-2 hover:text-fg transition-colors">
              Update Segment <ChevronDown className="w-3 h-3" />
            </button>
            {bulkOpen === 'segment' && (
              <div className="absolute top-full mt-1 left-0 bg-card border border-border rounded-lg shadow-xl z-10 py-1 w-40">
                {segments.map(s => (
                  <button key={s.segment_name} onClick={() => bulkUpdate('segment', s.segment_name)}
                    className="w-full text-left px-3 py-1.5 text-xs text-fg hover:bg-surface transition-colors">
                    {s.segment_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Update state */}
          <div className="relative">
            <button onClick={() => setBulkOpen(bulkOpen === 'state' ? null : 'state')}
              className="flex items-center gap-1 px-2.5 py-1 bg-card border border-border rounded text-xs text-fg-2 hover:text-fg transition-colors">
              Update State <ChevronDown className="w-3 h-3" />
            </button>
            {bulkOpen === 'state' && (
              <div className="absolute top-full mt-1 left-0 bg-card border border-border rounded-lg shadow-xl z-10 py-1 w-44">
                {['NEW','ACTIVE','CONTACTED','RESPONDED','IN_OPPORTUNITY'].map(s => (
                  <button key={s} onClick={() => bulkUpdate('account_state', s)}
                    className="w-full text-left px-3 py-1.5 text-xs text-fg hover:bg-surface transition-colors">{s}</button>
                ))}
              </div>
            )}
          </div>

          <button onClick={bulkSuppress}
            className="px-2.5 py-1 bg-card border border-border rounded text-xs text-score-low hover:bg-score-low/10 transition-colors">
            Add to Suppression
          </button>
          <button onClick={bulkDelete}
            className="px-2.5 py-1 bg-card border border-border rounded text-xs text-score-low hover:bg-score-low/10 transition-colors flex items-center gap-1">
            <Trash2 className="w-3 h-3" /> Delete
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-fg-3 hover:text-fg transition-colors">
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-xs text-fg-3">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-8">
            <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center mb-3">
              <Building2 className="w-5 h-5 text-fg-3" />
            </div>
            <p className="text-sm font-medium text-fg mb-1">
              {search ? 'No accounts match your search' : activeTab === 'all' ? 'No accounts yet' : `No ${activeTab.replace('tier', 'Tier ')} accounts`}
            </p>
            <p className="text-xs text-fg-3 mb-4 max-w-xs">
              {activeTab === 'tier1' ? 'Add your top 50 dream accounts — signals on these auto-trigger HOT leads.' :
               activeTab === 'tier2' ? 'Add 200–300 strong-fit accounts — signals auto-trigger WARM leads.' :
               'Add companies manually or import from CSV.'}
            </p>
            <button onClick={() => setShowAdd(true)}
              className="px-4 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded-md hover:bg-accent-dim transition-colors">
              Add first account
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border-soft">
                <th className="w-10 px-4 py-2.5">
                  <button onClick={toggleAll} className="text-fg-3 hover:text-fg transition-colors">
                    {selected.size === filtered.length && filtered.length > 0
                      ? <CheckSquare className="w-4 h-4 text-accent" />
                      : <Square className="w-4 h-4" />}
                  </button>
                </th>
                {['Company', 'Segment', 'Tier', 'Country', 'State', 'Sponsorship', 'Last Activity', ''].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-fg-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(co => {
                const isSelected = selected.has(co.id)
                const segDef = segments.find(s => s.segment_name === co.segment)?.definition
                return (
                  <tr key={co.id}
                    className={cn('border-b border-border-soft transition-colors group',
                      isSelected ? 'bg-accent-muted/30' : 'hover:bg-surface/50')}>
                    <td className="w-10 px-4 py-3" onClick={e => { e.stopPropagation(); toggleSelect(co.id) }}>
                      <button className="text-fg-3 hover:text-accent transition-colors">
                        {isSelected ? <CheckSquare className="w-4 h-4 text-accent" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-3 py-3 cursor-pointer" onClick={() => router.push(`/accounts/${co.id}`)}>
                      <div className="text-xs font-semibold text-fg group-hover:text-accent transition-colors">{co.name}</div>
                      {co.website && <div className="text-xs text-fg-3 mt-0.5 truncate max-w-[160px]">{co.domain || co.website}</div>}
                    </td>
                    <td className="px-3 py-3">
                      {co.segment ? (
                        <span className="text-xs text-fg-2" title={segDef ?? co.segment}>{co.segment}</span>
                      ) : <span className="text-xs text-fg-3">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn('px-2 py-0.5 rounded text-xs font-medium', TIER_BADGE[co.target_tier] ?? 'bg-border text-fg-3')}>
                        {TIER_LABEL[co.target_tier] ?? co.target_tier}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-fg-2">{co.country ?? '—'}</td>
                    <td className="px-3 py-3">
                      <span className={cn('px-2 py-0.5 rounded text-xs', STATE_BADGE[co.account_state] ?? '')}>
                        {co.account_state}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-fg-2">{co.sponsorship_activity ?? '—'}</td>
                    <td className="px-3 py-3 text-xs text-fg-3">
                      {co.last_activity_at ? new Date(co.last_activity_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => router.push(`/accounts/${co.id}`)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-fg-3 hover:text-accent">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <AddCompanyModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={id => { setShowAdd(false); load(); router.push(`/accounts/${id}`) }}
        defaultTier={activeTab === 'tier1' ? 'TIER_1' : activeTab === 'tier2' ? 'TIER_2' : activeTab === 'tier3' ? 'TIER_3' : 'NONE'}
      />
    </div>
  )
}
