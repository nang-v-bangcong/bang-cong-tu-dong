# Phase 09 — Build Automation (Version Bump Script + Claude Workflow)

## Context links

- [plan.md](./plan.md)
- [phase-02-version-check.md](./phase-02-version-check.md) (CURRENT_VERSION)
- [phase-07-admin-release-publish.md](./phase-07-admin-release-publish.md) (admin publish flow)

## Overview

- **Date:** 2026-04-19
- **Description:** Node script `scripts/bump-version.js` đọc `frontend/src/constants/version.ts`, tăng patch mặc định (`--minor`/`--major` override), ghi lại file + update `wails.json` `info.productVersion` + `versioninfo.json` FixedFileInfo. Không auto-commit. Sửa `build.bat` để call script trước `wails build`. Doc `docs/build-process.md` để Claude Code reference khi user nói "build cập nhật đi".
- **Priority:** Thấp (QoL, sau khi admin ship).
- **Implementation status:** Completed
- **Review status:** Completed

## Key Insights

- Recommend Node vì project đã có Node (frontend npm). PowerShell script cũng OK nhưng kém portable.
- 3 file cần sync version:
  - `frontend/src/constants/version.ts`: `export const CURRENT_VERSION = "1.0.0"`
  - `wails.json`: `info.productVersion`
  - `versioninfo.json`: `FixedFileInfo.FileVersion` + `ProductVersion` (4 số Major/Minor/Patch/Build)
- Regex-based edit đủ cho phase này (YAGNI, không cần AST parser).
- Claude workflow: trigger phrase "build cập nhật đi" → đọc `docs/build-process.md` → thực thi sequence.

## Requirements

**Functional:**
- `scripts/bump-version.js` chạy bằng `node scripts/bump-version.js [--patch|--minor|--major]`.
- Mặc định `--patch`.
- Đọc current version từ `frontend/src/constants/version.ts`.
- Parse `X.Y.Z`, increment đúng segment.
- Ghi đè vào 3 file:
  - `version.ts`: replace const literal.
  - `wails.json`: update `info.productVersion`.
  - `versioninfo.json`: update `FixedFileInfo.FileVersion` + `ProductVersion` (Major, Minor, Patch giữ Build=0).
- Print: `v1.0.0 → v1.0.1 (3 files updated)`.
- Exit 0 on success, 1 on error.
- KHÔNG auto-commit (user tự quyết).
- `build.bat` update: `node scripts/bump-version.js --patch && wails build -clean`.
  - Optional: flag `BUMP_SKIP=1` để skip bump (build dev không bump).
- `docs/build-process.md` (~80 dòng): hướng dẫn Claude workflow:
  - Phrase trigger: "build cập nhật đi", "phát hành bản mới"
  - Steps Claude thực thi:
    1. Run `node scripts/bump-version.js --patch` (hoặc user chỉ định)
    2. Confirm version mới với user qua chat
    3. Run `wails build -clean`
    4. Kiểm tra `build/bin/BangCong.exe` tồn tại
    5. Instruct user mở admin app + publish

**Non-functional:**
- `bump-version.js` ≤ 120 dòng.
- `docs/build-process.md` ≤ 100 dòng, tiếng Việt.
- Không thêm dependency Node (dùng native `fs`, `path`).

## Architecture

```
repo/
├─ scripts/
│   └─ bump-version.js            (mới, ~100 dòng)
├─ build.bat                      (edit: call bump trước wails build)
└─ docs/
    └─ build-process.md           (mới, ~80 dòng — workflow cho Claude + user)
```

Pseudo `bump-version.js`:
```js
const fs = require("fs")
const path = require("path")

function bump(current, type) {
  const [maj, min, pat] = current.split(".").map(Number)
  if (type === "major") return `${maj+1}.0.0`
  if (type === "minor") return `${maj}.${min+1}.0`
  return `${maj}.${min}.${pat+1}`
}

const type = process.argv[2]?.replace("--", "") || "patch"

// 1. read version.ts
const versionFile = path.join("frontend", "src", "constants", "version.ts")
const versionSrc = fs.readFileSync(versionFile, "utf8")
const match = versionSrc.match(/CURRENT_VERSION\s*=\s*"([\d.]+)"/)
if (!match) { console.error("version const not found"); process.exit(1) }
const current = match[1]
const next = bump(current, type)

// 2. write version.ts
fs.writeFileSync(versionFile, versionSrc.replace(match[0], `CURRENT_VERSION = "${next}"`))

// 3. wails.json
const wails = JSON.parse(fs.readFileSync("wails.json", "utf8"))
wails.info.productVersion = next
fs.writeFileSync("wails.json", JSON.stringify(wails, null, 2) + "\n")

// 4. versioninfo.json
const vi = JSON.parse(fs.readFileSync("versioninfo.json", "utf8"))
const [maj, min, pat] = next.split(".").map(Number)
vi.FixedFileInfo.FileVersion = { Major: maj, Minor: min, Patch: pat, Build: 0 }
vi.FixedFileInfo.ProductVersion = { Major: maj, Minor: min, Patch: pat, Build: 0 }
fs.writeFileSync("versioninfo.json", JSON.stringify(vi, null, 2) + "\n")

console.log(`v${current} → v${next} (3 files updated)`)
```

