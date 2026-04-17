# Phase 2 — Bulk Input UI (F2 + F3)

## Context links

- [plan.md](./plan.md)
- [phase-01-backend-apis.md](./phase-01-backend-apis.md) — depends on BulkUpsertCell, BulkDeleteAttendance, FillDayForAllUsers
- [scout-01-report.md](./scout/scout-01-report.md)

## Overview

- **Date:** 2026-04-17
- **Description:** (F2) extend bulk-action-bar với coef quick buttons + delete; handle Delete key + 0-3 keys cho N selected. (F3) right-click day header → fill-day menu.
- **Priority:** High
- **Implementation status:** pending
- **Review status:** pending

## Key Insights

- BulkActionBar hiện có 2 buttons (gán/bỏ) — tái sử dụng footprint, thêm row 2
- Keyboard hiện lắng `^[0-9.,]$` chỉ khi focus 1 cell → mở editor. Cần branch: nếu `selected.size > 1` thì apply bulk thay vì open editor
- Right-click menu: reuse context menu pattern (tạo mới — app chưa có)
- "Xóa ngày này" = BulkDeleteAttendance cho all team users trong ngày đó

## Requirements

**F2 — Bulk coef + delete:**
- Bar hiển thị coef quick: `0.5x | 1x | 1.5x | 2x | Xóa`
- Keyboard khi N selected: `0` → delete (ask confirm nếu N>5); `1,2,3` → set coef; `.` + digit → decimal (e.g., `.5` → 0.5)
- Delete key → BulkDeleteAttendance (confirm if N>5)

**F3 — Fill day all:**
- Right-click on day header cell (number header) → menu
  - "Chấm công cả đội (1.0)"
  - "Chấm với công trường..." → worksite picker → apply
  - "Xóa ngày này" (confirm)
- Overwrite mặc định: `false` cho "Chấm công cả đội" (fill empty only); confirm dialog nếu có conflict

## Architecture

```
matrix-table.tsx
  ├── onKeyDown extended: check selected.size > 1 → bulk path
  ├── day header <th> onContextMenu → open DayHeaderMenu
  └── state: showDayMenu {day, x, y} | null

bulk-action-bar.tsx  — row 2 coef buttons
day-header-menu.tsx  — NEW, ≤80 lines, fixed menu at (x,y)
confirm-dialog.tsx   — reuse cho destructive ops

matrix.tsx (page)
  ├── handleBulkUpsertCoef(cells, coef)   → BulkUpsertCell
  ├── handleBulkDelete(cells)              → BulkDeleteAttendance
  ├── handleFillDay(day, coef, wsID)       → FillDayForAllUsers
  └── handleClearDay(day)                  → FillDayForAllUsers w/ coef=0? — NO, use BulkDelete-style:
       gọi BulkDeleteAttendance với tất cả CellRef team ngày đó
```

## State shape changes

Không thay đổi store. Local state trong `matrix-table.tsx`:
```ts
const [dayMenu, setDayMenu] = useState<{day: number, x: number, y: number} | null>(null)
const [confirmState, setConfirmState] = useState<{msg: string, onOK: ()=>void} | null>(null)
```

## Related code files

- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/matrix-table.tsx` — extend keyboard + add contextmenu
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/bulk-action-bar.tsx` — add coef row
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/day-header-menu.tsx` — NEW
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/confirm-dialog.tsx` — reuse
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/worksite-picker-popup.tsx` — reuse
- `d:/Dự án gốc/Bảng công tự động/frontend/src/pages/matrix.tsx` — 3 new handlers

## Implementation Steps

1. **Extend bulk-action-bar.tsx**:
   - Props add: `onApplyCoef(coef: number): void`, `onDelete(): void`
   - UI row 2: `[0.5] [1] [1.5] [2]` + `[Xóa]` (red)
   - Compact layout, ensure total height ≤ 80px
   - If file > 200 lines, split into `bulk-coef-buttons.tsx`
2. **matrix-table.tsx keyboard**:
   - Trong onKey handler, before editor-open branch: `if (selected.size > 1)`:
     - `/^[0-3]$/` → call `onBulkCoef(Array.from(selected).map(parseCellKey), parseFloat(key))` (0 → delete flow)
     - `key === 'Delete' || key === 'Backspace'` → call `onBulkDelete(list)` w/ confirm if >5
3. **matrix-table.tsx contextmenu on day header `<th>`**:
   - `onContextMenu={(e) => { e.preventDefault(); setDayMenu({day:d, x: e.clientX, y: e.clientY}) }}`
4. **Create `day-header-menu.tsx`**:
   - Props: `{day, x, y, onFillAll, onFillWorksite, onClearDay, onClose}`
   - 3 list items, Escape/outside click close
   - Worksite submenu reuse WorksitePickerPopup
5. **matrix.tsx handlers**:
   ```ts
   handleBulkCoef(cells, coef) {
     if (coef === 0) return handleBulkDelete(cells)
     BulkUpsertCell(refs, coef, null)  // null = keep worksite
   }
   handleBulkDelete(cells) {
     BulkDeleteAttendance(refs); toast
   }
   handleFillDay(day, coef, wsID) {
     FillDayForAllUsers(yearMonth, day, coef, wsID, false) // no overwrite
   }
   handleClearDay(day) {
     // build refs of all team users × day, BulkDeleteAttendance
   }
   ```
6. **Wire confirm dialog** cho destructive ops (>5 cells OR clear day)
7. **Test**: `frontend/src/components/bulk-action-bar.test.tsx` (NEW) — verify apply/delete click handlers

## Todo list

- [ ] Extend `bulk-action-bar.tsx` với coef buttons + delete
- [ ] Create `day-header-menu.tsx`
- [ ] Wire `matrix-table.tsx`: multi-select keyboard, context menu on day header
- [ ] Add `matrix.tsx` handlers (4 new)
- [ ] Confirm-dialog wiring cho destructive
- [ ] Vitest for bulk-action-bar
- [ ] Manual test: select 5, press 1 → all 5 = 1.0; press Delete → cleared
- [ ] Right-click day 15 → "Chấm công cả đội" → all team has day 15 = 1.0
- [ ] Right-click day 15 → "Xóa ngày này" → all cleared

## Success Criteria

- Selecting 5 cells + pressing `1` sets all 5 to coef=1.0 via single API call (verify via devtools network / logs)
- Delete key triggers confirm if >5 cells
- Right-click day header 15 → menu opens at cursor; "Chấm công cả đội" creates attendance for all team users who don't have day 15 yet
- "Xóa ngày này" removes all team entries for that day (after confirm)
- bulk-action-bar.tsx ≤ 200 dòng
- matrix-table.tsx ≤ 200 dòng (hiện 200 — cân nhắc tách keyboard logic ra `use-matrix-keys.ts`)

## Risk Assessment

- **Med**: matrix-table.tsx hiện 200 dòng, có thể vượt. Mitigation: tách `use-matrix-keys.ts` hook trước khi thêm logic.
- **Low**: contextmenu UX khác nhau OS-level browser — test on Windows trước
- **Low**: concurrent API calls nếu user nhanh — backend idempotent (OK)

## Security Considerations

- Confirm dialog cho destructive (xóa ≥5 cells, clear day)
- Server-side validation vẫn enforce coef range

## Next steps

Phase 3 (add person + search) — có thể song song với phase 2.
