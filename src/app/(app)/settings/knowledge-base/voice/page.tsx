'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Pref = { id: string; preference_type: string; preference_value: string; active: boolean; updated_at: string }

const PREF_META: Record<string, { label: string; desc: string; multiline: boolean }> = {
  TONE_DESCRIPTION: {
    label: 'Tone Description',
    desc: 'How Claude should sound overall — personality, formality, and energy level',
    multiline: true,
  },
  OPENING_STYLE: {
    label: 'Opening Style',
    desc: 'Rules for the first 1-2 sentences of every outreach message',
    multiline: true,
  },
  CTA_STYLE: {
    label: 'CTA Style',
    desc: 'How to close every email — what to offer and how to frame it',
    multiline: true,
  },
  WORDS_TO_USE: {
    label: 'Words to Use',
    desc: 'Vocabulary that fits the tone and signals credibility',
    multiline: false,
  },
  WORDS_TO_AVOID: {
    label: 'Words to Avoid',
    desc: 'Phrases that dilute credibility or sound generic',
    multiline: false,
  },
  SIGN_OFF_FORMAT: {
    label: 'Sign-off Format',
    desc: 'How every email should end',
    multiline: true,
  },
}

const ORDER = ['TONE_DESCRIPTION', 'OPENING_STYLE', 'CTA_STYLE', 'WORDS_TO_USE', 'WORDS_TO_AVOID', 'SIGN_OFF_FORMAT']

export default function VoicePage() {
  const [prefs, setPrefs] = useState<Record<string, Pref>>({})
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('kb_copy_preferences').select('*')
    if (data) {
      const m: Record<string, Pref> = {}
      const v: Record<string, string> = {}
      data.forEach(p => { m[p.preference_type] = p; v[p.preference_type] = p.preference_value })
      setPrefs(m)
      setValues(v)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSave(type: string) {
    setSaving(s => ({ ...s, [type]: true }))
    const supabase = createClient()
    const pref = prefs[type]
    if (pref) {
      await supabase.from('kb_copy_preferences').update({ preference_value: values[type] }).eq('id', pref.id)
    } else {
      await supabase.from('kb_copy_preferences').insert({ preference_type: type, preference_value: values[type], active: true })
    }
    setSaving(s => ({ ...s, [type]: false }))
    setSaved(s => ({ ...s, [type]: true }))
    setTimeout(() => setSaved(s => ({ ...s, [type]: false })), 2000)
    load()
  }

  if (loading) return <div className="flex items-center justify-center h-32 text-xs text-fg-3">Loading...</div>

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <div>
        <h1 className="text-sm font-semibold text-fg">Voice</h1>
        <p className="text-xs text-fg-3 mt-0.5">Tone, words, CTAs, and sign-off rules — injected into every Claude copy generation call.</p>
      </div>

      {ORDER.map(type => {
        const meta = PREF_META[type]
        const pref = prefs[type]
        if (!meta) return null
        return (
          <div key={type} className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-fg">{meta.label}</p>
                <p className="text-xs text-fg-3 mt-0.5">{meta.desc}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                {pref && <span className="text-xs text-fg-3">{new Date(pref.updated_at).toLocaleDateString()}</span>}
                <button onClick={() => handleSave(type)} disabled={saving[type]}
                  className="flex items-center gap-1.5 px-3 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim disabled:opacity-60 transition-colors">
                  {saving[type] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  {saving[type] ? 'Saving...' : saved[type] ? 'Saved ✓' : 'Save'}
                </button>
              </div>
            </div>
            {meta.multiline ? (
              <textarea
                rows={4}
                value={values[type] ?? ''}
                onChange={e => setValues(v => ({ ...v, [type]: e.target.value }))}
                className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent transition-colors resize-none"
              />
            ) : (
              <input
                value={values[type] ?? ''}
                onChange={e => setValues(v => ({ ...v, [type]: e.target.value }))}
                className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent transition-colors"
              />
            )}
            {pref && (
              <p className="text-xs text-fg-3 mt-1.5">Last updated {new Date(pref.updated_at).toLocaleDateString()}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
