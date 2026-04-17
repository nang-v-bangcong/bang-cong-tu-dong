import { useEffect, useRef } from 'react'

interface Props {
  daysInMonth: number
  exclude: number
  anchor?: { top: number; left: number }
  onPick: (day: number) => void
  onClose: () => void
}

export function DayPickerPopup({ daysInMonth, exclude, anchor, onPick, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose() }
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', h)
    document.addEventListener('keydown', k)
    return () => {
      document.removeEventListener('mousedown', h)
      document.removeEventListener('keydown', k)
    }
  }, [onClose])

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  return (
    <div
      ref={ref}
      className="fixed z-50 p-2 shadow-lg"
      style={{
        top: anchor?.top ?? 80,
        left: anchor?.left ?? 80,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        maxWidth: 240,
      }}
    >
      <div className="text-[10px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
        Chọn ngày đích
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => (
          <button
            key={d}
            disabled={d === exclude}
            onClick={() => onPick(d)}
            className="w-7 h-7 text-xs rounded-[var(--radius-sm)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--bg-hover)]"
            style={{ border: '1px solid var(--border)' }}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  )
}
