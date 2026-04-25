'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Target, Check } from 'lucide-react'
import { storeAccent, type AccentColor } from '@/components/accent-provider'

const OPTIONS: { color: AccentColor; hex: string; name: string; desc: string }[] = [
  {
    color: 'green',
    hex: '#00FF87',
    name: 'Electric Green',
    desc: 'High-energy, signal-forward. Built for sport.',
  },
  {
    color: 'amber',
    hex: '#F59E0B',
    name: 'Deep Amber',
    desc: 'Warm, premium, deal-focused. Built for revenue.',
  },
]

export default function SetupPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<AccentColor>('green')

  function handleSelect(color: AccentColor) {
    setSelected(color)
    // Live preview — applies immediately so the user can see the effect
    storeAccent(color)
  }

  function handleContinue() {
    storeAccent(selected)
    router.push('/queue')
  }

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center">
            <Target className="w-4.5 h-4.5 text-sidebar" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold tracking-tight text-fg">Scoutly</span>
        </div>

        <h1 className="text-xl font-bold text-fg text-center mb-1">
          Pick your accent color
        </h1>
        <p className="text-sm text-fg-3 text-center mb-8">
          You can change this anytime in Settings.
        </p>

        {/* Color options */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {OPTIONS.map(({ color, hex, name, desc }) => {
            const isSelected = selected === color
            return (
              <button
                key={color}
                onClick={() => handleSelect(color)}
                className={`relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-accent bg-accent-muted'
                    : 'border-border bg-surface hover:border-fg-3'
                }`}
                style={isSelected ? { borderColor: hex } : {}}
              >
                {/* Selected checkmark */}
                {isSelected && (
                  <div
                    className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: hex }}
                  >
                    <Check className="w-3 h-3 text-sidebar" strokeWidth={3} />
                  </div>
                )}

                {/* Color swatch */}
                <div
                  className="w-12 h-12 rounded-full shadow-lg"
                  style={{ backgroundColor: hex }}
                />

                {/* Labels */}
                <div className="text-center">
                  <div
                    className="text-sm font-semibold mb-0.5"
                    style={isSelected ? { color: hex } : { color: 'var(--color-fg)' }}
                  >
                    {name}
                  </div>
                  <div className="text-xs text-fg-3 leading-snug">{desc}</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Continue */}
        <button
          onClick={handleContinue}
          className="w-full py-2.5 bg-accent text-sidebar text-sm font-bold rounded-lg hover:bg-accent-dim transition-colors"
        >
          Continue to Scoutly →
        </button>
      </div>
    </div>
  )
}
