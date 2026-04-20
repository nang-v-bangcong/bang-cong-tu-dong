import { useEffect } from 'react'
import { Toaster } from 'sonner'
import { useAdminStore } from './stores/admin-store'
import { GetCredentials } from '../wailsjs/go/main/App'
import { Sidebar } from './components/sidebar'
import { SetupModal } from './components/setup-modal'
import { ReleasePage } from './pages/release-page'
import { AnnouncementPage } from './pages/announcement-page'
import { BugsPage } from './pages/bugs-page'

function App() {
  const { activeTab, setupOpen, setSetupOpen, credsLoaded, setCredsLoaded } =
    useAdminStore()

  useEffect(() => {
    GetCredentials()
      .then((c) => {
        if (c?.token && c?.repo) {
          setCredsLoaded(true, c.repo)
        } else {
          setSetupOpen(true)
        }
      })
      .catch(() => setSetupOpen(true))
  }, [setCredsLoaded, setSetupOpen])

  return (
    <div className="flex h-screen w-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto" style={{ background: 'var(--bg)' }}>
        {credsLoaded && activeTab === 'release' && <ReleasePage />}
        {credsLoaded && activeTab === 'announcement' && <AnnouncementPage />}
        {credsLoaded && activeTab === 'bugs' && <BugsPage />}
      </main>
      {setupOpen && <SetupModal />}
      <Toaster richColors position="bottom-right" />
    </div>
  )
}

export default App
