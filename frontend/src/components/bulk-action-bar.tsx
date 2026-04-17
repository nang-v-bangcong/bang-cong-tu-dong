import { useState, useRef } from 'react'
import { Building2, Trash2, X } from 'lucide-react'
import { type Worksite } from '../lib/utils'
import { WorksitePickerPopup } from './worksite-picker-popup'

interface Props {
  count: number
  worksites: Worksite[]
  onAssign: (wsId: number | null) => void
  onApplyCoef: (coef: number) => void
  onDelete: () => void
  onClear: () => void
}

const COEF_PRESETS: Array<{ label: string; value: number }> = [
  { label: '0.5x', value: 0.5 },
  { label: '1x', value: 1.0 },
  { label: '1.5x', value: 1.5 },
  { label: '2x', value: 2.0 },
]

export function BulkActionBar({ count, worksites, onAssign, onApplyCoef, onDelete, onClear }: Props) {
  const [showPicker, setShowPicker] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [anchor, setAnchor] = useState<{ top: number; left: number } | undefined>()

  const openPicker = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (r) setAnchor({ top: r.top - 250, left: r.left })
    setShowPicker(true)
  }

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex flex-col gap-1.5 px-4 py-2 shadow-lg"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold">Đã chọn {count} ô</span>
        <button
          ref={btnRef}
          onClick={openPicker}
          className="flex items-center gap-1 px-2.5 py-1 text-xs text-white"
          style={{ background: 'var(--primary)', borderRadius: 'var(--radius-sm)' }}
        >
          <Building2 size={12} /> Gán công trường
        </button>
        <button
          onClick={onClear}
          className="flex items-center gap-1 px-2.5 py-1 text-xs"
          style={{ background: 'var(--bg-muted)', borderRadius: 'var(--radius-sm)' }}
        >
          <X size={12} /> Bỏ chọn
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] opacity-70">Hệ số:</span>
        {COEF_PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => onApplyCoef(p.value)}
            className="px-2 py-0.5 text-xs font-semibold"
            style={{ background: 'var(--bg-muted)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
          >
            {p.label}
          </button>
        ))}
        <div className="w-px h-4 mx-1" style={{ background: 'var(--border)' }} />
        <button
          onClick={onDelete}
          className="flex items-center gap-1 px-2 py-0.5 text-xs text-white font-semibold"
          style={{ background: 'var(--danger)', borderRadius: 'var(--radius-sm)' }}
        >
          <Trash2 size={11} /> Xóa
        </button>
      </div>
      {showPicker && (
        <WorksitePickerPopup
          worksites={worksites}
          current={null}
          anchor={anchor}
          onPick={(id) => { onAssign(id); setShowPicker(false) }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
