import { useState } from 'react'
import { UserPlus } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (name: string) => void
}

export function AddPersonDialog({ open, onClose, onSave }: Props) {
  const [name, setName] = useState('')

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave(name.trim())
    setName('')
    onClose()
  }

  const inputCls = 'w-full px-3 py-2 text-sm bg-transparent rounded-[var(--radius)]'

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}
        className="w-[360px] p-6" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center gap-3 mb-4">
          <UserPlus size={24} style={{ color: 'var(--primary)' }} />
          <h2 className="text-lg font-bold">Thêm người</h2>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tên</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className={inputCls} style={{ border: '1px solid var(--border)' }} autoFocus />
        </div>
        <div className="flex gap-2 mt-4">
          <button type="button" onClick={onClose}
            className="flex-1 py-2 text-sm rounded-[var(--radius)] hover:bg-[var(--bg-hover)] transition-colors"
            style={{ border: '1px solid var(--border)' }}>Huỷ</button>
          <button type="submit" disabled={!name.trim()}
            className="flex-1 py-2 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 rounded-[var(--radius)]"
            style={{ background: 'var(--primary)' }}>Thêm</button>
        </div>
      </form>
    </div>
  )
}
