# Phase 02 — Version Check + Toast Update Notify

## Context links

- [plan.md](./plan.md)
- [reports/00-codebase-verification.md](./reports/00-codebase-verification.md)
- [research/researcher-01-external-services.md](./research/researcher-01-external-services.md) (§3 semver)
- [research/researcher-02-wails-desktop.md](./research/researcher-02-wails-desktop.md) (§4 BrowserOpenURL)

## Overview

- **Date:** 2026-04-19
- **Description:** Tạo version const + `version-service.ts` fetch `version.json`, semver compare ~15 dòng. Nếu remote > current → `toast.info` có action "Tải về" → gọi Go `OpenURL` dùng `runtime.BrowserOpenURL` mở releases page. Hiển thị version footer góc phải (recommend — Unresolved nếu chưa chốt).
- **Priority:** Cao.
- **Implementation status:** Completed (2026-04-19)
- **Review status:** Completed (2026-04-19 — user test 5 scenario pass; version footer UI hoãn chờ user chốt vị trí)

## Key Insights

- Verification: KHÔNG có version const trong code → tạo mới `frontend/src/constants/version.ts`.
- Bump script phase 09 auto-update file này đồng bộ `wails.json` + `versioninfo.json`.
- Sonner v2 support `action: {label, onClick}`.
- Go `OpenURL(url string) error` validate http/https prefix, dùng `runtime.BrowserOpenURL(a.ctx, url)`.
- Cache 5 phút (decision #6).

## Requirements

**Functional:**
- `constants/version.ts`: `export const CURRENT_VERSION = "1.0.0"`.
- `version-service.ts`: fetch `version.json`, compare với current.
- Remote > current → `toast.info("Phiên bản mới X.Y.Z", {description: changelog, action: {label: "Tải về", onClick: OpenURL}, duration: 10000})`.
- Remote ≤ current → không toast.
- Fetch fail → silent.
- Version UI footer góc phải (optional, user chốt sau).

**Non-functional:**
- Semver 3 số major.minor.patch, ignore pre-release tag.
- Go `OpenURL` validate scheme `https://` hoặc `http://` tránh injection.

## Architecture

```
frontend/src/
├─ constants/version.ts           (mới, 1 dòng)
├─ services/version-service.ts    (mới, ~70 dòng)
│   ├─ compareSemver(a, b): -1|0|1
│   ├─ getRemoteVersion(): Promise<VersionInfo|null>
│   └─ checkForUpdate(): Promise<{hasUpdate, remote}>
└─ App.tsx (edit: useEffect mount → check → toast)

app.go (edit: OpenURL method)
```

## Related code files

- Tạo: `frontend/src/constants/version.ts`, `services/version-service.ts`.
- Sửa: `app.go` (add `OpenURL`), `frontend/src/App.tsx` (add useEffect).
- Optional: footer UI sau khi user chốt vị trí.

## Implementation Steps

1. **`version.ts`**: `export const CURRENT_VERSION = "1.0.0"`.
2. **`version-service.ts`** (~70 dòng):
   - Interface `VersionInfo{version, download_url, changelog}`.
   - `compareSemver(a, b)`: parse strip `v` prefix → `split(".")` → `parseInt`; loop 3 segment return -1/0/1.
   - Cache module-level `{data, ts}` 5 phút.
   - `getRemoteVersion()`: cache check → fetch `VERSION_URL` với AbortController 5s timeout → parse JSON → cache → return; catch → cache null → return null.
   - `checkForUpdate()`: `remote = await getRemoteVersion()` → if null → `{hasUpdate: false}` → else `hasUpdate = compareSemver(remote.version, CURRENT_VERSION) === 1` → return.
3. **`app.go`** thêm sau `Quit`:
   ```go
   func (a *App) OpenURL(url string) error {
     if !strings.HasPrefix(url, "https://") && !strings.HasPrefix(url, "http://") {
       return errors.New("invalid url scheme")
     }
     runtime.BrowserOpenURL(a.ctx, url)
     return nil
   }
   ```
   Chạy `wails dev` regen binding `wailsjs/go/main/App.d.ts`.
4. **`App.tsx`** thêm useEffect gần darkMode effect:
   ```tsx
   useEffect(() => {
     checkForUpdate().then(r => {
       if (r.hasUpdate && r.remote) {
         toast.info(`Phiên bản mới ${r.remote.version}`, {
           description: r.remote.changelog || "Nhấn Tải về để cập nhật",
           action: { label: "Tải về", onClick: () => OpenURL(r.remote!.download_url || REPO_RELEASES_URL) },
           duration: 10000,
         })
       }
     })
   }, [])
   ```
5. **Version UI footer** (optional, chờ user chốt): tạo `footer.tsx` ~30 dòng `<div className="fixed bottom-1 right-2 text-xs text-[color:var(--text-muted)]">v{CURRENT_VERSION}</div>` hoặc thêm vào `help-dialog.tsx` cuối.
6. **Test 5 case:**
   - current=0.9.0, remote=1.0.0 → toast.
   - current=remote=1.0.0 → không toast.
   - current=1.1.0, remote=1.0.0 → không toast.
   - current=1.0.0, remote=2.0.0 → toast + click action → browser mở releases page.
   - Offline → không toast, không crash.

## Todo list

- [x] Tạo `version.ts` const.
- [x] Tạo `version-service.ts` với compareSemver + cache.
- [x] Thêm `OpenURL` vào `app.go`, regen binding (stub .d.ts/.js, wails sẽ overwrite khi `wails dev`).
- [x] Edit `App.tsx` useEffect + toast action.
- [ ] (Optional) UI version footer sau user chốt.
- [x] Test 5 scenario. (user verify 2026-04-19 — pass: toast hiện đúng, nút Tải về mở browser)

## Success Criteria

- [ ] Remote > current → toast có action button.
- [ ] Remote ≤ current → không toast.
- [ ] Click action → browser mở URL đúng.
- [ ] Offline không crash.
- [ ] `wails build` pass, binding mới.

## Risk Assessment

- **Low**: Semver 15 dòng, test 5 case đủ.
- **Low (mitigated)**: URL injection `download_url` → `OpenURL` validate scheme.
- **Medium**: User quên update `CURRENT_VERSION` khi bump → toast hiện lại cho user đã có bản mới. Mitigate phase 09 script auto-update.

## Security Considerations

- `OpenURL` validate scheme (http/https only).
- `download_url` remote → chỉ mở browser, không exec.
- `changelog` render qua toast description (text, không HTML) → XSS-free.

## Next steps

Phase 04 (Worker) trước phase 03 để có endpoint live.
