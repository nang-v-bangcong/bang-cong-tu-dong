# Bug Report Proxy Worker

Cloudflare Worker làm proxy giữa app và GitHub API. Mục đích: giấu `GITHUB_TOKEN` khỏi file `.exe` (nhúng thẳng vào app → ae reverse engineer ra ngay).

## Deploy lần đầu

Xem chi tiết tại [../docs/setup-cloudflare.md](../docs/setup-cloudflare.md).

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

- `wrangler.toml` — config Worker (tên, entry point, ngày compat).
- `bug-report-proxy.js` — code xử lý request.
  - Phase 00 (hiện tại): stub, mọi request trả `{"ok": true}`.
  - Phase 04: full proxy — rate limit theo IP, upload screenshot qua GitHub contents API, tạo issue.
- `.dev.vars` — secret local khi `wrangler dev` (KHÔNG commit, đã trong `.gitignore`).

## Test local (không bắt buộc)

```bash
echo "GITHUB_TOKEN=github_pat_..." > .dev.vars
npx wrangler dev
# Worker chạy tại http://localhost:8787
curl http://localhost:8787
# => {"ok":true}
```

## Verify production

```bash
curl https://bang-cong-bug-report.<cloudflare-username>.workers.dev
# => {"ok":true}
```

URL chính xác sau `wrangler deploy` sẽ in ra PowerShell, dán vào [../docs/setup-cloudflare.md](../docs/setup-cloudflare.md) để các phase sau dùng.
