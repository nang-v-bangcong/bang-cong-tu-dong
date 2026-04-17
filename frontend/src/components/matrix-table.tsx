import { useMemo, useState } from 'react'
import { type Worksite } from '../lib/utils'
import { type models } from '../../wailsjs/go/models'
import { MatrixHeader } from './matrix-header'
import { MatrixFooter } from './matrix-footer'
import { MatrixBodyRow } from './matrix-row'
import { BulkActionBar } from './bulk-action-bar'
import { DayHeaderMenu } from './day-header-menu'
import { useMatrixKeys } from '../lib/use-matrix-keys'
import { useMatrixPaste } from '../lib/use-matrix-paste'
import { useMatrixSelection } from '../lib/use-matrix-selection'
import { filterSortRows } from '../lib/matrix-filter'
import { useDragFill } from '../lib/use-drag-fill'

type BulkCells = Array<{ userId: number; day: number }>

interface Props {
  matrix: models.TeamMatrix
  worksites: Worksite[]
  search: string
  sortBy: 'name' | 'days' | 'salary'
  sortDir: 'asc' | 'desc'
  cellColorOn: boolean
  today: string // YYYY-MM-DD
  onCellSave: (userId: number, day: number, coef: number, wsId: number | null) => void
  onBulkAssign: (cells: BulkCells, wsId: number | null) => void
  onBulkCoef: (cells: BulkCells, coef: number) => void
  onBulkDelete: (cells: BulkCells) => void
  onFillDay: (day: number, coef: number, wsId: number | null) => void
  onClearDay: (day: number) => void
  onCopyDay: (day: number) => void
  onCopyPrev: (day: number) => void
  onPasteGrid: (items: Array<{ userId: number; day: number; coef: number }>) => void
  onFillRange: (cells: BulkCells, coef: number, wsId: number | null) => void
  onDayNoteSave: (day: number, note: string) => void
}

export function MatrixTable({
  matrix, worksites, search, sortBy, sortDir, cellColorOn, today,
  onCellSave, onBulkAssign, onBulkCoef, onBulkDelete,
  onFillDay, onClearDay, onCopyDay, onCopyPrev, onPasteGrid, onFillRange, onDayNoteSave,
}: Props) {
  const { yearMonth, daysInMonth, dayNotes, dayTotals } = matrix
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth])

  const todayDay = useMemo(() => {
    if (!today.startsWith(yearMonth + '-')) return null
    return parseInt(today.slice(8, 10), 10)
  }, [today, yearMonth])

  const rows = useMemo(
    () => filterSortRows(matrix.rows, search, sortBy, sortDir),
    [matrix.rows, search, sortBy, sortDir],
  )

  const [dayMenu, setDayMenu] = useState<{ day: number; x: number; y: number } | null>(null)

  const sel = useMatrixSelection({ rows, daysInMonth, onBulkAssign, onBulkCoef, onBulkDelete })
  const { selected, focus, editSignal, editChar } = sel

  useMatrixKeys({
    focus, selected, rows, daysInMonth,
    onMove: sel.onMove,
    onEnter: sel.onEnter,
    onTypeChar: sel.onTypeChar,
    onEscape: sel.onEscape,
    onBulkCoef: sel.onBulkCoefInternal,
    onBulkDelete: sel.onBulkDeleteInternal,
  })

  useMatrixPaste({ focus, rows, daysInMonth, onPasteGrid })

  const dragFill = useDragFill({
    rows, daysInMonth,
    onCommit: (src, cells) => onFillRange(cells, src.coef, src.wsID),
  })

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
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto relative" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
        <table className="text-xs" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <MatrixHeader
            yearMonth={yearMonth}
            days={days}
            dayNotes={dayNotes}
            stickyLeft={stickyLeft}
            stickyRight={stickyRight}
            onDayContextMenu={(day, x, y) => setDayMenu({ day, x, y })}
            onDayNoteSave={onDayNoteSave}
          />
          <tbody>
            {rows.map((row) => (
              <MatrixBodyRow
                key={row.userId}
                row={row}
                days={days}
                yearMonth={yearMonth}
                worksites={worksites}
                selected={selected}
                focus={focus}
                preview={dragFill.preview}
                todayDay={todayDay}
                colorOn={cellColorOn}
                editSignal={editSignal}
                editChar={editChar}
                stickyLeft={stickyLeft}
                stickyRight={stickyRight}
                onCellSave={onCellSave}
                onSelect={sel.handleSelect}
                onFocus={sel.handleFocus}
                onFillStart={(u, dd, coef, wsId) => dragFill.start({ userId: u, day: dd, coef, wsID: wsId })}
              />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={daysInMonth + 3} className="text-center py-6" style={{ color: 'var(--text-muted)' }}>
                  {search ? `Không tìm thấy người nào khớp "${search}"` : 'Chưa có người nào. Nhấn "Thêm người".'}
                </td>
              </tr>
            )}
          </tbody>
          <MatrixFooter
            days={days}
            dayTotals={dayTotals}
            grandTotalCoef={grandTotalCoef}
            grandTotalSalary={grandTotalSalary}
            stickyLeft={stickyLeft}
            stickyRight={stickyRight}
          />
        </table>
      </div>
      {selected.size > 0 && (
        <BulkActionBar
          count={selected.size}
          worksites={worksites}
          onAssign={sel.onBulkAssignInternal}
          onApplyCoef={sel.onBulkCoefInternal}
          onDelete={sel.onBulkDeleteInternal}
          onClear={sel.clearSelection}
        />
      )}
      {dayMenu && (
        <DayHeaderMenu
          day={dayMenu.day}
          x={dayMenu.x}
          y={dayMenu.y}
          worksites={worksites}
          onFillAll={(coef, wsId) => onFillDay(dayMenu.day, coef, wsId)}
          onClearDay={() => onClearDay(dayMenu.day)}
          onCopyDay={() => onCopyDay(dayMenu.day)}
          onCopyPrev={() => onCopyPrev(dayMenu.day)}
          onClose={() => setDayMenu(null)}
        />
      )}
    </div>
  )
}
