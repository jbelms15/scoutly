'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, CheckSquare, Square, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

type QualSuggestions = {
  budget_signal?: boolean; budget_notes?: string
  decision_maker?: boolean; decision_maker_notes?: string
  pain_identified?: boolean; pain_notes?: string
  timeline_indicated?: boolean; timeline_notes?: string
  competitor_in_play?: string | null; competitor_notes?: string
  handoff_notes?: string; qualification_status?: string
}

type Props = {
  leadId: string
  leadName: string
  companyName: string
  onSaved: () => void
  onClose: () => void
}

const BANT_FIELDS = [
  { key: 'budget_signal',      label: 'Budget signal',      notesKey: 'budget_notes' },
  { key: 'decision_maker',     label: 'Decision maker',     notesKey: 'decision_maker_notes' },
  { key: 'pain_identified',    label: 'Pain identified',    notesKey: 'pain_notes' },
  { key: 'timeline_indicated', label: 'Timeline indicated', notesKey: 'timeline_notes' },
] as const

export default function QualificationCard({ leadId, leadName, companyName, onSaved, onClose }: Props) {
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [suggestions, setSuggestions] = useState<QualSuggestions>({})
  const [latestReply, setLatestReply] = useState('')
  const [form, setForm]             = useState<QualSuggestions>({})
  const [ae, setAe]                 = useState('')
  const [status, setStatus]         = useState<'QUALIFIED' | 'NURTURE' | 'NOT_QUALIFIED'>('QUALIFIED')
  const [error, setError]           = useState('')

  useEffect(() => {
    fetch(`/api/leads/${leadId}/qualify`)
      .then(r => r.json())
      .then(data => {
        if (data.suggestions) {
          setSuggestions(data.suggestions)
          setForm(data.suggestions)
          setStatus(data.suggestions.qualification_status ?? 'QUALIFIED')
        }
        if (data.latest_reply) setLatestReply(data.latest_reply)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [leadId])

  function toggle(key: keyof QualSuggestions) {
    setForm(f => ({ ...f, [key]: !f[key] }))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const res = await fetch(`/api/leads/${leadId}/qualify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, suggested_ae: ae, qualification_status: status }),
    })
    const data = await res.json()
    setSaving(false)
    if (data.success) onSaved()
    else setError(data.error ?? 'Save failed')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-soft shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-fg">Qualify: {leadName} · {companyName}</h2>
            <p className="text-xs text-fg-3 mt-0.5">Review Claude's signals, edit as needed, then push to HubSpot.</p>
          </div>
          <button onClick={onClose} className="text-fg-3 hover:text-fg shrink-0 ml-4"><X className="w-4 h-4" /></button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center gap-2 text-xs text-fg-3">
            <Loader2 className="w-5 h-5 animate-spin text-accent" />
            Claude is generating qualification suggestions...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Latest reply */}
            {latestReply && (
              <div className="bg-surface border border-border rounded-lg p-4">
                <p className="text-xs font-semibold text-fg-2 mb-2">📨 Latest Reply</p>
                <p className="text-xs text-fg-2 italic">"{latestReply}"</p>
              </div>
            )}

            {/* BANT checkboxes */}
            <div>
              <p className="text-xs font-semibold text-fg-2 mb-3">🤖 Claude's qualification signals</p>
              <div className="space-y-3">
                {BANT_FIELDS.map(({ key, label, notesKey }) => {
                  const checked = !!form[key]
                  const notes = form[notesKey] as string | undefined
                  return (
                    <div key={key} className="flex gap-3">
                      <button onClick={() => toggle(key)} className="shrink-0 mt-0.5">
                        {checked
                          ? <CheckSquare className="w-4 h-4 text-accent" />
                          : <Square className="w-4 h-4 text-fg-3" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-xs font-medium', checked ? 'text-fg' : 'text-fg-3')}>{label}</p>
                        {notes && <p className="text-xs text-fg-3 mt-0.5 italic">"{notes}"</p>}
                      </div>
                    </div>
                  )
                })}
                {/* Competitor */}
                <div className="flex gap-3">
                  <button onClick={() => toggle('competitor_in_play')} className="shrink-0 mt-0.5">
                    {form.competitor_in_play
                      ? <CheckSquare className="w-4 h-4 text-warm" />
                      : <Square className="w-4 h-4 text-fg-3" />}
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-fg-3 mb-1">Competitor in play</p>
                    <input
                      value={typeof form.competitor_in_play === 'string' ? form.competitor_in_play : ''}
                      onChange={e => setForm(f => ({ ...f, competitor_in_play: e.target.value || null }))}
                      placeholder="Competitor name if any..."
                      className="w-full bg-surface border border-border rounded px-2 py-1 text-xs text-fg focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Suggested AE */}
            <div>
              <label className="block text-xs text-fg-3 mb-1">Suggested AE</label>
              <input value={ae} onChange={e => setAe(e.target.value)}
                placeholder="e.g. Benedikt"
                className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
            </div>

            {/* Handoff notes */}
            <div>
              <label className="block text-xs text-fg-3 mb-1">Handoff Notes for AE</label>
              <textarea
                value={form.handoff_notes ?? ''}
                onChange={e => setForm(f => ({ ...f, handoff_notes: e.target.value }))}
                rows={6}
                className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none"
              />
            </div>

            {/* Qualification status */}
            <div>
              <p className="text-xs text-fg-3 mb-2">Qualification Status</p>
              <div className="flex gap-2">
                {([
                  { value: 'QUALIFIED',     label: '✅ Qualified',         color: 'border-score-high text-score-high bg-score-high/10' },
                  { value: 'NURTURE',       label: '🔄 Nurture',           color: 'border-warm text-warm bg-warm/10' },
                  { value: 'NOT_QUALIFIED', label: '❌ Not Qualified',     color: 'border-score-low text-score-low bg-score-low/10' },
                ] as const).map(opt => (
                  <button key={opt.value} onClick={() => setStatus(opt.value)}
                    className={cn('flex-1 py-2 rounded-lg border text-xs font-semibold transition-colors',
                      status === opt.value ? opt.color : 'border-border text-fg-3 bg-surface hover:border-border/80')}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-xs text-score-low">{error}</p>}
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-border-soft shrink-0">
          <button onClick={handleSave} disabled={saving || loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-accent text-sidebar text-sm font-bold rounded-lg hover:bg-accent-dim disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {saving ? 'Saving...' : status === 'QUALIFIED' ? 'Save & Push to HubSpot (placeholder)' : 'Save Qualification'}
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-surface border border-border text-sm text-fg-2 rounded-lg hover:text-fg">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
