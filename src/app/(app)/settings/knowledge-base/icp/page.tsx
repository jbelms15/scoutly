'use client'

import { useState, useEffect } from 'react'
import { Save, History, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import KBSourceBadge from '@/components/kb-source-badge'
import { cn } from '@/lib/utils'

type Segment = {
  id: string; segment_name: string; definition: string; criteria: string
  one_line_summary: string | null; buyer_psyche_one_liner: string | null
  framing_rule: string | null; why_they_buy_us_long_form: string | null
  typical_deal_pattern: string | null; typical_deal_size: string | null
  switch_story_legs: string[] | null
  default_first_touch_titles: string[] | null
  specialist_titles: string[] | null; specialist_titles_notes: string | null
  influencer_titles: string[] | null; influencer_titles_notes: string | null
  do_not_target_titles: string[] | null; do_not_target_notes: string | null
  c_suite_note: string | null; enrichment_caveat: string | null
  two_buyer_profiles: string | null; second_call_discovery_question: string | null
  esports_outbound_rule: string | null; recommended_modules: string[] | null
  priority_sports: string | null; priority_regions: string | null
  example_companies: string | null; target_title_array: string[] | null
  source: string | null; needs_review: boolean
  active: boolean; version: number; sort_order: number
}

const FRAMING_COLOURS: Record<string, string> = {
  PRE_EDUCATED_SWITCH:      'bg-score-high/10 text-score-high border-score-high/30',
  PRE_EDUCATED_UPGRADE:     'bg-accent/10 text-accent border-accent/30',
  DISCOVERY_CATEGORY:       'bg-warm/10 text-warm border-warm/30',
  DISCOVERY_INFRASTRUCTURE: 'bg-border text-fg-2 border-border',
}

function TitleGroup({ label, titles, notes, variant }: {
  label: string; titles: string[] | null | undefined
  notes?: string | null; variant: 'green' | 'accent' | 'warm' | 'red'
}) {
  if (!titles?.length) return null
  const chip: Record<string, string> = {
    green:  'bg-score-high/10 text-score-high',
    accent: 'bg-accent/10 text-accent',
    warm:   'bg-warm/10 text-warm',
    red:    'bg-score-low/10 text-score-low',
  }
  return (
    <div>
      <span className="text-xs text-fg-3 block mb-1">{label}</span>
      <div className="flex flex-wrap gap-1 mb-1">
        {titles.map(t => <span key={t} className={cn('px-1.5 py-0.5 rounded text-xs font-medium', chip[variant])}>{t}</span>)}
      </div>
      {notes && <p className="text-xs text-fg-3 italic mt-0.5">{notes}</p>}
    </div>
  )
}

function Expandable({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1 text-xs text-fg-2 font-medium hover:text-fg transition-colors">
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} {label}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  )
}

