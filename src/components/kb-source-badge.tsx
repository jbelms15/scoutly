import { cn } from '@/lib/utils'

export type KBSource =
  | 'BENEDIKT_TRAINING_DECK_2026_04_27'
  | 'SHIKENSO_WEBSITE'
  | 'ARWIN_QUOTE'
  | 'JOANNA_INPUT'
  | 'AI_INFERRED'
  | 'PENDING_CONFIRMATION'

const SOURCE_CONFIG: Record<string, { label: string; className: string; icon: string }> = {
  BENEDIKT_TRAINING_DECK_2026_04_27: { label: 'Benedikt Deck',           className: 'bg-score-high/10 text-score-high',   icon: '📘' },
  SHIKENSO_WEBSITE:                  { label: 'Shikenso Website',        className: 'bg-accent/10 text-accent',           icon: '🌐' },
  ARWIN_QUOTE:                       { label: 'Arwin Quote',             className: 'bg-violet-500/10 text-violet-400',   icon: '💬' },
  JOANNA_INPUT:                      { label: 'Joanna Input',            className: 'bg-border text-fg-2',                icon: '✏️' },
  AI_INFERRED:                       { label: 'AI Inferred — Review',    className: 'bg-warm/10 text-warm',               icon: '🤖' },
  PENDING_CONFIRMATION:              { label: 'Pending Confirmation',    className: 'bg-yellow-500/10 text-yellow-400',   icon: '⏳' },
}

export function needsReviewFlag(source?: string | null): boolean {
  return source === 'AI_INFERRED' || source === 'PENDING_CONFIRMATION'
}

export default function KBSourceBadge({ source, className }: { source?: string | null; className?: string }) {
  if (!source) return null
  const cfg = SOURCE_CONFIG[source] ?? { label: source, className: 'bg-border text-fg-3', icon: '?' }
  return (
    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap', cfg.className, className)}>
      <span className="text-xs leading-none">{cfg.icon}</span>
      {cfg.label}
    </span>
  )
}
