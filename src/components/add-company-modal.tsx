'use client'

import { useState } from 'react'
import { X, Loader2, AlertTriangle, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useKBSegments } from '@/lib/hooks'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  onClose: () => void
  onCreated: (id: string) => void
  defaultTier?: string
}

function extractDomain(url: string): string {
  try {
    const u = url.includes('://') ? url : 'https://' + url
    return new URL(u).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

export default function AddCompanyModal({ open, onClose, onCreated, defaultTier = 'NONE' }: Props) {
  const { segments } = useKBSegments()
  const [saving, setSaving] = useState(false)
  const [duplicate, setDuplicate] = useState<{ id: string; name: string } | null>(null)
  const [form, setForm] = useState({
    name: '', website: '', domain: '', linkedin_company_url: '',
    segment: '', target_tier: defaultTier, country: '', industry: '', size_range: '',
  })

  function f(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const val = e.target.value
      setForm(prev => {
        const next = { ...prev, [key]: val }
        if (key === 'website' && val) next.domain = extractDomain(val)
        return next
      })
    }
  }

  async function checkDuplicate(name: string, domain: string) {
    const supabase = createClient()
    const conditions: string[] = []
    if (name) conditions.push(`name.ilike.${name}`)
    if (domain) conditions.push(`domain.ilike.${domain}`)
    if (!conditions.length) return null
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .or(conditions.join(','))
      .limit(1)
    return data?.[0] ?? null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setDuplicate(null)

    const dupe = await checkDuplicate(form.name, form.domain)
    if (dupe) {
      setDuplicate(dupe)
      setSaving(false)
      return
    }

    const supabase = createClient()
    const { data, error } = await supabase
      .from('companies')
      .insert({ ...form, account_state: 'NEW' })
      .select('id')
      .single()

    setSaving(false)
    if (!error && data) {
      setForm({ name: '', website: '', domain: '', linkedin_company_url: '', segment: '', target_tier: defaultTier, country: '', industry: '', size_range: '' })
      onCreated(data.id)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/50" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="w-full max-w-md bg-card border-l border-border flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-soft">
          <h2 className="text-sm font-semibold text-fg">Add Company</h2>
          <button onClick={onClose} className="text-fg-3 hover:text-fg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Duplicate warning */}
          {duplicate && (
            <div className="flex items-start gap-2 p-3 bg-warm/10 border border-warm/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-warm shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-warm">Company already exists</p>
                <p className="text-xs text-fg-3 mt-0.5">
                  <strong>{duplicate.name}</strong> is already in your accounts.{' '}
                  <a href={`/accounts/${duplicate.id}`} className="text-accent underline inline-flex items-center gap-1">
                    Edit it instead <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-fg-3 mb-1">Company Name <span className="text-score-low">*</span></label>
            <input required value={form.name} onChange={f('name')}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:border-accent transition-colors" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-fg-3 mb-1">Website</label>
              <input value={form.website} onChange={f('website')} placeholder="https://"
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent transition-colors" />
            </div>
            <div>
              <label className="block text-xs text-fg-3 mb-1">Domain</label>
              <input value={form.domain} onChange={f('domain')} placeholder="auto-filled from website"
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-fg placeholder:text-fg-3 focus:outline-none focus:border-accent transition-colors" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-fg-3 mb-1">LinkedIn Company URL</label>
            <input value={form.linkedin_company_url} onChange={f('linkedin_company_url')} placeholder="https://linkedin.com/company/..."
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent transition-colors" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-fg-3 mb-1">
                Segment
                {form.segment && (
                  <span className="ml-1 text-fg-3 font-normal">
                    — {segments.find(s => s.segment_name === form.segment)?.definition?.slice(0, 40)}…
                  </span>
                )}
              </label>
              <select value={form.segment} onChange={f('segment')}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent transition-colors">
                <option value="">Unknown</option>
                {segments.map(s => (
                  <option key={s.segment_name} value={s.segment_name} title={s.definition}>
                    {s.segment_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-fg-3 mb-1">Target Tier</label>
              <select value={form.target_tier} onChange={f('target_tier')}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent transition-colors">
                <option value="NONE">No tier</option>
                <option value="TIER_1">Tier 1 — Dream accounts</option>
                <option value="TIER_2">Tier 2 — Strong fit</option>
                <option value="TIER_3">Tier 3 — Watch list</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-fg-3 mb-1">Country</label>
              <input value={form.country} onChange={f('country')}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent transition-colors" />
            </div>
            <div>
              <label className="block text-xs text-fg-3 mb-1">Industry</label>
              <input value={form.industry} onChange={f('industry')}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent transition-colors" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-fg-3 mb-1">Company Size</label>
            <select value={form.size_range} onChange={f('size_range')}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent transition-colors">
              <option value="">Unknown</option>
              {['1–10','11–50','51–200','201–500','501–1000','1000+'].map(s => (
                <option key={s} value={s}>{s} employees</option>
              ))}
            </select>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-border-soft">
          <button type="button" onClick={() => { const form = document.querySelector('form'); form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) }}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-accent text-sidebar text-sm font-bold rounded-lg hover:bg-accent-dim disabled:opacity-60 transition-colors">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Adding...' : 'Add Company'}
          </button>
          <button type="button" onClick={onClose}
            className="px-4 py-2 bg-surface border border-border text-sm text-fg-2 rounded-lg hover:text-fg transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
