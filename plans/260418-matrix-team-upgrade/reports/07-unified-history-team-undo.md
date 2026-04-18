# Phase 7 — Unified history store + Team tab undo/redo (report)

**Date:** 2026-04-19
**Commit:** 7a60f44 `feat(history): unify matrix + team undo/redo with keyed stacks`
**Status:** Implementation done. Smoke test thủ công còn lại.

## What shipped

### Store refactor
- Rename `stores/matrix-history-store.ts` → `stores/history-store.ts`.
- Shape mới: `stacks: Record<'matrix' | 'team', { past, future }>`.
- Action nhận `ctx`: `push(ctx, e)`, `popUndo(ctx)`, `popRedo(ctx)`, `clear(ctx)`, `counts(ctx)`.
- Giữ MAX=50, MERGE_MS=1000 per context (merge cùng 1 ô trong 1s).

### Matrix wiring (không thay đổi hành vi cũ)
- `use-matrix-history-recorder.ts`: chỉ sửa import + `push('matrix', ...)`.
- `use-matrix-keyboard.ts`: pop với `'matrix'`.
- `matrix.tsx`: clearHistory('matrix') khi đổi month; thêm `onUndoClick`/`onRedoClick` để nút toolbar gọi được.

### Team wiring (mới)
- `lib/use-team-history-recorder.ts` (39 dòng): snapshot 1 cell `{userId, day}` trước/sau mutate dựa trên `records[]` + reload trả về mảng mới.
- `lib/use-team-attendance.ts` (99 dòng): gom `handleSave/handleDelete/handleQuickAdd/handleCopy` + `onUndo/onRedo` + keyboard listener Ctrl+Z/Y/Shift+Z + `clear('team')` effect khi đổi yearMonth hoặc userId.
- `pages/team.tsx`: `loadPersonData` trả `Attendance[] | null`, mount `useTeamHistoryRecorder` qua hook gom, pass undo/redo vào `TeamToolbar`.

### UI
- `components/undo-redo-buttons.tsx` (55 dòng): component chung 2 nút Undo2/Redo2 + badge pill counter, disabled khi count = 0, hiển thị "99+" nếu vượt 99.
- `matrix-toolbar.tsx`: render ở bên trái trước "Thêm người".
- `team-toolbar.tsx`: render luôn (không còn phụ thuộc `hasToday`), kèm nút "Hôm nay".

## Scope limits (theo plan)

- Team undo cover: `UpsertAttendance` + `DeleteAttendance` + `handleQuickAdd` (cùng là Upsert).
- Không cover: `CopyPreviousDay`, `CreateTeamUser`, `UpdateUser`, `DeleteTeamUser`, `advance` (ứng lương).
- Paint mode tiếp tục dùng recorder matrix — không đụng.

## Verification

- TypeScript: `tsc --noEmit` clean.
- Unit tests: `npm run test` — 9 files, 119 tests pass. Test store cover cả 2 ctx (parametrized) + isolation test giữa matrix vs team.
- Build: `wails build -skipbindings` → `BangCong.exe` build OK trong 9.3s.
- File size: tất cả file ≤ 200 dòng. `team.tsx` = 192 dòng sau khi tách `use-team-attendance.ts`.

## Deviations

- Tách thêm `use-team-attendance.ts` (plan gợi ý `use-team-mutations.ts`) để giữ team.tsx dưới 200 dòng. Đóng vai trò tương tự.
- `team-toolbar.tsx` không ẩn khi `!hasToday` nữa — phải luôn hiện để có nút undo/redo. Nút "Hôm nay" ẩn riêng lẻ nếu không có today.

## Risks observed

- Merge MERGE_MS độc lập per ctx: đã đúng vì `push` chỉ xét `top` của ctx đó, không rò rỉ.
- 2 keyboard listener (matrix + team) cùng tồn tại: matrix listener mount trong `matrix.tsx`, team listener mount trong `use-team-attendance.ts` — chỉ 1 trong 2 page hiện tại active tại 1 thời điểm → không xung đột (đã check App route).

## Pending

- Smoke test thủ công 6 kịch bản: (1) team edit + Ctrl+Z, (2) team delete + Ctrl+Z, (3) matrix undo riêng, (4) chuyển tab không ảnh hưởng stack kia, (5) đổi user → team stack clear, (6) đổi month → cả 2 clear.

## Unresolved questions

- Không có.
