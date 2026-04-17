import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Building2, Trash2, Copy, Rewind } from 'lucide-react'
import { type Worksite } from '../lib/utils'
import { WorksitePickerPopup } from './worksite-picker-popup'

interface Props {
  day: number
  x: number
  y: number
  worksites: Worksite[]
  onFillAll: (coef: number, wsId: number | null) => void
  onClearDay: () => void
  onCopyDay: () => void
  onCopyPrev: () => void
  onClose: () => void
}

export function DayHeaderMenu({ day, x, y, worksites, onFillAll, onClearDay, onCopyDay, onCopyPrev, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const wsBtnRef = useRef<HTMLButtonElement>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [pickerAnchor, setPickerAnchor] = useState<{ top: number; left: number } | undefined>()

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) return
      onClose()
    }
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', h)
    document.addEventListener('keydown', k)
    return () => {
      document.removeEventListener('mousedown', h)
      document.removeEventListener('keydown', k)
    }
  }, [onClose])

  const openPicker = () => {
    const r = wsBtnRef.current?.getBoundingClientRect()
    if (r) setPickerAnchor({ top: r.top, left: r.right + 4 })
    setShowPicker(true)
  }

  const baseItem = 'w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-[var(--bg-hover)] transition-colors'

  return (
    <>
      <div
        ref={ref}
        className="fixed z-50 shadow-lg"
        style={{
          top: y,
          left: x,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          minWidth: 220,
        }}
      >
        <div className="px-3 py-1.5 text-[10px] font-semibold border-b" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          Ngày {day}
        </div>
        <button className={baseItem} onClick={() => { onFillAll(1.0, null); onClose() }}>
          <CheckCircle2 size={13} /> Chấm công cả đội (hệ số 1.0)
        </button>
        <button ref={wsBtnRef} className={baseItem} onClick={openPicker}>
          <Building2 size={13} /> Chấm với công trường...
        </button>
        <button className={baseItem} onClick={() => { onCopyDay(); onClose() }}>
          <Copy size={13} /> Sao chép ngày này...
        </button>
        <button
          className={baseItem}
          disabled={day <= 1}
          style={day <= 1 ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
          onClick={() => { if (day > 1) { onCopyPrev(); onClose() } }}
        >
          <Rewind size={13} /> Lặp ngày liền trước (từ ngày {day - 1})
        </button>
        <div className="h-px my-0.5" style={{ background: 'var(--border)' }} />
        <button
          className={baseItem}
          style={{ color: 'var(--danger)' }}
          onClick={() => { onClearDay(); onClose() }}
        >
          <Trash2 size={13} /> Xóa ngày này
        </button>
      </div>
      {showPicker && (
        <WorksitePickerPopup
          worksites={worksites}
          current={null}
          anchor={pickerAnchor}
          onPick={(id) => { onFillAll(1.0, id); setShowPicker(false); onClose() }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  )
}
