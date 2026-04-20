import { useState } from 'react'
import { X, ExternalLink, Check, MessageSquarePlus } from 'lucide-react'
import { toast } from 'sonner'
import type { githubapi } from '../../wailsjs/go/models'
import { ResolveBugReport } from '../../wailsjs/go/main/App'
import { BrowserOpenURL } from '../../wailsjs/runtime/runtime'
import { BugMarkdown } from './bug-markdown'

type Props = {
  issue: githubapi.Issue
  onClose: () => void
  onResolved: (number: number) => void
}

export function BugDetailModal({ issue, onClose, onResolved }: Props) {
  const [note, setNote] = useState('')
  const [noteMode, setNoteMode] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (withNote: boolean) => {
    if (withNote && !note.trim()) {
      toast.error('Nhập nội dung note'); return
    }
    setBusy(true)
    try {
      await ResolveBugReport(issue.number, withNote ? note.trim() : '')
      toast.success(withNote ? 'Đã comment + đóng issue' : 'Đã đánh dấu xử lý')
      onResolved(issue.number); onClose()
    } catch (e: any) {
      toast.error('Thất bại: ' + String(e?.message ?? e))
    } finally { setBusy(false) }
  }

  const btnLight = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
  }
  const btnPrimary = {
    background: busy ? 'var(--bg-muted)' : 'var(--primary)',
    color: busy ? 'var(--text-muted)' : '#fff',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[85vh] rounded-lg flex flex-col"
        style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)' }}
      >
        <div
          className="flex items-start justify-between gap-3 px-5 py-3 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="min-w-0">
            <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              #{issue.number}
            </div>
            <div className="text-base font-semibold truncate">{issue.title}</div>
          </div>
          <button onClick={onClose} aria-label="Đóng"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          <button
            onClick={() => BrowserOpenURL(issue.html_url)}
            className="inline-flex items-center gap-1 text-xs mb-3"
            style={{ color: 'var(--primary)' }}
          >
            <ExternalLink size={12} /> Xem trên GitHub
          </button>
          <BugMarkdown body={issue.body} />
        </div>

        <div className="border-t px-5 py-3 space-y-2" style={{ borderColor: 'var(--border)' }}>
          {noteMode && (
            <textarea
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Nội dung comment (ví dụ: đã fix ở v1.2.3)"
              className="w-full px-3 py-2 rounded border text-sm"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
            />
          )}
          <div className="flex justify-end gap-2">
            {!noteMode ? (
              <>
                <button onClick={onClose} className="px-3 py-1.5 rounded text-sm" style={btnLight}>
                  Hủy
                </button>
                <button
                  onClick={() => setNoteMode(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm"
                  style={btnLight}
                >
                  <MessageSquarePlus size={14} /> Đóng kèm note
                </button>
                <button
                  onClick={() => submit(false)} disabled={busy}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium"
                  style={btnPrimary}
                >
                  <Check size={14} /> Đã xử lý
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setNoteMode(false); setNote('') }}
                  disabled={busy}
                  className="px-3 py-1.5 rounded text-sm" style={btnLight}
                >
                  Hủy note
                </button>
                <button
                  onClick={() => submit(true)} disabled={busy}
                  className="px-3 py-1.5 rounded text-sm font-medium" style={btnPrimary}
                >
                  Gửi & đóng
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
