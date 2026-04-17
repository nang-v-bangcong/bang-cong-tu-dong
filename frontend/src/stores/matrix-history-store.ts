import { create } from 'zustand'

// Per-cell snapshot: null = no attendance record at that cell.
export type CellSnap = {
  userId: number
  day: number
  state: { coef: number; wsID: number | null } | null
}

export type HistoryEntry = {
  ym: string
  before: CellSnap[]
  after: CellSnap[]
  ts: number
}

interface HistoryState {
  past: HistoryEntry[]
  future: HistoryEntry[]
  push: (e: HistoryEntry) => void
  popUndo: () => HistoryEntry | null
  popRedo: () => HistoryEntry | null
  clear: () => void
}

const MAX = 50
const MERGE_MS = 1000

const sameCell = (a: CellSnap[], b: CellSnap[]) =>
  a.length === 1 && b.length === 1 &&
  a[0].userId === b[0].userId && a[0].day === b[0].day

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  push: (e) => set((s) => {
    const top = s.past[s.past.length - 1]
    let past = s.past
    // Merge rapid re-edits to the same single cell (keeps undo chunks sane).
    if (top && e.ts - top.ts < MERGE_MS && sameCell(top.after, e.before)) {
      past = [...s.past.slice(0, -1), { ...top, after: e.after, ts: e.ts }]
    } else {
      past = [...s.past, e]
      if (past.length > MAX) past = past.slice(past.length - MAX)
    }
    return { past, future: [] }
  }),
  popUndo: () => {
    const { past, future } = get()
    if (past.length === 0) return null
    const e = past[past.length - 1]
    set({ past: past.slice(0, -1), future: [...future, e] })
    return e
  },
  popRedo: () => {
    const { past, future } = get()
    if (future.length === 0) return null
    const e = future[future.length - 1]
    set({ past: [...past, e], future: future.slice(0, -1) })
    return e
  },
  clear: () => set({ past: [], future: [] }),
}))
