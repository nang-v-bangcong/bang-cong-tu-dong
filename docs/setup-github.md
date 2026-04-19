# Hướng dẫn setup GitHub cho app Bảng công tự động

> Làm một lần duy nhất. Sau đó không cần vào GitHub web nữa — dùng admin app (phase 05-08) quản lý.

Toàn bộ bước dưới thực hiện trên **máy tính** (không phải điện thoại), trừ bước quét QR 2FA.

---

## Bước 1 — Đăng ký GitHub account mới

1. Mở Chrome, truy cập **https://github.com/signup**
2. **Email**: dùng `nangv657+bangcong@gmail.com`
   - Dấu `+` là alias Gmail — thư vẫn vào inbox `nangv657@gmail.com`, không cần tạo email mới.
   - Lý do dùng alias: tách account admin app khỏi account Gmail chính, tránh GitHub tự suggest login bằng Google (nếu mất Google → mất luôn GitHub).
3. **Password**: tạo mật khẩu mạnh 16+ ký tự
   - **Mở Bitwarden (hoặc Google Password Manager) → Save password ngay** khi browser hỏi.
   - KHÔNG dùng chung password với Gmail.
4. **Username**: đề xuất `nang-v-bangcong` (kebab-case, không có dấu)
   - Nếu GitHub báo trùng → thêm số, ví dụ `nang-v-bangcong-2026`
   - Username sẽ thành một phần của URL repo: `github.com/<username>/bang-cong-tu-dong`
5. Click **Continue** → giải captcha "I'm not a robot"
6. Mở Gmail (`nangv657@gmail.com`) → tìm mail **"[GitHub] Please verify your email address"** → copy mã 8 số → paste vào web
7. Các câu hỏi onboarding ("What would you like to do?", v.v.) → chọn bất kỳ, không ảnh hưởng.

**Checklist:** đã login vào github.com, thấy avatar góc phải trên.

---

## Bước 2 — Bật Two-Factor Authentication (2FA)

> Bắt buộc. Không bật 2FA thì GitHub không cho tạo PAT sau này.

1. Click **avatar góc phải trên** → **Settings**
2. Sidebar trái → **Password and authentication**
3. Mục "Two-factor authentication" → click **Enable two-factor authentication**
4. Chọn **Set up using an app** → Continue
5. Trên điện thoại, mở app **Microsoft Authenticator** (hoặc Authy, Google Authenticator — cái nào cũng được, chọn 1)
   - Nếu chưa có: tải Microsoft Authenticator từ Play Store / App Store
6. Trong app → bấm dấu **+** → **Other account** → **Scan QR code**
7. Quét QR trên web → app hiện 6 số (đổi 30s/lần)
8. Nhập 6 số đó vào web → **Verify**
9. GitHub hiện **16 recovery codes** (dạng `abc1-def2-...`) → click **Download**
   - **Lưu file txt này vào Google Drive private folder** (hoặc Bitwarden Secure Note).
   - Recovery codes = chìa khóa dự phòng khi mất điện thoại. KHÔNG có → mất tài khoản.
10. Click **I have saved my recovery codes**

**Checklist:** GitHub redirect về Settings, thấy dòng "Two-factor authentication: Enabled".

---

## Bước 3 — Tạo repository public

1. Click dấu **+** góc phải trên (cạnh avatar) → **New repository**
2. **Repository name**: `bang-cong-tu-dong` (chính xác, kebab-case, không viết hoa)
3. **Description**: `App chấm công tự động cho nhân công xây dựng Hàn Quốc` (tùy chọn)
4. Chọn **Public** (BẮT BUỘC — nếu Private thì app không fetch được announcement.json không cần login)
5. **KHÔNG tick** "Add a README file"
6. **KHÔNG tick** "Add .gitignore"
7. **KHÔNG tick** "Choose a license"
8. Click **Create repository**
9. GitHub hiện trang repo mới với dòng `Quick setup`.
10. **Copy URL** dạng `https://github.com/<username>/bang-cong-tu-dong.git` → gửi Claude để điền vào code.

**Checklist:** mở `https://github.com/<username>/bang-cong-tu-dong` thấy trang repo (có thể trống).

---

## Bước 4 — Tạo Fine-grained Personal Access Token (PAT)

