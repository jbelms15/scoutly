'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Upload, ChevronRight, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useKBSegments } from '@/lib/hooks'
import { cn } from '@/lib/utils'

// ─── CSV parser ─────────────────────────────────────────────────────────────
function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }

  function parseLine(line: string): string[] {
    const cells: string[] = []
    let i = 0
    while (i < line.length) {
      if (line[i] === '"') {
        let cell = ''; i++
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') { cell += '"'; i += 2 }
          else if (line[i] === '"') { i++; break }
          else { cell += line[i++] }
        }
        cells.push(cell)
        if (line[i] === ',') i++
      } else {
        let cell = ''
        while (i < line.length && line[i] !== ',') cell += line[i++]
        cells.push(cell.trim())
        if (line[i] === ',') i++
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
  })
  return { headers, rows }
}

function extractDomain(url: string): string {
  try { return new URL(url.includes('://') ? url : 'https://' + url).hostname.replace(/^www\./, '') }
  catch { return '' }
}

// ─── Field definitions ───────────────────────────────────────────────────────
const SCOUTLY_FIELDS = [
  { key: 'name',                  label: 'Company Name',       required: true },
  { key: 'website',               label: 'Website' },
  { key: 'domain',                label: 'Domain' },
  { key: 'linkedin_company_url',  label: 'LinkedIn URL' },
  { key: 'industry',              label: 'Industry' },
  { key: 'size_range',            label: 'Size' },
  { key: 'country',               label: 'Country' },
  { key: 'region',                label: 'Region' },
  { key: 'segment',               label: 'Segment' },
  { key: 'notes',                 label: 'Notes' },
]

const SKIP = '-- skip --'

function autoMap(header: string): string {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (['company', 'companyname', 'name', 'organization'].includes(h)) return 'name'
  if (['website', 'url', 'web', 'homepage'].includes(h)) return 'website'
  if (['domain', 'emaildomain'].includes(h)) return 'domain'
  if (['linkedin', 'linkedinurl', 'linkedincompany'].includes(h)) return 'linkedin_company_url'
  if (['industry', 'sector', 'vertical'].includes(h)) return 'industry'
  if (['size', 'employees', 'companysize', 'sizerange'].includes(h)) return 'size_range'
  if (['country'].includes(h)) return 'country'
  if (['region', 'area'].includes(h)) return 'region'
  if (['segment'].includes(h)) return 'segment'
  if (['notes', 'note', 'comments'].includes(h)) return 'notes'
  return SKIP
}

type Step = 1 | 2 | 3 | 4 | 5

