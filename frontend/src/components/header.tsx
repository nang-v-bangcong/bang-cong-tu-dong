import { useState } from 'react'
import { toast } from 'sonner'
import { HardHat, Building2, Download, Upload, History } from 'lucide-react'
import { useAppStore } from '../stores/app-store'
import { ThemeToggle } from './theme-toggle'
import { MonthPicker } from './month-picker'
import { WorksiteManager } from './worksite-manager'
import { AuditLogDialog } from './audit-log'
import { BackupDB, RestoreDB } from '../../wailsjs/go/main/App'

export function Header() {
  const { tab, setTab } = useAppStore()
  const [showWorksites, setShowWorksites] = useState(false)
  const [showAudit, setShowAudit] = useState(false)

  const handleBackup = async () => {
    try { const p = await BackupDB(); toast.success(`Đã sao lưu: ${p}`) }
    catch { toast.error('Huỷ sao lưu') }
  }

  const handleRestore = async () => {
    try {
      await RestoreDB()
      toast.success('Đã khôi phục! Đang tải lại...')
      setTimeout(() => window.location.reload(), 500)
    } catch { toast.error('Huỷ khôi phục') }
  }

  const tabCls = (active: boolean) =>
    `px-3.5 py-1.5 text-xs font-semibold transition-all ${
      active
        ? 'text-white'
        : 'hover:bg-[var(--bg-hover)]'
    }`

  const iconBtn = 'p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] transition-colors'

  return (
    <header
      className="flex items-center gap-3 px-3 py-1.5"
      style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}
    >
      <HardHat size={20} className="flex-shrink-0" style={{ color: 'var(--primary)' }} />

      <nav className="flex gap-0.5 p-0.5" style={{ background: 'var(--bg-muted)', borderRadius: 'var(--radius)' }}>
        <button onClick={() => setTab('personal')} className={tabCls(tab === 'personal')}
          style={tab === 'personal' ? { background: 'var(--primary)', borderRadius: 'var(--radius-sm)' } : { borderRadius: 'var(--radius-sm)' }}>
          Cá nhân
        </button>
        <button onClick={() => setTab('team')} className={tabCls(tab === 'team')}
          style={tab === 'team' ? { background: 'var(--primary)', borderRadius: 'var(--radius-sm)' } : { borderRadius: 'var(--radius-sm)' }}>
          Nhóm
        </button>
      </nav>

      <div className="flex-1" />
      <MonthPicker />
      <div className="flex-1" />

      <div className="flex items-center gap-0.5">
        <button onClick={() => setShowAudit(true)} className={iconBtn} title="Lịch sử thay đổi">
          <History size={16} />
        </button>
        <button onClick={() => setShowWorksites(true)} className={iconBtn} title="Quản lý nơi làm việc">
          <Building2 size={16} />
        </button>
        <button onClick={handleBackup} className={iconBtn} title="Sao lưu dữ liệu">
          <Download size={16} />
        </button>
        <button onClick={handleRestore} className={iconBtn} title="Khôi phục dữ liệu">
          <Upload size={16} />
        </button>
        <ThemeToggle />
      </div>

      <WorksiteManager open={showWorksites} onClose={() => setShowWorksites(false)} />
      <AuditLogDialog open={showAudit} onClose={() => setShowAudit(false)} />
    </header>
  )
}
