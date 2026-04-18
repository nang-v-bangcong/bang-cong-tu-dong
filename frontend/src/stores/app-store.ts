import { create } from 'zustand'

type Tab = 'personal' | 'team' | 'matrix'

interface AppState {
  tab: Tab
  yearMonth: string
  darkMode: boolean
  dirty: boolean
  refreshTrigger: number
  matrixSearch: string
  matrixSortBy: 'name' | 'days' | 'salary'
  matrixSortDir: 'asc' | 'desc'
  matrixCellColor: boolean
  paintMode: boolean
  paintCoef: number
  paintWsId: number | null
  setTab: (tab: Tab) => void
  setYearMonth: (ym: string) => void
  toggleDarkMode: () => void
  setDirty: (dirty: boolean) => void
  triggerRefresh: () => void
  setMatrixSearch: (q: string) => void
  setMatrixSort: (by: 'name' | 'days' | 'salary', dir: 'asc' | 'desc') => void
  toggleMatrixCellColor: () => void
  setPaintMode: (on: boolean) => void
  setPaintPreset: (coef: number, wsId: number | null) => void
}

// Compute yearMonth in KST so month boundaries match the backend (time.go)
// regardless of the OS timezone.
const kstParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
}).formatToParts(new Date())
const defaultYearMonth = `${kstParts.find((p) => p.type === 'year')?.value ?? '2026'}-${
  kstParts.find((p) => p.type === 'month')?.value ?? '01'
}`

export const useAppStore = create<AppState>((set) => ({
  tab: 'personal',
  yearMonth: defaultYearMonth,
  darkMode: localStorage.getItem('darkMode') === 'true',
  dirty: false,
  refreshTrigger: 0,
  matrixSearch: '',
  matrixSortBy: 'name',
  matrixSortDir: 'asc',
  matrixCellColor: localStorage.getItem('matrix-cell-color') === 'true',
  paintMode: false,
  paintCoef: 1,
  paintWsId: null,
  setTab: (tab) => set({ tab }),
  setYearMonth: (yearMonth) => set({ yearMonth }),
  toggleDarkMode: () =>
    set((state) => {
      const next = !state.darkMode
      localStorage.setItem('darkMode', String(next))
      return { darkMode: next }
    }),
  setDirty: (dirty) => set({ dirty }),
  triggerRefresh: () => set((s) => ({ refreshTrigger: s.refreshTrigger + 1 })),
  setMatrixSearch: (matrixSearch) => set({ matrixSearch }),
  setMatrixSort: (matrixSortBy, matrixSortDir) => set({ matrixSortBy, matrixSortDir }),
  toggleMatrixCellColor: () =>
    set((state) => {
      const next = !state.matrixCellColor
      localStorage.setItem('matrix-cell-color', String(next))
      return { matrixCellColor: next }
    }),
  setPaintMode: (paintMode) => set({ paintMode }),
  setPaintPreset: (paintCoef, paintWsId) => set({ paintCoef, paintWsId }),
}))
