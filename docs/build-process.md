# Quy trình phát hành bản mới

> Dành cho Claude Code + chủ app. Tổng thời gian: 2–5 phút.

---

## 1. Tổng quan 5 bước

1. **Bump version** — tăng số version (patch mặc định).
2. **Build exe** — `wails build -clean` ra `build/bin/BangCong.exe`.
3. **Mở admin app** — `admin/build/bin/BangCong_Admin.exe`.
4. **Tab "Bản mới" → Đăng** — admin upload exe + tạo GitHub release + update `version.json`.
5. **Verify** — ae mở app chính thấy toast "Có bản mới".

Cache 5 phút (GitHub Contents API) nên ae có thể nhận notify chậm nhất 5 phút sau publish.

---

## 2. Claude workflow (tự động)

**Trigger phrases:**
- "build cập nhật đi"
- "phát hành bản mới"
- "ra bản vá"

**Claude thực thi tuần tự:**

```
Step 1: node scripts/bump-version.js --patch
  → print "v1.0.0 -> v1.0.1 (3 files updated)"

Step 2: Hỏi user confirm version mới (hoặc skip nếu user nói "luôn")

Step 3: wails build -clean
  → chờ ~30-60s → verify build/bin/BangCong.exe tồn tại
  → check exe size ~8-15MB (UPX compressed)

Step 4: Instruct user:
  "Version v1.0.1 đã build xong. Giờ mở admin app:
   1. admin/build/bin/BangCong_Admin.exe
   2. Tab "Bản mới"
   3. Chọn file build/bin/BangCong.exe
   4. Nhập changelog (bản vá X, sửa bug Y...)
   5. Click Đăng → chờ progress 100%"

Step 5: Done. Không auto-commit — user tự quyết khi nào commit.
```

**Override flag:**
- `--minor`: user nói "bump minor" hoặc "thêm tính năng lớn"
- `--major`: user nói "bump major" hoặc "phiên bản lớn"

---

## 3. Manual workflow (không qua Claude)

Mở terminal tại root repo:

```bash
# Bump + build 1 phát
build.bat

# Hoặc chi tiết:
node scripts/bump-version.js --patch
wails build -clean
```

Skip bump (dev test không bump version):

```bash
set BUMP_SKIP=1 && build.bat
```

Sau đó mở admin app → tab Bản mới → Đăng.

---

## 4. File sync khi bump

`scripts/bump-version.js` cập nhật 3 file:

| File | Field |
|------|-------|
| `frontend/src/constants/version.ts` | `CURRENT_VERSION` |
| `wails.json` | `info.productVersion` |
| `versioninfo.json` | `FixedFileInfo.FileVersion` + `ProductVersion` + `StringFileInfo.*Version` |

Chạy bump 2 lần liên tiếp → version tăng 2 bước. Dùng `git diff` check trước khi commit.

---

## 5. Troubleshoot

**"node: command not found"**: cài Node.js ≥ 18 từ https://nodejs.org (mặc định project dùng Node cho frontend).

**"wails: command not found"**: `go install github.com/wailsapp/wails/v2/cmd/wails@latest` và đảm bảo `%GOPATH%/bin` trong PATH.

**Build fail `versioninfo.json` parse error**: bump chạy dở dang → restore từ git: `git checkout versioninfo.json`.

**Admin hiển thị version cũ sau build**: admin đọc `wails.json` remote lần đầu mở tab, đóng tab → mở lại để refresh.

**Muốn revert bump**: `git checkout frontend/src/constants/version.ts wails.json versioninfo.json` (nếu chưa commit).
