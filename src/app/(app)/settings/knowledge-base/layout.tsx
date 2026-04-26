'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Package, Star, Swords, Radio, MessageSquare, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

const KB_NAV = [
  { href: '/settings/knowledge-base/icp',              icon: Users,         label: 'ICP & Segments' },
  { href: '/settings/knowledge-base/products',         icon: Package,       label: 'Products' },
  { href: '/settings/knowledge-base/proof-points',     icon: Star,          label: 'Proof Points' },
  { href: '/settings/knowledge-base/competitors',      icon: Swords,        label: 'Competitors' },
  { href: '/settings/knowledge-base/signal-keywords',  icon: Radio,         label: 'Signal Keywords' },
  { href: '/settings/knowledge-base/copy-preferences', icon: MessageSquare, label: 'Copy Preferences' },
  { href: '/settings/knowledge-base/version-history',  icon: Clock,         label: 'Version History' },
]

export default function KBLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full">
      {/* Sub-nav */}
      <nav className="w-48 shrink-0 border-r border-border-soft py-4 px-2 space-y-0.5">
        <p className="px-3 text-xs font-semibold text-fg-3 uppercase tracking-wider mb-2">Knowledge Base</p>
        {KB_NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-1.5 rounded text-xs font-medium transition-colors',
                active ? 'bg-accent-muted text-accent' : 'text-fg-2 hover:text-fg hover:bg-surface'
              )}
            >
              <Icon className={cn('w-3.5 h-3.5 shrink-0', active ? 'text-accent' : '')} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Page content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
