import { memo, useEffect, useRef, useState } from 'react'
import { type Worksite } from '../lib/utils'
import { type models } from '../../wailsjs/go/models'
import { hashColor, formatCoef } from '../lib/matrix-utils'
import { WorksitePickerPopup } from './worksite-picker-popup'

type MatrixCellData = models.MatrixCell | undefined

interface Props {
  userId: number
  day: number
  cell: MatrixCellData
  worksites: Worksite[]
  isSelected: boolean
  isFocused: boolean
  isPreview: boolean
  isSunday: boolean
  isToday: boolean
  colorOn: boolean
  paintMode: boolean
  paintCoef: number
  paintWsId: number | null
  startEditingSignal: number // increment to force open editor (for auto-enter on typing)
  initialEditChar?: string
  onSave: (userId: number, day: number, coef: number, wsId: number | null) => void
  onSelect: (userId: number, day: number, mode: 'single' | 'toggle' | 'range') => void
  onFocus: (userId: number, day: number) => void
  onFillStart: (userId: number, day: number, coef: number, wsId: number | null) => void
}

function MatrixCellInner(props: Props) {
  const {
    userId, day, cell, worksites,
    isSelected, isFocused, isPreview, isSunday, isToday, colorOn,
    paintMode, paintCoef, paintWsId,
    startEditingSignal, initialEditChar,
    onSave, onSelect, onFocus, onFillStart,
  } = props

  const [editing, setEditing] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [pickerAnchor, setPickerAnchor] = useState<{ top: number; left: number }>()
  const inputRef = useRef<HTMLInputElement>(null)
  const tdRef = useRef<HTMLTableCellElement>(null)
  const signalRef = useRef(startEditingSignal)

  const coef = cell?.coefficient ?? 0
  const wsId = cell?.worksiteId ?? null
  const wsName = cell?.worksiteName ?? ''

  // Auto-open editor when focused and parent dispatches a signal (e.g., user typed a number)
  useEffect(() => {
    const changed = startEditingSignal !== signalRef.current
    signalRef.current = startEditingSignal
    if (changed && isFocused) setEditing(true)
  }, [startEditingSignal, isFocused])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      if (initialEditChar) {
        inputRef.current.value = initialEditChar
        inputRef.current.setSelectionRange(1, 1)
      } else {
        inputRef.current.select()
      }
    }
  }, [editing, initialEditChar])

  useEffect(() => {
    if (isFocused) tdRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [isFocused])

  const commit = (raw: string) => {
    const n = parseFloat(raw.replace(',', '.'))
    const next = isNaN(n) ? 0 : Math.max(0, Math.min(3, n))
    setEditing(false)
    if (next !== coef) onSave(userId, day, next, wsId)
  }

  const openPicker = (e: React.MouseEvent) => {
    e.preventDefault()
    const r = tdRef.current?.getBoundingClientRect()
    if (r) setPickerAnchor({ top: r.bottom, left: r.left })
    setShowPicker(true)
  }

  const handleClick = (e: React.MouseEvent) => {
    if (e.shiftKey) { onSelect(userId, day, 'range'); return }
    if (e.ctrlKey || e.metaKey) { onSelect(userId, day, 'toggle'); return }
    if (paintMode && !cell?.attendanceId) { onSave(userId, day, paintCoef, paintWsId); return }
    onFocus(userId, day)
  }

  const wsTint = colorOn && wsId && wsName ? hashColor(wsName) + '1a' : undefined // 1a = ~10% alpha

  const bg = isSelected
    ? 'var(--primary-soft)'
    : isFocused
      ? 'var(--primary-soft)'
      : isToday
        ? 'var(--warning-soft, #fef3c7)'
        : isSunday
          ? 'var(--danger-soft)'
          : wsTint

  const border = isPreview
    ? '2px dashed var(--primary)'
    : isFocused
      ? '2px solid var(--primary)'
      : isToday
        ? '2px solid var(--warning, #f59e0b)'
        : '1px solid var(--border-light)'

  return (
    <td
      ref={tdRef}
      data-user-id={userId}
      data-day={day}
      onClick={handleClick}
      onDoubleClick={openPicker}
      className="relative text-center text-xs select-none"
      style={{
        minWidth: 42,
        width: 42,
        height: 32,
        padding: 0,
        background: bg,
        border,
        boxSizing: 'border-box',
        cursor: paintMode && !cell?.attendanceId ? 'crosshair' : 'cell',
      }}
    >
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          defaultValue={initialEditChar !== undefined ? '' : (coef || '')}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit(e.currentTarget.value) }
            else if (e.key === 'Escape') { e.preventDefault(); setEditing(false) }
          }}
          className="w-full h-full text-center text-xs outline-none"
          style={{ background: 'transparent', border: 'none', padding: 0 }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full w-full px-0.5">
          <span className="leading-none font-bold" style={{ fontSize: 11 }}>{formatCoef(coef)}</span>
          {wsId && (
            <span
              title={wsName}
              className="leading-none truncate"
              style={{ fontSize: 8, maxWidth: '100%', color: 'var(--text-muted)' }}
            >
              {wsName}
            </span>
          )}
        </div>
      )}
      {isFocused && !editing && (
        <span
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onFillStart(userId, day, coef, wsId)
          }}
          title="Kéo để điền dải"
          style={{
            position: 'absolute', right: -3, bottom: -3, width: 7, height: 7,
            background: 'var(--primary)', border: '1px solid var(--bg-card)',
            cursor: 'crosshair', zIndex: 2,
          }}
        />
      )}
      {showPicker && (
        <WorksitePickerPopup
          worksites={worksites}
          current={wsId}
          anchor={pickerAnchor}
          onPick={(id) => {
            setShowPicker(false)
            onSave(userId, day, coef || 1, id)
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </td>
  )
}

export const MatrixCell = memo(MatrixCellInner, (a, b) => (
  a.cell === b.cell && a.isSelected === b.isSelected && a.isFocused === b.isFocused &&
  a.isPreview === b.isPreview && a.isToday === b.isToday && a.colorOn === b.colorOn &&
  a.paintMode === b.paintMode && a.paintCoef === b.paintCoef && a.paintWsId === b.paintWsId &&
  a.startEditingSignal === b.startEditingSignal && a.initialEditChar === b.initialEditChar &&
  a.worksites === b.worksites && a.isSunday === b.isSunday
))
