# Hướng dẫn setup Cloudflare Worker cho bug report

> Làm sau khi xong [setup-github.md](./setup-github.md) (đã có PAT `github_pat_...`).
>
> Mục đích: Worker làm proxy giữa app và GitHub API, giấu PAT khỏi file `.exe`.

Toàn bộ bước thực hiện trên **máy tính** (PowerShell / Chrome).

---

## Bước 1 — Đăng ký Cloudflare account

1. Mở Chrome → **https://dash.cloudflare.com/sign-up**
2. **Email**: dùng `nangv657@gmail.com` (email chính, không cần alias — Cloudflare không conflict với Google)
3. **Password**: mạnh 16+ ký tự, **khác với GitHub password** → lưu Bitwarden ngay.
4. Click **Sign Up**
5. Cloudflare gửi mail verify → mở Gmail → click link trong mail từ Cloudflare.
6. Sau khi verify, dashboard hiện trang "Get Started" → có thể **skip** (không add domain giai đoạn này, Worker dùng subdomain mặc định).

**Checklist:** vào https://dash.cloudflare.com thấy dashboard, không còn yêu cầu verify email.

---

## Bước 2 — Bật 2FA cho Cloudflare

1. Click **avatar góc phải trên** → **My Profile**
2. Tab **Authentication**
3. Mục "Two-Factor Authentication" → click **Enable**
4. Chọn **Authenticator App** → Cloudflare hiện QR code
5. Mở Microsoft Authenticator (đã cài ở setup-github.md) → bấm **+** → **Other account** → Scan QR
6. App hiện 6 số → nhập vào web → **Confirm**
7. Cloudflare hiện **backup codes** → download → lưu Google Drive (chung folder với GitHub recovery codes).

**Checklist:** Authentication page hiện "Two-Factor Authentication: On".

---

## Bước 3 — Cài Node.js (nếu chưa có)

Wrangler CLI (công cụ deploy Worker) chạy trên Node.js.

1. Mở **PowerShell** (không cần Admin):
   ```powershell
   node --version
   ```
2. Nếu ra `v18.x` hoặc mới hơn → **bỏ qua bước này**, sang Bước 4.
3. Nếu lỗi `'node' is not recognized...`:
   - Truy cập **https://nodejs.org/en/download**
   - Click nút **LTS** (bên trái, màu xanh, ghi "Recommended For Most Users")
   - Tải file `.msi` (Windows x64) → chạy → Next → Next → Install
   - **Đóng PowerShell cũ, mở PowerShell mới** (cần mới để Windows nhận PATH mới)
   - Chạy lại `node --version` → phải ra `v20.x` hoặc `v22.x`

**Checklist:** `node --version` trả version number.

---

## Bước 4 — Login Cloudflare qua wrangler

1. Mở PowerShell, cd vào thư mục `worker/` của dự án:
   ```powershell
   cd "d:\Dự án gốc\Bảng công tự động\worker"
   ```
2. Chạy wrangler login:
   ```powershell
   npx wrangler login
   ```
3. Lần đầu chạy, npx hỏi "Need to install wrangler. Ok to proceed? (y)" → gõ `y` → Enter. Chờ 1-2 phút download.
4. Browser tự mở tab Cloudflare → click **Allow** (cấp quyền wrangler thao tác account của anh).
5. Browser hiện "Successfully logged in" → đóng tab.
6. Quay lại PowerShell thấy:
   ```
   Successfully logged in.
   ```

**Checklist:** PowerShell in "Successfully logged in".

---

## Bước 5 — Deploy Worker stub

1. Vẫn trong thư mục `worker/`, chạy:
   ```powershell
   npx wrangler deploy
   ```
2. **Lần đầu deploy**, Cloudflare hỏi:
   ```
   You need to register a workers.dev subdomain before you can publish.
   What would you like your subdomain to be?
   ```
   - Gõ subdomain bất kỳ, ví dụ: `nangv` (kebab-case, không dấu)
   - Subdomain này vĩnh viễn. Worker URL sẽ là: `bang-cong-bug-report.nangv.workers.dev`
3. Wrangler upload code, output dạng:
   ```
   Total Upload: 0.50 KiB / gzip: 0.30 KiB
   Uploaded bang-cong-bug-report (1.20 sec)
   Published bang-cong-bug-report (0.80 sec)
     https://bang-cong-bug-report.nangv.workers.dev
   Current Deployment ID: abc12345-...
   ```
