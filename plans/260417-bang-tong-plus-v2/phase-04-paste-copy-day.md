# Phase 4 — Paste Clipboard + Copy Day (F5 + F4)

## Context links

- [plan.md](./plan.md)
- [phase-01-backend-apis.md](./phase-01-backend-apis.md) — BulkUpsertCell, CopyDayForAll
- [researcher-01-grid-ux.md](./research/researcher-01-grid-ux.md) — TSV parse, Papa Parse, boundary check

## Overview

- **Date:** 2026-04-17
- **Description:** (F5) Ctrl+V on matrix parses Excel/Sheets clipboard (TSV + HTML fallback), apply from focus cell với boundary guard. (F4) Right-click day header → "Sao chép sang..." hoặc "Lặp ngày trước".
- **Priority:** Med
- **Implementation status:** pending
- **Review status:** pending

## Key Insights

- Use `papaparse` (~23kb gzip) — handles quoted/multiline cells
- Fallback chain: `text/html` (Sheets) → `text/plain` (Excel/simple)
- Boundary: `min(rows×cols, freeSpace)` from focus → truncate excess + toast
- Only numbers 0..3; non-numeric → skip cell (leave original)
- F4 "Lặp ngày trước" = CopyDayForAll(ym, day-1, day, overwrite=false)
- F4 "Sao chép sang" = UI-driven day picker dialog

## Requirements

**F5 — Paste:**
- Global paste listener on matrix container
- Only active when matrix focus (tab=matrix && matrix focus cell set)
- Parse order:
  1. `clipboardData.getData('text/html')` → extract `<td>` via DOMParser
  2. Else `clipboardData.getData('text/plain')` → papaparse TSV
- Build cells array: iterate grid, for each `rows[i]`, `cells[j]`, target `(focus.row+i, focus.day+j)`
  - Out of bounds → skip + count
  - Invalid number → skip
- Single `BulkUpsertCell` call with coef (no worksite change)
- Toast: "Đã dán N ô" (+ "bỏ qua M" nếu có)

**F4 — Copy day:**
- Day header right-click menu (from phase 2) adds:
  - "Sao chép sang..." → day picker dialog → select dst day → CopyDayForAll
  - "Lặp ngày liền trước" → CopyDayForAll(ym, day-1, day, false)
- Confirm dialog nếu dst day đã có data → overwrite yes/no

## Architecture

```
lib/clipboard-paste.ts (NEW)   — parse logic, ≤100 lines
  ├── parseClipboard(e): string[][]    — returns 2D grid
  ├── parseHtml(html): string[][]
  ├── parseTsv(text): string[][] (papaparse)
  └── coerceNumber(s): number | null

matrix-table.tsx
  ├── onPaste listener → parse → buildCells → apply via prop
  └── boundary check + toast

matrix.tsx
  ├── handlePaste(cells) → BulkUpsertCell
  └── handleCopyDay(src, dst, overwrite) → CopyDayForAll

day-header-menu.tsx (extend from phase 2)
  └── 2 new items: "Sao chép sang...", "Lặp ngày liền trước"

day-picker-popup.tsx (NEW)
  └── grid of day numbers (1..daysInMonth), click to select
```

## Related code files

- `d:/Dự án gốc/Bảng công tự động/frontend/src/lib/clipboard-paste.ts` — NEW
- `d:/Dự án gốc/Bảng công tự động/frontend/src/lib/clipboard-paste.test.ts` — NEW
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/matrix-table.tsx` — add paste listener
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/day-header-menu.tsx` — extend
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/day-picker-popup.tsx` — NEW
- `d:/Dự án gốc/Bảng công tự động/frontend/src/pages/matrix.tsx` — 2 new handlers
- `d:/Dự án gốc/Bảng công tự động/frontend/package.json` — add `papaparse` + `@types/papaparse`

## Implementation Steps

1. **Install deps**: `npm i papaparse && npm i -D @types/papaparse`
2. **Create `lib/clipboard-paste.ts`**:
   - `parseClipboard(dataTransfer: DataTransfer): string[][]`
     - prefer `text/html` if contains `<table>`
     - else `text/plain` via `Papa.parse(text, {delimiter: '\t'})`
   - `parseHtml(html)`: DOMParser → querySelectorAll('tr') → td.textContent
   - `coerceNumber(s)`: replace `,` → `.`, parseFloat, clamp 0..3 else null
3. **matrix-table.tsx**:
   - `onPaste` handler (on container or window while focus):
     ```ts
     if (!focus) return
     e.preventDefault()
     const grid = parseClipboard(e.clipboardData)
     const applied = []
     const skipped = {oob: 0, invalid: 0}
     for each [i][j] in grid:
       const row = focus.rowIdx + i
       const day = focus.day + j
       if row >= rows.length || day > daysInMonth: skipped.oob++; continue
       const n = coerceNumber(grid[i][j])
       if n == null: skipped.invalid++; continue
       applied.push({userId: rows[row].userId, date: dateOf(ym, day), coef: n})
     onPasteCells(applied)
     toast(...)
     ```
4. **matrix.tsx `handlePaste`**:
   - Call `BulkUpsertCell(refs, coef, null)` — BUT BulkUpsertCell applies 1 coef for all cells. Paste has per-cell coef.
   - **Design tweak**: batch by coef value — call BulkUpsertCell N times (N = distinct coef values), typically ≤5 (0, 0.5, 1, 1.5, 2).
5. **Create `day-picker-popup.tsx`** — compact 7×5 grid of day buttons
6. **Extend `day-header-menu.tsx`** — 2 new items
7. **matrix.tsx `handleCopyDay(src, dst, overwrite)`** → CopyDayForAll
8. **Tests**:
   - `clipboard-paste.test.ts`: parse TSV, parse HTML, coerce number, bounds
   - Manual: copy 3x3 from Excel, paste into matrix, verify

## Todo list

- [ ] npm install papaparse + types
- [ ] Create `lib/clipboard-paste.ts`
- [ ] Vitest cho clipboard-paste (TSV, HTML, coerce, edge cases)
- [ ] Paste listener in matrix-table
- [ ] handlePaste trong matrix.tsx (batch per coef)
- [ ] Create `day-picker-popup.tsx`
- [ ] Extend day-header-menu with Copy day items
- [ ] handleCopyDay → CopyDayForAll
- [ ] Manual: Excel copy 5×2 → Ctrl+V at focus → verify
- [ ] Manual: right-click day 20 → "Lặp ngày trước" → day 19 data copies

## Success Criteria

- Paste 3×3 TSV from Excel → 9 cells updated, single API call (batch by coef)
- Paste with overflow (row beyond team count) → toast warning with `bỏ qua N ô ngoài bảng`
- Non-numeric "abc" → skip that cell, others apply
- Copy day 15 → 20 via menu creates attendance matching day 15 for users without day 20
- Overwrite prompt appears when dst has conflicts
- clipboard-paste.ts ≤ 100 dòng

## Risk Assessment

- **Med**: Excel clipboard format varies (CRLF vs LF, quoted cells) — papaparse handles most; add edge-case tests
- **Low**: papaparse 23kb bundle — acceptable
- **Low**: N API calls cho N distinct coef values — still far fewer than N cells

## Security Considerations

- HTML paste: use DOMParser in isolated document — no script exec
- Coef validated server-side
- Paste size limit: first row × cols ≤ matrix size (implicit via bounds)

## Next steps

Phase 5 (visual enhancements) — independent, can ship anytime.
