# Phase 3 — Paint mode (chế độ cọ) cho Matrix

## Context links

- [plan.md](./plan.md)
- [reports/00-codebase-verification.md](./reports/00-codebase-verification.md)
- Depends on Phase 1 (cell layout ổn định)

## Overview

- **Date:** 2026-04-18
- **Description:** Thêm chế độ cọ: chọn preset coef + worksite → bấm vào ô trống trong matrix để chấm ngay, không mở editor. Phím `B` toggle.
- **Priority:** Cao (tăng tốc workflow chấm hàng loạt)
- **Implementation status:** Pending
- **Review status:** Pending

## Key Insights

- **Undo tương thích**: paint click dùng `onCellSave` hiện có (`use-matrix-mutations.ts:33-48`) → đã được `record([{userId,day}], ...)` bọc sẵn → tự động vào undo stack. Không cần thay đổi history.
- **Không mở editor**: khác với click thường (gọi `onFocus` → có thể tiếp theo user gõ để mở edit). Paint mode override click path: kiểm tra `paintMode` trong `handleClick` của `matrix-cell.tsx`.
- **Chỉ áp dụng ô trống** để tránh ghi đè vô ý. User có thể disable paint mode (phím B) để sửa ô đã có.
- **Preset preserve**: tắt paint không xóa `paintCoef`/`paintWsId` — bật lại dùng preset cũ.
- **Visual feedback**: cursor `crosshair` trên cell khi paint ON.
- **Team tab không có paint mode** (user xác nhận).

## Requirements

**State (Zustand):**
```ts
paintMode: boolean     // default false
paintCoef: number      // default 1
paintWsId: number | null  // default null
setPaintMode(on: boolean): void
setPaintPreset(coef: number, wsId: number | null): void
```

**Toolbar:**
- Button "🖌️ Cọ" ngay sau nút "Màu ô".
- Click khi OFF: mở popover nhỏ (custom div) chứa:
  - 4 preset button coef: `0.5`, `1`, `1.5`, `2`.
  - Button "Công trường..." mở `WorksitePickerPopup` sẵn có.
  - Button "Xác nhận" → setPaintMode(true) + đóng popover.
- Khi ON: button hiển thị inline preset, vd "🖌️ 1.0 · alba". Click ON → setPaintMode(false), không mở popover.
- Background nền đậm khi ON (dùng `var(--warning)` hoặc `var(--danger-soft)`).

**Cell behavior (`matrix-cell.tsx`):**
- Khi `paintMode === true`:
  - Td style `cursor: crosshair`.
  - `handleClick` không modifier (no shift/ctrl/meta):
    - Nếu `!cell?.attendanceId` (ô trống): gọi `onSave(userId, day, paintCoef, paintWsId)` — **không** gọi `onFocus`, **không** mở editor.
    - Nếu đã có data: giữ behavior cũ (onFocus).
  - Modifier (shift/ctrl) vẫn giữ selection behavior.
- Cần pass `paintMode, paintCoef, paintWsId` xuống `MatrixCell` — qua `matrix-row.tsx` → `matrix-cell.tsx`. Memo comparator cần thêm 3 field.

**Keyboard:**
- Phím `B` khi không focus input → toggle paintMode. Nếu bật mà chưa có preset → auto-default `coef=1, wsId=null`.

## Architecture

```
app-store.ts
  + paintMode, paintCoef, paintWsId
  + setPaintMode, setPaintPreset

matrix-toolbar.tsx
  + nhận paintMode, paintCoef, paintWsId, setters, worksites
  + popover inline (tự render, không tách file mới) — < 60 dòng JSX
  + gắn nút WorksitePickerPopup anchor cũ

matrix-table.tsx
  + đọc paintMode từ store và truyền xuống matrix-row → matrix-cell

matrix-cell.tsx
  + props paintMode, paintCoef, paintWsId
  + handleClick branch
  + style cursor conditional
  + memo thêm 3 field
```

## Related code files

