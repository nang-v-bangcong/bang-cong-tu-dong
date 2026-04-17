import { type CellSnap } from '../stores/matrix-history-store'
import { type models } from '../../wailsjs/go/models'
import { dateOf } from './matrix-utils'
import { UpsertAttendance, BulkDeleteAttendance } from '../../wailsjs/go/main/App'

// Snapshot the current state of a set of (userId, day) cells from the matrix.
export function snapshotCells(
  matrix: models.TeamMatrix,
  keys: Array<{ userId: number; day: number }>,
): CellSnap[] {
  const byUser = new Map<number, models.MatrixRow>()
  for (const r of matrix.rows) byUser.set(r.userId, r)
  return keys.map(({ userId, day }) => {
    const row = byUser.get(userId)
    const c = row?.cells?.[day]
    if (!c || !c.attendanceId) return { userId, day, state: null }
    return { userId, day, state: { coef: c.coefficient ?? 0, wsID: c.worksiteId ?? null } }
  })
}

// Apply a list of cell snapshots: upsert when state is present, delete when null.
export async function applySnapshot(ym: string, snaps: CellSnap[]): Promise<void> {
  const toDelete: Array<{ userId: number; date: string }> = []
  const toUpsert: CellSnap[] = []
  for (const s of snaps) {
    if (s.state) toUpsert.push(s)
    else toDelete.push({ userId: s.userId, date: dateOf(ym, s.day) })
  }
  for (const s of toUpsert) {
    await UpsertAttendance(
      s.userId,
      dateOf(ym, s.day),
      s.state!.coef,
      s.state!.wsID as any,
      '',
    )
  }
  if (toDelete.length > 0) await BulkDeleteAttendance(toDelete as any)
}