4. **Copy dòng URL** `https://bang-cong-bug-report.<subdomain>.workers.dev` → gửi Claude.

**Checklist:** wrangler in URL Worker.

---

## Bước 6 — Set secret GITHUB_TOKEN

> Secret = PAT đã tạo ở [setup-github.md](./setup-github.md) bước 4.

1. Vẫn trong `worker/`:
   ```powershell
   npx wrangler secret put GITHUB_TOKEN
   ```
2. PowerShell hỏi:
   ```
   Enter a secret value:
   ```
3. **Mở Bitwarden** (hoặc file `BangCongAdmin-PAT.txt`) → copy PAT `github_pat_11ABCDE...XYZ`
4. Paste vào PowerShell → Enter
   - PowerShell KHÔNG hiển thị gì khi paste (bảo mật) — cứ Enter.
5. Output:
   ```
   Creating the secret for the Worker "bang-cong-bug-report"
   Success! Uploaded secret GITHUB_TOKEN
   ```

**Checklist:** wrangler in "Success! Uploaded secret GITHUB_TOKEN".

**Verify qua dashboard (tùy chọn):**
- Vào https://dash.cloudflare.com → Workers & Pages → `bang-cong-bug-report` → Settings → Variables
- Thấy `GITHUB_TOKEN` với value ẩn `••••••`

---

## Bước 7 — Test Worker e2e

1. Trong PowerShell, chạy:
   ```powershell
   curl.exe https://bang-cong-bug-report.<subdomain>.workers.dev
   ```
   - **Lưu ý**: dùng `curl.exe` (không phải `curl`). PowerShell có alias `curl` trỏ về `Invoke-WebRequest` cú pháp khác.
   - Hoặc mở browser, paste URL → thấy `{"ok":true}` ngay.
2. Kết quả đúng:
   ```
   {"ok":true}
   ```
3. Nếu sai:
   - **404 "There is nothing here yet"**: chưa deploy xong → chờ 30s retry.
   - **500 error**: code `bug-report-proxy.js` có lỗi → chạy `npx wrangler tail` xem log.
   - **Trả HTML**: anh gõ `curl` thay vì `curl.exe` → sửa lại.

**Checklist:** curl trả `{"ok":true}` → **phase 00 hoàn thành** ✓

---

## Bước 8 — Gửi info cho Claude

Paste 2 thứ vào chat:

1. **Worker URL đầy đủ** (`https://bang-cong-bug-report.nangv.workers.dev`)
2. Confirm "curl trả `{"ok":true}` OK"

Em sẽ:
- Điền URL này vào const `WORKER_URL` trong code phase 03.
- Tick checklist plan phase 00 → mở phase 01.

---

## Troubleshooting

| Lỗi | Nguyên nhân | Fix |
|---|---|---|
| `wrangler: command not found` | npx không tự install | `npm install -g wrangler` |
| `Authentication required` khi deploy | Session hết hạn | `npx wrangler logout` → `npx wrangler login` |
| `Error: workers.dev subdomain has been disabled` | Cloudflare khóa subdomain free | Vào Dashboard → Workers → Overview → Enable workers.dev |
| curl trả HTML `<html>...` thay vì JSON | Dùng `curl` (alias) thay vì `curl.exe` | `curl.exe` hoặc Invoke-RestMethod |
| Sau khi set secret, Worker vẫn trả lỗi "no token" | Secret chưa push (lỗi mạng lúc put) | Chạy lại `npx wrangler secret put GITHUB_TOKEN` |

---

## Chi phí

- **Cloudflare Workers free plan**: 100,000 request/ngày.
- Bug report dự kiến: <100 req/ngày → thoải mái.
- KHÔNG cần nhập credit card.

---

## Ghi chú info đã tạo

Anh điền sau khi làm xong:

- Cloudflare email: `nangv657@gmail.com`
- Cloudflare workers.dev subdomain: `_________________`
- Worker URL: `https://bang-cong-bug-report._______.workers.dev`
- Secret `GITHUB_TOKEN` uploaded: `[ ]` yes
- Test curl `{"ok":true}`: `[ ]` yes
