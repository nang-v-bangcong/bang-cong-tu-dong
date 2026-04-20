import { memo } from 'react'
import { MoreVertical } from 'lucide-react'
import { formatWon, type Worksite } from '../lib/utils'
import { type models } from '../../wailsjs/go/models'
import { cellKey, isSundayOf } from '../lib/matrix-utils'
import { MatrixCell } from './matrix-cell'

interface Props {
  row: models.MatrixRow
  days: number[]
  yearMonth: string
  worksites: Worksite[]
  selected: Set<string>
  focus: { userId: number; day: number } | null
  preview: Set<string>
  todayDay: number | null
  colorOn: boolean
  paintMode: boolean
  paintCoef: number
  paintWsId: number | null
  editSignal: number
  editChar: string | undefined
  stickyLeft: React.CSSProperties
  stickyRight: React.CSSProperties
  onCellSave: (userId: number, day: number, coef: number, wsId: number | null) => void
  onSelect: (userId: number, day: number, mode: 'single' | 'toggle' | 'range') => void
  onFocus: (userId: number, day: number) => void
  onFillStart: (userId: number, day: number, coef: number, wsId: number | null) => void
  onRowMenu?: (userId: number, userName: string, x: number, y: number) => void
}

function MatrixBodyRowInner(p: Props) {
  const { row, days, yearMonth, worksites, selected, focus, preview, todayDay, colorOn, paintMode, paintCoef, paintWsId, editSignal, editChar, stickyLeft, stickyRight, onRowMenu } = p
  const openMenu = (e: React.MouseEvent) => {
    if (!onRowMenu) return
    e.preventDefault()
    onRowMenu(row.userId, row.userName, e.clientX, e.clientY)
  }
  return (
    <tr>
      <td
        className="group"
        style={{ ...stickyLeft, padding: '4px 8px', fontWeight: 600, borderBottom: '1px solid var(--border-light)' }}
        onContextMenu={openMenu}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="truncate">{row.userName}</span>
          {onRowMenu && (
            <button
              onClick={openMenu}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-[var(--bg-hover)]"
              style={{ color: 'var(--text-muted)' }}
              title="Thao tác"
            >
              <MoreVertical size={14} />
            </button>
          )}
        </div>
      </td>
      {days.map((d) => (
        <MatrixCell
          key={cellKey(row.userId, d)}
          userId={row.userId}
          day={d}
          cell={row.cells?.[d]}
          worksites={worksites}
          isSelected={selected.has(cellKey(row.userId, d))}
          isFocused={focus?.userId === row.userId && focus?.day === d}
          isPreview={preview.has(`${row.userId}:${d}`)}
          isSunday={isSundayOf(yearMonth, d)}
          isToday={todayDay === d}
          colorOn={colorOn}
          paintMode={paintMode}
          paintCoef={paintCoef}
          paintWsId={paintWsId}
          startEditingSignal={editSignal}
          initialEditChar={focus?.userId === row.userId && focus?.day === d ? editChar : undefined}
          onSave={p.onCellSave}
          onSelect={p.onSelect}
          onFocus={p.onFocus}
          onFillStart={p.onFillStart}
        />
      ))}
      <td style={{ ...stickyRight, right: 100, padding: '4px 8px', textAlign: 'center', fontWeight: 600, borderBottom: '1px solid var(--border-light)' }}>{row.totalCoef.toFixed(1)}</td>
      <td style={{ ...stickyRight, right: 0, padding: '4px 8px', textAlign: 'right', fontWeight: 600, borderBottom: '1px solid var(--border-light)' }}>{formatWon(row.salary)}</td>
    </tr>
  )
}

// Bail on renders that don't affect THIS row. Parent re-renders on every cell
// click (selection/focus state), so without this each click reconciles N rows ×
// ~31 cells. `selected` uses cellKey "userId-day" (dash); `preview` uses
// "userId:day" (colon) — so the prefix must match the caller.
function rowKeysEqual(a: Set<string>, b: Set<string>, prefix: string): boolean {
  let aCount = 0
  for (const k of a) {
    if (k.startsWith(prefix)) {
      if (!b.has(k)) return false
      aCount++
    }
  }
  let bCount = 0
  for (const k of b) if (k.startsWith(prefix)) bCount++
  return aCount === bCount
}

export const MatrixBodyRow = memo(MatrixBodyRowInner, (a, b) => {
  if (a.row !== b.row) return false
  if (a.days !== b.days) return false
  if (a.yearMonth !== b.yearMonth) return false
  if (a.worksites !== b.worksites) return false
  if (a.todayDay !== b.todayDay) return false
  if (a.colorOn !== b.colorOn) return false
  if (a.paintMode !== b.paintMode) return false
  if (a.paintCoef !== b.paintCoef) return false
  if (a.paintWsId !== b.paintWsId) return false
  if (a.editSignal !== b.editSignal) return false
  if (a.editChar !== b.editChar) return false

  const uid = a.row.userId
  const aFocused = a.focus?.userId === uid
  const bFocused = b.focus?.userId === uid
  if (aFocused !== bFocused) return false
  if (aFocused && a.focus?.day !== b.focus?.day) return false

  if (!rowKeysEqual(a.selected, b.selected, uid + '-')) return false
  if (!rowKeysEqual(a.preview, b.preview, uid + ':')) return false

  return true
})
