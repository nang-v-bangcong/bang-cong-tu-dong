# Phase 1 — Bug fix auto-fill + Cell redesign 42×32 + worksite text label

## Context links

- [plan.md](./plan.md)
- [reports/00-codebase-verification.md](./reports/00-codebase-verification.md)
- Docs: `docs/user-guide.md` (domain)

## Overview

- **Date:** 2026-04-18
- **Description:** Sửa bug ô mới focus tự lưu kế quả gõ của ô cũ (A1). Đổi layout ô matrix sang 42×32, bỏ chấm màu công trường, hiển thị tên công trường 2 dòng với ellipsis (A2).
- **Priority:** Cao nhất (bug bản chất; cell layout mở đường cho A3, B1, B3)
- **Implementation status:** Pending
- **Review status:** Pending

## Key Insights

- **A1 root cause:** `matrix-row.tsx:44` truyền `editSignal = 0` cho mọi ô không focus. Khi user focus ô mới (vd B), `MatrixCell` mount (hoặc tái render) với `startEditingSignal` đột nhiên = số thật (vd 3). `signalRef.current` khởi tạo = `startEditingSignal` lần đầu render (= 0 khi chưa focus, = 3 khi vừa focus). Nhưng vì ô A trước đó đã tăng `editSignal` lên 3, ô B tái render có `startEditingSignal=3` và `signalRef.current` cũ là 0 (lúc chưa focus) → `useEffect` thấy changed → `setEditing(true)` dùng `initialEditChar` còn sót → commit "1" lên B.
- **A1 fix:** Luôn truyền `editSignal` thật từ `matrix-row.tsx`, không điều kiện theo focus. `useEffect` trong `matrix-cell.tsx:49-53` đã có guard `if (changed && isFocused)` nên sẽ chỉ mở editor đúng ô focus. `initialEditChar` cũng phải cấp theo `isFocused`.
- **A2 layout:** Giữ `formatCoef` cho dòng 1 (11px bold). Dòng 2 hiển thị `worksiteName` 8px `text-ellipsis`, có `title={wsName}`. Ẩn dòng 2 khi `!wsId`. Khi editing → chỉ hiện input ở giữa, ẩn cả 2 dòng.
- **A2 wsTint + colorOn** không đổi (C3 sẽ chỉnh alpha riêng).
- **Export Excel/PDF không đụng code backend serialization** vì backend serialize theo `worksite_name`, không phụ thuộc layout UI.

## Requirements

**Functional A1:**
- New user → click ô A, gõ `1`, click ô B → ô B trống, **KHÔNG** auto-commit 1.
- Vẫn hỗ trợ gõ số trên ô focus để mở editor (behavior cũ).

**Functional A2:**
- Cell size `42×32` (tăng từ 38×28) giữ column layout cân đối trong 31 ngày.
- Dòng 1 (coef): 11px bold, khi `coef === 0` hiển thị rỗng (hiện tại `formatCoef(0) = ''`).
- Dòng 2 (worksite name): 8px, CSS ellipsis `overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 100%`. `title={wsName}` tooltip.
- Bỏ hoàn toàn chấm màu (xóa `wsDotColor` và block `<span className="absolute bottom-0.5 right-0.5">`).
- `wsTint` giữ nguyên logic + alpha (C3 polish riêng).

**Non-functional:**
- Memo comparator `MatrixCell.memo` phải ổn định — không re-render mass khi chỉnh coef 1 ô.
- File `matrix-cell.tsx` hiện 197 dòng. Sau A2 có thể vượt; nếu vượt tách helper `cell-content.tsx` (hoặc extract nhóm style sang `matrix-cell-styles.ts`).

## Architecture

```
matrix-row.tsx
  └─ truyền editSignal thật (không điều kiện)

matrix-cell.tsx (có thể tách nếu > 200 dòng)
  ├─ useEffect đã có guard → không đổi logic
  ├─ Layout JSX khi !editing:
  │    <div flex flex-col items-center justify-center h-full>
  │      <span className="leading-none font-bold" style={{fontSize:11}}>{formatCoef(coef)}</span>
  │      {wsId && <span className="leading-none truncate" style={{fontSize:8, maxWidth:40}} title={wsName}>{wsName}</span>}
  │    </div>
  ├─ Bỏ wsDotColor + <span.absolute>
  └─ minWidth/width 42, height 32 (td style)
```

