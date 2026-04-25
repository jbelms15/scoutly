'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ChevronLeft, Save, Loader2, Trash2, ShieldOff,
  ExternalLink, Users, Zap, Target,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useKBSegments } from '@/lib/hooks'
import { cn } from '@/lib/utils'

type Company = {
  id: string; name: string; website?: string; domain?: string
  linkedin_company_url?: string; industry?: string; size_range?: string
  country?: string; region?: string; segment?: string; target_tier: string
  account_state: string; sponsorship_activity?: string
  priority_sports?: string; priority_regions?: string; notes?: string
  last_activity_at?: string; created_at: string; updated_at: string
}

const STATE_OPTIONS = ['NEW','ACTIVE','CONTACTED','RESPONDED','IN_OPPORTUNITY','CUSTOMER','SUPPRESSED']
const ACTIVITY_OPTIONS = ['YES','LIKELY','UNCLEAR','NO','UNKNOWN']
const TIER_OPTIONS = [
  { value: 'NONE',   label: 'No tier' },
  { value: 'TIER_1', label: 'Tier 1 — Dream account' },
  { value: 'TIER_2', label: 'Tier 2 — Strong fit' },
  { value: 'TIER_3', label: 'Tier 3 — Watch list' },
]

function extractDomain(url: string): string {
  try { return new URL(url.includes('://') ? url : 'https://' + url).hostname.replace(/^www\./, '') }
  catch { return '' }
}

