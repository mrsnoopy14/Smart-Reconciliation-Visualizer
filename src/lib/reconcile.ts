import type { CsvRow } from './csv'

export type MatchStatus =
  | 'matched'
  | 'mismatched'
  | 'missing_in_left'
  | 'missing_in_right'
  | 'duplicate_key'

export type DatasetConfig = {
  keyColumns: string[]
  amountColumn?: string
  dateColumn?: string
}

export type ReconcileConfig = {
  left: DatasetConfig
  right: DatasetConfig
  amountTolerance: number
}

export type ReconcileRowResult = {
  status: MatchStatus
  key: string
  leftRow?: CsvRow
  rightRow?: CsvRow
  reasons: string[]
}

export type ReconcileSummary = {
  leftCount: number
  rightCount: number
  matched: number
  mismatched: number
  missingInLeft: number
  missingInRight: number
  duplicateKey: number
}

export type ReconcileResult = {
  rows: ReconcileRowResult[]
  summary: ReconcileSummary
}

function normalizeKeyPart(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function normalizeKey(row: CsvRow, keyColumns: string[]): string {
  return keyColumns.map((c) => normalizeKeyPart(row[c] ?? '')).join(' | ')
}

function parseAmount(value: unknown): number | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null

  // Remove common currency symbols and thousands separators.
  const cleaned = raw.replace(/[,\s]/g, '').replace(/[₹$€£]/g, '')
  const number = Number(cleaned)
  return Number.isFinite(number) ? number : null
}

function toYmd(value: unknown): string | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null

  // Try Date parsing first.
  const date = new Date(raw)
  if (!Number.isNaN(date.getTime())) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // Very small fallback for dd/mm/yyyy or dd-mm-yyyy.
  const match = raw.match(/^\s*(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\s*$/)
  if (match) {
    const dd = match[1]!.padStart(2, '0')
    const mm = match[2]!.padStart(2, '0')
    const yyyy = match[3]!.length === 2 ? `20${match[3]!}` : match[3]!
    return `${yyyy}-${mm}-${dd}`
  }

  return null
}

type BucketItem = { row: CsvRow; used: boolean }

function buildBuckets(rows: CsvRow[], keyColumns: string[]): Map<string, BucketItem[]> {
  const buckets = new Map<string, BucketItem[]>()
  for (const row of rows) {
    const key = normalizeKey(row, keyColumns)
    if (!key) continue
    const list = buckets.get(key) ?? []
    list.push({ row, used: false })
    buckets.set(key, list)
  }
  return buckets
}

export function reconcileDatasets(
  leftRows: CsvRow[],
  rightRows: CsvRow[],
  config: ReconcileConfig,
): ReconcileResult {
  if (!config.left.keyColumns.length || !config.right.keyColumns.length) {
    throw new Error('Select at least one key column for both datasets.')
  }

  const rightBuckets = buildBuckets(rightRows, config.right.keyColumns)
  const duplicateRightKeys = new Set<string>()
  for (const [key, bucket] of rightBuckets.entries()) {
    if (bucket.length > 1) duplicateRightKeys.add(key)
  }
  const results: ReconcileRowResult[] = []

  let matched = 0
  let mismatched = 0
  let missingInRight = 0
  let duplicateKey = 0

  for (const leftRow of leftRows) {
    const key = normalizeKey(leftRow, config.left.keyColumns)
    if (!key) continue

    const bucket = rightBuckets.get(key)
    if (!bucket || bucket.length === 0) {
      missingInRight += 1
      results.push({ status: 'missing_in_right', key, leftRow, reasons: ['No matching key in right dataset'] })
      continue
    }

    const candidate = bucket.find((b) => !b.used)
    if (!candidate) {
      duplicateKey += 1
      results.push({
        status: 'duplicate_key',
        key,
        leftRow,
        rightRow: bucket[0]!.row,
        reasons: ['Multiple rows share this key in the right dataset'],
      })
      continue
    }

    candidate.used = true

    const rightRow = candidate.row
    const reasons: string[] = []

    if (duplicateRightKeys.has(key)) {
      reasons.push('Duplicate key in right dataset (multiple rows)')
    }

    if (config.left.amountColumn && config.right.amountColumn) {
      const leftAmount = parseAmount(leftRow[config.left.amountColumn])
      const rightAmount = parseAmount(rightRow[config.right.amountColumn])
      if (leftAmount == null || rightAmount == null) {
        reasons.push('Amount missing or unparseable')
      } else {
        const diff = Math.abs(leftAmount - rightAmount)
        if (diff > config.amountTolerance) {
          reasons.push(`Amount differs by ${diff.toFixed(2)} (tolerance ${config.amountTolerance})`)
        }
      }
    }

    if (config.left.dateColumn && config.right.dateColumn) {
      const leftDate = toYmd(leftRow[config.left.dateColumn])
      const rightDate = toYmd(rightRow[config.right.dateColumn])
      if (!leftDate || !rightDate) {
        reasons.push('Date missing or unparseable')
      } else if (leftDate !== rightDate) {
        reasons.push(`Date differs (${leftDate} vs ${rightDate})`)
      }
    }

    if (reasons.length === 0) {
      matched += 1
      results.push({ status: 'matched', key, leftRow, rightRow, reasons: [] })
    } else {
      mismatched += 1
      results.push({ status: 'mismatched', key, leftRow, rightRow, reasons })
    }
  }

  let missingInLeft = 0
  for (const [key, bucket] of rightBuckets.entries()) {
    const isDuplicateKey = duplicateRightKeys.has(key)
    for (const item of bucket) {
      if (item.used) continue

      if (isDuplicateKey) {
        duplicateKey += 1
        results.push({
          status: 'duplicate_key',
          key,
          rightRow: item.row,
          reasons: ['Duplicate key in right dataset (multiple rows)'],
        })
        continue
      }

      missingInLeft += 1
      results.push({
        status: 'missing_in_left',
        key,
        rightRow: item.row,
        reasons: ['No matching key in left dataset'],
      })
    }
  }

  const summary: ReconcileSummary = {
    leftCount: leftRows.length,
    rightCount: rightRows.length,
    matched,
    mismatched,
    missingInLeft,
    missingInRight,
    duplicateKey,
  }

  return { rows: results, summary }
}
