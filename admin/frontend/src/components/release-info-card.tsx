import { RefreshCw } from 'lucide-react'

type ExeInfo = { name: string; size: number; modTime: string }

function fmtMB(n: number) {
  return (n / 1_000_000).toFixed(1) + ' MB'
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('vi-VN')
}

type Props = {
  remoteVersion?: string | null
  remoteErr?: string
  exe: ExeInfo | null
  exeErr?: string
  onScan: () => void
}

export function ReleaseInfoCard({ remoteVersion, remoteErr, exe, exeErr, onScan }: Props) {
  return (
    <div
      className="rounded border p-4 mb-5 space-y-2 text-sm"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
    >
      <div>
        <span style={{ color: 'var(--text-secondary)' }}>Bản trên GitHub: </span>
        <span className="font-mono">
          {remoteVersion ? `v${remoteVersion}` : remoteErr ? '(lỗi)' : '...'}
        </span>
      </div>
      <div>
        <span style={{ color: 'var(--text-secondary)' }}>File mới nhất: </span>
        {exe ? (
          <span className="font-mono">
            {exe.name} — {fmtMB(exe.size)} — {fmtTime(exe.modTime)}
          </span>
        ) : (
          <span style={{ color: 'var(--danger)' }}>{exeErr ?? '...'}</span>
        )}
      </div>
      <button
        onClick={onScan}
        className="inline-flex items-center gap-1 text-xs"
        style={{ color: 'var(--primary)' }}
      >
        <RefreshCw size={12} /> Scan lại
      </button>
    </div>
  )
}

export { fmtMB }
