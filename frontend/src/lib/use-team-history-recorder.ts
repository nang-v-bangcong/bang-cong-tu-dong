import { useCallback } from 'react'
import { useHistoryStore, type CellSnap } from '../stores/history-store'
import { type Attendance } from './utils'
import { dateOf } from './matrix-utils'

interface Opts {
  yearMonth: string
  userId: number | null
  records: Attendance[]
  reload: () => Promise<Attendance[] | null>
}

const snapFromAttendance = (userId: number, day: number, rec: Attendance | undefined): CellSnap => {
  if (!rec) return { userId, day, state: null }
  return {
    userId,
    day,
    state: { coef: rec.coefficient, wsID: rec.worksiteId ?? null, note: rec.note ?? '' },
  }
}

// Wraps a team-tab mutation (upsert or delete single attendance) with a snapshot
// before/after so undo/redo can restore the cell. Keyed on context 'team' so the
// matrix stack stays independent.
export function useTeamHistoryRecorder({ yearMonth, userId, records, reload }: Opts) {
  const push = useHistoryStore((s) => s.push)

  const record = useCallback(async (day: number, mutate: () => Promise<void>) => {
    if (userId == null) { await mutate(); return }
    const date = dateOf(yearMonth, day)
    const before: CellSnap[] = [snapFromAttendance(userId, day, records.find((r) => r.date === date))]
    await mutate()
    const fresh = await reload()
    const after: CellSnap[] = [snapFromAttendance(userId, day, (fresh ?? []).find((r) => r.date === date))]
    push('team', { ym: yearMonth, before, after, ts: Date.now() })
  }, [yearMonth, userId, records, reload, push])

  return { record }
}
