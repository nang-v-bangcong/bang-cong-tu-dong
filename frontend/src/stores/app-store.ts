import { create } from 'zustand'

type Tab = 'personal' | 'team'

interface AppState {
  tab: Tab
  yearMonth: string
  darkMode: boolean
  dirty: boolean
  setTab: (tab: Tab) => void
  setYearMonth: (ym: string) => void
  toggleDarkMode: () => void
  setDirty: (dirty: boolean) => void
}

const now = new Date()
const defaultYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

export const useAppStore = create<AppState>((set) => ({
  tab: 'personal',
  yearMonth: defaultYearMonth,
  darkMode: localStorage.getItem('darkMode') === 'true',
  dirty: false,
  setTab: (tab) => set({ tab }),
  setYearMonth: (yearMonth) => set({ yearMonth }),
  toggleDarkMode: () =>
    set((state) => {
      const next = !state.darkMode
      localStorage.setItem('darkMode', String(next))
      return { darkMode: next }
    }),
  setDirty: (dirty) => set({ dirty }),
}))
