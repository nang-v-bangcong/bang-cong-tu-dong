import { useEffect } from 'react'
import { X, Printer } from 'lucide-react'
import { HelpContentPersonal } from './help-content/personal'
import { HelpContentTeam } from './help-content/team'
import { HelpContentMatrix } from './help-content/matrix'

interface Props {
  tab: 'personal' | 'team' | 'matrix'
  onClose: () => void
}

const TITLES: Record<Props['tab'], string> = {
  personal: 'Tab Cá nhân',
  team: 'Tab Nhóm',
  matrix: 'Tab Bảng tổng',
}

export function HelpDialog({ tab, onClose }: Props) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [onClose])

  const Content = {
    personal: HelpContentPersonal,
    team: HelpContentTeam,
    matrix: HelpContentMatrix,
  }[tab]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 print:p-0 print:static"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="help-dialog max-w-3xl w-full max-h-[90vh] overflow-auto print:max-w-full print:max-h-full print:shadow-none"
        style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}
      >
        <header
          className="flex items-center justify-between p-4 border-b sticky top-0 print:hidden"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
        >
          <h2 className="font-semibold text-base">Hướng dẫn — {TITLES[tab]}</h2>
          <div className="flex gap-2">
            <button onClick={() => window.print()} title="In (Ctrl+P)"
              className="p-1.5 hover:bg-[var(--bg-hover)]" style={{ borderRadius: 'var(--radius-sm)' }}>
              <Printer size={16} />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-[var(--bg-hover)]" style={{ borderRadius: 'var(--radius-sm)' }}>
              <X size={16} />
            </button>
          </div>
        </header>
        <div className="p-6 help-content">
          <Content />
        </div>
      </div>
    </div>
  )
}
