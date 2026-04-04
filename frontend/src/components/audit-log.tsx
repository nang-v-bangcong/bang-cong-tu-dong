import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { History, X, Plus, Pencil, Trash2, ChevronDown } from 'lucide-react'
import { GetAuditLog } from '../../wailsjs/go/main/App'

interface AuditEntry {
  id: number
  action: string
  target: string
  targetId: number
  details: string
  createdAt: string
}

interface Props {
  open: boolean
  onClose: () => void
}

const ACTION_ICON: Record<string, typeof Plus> = { create: Plus, update: Pencil, delete: Trash2 }
const ACTION_COLOR: Record<string, string> = { create: 'var(--success)', update: 'var(--primary)', delete: 'var(--danger)' }

export function AuditLogDialog({ open, onClose }: Props) {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const load = async (offset = 0) => {
    setLoading(true)
    try {
      const data = await GetAuditLog(50, offset) as any[]
      const mapped = (data || []).map((e: any) => ({
        id: e.id, action: e.action, target: e.target,
        targetId: e.targetId, details: e.details, createdAt: e.createdAt,
      }))
      if (offset === 0) {
        setEntries(mapped)
      } else {
        setEntries((prev) => [...prev, ...mapped])
      }
      setHasMore(mapped.length === 50)
    } catch { toast.error('Lỗi tải lịch sử') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (open) { load(0); setHasMore(true) }
  }, [open])

  if (!open) return null

  const formatTime = (dt: string) => {
    if (!dt) return ''
    const d = new Date(dt + 'Z')
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-[500px] p-6 max-h-[80vh] flex flex-col"
        style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History size={20} style={{ color: 'var(--primary)' }} />
            <h2 className="text-lg font-bold">Lịch sử thay đổi</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-auto flex-1 space-y-0.5">
          {entries.map((e) => {
            const Icon = ACTION_ICON[e.action] || Pencil
            const color = ACTION_COLOR[e.action] || 'var(--text-muted)'
            return (
              <div key={e.id} className="flex items-start gap-2.5 px-3 py-2 rounded-[var(--radius-sm)] hover:bg-[var(--bg-muted)] transition-colors">
                <div className="mt-0.5 p-1 rounded-full" style={{ background: color + '20', color }}>
                  <Icon size={12} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">{e.details}</p>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatTime(e.createdAt)}</span>
                </div>
              </div>
            )
          })}
          {entries.length === 0 && !loading && (
            <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>Chưa có lịch sử</p>
          )}
          {loading && (
            <p className="text-center text-sm py-4" style={{ color: 'var(--text-muted)' }}>Đang tải...</p>
          )}
        </div>

        {hasMore && entries.length > 0 && !loading && (
          <button onClick={() => load(entries.length)}
            className="mt-2 w-full flex items-center justify-center gap-1 py-2 text-xs font-medium rounded-[var(--radius)] hover:bg-[var(--bg-muted)] transition-colors"
            style={{ color: 'var(--text-secondary)' }}>
            <ChevronDown size={14} /> Xem thêm
          </button>
        )}
      </div>
    </div>
  )
}
