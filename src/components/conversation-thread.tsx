'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type Message = {
  id: string; sent_at: string; direction: string; channel: string
  subject?: string; body: string; sentiment?: string
}

const SENTIMENT_BADGE: Record<string, string> = {
  INTERESTED:  'bg-score-high/10 text-score-high',
  NOT_NOW:     'bg-warm/10 text-warm',
  NOT_FIT:     'bg-score-low/10 text-score-low',
  OOO:         'bg-border text-fg-3',
  UNSUBSCRIBE: 'bg-score-low/10 text-score-low',
  NEUTRAL:     'bg-border text-fg-2',
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function ConversationThread({ leadId }: { leadId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    const supabase = createClient()
    supabase.from('conversations')
      .select('*').eq('lead_id', leadId)
      .order('sent_at', { ascending: true })
      .then(({ data }) => { setMessages(data ?? []); setLoading(false) })
  }, [leadId])

  if (loading) return <div className="text-xs text-fg-3 py-2">Loading thread...</div>
  if (messages.length === 0) return <div className="text-xs text-fg-3 py-2">No messages yet.</div>

  return (
    <div className="space-y-3">
      {messages.map(msg => {
        const isSent = msg.direction === 'SENT'
        const isExpanded = expanded.has(msg.id)
        const preview = msg.body.slice(0, 200)
        const hasMore = msg.body.length > 200

        return (
          <div key={msg.id} className={cn('border rounded-lg p-3', isSent ? 'border-border-soft bg-card' : 'border-accent/20 bg-accent-muted/20')}>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs font-semibold text-fg-2">
                {isSent ? '📤 SENT' : '📥 RECEIVED'}
              </span>
              <span className="text-xs text-fg-3">{timeAgo(msg.sent_at)}</span>
              {msg.sentiment && (
                <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', SENTIMENT_BADGE[msg.sentiment] ?? 'bg-border text-fg-3')}>
                  {msg.sentiment}
                </span>
              )}
              {msg.channel !== 'EMAIL' && (
                <span className="text-xs text-fg-3">{msg.channel}</span>
              )}
            </div>
            {msg.subject && (
              <p className="text-xs font-medium text-fg mb-1">Re: {msg.subject}</p>
            )}
            <p className="text-xs text-fg-2 leading-relaxed whitespace-pre-wrap">
              {isExpanded ? msg.body : preview}
              {hasMore && !isExpanded && '...'}
            </p>
            {hasMore && (
              <button onClick={() => setExpanded(e => { const n = new Set(e); n.has(msg.id) ? n.delete(msg.id) : n.add(msg.id); return n })}
                className="text-xs text-accent hover:underline mt-1">
                {isExpanded ? 'Show less' : 'Show full message'}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
