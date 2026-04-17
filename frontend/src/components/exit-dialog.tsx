import { useEffect, useState } from 'react'
import { LogOut, Save, X } from 'lucide-react'
import { EventsOn, EventsOff } from '../../wailsjs/runtime/runtime'
import { Quit } from '../../wailsjs/go/main/App'
import { useAppStore } from '../stores/app-store'

export function ExitDialog() {
  const [open, setOpen] = useState(false)
  const dirty = useAppStore((s) => s.dirty)
  const setDirty = useAppStore((s) => s.setDirty)

  useEffect(() => {
    EventsOn('app:quit-request', () => setOpen(true))
    return () => EventsOff('app:quit-request')
  }, [])

  if (!open) return null

  const close = () => setOpen(false)

  const handleSave = () => {
    // Blur active element để kích hoạt onBlur save ở các ô input.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    // TODO: refactor onBlur save chain to expose a promise so we can await it
    // instead of this optimistic delay. 500ms is a safe upper bound for local
    // SQLite writes + Wails IPC round-trip on slower machines.
    setTimeout(() => { setDirty(false); Quit() }, 500)
  }

  const handleDiscard = () => Quit()

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[60]"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="w-[400px] p-6"
        style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center gap-3 mb-3">
          <LogOut size={20} style={{ color: 'var(--primary)' }} />
          <h2 className="text-lg font-bold">Thoát ứng dụng</h2>
        </div>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
          {dirty
            ? 'Bạn có thay đổi chưa lưu. Chọn hành động:'
            : 'Bạn có chắc muốn thoát ứng dụng?'}
        </p>
        <div className="flex flex-col gap-2">
          {dirty && (
            <button onClick={handleSave}
              className="flex items-center justify-center gap-2 py-2.5 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              style={{ background: 'var(--primary)', borderRadius: 'var(--radius)' }}>
              <Save size={14} /> Lưu và thoát
            </button>
          )}
          <button onClick={handleDiscard}
            className="flex items-center justify-center gap-2 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{ background: dirty ? 'var(--danger)' : 'var(--primary)', color: '#fff', borderRadius: 'var(--radius)' }}>
            <LogOut size={14} /> {dirty ? 'Thoát không lưu' : 'Thoát'}
          </button>
          <button onClick={close}
            className="flex items-center justify-center gap-2 py-2.5 text-sm hover:bg-[var(--bg-hover)] transition-colors"
            style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            <X size={14} /> Huỷ
          </button>
        </div>
      </div>
    </div>
  )
}
