import type { AnnouncementColor } from './color-radio-group'

const colorMap: Record<AnnouncementColor, { bg: string; color: string }> = {
  red: { bg: 'var(--danger-soft)', color: 'var(--danger)' },
  green: { bg: 'var(--success-soft)', color: 'var(--success)' },
  black: { bg: 'var(--bg-muted)', color: 'var(--text)' },
}

type Props = { text: string; color: AnnouncementColor; enabled: boolean }

export function AnnouncementPreview({ text, color, enabled }: Props) {
  const style = colorMap[color] ?? colorMap.black
  const shown = text.trim()
  return (
    <div className="space-y-2">
      <div
        className="text-xs font-medium"
        style={{ color: 'var(--text-secondary)' }}
      >
        Xem trước (giống header app chính):
      </div>
      <div
        className="inline-flex items-center border rounded"
        style={{
          borderColor: 'var(--border)',
          background: 'var(--bg-card)',
          padding: 4,
          minHeight: 28,
        }}
      >
        {!enabled || !shown ? (
          <span
            className="px-2 text-xs"
            style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}
          >
            (ẩn — không hiện trong app)
          </span>
        ) : (
          <div
            className="px-3 py-0.5 text-xs font-medium truncate"
            style={{
              background: style.bg,
              color: style.color,
              maxWidth: '40ch',
            }}
            title={shown}
          >
            {shown}
          </div>
        )}
      </div>
    </div>
  )
}
