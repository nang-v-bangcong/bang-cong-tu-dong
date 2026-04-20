# Phase 10 — User Guide (HUONG-DAN.md)

## Context links

- [plan.md](./plan.md)
- Tất cả phase trước (đặc biệt 00, 06, 07, 08).

## Overview

- **Date:** 2026-04-19
- **Description:** `HUONG-DAN.md` tiếng Việt root repo. Cover: setup lần đầu, phát hành bản mới, đăng thông báo, xử lý báo lỗi, troubleshoot. Placeholder ảnh trong `docs/images/` user screenshot sau.
- **Priority:** Thấp (sau khi UI stable để screenshot đúng).
- **Implementation status:** Completed
- **Review status:** Completed

## Key Insights

- `HUONG-DAN.md` root để ae tải về thấy ngay.
- Screenshot placeholder markdown `![Mô tả](docs/images/name.png)` — user fill sau.
- Đối tượng: user chính không phải dev → ngôn ngữ dễ hiểu, không jargon.
- Troubleshoot phổ biến: PAT hết hạn, Defender cảnh báo, Worker down, upload timeout, cache delay.

## Requirements

**Functional:**
- 5 section chính:
  1. Lần đầu setup — tạo GitHub + PAT + nhập admin.
  2. Phát hành bản mới — build + admin publish.
  3. Đăng thông báo — admin tab Thông báo.
  4. Xử lý báo lỗi — admin tab Báo lỗi.
  5. Khắc phục sự cố — troubleshoot.
- Mỗi section: ảnh minh họa + bước đánh số + tip/cảnh báo.
- ToC đầu file, footer ngày update.

**Non-functional:**
- `HUONG-DAN.md` ≤ 400 dòng.
- Tiếng Việt có dấu đầy đủ.
- Ảnh kebab-case trong `docs/images/`.

## Architecture

```
repo/
├─ HUONG-DAN.md             (mới, ~380 dòng)
├─ docs/
│   ├─ images/              (mới, .gitkeep)
│   ├─ setup-github.md      (phase 00)
│   ├─ setup-cloudflare.md  (phase 00)
│   └─ build-process.md     (phase 09)
```

## Related code files

- Tạo: `HUONG-DAN.md`, `docs/images/.gitkeep`.
- Sửa: (none)

## Implementation Steps

1. **Viết `HUONG-DAN.md`** với cấu trúc:
   - Header: title + ngày + version doc.
   - ToC 5 section.
   - Section 1 "Lần đầu setup": 3 bước (tạo GitHub, tạo PAT, nhập admin) + cross-link `docs/setup-github.md`.
   - Section 2 "Phát hành bản mới": 3 bước (Claude "build cập nhật đi", mở admin tab Bản mới, click Đăng).
   - Section 3 "Đăng thông báo": 3 bước + giải thích 3 màu 🔴 khẩn cấp / 🟢 tin tốt / ⚫ thông tin. Lưu ý cache 5 phút.
   - Section 4 "Xử lý báo lỗi": cách ae báo (icon bug, mô tả+ảnh+gửi, warning upload public) + cách chủ xem+đóng (nút "Đã xử lý" / "Đóng kèm note").
   - Section 5 "Khắc phục sự cố":
     - Token hết hạn (mỗi năm 1 lần) — modal setup lại.
     - Windows Defender cảnh báo (More info → Run anyway, chưa có code signing cert).
     - Không upload được exe (check mạng + PAT + dung lượng GitHub).
     - Ae không nhận notify (check `version.json` remote + cache 5 phút).
     - Thông báo không hiển thị (enabled=true, text ≤ 100 char, cache).
     - Worker 429 (rate limit 5/phút, đợi 1 phút).
   - Footer "Liên hệ": tạo issue GitHub hoặc liên hệ Claude.
2. **Placeholder ảnh**: `<!-- TODO: chụp ảnh [mô tả] và lưu docs/images/{tên}.png -->` mỗi section. User fill sau.
3. **`docs/images/.gitkeep`** empty để commit folder rỗng.
4. **Cross-link** `HUONG-DAN.md` ↔ `docs/setup-github.md`, `setup-cloudflare.md`, `build-process.md`.
5. **Review**: đọc 1 lượt mindset user không biết kỹ thuật — bullet dễ hiểu? Dấu đủ? Bước cụ thể?
6. Commit `docs: add user guide in Vietnamese`.

## Todo list

- [x] Viết `HUONG-DAN.md` 5 section + ToC (257 dòng, tiếng Việt đầy dấu).
- [x] Tạo `docs/images/.gitkeep` (folder rỗng commit được).
- [x] Cross-link `docs/setup-github.md`, `setup-cloudflare.md`, `build-process.md`.
- [x] Review tiếng Việt — 6 section, troubleshoot 6 case.
- [ ] User screenshot UI fill placeholder (async, user làm sau — placeholder đã đánh dấu trong file).

## Success Criteria

- [ ] `HUONG-DAN.md` root, tiếng Việt đầy đủ dấu.
- [ ] 5 section cover 5 kịch bản.
- [ ] Troubleshoot ≥ 5 case.
- [ ] Mỗi bước follow được từ đầu đến cuối.
- [ ] `docs/images/` tồn tại với `.gitkeep`.

## Risk Assessment

- **Low**: Doc không ảnh hưởng code.
- **Medium**: User không biết kỹ thuật → doc phải rất cụ thể. Mitigate: đọc lại 2 lượt.
- **Low**: Ảnh chưa có → user follow được text trước.

## Security Considerations

- KHÔNG ghi PAT thật trong doc (placeholder `<paste-token-here>`).
- KHÔNG ghi Worker URL thật nếu muốn giấu (tuỳ user — URL có rate limit + auth qua `GITHUB_TOKEN` secret, ghi cũng OK).
- Repo URL public OK.

## Next steps

Hoàn thành plan. Monitor bug report thực tế → iterate sau.
