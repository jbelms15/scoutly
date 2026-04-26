'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Loader2, AlertTriangle, CheckCircle, Link2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useKBSegments } from '@/lib/hooks'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  onClose: () => void
  onCreated: () => void
  prefillCompany?: { id: string; name: string }
}

type Result = {
  action: 'CREATED' | 'DUPLICATE' | 'SUPPRESSED' | 'INVALID'
  message: string
  lead_id?: string | null
}

export default function ManualLeadModal({ open, onClose, onCreated, prefillCompany }: Props) {
  const { segments } = useKBSegments()
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [companySuggestions, setCompanySuggestions] = useState<{ id: string; name: string }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const companyRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({
    linkedin_url: '',
    first_name: '',
    last_name: '',
    title: '',
    email: '',
    company_name: prefillCompany?.name ?? '',
    company_id: prefillCompany?.id ?? '',
    source_type: 'MANUAL_ENTRY',
    source_detail: '',
    source_signal: '',
    source_warmth: 'UNKNOWN',
    segment: '',
    internal_notes: '',
  })

  useEffect(() => {
    if (prefillCompany) {
      setForm(f => ({ ...f, company_name: prefillCompany.name, company_id: prefillCompany.id }))
    }
  }, [prefillCompany])

  async function searchCompanies(q: string) {
    if (q.length < 2) { setCompanySuggestions([]); setShowSuggestions(false); return }
    const { data } = await createClient().from('companies').select('id, name').ilike('name', `%${q}%`).limit(8)
    setCompanySuggestions(data ?? [])
    setShowSuggestions(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setResult(null)

    const res = await fetch('/api/intake/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw: {
          first_name: form.first_name || undefined,
          last_name: form.last_name || undefined,
          title: form.title || undefined,
          linkedin_url: form.linkedin_url || undefined,
          email: form.email || undefined,
          company_name: form.company_name || undefined,
          company_id: form.company_id || undefined,
          segment: form.segment || undefined,
          internal_notes: form.internal_notes || undefined,
        },
        source: {
          source_type: form.source_type,
          source_detail: form.source_detail || undefined,
          source_signal: form.source_signal || undefined,
          source_warmth: form.source_warmth,
        },
      }),
    })

    const data = await res.json()
    setSaving(false)
    setResult(data)
    if (data.action === 'CREATED') onCreated()
  }

  function handleAddAnother() {
    setResult(null)
    setForm(f => ({
      ...f,
      linkedin_url: '', first_name: '', last_name: '', title: '', email: '',
      source_detail: '', source_signal: '', internal_notes: '',
      company_name: prefillCompany?.name ?? '',
      company_id: prefillCompany?.id ?? '',
    }))
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50" onClick={onClose} />
      <div className="w-full max-w-md bg-card border-l border-border flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-soft">
          <h2 className="text-sm font-semibold text-fg">Add Lead Manually</h2>
          <button onClick={onClose} className="text-fg-3 hover:text-fg"><X className="w-4 h-4" /></button>
        </div>

        {/* Result banner */}
        {result && (
          <div className={cn('px-6 py-3 text-xs font-medium border-b',
            result.action === 'CREATED'    && 'bg-score-high/10 border-score-high/20 text-score-high',
            result.action === 'DUPLICATE'  && 'bg-warm/10 border-warm/20 text-warm',
            result.action === 'SUPPRESSED' && 'bg-score-low/10 border-score-low/20 text-score-low',
            result.action === 'INVALID'    && 'bg-score-low/10 border-score-low/20 text-score-low',
          )}>
            <div className="flex items-center gap-2">
              {result.action === 'CREATED' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {result.message}
            </div>
            {result.action === 'CREATED' && (
              <button onClick={handleAddAnother} className="mt-2 underline text-xs">Add another?</button>
            )}
            {result.action === 'DUPLICATE' && result.lead_id && (
              <a href={`/queue`} className="mt-2 underline text-xs block">View in Queue</a>
            )}
          </div>
        )}

        {/* Form */}
        <form id="manual-lead-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs text-fg-3 mb-1">LinkedIn URL <span className="text-accent">↑ Start here</span></label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-3" />
              <input value={form.linkedin_url} onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))}
                placeholder="https://linkedin.com/in/..."
                className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-fg-3 mb-1">First Name <span className="text-score-low">*</span></label>
              <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block text-xs text-fg-3 mb-1">Last Name <span className="text-score-low">*</span></label>
              <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-fg-3 mb-1">Title</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block text-xs text-fg-3 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
            </div>
          </div>

          {/* Company with autocomplete */}
          <div ref={companyRef} className="relative">
            <label className="block text-xs text-fg-3 mb-1">Company Name <span className="text-score-low">*</span></label>
            <input value={form.company_name}
              onChange={e => { setForm(f => ({ ...f, company_name: e.target.value, company_id: '' })); searchCompanies(e.target.value) }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Type to search existing companies..."
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
            {showSuggestions && companySuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-10 py-1">
                {companySuggestions.map(co => (
                  <button key={co.id} type="button"
                    onMouseDown={() => { setForm(f => ({ ...f, company_name: co.name, company_id: co.id })); setShowSuggestions(false) }}
                    className="w-full text-left px-3 py-2 text-xs text-fg hover:bg-surface transition-colors">
                    {co.name}
                  </button>
                ))}
              </div>
            )}
            {form.company_id && <p className="text-xs text-score-high mt-1">✓ Linked to existing account</p>}
          </div>

          <div className="border-t border-border-soft pt-3 space-y-3">
            <p className="text-xs font-medium text-fg-2">Source Context</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-fg-3 mb-1">Source Type</label>
                <select value={form.source_type} onChange={e => setForm(f => ({ ...f, source_type: e.target.value }))}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent">
                  {['MANUAL_ENTRY','CSV_IMPORT','COWORK_EXPORT','LEMLIST_WATCHER','GOOGLE_ALERTS','LINKEDIN_JOBS','SCOUTLY_AGENT'].map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-fg-3 mb-1">Warmth</label>
                <select value={form.source_warmth} onChange={e => setForm(f => ({ ...f, source_warmth: e.target.value }))}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent">
                  <option value="WARM">Warm</option>
                  <option value="COLD">Cold</option>
                  <option value="UNKNOWN">Unknown</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-fg-3 mb-1">Why are you adding this person?</label>
              <input value={form.source_signal} onChange={e => setForm(f => ({ ...f, source_signal: e.target.value }))}
                placeholder="e.g. Commented on a post about sponsorship ROI"
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block text-xs text-fg-3 mb-1">Internal Notes</label>
              <textarea value={form.internal_notes} onChange={e => setForm(f => ({ ...f, internal_notes: e.target.value }))} rows={2}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border-soft">
          <button form="manual-lead-form" type="submit"
            disabled={saving || result?.action === 'CREATED'}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-accent text-sidebar text-sm font-bold rounded-lg hover:bg-accent-dim disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Checking...' : 'Add Lead'}
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-surface border border-border text-sm text-fg-2 rounded-lg hover:text-fg">Cancel</button>
        </div>
      </div>
    </div>
  )
}
