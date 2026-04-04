import { useState, useEffect } from 'react'
import { Pencil } from 'lucide-react'

interface Props {
  open: boolean
  name: string
  dailyWage: number
  onSave: (name: string, dailyWage: number) => void
  onClose: () => void
}

export function EditUserDialog({ open, name: initName, dailyWage: initWage, onSave, onClose }: Props) {
  const [name, setName] = useState(initName)
  const [wage, setWage] = useState(String(initWage))

  useEffect(() => {
    if (open) { setName(initName); setWage(String(initWage)) }
  }, [open, initName, initWage])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !wage) return
    onSave(name.trim(), Number(wage))
  }

  const inputCls = 'w-full px-3 py-2 text-sm bg-transparent rounded-[var(--radius)]'

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}
        className="w-[360px] p-6" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center gap-3 mb-4">
          <Pencil size={20} style={{ color: 'var(--primary)' }} />
          <h2 className="text-lg font-bold">Sửa thông tin</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Tên</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className={inputCls} style={{ border: '1px solid var(--border)' }} autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Lương ngày (Won)</label>
            <input type="number" value={wage} onChange={(e) => setWage(e.target.value)}
              className={inputCls} style={{ border: '1px solid var(--border)' }} />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button type="button" onClick={onClose}
            className="flex-1 py-2 text-sm rounded-[var(--radius)] hover:bg-[var(--bg-hover)] transition-colors"
            style={{ border: '1px solid var(--border)' }}>Huỷ</button>
          <button type="submit" disabled={!name.trim() || !wage}
            className="flex-1 py-2 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 rounded-[var(--radius)]"
            style={{ background: 'var(--primary)' }}>Lưu</button>
        </div>
      </form>
    </div>
  )
}
