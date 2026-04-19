# Codebase Verification Report — Auto-Update + Admin App

**Date:** 2026-04-19
**Scope:** Verify giả định plan trước khi implement, dựa trên scout + research.

---

## Verified facts (đã kiểm tra thực tế trong code)

### Header & insertion points
- [x] Header component tại `frontend/src/components/header.tsx` (97 dòng).
- [x] Flex container, background `var(--bg-card)`, padding `py-1.5` (height dynamic).
- [x] Icon group 7 icon right-side từ L73-91: Refresh, History, Building2, Download, Upload, HelpButton, ThemeToggle.
- [x] MonthPicker render L70.
- [x] **Announcement insert**: giữa MonthPicker (L70) và icon group (L73).
- [x] **Bug icon insert**: trước HelpButton (L89).

### Version
- [x] `wails.json` L16: `productVersion: "1.0.0"`.
- [x] `versioninfo.json` L4: Major=1 Minor=0 Patch=0 Build=0.
- [x] **KHÔNG CÓ version constant** trong `frontend/src/` hay `app.go` → phase 02 cần tạo mới `frontend/src/constants/version.ts`.
- [x] Build outputs: `build.bat` → `build/bin/BangCong.exe`. `build-installer.bat` → NSIS installer.

### Toast / Dialog patterns
- [x] Sonner v2.0.0 đã có trong `frontend/package.json`.
- [x] `<Toaster richColors position="bottom-right" />` ở `App.tsx` L85.
- [x] Chưa dùng `toast.action()` → có thể dùng cho toast update notify (phase 02).
- [x] Dialog template chính: `help-dialog.tsx` (69 dòng) — pattern: fixed overlay + max-w-3xl + ESC + click-outside.
- [x] Simpler: `confirm-dialog.tsx` (31 dòng). Z-index conflict: `exit-dialog.tsx` dùng `z-[60]`.

