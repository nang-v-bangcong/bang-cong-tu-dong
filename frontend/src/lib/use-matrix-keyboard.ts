import { useEffect } from 'react'
import { toast } from 'sonner'
import { useHistoryStore, type HistoryEntry } from '../stores/matrix-history-store'

interface Opts {
  runUndo: (entry: HistoryEntry) => Promise<void>
  runRedo: (entry: HistoryEntry) => Promise<void>
  onGoToday: () => void
  onTogglePaint?: () => void
}

export function useMatrixKeyboard({ runUndo, runRedo, onGoToday, onTogglePaint }: Opts) {
  const popUndo = useHistoryStore((s) => s.popUndo)
  const popRedo = useHistoryStore((s) => s.popRedo)

  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        const entry = popUndo()
        if (!entry) { toast.info('Không còn thao tác để hoàn tác'); return }
        try { await runUndo(entry); toast.success('Đã hoàn tác') }
        catch { toast.error('Lỗi hoàn tác') }
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault()
        const entry = popRedo()
        if (!entry) { toast.info('Không còn thao tác để làm lại'); return }
        try { await runRedo(entry); toast.success('Đã làm lại') }
        catch { toast.error('Lỗi làm lại') }
      } else if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault()
        onGoToday()
      } else if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'b' || e.key === 'B')) {
        if (!onTogglePaint) return
        e.preventDefault()
        onTogglePaint()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [runUndo, runRedo, onGoToday, onTogglePaint, popUndo, popRedo])
}
