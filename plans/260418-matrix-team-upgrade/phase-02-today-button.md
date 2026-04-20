# Phase 2 — "Đến hôm nay" button cho cả Matrix và Team tab

## Context links

- [plan.md](./plan.md)
- [reports/00-codebase-verification.md](./reports/00-codebase-verification.md)

## Overview

- **Date:** 2026-04-18
- **Description:** Thêm nút "📅 Hôm nay" ở cả 2 tab. Click = scroll cột/hàng ngày hôm nay vào view. Ẩn khi tháng đang xem khác tháng hiện tại. Phím tắt `T` (không khi focus trong input).
- **Priority:** Trung bình (QoL, độc lập)
- **Implementation status:** Pending
- **Review status:** Pending

## Key Insights

- `GetToday()` đã có (`app.go:129`, `services.TodayKST()` ISO `YYYY-MM-DD`).
- Matrix: `MatrixTable` compute `todayDay` sẵn (`matrix-table.tsx:46-49`). Cần scroll cell `<td data-day={todayDay}>` của hàng đầu visible.
- Team: `AttendanceRow` có `isToday` (`attendance-row.tsx:18`). Cần thêm `data-date` attribute hoặc `ref` để scroll.
- Team tab chưa có toolbar riêng. Tạo mới `team-toolbar.tsx` (đặt giữa `TeamUserBar` và `AttendanceTable`). Toolbar này cũng sẽ dùng lại cho Phase 7 (undo/redo) và Phase 8 (nút `?`). Thiết kế slot-based ngay từ đầu.
- Điều kiện hiển thị: `yearMonth === today.slice(0, 7)`.

## Requirements

**Functional Matrix:**
- Nút "📅 Hôm nay" xuất hiện bên cạnh khu vực sort trong `matrix-toolbar.tsx`.
- Click → `querySelector('td[data-day="..."]')` đầu tiên trong table → `scrollIntoView({ inline: 'center', block: 'nearest' })`.
- Ẩn nút khi tháng xem không khớp hôm nay.

**Functional Team:**
- Toolbar mới `team-toolbar.tsx` render trên `AttendanceTable`, dưới `TeamUserBar`.
- Nút "📅 Hôm nay" → scroll `<tr data-date={today}>` vào view `scrollIntoView({ block: 'center' })`.
- Ẩn nút khi tháng xem khác.

**Keyboard:**
- Phím `T` trigger nút trên tab đang active (không khi focus input/textarea/editor cell).
- Handler đặt trong từng page (mỗi tab tự xử lý, dựa vào việc tab inactive thì unmount — verification #5).

## Architecture

```
frontend/src/components/
  ├─ team-toolbar.tsx (mới, < 80 dòng)
  │    props: { hasToday, onToday }  // slot sẵn undo/redo/help cho phase sau
  └─ matrix-toolbar.tsx
        + props: hasToday, onToday

frontend/src/pages/
  ├─ matrix.tsx
  │    handler: onGoToday() → gọi vào <MatrixTable ref/callback>
  │    hasToday = today.startsWith(yearMonth + '-')
  └─ team.tsx
        tableRef: useRef<HTMLDivElement>
        onGoToday() → tableRef.current?.querySelector(`tr[data-date="${today}"]`)?.scrollIntoView(...)

frontend/src/components/attendance-row.tsx
  + data-date={date} trên <tr>
```

## Related code files

- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/matrix-toolbar.tsx`
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/matrix-cell.tsx:114-115` (đã có `data-day`)
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/attendance-row.tsx` (cần thêm `data-date`)
- `d:/Dự án gốc/Bảng công tự động/frontend/src/pages/matrix.tsx`
- `d:/Dự án gốc/Bảng công tự động/frontend/src/pages/team.tsx`

## Implementation Steps

1. **Tạo `team-toolbar.tsx`** với props tối thiểu cho phase này + slot cho phase sau:
   ```tsx
   interface Props {
     hasToday: boolean
     onToday: () => void
     // slot (optional): onUndo, onRedo, undoCount, redoCount, onHelp  (phase 7 & 8)
   }
   ```
   Render: 1 flex row, `gap-2`, button "📅 Hôm nay" với `Calendar` icon từ lucide. Nếu `!hasToday` return null.
2. **`matrix-toolbar.tsx`**: thêm prop `hasToday, onToday`. Render button gần group sort:
   ```tsx
   {hasToday && <button onClick={onToday} className="...">📅 Hôm nay</button>}
   ```
3. **`matrix.tsx`**: 
   - `const hasToday = today.startsWith(yearMonth + '-')`.
   - `const tableRef = useRef<HTMLDivElement>(null)` — pass vào `MatrixTable` (cần thêm `ref` hoặc callback).
   - Cách đơn giản hơn: `document.querySelector(`td[data-day="${parseInt(today.slice(8,10),10)}"]`)` — nhưng có cả row header. Dùng `document.querySelector('tbody tr td[data-day="..."]')` → lấy phần tử đầu.
   - `onGoToday` → scrollIntoView `inline: 'center', block: 'nearest'`.
   - Truyền vào `MatrixToolbar`.
4. **`team.tsx`**:
   - Import `TeamToolbar`.
   - Thêm ref container scrollable quanh `AttendanceTable` (hoặc query toàn trang).
   - `const hasToday = today.startsWith(yearMonth + '-')`.
   - Mount `<TeamToolbar hasToday={hasToday} onToday={handleGoToday} />` giữa `TeamUserBar` và `AttendanceTable`.
5. **`attendance-row.tsx`**: thêm `data-date={date}` lên `<tr>` gốc.
6. **Keyboard handler `T`** — thêm vào cả matrix.tsx và team.tsx:
   ```ts
   useEffect(() => {
     const onKey = (e: KeyboardEvent) => {
       const t = e.target as HTMLElement
       if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
       if (e.ctrlKey || e.metaKey || e.altKey) return
       if (e.key === 't' || e.key === 'T') { e.preventDefault(); handleGoToday() }
     }
     window.addEventListener('keydown', onKey)
     return () => window.removeEventListener('keydown', onKey)
   }, [handleGoToday])
   ```
7. **Smoke test:**
   - Matrix tháng hiện tại → nút hiển thị → click → cột ngày hôm nay vào giữa view.
   - Matrix tháng khác → nút ẩn.
   - Team tab tương tự.
   - Đảm bảo `T` không trigger khi đang sửa cell (input có focus).

## Todo list

- [ ] Tạo `team-toolbar.tsx` (slot-ready).
- [ ] Thêm `data-date` cho `attendance-row.tsx`.
- [ ] `matrix-toolbar.tsx`: thêm props + render button Hôm nay.
- [ ] `matrix.tsx`: state + handler + keyboard listener `T`.
- [ ] `team.tsx`: mount toolbar + handler + keyboard listener `T`.
- [ ] Visual test 2 tab × 2 tháng (hiện tại, khác).
- [ ] Vitest, `wails build` pass.

## Success Criteria

- [ ] Matrix: tháng hiện tại có nút; click scroll đúng; khác tháng ẩn nút.
- [ ] Team: tương tự.
- [ ] Phím `T` hoạt động, không trigger trong input.
- [ ] Không regression scroll / zoom khác.

## Risk Assessment

- **Thấp**: pure DOM scroll.
- **Low risk** khi dual keyboard listener — tab inactive unmount (verification #5).

## Security Considerations

N/A.

## Next steps

Phase 3 (A3 paint) có thể chạy song song. Phase 7 sẽ mở rộng `team-toolbar.tsx` với undo/redo.
