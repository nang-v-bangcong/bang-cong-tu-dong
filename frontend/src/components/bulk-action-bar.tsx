import { useState, useRef } from 'react'
import { Building2, X } from 'lucide-react'
import { type Worksite } from '../lib/utils'
import { WorksitePickerPopup } from './worksite-picker-popup'

interface Props {
  count: number
  worksites: Worksite[]
  onAssign: (wsId: number | null) => void
  onClear: () => void
}

export function BulkActionBar({ count, worksites, onAssign, onClear }: Props) {
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
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 shadow-lg"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}
    >
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
