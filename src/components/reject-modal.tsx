'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'

const REASON_TAGS = [
  { value: 'TOO_SMALL',        label: 'Too small — company size below threshold' },
  { value: 'WRONG_REGION',     label: 'Wrong region — outside target markets' },
  { value: 'NO_SPONSORSHIP',   label: 'No sponsorship activity — no evidence of deals' },
  { value: 'WRONG_SEGMENT',    label: 'Wrong segment — not Rights Holder/Brand/Agency/Club' },
  { value: 'ALREADY_CUSTOMER', label: 'Already a customer' },
  { value: 'BAD_FIT_TITLE',    label: 'Wrong title — not a decision maker' },
  { value: 'BAD_TIMING',       label: 'Bad timing — too early or wrong moment' },
  { value: 'OTHER',            label: 'Other — see notes' },
]

type Props = {
  leadName: string
  onConfirm: (reasonTag: string, notes: string) => Promise<void>
  onClose: () => void
}

export default function RejectModal({ leadName, onConfirm, onClose }: Props) {
  const [reasonTag, setReasonTag] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    if (!reasonTag) return
    setLoading(true)
    await onConfirm(reasonTag, notes)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-fg">Reject Lead</h2>
          <button onClick={onClose} className="text-fg-3 hover:text-fg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-fg-2 mb-4">
          Rejecting <strong>{leadName}</strong>. This will be logged for scoring improvement.
        </p>

        <div className="mb-3">
          <label className="block text-xs text-fg-3 mb-2">Reason <span className="text-score-low">*</span></label>
          <div className="space-y-1.5">
            {REASON_TAGS.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  name="reason"
                  value={value}
                  checked={reasonTag === value}
                  onChange={() => setReasonTag(value)}
                  className="accent-accent"
                />
                <span className={`text-xs transition-colors ${reasonTag === value ? 'text-fg' : 'text-fg-2 group-hover:text-fg'}`}>
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-xs text-fg-3 mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Additional context..."
            className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg placeholder:text-fg-3 focus:outline-none focus:border-accent resize-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={!reasonTag || loading}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-score-low text-white text-xs font-bold rounded-lg hover:bg-score-low/80 disabled:opacity-50 transition-colors"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {loading ? 'Rejecting...' : 'Confirm Reject'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface border border-border text-xs text-fg-2 rounded-lg hover:text-fg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
