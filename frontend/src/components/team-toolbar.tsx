import { Calendar } from 'lucide-react'
import { UndoRedoButtons } from './undo-redo-buttons'

interface Props {
  hasToday: boolean
  onToday: () => void
  undoCount: number
  redoCount: number
  onUndo: () => void
  onRedo: () => void
}

export function TeamToolbar({ hasToday, onToday, undoCount, redoCount, onUndo, onRedo }: Props) {
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
    </div>
  )
}
