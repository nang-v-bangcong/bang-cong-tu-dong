import { useEffect, useCallback, Component, type ReactNode } from 'react'
import { Toaster, toast } from 'sonner'
import { Save } from 'lucide-react'
import { useAppStore } from './stores/app-store'
import { Header } from './components/header'
import { PersonalPage } from './pages/personal'
import { TeamPage } from './pages/team'
import { MatrixPage } from './pages/matrix'
import { ExitDialog } from './components/exit-dialog'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null }
  static getDerivedStateFromError(e: Error) { return { error: e.message } }
  render() {
    if (this.state.error) return (
      <div className="p-8 text-center">
        <p className="text-red-500 mb-2">Lỗi: {this.state.error}</p>
        <button onClick={() => this.setState({ error: null })} className="px-4 py-2 bg-blue-600 text-white rounded">Thử lại</button>
      </div>
    )
    return this.props.children
  }
}

function App() {
  const { tab, darkMode, dirty, setDirty } = useAppStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  const handleSave = useCallback(() => {
    // Blur active element to trigger onBlur save handlers
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    // Wait for blur handlers to complete before clearing dirty
    setTimeout(() => { setDirty(false); toast.success('Đã lưu!') }, 100)
  }, [setDirty])

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (useAppStore.getState().dirty) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  useEffect(() => {
    // Block WebView2's default Ctrl+wheel zoom at the document level.
    // ZoomableArea stops propagation so its container still receives the event.
    const globalWheel = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault()
    }
    const blockKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && ['=', '-', '+', '0'].includes(e.key)) e.preventDefault()
    }
    document.addEventListener('wheel', globalWheel, { passive: false })
    window.addEventListener('keydown', blockKey)
    return () => {
      document.removeEventListener('wheel', globalWheel)
      window.removeEventListener('keydown', blockKey)
    }
  }, [])

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <Header />
        <main className="flex-1 overflow-auto">
          {tab === 'personal' ? <PersonalPage /> : tab === 'team' ? <TeamPage /> : <MatrixPage />}
        </main>
        {dirty && (
          <div className="fixed bottom-4 right-4 z-40">
            <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-medium" style={{ background: 'var(--success)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
              <Save size={16} /> Lưu dữ liệu
            </button>
          </div>
        )}
        <Toaster richColors position="bottom-right" />
        <ExitDialog />
      </div>
    </ErrorBoundary>
  )
}

export default App
