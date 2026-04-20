import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'
import { ListBugReports } from '../../wailsjs/go/main/App'
import type { githubapi } from '../../wailsjs/go/models'
import { BugListItem } from '../components/bug-list-item'
import { BugDetailModal } from '../components/bug-detail-modal'
import { useAdminStore } from '../stores/admin-store'

export function BugsPage() {
  const { setSetupOpen, setCredsLoaded, setBugCount } = useAdminStore()
  const [issues, setIssues] = useState<githubapi.Issue[]>([])
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<githubapi.Issue | null>(null)

  const handleError = (e: any) => {
    const msg = String(e?.message ?? e)
    if (msg.includes('unauthorized')) {
      setCredsLoaded(false)
      setSetupOpen(true)
      toast.error('Token hết hạn, nhập lại')
    } else {
      toast.error('Tải danh sách thất bại: ' + msg)
    }
  }

  const load = async (p: number, append = false) => {
    setLoading(true)
    try {
      const res = await ListBugReports(p)
      const list = res.issues ?? []
      setIssues((prev) => {
        const next = append ? [...prev, ...list] : list
        if (!append || p === 1) setBugCount(next.length)
        return next
      })
      setHasNext(Boolean(res.hasNext))
      setPage(p)
    } catch (e: any) {
      handleError(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onResolved = (number: number) => {
    setIssues((prev) => {
      const next = prev.filter((i) => i.number !== number)
      setBugCount(next.length)
      return next
    })
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Báo lỗi</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Issue label <span className="font-mono">bug-report</span>, state open.
          </p>
        </div>
        <button
          onClick={() => load(1, false)}
          disabled={loading}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Làm mới
        </button>
      </div>

      {loading && issues.length === 0 ? (
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Đang tải...
        </div>
      ) : issues.length === 0 ? (
        <div
          className="rounded border p-8 text-sm text-center"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          Không có báo lỗi nào đang mở. 🎉
        </div>
      ) : (
        <div
          className="rounded border"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
        >
          {issues.map((iss) => (
            <BugListItem key={iss.number} issue={iss} onSelect={setSelected} />
          ))}
          {hasNext && (
            <div className="p-3 text-center">
              <button
                onClick={() => load(page + 1, true)}
                disabled={loading}
                className="text-sm"
                style={{ color: 'var(--primary)' }}
              >
                {loading ? 'Đang tải...' : 'Tải thêm'}
              </button>
            </div>
          )}
        </div>
      )}

      {selected && (
        <BugDetailModal
          issue={selected}
          onClose={() => setSelected(null)}
          onResolved={onResolved}
        />
      )}
    </div>
  )
}
