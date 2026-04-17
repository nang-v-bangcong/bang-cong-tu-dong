# Phase 6 — Drag-Fill + Undo/Redo (F12 + F8)

## Context links

- [plan.md](./plan.md)
- [phase-01-backend-apis.md](./phase-01-backend-apis.md) — BulkUpsertCell
- [researcher-01-grid-ux.md](./research/researcher-01-grid-ux.md) — fill handle CSS zoom pitfall, zundo vs custom

## Overview

- **Date:** 2026-04-17
- **Description:** (F12) Excel-style fill handle on focused cell → drag to extend range + apply source value. (F8) Ctrl+Z / Ctrl+Shift+Z undo/redo action history, 50 entries cap.
- **Priority:** Med-High (complex, ship last among UI phases)
- **Implementation status:** pending
- **Review status:** pending

## Key Insights

- **CSS zoom pitfall**: `matrix` wrapped in `ZoomableArea` → `clientX/Y` not scaled. Use `elementFromPoint` + `data-row`/`data-col` attributes on cells (research recommendation)
- **Undo strategy**: `zundo` middleware (snapshot-based) simpler than diff — matrix state small (~7MB max for 50 snapshots with 3100 cells)
- **Alternative undo**: custom action log (each bulk op = 1 entry with "before" snapshot) — lighter but more code. Start with zundo.
- **Merge consecutive edits**: if same cell edited within 1s → replace top entry instead of push
- **Drag-fill source**: value = source cell's coef (ignore worksite for now, keep worksite intact = partial update via `BulkUpsertCell(cells, coef, null)`)
- Undo persists across save refreshes? NO — reset on mount (pure in-memory).

## Requirements

**F12 — Drag-fill:**
- 4×4px indigo square at bottom-right of focused cell
- Mousedown on handle → track mouse via `elementFromPoint` → highlight preview range (dashed border)
- Range: rectangle from source to current cell (support row+col drag)
- Mouseup → `BulkUpsertCell(cellsInRange, coef=sourceCoef, null)`
- Escape during drag → cancel preview

**F8 — Undo/Redo:**
- `Ctrl+Z` undo, `Ctrl+Shift+Z` (or `Ctrl+Y`) redo
- Track mutations: upsertCell, bulkUpsertCell, bulkDelete, fillDay, copyDay, dayNote, bulkCreateUsers(?)
- 50-entry cap
- Merge consecutive single-cell edits (<1s, same cell)
- Apply via backend call (re-state via reverse ops)

## Architecture

**Drag-fill:**
```
matrix-cell.tsx
  + FillHandle (if isFocused)
  + data-row, data-col, data-user-id, data-day attrs on <td>

lib/use-drag-fill.ts (NEW, hook)
  ├── onMouseDown(startCell)
  ├── mousemove listener: elementFromPoint → find [data-row][data-col]
  ├── preview Set<string>
  ├── renderPreview via state update
  ├── onMouseUp → onCommit(source, range)
  └── Escape → cleanup

matrix-table.tsx
  ├── useDragFill hook
  └── onCommit → call prop onFillRange(source, cells)

matrix.tsx
  handleFillRange(source, cells) → BulkUpsertCell(cells, source.coef, null)
```

