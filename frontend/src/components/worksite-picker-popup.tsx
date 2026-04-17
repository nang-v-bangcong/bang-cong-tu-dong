import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { type Worksite } from '../lib/utils'

interface Props {
  worksites: Worksite[]
  current: number | null
  anchor?: { top: number; left: number }
  onPick: (wsId: number | null) => void
  onClose: () => void
}

export function WorksitePickerPopup({ worksites, current, anchor, onPick, onClose }: Props) {
  const [filter, setFilter] = useState('')
  const [idx, setIdx] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = worksites.filter((w) => w.name.toLowerCase().includes(filter.toLowerCase()))
  const items: Array<{ id: number | null; label: string }> = [
    { id: null, label: 'Không chọn' },
    ...filtered.map((w) => ({ id: w.id, label: w.name })),
  ]

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [onClose])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(items.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); onPick(items[idx].id) }
    else if (e.key === 'Escape') { e.preventDefault(); onClose() }
  }

  const pos = anchor ?? { top: 0, left: 0 }

  return (
    <div
      ref={ref}
      onKeyDown={onKey}
      tabIndex={-1}
      className="fixed z-50 shadow-lg"
      style={{
        top: pos.top,
        left: pos.left,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        minWidth: 220,
        maxHeight: 320,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div className="flex items-center gap-1 px-2 py-1.5 border-b" style={{ borderColor: 'var(--border)' }}>
        <Search size={12} style={{ color: 'var(--text-muted)' }} />
        <input
          autoFocus
          placeholder="Tìm..."
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setIdx(0) }}
          className="flex-1 text-xs bg-transparent outline-none"
        />
        <button onClick={onClose}><X size={12} /></button>
      </div>
      <div className="flex-1 overflow-auto">
        {items.map((it, i) => (
          <button
            key={String(it.id)}
            onClick={() => onPick(it.id)}
            onMouseEnter={() => setIdx(i)}
            className="w-full text-left px-3 py-1.5 text-xs flex items-center justify-between"
            style={{
              background: i === idx ? 'var(--bg-hover)' : 'transparent',
              color: it.id === current ? 'var(--primary)' : 'var(--text)',
              fontWeight: it.id === current ? 600 : 400,
            }}
          >
            <span>{it.label}</span>
            {it.id === current && <span>✓</span>}
          </button>
        ))}
        {items.length === 1 && <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>Không tìm thấy</p>}
      </div>
    </div>
  )
}
