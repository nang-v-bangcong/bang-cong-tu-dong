import { useEffect } from 'react'
import { toast } from 'sonner'
import type { models } from '../../wailsjs/go/models'
import { parseClipboard, coerceCoef } from './clipboard-paste'

type Focus = { userId: number; day: number } | null

interface Options {
  focus: Focus
  rows: models.MatrixRow[]
  daysInMonth: number
  onPasteGrid: (items: Array<{ userId: number; day: number; coef: number }>) => void
}

// Attach a global paste listener that, when a cell is focused, converts
// clipboard TSV/HTML into coef updates clamped to the matrix bounds.
export function useMatrixPaste({ focus, rows, daysInMonth, onPasteGrid }: Options) {
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!focus) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      const grid = parseClipboard(e.clipboardData)
      if (grid.length === 0) return
      e.preventDefault()
      const startRow = rows.findIndex((r) => r.userId === focus.userId)
      if (startRow < 0) return
      const items: Array<{ userId: number; day: number; coef: number }> = []
      let oob = 0, invalid = 0
      for (let i = 0; i < grid.length; i++) {
        for (let j = 0; j < grid[i].length; j++) {
          const r = startRow + i
          const d = focus.day + j
          if (r >= rows.length || d > daysInMonth) { oob++; continue }
          const n = coerceCoef(grid[i][j])
          if (n == null) { invalid++; continue }
          items.push({ userId: rows[r].userId, day: d, coef: n })
        }
      }
      if (items.length === 0 && (oob || invalid)) {
        toast.warning(`Không dán được ô nào (${oob} ngoài bảng, ${invalid} không hợp lệ)`)
        return
      }
      if (items.length > 0) {
        onPasteGrid(items)
        const notes: string[] = [`Đã dán ${items.length} ô`]
        if (oob) notes.push(`bỏ qua ${oob} ngoài bảng`)
        if (invalid) notes.push(`${invalid} không hợp lệ`)
        toast.success(notes.join(' · '))
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [focus, rows, daysInMonth, onPasteGrid])
}
