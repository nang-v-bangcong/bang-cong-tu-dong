import { create } from 'zustand'

export type TabKey = 'release' | 'announcement' | 'bugs'

type AdminState = {
  activeTab: TabKey
  setupOpen: boolean
  credsLoaded: boolean
  repo: string
  bugCount: number
  setActiveTab: (tab: TabKey) => void
  setSetupOpen: (open: boolean) => void
  setCredsLoaded: (loaded: boolean, repo?: string) => void
  setBugCount: (n: number) => void
}

export const useAdminStore = create<AdminState>((set) => ({
  activeTab: 'release',
  setupOpen: false,
  credsLoaded: false,
  repo: '',
  bugCount: 0,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSetupOpen: (open) => set({ setupOpen: open }),
  setCredsLoaded: (loaded, repo = '') => set({ credsLoaded: loaded, repo }),
  setBugCount: (n) => set({ bugCount: n }),
}))
