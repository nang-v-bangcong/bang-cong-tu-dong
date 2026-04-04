import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Wallet } from 'lucide-react'
import { formatWon } from '../lib/utils'
import { GetMonthAdvances, CreateAdvance, DeleteAdvance } from '../../wailsjs/go/main/App'

interface Advance { id: number; date: string; amount: number; note: string }

interface Props {
  userId: number
  yearMonth: string
  onChanged: () => void
}

export function AdvancePanel({ userId, yearMonth, onChanged }: Props) {
  const [advances, setAdvances] = useState<Advance[]>([])
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  const load = async () => {
    const data = await GetMonthAdvances(userId, yearMonth) as any[]
    setAdvances((data || []).map((a: any) => ({ id: a.id, date: a.date, amount: a.amount, note: a.note })))
  }

  useEffect(() => { load() }, [userId, yearMonth])

  const handleAdd = async () => {
    if (!date || !amount) return
    try {
      await CreateAdvance(userId, date, Number(amount), note)
      setDate(''); setAmount(''); setNote(''); setOpen(false)
      load(); onChanged(); toast.success('Đã thêm tạm ứng')
    } catch { toast.error('Lỗi thêm tạm ứng') }
  }

  const handleDelete = async (id: number) => {
    try { await DeleteAdvance(id); load(); onChanged(); toast.success('Đã xóa') }
    catch { toast.error('Lỗi xóa') }
  }

  const total = advances.reduce((s, a) => s + a.amount, 0)

  const inputCls = 'px-2 py-1.5 text-sm bg-transparent rounded-[var(--radius-sm)]'

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)' }} className="p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Wallet size={16} style={{ color: 'var(--orange)' }} />
          <span className="text-sm font-semibold">Tạm ứng</span>
          <span className="text-xs font-bold" style={{ color: 'var(--orange)' }}>{formatWon(total)}</span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="p-1 rounded-[var(--radius-sm)] hover:bg-[var(--primary-soft)] transition-colors"
          style={{ color: 'var(--primary)' }}
        >
          <Plus size={16} />
        </button>
      </div>

      {open && (
        <div className="flex gap-2 mb-2 flex-wrap">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className={inputCls} style={{ border: '1px solid var(--border)' }} />
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Số tiền"
            className={`w-24 ${inputCls}`} style={{ border: '1px solid var(--border)' }} />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú"
            className={`flex-1 ${inputCls}`} style={{ border: '1px solid var(--border)' }} />
          <button onClick={handleAdd} className="px-3 py-1.5 text-white text-sm font-medium rounded-[var(--radius-sm)] hover:opacity-90"
            style={{ background: 'var(--orange)' }}>Thêm</button>
        </div>
      )}

      {advances.length > 0 && (
        <div className="space-y-0.5">
          {advances.map((a) => (
            <div key={a.id} className="flex items-center gap-2 text-sm py-1.5 px-1 rounded-[var(--radius-sm)] hover:bg-[var(--bg-muted)] transition-colors">
              <span style={{ color: 'var(--text-muted)' }} className="w-16 text-xs">{a.date.slice(5)}</span>
              <span className="font-semibold" style={{ color: 'var(--orange)' }}>{formatWon(a.amount)}</span>
              <span className="flex-1 text-xs" style={{ color: 'var(--text-muted)' }}>{a.note}</span>
              <button onClick={() => handleDelete(a.id)} className="p-0.5 opacity-30 hover:opacity-100 hover:text-[var(--danger)] transition-opacity">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
