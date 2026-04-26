'use client'

import { useState, useEffect } from 'react'
import { Webhook, Plus, Copy, Check, Trash2, Power } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type WebhookConfig = {
  id: string; created_at: string; name: string; secret: string
  source_type: string; default_warmth: string; default_segment?: string
  active: boolean; last_received_at?: string; total_received: number
}

function generateSecret(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

const WEBHOOK_URL = typeof window !== 'undefined'
  ? `${window.location.origin}/api/webhooks/intake`
  : '/api/webhooks/intake'

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [adding, setAdding] = useState(false)
  const [copied, setCopied] = useState<Record<string, boolean>>({})
  const [newWebhook, setNewWebhook] = useState({ name: '', source_type: 'LEMLIST_WATCHER', default_warmth: 'WARM', default_segment: '' })
  const [revealedSecret, setRevealedSecret] = useState<Record<string, boolean>>({})

  async function load() {
    setLoading(true)
    const { data } = await createClient().from('webhook_configs').select('*').order('created_at', { ascending: false })
    setWebhooks(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    const secret = generateSecret()
    await createClient().from('webhook_configs').insert({ ...newWebhook, secret, active: true, total_received: 0 })
    setNewWebhook({ name: '', source_type: 'LEMLIST_WATCHER', default_warmth: 'WARM', default_segment: '' })
    setShowAdd(false)
    setAdding(false)
    load()
  }

  async function handleToggle(id: string, active: boolean) {
    await createClient().from('webhook_configs').update({ active: !active }).eq('id', id)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this webhook? Any configured integrations using this secret will stop working.')) return
    await createClient().from('webhook_configs').delete().eq('id', id)
    load()
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(c => ({ ...c, [key]: true }))
    setTimeout(() => setCopied(c => ({ ...c, [key]: false })), 2000)
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Webhook className="w-4 h-4 text-accent" />
          <h1 className="text-sm font-semibold text-fg">Webhook Integrations</h1>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded-md hover:bg-accent-dim">
          <Plus className="w-3.5 h-3.5" /> New Webhook
        </button>
      </div>
      <p className="text-xs text-fg-3 mb-6">
        Send leads to Scoutly from external tools (Lemlist Watcher, Zapier, etc.) via POST to{' '}
        <code className="bg-border px-1 rounded text-fg">/api/webhooks/intake</code> with the secret in the header.
      </p>

      {/* Webhook URL */}
      <div className="bg-surface border border-border rounded-lg p-4 mb-6">
        <p className="text-xs font-medium text-fg-2 mb-2">Webhook Endpoint URL</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-card border border-border rounded px-3 py-2 text-xs text-accent font-mono truncate">
            {WEBHOOK_URL}
          </code>
          <button onClick={() => copyText(WEBHOOK_URL, 'url')}
            className="px-3 py-2 bg-card border border-border rounded text-xs text-fg-2 hover:text-fg flex items-center gap-1">
            {copied['url'] ? <Check className="w-3.5 h-3.5 text-score-high" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
        <p className="text-xs text-fg-3 mt-2">Header required: <code className="bg-border px-1 rounded">X-Scoutly-Webhook-Secret: YOUR_SECRET</code></p>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-surface border border-border rounded-lg p-5 mb-4 space-y-3">
          <p className="text-xs font-medium text-fg">New Webhook Configuration</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-fg-3 mb-1">Name *</label>
              <input required value={newWebhook.name} onChange={e => setNewWebhook(n => ({ ...n, name: e.target.value }))}
                placeholder="e.g. Lemlist Watcher Main"
                className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block text-xs text-fg-3 mb-1">Source Type</label>
              <select value={newWebhook.source_type} onChange={e => setNewWebhook(n => ({ ...n, source_type: e.target.value }))}
                className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent">
                <option value="LEMLIST_WATCHER">Lemlist Watcher</option>
                <option value="GOOGLE_ALERTS">Google Alerts</option>
                <option value="LINKEDIN_JOBS">LinkedIn Jobs</option>
                <option value="SCOUTLY_AGENT">Scoutly Agent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-fg-3 mb-1">Default Warmth</label>
              <select value={newWebhook.default_warmth} onChange={e => setNewWebhook(n => ({ ...n, default_warmth: e.target.value }))}
                className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent">
                <option value="WARM">Warm</option><option value="COLD">Cold</option><option value="UNKNOWN">Unknown</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-fg-3 mb-1">Default Segment</label>
              <select value={newWebhook.default_segment} onChange={e => setNewWebhook(n => ({ ...n, default_segment: e.target.value }))}
                className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent">
                <option value="">None</option>
                <option>Rights Holder</option><option>Brand</option><option>Agency</option><option>Club &amp; Team</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={adding}
              className="px-3 py-1.5 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim disabled:opacity-60">
              {adding ? 'Creating...' : 'Create Webhook'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 bg-card border border-border text-xs text-fg-2 rounded hover:text-fg">Cancel</button>
          </div>
        </form>
      )}

      {/* Webhook list */}
      {loading ? (
        <div className="text-xs text-fg-3 py-8 text-center">Loading...</div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-12">
          <Webhook className="w-10 h-10 text-fg-3 mx-auto mb-3" />
          <p className="text-sm font-medium text-fg mb-1">No webhooks configured</p>
          <p className="text-xs text-fg-3">Create your first webhook to start receiving leads from Lemlist or other tools.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map(wh => (
            <div key={wh.id} className={cn('bg-surface border border-border rounded-lg p-4', !wh.active && 'opacity-60')}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-fg">{wh.name}</p>
                    <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium',
                      wh.active ? 'bg-score-high/10 text-score-high' : 'bg-border text-fg-3')}>
                      {wh.active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <p className="text-xs text-fg-3 mt-0.5">
                    {wh.source_type.replace('_', ' ')} · {wh.default_warmth} · {wh.total_received} received
                    {wh.last_received_at && ` · Last: ${new Date(wh.last_received_at).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => handleToggle(wh.id, wh.active)}
                    className="p-1.5 text-fg-3 hover:text-fg transition-colors" title={wh.active ? 'Pause' : 'Activate'}>
                    <Power className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(wh.id)} className="p-1.5 text-fg-3 hover:text-score-low transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Secret */}
              <div>
                <p className="text-xs text-fg-3 mb-1">Secret (set as <code className="bg-border px-1 rounded">X-Scoutly-Webhook-Secret</code> header)</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-card border border-border rounded px-3 py-1.5 text-xs font-mono text-fg-2 truncate">
                    {revealedSecret[wh.id] ? wh.secret : '•'.repeat(32)}
                  </code>
                  <button onClick={() => setRevealedSecret(r => ({ ...r, [wh.id]: !r[wh.id] }))}
                    className="px-2.5 py-1.5 bg-card border border-border rounded text-xs text-fg-2 hover:text-fg">
                    {revealedSecret[wh.id] ? 'Hide' : 'Show'}
                  </button>
                  <button onClick={() => copyText(wh.secret, wh.id)}
                    className="px-2.5 py-1.5 bg-card border border-border rounded text-xs text-fg-2 hover:text-fg flex items-center gap-1">
                    {copied[wh.id] ? <Check className="w-3.5 h-3.5 text-score-high" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
