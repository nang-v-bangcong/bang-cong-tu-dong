import { useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { dateOf, listSundays } from './matrix-utils'
import { applySnapshot } from './matrix-history'
import { type CellSnap } from '../stores/history-store'
import { type models, type services } from '../../wailsjs/go/models'
import {
  UpsertAttendance, UpsertDayNote,
  BulkUpsertWorksite, BulkUpsertCell, BulkUpsertCells, BulkDeleteAttendance,
  FillDayForAllUsers, FillSundaysForAllUsers, CopyDayForAll,
} from '../../wailsjs/go/main/App'
import { useMatrixHistoryRecorder, type BulkCells } from './use-matrix-history-recorder'

export type { BulkCells }

interface Opts {
  yearMonth: string
  matrix: models.TeamMatrix | null
  reload: () => Promise<models.TeamMatrix | null>
}

export function useMatrixMutations({ yearMonth, matrix, reload }: Opts) {
  const matrixRef = useRef(matrix)
  matrixRef.current = matrix
  const ym = yearMonth

  const { record, recordFromKeys } = useMatrixHistoryRecorder({ yearMonth: ym, matrixRef, reload })

  const toRefs = useCallback((cells: BulkCells): models.CellRef[] =>
    cells.map((c) => ({ userId: c.userId, date: dateOf(ym, c.day) } as models.CellRef)),
  [ym])

  const onCellSave = useCallback(async (userId: number, day: number, coef: number, wsID: number | null) => {
    try {
      await record([{ userId, day }], async () => {
        const existing = matrixRef.current?.rows.find((r) => r.userId === userId)?.cells?.[day]
        if (coef <= 0) {
          if (existing?.attendanceId) {
            await BulkDeleteAttendance([{ userId, date: dateOf(ym, day) } as models.CellRef])
          }
          return
        }
        // Preserve existing note so single-cell coef edits don't wipe notes set via paste.
        const note = existing?.attendanceId ? (existing.note ?? '') : ''
        await UpsertAttendance(userId, dateOf(ym, day), coef, wsID, note)
      })
    } catch { toast.error('Lỗi lưu ô') }
  }, [ym, record])

  const onBulkAssign = useCallback(async (cells: BulkCells, wsID: number | null) => {
    try {
      await record(cells, async () => {
        await BulkUpsertWorksite(toRefs(cells), wsID)
      })
      toast.success(`Đã gán ${cells.length} ô`)
    } catch { toast.error('Lỗi gán công trường') }
  }, [record, toRefs])

  const onBulkCoef = useCallback(async (cells: BulkCells, coef: number) => {
    try {
      await record(cells, async () => {
        await BulkUpsertCell(toRefs(cells), coef, null)
      })
      toast.success(`Đã đặt hệ số ${coef} cho ${cells.length} ô`)
    } catch { toast.error('Lỗi cập nhật hệ số') }
  }, [record, toRefs])

  const onBulkDelete = useCallback(async (cells: BulkCells) => {
    try {
      await record(cells, async () => {
        await BulkDeleteAttendance(toRefs(cells))
      })
      toast.success(`Đã xóa ${cells.length} ô`)
    } catch { toast.error('Lỗi xóa') }
  }, [record, toRefs])

  const onFillRange = useCallback(async (cells: BulkCells, coef: number, wsID: number | null) => {
    if (cells.length === 0) return
    try {
      await record(cells, async () => {
        // Fill cả coef + worksite từ ô nguồn; giữ nguyên note của target.
        const current = matrixRef.current
        const byUser = new Map<number, models.MatrixRow>()
        if (current) for (const r of current.rows) byUser.set(r.userId, r)
        const payload: services.CellUpsert[] = cells.map((c) => {
          const existing = byUser.get(c.userId)?.cells?.[c.day]
          return {
            userId: c.userId,
            date: dateOf(ym, c.day),
            coefficient: coef,
            worksiteId: wsID ?? undefined,
            note: existing?.attendanceId ? (existing.note ?? '') : '',
          }
        })
        await BulkUpsertCells(payload)
      })
      toast.success(`Đã điền ${cells.length} ô`)
    } catch { toast.error('Lỗi điền dải') }
  }, [ym, record])

  const onPasteGrid = useCallback(async (items: Array<{ userId: number; day: number; coef: number }>) => {
    if (items.length === 0) return
    try {
      const keys: BulkCells = items.map((i) => ({ userId: i.userId, day: i.day }))
      await record(keys, async () => {
        // Preserve existing worksite/note on occupied cells so paste only overwrites coef.
        const current = matrixRef.current
        const byUser = new Map<number, models.MatrixRow>()
        if (current) for (const r of current.rows) byUser.set(r.userId, r)
        const payload: services.CellUpsert[] = items.map((it) => {
          const existing = byUser.get(it.userId)?.cells?.[it.day]
          const keepWs = existing?.attendanceId ? existing.worksiteId : undefined
          return {
            userId: it.userId,
            date: dateOf(ym, it.day),
            coefficient: it.coef,
            worksiteId: keepWs ?? undefined,
            note: existing?.attendanceId ? (existing.note ?? '') : '',
          }
        })
        await BulkUpsertCells(payload)
      })
    } catch { toast.error('Lỗi dán dữ liệu') }
  }, [ym, record])

  const onFillDay = useCallback(async (day: number, coef: number, wsID: number | null) => {
    const current = matrixRef.current
    const keys: BulkCells = current ? current.rows.map((r) => ({ userId: r.userId, day })) : []
    try {
      await recordFromKeys(keys, async () => {
        const n = await FillDayForAllUsers(ym, day, coef, wsID, false)
        toast.success(n > 0 ? `Đã chấm ${n} người ngày ${day}` : `Ngày ${day} đã đủ`)
      })
    } catch { toast.error('Lỗi chấm công theo ngày') }
  }, [ym, recordFromKeys])

  const onFillSundays = useCallback(async (coef: number, wsID: number | null, overwrite: boolean) => {
    const current = matrixRef.current
    const sundays = listSundays(ym)
    const keys: BulkCells = current
      ? current.rows.flatMap((r) => sundays.map((d) => ({ userId: r.userId, day: d })))
      : []
    try {
      await recordFromKeys(keys, async () => {
        const n = await FillSundaysForAllUsers(ym, coef, wsID, overwrite)
        toast.success(n > 0 ? `Đã chấm ${n} Chủ nhật` : 'Không có ô nào thay đổi')
      })
    } catch (e: any) {
      toast.error(String(e?.message ?? e ?? 'Lỗi chấm Chủ nhật'))
    }
  }, [ym, recordFromKeys])

  const onCopyDayConfirm = useCallback(async (srcDay: number, dstDay: number, overwrite: boolean) => {
    const current = matrixRef.current
    const keys: BulkCells = current ? current.rows.map((r) => ({ userId: r.userId, day: dstDay })) : []
    try {
      await recordFromKeys(keys, async () => {
        const n = await CopyDayForAll(ym, srcDay, dstDay, overwrite)
        toast.success(n > 0 ? `Đã sao chép ${n} ô → ngày ${dstDay}` : 'Không có ô nào được sao chép')
      })
    } catch (e: any) {
      toast.error(String(e?.message ?? e ?? 'Lỗi sao chép'))
    }
  }, [ym, recordFromKeys])

  const onCopyPrev = useCallback(async (day: number) => {
    if (day <= 1) return
    const current = matrixRef.current
    const keys: BulkCells = current ? current.rows.map((r) => ({ userId: r.userId, day })) : []
    try {
      await recordFromKeys(keys, async () => {
        const n = await CopyDayForAll(ym, day - 1, day, false)
        toast.success(n > 0 ? `Đã lặp ngày ${day - 1} → ${day} (${n} ô)` : `Ngày ${day - 1} trống`)
      })
    } catch (e: any) {
      toast.error(String(e?.message ?? e ?? 'Lỗi lặp ngày'))
    }
  }, [ym, recordFromKeys])

  const onDayNoteSave = useCallback(async (day: number, note: string) => {
    try {
      await UpsertDayNote(ym, day, note)
      await reload()
    } catch { toast.error('Lỗi lưu ghi chú') }
  }, [ym, reload])

  const runUndo = useCallback(async (entry: { ym: string; before: CellSnap[] }) => {
    await applySnapshot(entry.ym, entry.before)
    await reload()
  }, [reload])

  const runRedo = useCallback(async (entry: { ym: string; after: CellSnap[] }) => {
    await applySnapshot(entry.ym, entry.after)
    await reload()
  }, [reload])

  return {
    onCellSave, onBulkAssign, onBulkCoef, onBulkDelete,
    onFillRange, onPasteGrid, onFillDay, onFillSundays, onCopyDayConfirm, onCopyPrev, onDayNoteSave,
    runUndo, runRedo,
  }
}