## Related code files

- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/matrix-row.tsx:44-45`
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/matrix-cell.tsx:46, 91, 120-152`
- `d:/Dự án gốc/Bảng công tự động/frontend/src/lib/use-matrix-selection.ts:88-89` (nơi `setEditChar` / `setEditSignal`)
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/matrix-table.tsx` (nếu `stickyRight.right=100` cần điều chỉnh do cell rộng hơn — kiểm tra visual).

## Implementation Steps

1. **Fix A1** trong `matrix-row.tsx`:
   ```diff
   - startEditingSignal={focus?.userId === row.userId && focus?.day === d ? editSignal : 0}
   + startEditingSignal={editSignal}
   ```
   Giữ `initialEditChar={focus?.userId === row.userId && focus?.day === d ? editChar : undefined}` (đúng rồi).
2. **Kiểm chứng A1 thủ công**: khởi động `wails dev` → new user → click ô → gõ `1` → click ô khác → xác nhận ô mới không có số.
3. **Redesign cell A2** trong `matrix-cell.tsx`:
   - Xóa `wsDotColor` (dòng 46) và block render dot (dòng 146-152).
   - Đổi td style: `minWidth: 42, width: 42, height: 32`.
   - Thêm JSX wrapper `<div>` 2 dòng với flex-col cho `!editing` branch. Dòng 2 chỉ render khi `wsId`.
   - Input editing chiếm full height (đã có `w-full h-full`).
4. **Kiểm tra line count** `matrix-cell.tsx`. Nếu > 200: tách `<CellContent>` component cục bộ ở file mới `matrix-cell-content.tsx` hoặc nhóm style vào `matrix-cell-styles.ts`. File ≤ 200 dòng.
5. **Chạy test** `npm run test` (vitest). Kỳ vọng không test nào break vì snapshot/logic ô không đổi.
6. **Build check** `wails build` — kiểm tra không lỗi.
7. **Smoke test export:** xuất Excel 1 tháng, mở file → cột worksite đúng. Xuất PDF (print) — kiểm tra matrix-print-view hiển thị OK (không đổi).
8. **Visual QA:** 31 cột 42px = 1302px + sticky cột tên + 2 cột tổng ≈ 1500px. Trên màn 1366 có scroll ngang, OK. Zoom OK.

## Todo list

- [ ] `matrix-row.tsx`: bỏ điều kiện trên `startEditingSignal`.
- [ ] `matrix-cell.tsx`: đổi kích thước 42×32.
- [ ] `matrix-cell.tsx`: thêm dòng 2 worksite name (ellipsis + title).
- [ ] `matrix-cell.tsx`: xóa dot indicator.
- [ ] Nếu file > 200 dòng: tách `cell-content.tsx` hoặc extract styles.
- [ ] Smoke test: new user → gõ số → click ô khác → verify bug gone.
- [ ] Vitest `npm run test` pass.
- [ ] `wails build` pass.
- [ ] Smoke Excel + PDF export giữ nguyên dữ liệu.

## Success Criteria

- [ ] Thao tác Gõ → click ô khác KHÔNG auto-fill (A1).
- [ ] Ô hiển thị coef + tên công trường (khi có) trên 2 dòng, tên bị cắt bằng ellipsis có tooltip (A2).
- [ ] Không còn chấm tròn màu ở góc ô.
- [ ] `wsTint` vẫn hoạt động khi bật "Màu ô".
- [ ] Tất cả test cũ pass; không file > 200 dòng.
- [ ] Excel + PDF export giữ nguyên dữ liệu.

## Risk Assessment

- **Thấp**: A1 chỉ đổi 1 dòng trong row; guard đã có trong cell effect.
- **Trung bình (visual)**: Cell rộng hơn có thể đẩy sticky right cột tổng. Kiểm tra trên laptop 1366 và 1920. Nếu visual tệ → giảm font dòng 2 xuống 7px hoặc tăng cell width 44.
- **Thấp**: Memo comparator không đổi (các field so sánh không đổi).

## Security Considerations

N/A — desktop app, không expose network, không xử lý input người khác.

## Next steps

Phase 2 (A4 Hôm nay) độc lập, có thể làm song song. Phase 3 (A3 paint) cần xong Phase 1 để paint handler biết cell đã dùng layout mới.
