import { useMemo, useState } from 'react'
import { UserPlus } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (name: string) => void
  onBulkSave: (names: string[]) => void
}

type Mode = 'single' | 'bulk'

function parseNames(raw: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of raw.split(/\r?\n/)) {
    const n = line.trim()
    if (!n) continue
    if (seen.has(n)) continue
    seen.add(n)
    out.push(n)
  }
  return out
}

export function AddPersonDialog({ open, onClose, onSave, onBulkSave }: Props) {
  const [mode, setMode] = useState<Mode>('single')
  const [name, setName] = useState('')
  const [raw, setRaw] = useState('')

  const names = useMemo(() => parseNames(raw), [raw])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'single') {
      if (!name.trim()) return
      onSave(name.trim())
      setName('')
      onClose()
      return
    }
    if (names.length === 0) return
    onBulkSave(names)
    setRaw('')
    onClose()
  }

  const inputCls = 'w-full px-3 py-2 text-sm bg-transparent rounded-[var(--radius)]'

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}
        className="w-[420px] p-6" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center gap-3 mb-4">
          <UserPlus size={24} style={{ color: 'var(--primary)' }} />
          <h2 className="text-lg font-bold">Thêm người</h2>
        </div>
        <div className="flex gap-1 mb-4 p-1" style={{ background: 'var(--bg-muted)', borderRadius: 'var(--radius)' }}>
          <button type="button" onClick={() => setMode('single')}
            className="flex-1 py-1.5 text-xs font-semibold rounded-[var(--radius-sm)]"
            style={{ background: mode === 'single' ? 'var(--bg-card)' : 'transparent', boxShadow: mode === 'single' ? 'var(--shadow)' : 'none' }}>
            Một người
          </button>
          <button type="button" onClick={() => setMode('bulk')}
            className="flex-1 py-1.5 text-xs font-semibold rounded-[var(--radius-sm)]"
            style={{ background: mode === 'bulk' ? 'var(--bg-card)' : 'transparent', boxShadow: mode === 'bulk' ? 'var(--shadow)' : 'none' }}>
            Dán nhiều tên
          </button>
        </div>

        {mode === 'single' ? (
          <div>
            <label className="block text-sm font-medium mb-1">Tên</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className={inputCls} style={{ border: '1px solid var(--border)' }} autoFocus />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium mb-1">Dán tên (mỗi dòng một tên)</label>
            <textarea value={raw} onChange={(e) => setRaw(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-transparent rounded-[var(--radius)] resize-y"
              style={{ border: '1px solid var(--border)', minHeight: 160, fontFamily: 'inherit' }}
              autoFocus
              placeholder="Nguyễn Văn A\nTrần Thị B\n..." />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {names.length} tên hợp lệ
            </p>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button type="button" onClick={onClose}
            className="flex-1 py-2 text-sm rounded-[var(--radius)] hover:bg-[var(--bg-hover)] transition-colors"
            style={{ border: '1px solid var(--border)' }}>Huỷ</button>
          <button type="submit"
            disabled={mode === 'single' ? !name.trim() : names.length === 0}
            className="flex-1 py-2 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 rounded-[var(--radius)]"
            style={{ background: 'var(--primary)' }}>
            {mode === 'single' ? 'Thêm' : `Thêm ${names.length || ''}`.trim()}
          </button>
        </div>
      </form>
    </div>
  )
}