**Undo/Redo:**
```
stores/app-store.ts (via zundo middleware)
  ├── wrap only the `matrix snapshot` subset (not entire store — avoid tab switch triggering undo)
  └── OR: separate store `matrix-history-store.ts` (NEW)

matrix-history-store.ts (NEW, recommended)
  import { temporal } from 'zundo'
  state:
    snapshot: TeamMatrix | null
  actions:
    setSnapshot(m: TeamMatrix): merges snapshot (triggers history push)

matrix.tsx
  ├── on load: store.setSnapshot(matrix)
  ├── on mutation: setSnapshot(newMatrix)
  └── useHotkeys: Ctrl+Z → temporal.undo(), apply snapshot back to DB:
       - compute diff, send as bulk ops
       - OR simplest: call a new backend API `SyncMatrix(ym, matrix)` — but that's massive write
       - BETTER: store action log (not just snapshots), undo re-calls API with old values

**Decision**: **action-log undo** (not snapshot-based) — safer with DB persistence.

matrix-action-log.ts (NEW)
  type Action =
    | {type: 'upsertCell', userId, date, before: {coef, wsID}, after: {coef, wsID}}
    | {type: 'bulkUpsert', cells: CellRef[], before: Map<key, {coef,wsID}>, after: {coef?, wsID?}}
    | {type: 'delete', cells: {ref, before}[]}
    | {type: 'dayNote', day, before, after}
    | {type: 'fillDay', day, coef, wsID, createdIDs: int64[]}
    | {type: 'copyDay', src, dst, createdIDs: int64[]}
  
  undoStack: Action[] (max 50)
  redoStack: Action[]
  push(a): cap to 50, clear redoStack
  undo(): pop → execute inverse → push to redo
  redo(): pop → execute → push to undo
```

## State shape changes

New store `stores/matrix-history-store.ts`:
```ts
interface HistoryState {
  past: Action[]
  future: Action[]
  push: (a: Action) => void
  undo: (execReverse: (a: Action) => Promise<void>) => void
  redo: (execForward: (a: Action) => Promise<void>) => void
  clear: () => void
}
```

Transient local state in matrix-table (drag-fill):
```ts
const [fillPreview, setFillPreview] = useState<Set<string>>(new Set())
const fillSourceRef = useRef<{row, day, coef} | null>(null)
```

## Related code files

