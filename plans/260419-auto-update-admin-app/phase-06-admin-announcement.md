# Phase 06 — Admin Tab: Thông báo (Announcement Editor)

## Context links

- [plan.md](./plan.md)
- [phase-05-admin-app-bootstrap.md](./phase-05-admin-app-bootstrap.md)
- [research/researcher-01-external-services.md](./research/researcher-01-external-services.md) (§1 Contents API)

## Overview

- **Date:** 2026-04-19
- **Description:** Tab "Thông báo": form textarea (max 100 char) + 3 radio màu + toggle bật/tắt + preview mimic `AnnouncementBar`. Nút "Đăng" → Go backend: GET current SHA → PUT mới base64 content + SHA + message "chore: update announcement". Error 401/409 handling.
- **Priority:** Trung bình.
- **Implementation status:** Completed
- **Review status:** Completed (2026-04-20, user manual test pass)

## Key Insights

- Contents API cần SHA để tránh overwrite conflict. Flow: GET → parse SHA → PUT with SHA.
- 401 = PAT hết hạn → `DeleteCredentials` + show SetupModal.
- 409 = SHA conflict → retry 1 lần (re-fetch SHA). Unlikely (admin duy nhất) nhưng handle.
- Preview copy logic từ `AnnouncementBar` phase 01 → đồng bộ thực tế.
- Validate text ≤ 100 char fit header không break.

## Requirements

**Functional:**
- Form UI: textarea (max 100, counter `X/100`), 3 radio 🔴 Đỏ / 🟢 Xanh lá / ⚫ Đen, toggle, preview box, nút "Đăng" + "Hoàn tác".
- Mount: fetch hiện tại → populate form.
- Click Đăng: disable + spinner → `SaveAnnouncement(text, color, enabled)` → toast + reload.
- 401 → toast "Token hết hạn" + open SetupModal.
- 409 → auto-retry 1 lần → fail → toast "Xung đột, thử lại".
- Network fail → toast generic.

**Non-functional:**
- `announcement-page.tsx` ≤ 180 dòng.
- `internal/githubapi/contents.go` ≤ 150 dòng.
- `internal/githubapi/client.go` ≤ 60 dòng (reusable phase 07-08).

## Architecture

```
admin/
├─ internal/githubapi/
│   ├─ client.go     (mới, ~60 dòng — HTTP helper Do(method, path, body))
│   └─ contents.go   (mới, ~120 dòng)
│       - GetJSONFile(cl, path, outPtr) error
│       - UpdateJSONFile(cl, path, data, msg) error  (auto retry 409)
├─ app.go (edit):
│   - GetAnnouncement() (Announcement, error)
│   - SaveAnnouncement(a Announcement) error

admin/frontend/src/
├─ pages/announcement-page.tsx  (~150 dòng)
├─ components/
│   ├─ announcement-preview.tsx (~40 dòng — reuse logic)
│   └─ color-radio-group.tsx    (~30 dòng)
└─ services/github-api.ts       (edit: thêm types)
```

Flow SaveAnnouncement Go:
```
1. GET /repos/{owner}/{repo}/contents/announcement.json → sha + existing
2. PUT body {message: "chore: update announcement", content: base64(JSON), sha}
3. if 409 → retry step 1 (max 1 lần)
4. if 401 → return ErrUnauthorized
5. other err → wrap + return
```

## Related code files

- Tạo: `admin/internal/githubapi/client.go`, `contents.go`, `admin/frontend/src/components/announcement-preview.tsx`, `color-radio-group.tsx`.
- Sửa: `admin/app.go`, `admin/frontend/src/pages/announcement-page.tsx`, `services/github-api.ts` (thêm `Announcement` type).

## Implementation Steps

1. **`client.go`** (~60 dòng): struct `Client{token, owner, repo}`, `New(token, repo)` parse `owner/repo`, method `Do(method, path, body any) (*http.Response, error)` set headers `Authorization: Bearer`, `Accept: application/vnd.github+json`, `Content-Type: application/json` nếu có body. Export `var ErrUnauthorized = errors.New("unauthorized")`.
2. **`contents.go`** (~120 dòng):
   - `GetJSONFile(cl, path, out)`: GET contents → parse `{content, sha}` → base64 decode → json unmarshal vào `out`.
   - `UpdateJSONFile(cl, path, data, msg)`: marshal JSON → loop max 2:
     - GET SHA.
     - PUT body `{message, content: base64, sha}`.
     - 409 → continue loop; 401 → return `ErrUnauthorized`; 2xx → return nil; other → wrap.
3. **`admin/app.go`** thêm:
   - `type Announcement{Enabled bool, Text string, Color string}`.
   - Helper `a.client()` → load credentials → `githubapi.New(token, repo)`.
   - `GetAnnouncement()` → `GetJSONFile(cl, "announcement.json", &ann)`.
   - `SaveAnnouncement(ann)` validate server-side: `len(ann.Text) ≤ 100`, `ann.Color ∈ {red, green, black}` → `UpdateJSONFile(cl, "announcement.json", ann, "chore: update announcement")`.
4. **`color-radio-group.tsx`** (~30 dòng): props `{value, onChange}`, 3 opts với class `bg-[color:var(--danger)]` / `--success` / `black`. Radio button styled.
5. **`announcement-preview.tsx`** (~40 dòng): copy logic từ app chính `AnnouncementBar` — 3 color map, render bg-soft + text color, truncate.
6. **`announcement-page.tsx`** (~150 dòng):
   - Mount: `GetAnnouncement()` → setState.
   - Form JSX: textarea + counter + `ColorRadioGroup` + toggle + `AnnouncementPreview` + buttons.
   - Submit: `SaveAnnouncement(state)` → toast + re-fetch. Catch 401 → open SetupModal via store.
7. **Test:**
   - Mở admin tab Thông báo → form load từ remote.
   - Set text="Test", color="green", enabled=true → Đăng → toast success.
   - Verify GitHub `announcement.json` update (commit "chore: update announcement").
   - Mở app chính → banner xanh lá "Test".
   - Xóa PAT wincred manual → Đăng → 401 + setup modal.
   - Edge: text 101 char → client validate reject trước submit; server cũng reject.

## Todo list

- [ ] Viết `client.go` + `contents.go`.
- [ ] Thêm `GetAnnouncement` + `SaveAnnouncement` vào admin `app.go`.
- [ ] Viết `color-radio-group.tsx`, `announcement-preview.tsx`.
- [ ] Viết full `announcement-page.tsx` form.
- [ ] Test save 3 màu × 2 state → app chính render đúng.
- [ ] Test 401 flow + retry 409.

## Success Criteria

- [ ] Load state ban đầu OK.
- [ ] Submit 3 màu × 2 state → GitHub file update đúng.
- [ ] Commit message "chore: update announcement".
- [ ] 401 → prompt nhập PAT lại.
- [ ] Preview realtime khớp `AnnouncementBar`.
- [ ] Text >100 char → client + server reject.

## Risk Assessment

- **Low**: Contents API well-documented; retry 409 đơn giản.
- **Low**: Color enum validate cả client + server.
- **Medium**: Commit history spam — acceptable giai đoạn 1.

## Security Considerations

- PAT chỉ qua Go process, không leak frontend.
- Server validate text/color — không tin frontend.
- Path hardcode `announcement.json` → không path traversal.

## Next steps

Phase 07 (Release Publish) reuse `client.go` + stream upload binary.
