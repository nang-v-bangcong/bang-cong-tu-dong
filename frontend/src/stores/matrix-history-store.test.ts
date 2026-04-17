import { describe, it, expect, beforeEach } from 'vitest'
import { useHistoryStore, type HistoryEntry, type CellSnap } from './matrix-history-store'

const mkSnap = (u: number, d: number, coef: number | null): CellSnap => ({
  userId: u, day: d,
  state: coef === null ? null : { coef, wsID: null, note: '' },
})

const mkEntry = (u: number, d: number, beforeCoef: number | null, afterCoef: number | null, ts = Date.now()): HistoryEntry => ({
  ym: '2026-04',
  before: [mkSnap(u, d, beforeCoef)],
  after: [mkSnap(u, d, afterCoef)],
  ts,
})

describe('matrix history store', () => {
  beforeEach(() => {
    useHistoryStore.getState().clear()
  })

  it('starts empty', () => {
    const s = useHistoryStore.getState()
    expect(s.past).toEqual([])
    expect(s.future).toEqual([])
    expect(s.popUndo()).toBeNull()
    expect(s.popRedo()).toBeNull()
  })

  it('push appends to past, clears future', () => {
    useHistoryStore.getState().push(mkEntry(1, 1, null, 1))
    useHistoryStore.getState().popUndo()
    expect(useHistoryStore.getState().future.length).toBe(1)
    useHistoryStore.getState().push(mkEntry(1, 2, null, 1))
    expect(useHistoryStore.getState().future.length).toBe(0)
    expect(useHistoryStore.getState().past.length).toBe(1)
  })

  it('popUndo moves past → future and returns entry', () => {
    const e = mkEntry(1, 1, null, 1.5)
    useHistoryStore.getState().push(e)
    const got = useHistoryStore.getState().popUndo()
    expect(got).toEqual(e)
    expect(useHistoryStore.getState().past.length).toBe(0)
    expect(useHistoryStore.getState().future.length).toBe(1)
  })

  it('popRedo moves future → past', () => {
    const e = mkEntry(1, 1, null, 1.5)
    useHistoryStore.getState().push(e)
    useHistoryStore.getState().popUndo()
    const got = useHistoryStore.getState().popRedo()
    expect(got).toEqual(e)
    expect(useHistoryStore.getState().past.length).toBe(1)
    expect(useHistoryStore.getState().future.length).toBe(0)
  })

  it('merges same-cell chained edits within 1 second', () => {
    const t = 10000
    // Edit 1: null → 1 (coef 1)
    useHistoryStore.getState().push({ ym: '2026-04', before: [mkSnap(1, 1, null)], after: [mkSnap(1, 1, 1)], ts: t })
    // Edit 2 chain: before must equal prior after (coef 1 → coef 2)
    useHistoryStore.getState().push({ ym: '2026-04', before: [mkSnap(1, 1, 1)], after: [mkSnap(1, 1, 2)], ts: t + 500 })
    const s = useHistoryStore.getState()
    expect(s.past.length).toBe(1)
    expect(s.past[0].before[0].state?.coef).toBeUndefined() // original before was null
    expect(s.past[0].after[0].state?.coef).toBe(2) // latest after
    expect(s.past[0].ts).toBe(t + 500)
  })

  it('merges any same-cell edits within time window regardless of state value', () => {
    // sameCell checks positions only — rapid edits on same cell always merge.
    const t = 10000
    useHistoryStore.getState().push({ ym: '2026-04', before: [mkSnap(1, 1, null)], after: [mkSnap(1, 1, 1)], ts: t })
    useHistoryStore.getState().push({ ym: '2026-04', before: [mkSnap(1, 1, null)], after: [mkSnap(1, 1, 2)], ts: t + 500 })
    expect(useHistoryStore.getState().past.length).toBe(1)
    expect(useHistoryStore.getState().past[0].after[0].state?.coef).toBe(2)
  })

  it('does not merge different cells', () => {
    const t = 10000
    useHistoryStore.getState().push(mkEntry(1, 1, null, 1, t))
    useHistoryStore.getState().push(mkEntry(1, 2, null, 1, t + 500))
    expect(useHistoryStore.getState().past.length).toBe(2)
  })

  it('does not merge beyond 1 second window', () => {
    const t = 10000
    useHistoryStore.getState().push(mkEntry(1, 1, null, 1, t))
    useHistoryStore.getState().push(mkEntry(1, 1, null, 2, t + 2000))
    expect(useHistoryStore.getState().past.length).toBe(2)
  })

  it('caps past at 50 entries', () => {
    for (let i = 0; i < 55; i++) {
      useHistoryStore.getState().push(mkEntry(1, (i % 30) + 1, null, 1, i * 2000))
    }
    expect(useHistoryStore.getState().past.length).toBe(50)
  })

  it('clear wipes both stacks', () => {
    useHistoryStore.getState().push(mkEntry(1, 1, null, 1))
    useHistoryStore.getState().popUndo()
    useHistoryStore.getState().push(mkEntry(1, 2, null, 1))
    useHistoryStore.getState().clear()
    expect(useHistoryStore.getState().past).toEqual([])
    expect(useHistoryStore.getState().future).toEqual([])
  })

  it('multi-cell entries never merge', () => {
    const t = 10000
    const multiEntry: HistoryEntry = {
      ym: '2026-04',
      before: [mkSnap(1, 1, null), mkSnap(1, 2, null)],
      after: [mkSnap(1, 1, 1), mkSnap(1, 2, 1)],
      ts: t,
    }
    useHistoryStore.getState().push(multiEntry)
    useHistoryStore.getState().push({ ...multiEntry, ts: t + 100 })
    expect(useHistoryStore.getState().past.length).toBe(2)
  })
})
