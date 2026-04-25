import Link from 'next/link'
import { BookOpen, Users, Package, Star, Swords, Radio, MessageSquare, ChevronRight } from 'lucide-react'

const SECTIONS = [
  {
    href: '/settings/knowledge-base/icp',
    icon: Users,
    title: 'ICP & Segments',
    desc: 'Define your 4 target segments with pain points, target titles, and scoring criteria',
  },
  {
    href: '/settings/knowledge-base/products',
    icon: Package,
    title: 'Shikenso Products',
    desc: 'Manage product descriptions and differentiators used in outreach copy',
  },
  {
    href: '/settings/knowledge-base/proof-points',
    icon: Star,
    title: 'Proof Points',
    desc: 'Stats and case studies Claude references when writing outreach',
  },
  {
    href: '/settings/knowledge-base/competitors',
    icon: Swords,
    title: 'Competitor Awareness',
    desc: 'How Shikenso positions against Blinkfire, GumGum, and SponsorPulse',
  },
  {
    href: '/settings/knowledge-base/signal-keywords',
    icon: Radio,
    title: 'Signal Keywords',
    desc: 'Keyword sets used by LinkedIn Jobs Monitor and Google Alerts signals',
  },
  {
    href: '/settings/knowledge-base/copy-tone',
    icon: MessageSquare,
    title: 'Copy Tone & Rules',
    desc: 'Words to use, words to avoid, sign-off format, and tone guidelines',
  },
]

export default function KnowledgeBasePage() {
  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="w-4 h-4 text-accent" />
        <h1 className="text-sm font-semibold text-fg">Knowledge Base</h1>
      </div>
      <p className="text-xs text-fg-3 mb-6">
        Every Claude API call pulls the latest version of these sections dynamically.
        Changes here take effect on the next enrichment, scoring, or copy generation run.
      </p>

      <div className="space-y-2">
        {SECTIONS.map(({ href, icon: Icon, title, desc }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 p-4 bg-surface border border-border rounded-lg hover:border-accent/40 hover:bg-surface/80 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center shrink-0 group-hover:border-accent/40 transition-colors">
              <Icon className="w-4 h-4 text-fg-2 group-hover:text-accent transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-fg mb-0.5">{title}</div>
              <div className="text-xs text-fg-3">{desc}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-fg-3 group-hover:text-accent transition-colors shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}
