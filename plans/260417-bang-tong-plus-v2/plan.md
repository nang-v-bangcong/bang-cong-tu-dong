# Bảng tổng Plus v2 — 12 Features Matrix Extension

**Date:** 2026-04-17
**Status:** Implementation complete (all 7 phases), reviewed
**Target:** Extend `MatrixPage` with bulk input, import/export, nav/UX, visuals

## Overview

12 features chia 7 phase theo dependency. Phase 1 = backend foundation; 2-7 = UI layers. Mỗi phase ship độc lập, test riêng, không block phase khác.

## Phase list

| # | File | Status | Features | Review |
|---|---|---|---|---|
| 1 | [phase-01-backend-apis.md](./phase-01-backend-apis.md) | done | 5 Go APIs + tests (foundation cho phase 2-4,7) | done |
| 2 | [phase-02-bulk-input-ui.md](./phase-02-bulk-input-ui.md) | done | F2 bulk coef/delete + F3 fill-day right-click | done |
| 3 | [phase-03-add-person-search.md](./phase-03-add-person-search.md) | done | F1 inline add + bulk paste; F7 search filter | done |
| 4 | [phase-04-paste-copy-day.md](./phase-04-paste-copy-day.md) | done | F5 Ctrl+V clipboard; F4 copy day→day | done |
| 5 | [phase-05-visual-enhancements.md](./phase-05-visual-enhancements.md) | done | F9 today highlight; F10 sort; F11 cell color toggle | done |
| 6 | [phase-06-drag-fill-undo.md](./phase-06-drag-fill-undo.md) | done | F12 drag-fill handle; F8 undo/redo | done |
| 7 | [phase-07-export.md](./phase-07-export.md) | done | F6 Excel (excelize) + PDF (print CSS) | done |

## Key decisions

- **Excel**: backend `xuri/excelize/v2` + `runtime.SaveFileDialog` → no frontend bundle bloat
- **PDF**: `window.print()` + `@media print` CSS (reuse existing pattern) — not gofpdf cho matrix
- **Paste parser**: `papaparse` (~23kb) — handle quoted/multiline
- **Undo**: `zundo` middleware, 50-entry cap, merge consecutive same-cell edits <1s
- **Drag-fill**: custom handler via `data-row`/`data-col` attrs + `elementFromPoint` (bypass CSS zoom)
- **Sort/filter/color toggle**: client-side in Zustand store (no backend)
- **BulkCreateUsers**: single `tx.Begin()` — fail-atomic on duplicate name

## Dependencies

```
Phase 1 (APIs) ──┬──> Phase 2 (bulk UI)
                 ├──> Phase 3 (add person)
                 ├──> Phase 4 (paste/copy)
                 └──> Phase 7 (export: reads matrix, no write APIs needed)

Phase 5 (visuals)  — independent, can ship anytime
Phase 6 (drag-fill) — needs Phase 1 BulkUpsertCell; undo needs stable action log from 2,3,4
```

## Non-goals (YAGNI)

- Virtual scrolling (research confirms 3100 cells OK với React.memo)
- Formula support in drag-fill (just repeat value)
- Pattern fill (1,2,4,8...)
- Multi-format export (only xlsx + pdf)
- Cloud sync / multi-user conflict
- Chart generation in Excel
- Preview-before-commit cho paste (direct apply + undo)

## Global success criteria

- All existing matrix tests pass
- File ≤ 200 dòng (tách nếu vượt)
- Go tests pass: `go test ./internal/services/...`
- Frontend tests pass: `npm run test`
- Wails dev build: `wails dev` boots, no console error
- Production build OK: `wails build`

## UX decisions (confirmed by user 2026-04-17)

1. **Undo scope**: day_note edit **nằm trong undo stack** (cùng zundo mechanism, track as distinct action type `day_note.upsert`).
2. **Drag-fill direction**: **cả 2 chiều** — user kéo handle dọc/ngang/chéo, fill rectangle từ ô nguồn tới ô đích.
3. **Paste overflow**: **truncate + toast warning** (soft fail). Ví dụ paste 10 cols nhưng còn 3 cols → chỉ apply 3 cols + toast "Đã cắt bớt X ô vượt biên".
4. **Copy day overwrite**: **dialog cho chọn** — 2 radio "Ghi đè tất cả" / "Chỉ điền ô trống" (default: fill empty).
5. **PDF font size**: **thử 10px trước**, tuned xuống 9px nếu overflow khi test A4 landscape 31 cols.
6. **Sort persist**: **ephemeral** — reset về "name asc" mỗi lần mở tab. Không lưu localStorage.
7. **Cell color toggle**: **OFF mặc định** — toggle icon trên header matrix, state lưu `localStorage['matrix-cell-color']`.
8. **BulkCreateUsers conflict**: **skip trùng** — transaction không rollback, trả `{created: []User, skipped: []string}`. Toast báo "Đã tạo N, bỏ qua M trùng tên".
9. **Fill-day for all**: **chỉ team** (is_self=0) — khớp matrix query hiện tại. Self user chấm riêng qua tab Cá nhân.
10. **Keyboard 0-3 khi multi-select**: **số "0" = xóa** (intuitive, khớp với Delete key). Số 1/2/3 = set coef tương ứng. Nhất quán cho cả ô đơn và multi-select.

## Implementation command

Sử dụng `/code <đường dẫn plan này>` trong chat mới. Cụ thể:

```
/code plans/260417-bang-tong-plus-v2
```

Hoặc prompt ngắn:
```
/code làm plans/260417-bang-tong-plus-v2 đi, test đầy đủ
```

Lý do chọn `/code`: đã chạy thành công cho plan v1 (bang-tong-plus), kích hoạt đầy đủ Orchestration Protocol (project-manager progress, tester+debugger loop, code-reviewer, docs-manager, git-manager).
