'use client'

import { useEffect } from 'react'

const ACCENT_PRESETS = {
  green: { accent: '#00FF87', muted: '#00FF8720', dim: '#00c968' },
  amber: { accent: '#F59E0B', muted: '#F59E0B20', dim: '#d97706' },
}

export type AccentColor = keyof typeof ACCENT_PRESETS

export function applyAccent(color: AccentColor) {
  const preset = ACCENT_PRESETS[color]
  document.documentElement.style.setProperty('--accent', preset.accent)
  document.documentElement.style.setProperty('--accent-muted', preset.muted)
  document.documentElement.style.setProperty('--accent-dim', preset.dim)
}

export function getStoredAccent(): AccentColor {
  if (typeof window === 'undefined') return 'green'
  return (localStorage.getItem('scoutly_accent') as AccentColor) ?? 'green'
}

export function storeAccent(color: AccentColor) {
  localStorage.setItem('scoutly_accent', color)
  applyAccent(color)
}

export default function AccentProvider() {
  useEffect(() => {
    applyAccent(getStoredAccent())
  }, [])
  return null
}
