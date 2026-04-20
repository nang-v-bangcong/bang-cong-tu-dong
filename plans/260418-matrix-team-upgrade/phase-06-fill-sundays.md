# Phase 6 — Fill all Sundays bulk action

## Context links

- [plan.md](./plan.md)
- [reports/00-codebase-verification.md](./reports/00-codebase-verification.md)
- Template Go: `internal/services/matrix_fill.go:19-88` (`FillDayForAllUsers`)

## Overview

- **Date:** 2026-04-18
- **Description:** Thêm Go service mới `FillSundaysForAllUsers` chấm toàn bộ Chủ nhật trong tháng cho mọi user trong 1 transaction. Frontend có dialog chọn preset + ghi đè + toast kết quả. Tích hợp undo.
- **Priority:** Trung bình (tiết kiệm rất nhiều click cho tháng có 4-5 CN)
- **Implementation status:** Pending
- **Review status:** Pending

## Key Insights

- **Atomic tx ở Go** tốt hơn loop `FillDayForAllUsers` per day ở frontend (ít transaction overhead, 1 audit log).
- **Tái sử dụng SQL pattern**: copy `matrix_fill.go:FillDayForAllUsers` logic, chỉ thay step tính day list = loop 1..daysInMonth chọn day có weekday = Sunday (`time.Sunday`).
- **Undo**: dùng `recordFromKeys(beforeKeys, mutate, afterKeys)` pattern có sẵn (`use-matrix-history-recorder.ts:29-47`). `beforeKeys`/`afterKeys` = cells của mọi user × mọi Chủ nhật.
- **Audit log**: 1 entry duy nhất "fill_sundays" với message chi tiết.

## Requirements

**Backend (`internal/services/matrix_fill.go`):**
```go
func FillSundaysForAllUsers(yearMonth string, coef float64, worksiteID *int64, overwrite bool) (int, error)
```
- Validate `yearMonth`, `coef` (0 < coef ≤ 3).
- Tính danh sách ngày Chủ nhật trong tháng.
- Lấy team user IDs (`is_self = 0`) — giống `FillDayForAllUsers`.
- 1 transaction, 1 prepared stmt (overwrite vs ignore SQL như template).
- Loop (uid, day) exec stmt. Count `RowsAffected`.
- `WriteAudit("fill_sundays", "attendance", affected, "Điền các Chủ nhật tháng <ym> hệ số <c> (<overwrite>): N ô")`.
- Return `(affected, error)`.

**Unit test** `internal/services/matrix_fill_test.go` (extend, không thêm file):
- 3 user × tháng 4 CN (2026-04 có 5 CN), overwrite=false, không cell sẵn → 3*5=15 affected.
- 1 user pre-filled 1 ngày, overwrite=false → affected=14, cell đó giữ nguyên.
- overwrite=true → 15 ghi đè.

**Wails binding** (`app.go`):
```go
func (a *App) FillSundaysForAllUsers(yearMonth string, coef float64, worksiteID *int64, overwrite bool) (int, error) {
  return services.FillSundaysForAllUsers(yearMonth, coef, worksiteID, overwrite)
}
```
Regen bindings (thường `wails dev` tự regen; hoặc `wails generate module`).

**Frontend:**
- Component mới `components/fill-sundays-dialog.tsx` (< 120 dòng):
  - Props: `open, yearMonth, worksites, onClose, onConfirm`.
  - Form: input coef (default `1`, preset buttons 0.5/1/1.5/2), nút "Công trường..." (mở `WorksitePickerPopup`), checkbox "Ghi đè ô có sẵn".
  - Hiển thị danh sách CN của tháng (dạng label: "CN 5, 12, 19, 26").
  - Nút Xác nhận → `onConfirm(coef, wsId, overwrite)` → toast "Đã chấm N Chủ nhật".
- Button trong `matrix-toolbar.tsx`: "🗓️ Chấm CN" (icon `CalendarDays` từ lucide).
- `matrix.tsx` handler:
  ```ts
  const handleFillSundays = useCallback(async (coef, wsId, overwrite) => {
    const sundays = listSundays(yearMonth) // from matrix-utils
    const keys: BulkCells = []
    matrix.rows.forEach(r => sundays.forEach(d => keys.push({ userId: r.userId, day: d })))
    await recordFromKeys(keys, async () => {
      const n = await FillSundaysForAllUsers(yearMonth, coef, wsId, overwrite)
      toast.success(`Đã chấm ${n} Chủ nhật`)
    })
  }, [yearMonth, matrix, recordFromKeys])
  ```
- Nhưng `recordFromKeys` đã wrap bởi `useMatrixMutations` — expose thêm method `onFillSundays(coef, wsId, overwrite)` trong `use-matrix-mutations.ts`. Import `FillSundaysForAllUsers` từ wails.

**Helper**: thêm `matrix-utils.ts`:
```ts
export function listSundays(yearMonth: string): number[] {
  const dim = getMonthDays(yearMonth)
  const result: number[] = []
  for (let d = 1; d <= dim; d++) if (isSundayOf(yearMonth, d)) result.push(d)
  return result
}
```

## Architecture

```
Backend:
  matrix_fill.go  + FillSundaysForAllUsers
  app.go          + FillSundaysForAllUsers wrapper
  matrix_fill_test.go  + tests

Frontend:
  matrix-utils.ts  + listSundays
  use-matrix-mutations.ts  + onFillSundays (uses recordFromKeys)
  components/fill-sundays-dialog.tsx  (new)
  components/matrix-toolbar.tsx  + button "Chấm CN"
  pages/matrix.tsx  + state + handler + dialog
```

