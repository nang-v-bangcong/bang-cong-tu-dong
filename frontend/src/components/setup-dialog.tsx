import { useState } from 'react'
import { UserCircle } from 'lucide-react'

interface Props {
  onSave: (name: string) => void
}

export function SetupDialog({ onSave }: Props) {
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave(name.trim())
  }

  const inputCls = 'w-full px-3 py-2 text-sm bg-transparent rounded-[var(--radius)]'

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <form
        onSubmit={handleSubmit}
        className="w-[360px] p-6"
        style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}
      >
        <div className="flex items-center gap-3 mb-5">
          <UserCircle size={28} style={{ color: 'var(--primary)' }} />
          <h2 className="text-lg font-bold">Thiết lập ban đầu</h2>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tên của bạn</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyen Van A"
            className={inputCls} style={{ border: '1px solid var(--border)' }} autoFocus />
          <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            Lương được tính theo từng nơi làm việc. Bạn có thể thêm nơi làm việc sau khi vào app.
          </p>
        </div>
        <button type="submit" disabled={!name.trim()}
          className="mt-5 w-full py-2.5 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'var(--primary)', borderRadius: 'var(--radius)' }}>
          Bắt đầu
        </button>
      </form>
    </div>
  )
}
