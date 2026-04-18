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
}

export function MatrixBodyRow(p: Props) {
  const { row, days, yearMonth, worksites, selected, focus, preview, todayDay, colorOn, paintMode, paintCoef, paintWsId, editSignal, editChar, stickyLeft, stickyRight } = p
  return (
    <tr>
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
