# Phase 5 — Visual Enhancements (F9 + F10 + F11)

## Context links

- [plan.md](./plan.md)
- [scout-01-report.md](./scout/scout-01-report.md)

## Overview

- **Date:** 2026-04-17
- **Description:** (F9) Highlight today's column. (F10) Sort rows by name/totalCoef/salary ↑↓. (F11) Toggle để tô màu ô theo worksite.
- **Priority:** Med-Low (polish)
- **Implementation status:** pending
- **Review status:** pending

## Key Insights

- Today match: parse `GetToday()` (sẵn có ở backend) → compare với `yearMonth + day`
- Sort client-side, không cần backend — matrix row count nhỏ
- Cell color: existing `hashColor` in `matrix-utils.ts` → apply as bg với alpha
- Toggle cell color persist trong `localStorage` (UX preference)
- Sort toggle không persist (ephemeral)

## Requirements

**F9 — Today highlight:**
- If `yearMonth` matches current month:
  - Day header cell (number + weekday rows) có bg accent + left border accent
  - Entire column cells có subtle bg tint (indigo-50 light, indigo-900/20 dark)

**F10 — Sort:**
- Click header "Tên" | "Công" | "Lương" → toggle asc/desc/none (3 states)
- Visual indicator: ↑ ↓ ↕ next to header
- Default: none (stable order from backend — already name asc)

**F11 — Cell color by worksite:**
- Toggle button in matrix toolbar: "Tô màu công trường"
- On: cell bg = `hashColor(worksiteName)` với opacity ~0.18
- Off: existing UI (just dot indicator)
- Persist in localStorage `matrix-cell-color` (boolean)

## Architecture

```
stores/app-store.ts
  + matrixSort: {field: 'name'|'coef'|'salary', dir: 'asc'|'desc'} | null
  + matrixCellColor: boolean
  + setMatrixSort, toggleMatrixCellColor

matrix-table.tsx
  ├── sort rows before render via useMemo
  ├── compute today = (new Date() → ym match) → pass todayDay: number | null
  └── pass `cellColor` flag to MatrixCell

matrix-cell.tsx
  ├── prop cellColor: boolean
  └── if cellColor && wsName: bg = hashColorWithAlpha(wsName, 0.18)

matrix-toolbar.tsx (from phase 3)
  + toggle: "Tô màu"

lib/matrix-utils.ts
  + hashColorWithAlpha(name, alpha): string  — return hsla()
  + isTodayMatch(yearMonth): number | null
```

## State shape changes

`app-store.ts`:
```ts
interface AppState {
  matrixSort: { field: 'name' | 'coef' | 'salary', dir: 'asc' | 'desc' } | null
  setMatrixSort: (s: AppState['matrixSort']) => void

  matrixCellColor: boolean    // default false, persisted
  toggleMatrixCellColor: () => void
}
```

## Related code files

- `d:/Dự án gốc/Bảng công tự động/frontend/src/stores/app-store.ts` — extend
- `d:/Dự án gốc/Bảng công tự động/frontend/src/lib/matrix-utils.ts` — add helpers
- `d:/Dự án gốc/Bảng công tự động/frontend/src/lib/matrix-utils.test.ts` — extend tests
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/matrix-table.tsx` — apply sort, today highlight
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/matrix-cell.tsx` — cellColor prop
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/matrix-toolbar.tsx` — sort/color toggles

## Implementation Steps

1. **Store**:
   - Add `matrixSort`, `matrixCellColor` (init from localStorage)
   - Setter persists to localStorage cho cellColor
2. **matrix-utils.ts**:
   - `hashColorWithAlpha(name, alpha)` — return `hsla(h, 65%, 55%, 0.18)`
   - `todayDayIfMatches(yearMonth): number | null` — return day number if current month matches
3. **matrix-table.tsx**:
   - `const todayDay = todayDayIfMatches(yearMonth)`
   - `const sortedRows = useMemo(() => sort by state.matrixSort)`
   - Header `<th>` cho Tên/Công/Lương: onClick → toggle sort; display indicator arrow
   - Pass `isToday = (d === todayDay)` to column render + cell
4. **matrix-cell.tsx**:
   - Add `cellColor: boolean`, `isToday: boolean` props
   - Background priority: selected > focused > sunday > today > worksiteColor
   - Update memo comparator
5. **matrix-toolbar.tsx**:
   - Toggle switch "Tô màu" — read/set store
6. **Tests**:
   - Extend matrix-utils.test.ts: hashColorWithAlpha, todayDayIfMatches
7. **Manual smoke**:
   - Change month to current → today column highlighted
   - Click "Tên" 3× → asc/desc/none cycle
   - Toggle color → cells tinted by worksite

## Todo list

- [ ] Store: matrixSort + matrixCellColor + persist
- [ ] matrix-utils: hashColorWithAlpha + todayDayIfMatches + tests
- [ ] matrix-table: sort logic, today highlight on header + cells
- [ ] matrix-cell: cellColor + isToday bg logic + memo
- [ ] matrix-toolbar: Tô màu toggle
- [ ] matrix-toolbar: sort dropdown (optional) or keep on column headers
- [ ] Vitest additions
- [ ] Manual: test today highlight visually (change ym)

## Success Criteria

- Today column: accent border on header + subtle bg on all cells in that column
- Click "Công" header: rows sort descending totalCoef (default first click = desc for numeric)
- Toggle "Tô màu" ON: cells with worksite show bg tint; OFF: only dot
- Toggle persists across app restart (localStorage)
- All existing tests pass
- matrix-table.tsx ≤ 200 dòng (may need minor refactor)

## Risk Assessment

- **Low**: pure presentational changes
- **Low**: memo comparator — test after change

## Security Considerations

- None (client-side visuals only)

## Next steps

Phase 6 (drag-fill + undo).
