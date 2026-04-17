import { type CellSnap } from '../stores/matrix-history-store'
import { type models, type services } from '../../wailsjs/go/models'
import { dateOf } from './matrix-utils'
import { BulkUpsertCells, BulkDeleteAttendance } from '../../wailsjs/go/main/App'

// Snapshot the current state of a set of (userId, day) cells from the matrix.
// Captures coef + worksite + note so undo can restore fully.
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
    return {
      userId,
      day,
      state: {
        coef: c.coefficient ?? 0,
        wsID: c.worksiteId ?? null,
        note: c.note ?? '',
      },
    }
  })
}

// Apply a list of cell snapshots atomically: one bulk upsert + one bulk delete.
// Preserves note, worksite and coefficient from the snapshot.
export async function applySnapshot(ym: string, snaps: CellSnap[]): Promise<void> {
  const toDelete: models.CellRef[] = []
  const toUpsert: services.CellUpsert[] = []
  for (const s of snaps) {
    if (s.state) {
      toUpsert.push({
        userId: s.userId,
        date: dateOf(ym, s.day),
        coefficient: s.state.coef,
        worksiteId: s.state.wsID ?? undefined,
        note: s.state.note,
      })
    } else {
      toDelete.push({ userId: s.userId, date: dateOf(ym, s.day) } as models.CellRef)
    }
  }
  if (toUpsert.length > 0) await BulkUpsertCells(toUpsert)
  if (toDelete.length > 0) await BulkDeleteAttendance(toDelete)
}
