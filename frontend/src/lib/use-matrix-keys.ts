import { useEffect } from 'react'
import type { models } from '../../wailsjs/go/models'

type Focus = { userId: number; day: number } | null

interface Options {
  focus: Focus
  selected: Set<string>
  rows: models.MatrixRow[]
  daysInMonth: number
  onMove: (dRow: number, dDay: number) => void
  onEnter: () => void
  onTypeChar: (ch: string) => void
  onEscape: () => void
  onBulkCoef: (coef: number) => void
  onBulkDelete: () => void
}

// Keyboard hook for the matrix. When >1 cells are selected, digit keys apply a
// bulk coefficient instead of opening the single-cell editor; Delete/Backspace
// clears them. Otherwise falls back to single-cell edit + arrow navigation.
export function useMatrixKeys(opts: Options) {
  const { focus, selected, rows, daysInMonth, onMove, onEnter, onTypeChar, onEscape, onBulkCoef, onBulkDelete } = opts

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!focus) return
      const target = e.target as HTMLElement
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return

      if (e.key === 'ArrowLeft') { e.preventDefault(); onMove(0, -1); return }
      if (e.key === 'ArrowRight' || e.key === 'Tab') {
        e.preventDefault()
        if (e.key === 'Tab' && e.shiftKey) onMove(0, -1); else onMove(0, 1)
        return
      }
      if (e.key === 'ArrowUp') { e.preventDefault(); onMove(-1, 0); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); onMove(1, 0); return }
      if (e.key === 'Escape') { e.preventDefault(); onEscape(); return }

      const multi = selected.size > 1
      if (multi) {
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); onBulkDelete(); return }
        if (/^[0-3]$/.test(e.key)) {
          e.preventDefault()
          const n = parseInt(e.key, 10)
          if (n === 0) onBulkDelete()
          else onBulkCoef(n)
          return
        }
        return
      }

      if (e.key === 'Enter') { e.preventDefault(); if (e.shiftKey) onMove(-1, 0); else onEnter(); return }
      if (/^[0-9.,]$/.test(e.key)) { e.preventDefault(); onTypeChar(e.key) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focus, selected, rows, daysInMonth, onMove, onEnter, onTypeChar, onEscape, onBulkCoef, onBulkDelete])
}
