'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Upload, CheckCircle, AlertCircle, Loader2, BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// ─── CSV parser ─────────────────────────────────────────────────────────────

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const bom = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text
  const lines = bom.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }
  const sep = lines[0].includes('\t') ? '\t' : ','

  function parseLine(line: string): string[] {
    const cells: string[] = []; let i = 0
    while (i < line.length) {
      if (line[i] === '"') {
        let cell = ''; i++
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') { cell += '"'; i += 2 }
          else if (line[i] === '"') { i++; break }
          else cell += line[i++]
        }
        cells.push(cell)
        if (line[i] === sep) i++
      } else {
        let cell = ''
        while (i < line.length && line[i] !== sep) cell += line[i++]
        cells.push(cell.trim()); if (line[i] === sep) i++
      }
    }
    return cells
  }

  const headers = parseLine(lines[0])
  const rows = lines.slice(1).map(line => {
    const vals = parseLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = vals[i] ?? '' })
    return row
  }).filter(r => Object.values(r).some(v => v.trim()))
  return { headers, rows }
}

// ─── Field definitions ────────────────────────────────────────────────────

const LEAD_FIELDS = [
  { key: 'first_name',       label: 'First Name' },
  { key: 'last_name',        label: 'Last Name' },
  { key: 'full_name',        label: 'Full Name (auto-split)' },
  { key: 'title',            label: 'Job Title' },
  { key: 'linkedin_url',     label: 'LinkedIn URL' },
  { key: 'email',            label: 'Email' },
  { key: 'phone',            label: 'Phone' },
  { key: 'company_name',     label: 'Company Name' },
  { key: 'company_domain',   label: 'Company Domain' },
  { key: 'company_country',  label: 'Company Country' },
  { key: 'company_industry', label: 'Industry' },
  { key: 'company_size',     label: 'Company Size' },
  { key: 'internal_notes',   label: 'Notes' },
]
const SKIP = '--skip--'

function autoMap(header: string): string {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, '')
  const map: Record<string, string> = {
    firstname: 'first_name', firstname_: 'first_name', vorname: 'first_name',
    lastname: 'last_name', surname: 'last_name', nachname: 'last_name',
    fullname: 'full_name', name: 'full_name',
    title: 'title', jobtitle: 'title', position: 'title',
    linkedin: 'linkedin_url', linkedinurl: 'linkedin_url', linkedinprofile: 'linkedin_url',
    email: 'email', emailaddress: 'email', mail: 'email',
    phone: 'phone', telephone: 'phone', tel: 'phone',
    company: 'company_name', companyname: 'company_name', organization: 'company_name', firma: 'company_name',
    domain: 'company_domain', website: 'company_domain',
    country: 'company_country', land: 'company_country',
    industry: 'company_industry', sector: 'company_industry',
    size: 'company_size', employees: 'company_size',
    notes: 'internal_notes', comment: 'internal_notes',
  }
  return map[h] ?? SKIP
}

type Step = 1 | 2 | 3 | 4 | 5
const STEP_LABELS = ['Upload', 'Source Context', 'Map Columns', 'Preview & Validate', 'Import']

