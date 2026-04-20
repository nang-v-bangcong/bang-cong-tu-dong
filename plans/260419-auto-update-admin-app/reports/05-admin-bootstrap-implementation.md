# Phase 05 — Implementation Report

**Date:** 2026-04-19
**Status:** Implementation done, review pending.

## Changes

- `go.work` root: `use ( . ./admin )` (ignored, go 1.25.0).
- `.gitignore`: +`admin/frontend/node_modules/`, +`admin/frontend/dist/`.
- `admin/` via `wails init -n BangCong_Admin -t react-ts` (moved up from nested `BangCong_Admin/`).
- `admin/go.mod` module → `github.com/nang-v-bangcong/bang-cong-tu-dong/admin`.
- `admin/wails.json`: productName "Bảng Công Admin", info block.
- `admin/main.go`: 900×600, min 800×500, Title "Bảng Công Admin", bg light.
- `admin/app.go`: 4 methods `GetCredentials/SaveCredentials/DeleteCredentials/ValidateCredentials` + `http.Client` ping `/user` + `/repos/{repo}`.
- `admin/internal/credentials/wincred-store.go` (85 dòng): `Save/Load/Delete` + `Validate()` regex `^[\w.-]+/[\w.-]+$`, targets `BangCongAdmin/GitHubPAT` + `BangCongAdmin/Repo`.
- Admin frontend deps: zustand, sonner, lucide-react, tailwindcss v4 (match main app).
- `admin/frontend/src/`: App.tsx (41), components/sidebar.tsx (72), components/setup-modal.tsx (95), stores/admin-store.ts (23), services/github-api.ts (24), pages/{release,announcement,bugs}-page.tsx (10 each), style.css (56). All ≤ 200 dòng.
- `admin/build.bat`.
- Regenerated wailsjs bindings via `wails generate module`.

## Verification

- `go build ./...` from root (workspace) — OK.
- `npm install` admin frontend — 87 packages, 0 vulnerabilities.
- `npx tsc --noEmit` — OK.
- `npm run build` — Vite OK (188KB JS gzipped 59KB).
- `wails build -clean -o BangCong_Admin.exe` — OK, 11MB `.exe` tại `admin/build/bin/`.

## Not tested (manual, need user)

- Actual PAT validation round-trip (need real PAT).
- Wincred Save → Credential Manager entry visual check.
- Sidebar active state visual + Settings flow.

## Unresolved

- Admin app có nên auto-detect update của chính nó? (plan non-goals: không — admin rebuild manual). Giữ nguyên.
- Chưa có icon/title bar cho admin (dùng default Wails icon).
