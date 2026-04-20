export type AnnouncementColor = 'red' | 'green' | 'black'

const opts: Array<{ value: AnnouncementColor; label: string; swatch: string }> = [
  { value: 'red', label: 'Đỏ (cảnh báo)', swatch: 'var(--danger)' },
  { value: 'green', label: 'Xanh lá (thông tin vui)', swatch: 'var(--success)' },
  { value: 'black', label: 'Đen (thông báo chung)', swatch: '#1e293b' },
]

type Props = {
  value: AnnouncementColor
  onChange: (v: AnnouncementColor) => void
}

export function ColorRadioGroup({ value, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {opts.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="flex items-center gap-2 px-3 py-2 rounded border text-sm"
            style={{
              borderColor: active ? 'var(--primary)' : 'var(--border)',
              background: active ? 'var(--primary-soft)' : 'var(--bg-card)',
              color: 'var(--text)',
              fontWeight: active ? 600 : 400,
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                background: o.swatch,
                display: 'inline-block',
              }}
            />
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
