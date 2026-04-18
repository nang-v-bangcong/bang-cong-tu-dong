# Phase 7 — Unified history store (2 stack) + Team tab undo/redo + nút visible

## Context links

- [plan.md](./plan.md)
- [reports/00-codebase-verification.md](./reports/00-codebase-verification.md)
- Depends on Phase 2 (team-toolbar.tsx) và Phase 3 (A3 paint dùng record hiện tại)

## Overview

- **Date:** 2026-04-18
- **Description:** Refactor `matrix-history-store.ts` thành `history-store.ts` hỗ trợ 2 stack keyed context `'matrix' | 'team'`. Tạo `use-team-history-recorder.ts`. Thêm `team-toolbar.tsx` undo/redo button + Ctrl+Z/Y cho team. Nút undo/redo visible trong matrix toolbar với counter.
- **Priority:** Cao (user chờ feature này để sửa nhầm ở Team tab)
- **Implementation status:** Completed (commit 7a60f44)
- **Review status:** Pending (chờ smoke test thủ công)

## Key Insights

- **Refactor store**: đổi shape từ `{ past, future }` (flat) sang `{ matrix: { past, future }, team: { past, future } }`. Giữ MAX=50, MERGE_MS=1000 per context.
- **API không breaking**: thêm param `context` cho mọi action, nhưng provide 2 thin hooks `useMatrixHistory()` và `useTeamHistory()` để gọi nội bộ không cần pass context mỗi lần.
- **Team scope**: undo cover `UpsertAttendance` + `DeleteAttendance` trong `team.tsx` (handleSave, handleDelete). KHÔNG cover CreateTeamUser/Update/Delete user, không cover advances.
- **Snapshot team**: 1 cell = `{ userId, date }`. Reuse `CellSnap` type (đã có `userId, day` + state). Cần biến thể snapshot theo `date` cho team (không qua ma trận nhiều user).
  - Đơn giản hơn: khi team chỉ thao tác 1 user, vẫn có thể dùng `{ userId, day }` với `day = parseInt(date.slice(8,10),10)`.
- **applySnapshot hiện tại** reuse được: nhận `snaps: CellSnap[]` với `state = {coef, wsID, note} | null` → gọi `BulkUpsertCells` / `BulkDeleteAttendance`. Team snapshot cùng shape → OK.
- **UI button**: thêm `Undo2 / Redo2` icon từ lucide trong cả matrix-toolbar + team-toolbar. Disabled khi stack empty. Badge counter (nhỏ, tối đa 99+).
- **Clear history on tab/yearMonth change**:
  - matrix: đã có `useEffect(() => clearHistory('matrix'), [yearMonth])` (đổi signature).
  - team: thêm `useEffect(() => clearHistory('team'), [yearMonth, selected?.id])` — đổi user cũng clear để tránh undo ô của user khác.

## Requirements

**Store refactor (`frontend/src/stores/history-store.ts`, đổi tên file):**
```ts
export type Context = 'matrix' | 'team'
export type CellSnap = { userId: number; day: number; state: {coef, wsID, note} | null }
export type HistoryEntry = { ym: string; before: CellSnap[]; after: CellSnap[]; ts: number }

interface HistoryState {
  stacks: Record<Context, { past: HistoryEntry[]; future: HistoryEntry[] }>
  push: (ctx: Context, e: HistoryEntry) => void
  popUndo: (ctx: Context) => HistoryEntry | null
  popRedo: (ctx: Context) => HistoryEntry | null
  clear: (ctx: Context) => void
  counts: (ctx: Context) => { undo: number; redo: number }
}
```

**Wrapper hooks:**
- `frontend/src/lib/use-matrix-history-recorder.ts`: không thay interface bên ngoài, chỉ gọi `push('matrix', ...)` nội bộ.
- `frontend/src/lib/use-team-history-recorder.ts` (mới): export `{ record }` wrap `UpsertAttendance` + `DeleteAttendance`. Trước mutate: snapshot cell hiện tại từ state local của team page (`records` array). Sau mutate: reload → snapshot mới.
  - Input `record(userId, day, mutate)`.
  - Snapshot trước: tìm `records.find(r => r.date === date)` → state = null nếu không có, ngược lại `{coef, wsID, note}`.
  - `push('team', ...)`.

