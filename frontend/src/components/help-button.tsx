import { useEffect, useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { useAppStore } from '../stores/app-store'
import { HelpDialog } from './help-dialog'

export function HelpButton() {
  const tab = useAppStore((s) => s.tab)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F1') { e.preventDefault(); setOpen(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Hướng dẫn (F1)"
        className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] transition-colors"
      >
        <HelpCircle size={16} />
      </button>
      {open && <HelpDialog tab={tab} onClose={() => setOpen(false)} />}
    </>
  )
}
