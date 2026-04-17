import { useCallback, useEffect, useRef, useState } from 'react'
import type { models } from '../../wailsjs/go/models'

type Source = { userId: number; day: number; coef: number; wsID: number | null }
type Cell = { userId: number; day: number }

interface Options {
  rows: models.MatrixRow[]
  daysInMonth: number
  onCommit: (source: Source, cells: Cell[]) => void
}

// Custom drag-fill hook using elementFromPoint so CSS zoom doesn't break
// coordinates. Consumers tag each <td> with data-user-id + data-day.
export function useDragFill({ rows, daysInMonth, onCommit }: Options) {
  const [preview, setPreview] = useState<Set<string>>(new Set())
  const [active, setActive] = useState(false)
  const sourceRef = useRef<Source | null>(null)
  const previewRef = useRef<Set<string>>(new Set())

  const compute = useCallback((src: Source, target: Cell): Set<string> => {
    const srcRow = rows.findIndex((r) => r.userId === src.userId)
    const tgtRow = rows.findIndex((r) => r.userId === target.userId)
    if (srcRow < 0 || tgtRow < 0) return new Set()
    const r1 = Math.min(srcRow, tgtRow), r2 = Math.max(srcRow, tgtRow)
    const d1 = Math.max(1, Math.min(src.day, target.day))
    const d2 = Math.min(daysInMonth, Math.max(src.day, target.day))
    const out = new Set<string>()
    for (let r = r1; r <= r2; r++) for (let d = d1; d <= d2; d++) out.add(`${rows[r].userId}:${d}`)
    return out
  }, [rows, daysInMonth])

  const start = useCallback((src: Source) => {
    sourceRef.current = src
    const initial = new Set([`${src.userId}:${src.day}`])
    previewRef.current = initial
    setPreview(initial)
    setActive(true)
  }, [])

  const cleanup = useCallback(() => {
    sourceRef.current = null
    previewRef.current = new Set()
    setPreview(new Set())
    setActive(false)
  }, [])

  useEffect(() => {
    if (!active) return
    const move = (e: MouseEvent) => {
      if (!sourceRef.current) return
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
      const td = el?.closest('[data-user-id][data-day]') as HTMLElement | null
      if (!td) return
      const uid = parseInt(td.dataset.userId ?? '', 10)
      const day = parseInt(td.dataset.day ?? '', 10)
      if (!uid || !day) return
      const next = compute(sourceRef.current, { userId: uid, day })
      previewRef.current = next
      setPreview(next)
    }
    const up = () => {
      const src = sourceRef.current
      const cells = Array.from(previewRef.current).map((k) => {
        const [u, d] = k.split(':')
        return { userId: parseInt(u, 10), day: parseInt(d, 10) }
      })
      cleanup()
      if (src && cells.length > 1) onCommit(src, cells)
    }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') cleanup() }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      window.removeEventListener('keydown', esc)
    }
  }, [active, compute, cleanup, onCommit])

  return { preview, start, compute }
}
