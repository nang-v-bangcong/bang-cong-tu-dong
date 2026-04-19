# Phase 05 — Admin App Bootstrap (Go Workspace + Wails init + wincred)

## Context links

- [plan.md](./plan.md)
- [reports/00-codebase-verification.md](./reports/00-codebase-verification.md)
- [research/researcher-02-wails-desktop.md](./research/researcher-02-wails-desktop.md) (§1 monorepo, §2 wincred)

## Overview

- **Date:** 2026-04-19
- **Description:** Folder `admin/` monorepo + Go workspace `go.work` + Wails v2 admin app (`BangCong_Admin`) React+TS+Tailwind. Bootstrap: sidebar 3 tab (Bản mới / Thông báo / Báo lỗi) + content area. PAT modal lần đầu: nhập PAT + repo, validate `GET /user` + `/repos/...`, lưu wincred target `BangCongAdmin/GitHubPAT`. `admin/build.bat` → `admin/build/bin/BangCong_Admin.exe`.
- **Priority:** Cao (block phase 06-08).
- **Implementation status:** Pending
- **Review status:** Pending

## Key Insights

- `go.work` link 2 module (`.` + `./admin`). Add `.gitignore` (personal per dev).
- Mỗi app có `go.mod` + `wails.json` riêng. Build: `cd admin && wails build`.
- Frontend duplicate `node_modules/` — chấp nhận (YAGNI).
- `github.com/danieljoos/wincred`: PAT ~80 bytes fit 2560 bytes.
- Bootstrap này chỉ layout + PAT flow, 3 tab là placeholder.
- `style.css` copy từ app chính → giữ CSS var đồng nhất.

## Requirements

**Functional:**
- Root: `go.work` include `.` + `./admin`.
- `admin/` có `go.mod`, `main.go`, `app.go`, `wails.json`, `frontend/` React TS.
- Window 900×600, title "Bảng Công Admin".
- Sidebar 200px: 3 button icon+text (Rocket "Bản mới", Megaphone "Thông báo", Bug "Báo lỗi") + bottom `Settings` (đổi token). Active state highlight.
- Content area: render theo tab active (placeholder "TODO: Phase 0X").
- Lần đầu run (wincred rỗng) → modal "Thiết lập lần đầu":
  - Input "Personal Access Token" (type=password).
  - Input "Repo (owner/name)" default `{owner}/bang-cong-tu-dong`.
  - Validate regex `^[\w-]+/[\w-]+$`.
  - Lưu → validate `GET /user` + `GET /repos/{owner}/{name}` (cả 2 phải 200) → `SaveCredentials` → close.
  - Fail → toast lý do (401 token sai, 404 repo sai).
- Nút Settings → `DeleteCredentials` → reopen modal.

**Non-functional:**
- Mỗi file ≤ 200 dòng.
- Module name: `github.com/{owner}/bang-cong-tu-dong/admin`.
- Admin KHÔNG dùng SQLite.

## Architecture

```
repo/
├─ go.work (mới, ~5 dòng, .gitignored)
├─ go.mod, app.go, main.go, ...  (existing main app)
├─ frontend/  (existing)
└─ admin/  (mới)
    ├─ go.mod, main.go, app.go, wails.json, build.bat
    ├─ internal/
    │   ├─ credentials/wincred-store.go  (~80 dòng)
    │   └─ githubapi/  (phase 06-08 fill)
    └─ frontend/
        ├─ package.json, vite.config.ts, tsconfig.json, tailwind.config.js, index.html
        └─ src/
            ├─ main.tsx, App.tsx, style.css (copy)
            ├─ pages/{release,announcement,bugs}-page.tsx  (stub)
            ├─ components/{sidebar,setup-modal}.tsx
            ├─ services/github-api.ts  (TS interface stub)
            └─ stores/admin-store.ts  (zustand: activeTab, loaded)
```

## Related code files (tạo mới)

- `go.work`, `.gitignore` (edit: thêm go.work, admin/build/, admin/frontend/node_modules/).
- `admin/go.mod`, `admin/main.go`, `admin/app.go`, `admin/wails.json`, `admin/build.bat`.
- `admin/internal/credentials/wincred-store.go`.
- `admin/frontend/src/App.tsx`, `components/sidebar.tsx`, `components/setup-modal.tsx`.
- `admin/frontend/src/pages/{release,announcement,bugs}-page.tsx`.
- `admin/frontend/src/services/github-api.ts`, `stores/admin-store.ts`.

