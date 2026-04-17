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
  const wsDotColor = wsId ? hashColor(wsName) : null

  // Auto-open editor when focused and parent dispatches a signal (e.g., user typed a number)
  useEffect(() => {
    if (startEditingSignal !== signalRef.current && isFocused) {
      signalRef.current = startEditingSignal
      setEditing(true)
    } else {
      signalRef.current = startEditingSignal
    }
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
    if (e.shiftKey) onSelect(userId, day, 'range')
    else if (e.ctrlKey || e.metaKey) onSelect(userId, day, 'toggle')
    else { onFocus(userId, day) }
  }

  const wsTint = colorOn && wsId && wsName ? hashColor(wsName) + '22' : undefined // 22 = ~13% alpha

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
      className="relative text-center text-xs select-none cursor-cell"
      style={{
        minWidth: 38,
        width: 38,
        height: 28,
        padding: 0,
        background: bg,
        border,
        boxSizing: 'border-box',
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
        <>
          <span className="font-medium">{formatCoef(coef)}</span>
          {wsDotColor && (
            <span
              title={wsName}
              className="absolute bottom-0.5 right-0.5"
              style={{ width: 6, height: 6, borderRadius: '50%', background: wsDotColor }}
            />
          )}
        </>
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
  a.cell === b.cell &&
  a.isSelected === b.isSelected &&
  a.isFocused === b.isFocused &&
  a.isPreview === b.isPreview &&
  a.isToday === b.isToday &&
  a.colorOn === b.colorOn &&
  a.startEditingSignal === b.startEditingSignal &&
  a.initialEditChar === b.initialEditChar &&
  a.worksites === b.worksites &&
  a.isSunday === b.isSunday
))
