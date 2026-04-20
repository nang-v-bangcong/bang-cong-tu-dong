import { Rocket, Megaphone, Bug, Settings } from 'lucide-react'
import { useAdminStore, type TabKey } from '../stores/admin-store'
import { DeleteCredentials } from '../../wailsjs/go/main/App'
import { toast } from 'sonner'

const tabs: Array<{ key: TabKey; label: string; Icon: typeof Rocket }> = [
  { key: 'release', label: 'Bản mới', Icon: Rocket },
  { key: 'announcement', label: 'Thông báo', Icon: Megaphone },
  { key: 'bugs', label: 'Báo lỗi', Icon: Bug },
]

export function Sidebar() {
  const { activeTab, setActiveTab, setSetupOpen, setCredsLoaded, bugCount } =
    useAdminStore()

  const handleChangeToken = async () => {
    try {
      await DeleteCredentials()
      setCredsLoaded(false)
      setSetupOpen(true)
      toast.success('Đã xóa token, nhập token mới')
    } catch (e: any) {
      toast.error('Xóa token thất bại: ' + (e?.message ?? e))
    }
  }

  return (
    <aside
      className="flex flex-col border-r"
      style={{
        width: 200,
        background: 'var(--bg-card)',
        borderColor: 'var(--border)',
      }}
    >
      <div
        className="px-4 py-3 font-semibold text-sm border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        Bảng Công Admin
      </div>
      <nav className="flex-1 py-2">
        {tabs.map(({ key, label, Icon }) => {
          const active = activeTab === key
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm"
              style={{
                background: active ? 'var(--primary-soft)' : 'transparent',
                color: active ? 'var(--primary)' : 'var(--text)',
                fontWeight: active ? 600 : 400,
                borderLeft: active ? '3px solid var(--primary)' : '3px solid transparent',
              }}
            >
              <Icon size={18} />
              <span className="flex-1 text-left">{label}</span>
              {key === 'bugs' && bugCount > 0 && (
                <span
                  className="text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                  style={{
                    background: 'var(--danger)',
                    color: '#fff',
                  }}
                >
                  {bugCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>
      <button
        onClick={handleChangeToken}
        className="flex items-center gap-3 px-4 py-2.5 text-sm border-t"
        style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
      >
        <Settings size={16} />
        Đổi token
      </button>
    </aside>
  )
}
