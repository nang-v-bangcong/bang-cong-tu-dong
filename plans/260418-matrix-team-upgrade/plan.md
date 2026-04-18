# Matrix + Team Upgrade — Bug fix, Paint mode, Row menu, Fill Sundays, Undo unified, Polish

**Date:** 2026-04-18
**Target:** Sửa bug auto-fill, nâng cấp UI ô matrix, thêm paint mode, row context menu, footer breakdown theo công trường, fill Sundays, thống nhất undo/redo + mở rộng sang Team tab, và polish (Ctrl+C copy, Help modal, tint alpha).
**Verification:** [reports/00-codebase-verification.md](./reports/00-codebase-verification.md)

## Overview

12 thay đổi chia 8 phase theo dependency + thứ tự ship an toàn. Phase 1 là bugfix + core UI (không breaking). Phase 2-8 thêm/mở rộng tính năng, mỗi phase có thể ship độc lập (trừ Phase 7 đụng history store → chạy sau các phase dùng undo hiện tại). File ≤ 200 dòng, kebab-case, không thêm dependency mới.

## Phase list

| # | File | Status | Scope | Review |
|---|---|---|---|---|
| 1 | [phase-01-bug-fix-cell-redesign.md](./phase-01-bug-fix-cell-redesign.md) | pending | A1 bug auto-fill + A2 cell 42×32 + worksite text label | pending |
| 2 | [phase-02-today-button.md](./phase-02-today-button.md) | pending | A4 "Đến hôm nay" cho cả 2 tab + phím `T` | pending |
| 3 | [phase-03-paint-mode.md](./phase-03-paint-mode.md) | pending | A3 chế độ cọ trong Matrix + phím `B` | pending |
| 4 | [phase-04-row-context-menu.md](./phase-04-row-context-menu.md) | pending | B1 menu chuột phải hàng: sửa, xuất PDF, xóa | pending |
| 5 | [phase-05-worksite-footer-breakdown.md](./phase-05-worksite-footer-breakdown.md) | completed | B3 breakdown theo công trường ở footer + print | pending |
| 6 | [phase-06-fill-sundays.md](./phase-06-fill-sundays.md) | pending | B2 API `FillSundaysForAllUsers` + dialog | pending |
| 7 | [phase-07-unified-history-team-undo.md](./phase-07-unified-history-team-undo.md) | completed | B4 refactor 1 store 2 stack + B5 undo/redo cho Team tab + nút visible | pending |
| 8 | [phase-08-polish.md](./phase-08-polish.md) | pending | C1 Ctrl+C TSV + C2 Help modal + C3 alpha tint | pending |

## Ship order (đề xuất)

```
Phase 1 (A1+A2) → 2 (A4) → 3 (A3) → 4 (B1) → 5 (B3) → 6 (B2) → 7 (B4+B5) → 8 (C1+C2+C3)
```

Lý do: Phase 1 ship bug fix sớm. A4/A3 không đụng history → ship trước. B1/B3 cần UI đã đổi (42×32 + worksite text). B2 thêm API mới nhưng không đụng store. Phase 7 refactor store chạy sau để không block các phase khác. Phase 8 polish cuối cùng.

## Key decisions (chốt với user)

1. **Paint state**: lưu trong `useAppStore` (không persist). `paintMode: false` mặc định, reset khi reload.
2. **Fill Sundays**: thêm Go API mới `FillSundaysForAllUsers` (atomic tx). Không loop frontend.
3. **Footer breakdown**: tính ở frontend, gọi `GetTeamUsers()` song song để lấy `dailyWage` per user (xem verification report).
4. **Undo store**: 1 store keyed theo context `'matrix' | 'team'`. Team undo chỉ cover attendance upsert/delete (không ứng lương).
5. **Row menu**: hybrid trigger (hover `⋮` + right-click). Không double-click name. File mới `matrix-row-menu.tsx` (< 100 dòng).
6. **Cell tint alpha**: đổi `'22'` (~13%) → `'1a'` (~10%). Thêm CSS var `--ws-tint-alpha` để tuning sau.
7. **Help modal**: nội dung tiếng Việt, trigger nút `?` trên cả 2 toolbar + phím `Shift+/`. Tách biệt với help-dialog hiện có (F1) — help-dialog đã có sẵn vẫn giữ.
8. **Team toolbar**: tạo mới `team-toolbar.tsx` đặt trên `AttendanceTable` (dưới `TeamUserBar`). Chứa: undo/redo + "Hôm nay" + nút `?`.

## Non-goals (YAGNI)

- Không chạm persistent storage mới (chỉ dùng localStorage sẵn có cho breakdown open state).
- Không thêm dependency (papaparse đã có cho paste, dùng lại nếu cần).
- Paint mode KHÔNG mở rộng sang Team tab (user xác nhận).
- Double-click name cell để chuyển tab bị bỏ.
- Undo không cover ứng lương (`advance`) — scope riêng.
- Không virtual scroll, không dynamic font size.

## Dependency map

```
P1 (A1 bugfix + A2 cell layout) ──┬──► P3 (A3 paint click handler)
                                   ├──► P4 (B1 row menu — hover on first cell of row header)
                                   ├──► P5 (B3 breakdown — reuse worksite tint)
                                   └──► P8 (C1/C2/C3 polish)
P2 (A4 Hôm nay) — độc lập
P6 (B2 Fill Sundays) — độc lập
P7 (B4 refactor history + B5 team undo) — sau P3 để A3 không phải re-touch history recorder
P8 (C2 Help modal) — ghi sau P1–P7 để shortcut list chính xác
```

## Global success criteria

- Tất cả test cũ pass: `go test ./...`, `npm run test` (vitest).
- `wails build` OK, không warning mới.
- Không file nào vượt 200 dòng (tách nếu cần).
- Bug A1 fixed: new user → click A, gõ 1, click B → B trống.
- 2 keyboard listener (matrix + team) không xung đột khi chuyển tab.
- Paint mode, row menu, fill sundays, ctrl+c, help modal tất cả có thể thao tác bằng chuột + bàn phím.

## Implementation command

`/code plans/260418-matrix-team-upgrade` hoặc ship từng phase bằng đường dẫn file phase cụ thể.
