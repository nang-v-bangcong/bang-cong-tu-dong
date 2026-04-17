# Phase 7 — Export Excel + PDF (F6)

## Context links

- [plan.md](./plan.md)
- [researcher-02-export-perf.md](./research/researcher-02-export-perf.md) — excelize vs sheetjs; print CSS > gofpdf
- [scout-01-report.md](./scout/scout-01-report.md) — go.mod has gofpdf; runtime.SaveFileDialog usable từ Go context

## Overview

- **Date:** 2026-04-17
- **Description:** Export current matrix → `.xlsx` (backend excelize + SaveFileDialog) + print-to-PDF (frontend `window.print()` with dedicated `@media print` CSS). Standalone feature, can ship last.
- **Priority:** Med
- **Implementation status:** pending
- **Review status:** pending

## Key Insights

- Excel via `xuri/excelize/v2` — active, streaming-capable, native Go
- PDF via `window.print()` + CSS `@media print` — no new deps, reuse existing print pattern (`help-dialog` has one)
- Wails `runtime.SaveFileDialog` callable from Go context (a.ctx) — native file picker
- Save flow: backend generates file → `os.WriteFile(dialogPath, bytes)`
- Sunday column: bg gray; header rows: bold; totals row: bold
- PDF font 9-10px for A4 landscape fit — exact value needs test

## Requirements

**Excel (.xlsx):**
- Button "Xuất Excel" in matrix toolbar
- Generates file with: header row (day numbers + weekday), rows (user name, cells, total coef, salary), footer (day totals, grand total salary)
- Sunday cols tinted bg
- Frozen first col + first 2 rows (like sticky in UI)
- Filename default: `bang-cong-{yearMonth}.xlsx`

**PDF (print):**
- Button "In / PDF" in matrix toolbar
- Open `window.print()` with CSS @media print rules
- A4 landscape, 10mm margin
- Font 9-10px
- Only matrix visible; toolbar/sidebar hidden
- Day totals row visible, user salary col visible

## Architecture

```
BACKEND (Excel):
internal/services/export.go  (NEW, ≤180 lines)
  ExportMatrixExcel(ctx, yearMonth) (string, error)
    ├── build sheet via excelize
    ├── runtime.SaveFileDialog(ctx, options) → userPath
    ├── f.SaveAs(userPath)
    └── return userPath (shown in toast)

app.go
  ExportMatrixExcel(yearMonth string) (string, error)

FRONTEND (PDF):
matrix-print-view.tsx (NEW, ≤150 lines)
  standalone component: simple table, no toolbar, all rows visible
  rendered conditionally OR wrap entire matrix with `.matrix-print` class

style.css extend:
  @media print {
    @page { size: A4 landscape; margin: 10mm; }
    body > *:not(.matrix-print-container) { display: none; }
    .matrix-print table { font-size: 9px; width: 100%; }
    .matrix-print .sunday-col { background: #f5f5f5 !important; -webkit-print-color-adjust: exact; }
    .print-hide { display: none !important; }
  }

matrix-toolbar.tsx
  + button "Xuất Excel" → ExportMatrixExcel(ym)
  + button "In / PDF" → window.print()
```

## Related code files

- `d:/Dự án gốc/Bảng công tự động/internal/services/export.go` — NEW
- `d:/Dự án gốc/Bảng công tự động/internal/services/export_test.go` — NEW
- `d:/Dự án gốc/Bảng công tự động/app.go` — add binding
- `d:/Dự án gốc/Bảng công tự động/go.mod` — add `github.com/xuri/excelize/v2`
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/matrix-toolbar.tsx` — add 2 buttons
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/matrix-print-view.tsx` — NEW
- `d:/Dự án gốc/Bảng công tự động/frontend/src/pages/matrix.tsx` — render print view
- `d:/Dự án gốc/Bảng công tự động/frontend/src/style.css` — print CSS

## Implementation Steps

### Excel

