# Grid UX Features Research: Clipboard + Fill Handle + Undo/Redo

## A. Clipboard Paste (TSV/CSV/HTML)

### Pattern
Excel stores clipboard in **multiple MIME types**: use fallback chain:
1. `text/html` (Google Sheets, rich table) → parse `<td>` via DOM
2. `text/plain` (Excel/Sheets TSV) → parse tabs & newlines
3. Skip images & RTF

### TSV Parsing Strategy
```js
const pasteText = e.clipboardData.getData('text/plain');
const rows = pasteText.split(/\r\n|\r|\n/).map(row => 
  row.split('\t')
);
```

**Edge Cases:**
- **Quoted cells** (multiline content): Cell "a\nb" → parse as CSV, not naive tab-split. Use [Papa Parse](https://www.papaparse.com/) or [SheetJS](https://docs.sheetjs.com/docs/demos/local/clipboard/) lib
- **CRLF handling**: Excel uses `\r\n`, Sheets uses `\n`. Regex fallback handles both
- **Trailing empty cols**: Trim each row, ignore extras
- **HTML table from Google Sheets**: Extract rows via `querySelectorAll('tr')`, cells via `td/th`

### Boundary Check (100×31 grid)
```js
const MAX_ROWS = 100, MAX_COLS = 31;
const pastedRows = Math.min(rows.length, MAX_ROWS);
const pasteCols = Math.max(...rows.map(r => r.length));

if (pasteCols > MAX_COLS) {
  toast.warning(`Paste limited to ${MAX_COLS} columns`);
  rows = rows.map(r => r.slice(0, MAX_COLS));
}
```

### Recommendation
- For **simple TSV**: regex split (shown above)
- For **quoted cells or multiline**: [Papa Parse](https://www.papaparse.com/) (23kb gzipped)
- **Don't use SheetJS** for paste only—too heavy. SheetJS best for file import/export

---

## B. Drag-Fill Handle (Excel-style)

### Pattern
**Fill handle = small square @ cell bottom-right** you drag to repeat values.

**Event flow:**
```
mousedown (fill handle) → mouseenter(cells) → preview overlay → mouseup(commit)
```

### CSS Zoom Complexity ⚠️
App uses CSS `zoom` property → **mouse coordinates are pre-scaled by browser**. 
- `clientX/Y`: NOT affected by CSS zoom (relative to viewport)
- `pageX/Y`: NOT affected by CSS zoom (relative to document)
- Physical cursor position ≠ logical position in zoomed container

**Solution**: Use `getBoundingClientRect()` on grid cells, adjust with zoom:
```js
const zoom = getComputedStyle(gridContainer).zoom || 1;
const rect = cell.getBoundingClientRect();
const logicalX = (clientX - rect.left) / zoom;
```

Or simpler: **data-row/data-col attributes** on cells → `elementFromPoint()` returns element, extract via dataset.

### Implementation Sketch
```js
// Detect fill handle drag
fillHandle.onmousedown = (e) => {
  const startCell = e.target.closest('[data-row][data-col]');
  const startRow = +startCell.dataset.row;
  preview = new Set([startRow]);
  
  document.onmousemove = (e) => {
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const underCell = under?.closest('[data-row][data-col]');
    if (underCell) {
      const endRow = +underCell.dataset.row;
      preview = rowRange(startRow, endRow);
      renderPreview(preview); // dashed border
    }
  };
  
  document.onmouseup = () => {
    commitFill(startCell, preview);
    preview.clear();
    document.onmousemove = null;
  };
};
```

**Escape to cancel**: `window.onkeydown = (e) => e.key === 'Escape' && cleanup()`

### Library Comparison (fill handle only)
| Library | Fill Handle | Bundle | Best For |
|---------|----------|--------|----------|
| [Handsontable](https://handsontable.com/docs/react-data-grid/autofill-values/) | ✅ auto-fill, double-click to end | 1.2MB | Spreadsheet UX |
| [AG Grid](https://ag-grid.com/react-data-grid/cell-selection-fill-handle/) | ✅ `fillStart`/`fillEnd` events | 2MB community | Enterprise |
| [React Data Grid](https://github.com/adazzle/react-data-grid) | Basic copy/paste, no native fill | 50kb | Simple grids |
| **Custom impl** | ✅ full control | — | 100×31 only |

**Recommendation**: **Custom** (cheapest for fixed grid size). Handsontable if need formula support.

---

## C. Undo/Redo Stack (Zustand + Middleware)

### Two Patterns

#### 1. **Zundo (Snapshot-based)**
```js
import { create } from 'zustand';
import { temporal } from 'zundo';

const useStore = create(
  temporal((set) => ({
    cells: {},
    setCells: (cells) => set({ cells }),
  }), { limit: 50 })
);

// Usage
useStore.temporal.undo();
useStore.temporal.redo();
```

**Pros**: Simple, works with any state shape.  
**Cons**: Memory grows linearly if state is large.

#### 2. **Zustand-Travel (JSON Patch-based)**
Uses RFC 6902 patches (deltas):
```json
[{ "op": "replace", "path": "/cells/0", "value": "new" }]
```

**Pros**: Memory-efficient for sparse changes.  
**Cons**: More complex, need immutable updates.

### Memory Strategy (50-entry cap, 100×31 grid)

**Snapshot size**: 1 cell = ~50 bytes → 100×31 = ~155kb/snapshot  
**50 snapshots = ~7.75MB** (acceptable, avg laptop has 4GB+)

**Group consecutive edits**: 
```js
const groupKey = `${row}:${col}`;
if (lastAction.key === groupKey && Date.now() - lastAction.ts < 500) {
  history[history.length - 1] = currentAction; // merge, don't append
} else {
  history.push(currentAction);
}
```

### Recommendation
- **Start with Zundo** (simpler, grid is small)
- Only switch to Zustand-Travel if memory issues appear (profile first)
- Cap history @ **50 entries** (easy to increase)
- **No backend sync** needed—local state only (single-user desktop app)

---

## Summary: Recommended Stack

```
Paste: Papa Parse (quoted cells) or regex (simple TSV)
Fill Handle: Custom (data-attr + elementFromPoint, handle zoom via getBoundingClientRect)
Undo/Redo: Zundo v4 (simple snapshots, sufficient for grid size)
```

---

## Unresolved Questions
- Should fill handle support pattern fill (1, 2, 4, 8…) or just repeat last value?
- Paste: preserve formatting (dates, numbers) or paste raw text only?
- Paste: show preview before commit, or direct paste?
- Undo: group by cell, by row, or by "paste operation"?
- CSS zoom: confirmed app uses it—does it also use CSS scale/transform? (affects coordinate calc)

---

## Sources
- [Syncfusion Clipboard Operations](https://www.syncfusion.com/blogs/post/clipboard-operations-in-react-spreadsheet)
- [SheetJS Clipboard Docs](https://docs.sheetjs.com/docs/demos/local/clipboard/)
- [Handsontable Autofill](https://handsontable.com/docs/react-data-grid/autofill-values/)
- [AG Grid Fill Handle](https://ag-grid.com/react-data-grid/cell-selection-fill-handle/)
- [Zundo GitHub](https://github.com/charkour/zundo)
- [Zustand-Travel GitHub](https://github.com/mutativejs/zustand-travel)
- [MDN Mouse Events & Coordinates](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/pageX)
- [elementFromPoint Usage](https://webplatform.github.io/docs/dom/Document/elementFromPoint/)