> PAT là "mật khẩu riêng" cho admin app + Cloudflare Worker truy cập repo này.

1. Click **avatar** → **Settings**
2. Cuộn sidebar trái xuống cuối → **Developer settings**
3. **Personal access tokens** → **Fine-grained tokens** (QUAN TRỌNG: không dùng "Tokens (classic)")
4. Click **Generate new token**
5. Điền form:
   - **Token name**: `BangCongAdmin-PAT`
   - **Resource owner**: giữ nguyên (username của anh)
   - **Expiration**: chọn **Custom** → pick ngày **2027-04-19** (1 năm từ hôm nay)
     - Ghi ngày hết hạn này vào lịch Google Calendar → nhắc trước 1 tuần để tạo token mới.
6. **Repository access**:
   - Chọn **Only select repositories**
   - Dropdown → tick `bang-cong-tu-dong`
7. **Repository permissions** (cuộn xuống, chỉ set 2 cái — metadata tự có):
   - **Contents**: đổi từ "No access" → **Read and write**
   - **Issues**: đổi từ "No access" → **Read and write**
   - Metadata tự động hiện "Read-only (mandatory)" — không cần sửa.
8. **Account permissions**: để mặc định tất cả "No access".
9. Cuộn xuống cuối → click **Generate token**
10. GitHub hiện token dạng `github_pat_11ABCDE...XYZ` (dài ~90 ký tự) **chỉ một lần duy nhất**:
    - Click nút copy bên cạnh token.
    - Mở Bitwarden → New item → Login → Name: `BangCongAdmin-PAT` → Password: paste token → Save.
    - Hoặc: mở Notepad → paste → File → Save As → `D:\Backup\BangCongAdmin-PAT.txt` (KHÔNG trong thư mục dự án).
11. **Test PAT hoạt động**: mở **PowerShell** hoặc **Git Bash**, chạy:
    ```bash
    curl -H "Authorization: Bearer github_pat_11ABCDE...XYZ" https://api.github.com/repos/<username>/bang-cong-tu-dong
    ```
    - Thay `github_pat_...` bằng token vừa copy.
    - Thay `<username>` bằng GitHub username.
    - Kết quả đúng: JSON có dòng `"name": "bang-cong-tu-dong"` và `"private": false`.
    - Nếu trả `{"message": "Bad credentials"}` → PAT sai, tạo lại.

**Checklist:** curl test trả JSON thành công.

---

## Bước 5 — Gửi info cho Claude

Sau khi xong 4 bước trên, paste vào chat với em 3 thứ:

1. **GitHub username** (ví dụ `nang-v-bangcong`)
2. **Repo URL đầy đủ** (`https://github.com/nang-v-bangcong/bang-cong-tu-dong.git`)
3. Confirm "đã có PAT, đã test curl thành công"

**KHÔNG** gửi PAT cho em. Em không cần. PAT chỉ dùng ở:
- Cloudflare Worker (anh tự `wrangler secret put` — xem `setup-cloudflare.md`)
- Admin app (anh paste một lần duy nhất khi mở app lần đầu — phase 05)

Em sẽ dùng 2 info trên để:
- Điền vào `git remote add origin ...`
- Push 2 file seed `announcement.json` + `version.json` + `screenshots/.gitkeep`
- Điền URL `raw.githubusercontent.com/<username>/bang-cong-tu-dong/main/...` vào code phase 01-02.

---

## Backup khi mất máy

- **Mất Chrome cache** (clear cookies): login lại bằng email + password.
- **Mất điện thoại 2FA**: nhập recovery code (trong Google Drive) vào ô "Use a recovery code" khi login.
- **Mất file PAT**: quay lại Bước 4, revoke token cũ (Settings → Developer settings → Fine-grained tokens → Revoke), tạo token mới cùng tên, update lại ở Cloudflare Worker + admin app.

---

## Ghi chú info đã tạo

Anh điền sau khi làm xong để nhớ:

- GitHub username: `_________________`
- GitHub email: `nangv657+bangcong@gmail.com`
- Repo URL: `_________________`
- PAT name: `BangCongAdmin-PAT`
- PAT expires: `2027-04-19`
- 2FA app: `_________________` (Microsoft Authenticator / Authy / Google Auth)
- Recovery codes backed up at: `_________________` (Google Drive / Bitwarden)
