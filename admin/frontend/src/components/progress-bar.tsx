type Props = {
  read: number
  total: number
  label?: string
}

function mb(n: number) {
  return (n / 1_000_000).toFixed(1)
}

export function ProgressBar({ read, total, label }: Props) {
  const pct = total > 0 ? Math.min(100, Math.floor((read * 100) / total)) : 0
  return (
    <div>
      <div
        className="h-2 rounded overflow-hidden"
        style={{ background: 'var(--bg-muted)' }}
      >
        <div
          className="h-full transition-all"
          style={{
            width: `${pct}%`,
            background: 'var(--primary)',
          }}
        />
      </div>
      <div
        className="mt-1 text-xs flex justify-between"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span>{label ?? ''}</span>
        <span>
          {mb(read)} / {mb(total)} MB ({pct}%)
        </span>
      </div>
    </div>
  )
}
