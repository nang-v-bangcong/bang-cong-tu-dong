import { useEffect, useRef, useState } from 'react'
import { Building2, X } from 'lucide-react'
import { type Worksite } from '../lib/utils'
import { formatCoef } from '../lib/matrix-utils'
import { WorksitePickerPopup } from './worksite-picker-popup'

interface Props {
  worksites: Worksite[]
  paintCoef: number
  paintWsId: number | null
  anchorRef: React.RefObject<HTMLButtonElement>
  onSetPaintPreset: (coef: number, wsId: number | null) => void
  onConfirm: () => void
  onClose: () => void
}

const COEF_PRESETS = [0.5, 1, 1.5, 2]

export function PaintPopover({
  worksites, paintCoef, paintWsId, anchorRef, onSetPaintPreset, onConfirm, onClose,
}: Props) {
  const popRef = useRef<HTMLDivElement>(null)
  const wsBtnRef = useRef<HTMLButtonElement>(null)
  const [showWsPicker, setShowWsPicker] = useState(false)
  const [wsAnchor, setWsAnchor] = useState<{ top: number; left: number }>()

  useEffect(() => {
    if (showWsPicker) return // picker owns outside-click while open
    const h = (e: MouseEvent) => {
      const t = e.target as Node
      if (popRef.current?.contains(t)) return
      if (anchorRef.current?.contains(t)) return
      onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose, anchorRef, showWsPicker])

  const wsName = paintWsId ? worksites.find((w) => w.id === paintWsId)?.name ?? '' : ''

  const openWsPicker = () => {
    const r = wsBtnRef.current?.getBoundingClientRect()
    if (r) setWsAnchor({ top: r.bottom + 2, left: r.left })
    setShowWsPicker(true)
  }

  return (
    <>
      <div
        ref={popRef}
        className="absolute z-50 shadow-lg"
        style={{
          top: 'calc(100% + 4px)', left: 0,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: 8, minWidth: 220,
        }}
      >
        <div className="text-[10px] font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Hệ số</div>
        <div className="flex items-center gap-1 mb-2">
          {COEF_PRESETS.map((c) => (
            <button
              key={c}
              onClick={() => onSetPaintPreset(c, paintWsId)}
              className="flex-1 px-2 py-1 text-xs"
              style={{
                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                background: paintCoef === c ? 'var(--primary)' : 'transparent',
                color: paintCoef === c ? '#fff' : undefined,
                fontWeight: paintCoef === c ? 600 : 400,
              }}
            >
              {formatCoef(c)}
            </button>
          ))}
        </div>
        <button
          ref={wsBtnRef}
          onClick={openWsPicker}
          className="w-full flex items-center gap-1.5 px-2 py-1 text-xs mb-2"
          style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
        >
          <Building2 size={12} /> {wsName ? wsName : 'Công trường (tùy chọn)...'}
          {paintWsId && (
            <X
              size={11}
              className="ml-auto"
              onClick={(e) => { e.stopPropagation(); onSetPaintPreset(paintCoef, null) }}
            />
          )}
        </button>
        <button
          onClick={onConfirm}
          className="w-full px-2 py-1 text-xs font-semibold text-white"
          style={{ background: 'var(--primary)', borderRadius: 'var(--radius-sm)' }}
        >
          Xác nhận
        </button>
      </div>
      {showWsPicker && (
        <WorksitePickerPopup
          worksites={worksites}
          current={paintWsId}
          anchor={wsAnchor}
          onPick={(id) => { onSetPaintPreset(paintCoef, id); setShowWsPicker(false) }}
          onClose={() => setShowWsPicker(false)}
        />
      )}
    </>
  )
}
