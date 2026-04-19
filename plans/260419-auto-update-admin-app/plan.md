# Auto-Update + Bug Report + Announcement + Admin App

**Date:** 2026-04-19
**Target:** Thêm 3 tính năng (announcement bar, version-check notify, bug report) vào app chính + tạo admin app riêng trong cùng monorepo để quản lý GitHub từ UI.
**Verification:** [reports/00-codebase-verification.md](./reports/00-codebase-verification.md)

## Overview

11 phase. Dùng GitHub free (repo public `bang-cong-tu-dong`) làm backend cho announcement/version/release/issue. Cloudflare Worker free làm proxy giấu GITHUB_TOKEN cho bug report. Admin app (Wails v2 riêng trong `admin/` subfolder) cầm PAT lưu wincred, POST trực tiếp GitHub API. Go workspace (`go.work`) link 2 module. Không auto-replace .exe (semi-auto kiểu B: notify + BrowserOpenURL tới release page). File ≤ 200 dòng, kebab-case, không database server, không mock test.

## Phase list

| # | File | Status | Scope | Review |
|---|---|---|---|---|
| 00 | [phase-00-infra-setup.md](./phase-00-infra-setup.md) | pending | GitHub repo + seed JSON + PAT + Cloudflare account + wrangler deploy | pending |
| 01 | [phase-01-header-announcement.md](./phase-01-header-announcement.md) | pending | AnnouncementBar fetch raw GitHub, 3 màu, ẩn im lặng khi fail | pending |
| 02 | [phase-02-version-check.md](./phase-02-version-check.md) | pending | version-service + semver compare + toast action "Tải về" + Go OpenURL | pending |
| 03 | [phase-03-bug-report-button.md](./phase-03-bug-report-button.md) | pending | Bug icon + dialog + html2canvas + POST Worker + GetOSInfo Go | pending |
| 04 | [phase-04-cloudflare-worker.md](./phase-04-cloudflare-worker.md) | pending | Worker JS proxy, rate limit, upload screenshot, tạo issue | pending |
| 05 | [phase-05-admin-app-bootstrap.md](./phase-05-admin-app-bootstrap.md) | pending | go.work + wails init admin/ + PAT modal + wincred | pending |
| 06 | [phase-06-admin-announcement.md](./phase-06-admin-announcement.md) | pending | Tab Thông báo: form + preview + PUT contents API | pending |
| 07 | [phase-07-admin-release-publish.md](./phase-07-admin-release-publish.md) | pending | Tab Bản mới: scan .exe + upload stream + progress event | pending |
| 08 | [phase-08-admin-bug-list.md](./phase-08-admin-bug-list.md) | pending | Tab Báo lỗi: list + detail markdown + close/comment | pending |
| 09 | [phase-09-build-automation.md](./phase-09-build-automation.md) | pending | bump-version script + build.bat + docs cho Claude | pending |
| 10 | [phase-10-user-guide.md](./phase-10-user-guide.md) | pending | HUONG-DAN.md tiếng Việt + screenshots placeholder | pending |

## Ship order (đề xuất)

```
00 → 01 → 02 → 04 → 03 → 05 → 06 → 07 → 08 → 09 → 10
```

Lý do:
- **00 đầu tiên**: infra setup blocking (repo + PAT + Worker URL). Không có → phase sau không fetch được.
- **01 trước 02**: announcement đơn giản nhất (pure fetch JSON), validate path GitHub raw + CORS hoạt động trong WebView2 trước khi thêm logic phức tạp.
- **02 reuse pattern 01**: fetch + parse JSON → thêm semver compare + toast action.
- **04 trước 03**: Worker cần live trước khi button bug report có endpoint. Nếu làm 03 trước, dialog sẽ fail vì chưa có URL.
- **03 sau 04**: dùng URL Worker const đã deploy.
- **05→06→07→08 sequential**: admin app bootstrap xong mới add từng tab. 06 đơn giản nhất (PUT JSON), 07 phức tạp nhất (upload binary lớn + progress), 08 là read-heavy (list + detail).
- **09 sau admin**: test full build flow (bump → wails build → admin publish) cần admin đã chạy được.
- **10 cuối**: screenshot hướng dẫn cần UI final stable.

## Key decisions (đã chốt với user)

1. **Auto-update**: semi-auto kiểu B (notify + BrowserOpenURL release page, KHÔNG auto-replace .exe) — tránh Windows Defender nghi.
2. **Repo public**: `bang-cong-tu-dong`, code không nhạy cảm, ae tải không cần login.
3. **Infra free**: GitHub free + Cloudflare Workers free, KHÔNG mua code signing cert giai đoạn 1.
4. **Announcement**: 3 màu đỏ / xanh lá / đen, text-only, không click mở link.
5. **Báo lỗi**: view qua admin app trước (Telegram/email để sau).
6. **Version bump**: tăng patch tự động, Claude đề xuất số trước build để user confirm.
7. **Workflow build**: user nói "build cập nhật đi" → Claude chạy script → user mở admin app → bấm "Đăng bản mới".
8. **Token storage**: Windows Credential Manager qua `github.com/danieljoos/wincred`, target name `BangCongAdmin/GitHubPAT`.
9. **Screenshot**: `html2canvas` (~45KB dep), JPEG Q=0.7 fallback Q=0.5 nếu >2MB.
10. **Header insert**: announcement text giữa MonthPicker (header.tsx:70) và icon group (header.tsx:73). Bug icon trước HelpButton (header.tsx:89).

## Non-goals (YAGNI)

- Không GitHub Actions CI build.
- Không code signing cert giai đoạn 1 (ae chấp nhận Defender SmartScreen cảnh báo "unknown publisher").
- Không auto-update full (tải + replace .exe đang chạy).
- Không password/PIN cho admin app (máy riêng user).
- Không macOS/Linux.
- Không multi-language (chỉ tiếng Việt).
- Không analytics/telemetry.
- Không offline cache announcement/version (fetch fail → ẩn im lặng).
- Không retry backoff phức tạp (fail 1 lần → ẩn, user mở app lần sau fetch lại).
- Không UI cho admin app tự update (admin rebuild manual).

## Unresolved questions (cần user confirm)

- [ ] **Vị trí hiển thị số version trong app chính**: status bar góc dưới phải (recommend) vs menu Help dropdown vs footer dialog?
- [ ] **Admin app auto-login**: lưu wincred + auto-login mỗi lần mở (recommend) vs nhập PAT mỗi lần?
- [ ] **Repo name chính xác**: `bang-cong-tu-dong` hay tên khác (ảnh hưởng const URL toàn plan)?
- [ ] **Cloudflare Worker subdomain**: user chọn tên gì (ví dụ `bang-cong-bug.{user}.workers.dev`) — ảnh hưởng const URL phase 03.
- [ ] **Anonymous bug report**: cho phép không điền tên/SĐT (recommend optional) hay bắt buộc điền?
- [ ] **Tần suất check update**: mỗi lần mở app + cache 5 phút (recommend) vs 1 lần/ngày vs nút manual?
- [ ] **Owner GitHub account**: email + username cụ thể (ảnh hưởng URL `raw.githubusercontent.com/{owner}/...`)?

## Implementation command

`/code plans/260419-auto-update-admin-app` hoặc ship từng phase bằng đường dẫn file cụ thể.
