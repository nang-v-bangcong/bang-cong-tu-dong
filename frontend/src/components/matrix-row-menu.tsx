import { useEffect, useRef } from 'react'
import { Pencil, FileDown, Trash2 } from 'lucide-react'

interface Props {
  userName: string
  x: number
  y: number
  onEdit: () => void
  onExportPDF: () => void
  onDelete: () => void
  onClose: () => void
}

export function MatrixRowMenu({ userName, x, y, onEdit, onExportPDF, onDelete, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

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

  const baseItem = 'w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-[var(--bg-hover)] transition-colors'

  return (
    <div
      ref={ref}
      className="fixed z-50 shadow-lg"
      style={{
        top: y,
        left: x,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        minWidth: 200,
      }}
    >
      <div className="px-3 py-1.5 text-[10px] font-semibold border-b truncate" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', maxWidth: 260 }}>
        {userName}
      </div>
      <button className={baseItem} onClick={() => { onEdit(); onClose() }}>
        <Pencil size={13} /> Sửa tên &amp; lương
      </button>
      <button className={baseItem} onClick={() => { onExportPDF(); onClose() }}>
        <FileDown size={13} /> Xuất PDF riêng
      </button>
      <div className="h-px my-0.5" style={{ background: 'var(--border)' }} />
      <button
        className={baseItem}
        style={{ color: 'var(--danger)' }}
        onClick={() => { onDelete(); onClose() }}
      >
        <Trash2 size={13} /> Xóa người này
      </button>
    </div>
  )
}
