import { useEffect, useRef, useState } from 'react'
import { MessageSquare } from 'lucide-react'

interface Props {
  day: number
  note: string
  onSave: (day: number, note: string) => void
}

export function DayNoteCell({ day, note, onSave }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(note)
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { setValue(note) }, [note])

  useEffect(() => {
    if (editing) textRef.current?.focus()
  }, [editing])

  const commit = () => {
    setEditing(false)
    if (value !== note) onSave(day, value)
  }

  if (editing) {
    return (
      <div className="absolute inset-0 z-20">
        <textarea
          ref={textRef}
          value={value}
          maxLength={500}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { e.preventDefault(); setValue(note); setEditing(false) }
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); commit() }
          }}
          className="w-full h-full p-1 text-[10px] resize-none outline-none"
          style={{ background: 'var(--bg-card)', border: '2px solid var(--primary)', borderRadius: 'var(--radius-sm)' }}
          placeholder="Ghi chú..."
        />
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="w-full h-full flex items-center justify-center px-0.5"
      title={note || 'Thêm ghi chú'}
      style={{ color: note ? 'var(--text)' : 'var(--text-muted)' }}
    >
      {note ? (
        <span className="text-[9px] truncate w-full text-left">{note}</span>
      ) : (
        <MessageSquare size={10} className="opacity-40" />
      )}
    </button>
  )
}