export default function ICPPage() {
  const [segments, setSegments] = useState<Segment[]>([])
  const [editing, setEditing]   = useState<Record<string, Partial<Segment>>>({})
  const [editMode, setEditMode] = useState<Record<string, boolean>>({})
  const [saving, setSaving]     = useState<Record<string, boolean>>({})
  const [saved, setSaved]       = useState<Record<string, boolean>>({})
  const [historyOpen, setHistoryOpen] = useState<Record<string, boolean>>({})
  const [history, setHistory]   = useState<Record<string, unknown[]>>({})
  const [loading, setLoading]   = useState(true)

  async function load() {
    const { data } = await createClient().from('kb_icp_segments').select('*').eq('active', true).eq('archived', false).order('sort_order')
    if (data) { setSegments(data); const m: Record<string, Partial<Segment>> = {}; data.forEach(s => { m[s.id] = { ...s } }); setEditing(m) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSave(id: string) {
    setSaving(s => ({ ...s, [id]: true }))
    const ed = editing[id]
    await createClient().from('kb_icp_segments').update({
      definition: ed.definition, criteria: ed.criteria,
      one_line_summary: ed.one_line_summary, buyer_psyche_one_liner: ed.buyer_psyche_one_liner,
      framing_rule: ed.framing_rule, why_they_buy_us_long_form: ed.why_they_buy_us_long_form,
      typical_deal_pattern: ed.typical_deal_pattern, typical_deal_size: ed.typical_deal_size,
      switch_story_legs: ed.switch_story_legs,
      default_first_touch_titles: ed.default_first_touch_titles,
      specialist_titles: ed.specialist_titles, specialist_titles_notes: ed.specialist_titles_notes,
      influencer_titles: ed.influencer_titles, influencer_titles_notes: ed.influencer_titles_notes,
      do_not_target_titles: ed.do_not_target_titles, do_not_target_notes: ed.do_not_target_notes,
      c_suite_note: ed.c_suite_note, enrichment_caveat: ed.enrichment_caveat,
      two_buyer_profiles: ed.two_buyer_profiles, second_call_discovery_question: ed.second_call_discovery_question,
      esports_outbound_rule: ed.esports_outbound_rule, recommended_modules: ed.recommended_modules,
      priority_sports: ed.priority_sports, priority_regions: ed.priority_regions, example_companies: ed.example_companies,
    }).eq('id', id)
    setSaving(s => ({ ...s, [id]: false })); setSaved(s => ({ ...s, [id]: true }))
    setEditMode(m => ({ ...m, [id]: false }))
    setTimeout(() => setSaved(s => ({ ...s, [id]: false })), 2000)
    load()
  }

  async function loadHistory(id: string) {
    const { data } = await createClient().from('kb_version_history').select('*').eq('table_name', 'kb_icp_segments').eq('record_id', id).order('created_at', { ascending: false }).limit(5)
    setHistory(h => ({ ...h, [id]: data ?? [] })); setHistoryOpen(h => ({ ...h, [id]: !h[id] }))
  }

  function upd(id: string, key: keyof Segment, val: unknown) { setEditing(e => ({ ...e, [id]: { ...e[id], [key]: val } })) }

  const arr = (v: string[] | null | undefined) => (v ?? []).join(', ')
  const fromArr = (v: string) => v.split(',').map(s => s.trim()).filter(Boolean)

  const ta = (id: string, key: keyof Segment, label: string, rows = 2) => (
    <div>
      <label className="block text-xs text-fg-3 mb-1">{label}</label>
      <textarea rows={rows} value={(editing[id]?.[key] as string) ?? ''} onChange={e => upd(id, key, e.target.value)}
        className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" />
    </div>
  )
  const chips = (id: string, key: keyof Segment, label: string) => (
    <div>
      <label className="block text-xs text-fg-3 mb-1">{label}</label>
      <input value={arr(editing[id]?.[key] as string[] | null)} onChange={e => upd(id, key, fromArr(e.target.value))}
        className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
    </div>
  )

  if (loading) return <div className="flex items-center justify-center h-32 text-xs text-fg-3">Loading...</div>
  if (segments.length === 0) return (
    <div className="p-6 text-center text-xs text-fg-3">
      <p className="font-semibold text-fg mb-1">No active ICP segments</p>
      <p>Run migration 014 in Supabase to load the authoritative segments from Benedikt's SDR materials.</p>
    </div>
  )

  return (
    <div className="p-6 max-w-4xl space-y-4">
      <div>
        <h1 className="text-sm font-semibold text-fg">ICP & Segments</h1>
        <p className="text-xs text-fg-3 mt-0.5">{segments.length} active segments · Source: Benedikt Becker SDR materials, 27 Apr 2026</p>
      </div>

      {segments.map(seg => {
        const isEditing = editMode[seg.id]; const ed = editing[seg.id] ?? seg
        return (
          <div key={seg.id} className="bg-surface border border-border rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border-soft flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-fg">{seg.segment_name}</span>
                {seg.framing_rule && (
                  <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium border', FRAMING_COLOURS[seg.framing_rule] ?? 'bg-border text-fg-3 border-border')}>
                    {seg.framing_rule}
                  </span>
                )}
                <KBSourceBadge source={seg.source} />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => loadHistory(seg.id)} className="text-xs text-fg-3 hover:text-fg flex items-center gap-1">
                  <History className="w-3.5 h-3.5" /> History
                </button>
                {isEditing ? (
                  <>
                    <button onClick={() => setEditMode(m => ({ ...m, [seg.id]: false }))} className="px-3 py-1 text-xs text-fg-2 bg-card border border-border rounded hover:text-fg">Cancel</button>
                    <button onClick={() => handleSave(seg.id)} disabled={saving[seg.id]}
                      className="flex items-center gap-1.5 px-3 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim disabled:opacity-60">
                      {saving[seg.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      {saving[seg.id] ? 'Saving...' : saved[seg.id] ? 'Saved ✓' : 'Save'}
                    </button>
                  </>
                ) : (
                  <button onClick={() => setEditMode(m => ({ ...m, [seg.id]: true }))} className="px-3 py-1 bg-accent text-sidebar text-xs font-semibold rounded hover:bg-accent-dim">Edit</button>
                )}
              </div>
            </div>

            {/* Body */}
            {isEditing ? (
              <div className="p-5 grid grid-cols-2 gap-4">
                {ta(seg.id, 'one_line_summary', 'One-line summary', 1)}
                {ta(seg.id, 'buyer_psyche_one_liner', 'Buyer psyche', 1)}
                <div className="col-span-2">{ta(seg.id, 'definition', 'Definition', 2)}</div>
                <div className="col-span-2">{ta(seg.id, 'why_they_buy_us_long_form', 'Why they buy us (long form)', 4)}</div>
                {seg.segment_name === 'Rights Holder' && (
                  <div className="col-span-2">
                    <label className="block text-xs text-fg-3 mb-1">Switch story legs (one per section — separate with a blank line)</label>
                    <textarea rows={8} value={(ed.switch_story_legs ?? []).join('\n\n')}
                      onChange={e => upd(seg.id, 'switch_story_legs', e.target.value.split(/\n\n+/).map(s => s.trim()).filter(Boolean))}
                      className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent resize-none" />
                  </div>
                )}
                {seg.segment_name === 'Agency' && <div className="col-span-2">{ta(seg.id, 'two_buyer_profiles', 'Two buyer profiles (big vs boutique)', 4)}</div>}
                {seg.segment_name === 'Agency' && <div className="col-span-2">{ta(seg.id, 'second_call_discovery_question', 'Second call discovery question', 2)}</div>}
                {seg.segment_name === 'Brand' && <div className="col-span-2">{ta(seg.id, 'enrichment_caveat', 'Enrichment caveat', 2)}</div>}
                {seg.segment_name === 'Team' && <div className="col-span-2">{ta(seg.id, 'esports_outbound_rule', 'Esports outbound rule', 2)}</div>}
                <div className="col-span-2">{chips(seg.id, 'default_first_touch_titles', 'Default first touch titles (comma-separated)')}</div>
                <div>{chips(seg.id, 'specialist_titles', 'Specialist titles')}</div>
                <div>{ta(seg.id, 'specialist_titles_notes', 'Specialist titles note', 1)}</div>
                <div>{chips(seg.id, 'influencer_titles', 'Influencer titles')}</div>
                <div>{ta(seg.id, 'influencer_titles_notes', 'Influencer titles note', 1)}</div>
                <div className="col-span-2">{chips(seg.id, 'do_not_target_titles', 'Do-not-target titles')}</div>
                <div className="col-span-2">{ta(seg.id, 'do_not_target_notes', 'Do-not-target reason', 1)}</div>
                <div className="col-span-2">{ta(seg.id, 'c_suite_note', 'C-suite note', 2)}</div>
                <div className="col-span-2">{ta(seg.id, 'typical_deal_pattern', 'Typical deal pattern', 3)}</div>
                <div>{ta(seg.id, 'typical_deal_size', 'Typical deal size', 1)}</div>
                <div>{chips(seg.id, 'recommended_modules', 'Recommended modules')}</div>
                <div>{ta(seg.id, 'priority_sports', 'Priority sports', 1)}</div>
                <div>{ta(seg.id, 'priority_regions', 'Priority regions', 1)}</div>
                <div className="col-span-2">{ta(seg.id, 'example_companies', 'Example companies', 1)}</div>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                {/* Summary + psyche */}
                {seg.one_line_summary && (
                  <p className="text-sm text-accent italic">{seg.one_line_summary}</p>
                )}
                {seg.buyer_psyche_one_liner && (
                  <p className="text-xs text-fg-2">"{seg.buyer_psyche_one_liner}"</p>
                )}
                {seg.definition && (
                  <p className="text-xs text-fg-2 leading-relaxed">{seg.definition}</p>
                )}

                {/* Why they buy us */}
                {seg.why_they_buy_us_long_form && (
                  <Expandable label="Why they buy us">
                    <p className="text-xs text-fg-2 leading-relaxed bg-card border border-border-soft rounded p-3">{seg.why_they_buy_us_long_form}</p>
                  </Expandable>
                )}

                {/* Switch story legs (Rights Holder) */}
                {seg.switch_story_legs && seg.switch_story_legs.length > 0 && (
                  <Expandable label={`Switch story legs (${seg.switch_story_legs.length})`}>
                    <div className="space-y-3">
                      {seg.switch_story_legs.map((leg, i) => (
                        <div key={i} className="bg-card border border-border-soft rounded p-3">
                          <span className="text-xs font-bold text-accent mr-1">{i + 1}.</span>
                          <span className="text-xs text-fg-2 leading-relaxed">{leg}</span>
                        </div>
                      ))}
                    </div>
                  </Expandable>
                )}

                {/* Agency-specific */}
                {seg.two_buyer_profiles && (
                  <Expandable label="Two buyer profiles">
                    <p className="text-xs text-fg-2 leading-relaxed bg-card border border-border-soft rounded p-3">{seg.two_buyer_profiles}</p>
                  </Expandable>
                )}
                {seg.second_call_discovery_question && (
                  <div className="bg-accent/5 border border-accent/20 rounded p-3">
                    <p className="text-xs text-fg-3 mb-1">Second call discovery question:</p>
                    <p className="text-xs text-accent italic">"{seg.second_call_discovery_question}"</p>
                  </div>
                )}

                {/* Brand-specific */}
                {seg.enrichment_caveat && (
                  <div className="bg-warm/5 border border-warm/20 rounded p-2.5">
                    <p className="text-xs text-warm font-medium mb-0.5">Enrichment caveat</p>
                    <p className="text-xs text-fg-2">{seg.enrichment_caveat}</p>
                  </div>
                )}

                {/* Team-specific */}
                {seg.esports_outbound_rule && (
                  <div className="bg-score-low/5 border border-score-low/20 rounded p-2.5">
                    <p className="text-xs text-score-low font-medium mb-0.5">Esports outbound rule</p>
                    <p className="text-xs text-fg-2">{seg.esports_outbound_rule}</p>
                  </div>
                )}

                {/* Title groups */}
                <div className="space-y-2.5">
                  <TitleGroup label="Default first touch" titles={seg.default_first_touch_titles} variant="green" />
                  <TitleGroup label="Specialist (high-value)" titles={seg.specialist_titles} notes={seg.specialist_titles_notes} variant="accent" />
                  <TitleGroup label="Parallel influencer" titles={seg.influencer_titles} notes={seg.influencer_titles_notes} variant="warm" />
                  <TitleGroup label="Do not target" titles={seg.do_not_target_titles} notes={seg.do_not_target_notes} variant="red" />
                  {seg.c_suite_note && (
                    <p className="text-xs text-fg-3 italic">C-suite: {seg.c_suite_note}</p>
                  )}
                </div>

                {/* Deal + metadata */}
                {seg.typical_deal_pattern && (
                  <div>
                    <span className="text-xs text-fg-3">Deal pattern: </span>
                    <span className="text-xs text-fg-2">{seg.typical_deal_pattern}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-3">
                  {seg.typical_deal_size && <span>Size: <span className="text-accent font-medium">{seg.typical_deal_size}</span></span>}
                  {seg.priority_sports && <span>Sports: {seg.priority_sports}</span>}
                  {seg.priority_regions && <span>Regions: {seg.priority_regions}</span>}
                </div>

                {seg.recommended_modules?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {seg.recommended_modules.map(m => <span key={m} className="px-1.5 py-0.5 bg-accent-muted text-accent text-xs rounded">{m}</span>)}
                  </div>
                )}

                {seg.example_companies && (
                  <p className="text-xs text-fg-3">Examples: {seg.example_companies}</p>
                )}
              </div>
            )}

            {/* Version history */}
            {historyOpen[seg.id] && (
              <div className="border-t border-border-soft px-5 py-3 bg-card/50">
                <p className="text-xs font-medium text-fg-2 mb-2">Version history</p>
                {(history[seg.id] ?? []).length === 0 ? (
                  <p className="text-xs text-fg-3">No history yet.</p>
                ) : (history[seg.id] as Array<{ id: string; created_at: string; previous_data: Partial<Segment> }>).map(h => (
                  <div key={h.id} className="flex items-center justify-between py-1 border-b border-border-soft last:border-0">
                    <span className="text-xs text-fg-3">{new Date(h.created_at).toLocaleString()} — v{h.previous_data?.version}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
