# Phase 5 — Matrix footer breakdown theo công trường

## Context links

- [plan.md](./plan.md)
- [reports/00-codebase-verification.md](./reports/00-codebase-verification.md)
- Depends on Phase 1 (worksite name có sẵn trên UI)

## Overview

- **Date:** 2026-04-18
- **Description:** Thêm mục "▾ Theo công trường" dưới hàng `Tổng` của footer matrix. Mỗi công trường = 1 chip màu (theo `hashColor`) hiển thị `{tên}: {công} · {lương}`. Ô chưa gán → chip "Chưa gán". Collapsible, state persist localStorage. Print view cũng có.
- **Priority:** Trung bình (đối soát chi tiết theo công trường)
- **Implementation status:** Completed
- **Review status:** Pending

## Key Insights

- **Salary per cell** không có sẵn trong `MatrixCell`. Backend tính per-row `salary` theo công thức `coef * effective_wage` (wage công trường ghi đè wage user — `matrix.go:117-121`). Frontend cần thông tin per-cell để nhóm.
- **Giải pháp (PA1 — KISS, đã chốt ở verification)**: load `GetTeamUsers()` song song trong `matrix.tsx`; lập `userWage: Map<userId, dailyWage>` và `wsWage: Map<wsId, dailyWage>` từ `worksites` đã có. Tính per-cell ở frontend:
  ```ts
  const wsWage = cell.worksiteId ? worksiteMap.get(cell.worksiteId)?.dailyWage ?? 0 : 0
  const userWage = userMap.get(row.userId)?.dailyWage ?? 0
  const cellSalary = cell.coefficient * (wsWage > 0 ? wsWage : userWage)
  ```
  Lưu ý: logic `wsWage > 0` khớp backend `if effective == 0 { effective = userDailyWage }`.
- **Grouping**: gộp theo `worksiteId` (null = "Chưa gán"). Với mỗi nhóm: `totalCoef`, `totalSalary`, `wsName` (null → "Chưa gán").
- **Chip màu**: reuse `hashColor(wsName) + '1a'` (alpha ~10% — trùng C3).
- **Collapsible state**: localStorage key `matrix-ws-breakdown-open` (string `'true'|'false'`).
- **Print view**: thêm section `<div class="print-breakdown">...</div>` dưới `<table>` hoặc trong `<tfoot>` extra row.

## Requirements

**Functional:**
- Dưới hàng `<tfoot>` hiện tại, thêm 1 row thứ 2 (chỉ visible khi có dữ liệu):
  - Ô đầu: nút toggle `▾ Theo công trường` / `▸ Theo công trường` span cả hàng.
- Khi expand: render 1 hàng chip (dùng `<div className="flex flex-wrap gap-1 p-2">` trong `<td colSpan=...>`). Mỗi chip: `{wsName}: {totalCoef.toFixed(1)} công · {formatWon(totalSalary)}`. Chip background `hashColor(wsName) + '1a'`, border 1px cùng màu alpha mạnh hơn.
- Chip "Chưa gán" (khi có cell không có worksite) hiển thị bình thường, background `var(--bg-muted)`.
- State `expanded` persist localStorage.

**Print view:**
- Thêm section bên dưới `<tfoot>` (hoặc trong `matrix-print-view.tsx`): tiêu đề "Theo công trường" + bảng nhỏ 3 cột (Tên, Công, Lương) hoặc chip list. Luôn expand khi in.

**Non-functional:**
- Compute breakdown bằng `useMemo` tránh re-compute mỗi render.
- `matrix-footer.tsx` hiện 27 dòng — thêm breakdown vẫn < 100.

## Architecture

```
lib/matrix-utils.ts
  + computeWsBreakdown(matrix, userMap, wsMap): Array<{wsId, wsName, totalCoef, totalSalary}>

matrix.tsx
  + state users (load GetTeamUsers song song)
  + pass userMap, wsMap, breakdown data xuống MatrixTable → MatrixFooter

matrix-footer.tsx
  + prop breakdown + expanded state (localStorage)
  + render 2nd <tr> với chip row

matrix-print-view.tsx
  + render breakdown section (always visible trong print)
```

## Related code files

