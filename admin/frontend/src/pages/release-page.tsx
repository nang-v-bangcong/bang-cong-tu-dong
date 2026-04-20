import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Rocket } from 'lucide-react'
import {
  GetLatestExe,
  GetRemoteVersion,
  PublishRelease,
} from '../../wailsjs/go/main/App'
import { EventsOn, BrowserOpenURL } from '../../wailsjs/runtime/runtime'
import { ProgressBar } from '../components/progress-bar'
import { ReleaseInfoCard, fmtMB } from '../components/release-info-card'
import { useAdminStore } from '../stores/admin-store'

type ExeInfo = { path: string; name: string; size: number; modTime: string }
type VersionInfo = { version: string }

function bumpPatch(v: string) {
  const p = v.replace(/^v/, '').split('.').map((x) => Number(x) || 0)
  while (p.length < 3) p.push(0)
  p[2] += 1
  return p.slice(0, 3).join('.')
}

export function ReleasePage() {
  const { setSetupOpen, setCredsLoaded } = useAdminStore()
  const [exe, setExe] = useState<ExeInfo | null>(null)
  const [remote, setRemote] = useState<VersionInfo | null>(null)
  const [nextVer, setNextVer] = useState('')
  const [changelog, setChangelog] = useState('')
  const [err, setErr] = useState<{ exe?: string; remote?: string }>({})
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [progress, setProgress] = useState({ read: 0, total: 0 })

  const scan = async () => {
    try {
      setExe(await GetLatestExe())
      setErr((p) => ({ ...p, exe: undefined }))
    } catch (e: any) {
      setExe(null)
      setErr((p) => ({ ...p, exe: String(e?.message ?? e) }))
    }
    try {
      const r = await GetRemoteVersion()
      setRemote(r)
      setNextVer((cur) => cur || bumpPatch(r?.version ?? '0.0.0'))
      setErr((p) => ({ ...p, remote: undefined }))
    } catch (e: any) {
      setRemote(null)
      setNextVer((cur) => cur || '0.1.0')
      const msg = String(e?.message ?? e)
      if (msg.includes('unauthorized')) {
        setCredsLoaded(false); setSetupOpen(true)
      }
      setErr((p) => ({ ...p, remote: msg }))
    }
  }

  useEffect(() => {
    scan()
    const offP = EventsOn('release-upload-progress', (e: any) =>
      setProgress({ read: e.read, total: e.total }))
    const offS = EventsOn('release-status', (m: any) => setStatus(String(m)))
    const offD = EventsOn('release-done', (e: any) => {
      if (e?.htmlUrl) {
        toast.success('Đăng bản mới thành công!', {
          action: { label: 'Xem trên GitHub', onClick: () => BrowserOpenURL(e.htmlUrl) },
          duration: 10000,
        })
      } else toast.success('Đăng bản mới thành công!')
    })
    return () => { offP?.(); offS?.(); offD?.() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = async () => {
    if (!exe) { toast.error('Chưa có file .exe để đăng'); return }
    const ver = nextVer.trim().replace(/^v/, '')
    if (!/^\d+\.\d+\.\d+$/.test(ver)) { toast.error('Version sai định dạng X.Y.Z'); return }
    if (!window.confirm(`Xác nhận đăng v${ver}?\nFile: ${exe.name} (${fmtMB(exe.size)})`)) return
    setBusy(true); setStatus('Bắt đầu...'); setProgress({ read: 0, total: exe.size })
    try {
      await PublishRelease(ver, changelog)
      setStatus('Hoàn tất'); await scan()
    } catch (e: any) {
      const msg = String(e?.message ?? e)
      if (msg.includes('unauthorized')) {
        setCredsLoaded(false); setSetupOpen(true); toast.error('Token hết hạn, nhập lại')
      } else toast.error('Đăng thất bại: ' + msg)
      setStatus('Thất bại')
    } finally { setBusy(false) }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-semibold mb-1">Đăng bản mới</h2>
      <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
        Upload file .exe mới lên GitHub Releases rồi cập nhật version.json.
      </p>

      <ReleaseInfoCard
        remoteVersion={remote?.version}
        remoteErr={err.remote}
        exe={exe}
        exeErr={err.exe}
        onScan={scan}
      />

      <label className="block mb-3">
        <span className="text-sm font-medium">Version mới</span>
        <input
          value={nextVer}
          onChange={(e) => setNextVer(e.target.value)}
          className="mt-1 w-full px-3 py-2 rounded border text-sm font-mono"
          style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
          placeholder="1.2.3"
        />
      </label>

      <label className="block mb-4">
        <span className="text-sm font-medium">Changelog (tùy chọn)</span>
        <textarea
          value={changelog}
          onChange={(e) => setChangelog(e.target.value)}
          rows={4}
          className="mt-1 w-full px-3 py-2 rounded border text-sm"
          style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
          placeholder="- Thêm tính năng X&#10;- Sửa lỗi Y"
        />
      </label>

      {busy && (
        <div className="mb-4 space-y-2">
          <div className="text-sm">{status}</div>
          <ProgressBar read={progress.read} total={progress.total} />
        </div>
      )}

      <button
        onClick={submit}
        disabled={busy || !exe}
        className="inline-flex items-center gap-2 px-4 py-2 rounded text-sm font-medium"
        style={{
          background: busy || !exe ? 'var(--bg-muted)' : 'var(--primary)',
          color: busy || !exe ? 'var(--text-muted)' : '#fff',
        }}
      >
        <Rocket size={16} /> {busy ? 'Đang đăng...' : 'Đăng bản mới'}
      </button>
    </div>
  )
}
