# Phase 06 + 07 + 08 — Implementation Report

**Date:** 2026-04-20
**Status:** Completed — user manual tests pass (announcement save + release upload + bug resolve).

## Scope
Ship 3 admin tabs end-to-end: Thông báo (06), Bản mới (07), Báo lỗi (08). All reuse shared `githubapi` client package + credentials from phase 05.

## Files added
- `admin/internal/githubapi/client.go` (98) — HTTP helper, `ErrUnauthorized`, `ErrConflict`, `ClassifyStatus`, `NewWithClient` (inject http.Client for upload).
- `admin/internal/githubapi/contents.go` (110) — `GetJSONFile`, `UpdateJSONFile` (retry once on 409), `getSHA` (404-tolerant).
- `admin/internal/githubapi/releases.go` (147) — `CreateRelease`, `UploadAsset` (streaming, octet-stream, ContentLength set, strip upload_url template), `PublishRelease`, `DeleteRelease`.
- `admin/internal/githubapi/issues.go` (93) — `ListBugReports` (paginated, `Link: rel="next"` parse), `CloseIssue` (label + PATCH state), `CommentIssue`, `addIssueLabel`.
- `admin/internal/progress/reader.go` (43) — throttled 500ms + final-on-EOF emit.
- `admin/announcement.go` (46) — `GetAnnouncement`, `SaveAnnouncement` (server validates len ≤ 100, color ∈ red/green/black).
- `admin/release.go` (~160) — `GetLatestExe`, `GetRemoteVersion`, `PublishRelease` (5-step + rollback), `emitStatus`, `percent`. Uses separate `http.Client{Timeout:0}` for upload.
- `admin/bugs.go` (42) — `ListBugReports`, `ResolveBugReport`.
- `admin/root-resolve.go` (67) — walks exe+cwd up ≤6 levels, detects project root by `frontend/package.json + wails.json` and `base != admin`.
- `admin/frontend/src/components/color-radio-group.tsx` (45) — 3 button radio.
- `admin/frontend/src/components/announcement-preview.tsx` (52) — mimics main app `AnnouncementBar` color map.
- `admin/frontend/src/components/progress-bar.tsx` (35) — width %, MB counter.
- `admin/frontend/src/components/bug-list-item.tsx` (54) — regex user-contact parse.
- `admin/frontend/src/components/bug-detail-modal.tsx` (~190) — `react-markdown` v9 (default-safe, no `rehypeRaw`), links via `BrowserOpenURL`, inline note textarea, stopPropagation backdrop.

## Files modified
- `admin/app.go` — core shrinks, added `ghClient()`, `handleUnauthorized()`, `mainAppRoot` on startup.
- `admin/frontend/src/pages/announcement-page.tsx` (~160) — load/form/preview/submit, dirty-aware Đăng+Hoàn tác.
- `admin/frontend/src/pages/release-page.tsx` (~200) — scan info + version suggest (`bumpPatch`) + EventsOn progress/status/done + confirm dialog + `BrowserOpenURL` action.
- `admin/frontend/src/pages/bugs-page.tsx` (~115) — list + pagination + badge sync + 401 redirect.
- `admin/frontend/src/components/sidebar.tsx` — badge slot, `bugCount > 0` → pill đỏ.
- `admin/frontend/src/stores/admin-store.ts` — added `bugCount` + `setBugCount`.
- `admin/frontend/package.json` — `react-markdown@^9.0.0` (+79 packages, 0 vuln).

## Verification
- `go build ./...` (workspace) — OK.
- `go vet ./...` — OK.
- `cd admin/frontend && npx tsc --noEmit` — OK (zero errors).
- `cd admin/frontend && npm run build` — Vite OK (325KB JS / 101KB gz, +react-markdown).
- `cd admin && wails build -clean -o BangCong_Admin.exe` — 8s, exe built.

## Flow highlights
- **Auth expiry** — Go side wipes wincred via `handleUnauthorized`, frontend catches `msg.includes('unauthorized')` → `setCredsLoaded(false)` + `setSetupOpen(true)`.
- **Upload** — stream `os.Open` through `progress.Reader` → `http.Client{Timeout:0}`; progress emits throttled 500ms + final.
- **Rollback** — `DeleteRelease` used only when upload or publish fail; NOT when `version.json` update fails (release already public).
- **Markdown XSS** — `react-markdown` default sanitizer; no `rehypeRaw`; links intercepted + routed through Wails `BrowserOpenURL`.

## Not tested (need real PAT + file)
- Live `SaveAnnouncement` round-trip to GitHub (commit on announcement.json).
- Upload 40-60MB exe → verify progress throttle + release published + asset downloadable.
- 3–5 real issue feed from Worker → list render + label+close flow.
- Rollback: mid-upload network cut.

## Unresolved
- `mainAppRoot` uses heuristic walk; user could run admin.exe from arbitrary location → plan note says "config hardcode if dev time fail" (acceptable now).
- Plan phase-07 todo: test with real ~40MB build — deferred to user.
- Commit message format fixed: `chore: update announcement` / `chore: bump version X.Y.Z` — acceptable first-pass.
