# Research: Export & Performance Strategies for 100×31 Matrix (3100 cells)

**Date:** 2026-04-17 | **Status:** Completed

---

## A. Excel Export: Frontend vs Backend?

### JavaScript Libraries
| Lib | Bundle (gzip) | Formats | Merged Cells | Color/Border | Use Case |
|-----|---|---|---|---|---|
| **SheetJS (xlsx)** | ~375KB (bloated) | XLSX/XLS/ODS/CSV | ✓ | ✓ | Read+Write, multi-format |
| **ExcelJS** | Lighter | XLSX only | ✓ | ✓ Full control | New generation, streaming |
| **write-excel-file** | ~50KB | XLSX only | Limited | Basic | Lightweight, offline OK |

**Verdict:** For offline Wails app, **write-excel-file** (50KB) sufficient for basic export. If formatting needed (colored Sunday cols, borders), use **ExcelJS** (~100KB gzip). Avoid SheetJS for frontend—bloated.

### Go Backend Libraries
| Lib | Maintenance | Streaming | Features | Size |
|-----|---|---|---|---|
| **xuri/excelize** | Active 2025 | Yes (huge datasets) | XLAM/XLSM/XLTM support, charts | Full-featured |
| **tealeg/xlsx** | Passive | Dropped v3.0 | XLSX basic | Lightweight |

**Verdict:** **xuri/excelize** for backend. Better maintained, streaming for future scale, more features. `tealeg/xlsx` simpler if only XLSX.

### Wails Pattern (File Download)
```go
// Backend returns filepath string
export async ExportExcel(filename: string) (string, error)

// Frontend: 
1. Call ExportExcel → get Go file path
2. runtime.SaveFileDialog() for user path
3. os.WriteFile(userPath, bytes)
```
Pattern: **Backend generates → SaveFileDialog returns path → os.WriteFile**. No base64 hassle.

**Recommendation:** Backend-gen Excel (faster, no frontend bundle bloat). Use **excelize** in Go. Frontend: handle dialog + file write only.

---

## B. PDF Export via Print CSS

### Solution: Native window.print() + @media print
```css
@media print {
  @page { size: A4 landscape; margin: 10mm; }
  body { overflow: visible; height: fit-content; }
  .print-hide { display: none; }
  table { page-break-inside: avoid; }
  .sunday-col { background: #f0f0f0; }
}
```

### For 100×31 Matrix on A4 Landscape
- **Font:** 9-10px (fits ~11 cols per A4 width, 31 rows fits 1 page height)
- **Zoom CSS:** `transform: scale(0.9)` or `font-size: 0.85em`
- **Page breaks:** Use `page-break-after: auto` on 31-row sections
- **No library needed:** `window.print()` + CSS sufficient for simple table

**Verdict:** Don't use **react-to-print** library. Too heavy. Native print CSS is simpler for matrix. Create `<PrintView>` component with `@media print`, toggle visibility.

**Unresolved:** Page-break behavior across rows may need testing (Excel-like view harder than CSS print).

---

## C. Performance: 3100 Cells

### React.memo + useMemo (Already Correct)
- Memoize cell components → skip re-renders on parent state change
- `useMemo(itemData)` in row → prevent child list re-build
- Bulk ops (paste 100+ cells): batch setState in Go backend, single `setAttendance()` call

### Virtual Scrolling: **NOT Critical**
- **Standard table 100×31:** ~3100 DOM nodes. Modern browsers handle fine.
- **react-window FixedSizeList:** 77% load improvement for 2000-row *lists* (1D). Matrix (2D) needs custom logic.
- **Decision:** Skip virtual scrolling. Row+col sticky headers incompatible with react-window. Optimize via React.memo + useMemo first. If >100 rows, revisit.

### SQLite Bulk Ops
- **No transaction limit** for 3100 rows. Safe to INSERT 3100 rows in 1 transaction.
- **Chunking:** Only needed for 10K+ rows or slow network (Wails IPC is local → fast).
- **Practice:** Single `InsertManyAttendance(rows []Attendance)` in Go, wrapped in `tx.Begin()...tx.Commit()`.

### Sticky Header/Column
- **CSS `position: sticky`** works with scrolled containers ✓
- **Not compatible** with react-window (virtual wins over sticky).
- **Recommendation:** Use CSS sticky (simpler, sufficient for 100 cols).

**Verdict:** React.memo + useMemo solves 95% pain. Virtual scrolling is overengineering for matrix. Focus on: data locality, batch updates, no render thrashing.

---

## Recommendations Summary

| Task | Approach | Why |
|------|----------|-----|
| **Excel Export** | Backend (excelize) | Offline, no frontend bloat, faster |
| **PDF** | window.print() + CSS | No deps, native, simple |
| **Performance** | React.memo + useMemo + batch updates | 3100 cells OK without virtualization |
| **Virtualization** | Skip for now | Incompatible sticky headers, over-engineering |

---

## Sources

- [I Tested Three Node.js Excel Libraries So You Don't Have To](https://mfyz.com/nodejs-excel-library-comparison)
- [SheetJS Community Edition Docs](https://docs.sheetjs.com/)
- [ExcelJS GitHub](https://github.com/exceljs/exceljs)
- [Excelize Official Docs](https://xuri.me/excelize/)
- [GitHub tealeg/xlsx](https://github.com/tealeg/xlsx)
- [Wails Dialog Reference](https://wails.io/docs/reference/runtime/dialog/)
- [CSS Print Page Styling](https://www.docuseal.com/blog/css-print-page-style)
- [Virtual Scrolling in React (LogRocket)](https://blog.logrocket.com/virtual-scrolling-core-principles-and-basic-implementation-in-react/)
- [React Window - Virtual Scrolling Guide](https://oneuptime.com/blog/post/2026-01-15-react-virtualization-large-lists-react-window/view)
- [React.memo Performance Fixes](https://dev.to/harsh2644/reactmemo-is-not-enough-4-performance-fixes-senior-devs-actually-use-25h4)

---

## Unresolved Questions

1. **Exact font size** for 100 cols to fit A4 landscape—needs CSS testing
2. **PDF page-break behavior** across Excel-like rows—CSS print may split cells awkwardly
3. **excelize chart generation** for team summary—worth it? (out of scope for basic export)
