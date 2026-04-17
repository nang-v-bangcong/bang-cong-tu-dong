import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Building2, Plus, Trash2, Pencil, X, Check } from 'lucide-react'
import { type Worksite, mapWorksites, formatWon } from '../lib/utils'
import { useAppStore } from '../stores/app-store'
import { GetWorksites, CreateWorksite, UpdateWorksite, DeleteWorksite } from '../../wailsjs/go/main/App'

interface Props {
  open: boolean
  onClose: () => void
}

export function WorksiteManager({ open, onClose }: Props) {
  const triggerRefresh = useAppStore((s) => s.triggerRefresh)
  const [sites, setSites] = useState<Worksite[]>([])
  const [newName, setNewName] = useState('')
  const [newWage, setNewWage] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editWage, setEditWage] = useState('')

  const load = async () => {
    try {
      setSites(mapWorksites(await GetWorksites() as any[]))
    } catch { toast.error('Lỗi tải nơi làm việc') }
  }

  useEffect(() => {
    if (open) load()
  }, [open])

  if (!open) return null

  const handleAdd = async () => {
    if (!newName.trim() || !newWage) return
    try {
      await CreateWorksite(newName.trim(), Number(newWage))
      setNewName(''); setNewWage(''); load(); triggerRefresh()
      toast.success('Đã thêm nơi làm việc')
    } catch { toast.error('Lỗi thêm nơi làm việc') }
  }

  const handleUpdate = async (id: number) => {
    if (!editName.trim() || !editWage) return
    try {
      await UpdateWorksite(id, editName.trim(), Number(editWage))
      setEditId(null); load(); triggerRefresh(); toast.success('Đã cập nhật')
    } catch { toast.error('Lỗi cập nhật') }
  }

  const handleDelete = async (id: number) => {
    try { await DeleteWorksite(id); load(); triggerRefresh(); toast.success('Đã xóa') }
    catch { toast.error('Không thể xóa - đang được sử dụng') }
  }

  const inputCls = 'px-3 py-2 text-sm bg-transparent rounded-[var(--radius)]'

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-[440px] p-6 max-h-[80vh] flex flex-col"
        style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 size={20} style={{ color: 'var(--primary)' }} />
            <h2 className="text-lg font-bold">Nơi làm việc</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <input value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Tên công trường..."
            className={`flex-1 ${inputCls}`} style={{ border: '1px solid var(--border)' }} />
          <input type="number" value={newWage} onChange={(e) => setNewWage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Lương/ngày"
            className={`w-28 ${inputCls}`} style={{ border: '1px solid var(--border)' }} />
          <button onClick={handleAdd}
            className="px-3 py-2 text-white rounded-[var(--radius)] hover:opacity-90 transition-opacity"
            style={{ background: 'var(--primary)' }}>
            <Plus size={16} />
          </button>
        </div>

        <div className="overflow-auto flex-1 space-y-0.5">
          {sites.map((s) => (
            <div key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] hover:bg-[var(--bg-muted)] transition-colors">
              {editId === s.id ? (
                <>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdate(s.id)}
                    className="flex-1 px-2 py-1 text-sm bg-transparent rounded-[var(--radius-sm)]"
                    style={{ border: '1px solid var(--border)' }} autoFocus />
                  <input type="number" value={editWage} onChange={(e) => setEditWage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdate(s.id)}
                    className="w-24 px-2 py-1 text-sm bg-transparent rounded-[var(--radius-sm)]"
                    style={{ border: '1px solid var(--border)' }} />
                  <button onClick={() => handleUpdate(s.id)} className="p-1" style={{ color: 'var(--success)' }}><Check size={14} /></button>
                  <button onClick={() => setEditId(null)} className="p-1" style={{ color: 'var(--text-muted)' }}><X size={14} /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{s.name}</span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>{formatWon(s.dailyWage)}</span>
                  <button onClick={() => { setEditId(s.id); setEditName(s.name); setEditWage(String(s.dailyWage)) }}
                    className="p-1 opacity-40 hover:opacity-100 transition-opacity" style={{ color: 'var(--primary)' }}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(s.id)}
                    className="p-1 opacity-40 hover:opacity-100 transition-opacity" style={{ color: 'var(--danger)' }}>
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))}
          {sites.length === 0 && (
            <p className="text-center text-sm py-4" style={{ color: 'var(--text-muted)' }}>Chưa có nơi làm việc nào</p>
          )}
        </div>
      </div>
    </div>
  )
}
