// Bug Report Proxy — Cloudflare Worker
// Flow: POST JSON → validate → rate-limit KV → upload screenshot (optional) → create issue.
// Secret: GITHUB_TOKEN (wrangler secret put). Vars: REPO_OWNER, REPO_NAME.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const MAX_DESC = 5000
const MAX_IMG_BYTES = 2 * 1024 * 1024
const RATE_LIMIT = 5
const RATE_WINDOW_S = 60

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

function sanitize(s, max = 200) {
  return String(s ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max)
}

// base64 → decoded bytes (rough, ignore padding): len * 3 / 4.
function b64Size(b64) {
  const clean = String(b64).replace(/^data:[^;]+;base64,/, '')
  return Math.floor((clean.length * 3) / 4)
}

function stripDataUri(b64) {
  return String(b64).replace(/^data:[^;]+;base64,/, '')
}

async function gh(env, path, init = {}) {
  const url = `https://api.github.com${path}`
  const headers = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'bang-cong-bug-report-worker',
    'Content-Type': 'application/json',
    ...(init.headers || {}),
  }
  return fetch(url, { ...init, headers })
}

async function rateLimitExceeded(env, ip) {
  const key = `rl:${ip}`
  const current = parseInt((await env.RATE_LIMIT.get(key)) || '0', 10)
  if (current >= RATE_LIMIT) return true
  await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: RATE_WINDOW_S })
  return false
}

function randomSuffix() {
  const buf = new Uint8Array(4)
  crypto.getRandomValues(buf)
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('')
}

async function uploadScreenshot(env, b64, ts) {
  const path = `screenshots/${ts}-${randomSuffix()}.jpg`
  const res = await gh(env, `/repos/${env.REPO_OWNER}/${env.REPO_NAME}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `bug-report screenshot ${ts}`,
      content: stripDataUri(b64),
    }),
  })
  if (!res.ok) return null
  return `https://raw.githubusercontent.com/${env.REPO_OWNER}/${env.REPO_NAME}/main/${path}`
}

function buildIssue(payload, screenshotUrl) {
  const descOneLine = sanitize(payload.description, 50)
  const title = `[Bug] ${descOneLine}${payload.description.length > 50 ? '…' : ''}`
  const contact = sanitize(payload.userContact, 200) || '(không cung cấp)'
  const lines = [
    `**Liên hệ:** ${contact}`,
    `**Phiên bản:** ${sanitize(payload.version, 50)}`,
    `**Hệ điều hành:** ${sanitize(payload.os, 100)}`,
    `**Thời gian:** ${sanitize(payload.timestamp, 50)}`,
    '',
    '### Mô tả',
    String(payload.description).slice(0, MAX_DESC),
  ]
  if (screenshotUrl) {
    lines.push('', '### Ảnh chụp màn hình', `![screenshot](${screenshotUrl})`)
  }
  return { title, body: lines.join('\n'), labels: ['bug-report'] }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
    if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405)

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
    if (await rateLimitExceeded(env, ip)) return json({ error: 'rate limit' }, 429)

    let payload
    try {
      payload = await request.json()
    } catch {
      return json({ error: 'invalid json' }, 400)
    }

    const description = typeof payload.description === 'string' ? payload.description : ''
    if (!description.trim()) return json({ error: 'description required' }, 400)
    if (description.length > MAX_DESC) return json({ error: 'description too long' }, 400)

    if (payload.screenshot) {
      if (typeof payload.screenshot !== 'string' || b64Size(payload.screenshot) > MAX_IMG_BYTES) {
        return json({ error: 'screenshot too large' }, 400)
      }
    }

    const ts = Math.floor(Date.now() / 1000)
    let screenshotUrl = null
    if (payload.screenshot) {
      screenshotUrl = await uploadScreenshot(env, payload.screenshot, ts)
      if (!screenshotUrl) return json({ error: 'screenshot upload failed' }, 502)
    }

    const issue = buildIssue(payload, screenshotUrl)
    const res = await gh(env, `/repos/${env.REPO_OWNER}/${env.REPO_NAME}/issues`, {
      method: 'POST',
      body: JSON.stringify(issue),
    })
    if (!res.ok) return json({ error: 'issue create failed' }, 502)

    const created = await res.json()
    return json({ success: true, issue_url: created.html_url })
  },
}
