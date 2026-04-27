'use client'

import { useState } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import { useKBSegments } from '@/lib/hooks'

type Lead = {
  id: string
  segment?: string
  priority?: string
  recommended_campaign?: string
  recommended_product?: string
  internal_notes?: string
}

type Props = {
  lead: Lead
  onSave: (data: Partial<Lead>) => Promise<void>
  onSaveAndApprove: (data: Partial<Lead>) => Promise<void>
  onClose: () => void
}

export default function EditLeadPanel({ lead, onSave, onSaveAndApprove, onClose }: Props) {
  const { segments } = useKBSegments()
  const [form, setForm] = useState({
    segment:              lead.segment ?? '',
    priority:             lead.priority ?? '',
    recommended_campaign: lead.recommended_campaign ?? '',
    recommended_product:  lead.recommended_product ?? '',
    internal_notes:       lead.internal_notes ?? '',
  })
  const [saving, setSaving]          = useState(false)
  const [savingApprove, setSavingApprove] = useState(false)

  function f(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50" onClick={onClose} />
      <div className="w-full max-w-sm bg-card border-l border-border flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-soft">
          <h2 className="text-sm font-semibold text-fg">Edit Lead</h2>
          <button onClick={onClose} className="text-fg-3 hover:text-fg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-xs text-fg-3 mb-1">Segment</label>
            <select value={form.segment} onChange={f('segment')}
              className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent">
              <option value="">Unknown</option>
              {segments.map(s => <option key={s.segment_name} value={s.segment_name}>{s.segment_name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-fg-3 mb-1">Priority Override</label>
            <select value={form.priority} onChange={f('priority')}
              className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent">
              <option value="">Keep Claude score</option>
              <option value="HOT">🔴 HOT — Force promote</option>
              <option value="WARM">🟡 WARM</option>
              <option value="COLD">🔵 COLD</option>
            </select>
            {form.priority && <p className="text-xs text-warm mt-1">Manual override will be logged</p>}
          </div>

          <div>
            <label className="block text-xs text-fg-3 mb-1">Recommended Campaign</label>
            <input value={form.recommended_campaign} onChange={f('recommended_campaign')}
              placeholder="e.g. Rights Holders Outbound EU"
              className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
          </div>

          <div>
            <label className="block text-xs text-fg-3 mb-1">Recommended Product</label>
            <select value={form.recommended_product} onChange={f('recommended_product')}
              className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent">
              <option value="">Keep Claude recommendation</option>
              <option value="Sports">Sports</option>
              <option value="Esports">Esports</option>
              <option value="Campaign">Campaign</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-fg-3 mb-1">Internal Notes</label>
            <textarea value={form.internal_notes} onChange={f('internal_notes')} rows={4}
              placeholder="Notes visible only inside Scoutly..."
              className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg placeholder:text-fg-3 focus:outline-none focus:border-accent resize-none" />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border-soft flex flex-col gap-2">
          <button
            onClick={async () => { setSavingApprove(true); await onSaveAndApprove(form); setSavingApprove(false) }}
            disabled={savingApprove}
            className="w-full flex items-center justify-center gap-2 py-2 bg-accent text-sidebar text-sm font-bold rounded-lg hover:bg-accent-dim disabled:opacity-60"
          >
            {savingApprove && <Loader2 className="w-4 h-4 animate-spin" />}
            Save & Approve
          </button>
          <button
            onClick={async () => { setSaving(true); await onSave(form); setSaving(false) }}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2 bg-surface border border-border text-sm text-fg-2 rounded-lg hover:text-fg disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Only'}
          </button>
        </div>
      </div>
    </div>
  )
}
