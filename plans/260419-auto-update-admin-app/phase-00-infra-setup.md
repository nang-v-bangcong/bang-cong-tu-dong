# Phase 00 — Infra setup: GitHub + Cloudflare + seed files

## Context links

- [plan.md](./plan.md)
- [reports/00-codebase-verification.md](./reports/00-codebase-verification.md)
- [research/researcher-01-external-services.md](./research/researcher-01-external-services.md)

## Overview

- **Date:** 2026-04-19
- **Description:** User + Claude ngồi cạnh setup đồng bộ: GitHub account mới (email/pwd riêng, không Google OAuth), tạo repo public `bang-cong-tu-dong`, push seed files, tạo fine-grained PAT scope hẹp, đăng ký Cloudflare free, deploy Worker stub, set secret. Cuối phase test e2e: curl Worker trả về 200.
- **Priority:** Cao (blocking mọi phase khác).
- **Implementation status:** Pending
- **Review status:** Pending

## Key Insights

- Repo PHẢI public để frontend fetch `raw.githubusercontent.com` không cần auth (key decision #2).
- Fine-grained PAT (không dùng classic) scope hẹp tới repo cụ thể: contents+issues+releases:write. Classic PAT scope rộng quá → rủi ro leak cao hơn.
- Cloudflare Worker free deploy bằng wrangler CLI (không qua Dashboard UI vì không manage được secret).
- Seed `announcement.json` + `version.json` commit sẵn → phase 01/02 test ngay không cần admin app.
- Google OAuth GitHub signup có thể lock nếu mất access Google → dùng email+pwd thuần.

## Requirements

**Functional:**
- GitHub account mới (không trùng Google) có email riêng backup.
- Repo public `bang-cong-tu-dong` tại `https://github.com/{owner}/bang-cong-tu-dong`.
- 2 file seed ở root repo:
  - `announcement.json`: `{"enabled": false, "text": "", "color": "black"}`
  - `version.json`: `{"version": "1.0.0", "download_url": "", "changelog": ""}`
- 1 thư mục `screenshots/` (kèm `.gitkeep`) để bug report upload vào.
- Fine-grained PAT name `BangCongAdmin-PAT`, scope chỉ repo này, expire 1 năm.
- Cloudflare account free, 1 Worker `bang-cong-bug-report.{user}.workers.dev` deploy stub return `{"ok": true}`.
- Secret `GITHUB_TOKEN` set qua `wrangler secret put`.

**Non-functional:**
- Không commit PAT vào git.
- Không để Worker subdomain leak trong README public.
- Tài liệu setup tiếng Việt ở `docs/setup-github.md` + `docs/setup-cloudflare.md` để user làm lại được nếu mất máy.

## Architecture

```
GitHub (bang-cong-tu-dong, public)
 ├─ announcement.json     (seed, updated by admin)
 ├─ version.json          (seed, updated by admin)
 ├─ screenshots/          (uploads từ bug report)
 │  └─ .gitkeep
 └─ releases/             (GitHub Releases, admin tạo)

Cloudflare Workers (free)
 └─ bang-cong-bug-report  (secret: GITHUB_TOKEN, route: workers.dev subdomain)

Local machine
 └─ PAT lưu vào wincred (phase 05 mới dùng, phase này chỉ tạo + note lại).
```

## Related code files (sẽ tạo)

- `d:/Dự án gốc/Bảng công tự động/announcement.json` (seed để test local, KHÔNG commit — đã có bản trên GitHub)
- `d:/Dự án gốc/Bảng công tự động/worker/bug-report-proxy.js` (stub ~20 dòng phase này, full 80 dòng ở phase 04)
- `d:/Dự án gốc/Bảng công tự động/worker/wrangler.toml` (~15 dòng)
- `d:/Dự án gốc/Bảng công tự động/worker/README.md` (~40 dòng, deploy command)
- `d:/Dự án gốc/Bảng công tự động/docs/setup-github.md` (~80 dòng, screenshot placeholder)
- `d:/Dự án gốc/Bảng công tự động/docs/setup-cloudflare.md` (~80 dòng, screenshot placeholder)
- `d:/Dự án gốc/Bảng công tự động/.gitignore` (thêm line `go.work`, `worker/.dev.vars`, `admin/build/`)

## Implementation Steps

1. **GitHub account (user thao tác, Claude hướng dẫn từng bước):**
   - Truy cập github.com/signup, dùng email riêng (gợi ý `nangv657+bangcong@gmail.com` hoặc tạo email mới).
   - Username đề xuất: `nang-v` hoặc tương tự (kebab-case).
   - Verify email, bật 2FA qua app authenticator (Authy/Microsoft Authenticator).
   - Lưu recovery codes vào trình quản lý mật khẩu.
2. **Tạo repo** `bang-cong-tu-dong` (public, no README/no gitignore — sẽ init local):
   - Settings → General → đánh dấu public, disable Wiki nếu không cần.
3. **Init git local:**
   ```bash
   cd "d:/Dự án gốc/Bảng công tự động"
   git remote add origin https://github.com/{owner}/bang-cong-tu-dong.git
   ```
4. **Tạo 2 file seed + commit:**
   - `announcement.json`: `{"enabled":false,"text":"","color":"black"}`
   - `version.json`: `{"version":"1.0.0","download_url":"","changelog":""}`
   - `screenshots/.gitkeep`: empty file
   - Commit: `chore(infra): seed remote config files`
   - Push lên `main`.
5. **Tạo fine-grained PAT:**
   - Settings → Developer settings → Personal access tokens → Fine-grained → Generate new token.
   - Name: `BangCongAdmin-PAT`.
   - Expiration: 1 year (note ngày hết hạn vào `docs/setup-github.md`).
   - Repository access: Only select repositories → `bang-cong-tu-dong`.
   - Repository permissions:
     - Contents: Read and write
     - Issues: Read and write
     - Metadata: Read-only (mandatory)
   - Generate → copy token (chỉ hiện 1 lần) → lưu vào password manager hoặc note local không commit.
6. **Cloudflare account:**
   - Đăng ký cloudflare.com/sign-up (email trùng GitHub OK, bật 2FA).
   - Không cần add domain giai đoạn 1 (Worker dùng subdomain mặc định `{user}.workers.dev`).
7. **Install wrangler + deploy stub worker:**
   - Tạo folder `worker/` với 3 file (Claude viết code):
     - `wrangler.toml`: `name = "bang-cong-bug-report"`, `main = "bug-report-proxy.js"`, `compatibility_date = "2025-01-01"`.
     - `bug-report-proxy.js`: export default `{ async fetch() { return new Response(JSON.stringify({ok:true}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}) } }`.
     - `README.md`: command `npx wrangler login` → `npx wrangler deploy` → `npx wrangler secret put GITHUB_TOKEN` (paste PAT).
   - User chạy 3 command, verify Worker URL printed.
8. **Set secret GITHUB_TOKEN:**
   - `npx wrangler secret put GITHUB_TOKEN` → paste PAT → verify trong Cloudflare dashboard Worker → Settings → Variables → Secret.
9. **Test e2e:**
   - `curl https://bang-cong-bug-report.{user}.workers.dev` → expect `{"ok":true}`.
   - Note URL chính xác vào `docs/setup-cloudflare.md` → sẽ dùng làm const trong phase 03.
10. **Update `.gitignore`:** thêm `worker/.dev.vars`, `worker/node_modules`, `go.work`, `admin/build/`, `*.env`.
11. **Viết `docs/setup-github.md` + `docs/setup-cloudflare.md`** tiếng Việt, có placeholder ảnh (để phase 10 fill).

## Todo list

- [ ] Tạo GitHub account + 2FA + recovery codes saved.
- [ ] Tạo repo public `bang-cong-tu-dong`.
- [ ] Init git remote + push 2 seed JSON + screenshots/.gitkeep.
- [ ] Tạo fine-grained PAT, lưu password manager.
- [ ] Đăng ký Cloudflare + 2FA.
- [ ] Viết `worker/wrangler.toml` + `worker/bug-report-proxy.js` stub + `worker/README.md`.
- [ ] `npx wrangler deploy` thành công, note Worker URL.
- [ ] `npx wrangler secret put GITHUB_TOKEN` thành công.
- [ ] curl test Worker → `{"ok":true}`.
- [ ] Update `.gitignore`.
- [ ] Viết `docs/setup-github.md` + `docs/setup-cloudflare.md`.

## Success Criteria

- [ ] `https://github.com/{owner}/bang-cong-tu-dong` public accessible.
- [ ] `https://raw.githubusercontent.com/{owner}/bang-cong-tu-dong/main/announcement.json` trả về JSON (no auth).
- [ ] PAT test `curl -H "Authorization: Bearer {PAT}" https://api.github.com/repos/{owner}/bang-cong-tu-dong` trả 200.
- [ ] Worker URL accessible, trả `{"ok":true}`.
- [ ] Secret `GITHUB_TOKEN` hiển thị trong Cloudflare dashboard (value ẩn).
- [ ] `.gitignore` đã loại các file nhạy cảm.

## Risk Assessment

- **Medium**: user chưa quen GitHub/Cloudflare CLI → Claude phải hướng dẫn step-by-step bằng tiếng Việt.
- **Low (mitigated)**: PAT leak → dùng fine-grained scope hẹp, note expiry, không commit.
- **Low**: Worker free tier đủ dùng (bug report dự kiến <100 req/day).

## Security Considerations

- PAT KHÔNG được commit vào git (check `.gitignore`).
- Worker code KHÔNG log request body (tránh PAT leak qua log nếu user nhầm gửi vào body).
- 2FA bắt buộc cho cả GitHub + Cloudflare.
- Recovery codes lưu offline (password manager).

## Next steps

Phase 01 bắt đầu ngay sau khi Worker URL + repo URL confirm. Ghi 2 URL này vào `docs/setup-*.md` làm single source of truth cho các phase sau.
