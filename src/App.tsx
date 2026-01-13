import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { CsvDataset, CsvRow } from './lib/csv'
import { parseCsvFile, parseCsvText } from './lib/csv'
import type { MatchStatus, ReconcileConfig, ReconcileResult } from './lib/reconcile'
import { reconcileDatasets } from './lib/reconcile'

type DatasetSide = 'left' | 'right'

const STATUS_LABEL: Record<MatchStatus, string> = {
  matched: 'Matched',
  mismatched: 'Mismatched',
  missing_in_left: 'Missing in Left',
  missing_in_right: 'Missing in Right',
  duplicate_key: 'Duplicate Key',
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, ' ')
}

function guessColumn(headers: string[], candidates: string[]): string | undefined {
  const normalized = headers.map((h) => ({ raw: h, n: normalizeHeader(h) }))
  for (const cand of candidates) {
    const c = normalizeHeader(cand)
    const hit = normalized.find((h) => h.n === c) ?? normalized.find((h) => h.n.includes(c))
    if (hit) return hit.raw
  }
  return undefined
}

function compactRow(row?: CsvRow): string {
  if (!row) return ''
  const parts: string[] = []
  for (const [k, v] of Object.entries(row)) {
    if (!v) continue
    parts.push(`${k}:${v}`)
    if (parts.length >= 10) break
  }
  return parts.join(' | ')
}