## Related code files

- `d:/Dự án gốc/Bảng công tự động/internal/services/matrix_fill.go:19-88` (copy pattern)
- `d:/Dự án gốc/Bảng công tự động/internal/services/matrix_fill_test.go` (extend)
- `d:/Dự án gốc/Bảng công tự động/app.go:163-169`
- `d:/Dự án gốc/Bảng công tự động/frontend/src/lib/use-matrix-mutations.ts:126-135` (`onFillDay` template)
- `d:/Dự án gốc/Bảng công tự động/frontend/src/lib/matrix-utils.ts:13` (`isSundayOf` đã có)
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/worksite-picker-popup.tsx` (reuse)
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/copy-day-dialog.tsx` (template dialog style)

## Implementation Steps

1. **Go service** `FillSundaysForAllUsers`:
   - Copy `FillDayForAllUsers` thân body.
   - Khác biệt: thay `date := fmt.Sprintf("%s-%02d", yearMonth, day)` bằng loop:
     ```go
     first, _ := time.Parse("2006-01", yearMonth)
     dim, _ := daysInMonth(yearMonth)
     var sundays []int
     for d := 1; d <= dim; d++ {
       if time.Date(first.Year(), first.Month(), d, 0, 0, 0, 0, time.UTC).Weekday() == time.Sunday {
         sundays = append(sundays, d)
       }
     }
     ```
   - Loop nested: for uid, for sunday → exec stmt với `fmt.Sprintf("%s-%02d", yearMonth, sunday)`.
2. **Go test** extend `matrix_fill_test.go` 3 case (đã nêu).
3. **`app.go`**: thêm wrapper 5-line.
4. **Regen Wails bindings**: chạy `wails dev` hoặc `wails generate module`. Verify `frontend/wailsjs/go/main/App.d.ts` có `FillSundaysForAllUsers`.
5. **`matrix-utils.ts`**: `listSundays`.
6. **`use-matrix-mutations.ts`**: thêm `onFillSundays`:
   ```ts
   const onFillSundays = useCallback(async (coef, wsID, overwrite) => {
     const current = matrixRef.current
     const sundays = listSundays(ym)
     const keys = current
       ? current.rows.flatMap(r => sundays.map(d => ({ userId: r.userId, day: d })))
       : []
     try {
       await recordFromKeys(keys, async () => {
         const n = await FillSundaysForAllUsers(ym, coef, wsID, overwrite)
         toast.success(n > 0 ? `Đã chấm ${n} Chủ nhật` : 'Không có ô nào thay đổi')
       })
     } catch { toast.error('Lỗi chấm Chủ nhật') }
   }, [ym, recordFromKeys])
   ```
   Return thêm trong object của hook.
7. **`fill-sundays-dialog.tsx`** (pattern từ `copy-day-dialog.tsx`):
   - Preset buttons coef, input coef custom.
   - Nút chọn worksite (anchor popup).
   - Checkbox overwrite.
   - Label "Các Chủ nhật: {ngày...}" preview từ `listSundays(ym)`.
8. **`matrix-toolbar.tsx`**: thêm prop `onFillSundaysClick`, button `🗓️ Chấm CN`.
9. **`matrix.tsx`**: state `showFillSundays`, render dialog, wire handler (dùng `m.onFillSundays` từ mutations).
10. **Smoke:**
    - Mở dialog, xem preview CN.
    - Chấm: thấy toast count, matrix update.
    - Undo (Ctrl+Z) → hoàn tác toàn bộ.
    - Overwrite ON vs OFF cho ô đã sẵn.

## Todo list

- [ ] `matrix_fill.go`: FillSundaysForAllUsers.
- [ ] `matrix_fill_test.go`: 3 test case.
- [ ] `app.go`: Wails wrapper.
- [ ] Regen bindings (verify App.d.ts).
- [ ] `matrix-utils.ts`: listSundays + test.
- [ ] `use-matrix-mutations.ts`: onFillSundays.
- [ ] `fill-sundays-dialog.tsx` (mới, < 120 dòng).
- [ ] `matrix-toolbar.tsx`: button.
- [ ] `matrix.tsx`: state + handler.
- [ ] Smoke E2E + undo test.
- [ ] `go test ./internal/services/...`, `npm run test`, `wails build` pass.

## Success Criteria

- [ ] Backend test pass cả 3 case.
- [ ] Fill Sundays 1 tháng 5 CN × 3 user → 15 affected (overwrite=true).
- [ ] Ô đã sẵn giữ nguyên khi overwrite=false.
- [ ] Undo hoàn tác đúng 15 ô.
- [ ] Audit log 1 entry.
- [ ] File mới ≤ 120 dòng.

## Risk Assessment

- **Thấp**: copy logic từ `FillDayForAllUsers` đã production.
- **Trung bình**: `recordFromKeys` với list lớn (100 user × 5 CN = 500 keys) — snapshot size OK (< 50 entry cap của history store không áp dụng vì đây là 1 entry).
- **Thấp**: Wails binding regen drift — chạy `wails dev` 1 lần đủ.

## Security Considerations

- SQL injection không (placeholders).
- Validate coef range trong Go (đã có pattern).

## Next steps

Phase 7 (B4+B5 unified history + team undo) có thể chạy sau.
