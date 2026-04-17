import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Users, X, Check } from 'lucide-react'
import { type Worksite, mapWorksites, formatWon } from '../lib/utils'
import { GetWorksites, GetToday, BulkUpsertCells } from '../../wailsjs/go/main/App'
import { type services } from '../../wailsjs/go/models'

interface User { id: number; name: string }

interface Props {
  open: boolean
  users: User[]
  onClose: () => void
  onDone: () => void
}

interface Row {
  userId: number
  name: string
  checked: boolean
  coefficient: number
}

export function BatchAttendance({ open, users, onClose, onDone }: Props) {
  const [rows, setRows] = useState<Row[]>([])
  const [worksites, setWorksites] = useState<Worksite[]>([])
  const [wsId, setWsId] = useState<number | null>(null)
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    Promise.all([GetWorksites(), GetToday()]).then(([ws, td]) => {
      setWorksites(mapWorksites(ws))
      setDate(td as string)
    })
    setRows(users.map((u) => ({ userId: u.id, name: u.name, checked: true, coefficient: 1 })))
  }, [open, users])

  if (!open) return null

  const toggleAll = (checked: boolean) => setRows(rows.map((r) => ({ ...r, checked })))
  const toggle = (idx: number) => setRows(rows.map((r, i) => i === idx ? { ...r, checked: !r.checked } : r))
  const setCoeff = (idx: number, val: number) => setRows(rows.map((r, i) => i === idx ? { ...r, coefficient: val } : r))

  const checkedCount = rows.filter((r) => r.checked).length
  const selectedWs = worksites.find((w) => w.id === wsId)

  const handleSave = async () => {
    const toSave = rows.filter((r) => r.checked && r.coefficient > 0)
    if (toSave.length === 0) return
    setSaving(true)
    try {
      const payload: services.CellUpsert[] = toSave.map((r) => ({
        userId: r.userId,
        date,
        coefficient: r.coefficient,
        worksiteId: wsId ?? undefined,
        note: '',
      }))
      await BulkUpsertCells(payload)
      toast.success(`Đã chấm công ${toSave.length} người`)
      onDone()
      onClose()
    } catch (e: any) {
      toast.error(String(e?.message ?? e ?? 'Lỗi chấm công'))
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'px-2 py-1.5 text-sm bg-transparent rounded-[var(--radius-sm)]'

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-[480px] p-6 max-h-[85vh] flex flex-col"
        style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={20} style={{ color: 'var(--primary)' }} />
            <h2 className="text-lg font-bold">Chấm công nhóm</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Date + Worksite */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Ngày</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className={`w-full ${inputCls}`} style={{ border: '1px solid var(--border)' }} />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Nơi làm việc</label>
            <select value={wsId ?? ''} onChange={(e) => setWsId(e.target.value ? Number(e.target.value) : null)}
              className={`w-full ${inputCls} cursor-pointer`} style={{ border: '1px solid var(--border)' }}>
              <option value="">-- Không chọn --</option>
              {worksites.map((w) => (
                <option key={w.id} value={w.id}>{w.name} ({formatWon(w.dailyWage)})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Select all */}
        <div className="flex items-center justify-between mb-2 px-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={checkedCount === rows.length} onChange={(e) => toggleAll(e.target.checked)}
              className="w-4 h-4 rounded accent-[var(--primary)]" />
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Chọn tất cả ({checkedCount}/{rows.length})
            </span>
          </label>
          {selectedWs && (
            <span className="text-xs" style={{ color: 'var(--primary)' }}>
              Lương: {formatWon(selectedWs.dailyWage)}/ngày
            </span>
          )}
        </div>

        {/* Person list */}
        <div className="overflow-auto flex-1 space-y-0.5 mb-4">
          {rows.map((r, i) => (
            <div key={r.userId}
              className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] hover:bg-[var(--bg-muted)] transition-colors"
              style={{ opacity: r.checked ? 1 : 0.5 }}>
              <input type="checkbox" checked={r.checked} onChange={() => toggle(i)}
                className="w-4 h-4 rounded accent-[var(--primary)]" />
              <span className="flex-1 text-sm font-medium">{r.name}</span>
              <select value={r.coefficient} onChange={(e) => setCoeff(i, Number(e.target.value))}
                disabled={!r.checked}
                className="w-20 px-2 py-1 text-xs text-center bg-transparent rounded-[var(--radius-sm)] cursor-pointer"
                style={{ border: '1px solid var(--border)' }}>
                <option value={0.3}>0.3</option>
                <option value={0.5}>0.5</option>
                <option value={0.7}>0.7</option>
                <option value={1}>1.0</option>
                <option value={1.3}>1.3</option>
                <option value={1.5}>1.5</option>
                <option value={2}>2.0</option>
              </select>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="text-center text-sm py-4" style={{ color: 'var(--text-muted)' }}>Chưa có ai trong nhóm</p>
          )}
        </div>

        {/* Action */}
        <button onClick={handleSave} disabled={saving || checkedCount === 0}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
          style={{ background: 'var(--primary)', borderRadius: 'var(--radius)' }}>
          <Check size={16} />
          {saving ? 'Đang lưu...' : `Chấm công ${checkedCount} người`}
        </button>
      </div>
    </div>
  )
}