## Related code files

- Tạo mới:
  - `d:/Dự án gốc/Bảng công tự động/scripts/bump-version.js`
  - `d:/Dự án gốc/Bảng công tự động/docs/build-process.md`
- Sửa:
  - `d:/Dự án gốc/Bảng công tự động/build.bat`
  - `d:/Dự án gốc/Bảng công tự động/build-installer.bat` (optional, nếu cũng muốn bump)

## Implementation Steps

1. **Viết `scripts/bump-version.js`** theo template trên.
2. **Test script:**
   - `node scripts/bump-version.js --patch` → verify 3 file update đúng.
   - `git diff` check không break format JSON.
   - Test `--minor` và `--major`.
3. **`build.bat`** update (giữ UTF-8 cho output Việt):
   ```bat
   @echo off
   chcp 65001 >nul
   if "%BUMP_SKIP%"=="" (
     node scripts/bump-version.js --patch
     if errorlevel 1 exit /b 1
   )
   wails build -clean
   ```
4. **`docs/build-process.md`** (~80 dòng):
   - Section 1: "Quy trình phát hành bản mới" — list 5 bước (bump → build → admin → publish → done).
   - Section 2: "Claude workflow" — khi user nói gì, Claude làm gì.
   - Section 3: "Manual workflow" — nếu tự làm không qua Claude.
   - Section 4: "Troubleshoot" — lỗi thường gặp.
5. **Optional**: tạo Claude slash command `/publish-update` nếu skill `claude-code` cho phép custom command. Nếu không → doc trong `docs/build-process.md` là đủ (Claude đọc file này và follow).
6. **Test full flow:**
   - User nói "build cập nhật đi".
   - Claude đọc `docs/build-process.md`.
   - Claude chạy `node scripts/bump-version.js --patch` → output `v1.0.0 → v1.0.1`.
   - Claude hỏi confirm → user OK.
   - Claude chạy `wails build -clean` → verify `build/bin/BangCong.exe` exists.
   - Claude instruct user mở admin app → tab Bản mới → Đăng.
   - Admin hiển thị "Version đề xuất v1.0.1" (đúng vì script đã bump).
   - User click Đăng → phase 07 flow → done.

## Todo list

- [x] Viết `bump-version.js` (72 dòng, native fs/path, no deps).
- [x] Test 3 flag (patch → 1.0.1, minor → 1.1.0, major → 2.0.0 — all verified).
- [x] Edit `build.bat` (thêm step bump + `BUMP_SKIP` gate, chcp 65001 UTF-8).
- [x] Viết `docs/build-process.md` tiếng Việt (102 dòng, 5 section).
- [ ] Test full flow từ "build cập nhật đi" → admin publish (cần user verify thực tế khi build bản mới).
- [ ] (Optional) Custom slash command trong `.claude/commands/` — skip, doc đủ.

## Success Criteria

- [ ] Script bump 3 file nhất quán.
- [ ] `build.bat` chạy bump rồi build, không hỏi gì.
- [ ] `BUMP_SKIP=1 build.bat` skip bump (dùng cho dev test).
- [ ] Admin app hiển thị version bumped sau build.
- [ ] Doc tiếng Việt đủ chi tiết để Claude follow được.

## Risk Assessment

- **Low**: Regex replace đơn giản, test 3 flag là đủ.
- **Medium**: JSON format không preserve comment (wails.json/versioninfo.json không có comment → OK).
- **Low**: Forget `--patch` flag → default patch OK.
- **Medium**: User chạy script 2 lần liên tiếp → version bump thêm 1 lần nữa. Mitigate: script không có protection, nhưng `git diff` visible.

## Security Considerations

- Script local-only, không network.
- Không inject user input (chỉ đọc argv flag).
- Không chạy elevated.

## Next steps

Phase 10 (user guide) cuối cùng — write tiếng Việt, screenshot UI final.