- `d:/Dự án gốc/Bảng công tự động/frontend/src/lib/use-drag-fill.ts` — NEW hook
- `d:/Dự án gốc/Bảng công tự động/frontend/src/lib/use-drag-fill.test.ts` — NEW
- `d:/Dự án gốc/Bảng công tự động/frontend/src/stores/matrix-history-store.ts` — NEW
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/matrix-cell.tsx` — add data attrs + FillHandle
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/matrix-table.tsx` — wire drag-fill + undo hotkeys
- `d:/Dự án gốc/Bảng công tự động/frontend/src/pages/matrix.tsx` — record actions on each mutation
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/zoomable-area.tsx` — expose zoom value for coord calc (if needed)

## Implementation Steps

### Drag-fill (F12)

1. **matrix-cell.tsx**:
   - Add `data-user-id={userId} data-day={day} data-row={rowIndex}` attrs on `<td>`
   - If `isFocused`, render FillHandle (absolute, bottom-right)
   - Handle's `onMouseDown` calls `onStartFill(userId, day, coef)`
2. **use-drag-fill.ts**:
   ```ts
   function useDragFill(onCommit: (source, cells) => void) {
     const [preview, setPreview] = useState<Set<string>>()
     const source = useRef(null)
     
     const start = (userId, day, coef) => {
       source.current = {userId, day, coef}
       document.addEventListener('mousemove', move)
       document.addEventListener('mouseup', end)
       document.addEventListener('keydown', escape)
     }
     
     const move = (e) => {
       const el = document.elementFromPoint(e.clientX, e.clientY)
       const td = el?.closest('[data-user-id][data-day]')
       if (!td) return
       const targetUser = +td.dataset.userId
       const targetDay = +td.dataset.day
       setPreview(computeRange(source.current, {user: targetUser, day: targetDay}))
     }
     
     const end = () => {
       cleanup()
       if (preview.size > 1) onCommit(source.current, Array.from(preview))
       setPreview(new Set())
     }
     
     const escape = (e) => e.key === 'Escape' && cleanup()
   }
   ```
3. **matrix-table.tsx**:
   - `useDragFill(onFillRange)` — pass source + range up to matrix.tsx
   - Render preview overlay: iterate preview set, dashed border on matching cells
4. **matrix.tsx `handleFillRange`**:
   - Build CellRef[], call BulkUpsertCell(refs, coef=source.coef, null)
   - Record action in history

### Undo/Redo (F8)

5. **Create `matrix-history-store.ts`** with Action union types + push/undo/redo
6. **matrix.tsx**: wrap each mutation handler to record action:
   ```ts
   handleCellSave(uid, day, coef, wsID) {
     const before = matrix.rows[...].cells[day] // capture
     await UpsertAttendance(...)
     history.push({type:'upsertCell', ..., before, after})
     load()
   }
   ```
7. **Undo executor** — reverse each action type:
   - upsertCell: call UpsertAttendance with before values (or DeleteAttendance if before was absent)
   - bulkUpsert: iterate before map, UpsertAttendance per
   - delete: re-insert via UpsertAttendance for each
   - dayNote: UpsertDayNote with before
   - fillDay/copyDay: DeleteAttendance for each createdID
8. **Hotkeys** in matrix-table or matrix page:
   - `Ctrl+Z` → history.undo(execReverse) → load()
   - `Ctrl+Shift+Z` or `Ctrl+Y` → history.redo(execForward) → load()
9. **Merge consecutive**: in `push`, if top action same type + same cell + <1s → replace `after`
10. **Tests**:
    - `use-drag-fill.test.ts`: unit test computeRange logic + keydown escape
    - `matrix-history-store.test.ts`: push/undo/redo/merge/cap

## Todo list

**Drag-fill:**
- [ ] Add data-* attrs to matrix-cell
- [ ] FillHandle render on focused cell
- [ ] Create `use-drag-fill.ts` hook
- [ ] Preview rendering via border
- [ ] Commit via BulkUpsertCell
- [ ] Escape cancel
- [ ] Vitest cho range compute

**Undo:**
- [ ] Create `matrix-history-store.ts` with Action types
- [ ] push() with merge logic
- [ ] undo/redo executors per action type
- [ ] Wire hotkeys Ctrl+Z / Ctrl+Shift+Z
- [ ] Record action in every matrix mutation handler
- [ ] Cap 50 entries
- [ ] Vitest cho history store
- [ ] Manual: edit → Ctrl+Z restore → Ctrl+Shift+Z redo

## Success Criteria

**F12:**
- Drag from focus cell bottom-right to any cell → preview shows dashed rectangle
- Mouseup → all cells in range get source coef (worksite unchanged)
- CSS zoom at 150% → drag still works correctly (test this explicitly)
- Escape during drag → preview clears, no change
- Single API call for range

**F8:**
- Edit 1 cell, Ctrl+Z → cell reverts to previous value
- Bulk set 5 cells to 1, Ctrl+Z → all 5 revert in 1 flow
- Fill day for team, Ctrl+Z → all new entries removed
- 50+ edits → oldest drops off
- Within 1s same cell edits merge (only top entry retained)
- Ctrl+Z until empty → no-op (no error)

## Risk Assessment

- **High**: CSS zoom drag-fill — needs explicit manual test at 150%, 75%, 125% zoom
- **Med**: undo action log complexity — may bloat matrix.tsx beyond 200 dòng. Mitigation: extract handlers to `lib/matrix-actions.ts` helper
- **Med**: race condition if user triggers multiple undos fast — debounce OR disable button while executing
- **Med**: undo of fillDay captures createdIDs — need backend to return IDs (amend Phase 1 API to return []int64)

## Amendment to Phase 1

`FillDayForAllUsers` and `CopyDayForAll` should return `[]int64` (created IDs) instead of just `int` count — needed for undo. Update Phase 1 contract + tests before implementing Phase 6.

## Security Considerations

- Undo cannot resurrect deleted user — user delete is out of scope (Phase doesn't include BulkCreateUsers undo — too complex, YAGNI)
- Action log in-memory, no persist — no data leak risk

## Next steps

Phase 7 (export) — last phase.