function badgeClasses(status: MatchStatus): string {
  switch (status) {
    case 'matched':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200'
    case 'mismatched':
      return 'bg-amber-50 text-amber-900 ring-amber-200'
    case 'missing_in_left':
    case 'missing_in_right':
      return 'bg-rose-50 text-rose-900 ring-rose-200'
    case 'duplicate_key':
      return 'bg-purple-50 text-purple-900 ring-purple-200'
  }
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

function Button({
  variant,
  disabled,
  onClick,
  children,
}: {
  variant: ButtonVariant
  disabled?: boolean
  onClick?: () => void
  children: React.ReactNode
}) {
  const base =
    'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'
  const styles: Record<ButtonVariant, string> = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-400',
    secondary: 'bg-emerald-600 text-white hover:bg-emerald-500 focus:ring-emerald-300',
    ghost: 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus:ring-slate-300',
  }

  return (
    <button className={`${base} ${styles[variant]}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

function FileDropzone({
  title,
  subtitle,
  disabled,
  onFile,
}: {
  title: string
  subtitle: string
  disabled?: boolean
  onFile: (file: File) => void
}) {
  const [dragOver, setDragOver] = useState(false)
  const border = dragOver ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'

  return (
    <div
      className={`rounded-xl border ${border} p-4 transition`}
      onDragOver={(e) => {
        e.preventDefault()
        if (disabled) return
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        if (disabled) return
        const file = e.dataTransfer.files?.[0]
        if (file) onFile(file)
      }}
    >
      <div className="flex flex-col gap-1">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="text-xs text-slate-500">{subtitle}</div>
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={disabled}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onFile(file)
            }}
          />
          <span className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50">
            Choose CSV
          </span>
          <span className="text-xs text-slate-500">or drag & drop here</span>
        </label>
        <div className="text-xs text-slate-500">CSV with headers in first row</div>
      </div>
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
        <div className="h-2 w-2 rounded-full bg-slate-300" />
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{value}</div>
    </div>
  )
}

function DataPreview({ dataset }: { dataset: CsvDataset }) {
  const [open, setOpen] = useState(true)
  const headers = dataset.headers.slice(0, 6)
  const rows = dataset.rows.slice(0, 5)
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{dataset.name}</div>
          <div className="text-xs text-slate-500">{dataset.rows.length} rows • {dataset.headers.length} columns</div>
        </div>
        <Button variant="ghost" onClick={() => setOpen((v) => !v)}>
          {open ? 'Hide preview' : 'Show preview'}
        </Button>
      </div>
      {open && (
        <div className="mt-3 overflow-auto rounded-lg border border-slate-200">
        <table className="min-w-[560px] w-full text-left text-xs">
          <thead className="sticky top-0 bg-slate-50 text-slate-600">
            <tr>
              {headers.map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-t border-slate-200 even:bg-slate-50/40">
                {headers.map((h) => (
                  <td key={h} className="whitespace-nowrap px-3 py-2 text-slate-900">
                    {row[h] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  )
}

function ColumnPicker({
  label,
  headers,
  value,
  onChange,
  allowEmpty,
}: {
  label: string
  headers: string[]
  value: string | undefined
  onChange: (next: string | undefined) => void
  allowEmpty?: boolean
}) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-slate-600">{label}</div>
      <select
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? e.target.value : undefined)}
      >
        {allowEmpty && <option value="">(none)</option>}
        {!allowEmpty && <option value="">Select…</option>}
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </label>
  )
}

function KeyColumnsPicker({
  label,
  headers,
  value,
  onChange,
}: {
  label: string
  headers: string[]
  value: string[]
  onChange: (next: string[]) => void
}) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-600">{label}</div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {headers.map((h) => {
          const checked = value.includes(h)
          return (
            <label
              key={h}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  const next = e.target.checked ? [...value, h] : value.filter((x) => x !== h)
                  onChange(next)
                }}
              />
              <span className="truncate" title={h}>
                {h}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

async function fetchSample(path: string): Promise<string> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`Failed to load sample: ${path}`)
  return res.text()
}

function App() {
  const [leftDataset, setLeftDataset] = useState<CsvDataset | null>(null)
  const [rightDataset, setRightDataset] = useState<CsvDataset | null>(null)
  const [leftText, setLeftText] = useState('')
  const [rightText, setRightText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isWorking, setIsWorking] = useState(false)

  const [config, setConfig] = useState<ReconcileConfig>({
    left: { keyColumns: [], amountColumn: undefined, dateColumn: undefined },
    right: { keyColumns: [], amountColumn: undefined, dateColumn: undefined },
    amountTolerance: 0,
  })

  const [result, setResult] = useState<ReconcileResult | null>(null)
  const [statusFilter, setStatusFilter] = useState<MatchStatus | 'all'>('all')
  const [search, setSearch] = useState('')

  const leftHeaders = leftDataset?.headers ?? []
  const rightHeaders = rightDataset?.headers ?? []

  function applyGuesses(side: DatasetSide, headers: string[]) {
    const keyGuess = guessColumn(headers, ['invoice', 'invoice no', 'invoice_no', 'inv', 'reference', 'ref', 'id'])
    const amountGuess = guessColumn(headers, ['amount', 'total', 'value', 'net', 'gross'])
    const dateGuess = guessColumn(headers, ['date', 'invoice date', 'txn date', 'transaction date'])

    setConfig((prev) => {
      const targetPrev = side === 'left' ? prev.left : prev.right
      const targetNext = {
        ...targetPrev,
        keyColumns:
          keyGuess && targetPrev.keyColumns.length === 0 ? [keyGuess] : targetPrev.keyColumns,
        amountColumn: amountGuess && !targetPrev.amountColumn ? amountGuess : targetPrev.amountColumn,
        dateColumn: dateGuess && !targetPrev.dateColumn ? dateGuess : targetPrev.dateColumn,
      }
      return side === 'left' ? { ...prev, left: targetNext } : { ...prev, right: targetNext }
    })
  }

  async function loadFromFile(side: DatasetSide, file: File) {
    setError(null)
    setIsWorking(true)
    try {
      const dataset = await parseCsvFile(file)
      if (side === 'left') setLeftDataset(dataset)
      else setRightDataset(dataset)
      applyGuesses(side, dataset.headers)
      setResult(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse CSV')
    } finally {
      setIsWorking(false)
    }
  }

  async function loadFromText(side: DatasetSide, text: string) {
    setError(null)
    setIsWorking(true)
    try {
      const dataset = await parseCsvText(text, side === 'left' ? 'Left (pasted)' : 'Right (pasted)')
      if (side === 'left') setLeftDataset(dataset)
      else setRightDataset(dataset)
      applyGuesses(side, dataset.headers)
      setResult(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse CSV')
    } finally {
      setIsWorking(false)
    }
  }

  async function loadSamples() {
    setError(null)
    setIsWorking(true)
    try {
      const [purchases, sales] = await Promise.all([
        fetchSample('/samples/purchases.csv'),
        fetchSample('/samples/sales.csv'),
      ])
      setLeftText(purchases)
      setRightText(sales)
      await loadFromText('left', purchases)
      await loadFromText('right', sales)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load samples')
    } finally {
      setIsWorking(false)
    }
  }

  function runReconciliation() {
    setError(null)
    if (!leftDataset || !rightDataset) {
      setError('Upload or paste both datasets first.')
      return
    }

    try {
      const out = reconcileDatasets(leftDataset.rows, rightDataset.rows, config)
      setResult(out)
      setStatusFilter('all')
      setSearch('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reconcile')
    }
  }

  const charts = useMemo(() => {
    if (!result) return null
    const pie = [
      { name: 'Matched', value: result.summary.matched, color: '#10b981' },
      { name: 'Mismatched', value: result.summary.mismatched, color: '#f59e0b' },
      { name: 'Missing', value: result.summary.missingInLeft + result.summary.missingInRight, color: '#f43f5e' },
      { name: 'Duplicate', value: result.summary.duplicateKey, color: '#a855f7' },
    ].filter((d) => d.value > 0)

    const bar = [
      { name: 'Matched', count: result.summary.matched },
      { name: 'Mismatched', count: result.summary.mismatched },
      { name: 'Missing L', count: result.summary.missingInLeft },
      { name: 'Missing R', count: result.summary.missingInRight },
      { name: 'Duplicate', count: result.summary.duplicateKey },
    ]

    return { pie, bar }
  }, [result])

  const filteredRows = useMemo(() => {
    if (!result) return []
    const q = search.trim().toLowerCase()
    return result.rows
      .filter((r) => (statusFilter === 'all' ? true : r.status === statusFilter))
      .filter((r) => {
        if (!q) return true
        const haystack = [
          r.key,
          STATUS_LABEL[r.status],
          r.reasons.join(' | '),
          compactRow(r.leftRow),
          compactRow(r.rightRow),
        ]
          .join(' | ')
          .toLowerCase()
        return haystack.includes(q)
      })
  }, [result, search, statusFilter])

  const filterChips = useMemo(() => {
    if (!result) return [] as Array<{ key: MatchStatus | 'all'; label: string; count: number }>
    return [
      { key: 'all' as const, label: 'All', count: result.rows.length },
      { key: 'matched' as const, label: 'Matched', count: result.summary.matched },
      { key: 'mismatched' as const, label: 'Mismatched', count: result.summary.mismatched },
      {
        key: 'missing_in_left' as const,
        label: 'Missing in Left',
        count: result.summary.missingInLeft,
      },
      {
        key: 'missing_in_right' as const,
        label: 'Missing in Right',
        count: result.summary.missingInRight,
      },
      { key: 'duplicate_key' as const, label: 'Duplicate Key', count: result.summary.duplicateKey },
    ]
  }, [result])

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 to-slate-600 text-white shadow-sm">
                <span className="text-sm font-semibold">SR</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold leading-tight text-slate-900 sm:text-xl">Smart Reconciliation Visualizer</h1>
                <p className="mt-0.5 text-sm text-slate-600">
                  Compare 2 CSV datasets and spot mismatches fast.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={loadSamples} disabled={isWorking}>
                Load sample data
              </Button>
              <Button
                variant="secondary"
                onClick={runReconciliation}
                disabled={isWorking || !leftDataset || !rightDataset}
              >
                Run reconciliation
              </Button>
            </div>
          </div>

          {error && (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {error}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
          <div className="font-semibold text-slate-900">Quick steps</div>
          <ol className="mt-1 list-decimal pl-5 text-slate-600">
            <li>Upload (or paste) both datasets</li>
            <li>Select key columns and optional amount/date columns</li>
            <li>Run reconciliation and filter/search results</li>
          </ol>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Left dataset</div>
                <div className="text-xs text-slate-500">Example: purchase register</div>
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              <FileDropzone
                title="Upload CSV"
                subtitle="Drop a file here or choose from your device"
                disabled={isWorking}
                onFile={(file) => void loadFromFile('left', file)}
              />

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">Or paste CSV</div>
                <div className="mt-1 text-xs text-slate-500">Paste text including header row</div>
                <textarea
                  className="mt-3 h-28 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="InvoiceNo,Date,Vendor,Amount\nP-1001,2025-12-01,ABC,1000"
                  value={leftText}
                  onChange={(e) => setLeftText(e.target.value)}
                />
                <div className="mt-3">
                  <Button
                    variant="ghost"
                    onClick={() => void loadFromText('left', leftText)}
                    disabled={isWorking || !leftText.trim()}
                  >
                    Load from pasted CSV
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <div className="text-sm font-semibold text-slate-900">Right dataset</div>
              <div className="text-xs text-slate-500">Example: sales register</div>
            </div>

            <div className="mt-4 grid gap-4">
              <FileDropzone
                title="Upload CSV"
                subtitle="Drop a file here or choose from your device"
                disabled={isWorking}
                onFile={(file) => void loadFromFile('right', file)}
              />

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">Or paste CSV</div>
                <div className="mt-1 text-xs text-slate-500">Paste text including header row</div>
                <textarea
                  className="mt-3 h-28 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="InvoiceNo,Date,Customer,Amount\nP-1001,2025-12-01,ABC,1000"
                  value={rightText}
                  onChange={(e) => setRightText(e.target.value)}
                />
                <div className="mt-3">
                  <Button
                    variant="ghost"
                    onClick={() => void loadFromText('right', rightText)}
                    disabled={isWorking || !rightText.trim()}
                  >
                    Load from pasted CSV
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {(leftDataset || rightDataset) && (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {leftDataset && <DataPreview dataset={leftDataset} />}
            {rightDataset && <DataPreview dataset={rightDataset} />}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Matching configuration</div>
              <div className="text-xs text-slate-500">
                Choose key columns (required) and optional comparisons like amount/date.
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">Left mapping</div>
              <div className="mt-4 grid gap-4">
                <KeyColumnsPicker
                  label="Key columns"
                  headers={leftHeaders}
                  value={config.left.keyColumns}
                  onChange={(next) =>
                    setConfig((prev) => ({ ...prev, left: { ...prev.left, keyColumns: next } }))
                  }
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <ColumnPicker
                    label="Amount column (optional)"
                    headers={leftHeaders}
                    allowEmpty
                    value={config.left.amountColumn}
                    onChange={(next) => setConfig((prev) => ({ ...prev, left: { ...prev.left, amountColumn: next } }))}
                  />
                  <ColumnPicker
                    label="Date column (optional)"
                    headers={leftHeaders}
                    allowEmpty
                    value={config.left.dateColumn}
                    onChange={(next) => setConfig((prev) => ({ ...prev, left: { ...prev.left, dateColumn: next } }))}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">Right mapping</div>
              <div className="mt-4 grid gap-4">
                <KeyColumnsPicker
                  label="Key columns"
                  headers={rightHeaders}
                  value={config.right.keyColumns}
                  onChange={(next) =>
                    setConfig((prev) => ({ ...prev, right: { ...prev.right, keyColumns: next } }))
                  }
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <ColumnPicker
                    label="Amount column (optional)"
                    headers={rightHeaders}
                    allowEmpty
                    value={config.right.amountColumn}
                    onChange={(next) =>
                      setConfig((prev) => ({ ...prev, right: { ...prev.right, amountColumn: next } }))
                    }
                  />
                  <ColumnPicker
                    label="Date column (optional)"
                    headers={rightHeaders}
                    allowEmpty
                    value={config.right.dateColumn}
                    onChange={(next) => setConfig((prev) => ({ ...prev, right: { ...prev.right, dateColumn: next } }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="block">
              <div className="text-xs font-medium text-slate-600">Amount tolerance</div>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                type="number"
                min={0}
                step="0.01"
                value={config.amountTolerance}
                onChange={(e) => setConfig((prev) => ({ ...prev, amountTolerance: Number(e.target.value) }))}
              />
              <div className="mt-1 text-xs text-slate-500">Absolute difference allowed (e.g., 0.01 or 1.00)</div>
            </label>
          </div>
        </div>

        {result && (
          <div className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <KpiCard label="Left rows" value={result.summary.leftCount} />
              <KpiCard label="Right rows" value={result.summary.rightCount} />
              <KpiCard label="Matched" value={result.summary.matched} />
              <KpiCard label="Mismatched" value={result.summary.mismatched} />
              <KpiCard label="Missing" value={result.summary.missingInLeft + result.summary.missingInRight} />
              <KpiCard label="Duplicates" value={result.summary.duplicateKey} />
            </div>

            {charts && (
              <div className="mt-4 grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">Status breakdown</div>
                  <div className="mt-3 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={charts.pie} dataKey="value" nameKey="name" outerRadius={90} label>
                          {charts.pie.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">Counts</div>
                  <div className="mt-3 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={charts.bar} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#0f172a" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Results</div>
                  <div className="text-xs text-slate-500">{filteredRows.length} rows shown</div>
                </div>
                <input
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400 sm:w-80"
                  placeholder="Search key, reasons, values…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {filterChips.map((chip) => {
                  const active = statusFilter === chip.key
                  return (
                    <button
                      key={chip.key}
                      className={
                        active
                          ? 'rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white'
                          : 'rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50'
                      }
                      onClick={() => setStatusFilter(chip.key)}
                    >
                      {chip.label} <span className={active ? 'text-white/80' : 'text-slate-500'}>({chip.count})</span>
                    </button>
                  )
                })}
              </div>

              <div className="mt-4 overflow-auto rounded-lg border border-slate-200">
                <table className="min-w-[960px] w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Key</th>
                      <th className="px-3 py-2 font-medium">Reasons</th>
                      <th className="px-3 py-2 font-medium">Left row (preview)</th>
                      <th className="px-3 py-2 font-medium">Right row (preview)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((r, idx) => (
                      <tr
                        key={`${r.status}-${r.key}-${idx}`}
                        className="border-t border-slate-200 odd:bg-white even:bg-slate-50/40 hover:bg-slate-50"
                      >
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ring-1 ring-inset ${badgeClasses(
                              r.status,
                            )}`}
                          >
                            {STATUS_LABEL[r.status]}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">{r.key}</td>
                        <td className="px-3 py-2 text-slate-900">{r.reasons.length ? r.reasons.join(' • ') : '—'}</td>
                        <td className="px-3 py-2 text-slate-700">{r.leftRow ? compactRow(r.leftRow) : '—'}</td>
                        <td className="px-3 py-2 text-slate-700">{r.rightRow ? compactRow(r.rightRow) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 text-xs text-slate-500 sm:px-6 lg:px-8">
          Tip: Start with one key column (e.g., InvoiceNo), then add amount/date comparisons.
        </div>
      </footer>
    </div>
  )
}

export default App
