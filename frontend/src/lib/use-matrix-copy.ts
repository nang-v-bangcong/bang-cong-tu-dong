import { useEffect } from 'react'
import { toast } from 'sonner'
import type { models } from '../../wailsjs/go/models'
import { parseCellKey, formatCoef } from './matrix-utils'

interface Options {
  selected: Set<string>
  rows: models.MatrixRow[]
}

// Listen for Ctrl+C (or Cmd+C): when cells are selected and focus is not
// inside an input, copy bounding-box of selected cells as TSV (row sep
// '\n', col sep '\t'). Empty coef becomes ''. Pastes cleanly into Excel.
export function useMatrixCopy({ selected, rows }: Options) {
  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'c') return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      if (selected.size === 0) return
      e.preventDefault()

      const pts = Array.from(selected).map(parseCellKey)
      const rowIndexMap = new Map(rows.map((r, i) => [r.userId, i]))
      const rowIdxs = Array.from(new Set(pts.map((p) => rowIndexMap.get(p.userId) ?? -1)))
        .filter((i) => i >= 0)
        .sort((a, b) => a - b)
      if (rowIdxs.length === 0) return
      const dayMin = Math.min(...pts.map((p) => p.day))
      const dayMax = Math.max(...pts.map((p) => p.day))

      const lines: string[] = []
      for (const ri of rowIdxs) {
        const r = rows[ri]
        const cols: string[] = []
        for (let d = dayMin; d <= dayMax; d++) {
          const c = r.cells?.[d]
          cols.push(c && c.coefficient ? formatCoef(c.coefficient) : '')
        }
        lines.push(cols.join('\t'))
      }
      const tsv = lines.join('\n')

      try {
        await navigator.clipboard.writeText(tsv)
      } catch {
        fallbackCopy(tsv)
      }
      toast.success(`Đã copy ${selected.size} ô`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, rows])
}

function fallbackCopy(s: string) {
  const ta = document.createElement('textarea')
  ta.value = s
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  try { document.execCommand('copy') } finally { document.body.removeChild(ta) }
}
