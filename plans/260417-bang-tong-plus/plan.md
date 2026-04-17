# Plan: Tab Bảng tổng + Zoom-to-cursor + Hướng dẫn

**Date:** 2026-04-17
**Branch:** task-1-project-init (work on current)
**Target:** 3 features gộp, ~2-3 ngày code, low risk

---

## 1. Mục tiêu

3 feature độc lập, gộp chung plan vì share context và test cùng:

1. **Tab "Bảng tổng"** — ma trận người × ngày kiểu Excel, max 100 người × 31 ngày
2. **Zoom-to-cursor** — Ctrl+wheel zoom theo vị trí chuột, áp 3 tab
3. **Hướng dẫn** — nút Help + modal in-app cho mỗi tab

## 2. Nguyên tắc

- Dùng chung data (`users`, `attendance`, `worksites`) với tab Nhóm → sửa ở đâu cũng sync.
- Thêm MỚI 1 table `day_notes` cho ghi chú chung/ngày (không đụng `attendance.note` cũ).
- File ≤ 200 dòng → tách component.
- KISS: không virtual scroll (3100 ô render thẳng OK), không markdown lib (JSX thẳng), không PDF rời.
- YAGNI: không tuỳ biến khoảng ngày, không export Excel, không undo/redo.

## 3. Thứ tự phase

| Phase | Nội dung | File | Blockers |
|---|---|---|---|
| 1 | Backend (DB + API) | [phase-01-backend.md](phase-01-backend.md) | none |
| 2 | Matrix UI (tab Bảng tổng) | [phase-02-matrix-ui.md](phase-02-matrix-ui.md) | Phase 1 |
| 3 | Zoom-to-cursor (3 tab) | [phase-03-zoom-cursor.md](phase-03-zoom-cursor.md) | none (song song 2) |
| 4 | Help dialog | [phase-04-help-dialog.md](phase-04-help-dialog.md) | none (làm cuối) |

**Logic**: Phase 1 trước (API sẵn sàng → Phase 2 mới code UI). Phase 3 và 4 có thể làm song song. Đề xuất **Phase 1 → Phase 3 (warm up frontend) → Phase 2 → Phase 4**.

## 4. Kiến trúc tổng quan

### Backend (Go + Wails v2)
- DB: thêm table `day_notes` trong `internal/services/migrations.go`
- Model mới: `DayNote` trong `internal/models/`
- Service mới: `internal/services/day_note.go` + sửa `attendance.go` thêm `GetTeamMonthMatrix`
- App bindings: thêm 3 method trong `app.go`

### Frontend (React + TS + Tailwind)
- Store: mở rộng `tab` type thành `'personal' | 'team' | 'matrix'`
- Page mới: `frontend/src/pages/matrix.tsx`
- Components mới:
  - `matrix-table.tsx` — grid 100×31 chính
  - `matrix-cell.tsx` — 1 ô editable, memo
  - `worksite-picker-popup.tsx` — popup nhỏ chọn công trường
  - `zoomable-area.tsx` — wrap zoom logic (dùng cả 3 tab)
  - `help-button.tsx` + `help-dialog.tsx` — 1 dialog, nội dung theo tab
  - `help-content/personal.tsx`, `team.tsx`, `matrix.tsx` — 3 nội dung
- Hook: `use-zoom-to-cursor.ts` — logic zoom + localStorage
- Sửa: `app.tsx` (tab mới), `header.tsx` (nút Bảng tổng + Help), `app-store.ts` (tab type)

## 5. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| 100 users × 31 cols = 3100 ô render chậm khi gõ liên tục | Medium | `React.memo` cho `<MatrixCell>`, key stable = `userId-day`, uncontrolled input với `defaultValue` |
| CSS `zoom` làm `getBoundingClientRect` lệch khi multi-select drag | Medium | Dùng `elementFromPoint` thay vì tính toạ độ thủ công, hoặc disable drag khi zoom ≠ 100% (fallback) |
| Sticky header + sticky column + CSS zoom tương tác sai | Low-Medium | Test sớm ở Phase 3, có fallback: tắt sticky khi zoom ≠ 100% |
| Wails WebView2 tự zoom app khi Ctrl+wheel | High nếu không handle | Global `wheel` listener với `passive: false` và `preventDefault` khi `ctrlKey` |
| Ghi chú ngày lưu sai `year_month` khi user đổi tháng | Low | Primary key `(year_month, day)` → không trùng |
| Multi-select bulk assign xung đột với keyboard nav | Medium | Phase 2 làm keyboard nav trước, multi-select sau, có flag `selectionMode` |
| 100 lần `UpsertAttendance` song song khi bulk-assign | Low | Dùng transaction trong Go: method mới `BulkUpsertWorksite` |

## 6. Success criteria

- [ ] Tab "Bảng tổng" hiển thị đúng matrix cho tháng hiện tại, data khớp với tab Nhóm
- [ ] Sửa ô ở Bảng tổng → tab Nhóm cùng user thấy đổi ngay (sau reload)
- [ ] Keyboard: Tab/Enter/Arrow di chuyển đúng, gõ số auto edit, Esc huỷ
- [ ] Multi-select + bulk assign công trường 1 phát gán 10+ ô
- [ ] Ghi chú ngày lưu/load đúng, không ảnh hưởng note attendance
- [ ] Ctrl+wheel: zoom 50%-200%, điểm dưới chuột giữ nguyên, lưu localStorage
- [ ] Zoom không ảnh hưởng sidebar tab Nhóm
- [ ] Nút Hướng dẫn + F1 mở modal đúng nội dung tab hiện tại
- [ ] In từ modal ra PDF/giấy: nội dung sạch, không có header app
- [ ] `wails build` thành công không lỗi
- [ ] `wails dev` chạy được, không crash khi tạo 100 users test

## 7. Unresolved / cần confirm khi làm

- Khi user đang ở Bảng tổng mà xoá 1 người qua tab Nhóm → reload ra sao? (đề xuất: dùng `refreshTrigger` như hiện tại)
- Màu indicator công trường: fix theo thứ tự ID hay user chọn? (đề xuất: hash theo tên → màu cố định, nhất quán)
- Nút "Hướng dẫn" ở mobile/small window: hiện icon-only thay vì text (nếu header chật)
- Khi zoom ≠ 100% và user resize window: giữ nguyên zoom hay reset? (đề xuất: giữ nguyên)

## 8. Reference docs

- Scout report: thấy trong conversation (không tạo file riêng, skip YAGNI)
- Research zoom: pseudo-code trong [phase-03-zoom-cursor.md](phase-03-zoom-cursor.md)