- `d:/Dự án gốc/Bảng công tự động/frontend/src/lib/matrix-utils.ts`
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/matrix-footer.tsx`
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/matrix-table.tsx`
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/matrix-print-view.tsx`
- `d:/Dự án gốc/Bảng công tự động/frontend/src/pages/matrix.tsx`
- `d:/Dự án gốc/Bảng công tự động/internal/services/matrix.go:117-121` (công thức wage reference)
- `d:/Dự án gốc/Bảng công tự động/frontend/src/lib/utils.ts:4-5` (User/Worksite types có dailyWage)

## Implementation Steps

1. **`matrix-utils.ts`**: thêm function pure:
   ```ts
   export interface WsBreakdownItem {
     wsId: number | null
     wsName: string   // 'Chưa gán' khi null
     totalCoef: number
     totalSalary: number
   }
   export function computeWsBreakdown(
     rows: models.MatrixRow[],
     users: Map<number, { dailyWage: number }>,
     worksites: Map<number, { dailyWage: number }>,
   ): WsBreakdownItem[]
   ```
   - Duyệt `rows[].cells[]`, tính per-cell salary, group theo `worksiteId`.
   - Sort theo `totalCoef desc`.
2. **Unit test** `matrix-utils.test.ts`: 2 user, 3 worksite, 5 cell mix, verify totalCoef/salary + "Chưa gán".
3. **`matrix.tsx`**:
   - Load `GetTeamUsers()` song song trong `load()`.
   - Tạo `userMap` và `wsMap` bằng `useMemo`.
   - `const breakdown = useMemo(() => computeWsBreakdown(matrix.rows, userMap, wsMap), ...)`.
   - Truyền xuống `MatrixTable`.
4. **`matrix-table.tsx`**: forward `breakdown` xuống `MatrixFooter`.
5. **`matrix-footer.tsx`**:
   - Thêm prop `breakdown: WsBreakdownItem[]`.
   - Thêm state `const [open, setOpen] = useState(() => localStorage.getItem('matrix-ws-breakdown-open') !== 'false')` (default expanded? nguyên prompt nói collapsed — verify: prompt "default collapsed"). Default `=== 'true'` (collapsed default).
   - Effect persist on change.
   - Render thêm `<tr>` dưới hàng Tổng:
     ```tsx
     <tr>
       <td colSpan={daysInMonth + 3} style={{ padding: '4px 8px', background: 'var(--bg-muted)' }}>
         <button onClick={toggle}>{open ? '▾' : '▸'} Theo công trường</button>
         {open && <div className="flex flex-wrap gap-1 mt-1">{chips}</div>}
       </td>
     </tr>
     ```
   - Chip: hex alpha từ hashColor (sau C3 dùng `'1a'`).
6. **`matrix-print-view.tsx`**: nhận breakdown, render section dưới table (print luôn hiện).
7. **Smoke test:**
   - Tháng có 3 công trường + vài ô unassigned → chips đầy đủ.
   - Toggle collapsed → next reload vẫn collapsed.
   - In → breakdown hiện.

## Todo list

- [x] `matrix-utils.ts`: computeWsBreakdown + test.
- [x] `matrix.tsx`: load users, userMap/wsMap, breakdown useMemo.
- [x] `matrix-table.tsx`: forward breakdown.
- [x] `matrix-footer.tsx`: toggle + chips + localStorage.
- [x] `matrix-print-view.tsx`: render breakdown section.
- [x] Unit test compute (6 cases).
- [x] Vitest pass (102/102), vite build + go build clean.

## Success Criteria

- [ ] Breakdown đúng (sum phần breakdown == grandTotalCoef / grandTotalSalary).
- [ ] Expanded/collapsed persist localStorage.
- [ ] Chip có màu theo hashColor worksite.
- [ ] "Chưa gán" hiện khi có cell không worksite.
- [ ] Print view show breakdown section.
- [ ] Không file > 200 dòng.

## Risk Assessment

- **Trung bình**: công thức salary có thể lệch so với backend nếu `worksite.dailyWage` lưu cũ vs mới. Vì GetWorksites() + GetTeamMonthMatrix() race: dùng 1 `Promise.all` đảm bảo cùng snapshot (đã có trong matrix.tsx:44-46).
- **Thấp**: print CSS có thể push breakdown qua page break. Set `page-break-inside: avoid` trên section.

## Security Considerations

N/A.

## Next steps

Phase 6 (B2 Fill Sundays) độc lập, có thể làm song song.
