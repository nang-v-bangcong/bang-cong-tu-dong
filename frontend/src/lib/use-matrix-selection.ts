import { useCallback, useEffect, useRef, useState } from 'react'
import type { models } from '../../wailsjs/go/models'
import { cellKey, parseCellKey } from './matrix-utils'

type BulkCells = Array<{ userId: number; day: number }>
type Focus = { userId: number; day: number } | null

interface Options {
  rows: models.MatrixRow[]
  daysInMonth: number
  onBulkAssign: (cells: BulkCells, wsId: number | null) => void
  onBulkCoef: (cells: BulkCells, coef: number) => void
  onBulkDelete: (cells: BulkCells) => void
}

export function useMatrixSelection({ rows, daysInMonth, onBulkAssign, onBulkCoef, onBulkDelete }: Options) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [focus, setFocus] = useState<Focus>(null)
  const [editSignal, setEditSignal] = useState(0)
  const [editChar, setEditChar] = useState<string | undefined>(undefined)
  const anchorRef = useRef<{ userId: number; day: number } | null>(null)

  useEffect(() => {
    if (!focus) return
    if (!rows.some((r) => r.userId === focus.userId)) setFocus(null)
  }, [rows, focus])

  const rowIndex = useCallback((uid: number) => rows.findIndex((r) => r.userId === uid), [rows])

  const handleFocus = useCallback((userId: number, day: number) => {
    setFocus({ userId, day })
    anchorRef.current = { userId, day }
  }, [])

  const handleSelect = useCallback((userId: number, day: number, mode: 'single' | 'toggle' | 'range') => {
    setSelected((prev) => {
      const next = new Set(prev)
      const k = cellKey(userId, day)
      if (mode === 'toggle') {
        if (next.has(k)) next.delete(k); else next.add(k)
      } else if (mode === 'range' && anchorRef.current) {
        const a = anchorRef.current
        const r1 = Math.min(rowIndex(a.userId), rowIndex(userId))
        const r2 = Math.max(rowIndex(a.userId), rowIndex(userId))
        const d1 = Math.min(a.day, day)
        const d2 = Math.max(a.day, day)
        if (r1 < 0 || r2 < 0) return next
        for (let r = r1; r <= r2; r++) for (let d = d1; d <= d2; d++) next.add(cellKey(rows[r].userId, d))
      } else {
        next.clear(); next.add(k)
      }
      return next
    })
    setFocus({ userId, day })
    anchorRef.current = { userId, day }
  }, [rowIndex, rows])

  const clearSelection = useCallback(() => setSelected(new Set()), [])

  const onMove = useCallback((dRow: number, dDay: number) => {
    setFocus((f) => {
      if (!f) return rows.length ? { userId: rows[0].userId, day: 1 } : null
      const i = rowIndex(f.userId)
      const ni = Math.max(0, Math.min(rows.length - 1, i + dRow))
      const nd = Math.max(1, Math.min(daysInMonth, f.day + dDay))
      anchorRef.current = { userId: rows[ni].userId, day: nd }
      return { userId: rows[ni].userId, day: nd }
    })
  }, [rows, daysInMonth, rowIndex])

  const onBulkAssignInternal = useCallback((wsId: number | null) => {
    onBulkAssign(Array.from(selected).map(parseCellKey), wsId)
    setSelected(new Set())
  }, [selected, onBulkAssign])

  const onBulkCoefInternal = useCallback((coef: number) => {
    onBulkCoef(Array.from(selected).map(parseCellKey), coef)
    setSelected(new Set())
  }, [selected, onBulkCoef])

  const onBulkDeleteInternal = useCallback(() => {
    const list = Array.from(selected).map(parseCellKey)
    if (list.length === 0) return
    onBulkDelete(list)
    setSelected(new Set())
  }, [selected, onBulkDelete])

  const onEnter = useCallback(() => { setEditChar(undefined); setEditSignal((s) => s + 1) }, [])
  const onTypeChar = useCallback((ch: string) => { setEditChar(ch); setEditSignal((s) => s + 1) }, [])
  const onEscape = useCallback(() => { setFocus(null); setSelected(new Set()) }, [])

  return {
    selected, focus, editSignal, editChar,
    handleSelect, handleFocus, clearSelection,
    onMove, onEnter, onTypeChar, onEscape,
    onBulkAssignInternal, onBulkCoefInternal, onBulkDeleteInternal,
  }
}
