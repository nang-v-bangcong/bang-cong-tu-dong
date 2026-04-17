# Phase 3 — Inline Add Person + Search Filter (F1 + F7)

## Context links

- [plan.md](./plan.md)
- [phase-01-backend-apis.md](./phase-01-backend-apis.md) — BulkCreateUsers
- [scout-01-report.md](./scout/scout-01-report.md) — add-person-dialog.tsx có sẵn

## Overview

- **Date:** 2026-04-17
- **Description:** (F1) Button "+ Thêm người" trên matrix header, dialog có tab "1 người" vs "Nhiều (paste list)". (F7) Search input filter team rows theo tên, client-side, không persist.
- **Priority:** Med
- **Implementation status:** pending
- **Review status:** pending

## Key Insights

- add-person-dialog.tsx hiện 51 dòng — extend có thể giữ <200 dòng
- Bulk mode: 1 textarea, parse `split(/\r\n|\n/)` + trim + filter empty
- Search filter: Zustand transient state (no persist)
- Filter applied ở matrix-table (post-fetch) — không re-query backend
- Empty state sau filter: "Không tìm thấy người nào khớp '{query}'"

## Requirements

**F1 — Inline add:**
- Button bên trái search input, ngay trên matrix
- Dialog 2 tab/radio: "Một người" | "Dán nhiều tên"
  - Một người: input + "Thêm" → CreateTeamUser
  - Dán nhiều: textarea multiline → parse → preview count → "Thêm N người" → BulkCreateUsers
- Success toast: "Đã thêm 5 người" + "Đã bỏ qua 2 trùng tên: A, B" (nếu có)
- Auto-refresh matrix sau thêm

**F7 — Search filter:**
- Input ~ 240px width, placeholder "Tìm tên..."
- Filter case-insensitive, `.includes(query)`
- Clear button (X) khi có value
- Empty state khi kết quả 0

## Architecture

```
header.tsx hoặc matrix-toolbar.tsx (NEW)
  ├── + Thêm người button → open AddPersonDialog
  └── Search input → setSearchQuery(v)

add-person-dialog.tsx (extend)
  ├── state: mode: 'single' | 'bulk'
  ├── single: existing logic
  └── bulk: textarea + parse preview + submit BulkCreateUsers

stores/app-store.ts
  + searchQuery: string
  + setSearchQuery(q: string): void

matrix-table.tsx
  + filter rows: rows.filter(r => r.userName.toLowerCase().includes(query.toLowerCase()))
  + empty state for filtered
```

## State shape changes

`app-store.ts`:
```ts
interface AppState {
  // ... existing
  matrixSearch: string              // F7 (transient, not persisted)
  setMatrixSearch: (q: string) => void
}
```

## Related code files

- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/add-person-dialog.tsx` — extend with bulk mode
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/matrix-toolbar.tsx` — NEW (host add button + search input)
- `d:/Dự án gốc/Bảng công tự động/frontend/src/pages/matrix.tsx` — render toolbar above matrix
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/matrix-table.tsx` — apply filter to rows prop
- `d:/Dự án gốc/Bảng công tự động/frontend/src/stores/app-store.ts` — add matrixSearch

## Implementation Steps

1. **Extend `add-person-dialog.tsx`**:
   - Add `mode` state (default `single`)
   - Radio buttons: "Một người" | "Dán nhiều"
   - Bulk branch: `<textarea>`, parse on change, show `{N} tên hợp lệ`
   - On submit bulk: call `onBulkSave(names)` prop; single: `onSave(name)`
   - If file approaches 200 lines: split `add-person-bulk-panel.tsx`
2. **Create `matrix-toolbar.tsx`**:
   - Props: `{search, onSearchChange, onAddClick}`
   - Layout: flex row, gap-2, padding top
   - Add button: `<UserPlus> Thêm người`
   - Search input: left icon `<Search>`, clear `<X>`
3. **Store update**:
   - `matrixSearch: ''`, setter
4. **matrix.tsx**:
   - Import toolbar, place above `<ZoomableArea>`
   - State cho dialog open
   - Handlers: `handleAddPerson(name)` → CreateTeamUser; `handleBulkAdd(names)` → BulkCreateUsers → display toast with skipped list
5. **matrix-table.tsx**:
   - Read `matrixSearch` from store (or pass as prop — prefer prop for testability)
   - Filter `rows` before render
   - Empty state row khi filtered empty
6. **Tests**:
   - `add-person-dialog.test.tsx` (NEW): test bulk mode parse, submit
   - `matrix-toolbar.test.tsx` (NEW): search input clear button
7. **Manual smoke**: paste 5 names (1 duplicate), verify toast shows skipped

## Todo list

- [ ] Store: add `matrixSearch` + setter
- [ ] Create `matrix-toolbar.tsx`
- [ ] Extend `add-person-dialog.tsx` với bulk mode
- [ ] matrix.tsx: render toolbar, dialog, wire BulkCreateUsers
- [ ] matrix-table.tsx: apply filter + empty state
- [ ] Vitest cho add-person-dialog (bulk)
- [ ] Vitest cho matrix-toolbar
- [ ] Manual: paste `A\nB\nC\nA` → 3 created, 1 skipped toast

## Success Criteria

- Bulk paste of 10 names creates 10 users in 1 tx (verify via network tab — 1 API call)
- Duplicate names skipped, toast shows list
- Search "Nguyễn" filters rows instantly (no API call)
- Empty state displayed khi 0 matches
- Dialog closes on success + matrix refreshes
- add-person-dialog.tsx ≤ 200 dòng (or split)

## Risk Assessment

- **Low**: client-side filter trivial
- **Low**: BulkCreateUsers tx isolated, no partial-success confusion

## Security Considerations

- Name max 100 chars enforced server-side
- Trim whitespace, skip empty lines
- No XSS risk — React escapes text

## Next steps

Phase 4 (paste clipboard + copy day).
