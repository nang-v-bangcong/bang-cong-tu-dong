import { useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { dateOf } from './matrix-utils'
import { snapshotCells, applySnapshot } from './matrix-history'
import { useHistoryStore, type CellSnap } from '../stores/matrix-history-store'
import { type models, type services } from '../../wailsjs/go/models'
import {
  UpsertAttendance, UpsertDayNote,
  BulkUpsertWorksite, BulkUpsertCell, BulkUpsertCells, BulkDeleteAttendance,
  FillDayForAllUsers, CopyDayForAll,
} from '../../wailsjs/go/main/App'

export type BulkCells = Array<{ userId: number; day: number }>

interface Opts {
  yearMonth: string
  matrix: models.TeamMatrix | null
  reload: () => Promise<models.TeamMatrix | null>
}

export function useMatrixMutations({ yearMonth, matrix, reload }: Opts) {
  const matrixRef = useRef(matrix)
  matrixRef.current = matrix
  const push = useHistoryStore((s) => s.push)

  const ym = yearMonth

  const record = useCallback(async (keys: BulkCells, mutate: () => Promise<void>) => {
    const snapBefore = matrixRef.current ? snapshotCells(matrixRef.current, keys) : []
    await mutate()
    const fresh = await reload()
    const snapAfter = fresh ? snapshotCells(fresh, keys) : snapBefore.map((s) => ({ ...s, state: null }))
    push({ ym, before: snapBefore, after: snapAfter, ts: Date.now() })
  }, [ym, reload, push])

  const recordFromKeys = useCallback(async (
    beforeKeys: BulkCells,
    mutate: () => Promise<void>,
    afterKeys?: BulkCells,
  ) => {
    const snapBefore = matrixRef.current ? snapshotCells(matrixRef.current, beforeKeys) : []
    await mutate()
    const fresh = await reload()
    const keysToCapture = afterKeys ?? beforeKeys
    const snapAfter = fresh ? snapshotCells(fresh, keysToCapture) : []
    // Merge both key sets so undo/redo covers all affected cells
    const union = new Map<string, CellSnap>()
    const latestAfter = fresh ? snapshotCells(fresh, beforeKeys) : snapBefore.map((s) => ({ ...s, state: null }))
    for (const s of snapBefore) union.set(`${s.userId}:${s.day}`, s)
    for (const s of latestAfter) union.set(`${s.userId}:${s.day}`, { ...s })
    push({ ym, before: snapBefore, after: Array.from(union.values()).map((s) => {
      const a = snapAfter.find((x) => x.userId === s.userId && x.day === s.day)
      return a ?? s
    }), ts: Date.now() })
  }, [ym, reload, push])

  const toRefs = useCallback((cells: BulkCells): models.CellRef[] =>
    cells.map((c) => ({ userId: c.userId, date: dateOf(ym, c.day) } as models.CellRef)),
  [ym])

  const onCellSave = useCallback(async (userId: number, day: number, coef: number, wsID: number | null) => {
    try {
      await record([{ userId, day }], async () => {
        await UpsertAttendance(userId, dateOf(ym, day), coef, wsID, '')
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

  const onFillRange = useCallback(async (cells: BulkCells, coef: number) => {
    if (cells.length === 0) return
    try {
      await record(cells, async () => {
        await BulkUpsertCell(toRefs(cells), coef, null)
      })
      toast.success(`Đã điền ${cells.length} ô`)
    } catch { toast.error('Lỗi điền dải') }
  }, [record, toRefs])

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
    onFillRange, onPasteGrid, onFillDay, onCopyDayConfirm, onCopyPrev, onDayNoteSave,
    runUndo, runRedo,
  }
}
