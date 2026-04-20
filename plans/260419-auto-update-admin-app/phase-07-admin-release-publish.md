# Phase 07 — Admin Tab: Bản mới (Release Publish)

## Context links

- [plan.md](./plan.md)
- [phase-05-admin-app-bootstrap.md](./phase-05-admin-app-bootstrap.md)
- [phase-06-admin-announcement.md](./phase-06-admin-announcement.md) (reuse client.go)
- [research/researcher-01-external-services.md](./research/researcher-01-external-services.md) (§1 Releases API)
- [research/researcher-02-wails-desktop.md](./research/researcher-02-wails-desktop.md) (§5 stream upload)

## Overview

- **Date:** 2026-04-19
- **Description:** Tab "Bản mới": hiển thị version hiện tại + đề xuất (patch+1, editable). Scan `../build/bin/*.exe` ModTime mới nhất. Upload: create draft → stream asset có progress event → publish → update `version.json`. Frontend progress bar %.
- **Priority:** Trung bình.
- **Implementation status:** Completed
- **Review status:** Completed (2026-04-20, user manual test pass)

## Key Insights

- Releases API: POST `/releases` tạo draft → `upload_url` template → POST binary với `Content-Type: application/octet-stream`.
- File .exe 40-60MB — PHẢI stream, không `ReadAll` (OOM/slow).
- Progress: custom `io.Reader` wrapper đếm bytes + throttle 500ms callback.
- Path scan: `a.mainAppRoot` resolve ở `startup` → `filepath.Join(root, "build", "bin")`.
- `version.json` update: `download_url` = asset `browser_download_url`, `version` = tag bỏ `v`, `changelog` từ input.
- Confirm dialog trước upload.

## Requirements

**Functional:**
- On mount: fetch `version.json` → hiện "Bản trên GitHub: v{X.Y.Z}". Scan exe → "File mới nhất: BangCong.exe ({size}MB, {mtime})". Auto-suggest patch+1 editable. Textarea "Changelog (optional)".
- Buttons: "Đăng bản mới", "Scan lại file".
- Click Đăng:
  - Confirm dialog "Xác nhận đăng v{X.Y.Z}?".
  - Disable button + progress bar 0-100%.
  - Status text theo step: "Đang tạo release..." → "Đang upload {X}/{Y} MB ({N}%)..." → "Đang publish..." → "Đang cập nhật version.json...".
  - Success: toast + action "Xem trên GitHub" (OpenURL html_url).
  - Fail: rollback (delete draft), toast lý do.

**Non-functional:**
- `release-page.tsx` ≤ 180 dòng.
- `internal/githubapi/releases.go` ≤ 150 dòng.
- Progress throttle 500ms.

## Architecture

```
admin/
├─ internal/githubapi/releases.go (mới, ~150 dòng)
│   - CreateRelease(cl, tag, name, body, draft) (Release, error)
│   - UploadAsset(cl, uploadURL, filePath, onProgress) (assetURL, error)
│   - PublishRelease(cl, id) error
│   - DeleteRelease(cl, id) error (rollback)
├─ internal/progress/reader.go (mới, ~40 dòng)
│   - ProgressReader wraps io.Reader + throttled event emit
├─ app.go (edit):
│   - GetLatestExe() (ExeInfo, error)
│   - GetRemoteVersion() (VersionInfo, error)
│   - PublishRelease(version, changelog string) error

admin/frontend/src/
├─ pages/release-page.tsx  (~170 dòng)
└─ components/progress-bar.tsx  (~20 dòng)
```

Go flow:
1. `CreateRelease(tag="v"+ver, name="Bản "+ver, body=changelog, draft=true)` → `rel`.
2. `UploadAsset(uploadURL, exe.Path, cb)` → `cb` emit `runtime.EventsEmit(ctx, "release-upload-progress", {read, total, percent})`.
3. Nếu fail upload → `DeleteRelease(rel.ID)` rollback → return err.
4. `PublishRelease(rel.ID)` → PATCH `draft: false`. Fail → rollback + return.
5. `UpdateJSONFile("version.json", {version, download_url, changelog}, "chore: bump version "+ver)`.

## Related code files

- Tạo: `admin/internal/githubapi/releases.go`, `admin/internal/progress/reader.go`, `admin/frontend/src/components/progress-bar.tsx`.
- Sửa: `admin/app.go`, `admin/frontend/src/pages/release-page.tsx`.

## Implementation Steps

