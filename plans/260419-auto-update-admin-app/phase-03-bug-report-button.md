# Phase 03 — Bug Report Button + Dialog

## Context links

- [plan.md](./plan.md)
- [phase-04-cloudflare-worker.md](./phase-04-cloudflare-worker.md) (endpoint URL)
- [reports/00-codebase-verification.md](./reports/00-codebase-verification.md) (R5, R12)
- [research/researcher-02-wails-desktop.md](./research/researcher-02-wails-desktop.md) (§3 html2canvas)

## Overview

- **Date:** 2026-04-19
- **Description:** Icon `Bug` (Lucide) vào header trước HelpButton, mở dialog form nhập mô tả + (optional) screenshot (html2canvas hoặc upload file) + (optional) userContact. Auto kèm version/os/timestamp. POST lên Worker phase 04. Toast success/error.
- **Priority:** Cao.
- **Implementation status:** Completed (2026-04-19) — production build `BangCong.exe` 9.7s pass, user e2e test OK từ app thật.
- **Review status:** Completed — issue #6/#7 GitHub có đầy đủ title `[Bug]`, label `bug-report`, metadata (contact/version 1.0.0/OS `windows amd64 (production)`/timestamp), mô tả, screenshot embed raw URL.

## Implementation summary (2026-04-19)

- `app.go`: thêm `GetOSInfo()` → `fmt.Sprintf("%s %s (%s)", env.Platform, env.Arch, env.BuildType)` qua `runtime.Environment(ctx)`. Import `fmt`. Binding regen thủ công (App.d.ts + App.js) để tsc pass trước khi wails dev regen chính thức.
- `frontend/package.json`: `html2canvas@^1.4.1` (+5 packages). Bundle 527KB → 572KB (+45KB, acceptable).
- `frontend/src/services/bug-report-service.ts` (60 dòng): `captureScreenshot()` html2canvas scale=1 useCORS JPEG Q=0.7 → retry Q=0.5 nếu >2.7M chars. `readFileAsDataUrl()` FileReader. `submitBugReport()` fetch POST BUG_REPORT_URL, parse `{error}` body khi fail.
- `frontend/src/components/bug-report-dialog.tsx` (148 dòng): overlay click-outside + ESC (disabled khi loading). State description/userContact/screenshot/loading/capturing. Nút Chụp → `visibility:hidden` dialog 250ms → captureScreenshot → unhide. Nút Chọn ảnh → file input. Preview 150×100 + X xóa. Warning icon AlertTriangle về upload public. Nút Gửi disabled khi description rỗng.
- `frontend/src/components/bug-report-button.tsx` (20 dòng): icon `Bug` lucide + state open, pattern y hệt `help-button.tsx`.
- `frontend/src/components/header.tsx`: import + `<BugReportButton/>` trước `<HelpButton/>`.

**User actions còn lại (sau khi Worker deploy xong phase 04):**
1. Kill + restart `wails dev` → test 6 scenario trong plan step 7.
2. Verify bundle size chấp nhận được, tối ưu sau nếu cần.

## Key Insights

- Insert position: trước HelpButton (header.tsx:89).
- Dialog pattern dùng `help-dialog.tsx` làm template.
- `html2canvas` ~45KB gzipped, add vào `frontend/package.json`.
- Go method mới `GetOSInfo()` dùng `runtime.Environment(ctx)` — trả `Platform Arch (BuildType)`.
- Screenshot base64 data URI gửi trực tiếp JSON — Worker decode upload GitHub.
- Fallback: `<input type=file accept=image/*>` nếu html2canvas fail.

## Requirements

**Functional:**
- Icon Bug trong header → click mở dialog.
- Dialog fields:
  - Textarea "Mô tả vấn đề" (required, max 5000 char).
  - Screenshot group: nút "Chụp màn hình" (html2canvas) + nút "Chọn ảnh" (file input) + preview 150×100 + X remove.
  - Input "Tên/SĐT (không bắt buộc)".
  - Warning: "Ảnh sẽ lưu công khai trên GitHub, vui lòng không chụp thông tin nhạy cảm".
  - Nút "Gửi" (disabled nếu description rỗng) + "Hủy".
- Screenshot compress JPEG Q=0.7, fallback Q=0.5 nếu base64 >2.7MB.
- Auto-collect: `CURRENT_VERSION` const, `await GetOSInfo()`, `new Date().toISOString()`.
- Submit: POST `BUG_REPORT_URL` JSON. Success → toast "Đã gửi báo lỗi" + action "Xem issue" (OpenURL). Fail → toast error.
- ESC đóng (trừ khi đang submit).

