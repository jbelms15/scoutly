'use client'

import { useState } from 'react'
import { X, Loader2, MessageSquare } from 'lucide-react'

type Props = {
  leadId: string
  leadName: string
  onAdded: (sentiment: string) => void
  onClose: () => void
}

const SAMPLE_REPLIES = [
  { label: '✅ Interested', body: "Hi, thanks for reaching out. Yes, I'd love to learn more about what you're seeing for organisations like ours. Can we set up 30 minutes next week?" },
  { label: '⏰ Not now', body: "Thanks for the message. We're in the middle of a budget cycle right now — could you follow up with me in Q2? Happy to revisit then." },
  { label: '❌ Not fit', body: "Thanks for reaching out but we don't really invest in sponsorship measurement at this stage. Not the right fit for us." },
  { label: '🌴 OOO', body: "I'm currently out of office until 5 May. For urgent matters please contact john.doe@example.com. I'll respond on my return." },
]

export default function AddTestReplyModal({ leadId, leadName, onAdded, onClose }: Props) {
  const [body, setBody]       = useState('')
  const [subject, setSubject] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<{ sentiment: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setLoading(true)
    const res = await fetch(`/api/leads/${leadId}/add-reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, subject }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.success) {
      setResult({ sentiment: data.sentiment })
      onAdded(data.sentiment)
    }
  }

  const SENTIMENT_COLOR: Record<string, string> = {
    INTERESTED: 'text-score-high', NOT_NOW: 'text-warm', NOT_FIT: 'text-score-low',
    OOO: 'text-fg-3', UNSUBSCRIBE: 'text-score-low', NEUTRAL: 'text-fg-2',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-soft">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-fg">Add Test Reply — {leadName}</h2>
          </div>
          <button onClick={onClose} className="text-fg-3 hover:text-fg"><X className="w-4 h-4" /></button>
        </div>

        {result ? (
          <div className="p-6 text-center">
            <div className="text-3xl mb-3">{result.sentiment === 'INTERESTED' ? '🟢' : result.sentiment === 'NOT_NOW' ? '🟡' : result.sentiment === 'NOT_FIT' ? '🔴' : '⚪'}</div>
            <p className="text-sm font-semibold text-fg mb-1">Reply added</p>
            <p className={`text-sm font-bold mb-3 ${SENTIMENT_COLOR[result.sentiment] ?? 'text-fg-2'}`}>
              Classified as: {result.sentiment}
            </p>
            <p className="text-xs text-fg-3">Lead moved to Replies tab.</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 bg-accent text-sidebar text-xs font-bold rounded-lg hover:bg-accent-dim">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs text-fg-3 mb-2">Quick sample replies:</label>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_REPLIES.map(s => (
                  <button key={s.label} type="button" onClick={() => setBody(s.body)}
                    className="px-2.5 py-1 bg-surface border border-border rounded text-xs text-fg-2 hover:text-fg hover:border-accent/40 transition-colors">
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-fg-3 mb-1">Subject (optional)</label>
              <input value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="Re: Quick thought on..."
                className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block text-xs text-fg-3 mb-1">Reply body <span className="text-score-low">*</span></label>
              <textarea required value={body} onChange={e => setBody(e.target.value)} rows={5}
                placeholder="Paste or type the reply here..."
                className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={loading || !body.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-accent text-sidebar text-xs font-bold rounded-lg hover:bg-accent-dim disabled:opacity-60">
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {loading ? 'Classifying...' : 'Add Reply + Classify'}
              </button>
              <button type="button" onClick={onClose} className="px-4 py-2 bg-surface border border-border text-xs text-fg-2 rounded-lg hover:text-fg">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
