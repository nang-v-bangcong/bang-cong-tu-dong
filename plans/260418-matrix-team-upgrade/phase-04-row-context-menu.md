# Phase 4 — Row context menu trong Matrix (sửa, xuất PDF, xóa)

## Context links

- [plan.md](./plan.md)
- [reports/00-codebase-verification.md](./reports/00-codebase-verification.md)
- Depends on Phase 1 (UI cell ổn định, `triggerRefresh` flow đã có)

## Overview

- **Date:** 2026-04-18
- **Description:** Thêm menu thao tác từng user trong Matrix: hover hiện `⋮`, click/right-click mở popup với Sửa tên+lương, Xuất PDF riêng, Xóa. Sau delete refresh đồng bộ cả 2 tab.
- **Priority:** Trung bình (tiết kiệm thao tác chuyển tab)
- **Implementation status:** Completed
- **Review status:** Pending

## Key Insights

- Reuse `EditUserDialog` (`components/edit-user-dialog.tsx`, 68 dòng) + `ConfirmDialog`.
- `ExportPDF` signature: `(userID: number, userName: string, yearMonth: string) → Promise<string>` (đường dẫn đã lưu). Team tab dùng mẫu này (`pages/team.tsx:155-159`).
- Pattern menu copy từ `day-header-menu.tsx`: fixed position, click-outside + Escape, icons lucide.
- Sau mutate user (Update/Delete): gọi `triggerRefresh()` từ `useAppStore` — cả matrix và team cùng subscribe `refreshTrigger` (matrix.tsx:59, team.tsx:74,79,81).
- `MatrixRow` không có `dailyWage` (verification #1) — khi mở Edit dialog cần load từ `GetTeamUsers()` (đã được `matrix.tsx` có thể gọi thêm, hoặc dùng prop `users` nếu đã cache).
  - Giải pháp KISS: trong `matrix.tsx` đã load `worksites` song song; thêm `GetTeamUsers()` 1 lần → lưu `users` state (Map<id, {name, dailyWage}>) → khi mở Edit lấy dailyWage hiện tại.

## Requirements

**Functional:**
- Trong `matrix-row.tsx` cell `<td stickyLeft>` (tên user):
  - State hover (prop hoặc CSS `:hover` scope trong td).
  - Khi hover: hiện icon `⋮` nhỏ bên phải tên. Click → mở menu.
  - `onContextMenu`: preventDefault + mở menu tại `e.clientX, e.clientY`.
- Menu items (via new `matrix-row-menu.tsx`):
  - `✏️ Sửa` → mở `EditUserDialog` với name + dailyWage.
  - `📄 Xuất PDF riêng` → `ExportPDF(userId, userName, yearMonth)` → toast.
  - `🗑️ Xóa` → `ConfirmDialog` → `DeleteTeamUser(userId)` → toast + triggerRefresh.
- Escape / click outside → đóng menu.

**Non-functional:**
- File `matrix-row-menu.tsx` ≤ 100 dòng, copy style từ `day-header-menu.tsx`.
- `matrix-row.tsx` hiện 56 dòng; thêm hover state + onContextMenu vẫn dưới 200.
- `matrix.tsx` hiện 202 dòng (đã vượt). Thêm state/dialog sẽ đẩy lên ~240. **Phải tách** `use-matrix-dialogs.ts` (hook) hoặc gom dialog state vào sub-component.

## Architecture

```
matrix.tsx
  ├─ state: rowMenu {userId, name, x, y} | null
  │         editUserTarget {id, name, dailyWage} | null
  │         deleteUserTarget {id, name} | null
  ├─ users state: Map<id, User> (load from GetTeamUsers song song)
  └─ handlers: handleEditUserOpen, handleEditUserSave, handleDeleteUser, handleExportUser

matrix-row.tsx
  + hover state (useState) or pure CSS group-hover
  + onContextMenu → p.onRowMenu(userId, name, x, y)
  + <button.⋮> → same handler

matrix-row-menu.tsx (new, < 100 lines)
  + props: userId, userName, x, y, onEdit, onExportPDF, onDelete, onClose
  + same pattern as day-header-menu.tsx
```

## Related code files

- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/matrix-row.tsx:30` (td name cell)
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/matrix-table.tsx` (forward onRowMenu)
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/day-header-menu.tsx` (template)
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/edit-user-dialog.tsx` (reuse)
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/confirm-dialog.tsx` (reuse)
- `d:/Dự án gốc/Bảng công tự động/frontend/src/pages/matrix.tsx`
- `d:/Dự án gốc/Bảng công tự động/frontend/src/pages/team.tsx:111-119` (pattern delete)
- `d:/Dự án gốc/Bảng công tự động/wailsjs/go/main/App.d.ts:24, 32, 40, 74` (`CreateTeamUser, DeleteTeamUser, ExportPDF, UpdateUser`)

## Implementation Steps

1. **`matrix-row-menu.tsx`** (mới, pattern từ `day-header-menu.tsx`):
   ```tsx
   interface Props {
     userName: string
     x: number; y: number
     onEdit: () => void
     onExportPDF: () => void
     onDelete: () => void
     onClose: () => void
   }
   ```
   - 3 button: "✏️ Sửa", "📄 Xuất PDF riêng", "🗑️ Xóa" (màu danger).
   - Icon: `Pencil`, `FileDown`, `Trash2`.
   - Click outside + Escape → close.
2. **`matrix-row.tsx`**:
   - Thêm prop `onRowMenu?: (userId: number, userName: string, x: number, y: number) => void`.
   - Td tên user: thêm `group relative` class. Thêm nút `⋮` absolute right, `opacity-0 group-hover:opacity-100`. Click + `onContextMenu` đều gọi `onRowMenu`.
3. **`matrix-table.tsx`**: forward prop `onRowMenu` xuống `MatrixBodyRow`.
4. **`matrix.tsx`**:
   - Tách `use-matrix-dialogs.ts` hook (nếu file quá 200 dòng): trả về `{rowMenu, setRowMenu, editTarget, setEditTarget, deleteTarget, setDeleteTarget, copyDialog, setCopyDialog, confirm, setConfirm, showAddPerson, setShowAddPerson}`. Hoặc giữ nguyên nhưng gom dialogs vào component con `<MatrixDialogs />`.
   - Load users song song với matrix:
     ```ts
     const [users, setUsers] = useState<User[]>([])
     // trong load(): Promise.all([..., GetTeamUsers()]) → setUsers(mapUsers(u))
     ```
   - Handlers:
     - `handleRowMenu(uid, name, x, y)`: setRowMenu.
     - `handleEditUserOpen()`: rowMenu → tìm user trong `users` map → setEditTarget.
     - `handleEditUserSave(name, dailyWage)`: `await UpdateUser(editTarget.id, name, dailyWage)` → toast + `triggerRefresh()` + close.
     - `handleExportUser()`: `await ExportPDF(rowMenu.userId, rowMenu.userName, yearMonth)` → toast + close menu.
     - `handleDeleteUser()`: setDeleteTarget (từ rowMenu) + close menu.
     - `handleConfirmDeleteUser()`: `await DeleteTeamUser(deleteTarget.id)` → toast + `triggerRefresh()`.
   - Render thêm dialogs + menu ở root page.
5. **Kiểm tra file size**:
   - `matrix-row-menu.tsx` < 100 ✓
   - `matrix-row.tsx` ≈ 75 ✓
   - `matrix.tsx`: sau thêm có thể ≈ 240 → **phải tách**. Đề xuất: tạo `use-matrix-row-ops.ts` chứa 4 handlers + state, return `{rowMenu, openRowMenu, closeRowMenu, editTarget, ..., renderDialogs: () => JSX}` không được (JSX hook).
   - Cách sạch hơn: tạo component `<MatrixRowDialogs />` nhận các state + callbacks làm props, render tất cả dialogs. `matrix.tsx` chỉ giữ state + props wiring.
6. **Smoke test:**
   - Hover hàng → `⋮` xuất hiện. Click → menu.
   - Right-click hàng → menu tại con trỏ.
   - Sửa tên + lương → toast + cả 2 tab update.
   - Xuất PDF riêng → file được tạo, toast đúng đường dẫn.
   - Xóa → ConfirmDialog → xóa → matrix reload, team tab nếu đang chọn user bị xóa sẽ auto-fallback (logic team.tsx:116).

## Todo list

- [ ] Tạo `matrix-row-menu.tsx` (mới).
- [ ] Cập nhật `matrix-row.tsx`: hover UI + contextmenu handler.
- [ ] Cập nhật `matrix-table.tsx`: forward prop.
- [ ] `matrix.tsx`: load users song song, state dialog, handlers.
- [ ] Tách dialogs thành `matrix-row-dialogs.tsx` (nếu matrix.tsx > 200 dòng).
- [ ] Smoke test 4 thao tác × 2 trigger (hover click + right click).
- [ ] Kiểm tra refresh đồng bộ team tab.
- [ ] Vitest, `wails build`.

## Success Criteria

- [ ] Hover hàng user thấy `⋮` mờ, focus đậm khi hover.
- [ ] Right-click hàng mở menu tại vị trí chuột.
- [ ] 3 hành động (sửa, xuất PDF, xóa) đều hoạt động.
- [ ] Sau delete/update, team tab tự reload (triggerRefresh).
- [ ] ESC/click outside đóng menu.
- [ ] Không file nào > 200 dòng.

## Risk Assessment

- **Trung bình**: `matrix.tsx` đã ở giới hạn → cần tách dialogs.
- **Thấp**: logic copy pattern đã có sẵn.
- **Thấp**: ExportPDF sync (save dialog blocking) — users sẵn quen.

## Security Considerations

- `DeleteTeamUser` là destructive — luôn qua `ConfirmDialog`. Giữ thông điệp rõ "Dữ liệu chấm công sẽ bị mất" (copy từ team.tsx:200).

## Next steps

Phase 5 (B3 breakdown footer) có thể làm song song. Phase 7 sẽ thêm undo/redo button nhưng không đụng menu này.
