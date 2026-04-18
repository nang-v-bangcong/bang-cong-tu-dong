import { useCallback, type MutableRefObject } from 'react'
import { snapshotCells } from './matrix-history'
import { useHistoryStore, type CellSnap } from '../stores/history-store'
import { type models } from '../../wailsjs/go/models'

export type BulkCells = Array<{ userId: number; day: number }>

interface Opts {
  yearMonth: string
  matrixRef: MutableRefObject<models.TeamMatrix | null>
  reload: () => Promise<models.TeamMatrix | null>
}

// Wraps a mutation with before/after snapshots so undo/redo can restore cell state.
export function useMatrixHistoryRecorder({ yearMonth, matrixRef, reload }: Opts) {
  const push = useHistoryStore((s) => s.push)
  const ym = yearMonth

  const record = useCallback(async (keys: BulkCells, mutate: () => Promise<void>) => {
    const snapBefore = matrixRef.current ? snapshotCells(matrixRef.current, keys) : []
    await mutate()
    const fresh = await reload()
    const snapAfter = fresh ? snapshotCells(fresh, keys) : snapBefore.map((s) => ({ ...s, state: null }))
    push('matrix', { ym, before: snapBefore, after: snapAfter, ts: Date.now() })
  }, [ym, reload, push, matrixRef])

  // Same as record(), but separates the "before" and "after" key sets so undo/redo
  // covers all cells touched by a cross-day mutation (e.g. copy src→dst day).
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
    const union = new Map<string, CellSnap>()
    const latestAfter = fresh ? snapshotCells(fresh, beforeKeys) : snapBefore.map((s) => ({ ...s, state: null }))
    for (const s of snapBefore) union.set(`${s.userId}:${s.day}`, s)
    for (const s of latestAfter) union.set(`${s.userId}:${s.day}`, { ...s })
    push('matrix', { ym, before: snapBefore, after: Array.from(union.values()).map((s) => {
      const a = snapAfter.find((x) => x.userId === s.userId && x.day === s.day)
      return a ?? s
    }), ts: Date.now() })
  }, [ym, reload, push, matrixRef])

  return { record, recordFromKeys }
}
