# Bug Report Proxy Worker

Cloudflare Worker làm proxy giữa app và GitHub API. Mục đích: giấu `GITHUB_TOKEN` khỏi file `.exe` (nhúng thẳng vào app → ae reverse engineer ra ngay).

## Deploy lần đầu

Xem chi tiết tại [../docs/setup-cloudflare.md](../docs/setup-cloudflare.md).

## Phase 04 — setup KV rate-limit

```bash
cd worker

# 1. Tạo KV namespace cho rate-limit (5 req/phút/IP).
npx wrangler kv:namespace create "RATE_LIMIT"
# Output: [[kv_namespaces]] binding = "RATE_LIMIT" id = "xxxxxxxxxxx"
# → Dán id vào wrangler.toml (thay PASTE_KV_NAMESPACE_ID_HERE).

# 2. Deploy lại worker với code mới.
npx wrangler deploy
```

## Lệnh thường dùng

```bash
# Deploy code mới sau khi sửa bug-report-proxy.js
cd worker
npx wrangler deploy

# Xem log realtime khi debug
npx wrangler tail

# Update secret (khi rotate PAT)
npx wrangler secret put GITHUB_TOKEN

# Xóa Worker khỏi Cloudflare
npx wrangler delete
```

## Files

- `wrangler.toml` — config Worker (tên, entry point, KV binding, vars REPO_OWNER/REPO_NAME).
- `bug-report-proxy.js` — proxy: rate limit 5/phút/IP, upload screenshot vào `screenshots/`, tạo issue label `bug-report`.
- `.dev.vars` — secret local khi `wrangler dev` (KHÔNG commit, đã trong `.gitignore`).

## Payload spec (POST /)

```json
{
  "description": "string (required, max 5000 char)",
  "userContact": "string (optional)",
  "screenshot": "base64 string hoặc data URI (optional, max 2MB decoded)",
  "version": "string (CURRENT_VERSION từ app)",
  "os": "string (kết quả GetOSInfo)",
  "timestamp": "ISO 8601 string"
}
```

Response:
- `200 {success: true, issue_url}` — issue tạo xong.
- `400 {error}` — payload thiếu/sai (description rỗng, screenshot >2MB).
- `405 {error}` — non-POST (OPTIONS trả 204 preflight).
- `429 {error}` — quá 5 req/phút/IP.
- `502 {error}` — GitHub API fail (upload hoặc issue).

## Test curl (phase 04 verify)

```bash
# 1. Basic issue (không screenshot)
curl -X POST https://bang-cong-bug-report.nangv.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"description":"test bug","version":"1.0.0","os":"windows amd64 (production)","timestamp":"2026-04-19T10:00:00Z"}'
# → {"success":true,"issue_url":"https://github.com/.../issues/1"}

# 2. Validate: description rỗng
curl -X POST https://bang-cong-bug-report.nangv.workers.dev \
  -H "Content-Type: application/json" -d '{}'
# → 400 {"error":"description required"}

# 3. CORS preflight
curl -X OPTIONS https://bang-cong-bug-report.nangv.workers.dev -i
# → 204 + Access-Control-Allow-Origin: *

# 4. Rate limit — 6 lần liên tiếp, lần 6 trả 429.
for i in 1 2 3 4 5 6; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST \
    https://bang-cong-bug-report.nangv.workers.dev \
    -H "Content-Type: application/json" \
    -d '{"description":"rl-test","version":"1.0.0","os":"w","timestamp":"t"}'
done
# → 200 200 200 200 200 429
```

## Test local (không bắt buộc)

```bash
echo "GITHUB_TOKEN=github_pat_..." > .dev.vars
npx wrangler dev
# Worker chạy tại http://localhost:8787
```

## Verify production

```bash
curl https://bang-cong-bug-report.nangv.workers.dev -X POST \
  -H "Content-Type: application/json" \
  -d '{"description":"smoke","version":"1.0.0","os":"w","timestamp":"t"}'
# → {"success":true,"issue_url":"..."}
```
