import { Undo2, Redo2 } from 'lucide-react'

interface Props {
  undoCount: number
  redoCount: number
  onUndo: () => void
  onRedo: () => void
}

export function UndoRedoButtons({ undoCount, redoCount, onUndo, onRedo }: Props) {
  return (
    <div className="flex items-center gap-1">
      <HistoryBtn icon={<Undo2 size={12} />} label="Hoàn tác" title={`Hoàn tác (Ctrl+Z) · ${undoCount}`} count={undoCount} onClick={onUndo} />
      <HistoryBtn icon={<Redo2 size={12} />} label="Làm lại" title={`Làm lại (Ctrl+Y) · ${redoCount}`} count={redoCount} onClick={onRedo} />
    </div>
  )
}

interface BtnProps { icon: React.ReactNode; label: string; title: string; count: number; onClick: () => void }

function HistoryBtn({ icon, title, count, onClick }: BtnProps) {
  const disabled = count === 0
  const badge = count > 99 ? '99+' : String(count)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="relative flex items-center gap-1 px-2 py-1 text-xs"
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'default' : 'pointer',
      }}
      title={title}
    >
      {icon}
      {count > 0 && (
        <span
          className="text-[9px] font-semibold px-1"
          style={{
            background: 'var(--primary)',
            color: '#fff',
            borderRadius: '999px',
            lineHeight: '14px',
            minWidth: 14,
            textAlign: 'center',
          }}
        >
          {badge}
        </span>
      )}
    </button>
  )
}