**Non-functional:**
- `bug-report-dialog.tsx` ≤ 200 dòng.
- `bug-report-service.ts` ≤ 80 dòng.
- Thêm dep: `html2canvas@^1.4.1`.

## Architecture

```
frontend/src/
├─ components/
│   ├─ header.tsx               (edit: <BugReportButton/> trước <HelpButton/>)
│   ├─ bug-report-button.tsx    (mới, ~30 dòng)
│   └─ bug-report-dialog.tsx    (mới, ~180 dòng)
├─ services/bug-report-service.ts  (mới, ~60 dòng)
└─ constants/remote-config.ts   (đã có BUG_REPORT_URL từ phase 01)

app.go (edit: GetOSInfo method)
```

Data flow submit: fill → Gửi → compressScreenshot → GetOSInfo → fetch POST Worker → ok toast + action / fail toast error.

## Related code files

- Tạo: `frontend/src/components/bug-report-button.tsx`, `bug-report-dialog.tsx`, `services/bug-report-service.ts`.
- Sửa: `frontend/src/components/header.tsx`, `frontend/package.json`, `app.go`.

## Implementation Steps

1. `cd frontend && npm install html2canvas@^1.4.1`.
2. **`app.go`** thêm `GetOSInfo() string`:
   ```go
   env := runtime.Environment(a.ctx)
   return fmt.Sprintf("%s %s (%s)", env.Platform, env.Arch, env.BuildType)
   ```
   Regen binding: chạy `wails dev` 1 lần.
3. **`bug-report-service.ts`** (~60 dòng):
   - Export `BugPayload` interface {description, userContact?, screenshot?, version, os, timestamp}.
   - `captureScreenshot()`: `html2canvas(document.body, {scale:1, useCORS:true, logging:false})` → `toDataURL("image/jpeg", 0.7)`; nếu `length > 2_700_000` → retry Q=0.5.
   - `submitBugReport(p)`: POST `BUG_REPORT_URL` JSON, throw nếu `!res.ok` (parse error body), return `{success, issue_url}`.
4. **`bug-report-dialog.tsx`** (~180 dòng): copy pattern `help-dialog.tsx` (overlay + ESC + click-outside). State: description/userContact/screenshot(base64|null)/loading. Nút "Chụp màn hình" → hide dialog bằng `visibility:hidden` 250ms → captureScreenshot → unhide + setScreenshot. Nút "Chọn ảnh" → file input → FileReader → base64. Submit → `submitBugReport` → toast + close khi success.
5. **`bug-report-button.tsx`** (~30 dòng): icon `Bug` lucide + state `open` + render `<BugReportDialog onClose={...}/>` khi open. Title tooltip "Báo lỗi".
6. **`header.tsx`**: import + insert `<BugReportButton/>` trước `<HelpButton/>` dòng 89.
7. **Test 6 scenario:** (a) empty → Gửi disabled; (b) capture → preview thumbnail; (c) file upload → preview; (d) submit OK → network POST Worker + toast + click mở issue; (e) offline → toast error; (f) rate limit 6 req/min → 429.

## Todo list

- [ ] `npm install html2canvas`.
- [ ] Thêm `GetOSInfo` vào `app.go` + regen binding.
- [ ] Viết `bug-report-service.ts`, `bug-report-dialog.tsx`, `bug-report-button.tsx`.
- [ ] Edit `header.tsx`.
- [ ] Test 6 scenario.
- [ ] `wails build` pass, bundle +45KB acceptable.

## Success Criteria

- [ ] Icon Bug trước HelpButton.
- [ ] Dialog validate đúng (Gửi disabled khi rỗng).
- [ ] Screenshot capture + preview OK.
- [ ] Submit success → issue tạo GitHub + toast có link.
- [ ] Offline/error → toast error rõ lý do.
- [ ] File ≤ 200 dòng.

## Risk Assessment

- **Medium**: html2canvas fail render CSS phức tạp (R12) → fallback file input.
- **Medium**: Screenshot chứa PII (R5) → warning text rõ ràng, chấp nhận user tự chịu.
- **Low**: Bundle +45KB acceptable.
- **Low**: Worker down → toast error, thử lại sau.

## Security Considerations

- Warning text rõ ràng về upload public.
- Không tự auto-redact info (YAGNI).
- CORS đã mở từ Worker phase 04.
- Không lưu form state qua session.

## Next steps

Phase 05 bootstrap admin app.