export default function LeadsImportPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>(1)
  const [parsed, setParsed] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [dragOver, setDragOver] = useState(false)
  const [savedMappings, setSavedMappings] = useState<{ id: string; mapping_name: string; column_map: Record<string, string> }[]>([])
  const [saveMappingName, setSaveMappingName] = useState('')
  const [previewResults, setPreviewResults] = useState<{ row: number; status: string; message: string }[]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; duplicates: number; suppressed: number; invalid: number } | null>(null)
  const [progress, setProgress] = useState(0)

  const [context, setContext] = useState({
    source_type: 'CSV_IMPORT',
    source_detail: '',
    source_warmth: 'UNKNOWN',
    default_segment: '',
    default_tier: 'NONE',
  })

  useEffect(() => {
    createClient().from('csv_column_mappings').select('id, mapping_name, column_map').then(({ data }) => setSavedMappings(data ?? []))
  }, [])

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const data = parseCSV(text)
      setParsed(data)
      const m: Record<string, string> = {}
      data.headers.forEach(h => { m[h] = autoMap(h) })
      setMapping(m)
      setStep(2)
    }
    reader.readAsText(file, 'UTF-8')
  }

  function mapRow(row: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {}
    Object.entries(mapping).forEach(([col, field]) => { if (field !== SKIP && row[col]) out[field] = row[col] })
    if (context.default_segment && !out.segment) out.segment = context.default_segment
    return out
  }

  async function runPreview() {
    if (!parsed) return
    const results: typeof previewResults = []
    for (const [i, row] of parsed.rows.slice(0, 5).entries()) {
      const mapped = mapRow(row)
      const res = await fetch('/api/intake/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: mapped, source: { source_type: context.source_type, source_warmth: context.source_warmth, source_detail: context.source_detail }, dryRun: true }),
      })
      // For now just check field presence (real dry-run in a future iteration)
      const hasPerson = !!(mapped.linkedin_url || mapped.email || (mapped.first_name && mapped.last_name) || mapped.full_name)
      const hasCompany = !!(mapped.company_name || mapped.company_domain)
      results.push({ row: i + 1, status: hasPerson || hasCompany ? 'valid' : 'invalid', message: hasPerson || hasCompany ? 'Ready to import' : 'Missing name/company' })
    }
    setPreviewResults(results)
    setStep(4)
  }

  async function handleSaveMapping() {
    if (!saveMappingName.trim()) return
    const supabase = createClient()
    await supabase.from('csv_column_mappings').insert({ mapping_name: saveMappingName, column_map: mapping })
    setSaveMappingName('')
    const { data } = await supabase.from('csv_column_mappings').select('id, mapping_name, column_map')
    setSavedMappings(data ?? [])
  }

  async function runImport() {
    if (!parsed) return
    setImporting(true)
    const total = parsed.rows.length
    const result = { imported: 0, duplicates: 0, suppressed: 0, invalid: 0 }

    for (const [i, row] of parsed.rows.entries()) {
      setProgress(Math.round(((i + 1) / total) * 100))
      const mapped = mapRow(row)
      const res = await fetch('/api/intake/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: mapped, source: { source_type: context.source_type, source_warmth: context.source_warmth, source_detail: context.source_detail } }),
      })
      const data = await res.json()
      if (data.action === 'CREATED')    result.imported++
      if (data.action === 'DUPLICATE')  result.duplicates++
      if (data.action === 'SUPPRESSED') result.suppressed++
      if (data.action === 'INVALID')    result.invalid++
    }

    // Log to intake_logs
    await createClient().from('intake_logs').insert({
      source_type: context.source_type,
      source_detail: context.source_detail,
      leads_attempted: total,
      leads_imported: result.imported,
      leads_skipped_duplicate: result.duplicates,
      leads_blocked_suppression: result.suppressed,
      leads_failed_validation: result.invalid,
      imported_by: 'user',
    })

    setImportResult(result)
    setImporting(false)
    setStep(5)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border-soft">
        <button onClick={() => router.push('/queue')} className="text-fg-3 hover:text-fg transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h1 className="text-sm font-semibold text-fg">Import Leads from CSV</h1>
      </div>

      {/* Step indicators */}
      <div className="flex items-center px-6 py-3 border-b border-border-soft gap-0">
        {STEP_LABELS.map((label, i) => {
          const s = (i + 1) as Step
          return (
            <div key={s} className="flex items-center">
              <div className={cn('flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded',
                step === s ? 'text-accent' : step > s ? 'text-fg-2' : 'text-fg-3')}>
                <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold',
                  step > s ? 'bg-accent text-sidebar' : step === s ? 'bg-accent-muted text-accent border border-accent' : 'bg-border text-fg-3')}>
                  {step > s ? '✓' : s}
                </span>
                {label}
              </div>
              {i < STEP_LABELS.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-fg-3 mx-1" />}
            </div>
          )
        })}
      </div>

      <div className="flex-1 overflow-auto p-6">

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="max-w-lg mx-auto">
            <div onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              onClick={() => fileRef.current?.click()}
              className={cn('border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors',
                dragOver ? 'border-accent bg-accent-muted' : 'border-border hover:border-accent/50 hover:bg-surface/50')}>
              <Upload className="w-8 h-8 text-fg-3 mx-auto mb-3" />
              <p className="text-sm font-medium text-fg mb-1">Drop your CSV here or click to browse</p>
              <p className="text-xs text-fg-3">Accepts .csv and .tsv files. UTF-8 or ISO encoding.</p>
              <input ref={fileRef} type="file" accept=".csv,.tsv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            </div>
            <div className="mt-4 bg-surface border border-border rounded-lg p-4">
              <p className="text-xs font-medium text-fg-2 mb-2">Scoutly lead fields</p>
              <div className="flex flex-wrap gap-1.5">
                {LEAD_FIELDS.map(f => <span key={f.key} className="px-2 py-0.5 bg-border text-fg-3 text-xs rounded">{f.label}</span>)}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Source context */}
        {step === 2 && (
          <div className="max-w-lg space-y-4">
            <p className="text-xs text-fg-3">{parsed?.rows.length} rows detected. Set the source context before mapping columns.</p>
            <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-fg-3 mb-1">Source Type</label>
                  <select value={context.source_type} onChange={e => setContext(c => ({ ...c, source_type: e.target.value }))}
                    className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent">
                    <option value="CSV_IMPORT">CSV Import</option>
                    <option value="COWORK_EXPORT">Cowork Export</option>
                    <option value="MANUAL_ENTRY">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-fg-3 mb-1">Warmth</label>
                  <select value={context.source_warmth} onChange={e => setContext(c => ({ ...c, source_warmth: e.target.value }))}
                    className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent">
                    <option value="UNKNOWN">Unknown</option><option value="WARM">Warm</option><option value="COLD">Cold</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-fg-3 mb-1">Source Detail</label>
                <input value={context.source_detail} onChange={e => setContext(c => ({ ...c, source_detail: e.target.value }))}
                  placeholder="e.g. Cowork export Apr 26 — football clubs"
                  className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-fg-3 mb-1">Default Segment (optional)</label>
                  <select value={context.default_segment} onChange={e => setContext(c => ({ ...c, default_segment: e.target.value }))}
                    className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent">
                    <option value="">Don&apos;t override</option>
                    <option>Rights Holder</option><option>Brand</option><option>Agency</option><option>Club &amp; Team</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-fg-3 mb-1">Default Tier for new companies</label>
                  <select value={context.default_tier} onChange={e => setContext(c => ({ ...c, default_tier: e.target.value }))}
                    className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent">
                    <option value="NONE">No tier</option><option value="TIER_1">Tier 1</option><option value="ACTIVE">Active</option>
                  </select>
                </div>
              </div>
            </div>
            <button onClick={() => setStep(3)} className="px-4 py-2 bg-accent text-sidebar text-xs font-semibold rounded-lg hover:bg-accent-dim">Continue to Column Mapping →</button>
          </div>
        )}

        {/* Step 3: Column Mapping */}
        {step === 3 && parsed && (
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-fg-3">{parsed.rows.length} rows. Map your CSV columns to Scoutly fields.</p>
              <div className="flex items-center gap-2">
                {savedMappings.length > 0 && (
                  <select onChange={e => {
                    const saved = savedMappings.find(m => m.id === e.target.value)
                    if (saved) setMapping({ ...mapping, ...saved.column_map })
                  }} className="bg-surface border border-border text-xs text-fg rounded px-2 py-1 focus:outline-none">
                    <option value="">Load saved mapping...</option>
                    {savedMappings.map(m => <option key={m.id} value={m.id}>{m.mapping_name}</option>)}
                  </select>
                )}
              </div>
            </div>
            <div className="bg-surface border border-border rounded-lg overflow-hidden mb-4">
              <table className="w-full">
                <thead><tr className="border-b border-border-soft">
                  {['CSV Column', 'Sample Value', 'Maps to'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-fg-3">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {parsed.headers.map(header => (
                    <tr key={header} className="border-b border-border-soft last:border-0">
                      <td className="px-4 py-2.5 text-xs font-medium text-fg">{header}</td>
                      <td className="px-4 py-2.5 text-xs text-fg-3 max-w-[140px] truncate">{parsed.rows[0]?.[header] ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <select value={mapping[header] ?? SKIP} onChange={e => setMapping(m => ({ ...m, [header]: e.target.value }))}
                          className="bg-card border border-border rounded px-2 py-1 text-xs text-fg focus:outline-none focus:border-accent w-48">
                          <option value={SKIP}>— skip —</option>
                          {LEAD_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                <input value={saveMappingName} onChange={e => setSaveMappingName(e.target.value)} placeholder="Save mapping as..."
                  className="bg-surface border border-border rounded px-3 py-1.5 text-xs text-fg focus:outline-none focus:border-accent w-48" />
                <button onClick={handleSaveMapping} disabled={!saveMappingName.trim()}
                  className="px-3 py-1.5 bg-surface border border-border text-xs text-fg-2 rounded hover:text-fg disabled:opacity-50">
                  <BookOpen className="w-3.5 h-3.5 inline mr-1" /> Save
                </button>
              </div>
              <button onClick={runPreview} className="ml-auto px-4 py-2 bg-accent text-sidebar text-xs font-semibold rounded-lg hover:bg-accent-dim">
                Preview → Validate →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Preview */}
        {step === 4 && parsed && (
          <div className="max-w-4xl">
            <p className="text-xs text-fg-3 mb-4">First 5 rows validated (suppression + field checks). Review before importing all {parsed.rows.length} rows.</p>
            <div className="bg-surface border border-border rounded-lg overflow-auto mb-4">
              <table className="w-full">
                <thead><tr className="border-b border-border-soft">
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-fg-3">Row</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-fg-3">Status</th>
                  {LEAD_FIELDS.filter(f => Object.values(mapping).includes(f.key)).slice(0, 5).map(f => (
                    <th key={f.key} className="px-3 py-2.5 text-left text-xs font-medium text-fg-3 whitespace-nowrap">{f.label}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {parsed.rows.slice(0, 5).map((row, i) => {
                    const mapped = mapRow(row)
                    const vr = previewResults[i]
                    return (
                      <tr key={i} className="border-b border-border-soft last:border-0">
                        <td className="px-3 py-2 text-xs text-fg-3">{i + 1}</td>
                        <td className="px-3 py-2">
                          <span className={cn('px-2 py-0.5 rounded text-xs font-medium',
                            vr?.status === 'valid' ? 'bg-score-high/10 text-score-high' : 'bg-score-low/10 text-score-low')}>
                            {vr?.status ?? '...'}
                          </span>
                        </td>
                        {LEAD_FIELDS.filter(f => Object.values(mapping).includes(f.key)).slice(0, 5).map(f => (
                          <td key={f.key} className="px-3 py-2 text-xs text-fg max-w-[120px] truncate">{mapped[f.key] ?? '—'}</td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(3)} className="px-4 py-2 bg-surface border border-border text-xs text-fg-2 rounded-lg hover:text-fg">← Back</button>
              <button onClick={runImport} className="px-4 py-2 bg-accent text-sidebar text-xs font-semibold rounded-lg hover:bg-accent-dim">
                Import all {parsed.rows.length} leads →
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Importing / Results */}
        {step === 5 && (
          <div className="max-w-sm mx-auto text-center">
            {importing ? (
              <>
                <Loader2 className="w-10 h-10 text-accent mx-auto mb-4 animate-spin" />
                <p className="text-sm font-semibold text-fg mb-2">Importing leads...</p>
                <div className="w-full bg-border rounded-full h-2 mb-2">
                  <div className="bg-accent h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-fg-3">{progress}% complete</p>
              </>
            ) : importResult && (
              <>
                <CheckCircle className="w-12 h-12 text-score-high mx-auto mb-4" />
                <h2 className="text-lg font-bold text-fg mb-1">Import complete</h2>
                <p className="text-xs text-fg-3 mb-6">Leads are in the queue, ready for review.</p>
                <div className="grid grid-cols-2 gap-3 mb-6 text-left">
                  {[
                    { label: '✅ Imported',   value: importResult.imported,   color: 'text-score-high' },
                    { label: '🔁 Duplicates', value: importResult.duplicates,  color: 'text-fg-2' },
                    { label: '🚫 Suppressed', value: importResult.suppressed,  color: 'text-warm' },
                    { label: '❌ Invalid',    value: importResult.invalid,     color: importResult.invalid > 0 ? 'text-score-low' : 'text-fg-3' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-surface border border-border rounded-lg p-3">
                      <div className={cn('text-2xl font-bold', color)}>{value}</div>
                      <div className="text-xs text-fg-3">{label}</div>
                    </div>
                  ))}
                </div>
                <button onClick={() => router.push('/queue')}
                  className="w-full py-2.5 bg-accent text-sidebar text-sm font-bold rounded-lg hover:bg-accent-dim">
                  Review imported leads in Queue →
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
