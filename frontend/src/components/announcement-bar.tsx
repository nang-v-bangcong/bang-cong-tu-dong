import { useEffect, useState } from 'react'
import {
  getAnnouncement,
  type Announcement,
  type AnnouncementColor,
} from '../services/announcement-service'

type ColorStyle = { bg: string; color: string }

const colorMap: Record<AnnouncementColor, ColorStyle> = {
  red: { bg: 'var(--danger-soft)', color: 'var(--danger)' },
  green: { bg: 'var(--success-soft)', color: 'var(--success)' },
  black: { bg: 'var(--bg-muted)', color: 'var(--text)' },
}

const MAX_CHARS = 100

export function AnnouncementBar() {
  const [data, setData] = useState<Announcement | null>(null)

  useEffect(() => {
    let cancelled = false
    getAnnouncement().then((res) => {
      if (!cancelled) setData(res)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!data || !data.enabled) return null
  const text = data.text.trim()
  if (!text) return null

  const clipped = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + '…' : text
  const style = colorMap[data.color] ?? colorMap.black

  return (
    <div
      className="px-3 py-0.5 text-xs font-medium truncate"
      style={{ background: style.bg, color: style.color, maxWidth: '40ch' }}
      title={text}
    >
      {clipped}
    </div>
  )
}
