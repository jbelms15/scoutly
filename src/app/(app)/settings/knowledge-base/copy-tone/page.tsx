'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Save, ChevronLeft, History } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Tone = { id: string; words_to_use: string; words_to_avoid: string; tone_description: string; signoff_format: string; additional_rules: string; updated_at: string }

export default function CopyTonePage() {
  const [tone, setTone] = useState<Tone | null>(null)
  const [form, setForm] = useState({ words_to_use: '', words_to_avoid: '', tone_description: '', signoff_format: '', additional_rules: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('kb_copy_tone').select('*').limit(1).single()
    if (data) { setTone(data); setForm({ words_to_use: data.words_to_use ?? '', words_to_avoid: data.words_to_avoid ?? '', tone_description: data.tone_description ?? '', signoff_format: data.signoff_format ?? '', additional_rules: data.additional_rules ?? '' }) }
  }

  async function loadHistory() {
    if (!tone) return
    const supabase = createClient()
    const { data } = await supabase.from('kb_edit_history').select('*').eq('table_name', 'kb_copy_tone').eq('record_id', tone.id).order('created_at', { ascending: false }).limit(5)
    setHistory(data ?? [])
    setShowHistory(true)
  }

  useEffect(() => { load() }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    if (tone) {
      await supabase.from('kb_edit_history').insert({ table_name: 'kb_copy_tone', record_id: tone.id, snapshot: tone, note: 'Updated copy tone' })
      await supabase.from('kb_copy_tone').update(form).eq('id', tone.id)
    } else {
      await supabase.from('kb_copy_tone').insert(form)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    load()
  }

  async function handleRestore(snapshot: any) {
    if (!tone) return
    const supabase = createClient()
    const { words_to_use, words_to_avoid, tone_description, signoff_format, additional_rules } = snapshot
    await supabase.from('kb_copy_tone').update({ words_to_use, words_to_avoid, tone_description, signoff_format, additional_rules }).eq('id', tone.id)
    setShowHistory(false)
    load()
  }

  const ta = (key: keyof typeof form, label: string, rows = 3, placeholder = '') => (
    <div>
      <label className="block text-xs text-fg-3 mb-1">{label}</label>
      <textarea rows={rows} value={form[key]} onChange={e => setForm(f => ({...f, [key]: e.target.value}))}
        placeholder={placeholder}
        className="w-full bg-surface border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" />
    </div>
  )

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings/knowledge-base" className="text-fg-3 hover:text-fg"><ChevronLeft className="w-4 h-4" /></Link>
        <MessageSquare className="w-4 h-4 text-accent" />
        <h1 className="text-sm font-semibold text-fg">Copy Tone & Rules</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
          {ta('tone_description', 'Tone Description', 4, 'Sharp and direct. Sounds like someone who knows the sponsorship industry...')}
          <div className="grid grid-cols-2 gap-4">
            {ta('words_to_use', 'Words to Use', 3, 'prove, track, measure, ROI, data-backed...')}
            {ta('words_to_avoid', 'Words to Avoid', 3, 'synergy, leverage, best-in-class, disruptive...')}
          </div>
          {ta('signoff_format', 'Sign-off Format', 3, 'Best,\n[Name]\nGrowth BDR, Shikenso Analytics')}
          {ta('additional_rules', 'Additional Rules', 4, 'Always reference the signal that triggered this outreach...')}
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent text-sidebar text-xs font-bold rounded-lg hover:bg-accent-dim disabled:opacity-60">
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Changes'}
          </button>
          <button type="button" onClick={loadHistory} className="flex items-center gap-1.5 text-xs text-fg-3 hover:text-fg transition-colors">
            <History className="w-3.5 h-3.5" /> View history
          </button>
          {tone && <span className="text-xs text-fg-3 ml-auto">Last updated {new Date(tone.updated_at).toLocaleString()}</span>}
        </div>
      </form>

      {showHistory && (
        <div className="mt-4 bg-surface border border-border rounded-lg p-4">
          <p className="text-xs font-semibold text-fg-2 mb-3">Recent versions</p>
          {history.length === 0 ? (
            <p className="text-xs text-fg-3">No history yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h: any) => (
                <div key={h.id} className="flex items-center justify-between text-xs">
                  <span className="text-fg-3">{new Date(h.created_at).toLocaleString()} — {h.note}</span>
                  <button onClick={() => handleRestore(h.snapshot)} className="text-accent hover:text-accent-dim">Restore</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
