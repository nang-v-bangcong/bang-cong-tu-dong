import { create } from 'zustand'

// Per-cell snapshot: null = no attendance record at that cell.
export type CellSnap = {
  userId: number
  day: number
  state: { coef: number; wsID: number | null; note: string } | null
}

export type HistoryEntry = {
  ym: string
  before: CellSnap[]
  after: CellSnap[]
  ts: number
}

export type Context = 'matrix' | 'team'

type Stack = { past: HistoryEntry[]; future: HistoryEntry[] }

interface HistoryState {
  stacks: Record<Context, Stack>
  push: (ctx: Context, e: HistoryEntry) => void
  popUndo: (ctx: Context) => HistoryEntry | null
  popRedo: (ctx: Context) => HistoryEntry | null
  clear: (ctx: Context) => void
  counts: (ctx: Context) => { undo: number; redo: number }
}

const MAX = 50
const MERGE_MS = 1000

const sameCell = (a: CellSnap[], b: CellSnap[]) =>
  a.length === 1 && b.length === 1 &&
  a[0].userId === b[0].userId && a[0].day === b[0].day

const emptyStack = (): Stack => ({ past: [], future: [] })

export const useHistoryStore = create<HistoryState>((set, get) => ({
  stacks: { matrix: emptyStack(), team: emptyStack() },
  push: (ctx, e) => set((s) => {
    const cur = s.stacks[ctx]
    const top = cur.past[cur.past.length - 1]
    let past = cur.past
    // Merge rapid re-edits to the same single cell (keeps undo chunks sane).
    if (top && top.ym === e.ym && e.ts - top.ts < MERGE_MS && sameCell(top.after, e.before)) {
      past = [...cur.past.slice(0, -1), { ...top, after: e.after, ts: e.ts }]
    } else {
      past = [...cur.past, e]
      if (past.length > MAX) past = past.slice(past.length - MAX)
    }
    return { stacks: { ...s.stacks, [ctx]: { past, future: [] } } }
  }),
  popUndo: (ctx) => {
    const cur = get().stacks[ctx]
    if (cur.past.length === 0) return null
    const e = cur.past[cur.past.length - 1]
    set((s) => ({
      stacks: { ...s.stacks, [ctx]: { past: cur.past.slice(0, -1), future: [...cur.future, e] } },
    }))
    return e
  },
  popRedo: (ctx) => {
    const cur = get().stacks[ctx]
    if (cur.future.length === 0) return null
    const e = cur.future[cur.future.length - 1]
    set((s) => ({
      stacks: { ...s.stacks, [ctx]: { past: [...cur.past, e], future: cur.future.slice(0, -1) } },
    }))
    return e
  },
  clear: (ctx) => set((s) => ({ stacks: { ...s.stacks, [ctx]: emptyStack() } })),
  counts: (ctx) => {
    const cur = get().stacks[ctx]
    return { undo: cur.past.length, redo: cur.future.length }
  },
}))