**Team undo handler:**
- `team.tsx`:
  - Wrap `handleSave`: `teamRecord(selected.id, day, async () => await UpsertAttendance(...))`.
  - Wrap `handleDelete`: tìm cell → `teamRecord(selected.id, day, async () => await DeleteAttendance(id))`.
  - `applySnapshot(ym, snaps)` đã có → `runUndo(entry) = applySnapshot(entry.ym, entry.before)` + reload.
  - Keyboard Ctrl+Z/Y/Shift+Z (copy từ matrix.tsx:117-137).

**UI:**
- `matrix-toolbar.tsx`: thêm props `undoCount, redoCount, onUndo, onRedo`. 2 button bên trái (trước Thêm người). Disabled `== 0`.
- `team-toolbar.tsx` (từ Phase 2): thêm cùng set props + nút Hôm nay. Mount trên AttendanceTable.
- Badge nhỏ trên nút: `{count}` bên góc, style `text-[9px]` pill primary nếu > 0.

## Architecture

```
stores/history-store.ts (rename từ matrix-history-store.ts)
  2 stacks keyed by ctx

lib/use-matrix-history-recorder.ts   (no external change; push('matrix', ...))
lib/use-team-history-recorder.ts     (new)

lib/matrix-history.ts                (snapshot/applySnapshot — unchanged, tái dùng)

pages/matrix.tsx
  + sử dụng useHistoryStore.counts('matrix') → hiển thị badge
  + clearHistory effect đổi signature (pass 'matrix')

pages/team.tsx
  + useTeamHistoryRecorder
  + wrap handleSave, handleDelete
  + keyboard listener Ctrl+Z/Y
  + clearHistory('team') effect
  + TeamToolbar nhận undo/redo props

components/matrix-toolbar.tsx, team-toolbar.tsx
  + undo/redo buttons
```

## Related code files

- `d:/Dự án gốc/Bảng công tự động/frontend/src/stores/matrix-history-store.ts` (→ rename)
- `d:/Dự án gốc/Bảng công tự động/frontend/src/stores/matrix-history-store.test.ts` (cập nhật tests)
- `d:/Dự án gốc/Bảng công tự động/frontend/src/lib/use-matrix-history-recorder.ts`
- `d:/Dự án gốc/Bảng công tự động/frontend/src/lib/matrix-history.ts` (reuse)
- `d:/Dự án gốc/Bảng công tự động/frontend/src/pages/matrix.tsx:29-31, 60, 117-137`
- `d:/Dự án gốc/Bảng công tự động/frontend/src/pages/team.tsx:131-141`
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/matrix-toolbar.tsx`
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/team-toolbar.tsx` (từ Phase 2)

## Implementation Steps

1. **Rename file**: `matrix-history-store.ts` → `history-store.ts`. Cập nhật import trong:
   - `lib/use-matrix-history-recorder.ts`
   - `lib/matrix-history.ts`
   - `pages/matrix.tsx`
   - `stores/matrix-history-store.test.ts` → đổi tên `history-store.test.ts`
2. **Refactor store**: đổi shape sang `stacks: Record<Context, {past, future}>`. Update tests để pass context.
3. **`use-matrix-history-recorder.ts`**: sửa `push` thành `push('matrix', ...)`.
4. **`use-team-history-recorder.ts`** (mới, ≤ 80 dòng):
   ```ts
   export function useTeamHistoryRecorder({ yearMonth, userId, records, reload }: Opts) {
     const push = useHistoryStore(s => s.push)
     const record = useCallback(async (day, mutate) => {
       const date = dateOf(yearMonth, day)
       const existing = records.find(r => r.date === date)
       const before: CellSnap[] = [{ userId, day, state: existing ? {coef: existing.coefficient, wsID: existing.worksiteId ?? null, note: existing.note} : null }]
       await mutate()
       const fresh = await reload()
       const after: CellSnap[] = fresh ? ...
       push('team', { ym: yearMonth, before, after, ts: Date.now() })
     }, [yearMonth, userId, records, reload, push])
     return { record }
   }
   ```
   - `reload` trả về records mới để snapshot after.