1. **`go get github.com/xuri/excelize/v2`**
2. **Create `internal/services/export.go`**:
   ```go
   func ExportMatrixExcel(ctx context.Context, yearMonth string) (string, error) {
     m, err := GetTeamMonthMatrix(yearMonth)
     if err != nil { return "", err }
     
     f := excelize.NewFile()
     sheet := "Bang cong " + yearMonth
     f.SetSheetName("Sheet1", sheet)
     
     // Header row 1: "Tên" + days 1..N + "Công" + "Lương"
     // Header row 2: "" + weekday abbrevs + ""
     // Body: userName + cell values
     // Footer: "Tổng" + day totals + grand
     
     // Styles: bold header, bg for Sunday cols, freeze top-left
     
     path, err := runtime.SaveFileDialog(ctx, runtime.SaveDialogOptions{
       DefaultFilename: fmt.Sprintf("bang-cong-%s.xlsx", yearMonth),
       Filters: [{DisplayName: "Excel", Pattern: "*.xlsx"}],
     })
     if err != nil || path == "" { return "", nil }
     
     return path, f.SaveAs(path)
   }
   ```
   If file > 200 lines, split: `export.go` (orchestrator) + `export_matrix_xlsx.go` (styling helpers).
3. **app.go**:
   ```go
   func (a *App) ExportMatrixExcel(yearMonth string) (string, error) {
     return services.ExportMatrixExcel(a.ctx, yearMonth)
   }
   ```
4. **Go tests** (`export_test.go`):
   - Setup test DB with 2 users, some attendance
   - Can't test SaveFileDialog (UI) — refactor: `buildMatrixXlsx(m) (*excelize.File, error)` — unit-test this, then wrapper handles dialog
   - Verify sheet row count, cell values, style
5. **Regen Wails bindings**

### PDF

6. **Create `matrix-print-view.tsx`**:
   - Simple table, all rows visible (no sticky — print doesn't need)
   - Absolute positioned but hidden except when printing
7. **Edit `style.css`** add `@media print` block
8. **matrix.tsx**: render `<MatrixPrintView matrix={matrix} />` with `display: none` default; visible on print via media query
9. **Toolbar buttons**: "Xuất Excel" calls `ExportMatrixExcel`; "In / PDF" calls `window.print()`
10. **Test manual**: Ctrl+P preview, verify 31 cols fit, font readable

## Todo list

- [ ] `go get github.com/xuri/excelize/v2`
- [ ] Create `internal/services/export.go` with `buildMatrixXlsx` + `ExportMatrixExcel`
- [ ] app.go binding
- [ ] Regen Wails bindings
- [ ] Go tests for buildMatrixXlsx (real data, assert cell values)
- [ ] matrix-toolbar: 2 buttons (Excel, Print)
- [ ] Create `matrix-print-view.tsx`
- [ ] style.css: @media print rules
- [ ] Wire matrix.tsx handlers
- [ ] Manual test Excel: export, open in Excel, verify structure
- [ ] Manual test PDF: Ctrl+P, verify font size fits A4 landscape
- [ ] Sunday bg preserved in both formats

## Success Criteria

- "Xuất Excel" → SaveFileDialog opens → user picks path → file written correctly
- Excel open in MS Excel: 31 day cols + Sunday cols tinted + totals row at bottom
- Grand totals match UI values (cross-check manually)
- "In / PDF" → browser print preview → matrix fits 1 page A4 landscape
- Print hides toolbar + sidebar (no garbage)
- export.go ≤ 200 dòng (or split)
- Go tests pass

## Risk Assessment

- **Med**: excelize dep adds ~5MB to Go binary — acceptable (desktop app, not embedded)
- **Med**: Chromium `window.print()` fidelity varies — test on Windows only (target platform)
- **Low**: font size 9-10px may need tweak — iterate via manual test
- **Low**: Sunday column tint may not print — use `-webkit-print-color-adjust: exact`

## Security Considerations

- File written only to user-selected path via SaveFileDialog (no silent overwrite)
- No sensitive data exposure — same data as UI
- Wails `runtime.SaveFileDialog` is native — no path traversal risk

## Next steps

After Phase 7: full QA pass, then merge. Consider follow-up: export selected worksite summary, CSV export (YAGNI for now).
