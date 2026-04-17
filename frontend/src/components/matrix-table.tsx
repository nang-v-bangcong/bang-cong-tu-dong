import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type Worksite, formatWon } from '../lib/utils'
import { type models } from '../../wailsjs/go/models'
import { getWeekdayShort, isSundayOf, cellKey, parseCellKey } from '../lib/matrix-utils'
import { MatrixCell } from './matrix-cell'
import { DayNoteCell } from './day-note-cell'
import { BulkActionBar } from './bulk-action-bar'

interface Props {
  matrix: models.TeamMatrix
  worksites: Worksite[]
  onCellSave: (userId: number, day: number, coef: number, wsId: number | null) => void
  onBulkAssign: (cells: Array<{ userId: number; day: number }>, wsId: number | null) => void
  onDayNoteSave: (day: number, note: string) => void
}

export function MatrixTable({ matrix, worksites, onCellSave, onBulkAssign, onDayNoteSave }: Props) {
  const { yearMonth, daysInMonth, rows, dayNotes, dayTotals } = matrix
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth])

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [focus, setFocus] = useState<{ userId: number; day: number } | null>(null)
  const [editSignal, setEditSignal] = useState(0)
  const [editChar, setEditChar] = useState<string | undefined>(undefined)
  const anchorRef = useRef<{ userId: number; day: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Reset focus if current focused user no longer exists
  useEffect(() => {
    if (!focus) return
    const exists = rows.some((r) => r.userId === focus.userId)
    if (!exists) setFocus(null)
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

  const moveFocus = useCallback((dRow: number, dDay: number) => {
    setFocus((f) => {
      if (!f) {
        if (rows.length === 0) return null
        return { userId: rows[0].userId, day: 1 }
      }
      const i = rowIndex(f.userId)
      const ni = Math.max(0, Math.min(rows.length - 1, i + dRow))
      const nd = Math.max(1, Math.min(daysInMonth, f.day + dDay))
      anchorRef.current = { userId: rows[ni].userId, day: nd }
      return { userId: rows[ni].userId, day: nd }
    })
  }, [rows, rowIndex, daysInMonth])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!focus) return
      const target = e.target as HTMLElement
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      if (e.key === 'ArrowLeft') { e.preventDefault(); moveFocus(0, -1) }
      else if (e.key === 'ArrowRight' || e.key === 'Tab') {
        e.preventDefault()
        if (e.key === 'Tab' && e.shiftKey) moveFocus(0, -1); else moveFocus(0, 1)
      }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveFocus(-1, 0) }
      else if (e.key === 'ArrowDown') { e.preventDefault(); moveFocus(1, 0) }
      else if (e.key === 'Enter') {
        e.preventDefault()
        if (e.shiftKey) moveFocus(-1, 0); else { setEditChar(undefined); setEditSignal((s) => s + 1) }
      }
      else if (e.key === 'Escape') { e.preventDefault(); setFocus(null); setSelected(new Set()) }
      else if (/^[0-9.,]$/.test(e.key)) {
        e.preventDefault()
        setEditChar(e.key)
        setEditSignal((s) => s + 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focus, moveFocus])

  const clearSelection = useCallback(() => setSelected(new Set()), [])

  const onBulkAssignInternal = useCallback((wsId: number | null) => {
    const list = Array.from(selected).map(parseCellKey)
    onBulkAssign(list, wsId)
    setSelected(new Set())
  }, [selected, onBulkAssign])

  const grandTotalCoef = rows.reduce((s, r) => s + r.totalCoef, 0)
  const grandTotalSalary = rows.reduce((s, r) => s + r.salary, 0)

  const stickyLeft: React.CSSProperties = {
    position: 'sticky', left: 0, zIndex: 2,
    background: 'var(--bg-card)', borderRight: '1px solid var(--border)',
  }
  const stickyRight: React.CSSProperties = {
    position: 'sticky', right: 0, zIndex: 2,
    background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
  }

  return (
    <div ref={containerRef} className="h-full flex flex-col">
      <div className="flex-1 overflow-auto relative" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
        <table className="text-xs" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr style={{ position: 'sticky', top: 0, zIndex: 3, background: 'var(--bg-card)' }}>
              <th style={{ ...stickyLeft, minWidth: 140, padding: '6px 8px', textAlign: 'left', top: 0 }}>Tên</th>
              {days.map((d) => (
                <th key={d} style={{ minWidth: 38, width: 38, padding: '4px 2px', borderRight: '1px solid var(--border-light)', color: isSundayOf(yearMonth, d) ? 'var(--danger)' : undefined }}>
                  <div className="text-sm font-semibold">{d}</div>
                  <div className="text-[9px] opacity-70">{getWeekdayShort(yearMonth, d)}</div>
                </th>
              ))}
              <th style={{ ...stickyRight, minWidth: 50, padding: '6px 8px', right: 100 }}>Công</th>
              <th style={{ ...stickyRight, minWidth: 100, padding: '6px 8px', right: 0 }}>Lương</th>
            </tr>
            <tr style={{ position: 'sticky', top: 36, zIndex: 3, background: 'var(--bg-muted)' }}>
              <th style={{ ...stickyLeft, background: 'var(--bg-muted)', padding: '4px 8px', textAlign: 'left', fontSize: 10, top: 36 }}>Ghi chú</th>
              {days.map((d) => (
                <th key={d} style={{ position: 'relative', minWidth: 38, width: 38, height: 26, padding: 0, borderRight: '1px solid var(--border-light)' }}>
                  <DayNoteCell day={d} note={dayNotes[d] ?? ''} onSave={onDayNoteSave} />
                </th>
              ))}
              <th colSpan={2} style={{ ...stickyRight, background: 'var(--bg-muted)', right: 0 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.userId}>
                <td style={{ ...stickyLeft, padding: '4px 8px', fontWeight: 600, borderBottom: '1px solid var(--border-light)' }}>{row.userName}</td>
                {days.map((d) => (
                  <MatrixCell
                    key={cellKey(row.userId, d)}
                    userId={row.userId}
                    day={d}
                    cell={row.cells?.[d]}
                    worksites={worksites}
                    isSelected={selected.has(cellKey(row.userId, d))}
                    isFocused={focus?.userId === row.userId && focus?.day === d}
                    isSunday={isSundayOf(yearMonth, d)}
                    startEditingSignal={focus?.userId === row.userId && focus?.day === d ? editSignal : 0}
                    initialEditChar={focus?.userId === row.userId && focus?.day === d ? editChar : undefined}
                    onSave={onCellSave}
                    onSelect={handleSelect}
                    onFocus={handleFocus}
                  />
                ))}
                <td style={{ ...stickyRight, right: 100, padding: '4px 8px', textAlign: 'center', fontWeight: 600, borderBottom: '1px solid var(--border-light)' }}>{row.totalCoef.toFixed(1)}</td>
                <td style={{ ...stickyRight, right: 0, padding: '4px 8px', textAlign: 'right', fontWeight: 600, borderBottom: '1px solid var(--border-light)' }}>{formatWon(row.salary)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={daysInMonth + 3} className="text-center py-6" style={{ color: 'var(--text-muted)' }}>Chưa có người nào. Thêm ở tab "Nhóm".</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr style={{ position: 'sticky', bottom: 0, zIndex: 3, background: 'var(--bg-muted)' }}>
              <td style={{ ...stickyLeft, background: 'var(--bg-muted)', padding: '4px 8px', fontWeight: 700, bottom: 0 }}>Tổng</td>
              {days.map((d) => (
                <td key={d} style={{ padding: '4px 2px', textAlign: 'center', fontSize: 10, borderRight: '1px solid var(--border-light)' }}>
                  {(dayTotals[d] ?? 0).toFixed(1)}
                </td>
              ))}
              <td style={{ ...stickyRight, background: 'var(--bg-muted)', right: 100, padding: '4px 8px', textAlign: 'center', fontWeight: 700, bottom: 0 }}>{grandTotalCoef.toFixed(1)}</td>
              <td style={{ ...stickyRight, background: 'var(--bg-muted)', right: 0, padding: '4px 8px', textAlign: 'right', fontWeight: 700, bottom: 0 }}>{formatWon(grandTotalSalary)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {selected.size > 0 && (
        <BulkActionBar count={selected.size} worksites={worksites} onAssign={onBulkAssignInternal} onClear={clearSelection} />
      )}
    </div>
  )
}