5. **`team.tsx`**:
   - Đổi `loadPersonData` trả về `{records, ...}`.
   - Mount `useTeamHistoryRecorder({ yearMonth, userId: selected.id, records, reload: loadPersonData })`.
   - Wrap handlers. Xử lý Delete: input là `id`, cần tìm `date` từ `records` trước mutate.
   - Keyboard listener Ctrl+Z/Y copy từ matrix.tsx.
   - `clearHistory('team')` effect khi yearMonth/selected.id đổi.
6. **`matrix-toolbar.tsx`**: thêm props undo/redo + button + badge counter.
7. **`team-toolbar.tsx`**: thêm cùng set props, render thêm undo/redo bên cạnh Hôm nay.
8. **`matrix.tsx`**: `useHistoryStore.counts('matrix')`, wire handler gọi popUndo/popRedo + runUndo/runRedo.
9. **Test cũ** `history-store.test.ts`: cover cả 2 ctx. `team` ctx đảm bảo isolated với `matrix` ctx.
10. **E2E smoke:**
    - Team: chỉnh ô A=1 → Ctrl+Z → A về 0 (hoặc bị xóa).
    - Team: delete ô → Ctrl+Z → ô hiện lại với state cũ.
    - Matrix undo vẫn hoạt động riêng.
    - Chuyển tab + undo → không ảnh hưởng tab khác.
    - Đổi user trong team → history team clear.
    - Đổi month → cả 2 stack clear.

## Todo list

- [x] Rename `matrix-history-store.ts` → `history-store.ts` + cập nhật imports.
- [x] Refactor store 2 stacks + actions có context.
- [x] Cập nhật test store.
- [x] Cập nhật `use-matrix-history-recorder.ts` với context.
- [x] Tạo `use-team-history-recorder.ts`.
- [x] `team.tsx`: wrap handlers + keyboard + clearHistory effect (tách thêm `use-team-attendance.ts` để team.tsx = 192 dòng).
- [x] `matrix-toolbar.tsx`: undo/redo button + badge (component chung `undo-redo-buttons.tsx`).
- [x] `team-toolbar.tsx`: undo/redo button + badge.
- [x] `matrix.tsx`: wiring counts + handlers.
- [ ] Smoke test đầy đủ (chờ user thao tác trên app thật).
- [x] Vitest + wails build pass (119/119, build OK).

## Success Criteria

- [ ] 2 stack hoàn toàn độc lập (matrix undo không pop team entry).
- [ ] Team Ctrl+Z hoàn tác 1 ô attendance (upsert hoặc delete).
- [ ] Nút undo/redo có counter badge; disabled khi empty.
- [ ] Chuyển user team → team stack clear.
- [ ] Chuyển month → cả 2 stack clear.
- [ ] Không file > 200 dòng (team.tsx ≈ 204 hiện nay — có thể cần tách `use-team-handlers.ts` để dưới 200).
- [ ] Test store pass 100%.

## Risk Assessment

- **Trung bình**: refactor store rủi ro regression undo matrix. Bao bọc test store + smoke test kỹ.
- **Trung bình (file size)**: team.tsx đã 204 dòng. Việc thêm handlers + listener + toolbar mount sẽ đẩy lên ~260. Phải tách `lib/use-team-mutations.ts` (hook gom handleSave, handleDelete, handleQuickAdd, handleCopy wrap với recorder) để giữ team.tsx dưới 200.
- **Thấp**: backwards compat — không có export path ngoài đổi tên; fix import đầy đủ bằng TS compiler.

## Security Considerations

- Undo gọi backend API chuẩn (BulkUpsertCells, BulkDeleteAttendance, UpsertAttendance, DeleteAttendance) → không bypass audit log.
- Scope limit: team undo không cover advances (user confirmed) → không rủi ro ghi đè tài chính.

## Next steps

Phase 8 (polish: Ctrl+C + Help modal + C3) là cuối cùng.
