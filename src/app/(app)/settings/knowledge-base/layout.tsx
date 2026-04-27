'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Sparkles, Radio, MessageSquare, Globe, BookOpen, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

const KB_NAV = [
  { href: '/settings/knowledge-base/icp',      icon: Users,          label: 'ICP' },
  { href: '/settings/knowledge-base/modules',   icon: Sparkles,       label: 'Modules' },
  { href: '/settings/knowledge-base/geo',       icon: Globe,          label: 'Geography' },
  { href: '/settings/knowledge-base/playbook',  icon: BookOpen,       label: 'Playbook' },
  { href: '/settings/knowledge-base/signals',   icon: Radio,          label: 'Signals' },
  { href: '/settings/knowledge-base/voice',     icon: MessageSquare,  label: 'Voice' },
  { href: '/settings/knowledge-base/review',    icon: AlertTriangle,  label: 'Needs Review', warn: true },
]

export default function KBLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full">
      <nav className="w-44 shrink-0 border-r border-border-soft py-4 px-2 space-y-0.5">
        <p className="px-3 text-xs font-semibold text-fg-3 uppercase tracking-wider mb-2">Knowledge Base</p>
        {KB_NAV.map(({ href, icon: Icon, label, warn }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-1.5 rounded text-xs font-medium transition-colors',
                active
                  ? warn ? 'bg-warm/10 text-warm' : 'bg-accent-muted text-accent'
                  : warn ? 'text-warm hover:bg-warm/10' : 'text-fg-2 hover:text-fg hover:bg-surface'
              )}
            >
              <Icon
                className={cn('w-3.5 h-3.5 shrink-0', active ? (warn ? 'text-warm' : 'text-accent') : warn ? 'text-warm' : '')}
                strokeWidth={active ? 2.5 : 2}
              />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
