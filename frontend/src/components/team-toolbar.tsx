import { Calendar, HelpCircle } from 'lucide-react'
import { UndoRedoButtons } from './undo-redo-buttons'

interface Props {
  hasToday: boolean
  onToday: () => void
  undoCount: number
  redoCount: number
  onUndo: () => void
  onRedo: () => void
  onHelpClick: () => void
}

export function TeamToolbar({ hasToday, onToday, undoCount, redoCount, onUndo, onRedo, onHelpClick }: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <UndoRedoButtons undoCount={undoCount} redoCount={redoCount} onUndo={onUndo} onRedo={onRedo} />
      {hasToday && (
        <button
          onClick={onToday}
          className="flex items-center gap-1 px-2.5 py-1 text-xs"
          style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
          title="Cuộn đến ngày hôm nay (T)"
        >
          <Calendar size={12} /> Hôm nay
        </button>
      )}
      <button
        onClick={onHelpClick}
        className="ml-auto flex items-center justify-center"
        style={{
          width: 26, height: 26,
          border: '1px solid var(--border)', borderRadius: '50%',
          color: 'var(--text-muted)',
        }}
        title="Phím tắt (Shift+/)"
      >
        <HelpCircle size={14} />
      </button>
    </div>
  )
}
