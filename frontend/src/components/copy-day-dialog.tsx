import { useState } from 'react'

interface Props {
  srcDay: number
  daysInMonth: number
  onConfirm: (srcDay: number, dstDay: number, overwrite: boolean) => void
  onCancel: () => void
}

export function CopyDayDialog({ srcDay, daysInMonth, onConfirm, onCancel }: Props) {
  const [dst, setDst] = useState<number>(srcDay + 1 <= daysInMonth ? srcDay + 1 : Math.max(1, srcDay - 1))
  const [overwrite, setOverwrite] = useState(false)
  const invalid = dst < 1 || dst > daysInMonth || dst === srcDay

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50"
      onClick={onCancel}
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[360px] p-6"
        style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}
      >
        <h3 className="text-base font-bold mb-3">Sao chép ngày {srcDay}</h3>
        <label className="text-xs font-semibold block mb-1">Sang ngày</label>
        <input
          type="number"
          min={1}
          max={daysInMonth}
          value={dst}
          autoFocus
          onChange={(e) => setDst(parseInt(e.target.value, 10) || 0)}
          className="w-full px-3 py-2 mb-4 text-sm"
          style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg)' }}
        />
        <div className="flex flex-col gap-1.5 mb-4">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="radio" checked={!overwrite} onChange={() => setOverwrite(false)} />
            <span>Chỉ điền ô trống</span>
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="radio" checked={overwrite} onChange={() => setOverwrite(true)} />
            <span>Ghi đè tất cả</span>
          </label>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 py-2 text-sm rounded-[var(--radius)] hover:bg-[var(--bg-hover)] transition-colors"
            style={{ border: '1px solid var(--border)' }}>Huỷ</button>
          <button
            disabled={invalid}
            onClick={() => onConfirm(srcDay, dst, overwrite)}
            className="flex-1 py-2 text-white text-sm font-semibold rounded-[var(--radius)] disabled:opacity-50"
            style={{ background: 'var(--primary)' }}
          >Sao chép</button>
        </div>
      </div>
    </div>
  )
}
