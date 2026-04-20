import { ANNOUNCEMENT_URL } from '../constants/remote-config'

export type AnnouncementColor = 'red' | 'green' | 'black'

export interface Announcement {
  enabled: boolean
  text: string
  color: AnnouncementColor
}

const TTL_MS = 5 * 60 * 1000
const FETCH_TIMEOUT_MS = 5000

let cache: { data: Announcement | null; ts: number } | null = null

function isAnnouncement(v: unknown): v is Announcement {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return (
    typeof o.enabled === 'boolean' &&
    typeof o.text === 'string' &&
    (o.color === 'red' || o.color === 'green' || o.color === 'black')
  )
}

export async function getAnnouncement(): Promise<Announcement | null> {
  if (cache && Date.now() - cache.ts < TTL_MS) return cache.data

  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
    const res = await fetch(ANNOUNCEMENT_URL, {
      signal: ctrl.signal,
      cache: 'no-store',
      headers: { Accept: 'application/vnd.github.raw' },
    })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`status ${res.status}`)
    const json: unknown = await res.json()
    if (!isAnnouncement(json)) throw new Error('invalid shape')
    cache = { data: json, ts: Date.now() }
    return json
  } catch (e) {
    console.error('[announcement] fetch fail:', e)
    cache = { data: null, ts: Date.now() }
    return null
  }
}

export function resetAnnouncementCache() {
  cache = null
}
