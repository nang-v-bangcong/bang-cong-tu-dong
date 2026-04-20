import { useState } from 'react'
import { toast } from 'sonner'
import { ValidateCredentials, SaveCredentials } from '../../wailsjs/go/main/App'
import { useAdminStore } from '../stores/admin-store'

const REPO_REGEX = /^[\w.-]+\/[\w.-]+$/

export function SetupModal() {
  const { setSetupOpen, setCredsLoaded } = useAdminStore()
  const [token, setToken] = useState('')
  const [repo, setRepo] = useState('nang-v-bangcong/bang-cong-tu-dong')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim()) {
      toast.error('Nhập Personal Access Token')
      return
    }
    if (!REPO_REGEX.test(repo.trim())) {
      toast.error('Repo sai định dạng (owner/name)')
      return
    }
    setBusy(true)
    try {
      const creds = { token: token.trim(), repo: repo.trim() }
      await ValidateCredentials(creds)
      await SaveCredentials(creds)
      setCredsLoaded(true, creds.repo)
      setSetupOpen(false)
      toast.success('Đã kết nối GitHub')
    } catch (e: any) {
      const msg = String(e?.message ?? e)
      if (msg.includes('401')) toast.error('Token sai hoặc hết hạn (401)')
      else if (msg.includes('404')) toast.error('Repo không tồn tại hoặc không có quyền (404)')
      else toast.error('Kết nối thất bại: ' + msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md p-6 rounded-lg"
        style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)' }}
      >
        <h2 className="text-lg font-semibold mb-1">Thiết lập lần đầu</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Nhập GitHub PAT + repo để admin có thể quản lý thông báo / bản mới / báo lỗi.
        </p>

        <label className="block mb-3">
          <span className="text-sm font-medium">Personal Access Token</span>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="github_pat_..."
            className="mt-1 w-full px-3 py-2 rounded border text-sm"
            style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
            autoFocus
          />
        </label>

        <label className="block mb-4">
          <span className="text-sm font-medium">Repo (owner/name)</span>
          <input
            type="text"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded border text-sm font-mono"
            style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="w-full py-2 rounded font-medium text-sm"
          style={{
            background: busy ? 'var(--bg-muted)' : 'var(--primary)',
            color: busy ? 'var(--text-muted)' : '#fff',
          }}
        >
          {busy ? 'Đang kiểm tra...' : 'Lưu & Kết nối'}
        </button>
      </form>
    </div>
  )
}
