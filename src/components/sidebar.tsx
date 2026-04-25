'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Target,
  Building2,
  Radio,
  Mail,
  BarChart3,
  Settings,
  Sparkles,
  ChevronUp,
  Send,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/queue',        label: 'Queue',        icon: Target },
  { href: '/accounts',     label: 'Accounts',     icon: Building2 },
  { href: '/signals',      label: 'Signals',      icon: Radio },
  { href: '/copy-studio',  label: 'Copy Studio',  icon: Mail },
  { href: '/pipeline',     label: 'Pipeline',     icon: BarChart3 },
  { href: '/settings',     label: 'Settings',     icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [agentOpen, setAgentOpen] = useState(false)
  const [agentInput, setAgentInput] = useState('')

  return (
    <aside className="flex flex-col w-56 min-h-screen bg-sidebar border-r border-border-soft">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border-soft">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <Target className="w-4 h-4 text-sidebar" strokeWidth={2.5} />
          </div>
          <span className="text-fg font-semibold tracking-tight text-sm">Scoutly</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors',
                active
                  ? 'bg-accent-muted text-accent'
                  : 'text-fg-2 hover:bg-surface hover:text-fg'
              )}
            >
              <Icon
                className={cn('w-4 h-4 shrink-0', active ? 'text-accent' : '')}
                strokeWidth={active ? 2.5 : 2}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Scoutly Agent */}
      <div className="border-t border-border-soft">
        {agentOpen && (
          <div className="border-b border-border-soft bg-card">
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs font-semibold text-fg">Scoutly Agent</span>
              </div>
              <button
                onClick={() => setAgentOpen(false)}
                className="text-fg-3 hover:text-fg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="px-3 pb-2 min-h-[80px] flex items-center">
              <p className="text-xs text-fg-3 italic">
                Ask me to find sponsorship leads, research a company, or scout an event...
              </p>
            </div>
            <div className="px-3 pb-3">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={agentInput}
                  onChange={(e) => setAgentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && agentInput.trim()) setAgentInput('')
                  }}
                  placeholder="Prospect a request..."
                  className="flex-1 bg-surface border border-border text-xs text-fg placeholder:text-fg-3 rounded px-2 py-1.5 focus:outline-none focus:border-accent transition-colors min-w-0"
                />
                <button
                  onClick={() => setAgentInput('')}
                  className="shrink-0 w-6 h-6 bg-accent rounded flex items-center justify-center hover:bg-accent-dim transition-colors"
                >
                  <Send className="w-3 h-3 text-sidebar" />
                </button>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => setAgentOpen(!agentOpen)}
          className="w-full flex items-center gap-2.5 px-3 py-3 text-fg-2 hover:text-fg hover:bg-surface transition-colors group"
        >
          <Sparkles className="w-4 h-4 shrink-0 text-accent" />
          <span className="text-xs font-medium flex-1 text-left">Scoutly Agent</span>
          <ChevronUp
            className={cn(
              'w-3.5 h-3.5 text-fg-3 transition-transform',
              agentOpen && 'rotate-180'
            )}
          />
        </button>
      </div>
    </aside>
  )
}
