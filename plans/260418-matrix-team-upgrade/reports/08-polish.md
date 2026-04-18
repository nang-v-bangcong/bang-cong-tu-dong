# Phase 8 — Polish: Ctrl+C TSV + Help modal + tint alpha (report)

**Date:** 2026-04-19
**Commits:**
- `72102d9` style(matrix): reduce worksite cell tint to ~10% alpha (C3)
- `64f90ae` feat(matrix): Ctrl+C copies selected cells as TSV (C1)
- `6933a20` feat(ui): add shortcut help modal triggered by ? and toolbar button (C2)
- `48f68de` fix(help-modal): align shortcuts with actual keybindings

**Status:** Implementation done. Smoke test thủ công còn lại.

## What shipped

### C1 — Ctrl+C copy TSV
- `lib/use-matrix-copy.ts` (65 dòng): listen `keydown` Ctrl/Cmd+C, bỏ qua khi focus `INPUT/TEXTAREA`, bỏ qua khi `selected.size === 0`.
- Build bbox: map userId → rowIndex (rows đã filter+sort theo UI), `dayMin..dayMax` theo `parseCellKey`. Chỉ emit các hàng có cell được chọn (bỏ hàng giữa nếu không có selection → giảm spam TSV).
- Ô trống coef → `''`. Col sep `\t`, row sep `\n`.
- `navigator.clipboard.writeText` với fallback ẩn `<textarea>` + `document.execCommand('copy')`.
- Toast `Đã copy {n} ô` sau khi thành công.
- Wire trong `matrix-table.tsx:80` qua `useMatrixCopy({ selected, rows })`.

### C2 — Help modal phím tắt
- `components/help-modal.tsx` (147 dòng): overlay fixed + modal 520px, max-h 85vh, blur backdrop, click outside + Esc đóng.
- 5 section: Điều hướng / Nhập liệu / Chọn nhiều ô / Chức năng nhanh / Menu chuột phải. Render từ `SECTIONS` data array, mỗi item `{keys, desc}` với component `<Kbd>` dùng var `--bg-muted`/`--border`.
- Nội dung đồng bộ với keybind thật (sau commit fix `48f68de`):
  - Navigation: ←→↑↓, Tab (+Shift), Enter (+Shift), T.
  - Input: gõ số 0-9 / . , (1 ô: editor; nhiều ô: 1-3 áp hệ số, 0 xóa), Del/Backspace xóa, Esc.
  - Selection: Shift+Click, Ctrl+Click, drag fill handle, double-click mở worksite picker.
  - Quick: B (cọ), Ctrl+Z, Ctrl+Y / Ctrl+Shift+Z, Ctrl+C, Ctrl+V, `?`, F1.
  - Menu: right-click cột ngày / tên người.
- Trigger: state `showHelp` trong `matrix.tsx` + `team.tsx`, listener `keydown` `?` (toggle) bỏ qua khi focus `INPUT/TEXTAREA`.
- Nút `?` tròn (`HelpCircle` icon, 26×26) thêm vào `matrix-toolbar.tsx` (cuối group Export) và `team-toolbar.tsx` (ml-auto cuối hàng).
- Không đụng `HelpDialog` (F1, print-oriented) — 2 entry point độc lập, bổ sung nhau.

### C3 — Giảm alpha tint ô
- `matrix-cell.tsx:95` đổi `hashColor(wsName) + '22'` → `+ '1a'` (~13% → ~10%).
- `style.css:13` thêm `--ws-tint-alpha: 0.10` trong `:root` cho tương lai (hiện cell vẫn dùng hex literal để memoize React; var chỉ là marker).

## Verification

- TypeScript: `tsc --noEmit` clean sau mỗi commit.
- Unit tests: `vitest run` → 9 files, 119 tests pass (không thêm test — hook thuần UI, đã bọc listener bằng `useEffect` cleanup + không có state phức tạp).
- File size: tất cả ≤ 200 dòng. `help-modal.tsx` = 147.
- `wails build`: **chưa chạy** (user kill & reset wails dev để verify).

## Scope limits (theo plan)

- Copy chỉ xuất hệ số (coef), không kèm worksite — plan xác nhận OK.
- Fill handle / drag-fill không đụng — đã có sẵn từ phase trước.
- Không tạo help-dialog mới tổng hợp; giữ nguyên F1 HelpDialog.

## Deviations

- Không dùng `color-mix` trong CSS cho tint — giữ hex literal `+ '1a'` để `hashColor(name) + alpha` vẫn là string ổn định (memo friendly). `--ws-tint-alpha` chỉ ghi chú future.
- Nút `?` matrix-toolbar đặt trong group bên phải cùng Excel/PDF (không tạo slot riêng) — UX gọn hơn.
- Help modal có thêm mục `?` và `F1` self-reference để user nhớ cách mở lại.

## Risks observed

- Clipboard API: WebView2 Windows hỗ trợ `navigator.clipboard.writeText` trong HTTPS/secure context. Wails v2 chạy trong secure context → OK. Fallback `execCommand` vẫn còn cho edge case.
- Multi-listener `keydown` cho `?`: mount trong page component, unmount khi đổi tab → không xung đột.
- `SECTIONS` static ở module scope → không re-alloc mỗi render.

## Pending (smoke test thủ công)

1. Chọn 2×3 ô matrix → Ctrl+C → paste Notepad: TSV đúng dòng/cột.
2. Paste sang Excel: ra grid 2×3.
3. Ctrl+C khi đang edit ô (đang mở input): không trigger copy vùng chọn.
4. Nhấn `?` ở matrix / team: modal mở. Esc → đóng. Click outside → đóng.
5. Nút `?` toolbar: mở cùng modal.
6. Bật "Màu ô" → so sánh visual: chữ dễ đọc hơn với alpha 10%.
7. F1 vẫn mở HelpDialog cũ (không bị conflict với `?`).

## Unresolved questions

- Không có. Phase hoàn tất pending QA user.
