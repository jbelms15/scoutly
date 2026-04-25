'use client'

import { useState } from 'react'
import { Target, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Check if accent has been chosen
    const accent = localStorage.getItem('scoutly_accent')
    router.push(accent ? '/queue' : '/setup')
  }

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center">
            <Target className="w-4 h-4 text-sidebar" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold tracking-tight text-fg">Scoutly</span>
        </div>

        <h1 className="text-xl font-bold text-fg text-center mb-1">Welcome back</h1>
        <p className="text-sm text-fg-3 text-center mb-8">
          Sign in to your prospecting workspace
        </p>

        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="block text-xs text-fg-3 mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@shikenso.com"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-fg placeholder:text-fg-3 focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-fg-3 mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-fg placeholder:text-fg-3 focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent text-sidebar text-sm font-bold rounded-lg hover:bg-accent-dim disabled:opacity-60 disabled:cursor-not-allowed transition-colors mt-1"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-xs text-fg-3 mt-6">
          Scoutly is a private tool for Shikenso Analytics.
        </p>
      </div>
    </div>
  )
}
