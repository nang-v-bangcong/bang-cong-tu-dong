# Hướng dẫn Bảng Công Tự Động

> Tài liệu dành cho chủ app (admin) — người phát hành bản mới, đăng thông báo, xử lý báo lỗi.
> Ngôn ngữ: tiếng Việt. Cập nhật: 2026-04-20.

---

## Mục lục

1. [Lần đầu setup](#1-lần-đầu-setup)
2. [Phát hành bản mới](#2-phát-hành-bản-mới)
3. [Đăng thông báo](#3-đăng-thông-báo)
4. [Xử lý báo lỗi](#4-xử-lý-báo-lỗi)
5. [Khắc phục sự cố](#5-khắc-phục-sự-cố)
6. [Liên hệ](#6-liên-hệ)

---

## 1. Lần đầu setup

Làm một lần duy nhất. Sau đó không vào GitHub web nữa — tất cả thao tác qua **admin app**.

### Bước 1.1 — Tạo GitHub account + repo + PAT

Theo hướng dẫn chi tiết: [docs/setup-github.md](docs/setup-github.md)

Tóm tắt:
1. Đăng ký account GitHub (dùng email alias `nangv657+bangcong@gmail.com`).
2. Bật 2FA (quan trọng — không mất token).
3. Tạo repo **public** tên `bang-cong-tu-dong`.
4. Tạo PAT (Personal Access Token) với scope `repo` — copy lưu Bitwarden.
5. Upload 2 file seed: `announcement.json` + `version.json` (mẫu trong repo gốc).

<!-- TODO: chụp ảnh màn GitHub Settings → Tokens và lưu docs/images/github-pat.png -->

### Bước 1.2 — Setup Cloudflare Worker (cho báo lỗi)

Theo hướng dẫn: [docs/setup-cloudflare.md](docs/setup-cloudflare.md)

Tóm tắt:
1. Đăng ký Cloudflare account free.
2. Cài `wrangler` CLI: `npm install -g wrangler`.
3. `cd worker && wrangler deploy` → lấy URL `https://bug-report-proxy.<subdomain>.workers.dev`.
4. `wrangler secret put GITHUB_TOKEN` → paste PAT.
5. Update URL Worker vào `frontend/src/services/bug-report.ts` (đã seed sẵn).

### Bước 1.3 — Chạy admin app lần đầu

1. Copy `admin/build/bin/BangCong_Admin.exe` về máy chủ app.
2. Double click mở → hiện **modal "Nhập Personal Access Token"**.
3. Paste PAT vừa tạo ở bước 1.1 → click **Lưu**.
4. Token lưu vào **Windows Credential Manager** (`BangCongAdmin/GitHubPAT`) — lần sau mở app tự load.
5. Nếu hiện dashboard 3 tab (Thông báo / Bản mới / Báo lỗi) → setup xong.

<!-- TODO: chụp ảnh modal nhập PAT và lưu docs/images/admin-pat-modal.png -->

**Checklist lần đầu:**
- [ ] GitHub account + 2FA bật.
- [ ] Repo `bang-cong-tu-dong` public, có `announcement.json` + `version.json`.
- [ ] PAT lưu Bitwarden.
- [ ] Worker deploy thành công + secret `GITHUB_TOKEN` set.
- [ ] Admin app mở được, hiển thị 3 tab.

---

## 2. Phát hành bản mới

Khi sửa bug / thêm tính năng → build bản mới → admin upload → ae tự nhận notify.

### Bước 2.1 — Build exe mới

**Cách 1 (qua Claude):** mở Claude Code trong thư mục repo → gõ:

```
build cập nhật đi
```

Claude sẽ:
1. Bump version patch (`1.0.0` → `1.0.1`).
2. Hỏi confirm → trả lời "ok".
3. Chạy `wails build -clean` (~30–60 giây).
4. Verify `build/bin/BangCong.exe` tồn tại.
5. Hướng dẫn bước tiếp.

Chi tiết: [docs/build-process.md](docs/build-process.md)

**Cách 2 (manual):** mở terminal tại repo root → chạy:

```bash
build.bat
```

### Bước 2.2 — Admin publish

1. Mở `admin/build/bin/BangCong_Admin.exe`.
2. Click tab **"Bản mới"**.
3. Admin tự scan `build/bin/BangCong.exe`, hiển thị:
   - Version đề xuất: `v1.0.1` (đúng = version vừa bump).
   - File size: ~8–15 MB.
4. Nhập **Changelog** (markdown, nhiều dòng OK):
   ```
   - Sửa bug X
   - Thêm tính năng Y
   ```
5. Click **"Đăng bản mới"** → progress bar chạy (~10–30 giây tùy mạng).
6. Thành công → toast "Đã đăng v1.0.1".

<!-- TODO: chụp ảnh tab Bản mới và lưu docs/images/admin-release-tab.png -->

### Bước 2.3 — Ae nhận notify

- Ae mở app chính → tự fetch `version.json` → so sánh version local.
- Nếu version mới hơn → toast **"Có bản mới v1.0.1 — Tải về"**.
- Ae click **"Tải về"** → mở trình duyệt tới trang release → tải exe mới.

Cache 5 phút — nên ae mở app trong vòng 5 phút sau publish có thể vẫn thấy version cũ.

**Lưu ý:** Ae phải **tự thay thế** file exe (copy đè). App không auto-update vì Windows Defender hay cảnh báo.

---

## 3. Đăng thông báo

Đăng banner thông báo trên đầu app của ae (ví dụ: "Nghỉ Tết từ 28/1", "Bug X đã fix").

### Bước 3.1 — Vào tab Thông báo

1. Mở admin app → tab **"Thông báo"**.
2. Form có 3 trường:
   - **Nội dung** (≤ 100 ký tự).
   - **Màu** (radio 3 lựa chọn).
   - **Bật/tắt** (checkbox `enabled`).

<!-- TODO: chụp ảnh tab Thông báo và lưu docs/images/admin-announcement-tab.png -->

### Bước 3.2 — Chọn màu

| Màu | Ý nghĩa | Khi nào dùng |
|-----|---------|--------------|
| 🔴 **Đỏ** | Khẩn cấp | App có bug nặng, ae nên tạm nghỉ dùng |
| 🟢 **Xanh lá** | Tin tốt | Bản mới ra, tính năng mới |
| ⚫ **Đen** | Thông tin chung | Thông báo lịch, ghi chú |

### Bước 3.3 — Preview + đăng

1. Form preview ngay bên dưới — check text + màu đúng chưa.
2. Click **"Cập nhật"** → POST lên GitHub.
3. Ae mở app trong vòng **5 phút** sẽ thấy banner (cache GitHub Contents API).
4. Muốn tắt banner: uncheck **enabled** → Cập nhật.

**Lưu ý cache:**
- Cache 5 phút cả 2 chiều: publish xong chờ 5 phút mới chắc chắn ae thấy.
- Muốn gấp hơn → không có cách nào workaround (free tier).

---

## 4. Xử lý báo lỗi

Ae gặp lỗi → click **icon con bug** góc trên phải app → dialog báo lỗi.

### Bước 4.1 — Cách ae báo (flow người dùng)

1. Click **icon bug** → dialog mở.
2. Điền:
   - **Mô tả** (bắt buộc) — ae kể lỗi.
   - **Tên** (tùy chọn).
   - **SĐT** (tùy chọn).
   - **Ảnh chụp** (tự động capture màn hình app qua `html2canvas`).
3. Dialog cảnh báo: "Ảnh sẽ upload public lên GitHub — xóa info nhạy cảm trước khi gửi."
4. Click **Gửi** → POST lên Cloudflare Worker → Worker tạo issue GitHub.

<!-- TODO: chụp ảnh dialog báo lỗi và lưu docs/images/bug-report-dialog.png -->

### Bước 4.2 — Chủ xem + xử lý

1. Mở admin app → tab **"Báo lỗi"**.
2. Danh sách issue mở hiển thị bên trái:
   - Tiêu đề (dòng đầu mô tả).
   - Thời gian tạo.
   - Tên ae báo (nếu có).
3. Click 1 issue → pane bên phải hiện **detail markdown**:
   - Mô tả đầy đủ.
   - Ảnh chụp (click mở full size).
   - Info hệ thống (Windows version, app version).
4. 2 nút xử lý:
   - **"Đã xử lý"** → close issue (GitHub API).
   - **"Đóng kèm note"** → mở prompt nhập comment (vd "Đã fix ở v1.0.2") → comment + close.

<!-- TODO: chụp ảnh tab Báo lỗi + detail và lưu docs/images/admin-bug-list.png -->

---

## 5. Khắc phục sự cố

### 5.1 Token hết hạn (mỗi năm 1 lần)

**Triệu chứng:** admin app hiện lỗi `401 Unauthorized` khi bấm Cập nhật / Đăng / Đã xử lý.

**Fix:**
1. Vào GitHub → Settings → Developer settings → PAT → **Regenerate**.
2. Copy token mới.
3. Mở admin app → nếu không tự hiện modal, xóa credential cũ qua Windows Credential Manager (target `BangCongAdmin/GitHubPAT`) → restart admin app.
4. Paste token mới → Lưu.

### 5.2 Windows Defender cảnh báo "unknown publisher"

**Triệu chứng:** ae double click `BangCong.exe` → SmartScreen báo "Windows protected your PC".

**Fix (hướng dẫn ae):**
1. Click **"More info"**.
2. Click **"Run anyway"**.

**Lý do:** app chưa mua code signing certificate (giai đoạn 1). Mất cảnh báo = mua cert ~$200/năm — chưa cần.

### 5.3 Không upload được exe

**Triệu chứng:** admin "Đăng bản mới" → lỗi timeout / 404 / 502.

**Check:**
1. Mạng Wifi có ổn không? (file 10MB cần ~1 phút trên 4G yếu).
2. PAT còn hạn không? (xem 5.1).
3. Dung lượng GitHub repo: tối đa 1 GB file (plenty cho app này).
4. Thử lại 1 lần — GitHub API đôi khi flake.

### 5.4 Ae không nhận notify bản mới

**Check:**
1. `version.json` trên GitHub đã update đúng version chưa? (xem repo → file `version.json`).
2. Cache 5 phút — ae mở app lại sau 5 phút.
3. Kiểm tra Console ae (Ctrl+Shift+I) → tab Network → request `contents/version.json` status 200?

### 5.5 Thông báo không hiển thị

**Check:**
1. `announcement.json` field `enabled: true` chưa?
2. Text ≤ 100 ký tự chưa? (quá 100 → frontend ẩn im lặng).
3. Cache 5 phút.

### 5.6 Worker rate limit (429)

**Triệu chứng:** ae gửi báo lỗi → toast "Gửi thất bại (429)".

**Lý do:** 1 IP gửi > 5 báo lỗi / phút → Worker block.

**Fix:** đợi 1 phút rồi thử lại. Nếu ae spam cố tình → IP bị block lâu hơn.

---

## 6. Liên hệ

- **Bug app**: mở issue tại repo GitHub `bang-cong-tu-dong`.
- **Kỹ thuật**: mở Claude Code → hỏi Claude (đã được training về codebase này).
- **Khẩn cấp**: đăng banner màu đỏ + dòng SĐT của chủ app.

---

*Hết tài liệu. Ảnh minh họa (`docs/images/`) sẽ được thêm sau khi UI ổn định.*
