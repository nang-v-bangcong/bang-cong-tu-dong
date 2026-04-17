# Scout Report — Bảng tổng Plus v2

Consolidated file inventory for 12-feature matrix extension plan.

## 1. Frontend — Matrix core (sẽ sửa nhiều)

| Path | Role |
|---|---|
| `frontend/src/pages/matrix.tsx` | Matrix page: load data, wire handlers |
| `frontend/src/components/matrix-table.tsx` | Grid render, selection state, keyboard nav (200 dòng — near limit) |
| `frontend/src/components/matrix-cell.tsx` | Single cell, React.memo, editor trigger (168 dòng) |
| `frontend/src/components/bulk-action-bar.tsx` | Floating bar: "Gán công trường / Bỏ chọn" |
| `frontend/src/components/worksite-picker-popup.tsx` | Searchable worksite dropdown |
| `frontend/src/components/day-note-cell.tsx` | Day header note editor |
| `frontend/src/lib/matrix-utils.ts` | Date helpers, hashColor, cellKey, formatCoef |

## 2. Frontend — Dialog patterns (reuse)

| Path | Reuse for |
|---|---|
| `frontend/src/components/add-person-dialog.tsx` | Base "Thêm người inline" + bulk-paste mode |
| `frontend/src/components/edit-user-dialog.tsx` | Edit pattern |
| `frontend/src/components/help-dialog.tsx` | Modal + Escape/backdrop pattern |
| `frontend/src/components/confirm-dialog.tsx` | Confirm destructive ops (bulk delete, copy-day overwrite) |
| `frontend/src/components/worksite-manager.tsx` | CRUD modal reference |

## 3. Frontend — Layout/state

| Path | Role |
|---|---|
| `frontend/src/App.tsx` | Tab routing, global Ctrl+wheel handler |
| `frontend/src/components/header.tsx` | Top nav — bổ sung nút Export, Search, Add person |
| `frontend/src/components/zoomable-area.tsx` | Wrap matrix (Ctrl+wheel zoom) — ⚠ CSS zoom ảnh hưởng mouse coords |
| `frontend/src/stores/app-store.ts` | Zustand store — cần mở rộng: undoStack, redoStack, searchQuery, sortBy, cellColorMode |
| `frontend/src/lib/utils.ts` | formatWon, type helpers |

## 4. Backend — Go services (sẽ mở rộng)

| Path | Existing exports | New needed |
|---|---|---|
| `app.go` | 26+ Wails bindings | 6 new: BulkCreateUsers, BulkUpsertCell, BulkDeleteAttendance, FillDayForAllUsers, CopyDayForAll, ExportMatrix |
| `internal/services/user.go` | GetSelf/Ensure/Update/GetTeam/Create/DeleteTeam | BulkCreateUsers |
| `internal/services/matrix.go` | GetTeamMonthMatrix, BulkUpsertWorksite | BulkUpsertCell, BulkDeleteAttendance, FillDayForAllUsers, CopyDayForAll |
| `internal/services/attendance.go` | Upsert/Delete/Get/Summary/CopyPreviousDay | — |
| `internal/services/day_note.go` | Get/Upsert | — |
| `internal/services/pdf.go` | Existing ExportPDF | Extend cho matrix export |
| `internal/services/db.go` | InitDB/CloseDB | — |
| `internal/services/audit.go` | WriteAudit | — |
| `internal/services/migrations.go` | 6 tables | Không cần schema mới |

## 5. Backend — Models

| Path | Structs |
|---|---|
| `internal/models/attendance.go` | Attendance, MatrixCell, MatrixRow, TeamMatrix, CellRef |
| `internal/models/day_note.go` | DayNote |
| `internal/models/*.go` | User, Worksite, Advance, AuditLog, MonthSummary, WorksiteSummary |

## 6. Tests

| Go | Frontend (vitest) |
|---|---|
| `internal/services/testmain_test.go` (setupTestDB) | `frontend/vite.config.ts` (vitest jsdom) |
| `internal/services/day_note_test.go` | `frontend/src/lib/matrix-utils.test.ts` |
| `internal/services/matrix_test.go` | `frontend/src/lib/use-zoom-to-cursor.test.ts` |
| | `frontend/src/components/day-note-cell.test.tsx` |
| | `frontend/src/components/help-dialog.test.tsx` |

## 7. Wails bindings auto-gen (regen sau khi thêm API)

- `frontend/wailsjs/go/main/App.d.ts` — 26 functions hiện có
- `frontend/wailsjs/go/main/App.js`
- `frontend/wailsjs/go/models.ts` — TeamMatrix, MatrixRow, MatrixCell, CellRef, etc.

## 8. Runtime APIs có sẵn

- `EventsEmit`, `EventsOn`, `BrowserOpenURL`, `ClipboardSetText`
- ❌ KHÔNG có `SaveFileDialog` / `WindowPrint` → phải dùng backend `runtime.SaveFileDialog` từ Go context, hoặc browser `window.print()` cho PDF

## 9. Styling

- `frontend/src/style.css` — có `@media print` cho `.help-dialog`, cần mở rộng cho `.matrix-print`

## 10. Config

- `go.mod`: Go 1.25, Wails v2.12.0, modernc.org/sqlite v1.48.0, `jung-kurt/gofpdf` v1.16.2 (có sẵn cho PDF matrix)
- `frontend/package.json`: React 18, Zustand 5, Tailwind 4, Vitest 4.1.4 — cần xem xét thêm `papaparse` (TSV parse), `zundo` (undo middleware)
- `wails.json`: app name "bang-cong"

## Unresolved

- File `help-content/matrix.tsx` (nội dung help) vs `help-content/*.tsx` trong scout — confirm path
- `pdf.go` signature hiện tại chưa đọc rõ — planner cần đọc khi thiết kế export
- Vitest setup file path (`src/test/setup.ts`?) cần xác nhận
