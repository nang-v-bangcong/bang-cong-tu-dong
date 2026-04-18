import { useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { useHistoryStore, type HistoryEntry } from '../stores/history-store'
import { applySnapshot } from './matrix-history'
import { useTeamHistoryRecorder } from './use-team-history-recorder'
import { type Attendance, type User } from './utils'
import { UpsertAttendance, DeleteAttendance, CopyPreviousDay } from '../../wailsjs/go/main/App'

interface Opts {
  yearMonth: string
  selected: User | null
  today: string
  records: Attendance[]
  reloadPerson: () => Promise<Attendance[] | null>
  reloadSummary: () => void
}

export function useTeamAttendance({ yearMonth, selected, today, records, reloadPerson, reloadSummary }: Opts) {
  const userId = selected?.id ?? null
  const { record } = useTeamHistoryRecorder({ yearMonth, userId, records, reload: reloadPerson })

  const stack = useHistoryStore((s) => s.stacks.team)
  const popUndo = useHistoryStore((s) => s.popUndo)
  const popRedo = useHistoryStore((s) => s.popRedo)
  const clear = useHistoryStore((s) => s.clear)

  const runSnap = useCallback(async (entry: HistoryEntry, which: 'before' | 'after') => {
    await applySnapshot(entry.ym, entry[which])
    await reloadPerson()
    reloadSummary()
  }, [reloadPerson, reloadSummary])

  const onUndo = useCallback(async () => {
    const entry = popUndo('team')
    if (!entry) { toast.info('Không còn thao tác để hoàn tác'); return }
    try { await runSnap(entry, 'before'); toast.success('Đã hoàn tác') }
    catch { toast.error('Lỗi hoàn tác') }
  }, [popUndo, runSnap])

  const onRedo = useCallback(async () => {
    const entry = popRedo('team')
    if (!entry) { toast.info('Không còn thao tác để làm lại'); return }
    try { await runSnap(entry, 'after'); toast.success('Đã làm lại') }
    catch { toast.error('Lỗi làm lại') }
  }, [popRedo, runSnap])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); onUndo() }
      else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) { e.preventDefault(); onRedo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onUndo, onRedo])

  useEffect(() => { clear('team') }, [yearMonth, userId, clear])

  const handleSave = useCallback(async (date: string, coeff: number, wsId: number | null, note: string) => {
    if (!selected) return
    const day = parseInt(date.slice(8, 10), 10)
    try {
      await record(day, async () => { await UpsertAttendance(selected.id, date, coeff, wsId, note) })
      reloadSummary()
    } catch { toast.error('Lỗi lưu') }
  }, [selected, record, reloadSummary])

  const handleDelete = useCallback(async (id: number) => {
    if (!selected) return
    const rec = records.find((r) => r.id === id)
    if (!rec) { toast.error('Không tìm thấy ô'); return }
    const day = parseInt(rec.date.slice(8, 10), 10)
    try {
      await record(day, async () => { await DeleteAttendance(id) })
      reloadSummary()
    } catch { toast.error('Lỗi xóa') }
  }, [selected, records, record, reloadSummary])

  const handleQuickAdd = useCallback(async () => {
    if (!selected || !today) return
    const day = parseInt(today.slice(8, 10), 10)
    try {
      await record(day, async () => { await UpsertAttendance(selected.id, today, 1, null, '') })
      reloadSummary(); toast.success('Đã chấm công!')
    } catch { toast.error('Lỗi chấm công') }
  }, [selected, today, record, reloadSummary])

  const handleCopy = useCallback(async () => {
    if (!selected || !today) return
    try { await CopyPreviousDay(selected.id, today); await reloadPerson(); reloadSummary(); toast.success('Đã copy') }
    catch { toast.error('Không tìm thấy ngày trước') }
  }, [selected, today, reloadPerson, reloadSummary])

  return {
    handleSave, handleDelete, handleQuickAdd, handleCopy,
    onUndo, onRedo, undoCount: stack.past.length, redoCount: stack.future.length,
  }
}
