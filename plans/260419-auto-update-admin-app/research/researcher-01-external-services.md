# External Services Research: Auto-Update + Bug Report + Announcement

Date: 2026-04-19 | Scope: GitHub API, Cloudflare Workers, Semver, Image Upload

---

## 1. GitHub REST API: Contents + Releases + Issues

### Contents API (Update JSON config/announcements)
- **Endpoint**: `PUT /repos/{owner}/{repo}/contents/{path}`
- **Payload**: Base64-encoded file content
- **SHA Required**: Must fetch current file SHA via `GET` before update to prevent conflicts
- **File Size Limit**: 100 MB theoretical (practical ~50 MB); use Git LFS for larger
- **Doc**: [REST API endpoints for repository contents](https://docs.github.com/en/rest/repos/contents)

**Go Code Sample**:
```go
// Fetch SHA
resp, _ := http.Get("https://api.github.com/repos/owner/repo/contents/config.json")
sha := gjson.Get(body, "sha").String()

// Update with base64
payload := map[string]interface{}{
    "message": "Update config",
    "content": base64.StdEncoding.EncodeToString([]byte(newContent)),
    "sha": sha,
}
```

### Releases API (Upload .exe ~40-60MB)
- **Create Release**: `POST /repos/{owner}/{repo}/releases` (tag, name, body)
- **Upload Asset**: `POST {upload_url}?name=app.exe` with `Content-Type: application/octet-stream`
- **Upload URL**: Returned by create release response; format `https://uploads.github.com/repos/...`
- **Doc**: [REST API endpoints for release assets](https://docs.github.com/en/rest/releases/assets)

**Go Code Sample**:
```go
// 1. Create release
releaseBody := map[string]interface{}{
    "tag_name": "v1.0.1",
    "name": "Version 1.0.1",
    "body": "Bug fixes and improvements",
}
// POST to releases endpoint → get upload_url

// 2. Upload binary
file, _ := os.Open("app.exe")
req, _ := http.NewRequest("POST", uploadURL+"?name=app.exe", file)
req.Header.Set("Content-Type", "application/octet-stream")
```

### Issues API (Bug reports, labels, pagination)
- **List**: `GET /repos/{owner}/{repo}/issues?labels=bug-report&state=open`
- **Create**: `POST /repos/{owner}/{repo}/issues` (title, body, labels array)
- **Update**: `PATCH /repos/{owner}/{repo}/issues/{number}` (labels, state)
- **Pagination**: Use `per_page=30&page=1`
- **Doc**: [REST API endpoints for issues](https://docs.github.com/en/rest/reference/issues)

### Authentication: Fine-Grained PAT
- **Scopes Required**: `contents:write`, `issues:write`, `releases:write`
- **Rate Limit**: 5000 req/h with token (vs 60 req/h unauthenticated)
- **Handle 403**: Retry with exponential backoff; check `X-RateLimit-Remaining` header
- **Creation**: Settings → Developer settings → Personal access tokens → Fine-grained tokens
- **Doc**: [Creating a personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)

---

## 2. Cloudflare Workers Proxy (Optional, for non-tech users)

### Free Tier Limits
- **Requests/day**: 100,000 (resets UTC)
- **CPU time**: 10ms per request (active code only; fetch/I/O don't count)
- **Script size**: 3 MB compressed (10 MB paid)
- **Subrequests**: 50 per request (10,000 paid)

### Deployment Options
- **Wrangler CLI** (recommended): `npm install -g wrangler` → `wrangler deploy` (requires API token)
- **Dashboard UI** (copy-paste JS): GitHub → Cloudflare UI, but no secret management → not suitable for GITHUB_TOKEN
- **Secrets Management**: Use `wrangler secret put GITHUB_TOKEN` (CLI) or Dashboard → Worker → Settings → Secrets

### Fetch GitHub API from Worker
- Workers use standard `fetch()` to call GitHub API
- Add `Authorization: Bearer {token}` header
- GitHub API doesn't enforce CORS on server-side (no preflight needed from Wails)
- Wails webview origin is `wails://` or `http://wails.localhost:3000` (same-origin for worker proxy)

**JS Worker Sample (~50 lines)**:
```js
export default {
  async fetch(request) {
    if (request.method !== 'POST') return new Response('Method not allowed', {status: 405});
    
    const {action, title, body, labels} = await request.json();
    const token = await env.GITHUB_TOKEN; // via wrangler secret
    
    const response = await fetch('https://api.github.com/repos/owner/repo/issues', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({title, body, labels}),
    });
    
    return response;
  }
}
```

---

## 3. Semver Compare (TypeScript, <20 lines)

**Logic**: Parse "1.0.0" into `[1, 0, 0]`, compare left-to-right, missing segments = 0.

```typescript
function compareVersions(v1: string, v2: string): -1 | 0 | 1 {
  const parse = (v: string) => v.split('.').map(x => parseInt(x) || 0);
  const p1 = parse(v1), p2 = parse(v2);
  const len = Math.max(p1.length, p2.length);
  
  for (let i = 0; i < len; i++) {
    const a = p1[i] || 0, b = p2[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0; // equal
}
```

**Note**: Ignores pre-release/metadata (e.g., "1.0.0-alpha"). If needed, split on `-` first.

---

## 4. Screenshot Attachment for Bug Reports

**GitHub Issue API constraint**: No direct file attachment API. Options:

| Option | Pros | Cons |
|--------|------|------|
| **(a) Upload to repo via Contents API, embed raw URL** | GitHub-native, no external service | Extra API call, delay in URL generation |
| **(b) Imgur/similar free anon upload** | Fast, instant URL | External service, might block for privacy |
| **(c) Base64 data URI in markdown** | Self-contained | GitHub markdown doesn't render (security) |

**Recommended**: Option (a) — upload to `screenshots/` folder in repo, commit via Contents API, embed `raw.githubusercontent.com` URL in issue body. GitHub caches CDN, no auth needed for public repo.

**Important 2025 Change**: Images uploaded to issue discussions now require auth cookies even in public repos (March 2025). Don't rely on issue comment upload.

---

## Risks / Unknowns

- [ ] GitHub rate limit 403 error handling: test backoff strategy
- [ ] .exe file virus scan delay by GitHub (possible auto-quarantine?)
- [ ] Cloudflare Worker script size growth: monitor if proxy logic expands
- [ ] Screenshot folder size in repo: set up cleanup/rotation if > 1GB
- [ ] Token expiration: fine-grained PAT has 1-year default, need renewal reminder
