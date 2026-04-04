import { Plus, Copy, FileDown } from 'lucide-react'

interface Props {
  onQuickAdd: () => void
  onCopyPrev: () => void
  onExportPDF: () => void
}

export function QuickActions({ onQuickAdd, onCopyPrev, onExportPDF }: Props) {
  const secondaryCls = 'w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-[var(--radius)] hover:bg-[var(--bg-hover)] transition-colors'

  return (
    <div className="space-y-1.5 mt-auto">
      <button onClick={onQuickAdd}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-white text-xs font-semibold hover:opacity-90 transition-opacity"
        style={{ background: 'var(--primary)', borderRadius: 'var(--radius)' }}>
        <Plus size={14} /> Chấm công hôm nay
      </button>
      <button onClick={onCopyPrev} className={secondaryCls}
        style={{ border: '1px solid var(--border)' }}>
        <Copy size={14} /> Copy ngày trước
      </button>
      <button onClick={onExportPDF} className={secondaryCls}
        style={{ border: '1px solid var(--border)' }}>
        <FileDown size={14} /> Xuất PDF
      </button>
    </div>
  )
}