export default function ImportPage() {
  const router = useRouter()
  const { segments } = useKBSegments()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>(1)
  const [parsed, setParsed] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [options, setOptions] = useState({ skipDuplicates: true, updateExisting: false, tagTier: 'NONE', tagSegment: '' })
  const [result, setResult] = useState({ imported: 0, skipped: 0, errors: 0 })
  const [importing, setImporting] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const data = parseCSV(text)
      setParsed(data)
      const map: Record<string, string> = {}
      data.headers.forEach(h => { map[h] = autoMap(h) })
      setMapping(map)
      setStep(2)
    }
    reader.readAsText(file)
  }

  function mapRow(row: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {}
    Object.entries(mapping).forEach(([csvCol, scoutlyField]) => {
      if (scoutlyField !== SKIP && row[csvCol]) out[scoutlyField] = row[csvCol]
    })
    if (out.website && !out.domain) out.domain = extractDomain(out.website)
    if (options.tagTier !== 'NONE') out.target_tier = options.tagTier
    if (options.tagSegment) out.segment = options.tagSegment
    return out
  }

  async function runImport() {
    if (!parsed) return
    setImporting(true)
    const supabase = createClient()
    const { data: existing } = await supabase.from('companies').select('name, domain')
    const existingNames = new Set((existing ?? []).map(c => c.name?.toLowerCase()))
    const existingDomains = new Set((existing ?? []).map(c => c.domain?.toLowerCase()).filter(Boolean))

    let imported = 0, skipped = 0, errors = 0
    const toInsert: Record<string, string>[] = []
    const toUpdate: { name: string; data: Record<string, string> }[] = []

    for (const row of parsed.rows) {
      const mapped = mapRow(row)
      if (!mapped.name) { errors++; continue }

      const isDupe = existingNames.has(mapped.name.toLowerCase()) ||
        (mapped.domain && existingDomains.has(mapped.domain.toLowerCase()))

      if (isDupe) {
        if (options.updateExisting) { toUpdate.push({ name: mapped.name, data: mapped }); imported++ }
        else if (options.skipDuplicates) skipped++
        else toInsert.push({ account_state: 'NEW', target_tier: 'NONE', ...mapped })
      } else {
        toInsert.push({ account_state: 'NEW', target_tier: 'NONE', ...mapped })
      }
    }

    if (toInsert.length > 0) {
      const chunks = Array.from({ length: Math.ceil(toInsert.length / 100) }, (_, i) => toInsert.slice(i * 100, (i + 1) * 100))
      for (const chunk of chunks) {
        const { error } = await supabase.from('companies').insert(chunk)
        if (error) errors += chunk.length
        else imported += chunk.length
      }
    }

    for (const { name, data } of toUpdate) {
      await supabase.from('companies').update(data).ilike('name', name)
    }

    setResult({ imported, skipped, errors })
    setImporting(false)
    setStep(5)
  }

  const previewRows = parsed?.rows.slice(0, 5) ?? []

  const STEPS = ['Upload', 'Map Columns', 'Preview', 'Options', 'Done']

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border-soft">
        <button onClick={() => router.push('/accounts')} className="text-fg-3 hover:text-fg transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h1 className="text-sm font-semibold text-fg">Import Companies from CSV</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center px-6 py-3 border-b border-border-soft gap-0">
        {STEPS.map((label, i) => {
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
              {i < STEPS.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-fg-3 mx-1" />}
            </div>
          )
        })}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-auto p-6">

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="max-w-lg mx-auto">
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              onClick={() => fileRef.current?.click()}
              className={cn('border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors',
                dragOver ? 'border-accent bg-accent-muted' : 'border-border hover:border-accent/50 hover:bg-surface/50')}>
              <Upload className="w-8 h-8 text-fg-3 mx-auto mb-3" />
              <p className="text-sm font-medium text-fg mb-1">Drop your CSV here or click to browse</p>
              <p className="text-xs text-fg-3">Required column: Company Name. All other columns are optional.</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            </div>
            <div className="mt-4 bg-surface border border-border rounded-lg p-4">
              <p className="text-xs font-medium text-fg-2 mb-2">Expected columns (any order)</p>
              <div className="flex flex-wrap gap-1.5">
                {SCOUTLY_FIELDS.map(f => (
                  <span key={f.key} className={cn('px-2 py-0.5 rounded text-xs', f.required ? 'bg-accent-muted text-accent' : 'bg-border text-fg-3')}>
                    {f.label}{f.required ? ' *' : ''}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Map columns */}
        {step === 2 && parsed && (
          <div className="max-w-2xl">
            <p className="text-xs text-fg-3 mb-4">
              Map each CSV column to a Scoutly field. Auto-detected where possible.
              <strong className="text-fg"> {parsed.rows.length} rows</strong> found.
            </p>
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-soft">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-fg-3">CSV Column</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-fg-3">Sample Value</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-fg-3">Map to Scoutly Field</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.headers.map(header => (
                    <tr key={header} className="border-b border-border-soft last:border-0">
                      <td className="px-4 py-2.5 text-xs font-medium text-fg">{header}</td>
                      <td className="px-4 py-2.5 text-xs text-fg-3 max-w-[160px] truncate">
                        {parsed.rows[0]?.[header] ?? '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <select value={mapping[header] ?? SKIP}
                          onChange={e => setMapping(m => ({ ...m, [header]: e.target.value }))}
                          className="bg-card border border-border rounded px-2 py-1 text-xs text-fg focus:outline-none focus:border-accent w-48">
                          <option value={SKIP}>— skip —</option>
                          {SCOUTLY_FIELDS.map(f => (
                            <option key={f.key} value={f.key}>{f.label}{f.required ? ' *' : ''}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setStep(3)}
                disabled={!Object.values(mapping).includes('name')}
                className="px-4 py-2 bg-accent text-sidebar text-xs font-semibold rounded-lg hover:bg-accent-dim disabled:opacity-60 transition-colors">
                Continue to Preview →
              </button>
              {!Object.values(mapping).includes('name') && (
                <p className="text-xs text-score-low self-center">You must map a column to "Company Name"</p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && parsed && (
          <div className="max-w-4xl">
            <p className="text-xs text-fg-3 mb-4">First 5 rows with your column mapping applied.</p>
            <div className="bg-surface border border-border rounded-lg overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-soft">
                    {SCOUTLY_FIELDS.filter(f => Object.values(mapping).includes(f.key)).map(f => (
                      <th key={f.key} className="px-3 py-2.5 text-left text-xs font-medium text-fg-3 whitespace-nowrap">{f.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => {
                    const mapped = mapRow(row)
                    return (
                      <tr key={i} className="border-b border-border-soft last:border-0">
                        {SCOUTLY_FIELDS.filter(f => Object.values(mapping).includes(f.key)).map(f => (
                          <td key={f.key} className="px-3 py-2 text-xs text-fg max-w-[160px] truncate">{mapped[f.key] ?? '—'}</td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setStep(2)} className="px-4 py-2 bg-surface border border-border text-xs text-fg-2 rounded-lg hover:text-fg transition-colors">← Back</button>
              <button onClick={() => setStep(4)} className="px-4 py-2 bg-accent text-sidebar text-xs font-semibold rounded-lg hover:bg-accent-dim transition-colors">Continue to Options →</button>
            </div>
          </div>
        )}

        {/* Step 4: Options */}
        {step === 4 && parsed && (
          <div className="max-w-lg">
            <p className="text-xs text-fg-3 mb-6">
              Ready to import <strong className="text-fg">{parsed.rows.length} companies</strong>. Configure import options.
            </p>
            <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={options.skipDuplicates}
                  onChange={e => setOptions(o => ({ ...o, skipDuplicates: e.target.checked, updateExisting: e.target.checked ? false : o.updateExisting }))}
                  className="mt-0.5 accent-accent" />
                <div>
                  <p className="text-xs font-medium text-fg">Skip duplicates</p>
                  <p className="text-xs text-fg-3">If a company with the same name or domain exists, skip it</p>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={options.updateExisting}
                  onChange={e => setOptions(o => ({ ...o, updateExisting: e.target.checked, skipDuplicates: e.target.checked ? false : o.skipDuplicates }))}
                  className="mt-0.5 accent-accent" />
                <div>
                  <p className="text-xs font-medium text-fg">Update existing if duplicate</p>
                  <p className="text-xs text-fg-3">If match found, overwrite existing fields with CSV data</p>
                </div>
              </label>
              <div className="pt-2 border-t border-border-soft">
                <label className="block text-xs text-fg-3 mb-2">Tag all imported companies as Tier:</label>
                <select value={options.tagTier} onChange={e => setOptions(o => ({ ...o, tagTier: e.target.value }))}
                  className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent">
                  <option value="NONE">No tier</option>
                  <option value="TIER_1">Tier 1 — Dream accounts</option>
                  <option value="TIER_2">Tier 2 — Strong fit</option>
                  <option value="TIER_3">Tier 3 — Watch list</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-fg-3 mb-2">Tag all imported companies as Segment:</label>
                <select value={options.tagSegment} onChange={e => setOptions(o => ({ ...o, tagSegment: e.target.value }))}
                  className="w-full bg-card border border-border rounded px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent">
                  <option value="">Don't override (use CSV value)</option>
                  {segments.map(s => <option key={s.segment_name} value={s.segment_name}>{s.segment_name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setStep(3)} className="px-4 py-2 bg-surface border border-border text-xs text-fg-2 rounded-lg hover:text-fg transition-colors">← Back</button>
              <button onClick={runImport} disabled={importing}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-sidebar text-xs font-bold rounded-lg hover:bg-accent-dim disabled:opacity-60 transition-colors">
                {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                {importing ? 'Importing...' : `Import ${parsed.rows.length} Companies`}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Results */}
        {step === 5 && (
          <div className="max-w-sm mx-auto text-center">
            <CheckCircle className="w-12 h-12 text-score-high mx-auto mb-4" />
            <h2 className="text-lg font-bold text-fg mb-1">Import complete</h2>
            <p className="text-xs text-fg-3 mb-6">Your companies have been added to Scoutly.</p>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'Imported', value: result.imported, color: 'text-score-high' },
                { label: 'Skipped', value: result.skipped, color: 'text-fg-2' },
                { label: 'Errors', value: result.errors, color: result.errors > 0 ? 'text-score-low' : 'text-fg-3' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-surface border border-border rounded-lg p-3">
                  <div className={cn('text-2xl font-bold', color)}>{value}</div>
                  <div className="text-xs text-fg-3">{label}</div>
                </div>
              ))}
            </div>
            {result.errors > 0 && (
              <div className="flex items-center gap-2 p-3 bg-score-low/10 border border-score-low/20 rounded-lg mb-4 text-left">
                <AlertCircle className="w-4 h-4 text-score-low shrink-0" />
                <p className="text-xs text-score-low">{result.errors} row{result.errors > 1 ? 's' : ''} failed — usually missing Company Name.</p>
              </div>
            )}
            <button onClick={() => router.push('/accounts')}
              className="w-full py-2.5 bg-accent text-sidebar text-sm font-bold rounded-lg hover:bg-accent-dim transition-colors">
              View All Accounts
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
