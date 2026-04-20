# Phase 04 — Cloudflare Worker (Bug Report Proxy)

## Context links

- [plan.md](./plan.md)
- [reports/00-codebase-verification.md](./reports/00-codebase-verification.md) (R1, R2, R10)
- [research/researcher-01-external-services.md](./research/researcher-01-external-services.md) (§1, §2, §4)

## Overview

- **Date:** 2026-04-19
- **Description:** Mở rộng stub worker từ phase 00 thành full proxy ~120 dòng: POST JSON từ app, validate, rate-limit 5/phút/IP (KV), upload screenshot qua GitHub Contents API (`screenshots/{ts}.jpg`), tạo issue markdown có metadata + ảnh embed, trả `{success, issue_url}`. CORS `*`.
- **Priority:** Cao (block phase 03).
- **Implementation status:** Completed (2026-04-19) — KV namespace `4836108f7b754445b84dd3464b3b16ae` tạo xong, Worker deployed live tại `https://bang-cong-bug-report.nangv.workers.dev`.
- **Review status:** Completed — 4 curl test pass (basic 200, empty 400, OPTIONS 204, 6 req 429) + issue #6/#7 từ app thật có đầy đủ metadata + screenshot embed.

## Implementation summary (2026-04-19)

- `worker/bug-report-proxy.js` (131 dòng): CORS preflight 204, rate-limit KV 5/60s theo `CF-Connecting-IP`, validate description (required, ≤5000 char) + screenshot (≤2MB decoded), upload `screenshots/{unix_ts}.jpg` qua Contents API, tạo issue label `bug-report` với markdown metadata (liên hệ/phiên bản/OS/thời gian) + screenshot embed `![](raw-url)`.
- `worker/wrangler.toml`: thêm `[[kv_namespaces]] binding=RATE_LIMIT` (placeholder id) + `[vars]` REPO_OWNER/REPO_NAME.
- `worker/README.md`: bổ sung section "Phase 04 — setup KV rate-limit" kèm lệnh KV + payload spec + 4 curl test (basic/validate/OPTIONS/rate-limit).
- Không log body → không risk leak PAT nếu user paste nhầm.

**User actions còn lại:**
1. `cd worker && npx wrangler kv:namespace create "RATE_LIMIT"` → copy `id` → dán vào `wrangler.toml` thay `PASTE_KV_NAMESPACE_ID_HERE`.
2. `npx wrangler deploy`.
3. Chạy 4 curl test trong README verify.

## Key Insights

- Timestamp unique → screenshot file không tồn tại trước → PUT không cần SHA.
- Issue API không có attachment → phải upload file riêng rồi embed `![](raw-url)` markdown.
- Rate limit: Cloudflare KV counter (IP key, TTL 60s, limit 5). Đơn giản hơn Rate Limiting API (cần paid plan).
- CORS: `Access-Control-Allow-Origin: *`. OPTIONS preflight → 204 + CORS headers.
- Secret `GITHUB_TOKEN` đã set phase 00.
- Worker free tier: 100K req/day, body max 100MB → 2MB screenshot OK.

## Requirements

**Functional:**
- `POST /` JSON body `{description, userContact?, screenshot?, version, os, timestamp}`.
- Validate: `description` non-empty ≤ 5000 char. `screenshot` base64 decoded ≤ 2MB.
- Rate limit 5 POST/phút/IP via `CF-Connecting-IP`.
- Upload screenshot (optional) → path `screenshots/{unix_ts}.jpg` → get raw URL.
- Tạo issue:
  - Title: `[Bug] {description 50 ký tự}...`
  - Labels: `["bug-report"]`
  - Body markdown: metadata (contact/version/os/timestamp) + `### Description` + `### Screenshot ![](raw-url)` nếu có.
- Response:
  - 200: `{success:true, issue_url}`
  - 400: validation fail
  - 429: rate limit
  - 502: GitHub API fail
  - 405: non-POST (trừ OPTIONS 204)

**Non-functional:**
- `bug-report-proxy.js` ≤ 150 dòng.
- KHÔNG log request body (tránh PAT leak nếu user paste nhầm).
- `wrangler.toml` có `compatibility_date`.

## Architecture

```
Wails app → POST JSON → Cloudflare Worker
                        ├─ CORS preflight OPTIONS → 204
                        ├─ validate + rate-limit KV
                        ├─ if screenshot: PUT /repos/../contents/screenshots/{ts}.jpg
                        │    → raw_url
                        ├─ POST /repos/../issues markdown body + labels
                        └─ return {success, issue_url}
                       └─ GitHub API (Auth: env.GITHUB_TOKEN)
```

