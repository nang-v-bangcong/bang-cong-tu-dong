import { describe, it, expect, beforeEach } from 'vitest'
import { useHistoryStore, type HistoryEntry, type CellSnap, type Context } from './history-store'

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

const getStack = (ctx: Context) => useHistoryStore.getState().stacks[ctx]

describe('history store (keyed contexts)', () => {
  beforeEach(() => {
    useHistoryStore.getState().clear('matrix')
    useHistoryStore.getState().clear('team')
  })

  describe.each<Context>(['matrix', 'team'])('ctx=%s', (ctx) => {
    it('starts empty', () => {
      expect(getStack(ctx).past).toEqual([])
      expect(getStack(ctx).future).toEqual([])
      expect(useHistoryStore.getState().popUndo(ctx)).toBeNull()
      expect(useHistoryStore.getState().popRedo(ctx)).toBeNull()
    })

    it('push appends to past, clears future', () => {
      useHistoryStore.getState().push(ctx, mkEntry(1, 1, null, 1))
      useHistoryStore.getState().popUndo(ctx)
      expect(getStack(ctx).future.length).toBe(1)
      useHistoryStore.getState().push(ctx, mkEntry(1, 2, null, 1))
      expect(getStack(ctx).future.length).toBe(0)
      expect(getStack(ctx).past.length).toBe(1)
    })

    it('popUndo moves past → future and returns entry', () => {
      const e = mkEntry(1, 1, null, 1.5)
      useHistoryStore.getState().push(ctx, e)
      const got = useHistoryStore.getState().popUndo(ctx)
      expect(got).toEqual(e)
      expect(getStack(ctx).past.length).toBe(0)
      expect(getStack(ctx).future.length).toBe(1)
    })

    it('popRedo moves future → past', () => {
      const e = mkEntry(1, 1, null, 1.5)
      useHistoryStore.getState().push(ctx, e)
      useHistoryStore.getState().popUndo(ctx)
      const got = useHistoryStore.getState().popRedo(ctx)
      expect(got).toEqual(e)
      expect(getStack(ctx).past.length).toBe(1)
      expect(getStack(ctx).future.length).toBe(0)
    })

    it('merges same-cell chained edits within 1 second', () => {
      const t = 10000
      useHistoryStore.getState().push(ctx, { ym: '2026-04', before: [mkSnap(1, 1, null)], after: [mkSnap(1, 1, 1)], ts: t })
      useHistoryStore.getState().push(ctx, { ym: '2026-04', before: [mkSnap(1, 1, 1)], after: [mkSnap(1, 1, 2)], ts: t + 500 })
      const cur = getStack(ctx)
      expect(cur.past.length).toBe(1)
      expect(cur.past[0].before[0].state?.coef).toBeUndefined()
      expect(cur.past[0].after[0].state?.coef).toBe(2)
      expect(cur.past[0].ts).toBe(t + 500)
    })

    it('merges any same-cell edits within time window regardless of state value', () => {
      const t = 10000
      useHistoryStore.getState().push(ctx, { ym: '2026-04', before: [mkSnap(1, 1, null)], after: [mkSnap(1, 1, 1)], ts: t })
      useHistoryStore.getState().push(ctx, { ym: '2026-04', before: [mkSnap(1, 1, null)], after: [mkSnap(1, 1, 2)], ts: t + 500 })
      expect(getStack(ctx).past.length).toBe(1)
      expect(getStack(ctx).past[0].after[0].state?.coef).toBe(2)
    })

    it('does not merge different cells', () => {
      const t = 10000
      useHistoryStore.getState().push(ctx, mkEntry(1, 1, null, 1, t))
      useHistoryStore.getState().push(ctx, mkEntry(1, 2, null, 1, t + 500))
      expect(getStack(ctx).past.length).toBe(2)
    })

    it('does not merge beyond 1 second window', () => {
      const t = 10000
      useHistoryStore.getState().push(ctx, mkEntry(1, 1, null, 1, t))
      useHistoryStore.getState().push(ctx, mkEntry(1, 1, null, 2, t + 2000))
      expect(getStack(ctx).past.length).toBe(2)
    })

    it('caps past at 50 entries', () => {
      for (let i = 0; i < 55; i++) {
        useHistoryStore.getState().push(ctx, mkEntry(1, (i % 30) + 1, null, 1, i * 2000))
      }
      expect(getStack(ctx).past.length).toBe(50)
    })

    it('clear wipes both stacks of this context', () => {
      useHistoryStore.getState().push(ctx, mkEntry(1, 1, null, 1))
      useHistoryStore.getState().popUndo(ctx)
      useHistoryStore.getState().push(ctx, mkEntry(1, 2, null, 1))
      useHistoryStore.getState().clear(ctx)
      expect(getStack(ctx).past).toEqual([])
      expect(getStack(ctx).future).toEqual([])
    })

    it('multi-cell entries never merge', () => {
      const t = 10000
      const multiEntry: HistoryEntry = {
        ym: '2026-04',
        before: [mkSnap(1, 1, null), mkSnap(1, 2, null)],
        after: [mkSnap(1, 1, 1), mkSnap(1, 2, 1)],
        ts: t,
      }
      useHistoryStore.getState().push(ctx, multiEntry)
      useHistoryStore.getState().push(ctx, { ...multiEntry, ts: t + 100 })
      expect(getStack(ctx).past.length).toBe(2)
    })

    it('counts reports past/future lengths', () => {
      expect(useHistoryStore.getState().counts(ctx)).toEqual({ undo: 0, redo: 0 })
      useHistoryStore.getState().push(ctx, mkEntry(1, 1, null, 1))
      useHistoryStore.getState().push(ctx, mkEntry(1, 2, null, 1))
      expect(useHistoryStore.getState().counts(ctx)).toEqual({ undo: 2, redo: 0 })
      useHistoryStore.getState().popUndo(ctx)
      expect(useHistoryStore.getState().counts(ctx)).toEqual({ undo: 1, redo: 1 })
    })
  })

  it('stacks are isolated across contexts', () => {
    useHistoryStore.getState().push('matrix', mkEntry(1, 1, null, 1))
    useHistoryStore.getState().push('team', mkEntry(2, 5, null, 2))
    expect(getStack('matrix').past.length).toBe(1)
    expect(getStack('team').past.length).toBe(1)

    // popUndo on matrix must not touch team
    useHistoryStore.getState().popUndo('matrix')
    expect(getStack('matrix').past.length).toBe(0)
    expect(getStack('team').past.length).toBe(1)

    // clear team leaves matrix future intact
    useHistoryStore.getState().clear('team')
    expect(getStack('team').past.length).toBe(0)
    expect(getStack('team').future.length).toBe(0)
    expect(getStack('matrix').future.length).toBe(1)
  })
})
