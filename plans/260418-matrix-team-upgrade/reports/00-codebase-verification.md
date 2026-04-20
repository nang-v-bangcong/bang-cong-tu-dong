# Xác minh codebase trước khi viết plan

**Ngày:** 2026-04-18
**Mục tiêu:** Kiểm chứng các giả định trong prompt với code hiện tại.

## Kết quả kiểm chứng

| # | Giả định gốc | Trạng thái | Ghi chú |
|---|---|---|---|
| 1 | `MatrixRow` có `row.dailyWage` cho B3 | **SAI** | `MatrixRow` chỉ có `userId, userName, cells, totalDays, totalCoef, salary` (xem `internal/models/attendance.go:32-39` và `frontend/wailsjs/go/models.ts:179-218`). Salary đã tính sẵn backend theo công thức `coef * effective_wage` (worksite ghi đè user — `internal/services/matrix.go:117-121`). |
| 2 | `MatrixCell` có `worksiteId` cho frontend | **ĐÚNG** | `MatrixCell` có `attendanceId, coefficient, worksiteId?, worksiteName, note` (`frontend/wailsjs/go/models.ts:159-178`). |
| 3 | `ExportPDF(userId, name, yearMonth)` | **ĐÚNG** | `frontend/wailsjs/go/main/App.d.ts:40` — `ExportPDF(arg1:number, arg2:string, arg3:string): Promise<string>`. Team tab đã gọi đúng (`pages/team.tsx:157`). |
| 4 | `useAppStore` location/shape | **ĐÚNG** | `frontend/src/stores/app-store.ts` 64 dòng. Có `tab, yearMonth, darkMode, dirty, refreshTrigger, matrixSearch, matrixSortBy, matrixSortDir, matrixCellColor`. Sẽ thêm `paintMode, paintCoef, paintWsId`. |
| 5 | Tabs mount/unmount tách biệt (dual listeners không xung đột) | **ĐÚNG** | `App.tsx:76` render ternary `{tab === 'personal' ? <PersonalPage /> : tab === 'team' ? <TeamPage /> : <MatrixPage />}` — tab ẩn thì unmount hẳn, effect cleanup chạy. An toàn để cả matrix.tsx và team.tsx cùng gắn `keydown` listener. |
| 6 | `DayHeaderMenu` làm template cho `matrix-row-menu.tsx` | **ĐÚNG** | `frontend/src/components/day-header-menu.tsx` 101 dòng, pattern: fixed position, click-outside + Escape, dùng `lucide-react` icons, `baseItem` Tailwind class. Phù hợp copy style. |
| 7 | `matrix-history-store` shape để refactor B4 | **ĐÚNG** | Store hiện tại: `{ past, future, push, popUndo, popRedo, clear }` với merge logic trong `push`. Đổi thành keyed theo context `{ [ctx]: { past, future } }`. Recorder `lib/use-matrix-history-recorder.ts` dùng `push` — sẽ nhận thêm `context` param. |

## Các phát hiện bổ sung ảnh hưởng đến plan

### B3 — Footer breakdown: cần thêm daily wage per user ở frontend
Vì `MatrixRow` KHÔNG có `dailyWage`, có 2 lựa chọn:

- **PA1 (đề xuất):** Gọi `GetTeamUsers()` song song với `GetTeamMonthMatrix()` ở `matrix.tsx`, lưu `Map<userId, dailyWage>`. Tính per-cell salary ở frontend: `coef * (worksite?.dailyWage || user.dailyWage || 0)`. Đây là KISS — không đổi backend, `GetTeamUsers` đã có (`app.go:65`), worksites đã được load sẵn.
- PA2 (phức tạp hơn): thêm field `dailyWage` vào `MatrixCell` ở backend. Phải sửa `matrix.go`, regen binding. KHÔNG cần thiết.

Plan B3 sẽ chọn PA1.

### A4 — Team "Hôm nay" button vị trí
`team.tsx` hiện không có toolbar riêng. `TeamUserBar` chỉ liệt kê user. Cần tạo `team-toolbar.tsx` mới (cũng dùng cho B5 undo/redo) và đặt trên `AttendanceTable`, dưới `TeamUserBar`. Button chỉ render khi `selected` và `today.slice(0,7) === yearMonth`.

### A3 — Paint mode state
Có thể thêm vào `app-store.ts` (có sẵn pattern `matrixCellColor` localStorage). Persist `paintCoef`/`paintWsId` ephemeral (không localStorage) — reset khi reload app. `paintMode: false` mặc định.

### B1 — Row context menu: refresh đồng bộ
`pages/matrix.tsx:82-83` đã gọi `triggerRefresh()` từ `useAppStore` sau `CreateTeamUser`. Sau delete trong B1 phải làm tương tự (đã dùng trong team.tsx:115). Cả hai tab đều subscribe `refreshTrigger` trong useEffect → auto-reload đồng bộ.

### B4 — Refactor history store: risk surface
`use-matrix-history-recorder.ts` chỉ dùng `push`, `pages/matrix.tsx` dùng `popUndo, popRedo, clear`. Refactor cần cập nhật 3 điểm, có thể thêm wrapper `useMatrixHistory()` và `useTeamHistory()` để không lộ context-arg quá sâu.

### A1 — Bug fix xác nhận
`matrix-row.tsx:44` truyền `editSignal: 0` cho ô không focus. `matrix-cell.tsx:49-52` `useEffect` so sánh `startEditingSignal !== signalRef.current` → nếu ô mới focus nhận được signal thật, sẽ trigger `setEditing(true)` với `initialEditChar` stale. Fix đơn giản: luôn truyền `editSignal`, để useEffect chỉ chạy khi `isFocused && changed`. Pass A1.

### File size checks (phải ≤ 200 dòng theo CLAUDE.md)
- `matrix-cell.tsx` hiện 197 dòng — sau A2 (layout line 2 + worksite text) + A3 (paint click handler) dễ vượt. Cần sẵn sàng tách:
  - Tách `useCellEdit` hook (state editing + commit) ra `lib/use-cell-edit.ts` nếu cần.
  - Hoặc tách `CellContent` component (hiển thị coef + ws line) riêng.
- `matrix.tsx` hiện 202 dòng — đã vượt 2 dòng. Khi thêm B1 (row menu state), B2 (fill sundays dialog), phải refactor extract `use-matrix-dialogs.ts` hoặc split handlers.
- `team.tsx` hiện 204 dòng — đã vượt. Khi thêm A4 + B5 sẽ vượt thêm. Cần tách `use-team-handlers.ts` (wrap handleSave/handleDelete với undo recorder).

### CSS alpha change C3
File `matrix-cell.tsx:91`: `hashColor(wsName) + '22'` — thay thành `+ '1a'`. Đơn giản, không risk.

## Câu hỏi chưa có lời giải

Tất cả giả định đã được verify và plan hoàn toàn khả thi. Không có câu hỏi mở block phase nào.