## Related code files

- Sửa (mở rộng từ stub phase 00):
  - `worker/bug-report-proxy.js` (stub → full ~120 dòng)
  - `worker/wrangler.toml` (thêm KV binding + vars)
  - `worker/README.md` (thêm lệnh KV + curl test)

## Implementation Steps

1. **Tạo KV namespace:**
   ```bash
   npx wrangler kv:namespace create "RATE_LIMIT"
   ```
   Paste `id` vào `wrangler.toml`.
2. **`wrangler.toml`** update:
   ```toml
   name = "bang-cong-bug-report"
   main = "bug-report-proxy.js"
   compatibility_date = "2025-01-01"
   [[kv_namespaces]]
   binding = "RATE_LIMIT"
   id = "..."
   [vars]
   REPO_OWNER = "{owner}"
   REPO_NAME = "bang-cong-tu-dong"
   ```
3. **`bug-report-proxy.js`** (~120 dòng) — structure:
   - Const `CORS` object (Origin `*`, Methods POST/OPTIONS, Headers Content-Type).
   - Helper `json(data, status)` → Response với CORS headers.
   - `export default { fetch(request, env) }`:
     1. OPTIONS → 204 + CORS.
     2. non-POST → 405.
     3. Rate-limit: `key = rl:${ip}`, `count = parseInt(await env.RATE_LIMIT.get(key) || "0")`, nếu ≥ 5 → 429. Else `put(key, count+1, {expirationTtl: 60})`.
     4. Parse JSON → validate description (required, ≤5000), validate screenshot (if present: base64 decoded size ≤2MB → `b64.length * 0.75`).
     5. Helper `gh(url, init)` fetch với Bearer token + User-Agent + Accept.
     6. Nếu có screenshot: PUT `/contents/screenshots/{ts}.jpg` body `{message, content: b64}` → nếu ok → `screenshotUrl = raw.githubusercontent.com/...`.
     7. Build title (50 char đầu) + body markdown (contact/version/os/timestamp + description + screenshot embed nếu có).
     8. POST `/issues` body `{title, body, labels:["bug-report"]}` → nếu fail → 502; else parse → return `{success:true, issue_url: issue.html_url}`.
4. `npx wrangler deploy`.
5. **Test curl:**
   - Basic: `curl -X POST {URL} -H "Content-Type: application/json" -d '{"description":"test","version":"1.0.0","os":"Win","timestamp":"2026-04-19T10:00:00Z"}'` → expect `{success:true, issue_url}`. Verify issue xuất hiện.
   - Rate limit: 6 req/phút → lần 6 → 429.
   - Screenshot: encode JPG sang base64 data URI → POST → verify file lên `screenshots/` + embed trong issue.
   - OPTIONS: `curl -X OPTIONS` → 204 + CORS header.
6. **`worker/README.md`** update: lệnh KV + curl test + payload spec.

## Todo list

- [ ] Tạo KV namespace, paste id vào `wrangler.toml`.
- [ ] Viết full `bug-report-proxy.js` theo 8 step trên.
- [ ] `npx wrangler deploy`.
- [ ] Curl test 4 case (basic/rate-limit/screenshot/OPTIONS).
- [ ] Update `worker/README.md`.

## Success Criteria

- [ ] POST hợp lệ → issue GitHub label `bug-report`.
- [ ] Screenshot upload vào `screenshots/`, URL raw embed trong issue body.
- [ ] Rate limit chặn IP sau 5 req/min.
- [ ] OPTIONS preflight → 204.
- [ ] `GITHUB_TOKEN` không xuất hiện response/log.
- [ ] Invalid payload → 400 rõ lý do.

## Risk Assessment

- **Medium (mitigated)**: Token leak qua log (R1) → Worker `console.log` không dump body; Cloudflare log mặc định không lưu body.
- **Low**: KV rate-limit bypass (user đổi IP) → acceptable.
- **Low**: Free tier 100K req/day — bug report <50/ngày.
- **Medium**: User upload ảnh nhạy cảm → phase 03 warning text, worker không validate content.

## Security Considerations

- `GITHUB_TOKEN` chỉ ở env, không hardcode.
- CORS `*` giai đoạn 1, restrict `http://wails.localhost` sau nếu cần.
- Validate input size tránh DoS.
- Rate limit giảm spam.
- Không log PII.

## Next steps

Phase 03 dùng URL Worker này. Sau phase 08 admin có thể review+close issue.
