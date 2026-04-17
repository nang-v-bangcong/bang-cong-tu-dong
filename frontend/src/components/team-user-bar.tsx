import { UserPlus, Trash2, Users } from 'lucide-react'
import { type User } from '../lib/utils'

interface Props {
  users: User[]
  selected: User | null
  onSelect: (u: User) => void
  onRequestDelete: (u: User) => void
  onAdd: () => void
  onBatch: () => void
}

export function TeamUserBar({ users, selected, onSelect, onRequestDelete, onAdd, onBatch }: Props) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {users.map((u) => (
        <div key={u.id} className="flex items-center gap-0.5">
          <button onClick={() => onSelect(u)}
            className={`px-2.5 py-1 text-xs font-medium transition-all ${selected?.id === u.id ? 'text-white' : 'hover:bg-[var(--bg-hover)]'}`}
            style={selected?.id === u.id
              ? { background: 'var(--primary)', borderRadius: 'var(--radius-sm)' }
              : { background: 'var(--bg-muted)', borderRadius: 'var(--radius-sm)' }}>
            {u.name}
          </button>
          <button onClick={() => onRequestDelete(u)} className="p-0.5 opacity-30 hover:opacity-100 hover:text-[var(--danger)] transition-opacity">
            <Trash2 size={10} />
          </button>
        </div>
      ))}
      <button onClick={onAdd}
        className="px-2.5 py-1 text-xs text-white font-medium flex items-center gap-1 hover:opacity-90 transition-opacity"
        style={{ background: 'var(--primary)', borderRadius: 'var(--radius-sm)' }}>
        <UserPlus size={12} /> Thêm
      </button>
      {users.length > 0 && (
        <button onClick={onBatch}
          className="px-2.5 py-1 text-xs text-white font-medium flex items-center gap-1 hover:opacity-90 transition-opacity"
          style={{ background: 'var(--success)', borderRadius: 'var(--radius-sm)' }}>
          <Users size={12} /> Chấm công nhóm
        </button>
      )}
    </div>
  )
}
