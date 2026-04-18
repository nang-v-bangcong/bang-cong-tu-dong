import { useState, useRef, useCallback, useMemo } from 'react'
import { type Worksite, getDaysInMonth } from '../lib/utils'
import { AttendanceRow } from './attendance-row'

interface AttendanceData {
  id?: number
  date: string
  coefficient: number
  worksiteId: number | null
  note: string
}

interface Props {
  yearMonth: string
  records: AttendanceData[]
  worksites: Worksite[]
  today: string
  onSave: (date: string, coeff: number, worksiteId: number | null, note: string) => void
  onDelete: (id: number) => void
}

const DEFAULT_COLS = { day: 28, dow: 24, coeff: 50, ws: 120, note: 120, action: 24 }

export function AttendanceTable({ yearMonth, records, worksites, today, onSave, onDelete }: Props) {
  const days = useMemo(() => getDaysInMonth(yearMonth), [yearMonth])
  const recordMap = useMemo(() => new Map(records.map((r) => [r.date, r])), [records])
  const [cols, setCols] = useState(DEFAULT_COLS)
  const colsRef = useRef(cols)
  colsRef.current = cols

  const onResizeStart = useCallback((col: keyof typeof DEFAULT_COLS, e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = colsRef.current[col]
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX
      const newW = Math.max(20, startW + delta)
      setCols((prev) => ({ ...prev, [col]: newW }))
    }
    const onUp = () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  const TH = ({ col, children }: { col: keyof typeof DEFAULT_COLS; children: React.ReactNode }) => (
    <th
      style={{ width: cols[col], borderRight: '1px solid var(--border)' }}
      className="relative px-1 py-2 text-center select-none"
    >
      {children}
      <div
        onMouseDown={(e) => onResizeStart(col, e)}
        className="absolute right-0 top-0 bottom-0 w-[3px] cursor-col-resize hover:bg-[var(--primary)] opacity-0 hover:opacity-100 transition-opacity"
      />
    </th>
  )

  return (
    <div
      className="overflow-auto flex-1"
      style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
    >
      <table className="w-full text-left table-fixed">
        <thead className="text-xs font-bold uppercase tracking-wide sticky top-0 z-10"
          style={{ background: 'var(--bg-muted)', color: 'var(--text)' }}>
          <tr>
            <TH col="day">N</TH>
            <TH col="dow">T</TH>
            <TH col="coeff">Công</TH>
            <TH col="ws">Nơi làm việc</TH>
            <TH col="note">Ghi chú</TH>
            <th style={{ width: cols.action }} className="px-0.5 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {days.map((date) => {
            const record = recordMap.get(date) ?? null
            // Include record id in key so row remounts after delete/re-create,
            // clearing stale local state (coeff/wsId/note) from the previous record.
            return (
              <AttendanceRow
                key={`${date}-${record?.id ?? 'empty'}`}
                date={date}
                data={record}
                worksites={worksites}
                isToday={date === today}
                onSave={onSave}
                onDelete={onDelete}
              />
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