### Wails binding
- [x] Convention: PascalCase, return `(T, error)` hoặc `error`.
- [x] `app.go` 203 dòng đã có nhiều method. **Thiếu**: `OpenURL`, `GetOSInfo`, `SubmitBugReport` (nếu muốn proxy Go thay vì JS fetch trực tiếp).
- [x] `runtime.BrowserOpenURL(ctx, url)` dùng được (research #4).
- [x] Context `a.ctx` stored ở `startup` (L20-29).

### State management
- [x] Zustand 5.0.0 store duy nhất tại `frontend/src/stores/app-store.ts` (75 dòng).
- [x] **Không có config store** → announcement/version state: component-level `useState` + service cache (phase 01, 02).

### Dependencies
- [x] Hiện có: sonner, lucide-react, zustand, react 18, papaparse, @tailwindcss/vite v4.
- [x] **Thiếu cho plan**:
  - `html2canvas` (~45KB) — phase 03 screenshot.
  - `react-markdown` — phase 08 render issue body có ảnh embed.
  - `github.com/danieljoos/wincred` (Go) — phase 05 token storage.

### CSS vars
- [x] Có `--danger`, `--success`, và cần check `--black` hoặc fallback text color cho announcement 3 màu.
- [x] Dark mode class-based (`.dark` trên html) → AnnouncementBar phải dùng CSS var hoặc Tailwind `dark:` variant.

### Plan convention
- [x] Mỗi phase file: Context links → Overview (date/desc/priority/status) → Key Insights → Requirements → Architecture → Related code files → Implementation Steps → Todo list → Success Criteria → Risks → Security → Next steps.
- [x] Tham chiếu mẫu: `plans/260418-matrix-team-upgrade/phase-02-today-button.md`.

### Event pattern
- [x] Backend emit `runtime.EventsEmit(ctx, event, data)` → Frontend `EventsOn(event, cb)` (xem `exit-dialog.tsx` ví dụ).
- [x] Dùng cho phase 07 upload progress: event name đề xuất `release-upload-progress`.

---

## External services (đã research)

### GitHub API
- [x] Fetch announcement/version: `https://raw.githubusercontent.com/{owner}/{repo}/main/announcement.json` — KHÔNG cần auth cho repo public, CORS OK từ WebView2.
- [x] Contents API: `PUT /repos/{owner}/{repo}/contents/{path}` cần SHA hiện tại + base64 content.
- [x] Releases API: POST create release → upload_url → POST binary với `Content-Type: application/octet-stream`.
- [x] Issues API: POST create, GET list `?labels=bug-report&state=open&per_page=30&page=1`, PATCH close.
- [x] Fine-grained PAT scope: `contents:write` + `issues:write` + `releases:write`. Rate limit 5000/h.
- [x] **Lưu ý 2025**: ảnh upload qua issue comment yêu cầu auth cookie → PHẢI upload vào `screenshots/{timestamp}.jpg` qua Contents API, embed `raw.githubusercontent.com` URL.

### Cloudflare Workers
- [x] Free tier: 100K req/day, 10ms CPU/req, 3MB script. Đủ cho bug report.
- [x] Deploy `npx wrangler deploy`, secret `npx wrangler secret put GITHUB_TOKEN`.
- [x] WebView2 origin là `http://wails.localhost` → CORS worker set `Access-Control-Allow-Origin: *` (hoặc match `wails.localhost`).

### Wails multi-project
- [x] Go workspace `go.work` ở root, `use ( . ./admin )`.
- [x] Mỗi app có `wails.json` riêng. Build admin: `cd admin && wails build`.
- [x] Frontend duplicate `node_modules/` — chấp nhận (YAGNI).

### html2canvas
- [x] v1.x compat WebView2 Edge Chromium. Q=0.7 JPEG base64 ~1.5MB cho 1920×1080. Fallback Q=0.5 nếu >2MB.
- [x] **Không capture browser chrome**, chỉ DOM. Đủ cho bug report app screenshot.

### wincred
- [x] `github.com/danieljoos/wincred` — đơn giản, no deps, Windows-only (đúng platform target).
- [x] Size limit 2560 bytes — PAT ~80 bytes an toàn.
- [x] Last release 2022 — ổn định, chấp nhận.

---

## Risks cụ thể (mitigate trong phase tương ứng)

| # | Risk | Phase | Mitigation |
|---|---|---|---|
| R1 | GitHub PAT leak trong Worker log | 04 | Dùng wrangler secret (không hard-code), không log request body. |
| R2 | Worker rate limit bypass (user spam) | 04 | Cloudflare KV counter 5 req/min/IP. |
| R3 | Announcement fetch fail khi offline | 01 | Try/catch → ẩn im lặng, không toast. |
| R4 | Version.json fetch timeout → user không biết | 02 | Timeout 5s, fail silent. |
| R5 | Screenshot >2MB không upload được | 03 | Compress Q=0.5 fallback, nếu vẫn lỗi → submit không ảnh. |
| R6 | .exe 40-60MB upload timeout | 07 | Stream reader + progress event, không buffer toàn bộ vào RAM. |
| R7 | SHA conflict khi PUT announcement.json | 06 | Retry 1 lần (re-fetch SHA) → nếu fail lần 2 → toast lỗi. |
| R8 | PAT hết hạn 1 năm | 06-08 | 401 → toast + prompt nhập lại, xóa wincred cũ. |
| R9 | go.work commit nhầm | 05 | Thêm vào `.gitignore` (research #1). |
| R10 | WebView2 origin không khớp CORS | 04 | Worker `Allow-Origin: *` giai đoạn đầu, restrict sau. |
| R11 | Windows Defender quarantine .exe mới download | - | User guide (phase 10) hướng dẫn Allow, không mitigate được thật sự. |
| R12 | html2canvas render sai CSS filter phức tạp | 03 | Chấp nhận, fallback nút "Chọn file ảnh" manual. |

---

## Unresolved (ghi vào plan.md)

- Vị trí version UI trong app chính.
- Repo name final.
- Worker subdomain.
- Auto-login admin vs nhập lại PAT.
- Anonymous bug report có cho phép.
- Tần suất check update.
- GitHub username/email.