- `d:/Dự án gốc/Bảng công tự động/frontend/src/stores/app-store.ts`
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/matrix-toolbar.tsx`
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/worksite-picker-popup.tsx` (reuse)
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/matrix-cell.tsx:85-89, 112-128, 186-197`
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/matrix-row.tsx`
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/matrix-table.tsx`
- `d:/Dự án gốc/Bảng công tự động/frontend/src/pages/matrix.tsx` (keyboard listener `B`)
- `d:/Dự án gốc/Bảng công tự động/frontend/src/lib/use-matrix-mutations.ts:33-48` (path tự động undo)

## Implementation Steps

1. **Store**: thêm `paintMode`, `paintCoef = 1`, `paintWsId = null`, 2 setters. KHÔNG persist localStorage.
2. **matrix-toolbar.tsx**:
   - Thêm local state `showPaintPopover`.
   - Thêm prop `worksites` (cần — hiện toolbar chưa nhận, phải truyền từ `matrix.tsx`).
   - Render button `🖌️` (icon `Paintbrush` đã import). Background ON = `var(--warning, #f59e0b)` + text white.
   - Khi ON: label = `🖌️ ${formatCoef(paintCoef)}${paintWsId ? ' · ' + wsName : ''}`. Lookup wsName trong `worksites`.
   - Popover: render khi `showPaintPopover && !paintMode`. 4 button preset → `setPaintPreset(c, paintWsId)`. Button "Công trường" → mở `WorksitePickerPopup` anchored. Button "Xác nhận" → `setPaintMode(true); setShowPaintPopover(false)`.
3. **matrix.tsx**: truyền `worksites` vào `MatrixToolbar`. Đọc `paintMode, paintCoef, paintWsId` từ store, truyền xuống `MatrixTable`. Thêm `keydown` handler `B` toggle paintMode.
4. **matrix-table.tsx**: nhận props `paintMode, paintCoef, paintWsId` → forward xuống `matrix-row.tsx`.
5. **matrix-row.tsx**: forward 3 props xuống `matrix-cell.tsx`. Thêm vào `Props`.
6. **matrix-cell.tsx**:
   - Thêm 3 props.
   - `handleClick`: nếu `paintMode` + no modifier + `!cell?.attendanceId` → `onSave(userId, day, paintCoef, paintWsId)` và `return`. Else fallthrough.
   - Td style: `cursor: paintMode ? 'crosshair' : 'cell'`.
   - Memo comparator thêm `paintMode, paintCoef, paintWsId` vào so sánh.
7. **Smoke test:**
   - Toolbar: click Cọ → popover. Preset 1.5 + công trường X → Xác nhận. Button hiện `🖌️ 1.5 · X` background warning.
   - Click ô trống → ô chấm 1.5, worksite X, không mở editor.
   - Click ô đã có data → mở focus (không ghi đè).
   - Ctrl+Z → undo ô vừa chấm.
   - Phím B toggle. B lần nữa → OFF preset giữ nguyên.
8. **File size**: `matrix-toolbar.tsx` hiện 107 dòng. Popover thêm ~40 dòng ⇒ ≈ 150, OK. Nếu vượt 200 → tách `paint-popover.tsx`.

## Todo list

- [ ] Store: 3 field + 2 setter.
- [ ] matrix-toolbar.tsx: button + popover + preset handlers.
- [ ] matrix.tsx: wiring store + keyboard `B`.
- [ ] matrix-table.tsx: forward props.
- [ ] matrix-row.tsx: forward props.
- [ ] matrix-cell.tsx: handleClick branch + cursor + memo.
- [ ] Smoke test end-to-end + undo.
- [ ] `wails build`, vitest pass.

## Success Criteria

- [ ] Click paint trên ô trống → chấm ngay, không editor.
- [ ] Click paint trên ô có data → không ghi đè, chỉ focus.
- [ ] Preset giữ khi toggle OFF/ON.
- [ ] Undo (Ctrl+Z) hoàn tác đúng ô vừa paint.
- [ ] Phím `B` toggle, không hoạt động khi gõ trong input.
- [ ] Cursor crosshair khi paint ON.
- [ ] Không file > 200 dòng.

## Risk Assessment

- **Trung bình**: memo comparator phải thêm paintMode → mass re-render khi toggle. Acceptable vì toggle hiếm; ô 100 user × 31 day đã render OK.
- **Thấp**: popover click-outside nếu không xử lý → click ngoài close manually bằng document listener (copy pattern `day-header-menu.tsx:24-36`).

## Security Considerations

N/A — local.

## Next steps

Phase 4 (B1 row menu) độc lập, không đụng paint mode.
