import Papa, { type ParseResult } from 'papaparse'

export type CsvRow = Record<string, string>

export type CsvDataset = {
  name: string
  headers: string[]
  rows: CsvRow[]
}

function normalizeHeader(header: string): string {
  return header.trim()
}

function toStringRow(input: Record<string, unknown>): CsvRow {
  const output: CsvRow = {}
  for (const [key, value] of Object.entries(input)) {
    const normalizedKey = normalizeHeader(key)
    if (!normalizedKey) continue
    output[normalizedKey] = value == null ? '' : String(value)
  }
  return output
}

export async function parseCsvText(text: string, name = 'Dataset'): Promise<CsvDataset> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h: string) => normalizeHeader(h),
      complete: (result: ParseResult<Record<string, unknown>>) => {
        if (result.errors?.length) {
          reject(new Error(result.errors[0]?.message || 'Failed to parse CSV'))
          return
        }

        const headers = (result.meta.fields || []).map(normalizeHeader).filter(Boolean)
        const rows = (result.data || []).map(toStringRow)
        resolve({ name, headers, rows })
      },
      error: (err: Error) => reject(err),
    })
  })
}

export async function parseCsvFile(file: File): Promise<CsvDataset> {
  const text = await file.text()
  return parseCsvText(text, file.name)
}