1. **`progress/reader.go`** (~40 dòng): struct `ProgressReader{R io.Reader, Total int64, Read int64, OnProgress func(read, total int64), lastEmit time.Time}`. Method `Read(b)` → `n, err = p.R.Read(b)` → `p.Read += int64(n)` → nếu `time.Since(p.lastEmit) > 500ms` → `OnProgress(p.Read, p.Total)` + update lastEmit. Emit final 1 lần khi EOF.
2. **`githubapi/releases.go`** (~150 dòng):
   - `CreateRelease(cl, tag, name, body, draft)` → POST `/repos/{owner}/{repo}/releases` body `{tag_name, name, body, draft}` → parse `{id, upload_url, html_url}`.
   - `UploadAsset(cl, uploadURL, filePath, cb)`:
     - `os.Open` + `Stat` size.
     - Wrap `ProgressReader` với OnProgress=cb.
     - Strip `{?name,label}` khỏi uploadURL, append `?name=BangCong.exe`.
     - `http.NewRequest(POST, url, reader)` + `Content-Type: application/octet-stream` + Auth + `Content-Length: size`.
     - `http.Client{Timeout: 0}.Do(req)` → parse `browser_download_url`.
   - `PublishRelease(cl, id)` → PATCH `/releases/{id}` body `{draft: false}`.
   - `DeleteRelease(cl, id)` → DELETE `/releases/{id}`.
3. **`admin/app.go`** thêm:
   - `startup` resolve `a.mainAppRoot`: `wd, _ := os.Getwd(); a.mainAppRoot = filepath.Dir(wd)` (nếu admin chạy từ `admin/`) hoặc absolute hardcode config.
   - `type ExeInfo{Path, Name string; Size int64; ModTime string}`.
   - `GetLatestExe()`: `dir := filepath.Join(a.mainAppRoot, "build", "bin")` → `os.ReadDir` → loop entries `.exe` → pick latest ModTime → return `ExeInfo{Path, Name, Size, ModTime.RFC3339}`. Error nếu không có.
   - `GetRemoteVersion()` → `GetJSONFile(cl, "version.json", &vi)`.
   - `PublishRelease(version, changelog)` theo flow 5 bước trên.
4. **`release-page.tsx`** (~170 dòng):
   - Mount: `GetRemoteVersion()` + `GetLatestExe()` → hiện info.
   - Parse current version → patch+1 → state editable `nextVersion`.
   - `EventsOn("release-upload-progress", e => setProgress(e.percent))`.
   - Confirm dialog đơn giản inline (hoặc reuse pattern app chính).
   - Submit: `PublishRelease(nextVersion, changelog)` → toast + reload version.
5. **`progress-bar.tsx`** (~20 dòng): `<div className="h-2 bg-muted rounded"><div style={{width:`${p}%`}} className="h-full bg-primary rounded transition-all"/></div>` + text `{Math.floor(read/1e6)} / {Math.floor(total/1e6)} MB`.
6. **Test:**
   - `wails build` app chính → có `build/bin/BangCong.exe` thật.
   - Admin tab Bản mới → info file + version suggest.
   - Đăng → confirm → progress 0→100% → toast success.
   - GitHub Releases page: release mới + asset download được.
   - `version.json` update (commit "chore: bump version X.Y.Z").
   - App chính phase 02 → toast update xuất hiện.
   - Rollback test: disconnect mid-upload → release draft biến mất.

## Todo list

- [ ] Viết `progress/reader.go` throttle 500ms.
- [ ] Viết `githubapi/releases.go` 4 function.
- [ ] Admin `app.go` thêm `GetLatestExe`, `GetRemoteVersion`, `PublishRelease`.
- [ ] Viết `release-page.tsx` full UI + subscribe event.
- [ ] Viết `progress-bar.tsx`.
- [ ] Test full flow với file thật ~40MB.
- [ ] Test rollback khi fail.

## Success Criteria

- [ ] Upload binary 40-60MB mượt, progress chạy đúng.
- [ ] Release tag `v{X.Y.Z}`, published.
- [ ] `browser_download_url` lưu `version.json`.
- [ ] App chính notify update ngay sau publish.
- [ ] Fail → rollback, không để draft mồ côi.

## Risk Assessment

- **High (mitigated)**: Upload timeout → `http.Client.Timeout = 0` + stream reader.
- **Medium**: Rollback fail khi network down hoàn toàn → user tự xóa manual. Ghi guide phase 10.
- **Medium**: Progress miss final 100% → emit final 1 lần khi EOF.
- **Low**: Path `GetLatestExe` sai → config hardcode, kiểm tra dev time.

## Security Considerations

- `filePath` từ server-side `GetLatestExe`, không nhận user input (no path traversal).
- Changelog → GitHub body markdown, không exec shell.
- PAT qua `Client`, không log.
- `Content-Length` set đúng để GitHub không stream lỗi.

## Next steps

Phase 08 (Bug List) read-heavy, đơn giản hơn. Reuse `client.Do`.