export default function CompanyDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { segments } = useKBSegments()

  const [company, setCompany] = useState<Company | null>(null)
  const [form, setForm] = useState<Partial<Company>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [leadCount, setLeadCount] = useState(0)
  const [signalCount, setSignalCount] = useState(0)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: co }, { count: lc }, { count: sc }] = await Promise.all([
        supabase.from('companies').select('*').eq('id', id).single(),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('company_id', id),
        supabase.from('company_signal_history').select('*', { count: 'exact', head: true }).eq('company_id', id),
      ])
      if (co) { setCompany(co); setForm(co) }
      setLeadCount(lc ?? 0)
      setSignalCount(sc ?? 0)
      setLoading(false)
    }
    load()
  }, [id])

  function f(key: keyof Company) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const val = e.target.value
      setForm(prev => {
        const next = { ...prev, [key]: val }
        if (key === 'website' && val) next.domain = extractDomain(val)
        return next
      })
    }
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('companies').update(form).eq('id', id)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleSuppress() {
    if (!company) return
    if (!confirm(`Add ${company.name} to the suppression list?`)) return
    const supabase = createClient()
    await supabase.from('suppression_list').insert({
      suppression_type: 'DO_NOT_CONTACT', match_type: 'COMPANY_NAME',
      match_value: company.name, reason: 'Manually suppressed from account page', added_by: 'user',
    })
    await supabase.from('companies').update({ account_state: 'SUPPRESSED' }).eq('id', id)
    setForm(f => ({ ...f, account_state: 'SUPPRESSED' }))
  }

  async function handleDelete() {
    if (!confirm(`Delete ${company?.name}? This cannot be undone.`)) return
    const supabase = createClient()
    await supabase.from('companies').delete().eq('id', id)
    router.push('/accounts')
  }

  const input = (key: keyof Company, label: string, placeholder = '') => (
    <div key={key}>
      <label className="block text-xs text-fg-3 mb-1">{label}</label>
      <input value={(form[key] as string) ?? ''} onChange={f(key)} placeholder={placeholder}
        className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent transition-colors" />
    </div>
  )

  if (loading) return <div className="flex items-center justify-center h-64 text-xs text-fg-3">Loading...</div>
  if (!company) return <div className="flex items-center justify-center h-64 text-xs text-fg-3">Company not found.</div>

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border-soft">
        <button onClick={() => router.push('/accounts')} className="text-fg-3 hover:text-fg transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-fg truncate">{company.name}</h1>
          {company.website && (
            <a href={company.website} target="_blank" rel="noopener"
              className="text-xs text-fg-3 hover:text-accent transition-colors flex items-center gap-1 w-fit">
              {company.domain || company.website} <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded-md hover:bg-accent-dim disabled:opacity-60 transition-colors">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        <div className="flex gap-0 h-full">
          {/* Left column — 60% */}
          <div className="flex-[3] p-6 border-r border-border-soft space-y-5">
            <section>
              <h2 className="text-xs font-semibold text-fg-2 uppercase tracking-wide mb-3">Company Info</h2>
              <div className="grid grid-cols-2 gap-3">
                {input('name', 'Company Name')}
                {input('website', 'Website', 'https://')}
                {input('domain', 'Domain', 'auto-filled')}
                {input('linkedin_company_url', 'LinkedIn URL', 'https://linkedin.com/company/...')}
                {input('industry', 'Industry')}
                <div>
                  <label className="block text-xs text-fg-3 mb-1">Size</label>
                  <select value={form.size_range ?? ''} onChange={f('size_range')}
                    className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent transition-colors">
                    <option value="">Unknown</option>
                    {['1–10','11–50','51–200','201–500','501–1000','1000+'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                {input('country', 'Country')}
                {input('region', 'Region')}
              </div>
            </section>

            <section>
              <h2 className="text-xs font-semibold text-fg-2 uppercase tracking-wide mb-3">Classification</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-fg-3 mb-1">Segment</label>
                  <select value={form.segment ?? ''} onChange={f('segment')}
                    className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent transition-colors">
                    <option value="">Unknown</option>
                    {segments.map(s => (
                      <option key={s.segment_name} value={s.segment_name} title={s.definition}>{s.segment_name}</option>
                    ))}
                  </select>
                  {form.segment && (
                    <p className="text-xs text-fg-3 mt-1">{segments.find(s => s.segment_name === form.segment)?.definition}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-fg-3 mb-1">Target Tier</label>
                  <select value={form.target_tier ?? 'NONE'} onChange={f('target_tier')}
                    className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent transition-colors">
                    {TIER_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-fg-3 mb-1">Account State</label>
                  <select value={form.account_state ?? 'NEW'} onChange={f('account_state')}
                    className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent transition-colors">
                    {STATE_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-fg-3 mb-1">Sponsorship Activity</label>
                  <select value={form.sponsorship_activity ?? 'UNKNOWN'} onChange={f('sponsorship_activity')}
                    className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent transition-colors">
                    {ACTIVITY_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xs font-semibold text-fg-2 uppercase tracking-wide mb-3">Notes</h2>
              <textarea value={form.notes ?? ''} onChange={f('notes')} rows={5}
                placeholder="Add notes about this account — deal context, key contacts, last conversation..."
                className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg placeholder:text-fg-3 focus:outline-none focus:border-accent transition-colors resize-none" />
            </section>
          </div>

          {/* Right column — 40% */}
          <div className="flex-[2] p-6 space-y-4">
            {/* Quick stats */}
            <div className="bg-surface border border-border rounded-lg p-4">
              <h2 className="text-xs font-semibold text-fg-2 mb-3">Quick Stats</h2>
              <div className="space-y-2">
                {[
                  { icon: Users,  label: 'Total leads',      value: leadCount,   note: 'Populates in Phase 4' },
                  { icon: Zap,    label: 'Signals fired',    value: signalCount, note: 'Populates in Phase 10' },
                  { icon: Target, label: 'Active sequences', value: 0,           note: 'Populates in Phase 8' },
                ].map(({ icon: Icon, label, value, note }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-fg-3" />
                      <span className="text-xs text-fg-2">{label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-fg">{value}</span>
                      {value === 0 && <p className="text-xs text-fg-3">{note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Signal history placeholder */}
            <div className="bg-surface border border-border rounded-lg p-4">
              <h2 className="text-xs font-semibold text-fg-2 mb-2">Signal History</h2>
              <div className="flex items-center justify-center h-16">
                <p className="text-xs text-fg-3 text-center">Signal history will appear here once signals fire on this account.</p>
              </div>
            </div>

            {/* Leads placeholder */}
            <div className="bg-surface border border-border rounded-lg p-4">
              <h2 className="text-xs font-semibold text-fg-2 mb-2">Leads at this Account</h2>
              <div className="flex items-center justify-center h-16">
                <p className="text-xs text-fg-3 text-center">Leads will appear here once created in Phase 4.</p>
              </div>
            </div>

            {/* Metadata */}
            <div className="text-xs text-fg-3 space-y-1">
              <p>Added {new Date(company.created_at).toLocaleDateString()}</p>
              <p>Updated {new Date(company.updated_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-t border-border-soft bg-card">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-accent text-sidebar text-xs font-bold rounded-lg hover:bg-accent-dim disabled:opacity-60 transition-colors">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Changes'}
        </button>
        <button onClick={handleSuppress}
          className={cn('flex items-center gap-1.5 px-4 py-2 bg-surface border border-border text-xs text-fg-2 rounded-lg hover:text-score-low hover:border-score-low/30 transition-colors',
            form.account_state === 'SUPPRESSED' && 'opacity-50 cursor-not-allowed')}>
          <ShieldOff className="w-3.5 h-3.5" />
          {form.account_state === 'SUPPRESSED' ? 'Already Suppressed' : 'Add to Suppression'}
        </button>
        <button onClick={handleDelete}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-surface border border-border text-xs text-score-low rounded-lg hover:bg-score-low/10 transition-colors">
          <Trash2 className="w-3.5 h-3.5" /> Delete Company
        </button>
      </div>
    </div>
  )
}