## Implementation Steps

1. **Tạo admin qua wails CLI:**
   ```
   cd "d:/Dự án gốc/Bảng công tự động"
   mkdir admin && cd admin
   wails init -n BangCong_Admin -t react-ts
   ```
2. **`go.work`** ở root:
   ```
   go 1.21
   use ( . ./admin )
   ```
   Thêm vào `.gitignore`.
3. **`admin/go.mod`** rename module `github.com/{owner}/bang-cong-tu-dong/admin`.
4. **`admin/wails.json`**: `outputfilename = "BangCong_Admin"`, `info.productName = "Bảng Công Admin"`.
5. **Install dep:** `cd admin && go get github.com/danieljoos/wincred`.
6. **`wincred-store.go`** (~80 dòng): package `credentials`, 2 target const (`BangCongAdmin/GitHubPAT`, `BangCongAdmin/Repo`), struct `Credentials{Token, Repo string}`, functions `Save(c)`, `Load()`, `Delete()`. Dùng `wincred.NewGenericCredential()` + `Write()` / `GetGenericCredential()` + `Delete()`.
7. **`admin/app.go`** bind methods: `GetCredentials()`, `SaveCredentials(c)`, `DeleteCredentials()`, `ValidateCredentials(c)` (GET `/user` + `/repos/{repo}` với Bearer token, return nil nếu cả 2 status 200, else wrap error).
8. **Frontend `App.tsx`**: `useEffect` mount → `GetCredentials()` → nếu lỗi → show `SetupModal`. Sidebar + content routing theo `activeTab` từ `admin-store`.
9. **`sidebar.tsx`**: 3 button Lucide (`Rocket`, `Megaphone`, `Bug`) + bottom `Settings` → call `DeleteCredentials` + reopen modal.
10. **`setup-modal.tsx`**: input token+repo, nút Lưu → `ValidateCredentials` → `SaveCredentials` → close. Toast error 401/404.
11. **3 page stub**: `<div className="p-6"><h2>TODO: Phase 0X</h2></div>`.
12. **`github-api.ts` stub**: TS interfaces: `FileContent{content, sha}`, `Release{id, tag_name, html_url}`, `Issue{number, title, body, state, html_url}`.
13. **Copy `style.css`** từ app chính sang `admin/frontend/src/` giữ CSS var.
14. **`admin/build.bat`**: `cd /d "%~dp0" && wails build -clean -o BangCong_Admin.exe`.
15. **Test:**
    - `cd admin && wails dev` → cửa sổ 900×600 + sidebar + setup modal.
    - PAT sai → 401 toast; PAT đúng → lưu wincred, modal đóng.
    - Verify Windows Credential Manager (`control /name Microsoft.CredentialManager`) thấy target.
    - `admin/build.bat` → `.exe` ~25-40MB chạy standalone.

## Todo list

- [ ] `wails init` tạo `admin/`.
- [ ] Tạo `go.work`, update `.gitignore`.
- [ ] Rename module, config `wails.json`.
- [ ] `go get wincred`.
- [ ] Viết `wincred-store.go`.
- [ ] Viết admin `app.go` với 4 method credentials.
- [ ] Viết frontend: App.tsx, sidebar, setup-modal, 3 page stub, admin-store, github-api stub.
- [ ] Copy `style.css`.
- [ ] Build + test wincred flow.

## Success Criteria

- [ ] `go build ./admin` OK với go.work.
- [ ] Admin launch → modal setup lần đầu.
- [ ] PAT lưu đúng Windows Credential Manager.
- [ ] 3 tab click chuyển view placeholder đúng.
- [ ] `admin/build.bat` ra `.exe`.
- [ ] Không file vượt 200 dòng.

## Risk Assessment

- **Medium**: `wails init` ghi đè nhầm → làm trong folder trống `admin/`.
- **Medium**: `go.work` xung đột nếu main app có `replace` → main app hiện không có (safe).
- **Low**: wincred thread safety undocumented — admin đơn luồng UI → OK.
- **Low**: Frontend `node_modules` duplicate ~200MB — acceptable.

## Security Considerations

- PAT stored wincred only, không file text.
- Password input type=password mask.
- `DeleteCredentials` khi đổi token.
- Repo format validate regex `^[\w-]+/[\w-]+$`.

## Next steps

Phase 06 tab Thông báo — đơn giản nhất, PUT JSON.
