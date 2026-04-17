import Papa from 'papaparse'

// Parse clipboard payload into 2D string grid. Prefers HTML table (Google
// Sheets) and falls back to TSV (Excel). Returns [] when no usable payload.
export function parseClipboard(dt: DataTransfer | null): string[][] {
  if (!dt) return []
  const html = dt.getData('text/html')
  if (html && /<table[\s>]/i.test(html)) {
    const grid = parseHtml(html)
    if (grid.length) return grid
  }
  const text = dt.getData('text/plain')
  if (!text) return []
  return parseTsv(text)
}

export function parseHtml(html: string): string[][] {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const rows = Array.from(doc.querySelectorAll('tr'))
    return rows.map((tr) =>
      Array.from(tr.querySelectorAll('td, th')).map((c) => (c.textContent ?? '').trim()),
    ).filter((r) => r.length > 0)
  } catch {
    return []
  }
}

export function parseTsv(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const hasTab = /\t/.test(normalized)
  const res = Papa.parse<string[]>(normalized, {
    delimiter: hasTab ? '\t' : '',
    skipEmptyLines: true,
  })
  return (res.data as string[][]).map((r) => r.map((c) => (c ?? '').trim()))
}

// Coerce a cell value to a valid coefficient. Returns null for non-numeric or
// out-of-range values so the caller can skip them.
export function coerceCoef(raw: string): number | null {
  if (raw === '' || raw == null) return null
  const cleaned = raw.replace(',', '.').trim()
  if (!/^-?\d*\.?\d+$/.test(cleaned)) return null
  const n = parseFloat(cleaned)
  if (!isFinite(n)) return null
  if (n <= 0 || n > 3) return null
  return n
}
