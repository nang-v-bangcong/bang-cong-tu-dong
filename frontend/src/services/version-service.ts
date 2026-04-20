import { VERSION_URL } from '../constants/remote-config'
import { CURRENT_VERSION } from '../constants/version'

export interface VersionInfo {
  version: string
  download_url: string
  changelog: string
}

export interface UpdateCheckResult {
  hasUpdate: boolean
  remote: VersionInfo | null
}

const TTL_MS = 5 * 60 * 1000
const FETCH_TIMEOUT_MS = 5000

let cache: { data: VersionInfo | null; ts: number } | null = null

function parseSemver(v: string): [number, number, number] {
  const clean = v.trim().replace(/^v/i, '').split(/[-+]/)[0]
  const parts = clean.split('.').map((p) => {
    const n = parseInt(p, 10)
    return Number.isFinite(n) && n >= 0 ? n : 0
  })
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0]
}

export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const pa = parseSemver(a)
  const pb = parseSemver(b)
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1
    if (pa[i] < pb[i]) return -1
  }
  return 0
}

function isVersionInfo(v: unknown): v is VersionInfo {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return (
    typeof o.version === 'string' &&
    typeof o.download_url === 'string' &&
    typeof o.changelog === 'string'
  )
}

export async function getRemoteVersion(): Promise<VersionInfo | null> {
  if (cache && Date.now() - cache.ts < TTL_MS) return cache.data

  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
    const res = await fetch(VERSION_URL, {
      signal: ctrl.signal,
      cache: 'no-store',
      headers: { Accept: 'application/vnd.github.raw' },
    })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`status ${res.status}`)
    const json: unknown = await res.json()
    if (!isVersionInfo(json)) throw new Error('invalid shape')
    cache = { data: json, ts: Date.now() }
    return json
  } catch (e) {
    console.error('[version] fetch fail:', e)
    cache = { data: null, ts: Date.now() }
    return null
  }
}

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  const remote = await getRemoteVersion()
  if (!remote) return { hasUpdate: false, remote: null }
  const hasUpdate = compareSemver(remote.version, CURRENT_VERSION) === 1
  return { hasUpdate, remote }
}

export function resetVersionCache() {
  cache = null
}
