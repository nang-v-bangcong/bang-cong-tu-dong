import { DayNoteCell } from './day-note-cell'
import { getWeekdayShort, isSundayOf } from '../lib/matrix-utils'

interface Props {
  yearMonth: string
  days: number[]
  dayNotes: Record<number, string>
  stickyLeft: React.CSSProperties
  stickyRight: React.CSSProperties
  onDayContextMenu: (day: number, x: number, y: number) => void
  onDayNoteSave: (day: number, note: string) => void
}

export function MatrixHeader({
  yearMonth, days, dayNotes, stickyLeft, stickyRight,
  onDayContextMenu, onDayNoteSave,
}: Props) {
  return (
    <thead>
      <tr style={{ position: 'sticky', top: 0, zIndex: 3, background: 'var(--bg-card)' }}>
        <th style={{ ...stickyLeft, minWidth: 140, padding: '6px 8px', textAlign: 'left', top: 0 }}>Tên</th>
        {days.map((d) => (
          <th
            key={d}
            onContextMenu={(e) => { e.preventDefault(); onDayContextMenu(d, e.clientX, e.clientY) }}
            style={{
              minWidth: 42, width: 42, padding: '4px 2px',
              borderRight: '1px solid var(--border-light)',
              color: isSundayOf(yearMonth, d) ? 'var(--danger)' : undefined,
              cursor: 'context-menu',
            }}
          >
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
          <th key={d} style={{ position: 'relative', minWidth: 42, width: 42, height: 26, padding: 0, borderRight: '1px solid var(--border-light)' }}>
            <DayNoteCell day={d} note={dayNotes[d] ?? ''} onSave={onDayNoteSave} />
          </th>
        ))}
        <th colSpan={2} style={{ ...stickyRight, background: 'var(--bg-muted)', right: 0 }}></th>
      </tr>
    </thead>
  )
}
