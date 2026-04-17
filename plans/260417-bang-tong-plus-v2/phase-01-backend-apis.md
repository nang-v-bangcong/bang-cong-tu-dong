# Phase 1 — Backend APIs

## Context links

- [plan.md](./plan.md)
- [scout-01-report.md](./scout/scout-01-report.md) — file inventory
- [researcher-02-export-perf.md](./research/researcher-02-export-perf.md) — SQLite bulk ops (3100 rows OK in 1 tx)

## Overview

- **Date:** 2026-04-17
- **Description:** Add 5 new Go service functions + matching Wails bindings. Foundation cho phase 2-4,7.
- **Priority:** Highest (blocks phase 2-4,7)
- **Implementation status:** pending
- **Review status:** pending

## Key Insights

- Reuse existing `tx.Begin()` pattern từ `BulkUpsertWorksite`
- `INSERT ... ON CONFLICT(user_id, date) DO UPDATE` idempotent — safe to re-run
- `FillDayForAllUsers` → chỉ thêm cho users chưa có (SQL `INSERT OR IGNORE` OR explicit check)
- `BulkCreateUsers` skip duplicate names, trả về both created + skipped
- `BulkUpsertCell` nil-able fields: nếu `coef == nil` chỉ update worksite, ngược lại
- WriteAudit gọi 1 lần per bulk op (KHÔNG per-row — tránh spam audit log)

## Requirements

**Functional:**
- `BulkCreateUsers(names []string) (BulkCreateResult, error)` — create N team users in 1 tx
- `BulkUpsertCell(cells []CellRef, coef *float64, worksiteID *int64) error` — partial update (coef XOR worksite XOR both)
- `BulkDeleteAttendance(cells []CellRef) (int, error)` — return rows deleted
- `FillDayForAllUsers(yearMonth string, day int, coef float64, worksiteID *int64, overwrite bool) (int, error)` — return count created/updated
- `CopyDayForAll(yearMonth string, srcDay, dstDay int, overwrite bool) (int, error)` — return count copied

**Validation:**
- coef range `[0, 3.0]` (reuse existing)
- date format via `ValidateDate`
- yearMonth via `ValidateYearMonth`
- names: trim, non-empty, max 100 chars

## Architecture

```
app.go (Wails binding layer)
  ├── BulkCreateUsers       → services.BulkCreateUsers
  ├── BulkUpsertCell        → services.BulkUpsertCell
  ├── BulkDeleteAttendance  → services.BulkDeleteAttendance
  ├── FillDayForAllUsers    → services.FillDayForAllUsers
  └── CopyDayForAll         → services.CopyDayForAll

services/
  ├── user.go       — add BulkCreateUsers, add model BulkCreateResult
  └── matrix.go     — add BulkUpsertCell, BulkDeleteAttendance, FillDayForAllUsers, CopyDayForAll
```

**New model** (`internal/models/user.go`):
```go
type BulkCreateResult struct {
    Created []User   `json:"created"`
    Skipped []string `json:"skipped"` // names that already existed
}
```

## Related code files

- `d:/Dự án gốc/Bảng công tự động/app.go` — add 5 bindings
- `d:/Dự án gốc/Bảng công tự động/internal/services/user.go` — add BulkCreateUsers
- `d:/Dự án gốc/Bảng công tự động/internal/services/matrix.go` — add 4 funcs
- `d:/Dự án gốc/Bảng công tự động/internal/services/attendance.go` — reuse ValidateDate/ValidateYearMonth
- `d:/Dự án gốc/Bảng công tự động/internal/models/user.go` — add BulkCreateResult
- `d:/Dự án gốc/Bảng công tự động/internal/services/matrix_test.go` — extend
- `d:/Dự án gốc/Bảng công tự động/internal/services/testmain_test.go` — reuse setupTestDB

## Implementation Steps

1. **Define model** `BulkCreateResult` in `internal/models/user.go`.
2. **user.go**: `BulkCreateUsers(names []string) (BulkCreateResult, error)` — single tx, `INSERT OR IGNORE INTO users(name, is_self) VALUES(?, 0)`, detect skipped via `RowsAffected()==0`. Query back created rows by name.
3. **matrix.go**: `BulkUpsertCell(cells, coef, wsID)`:
   - if both nil → error
   - if coef != nil: `INSERT ... ON CONFLICT DO UPDATE SET coefficient = excluded.coefficient` (+ worksite if not nil)
   - if only wsID != nil: reuse existing BulkUpsertWorksite pattern
4. **matrix.go**: `BulkDeleteAttendance(cells)` — `DELETE FROM attendance WHERE user_id=? AND date=?` in tx.
5. **matrix.go**: `FillDayForAllUsers(ym, day, coef, wsID, overwrite)`:
   - build date = `dateOf(ym, day)`
   - get team user IDs (is_self=0)
   - if overwrite: INSERT OR REPLACE per user
   - else: INSERT OR IGNORE
   - return count
6. **matrix.go**: `CopyDayForAll(ym, srcDay, dstDay, overwrite)`:
   - SELECT rows of srcDate
   - INSERT for dstDate theo overwrite mode
   - return count
7. **app.go**: add 5 Wails bindings (thin wrappers).
8. **Regen bindings**: `wails generate module` (or dev run auto-regen). Verify `frontend/wailsjs/go/main/App.d.ts` contains new 5 functions.
9. **Write Go tests** (no mocks — real SQLite via setupTestDB).
10. **Build check**: `go build ./...`.

## Todo list

- [ ] `internal/models/user.go`: add BulkCreateResult struct
- [ ] `internal/services/user.go`: BulkCreateUsers
- [ ] `internal/services/matrix.go`: BulkUpsertCell (partial update)
- [ ] `internal/services/matrix.go`: BulkDeleteAttendance
- [ ] `internal/services/matrix.go`: FillDayForAllUsers
- [ ] `internal/services/matrix.go`: CopyDayForAll
- [ ] `app.go`: 5 Wails bindings
- [ ] `internal/services/matrix_test.go`: extend with new tests
- [ ] `internal/services/user_test.go` (create if absent): BulkCreateUsers tests
- [ ] Regen Wails bindings
- [ ] `go build ./...` + `go test ./internal/services/...` green
- [ ] `wails dev` smoke check

## Test cases (real DB)

**BulkCreateUsers:**
- `["A","B","C"]` → 3 created, 0 skipped
- pre-existing "A", input `["A","B"]` → 1 created ("B"), 1 skipped ("A")
- empty array → error "no names"
- single name " " → error "invalid name"

**BulkUpsertCell:**
- 3 cells, coef=1.5, wsID=nil → all have coef=1.5, worksite unchanged
- 3 cells, coef=nil, wsID=5 → worksite updated, coef unchanged (cells preexist)
- coef=nil && wsID=nil → error
- coef=3.5 → error (out of range)

**BulkDeleteAttendance:**
- 5 existing cells → all deleted, returns 5
- 5 refs but only 3 exist → returns 3
- empty array → returns 0

**FillDayForAllUsers:**
- 3 team users, no existing → 3 created
- 1 existing (coef=2), overwrite=false → 2 created (only missing users)
- 1 existing (coef=2), overwrite=true → 3 affected, existing now coef from param

**CopyDayForAll:**
- srcDay has 2 users attended, dstDay empty, overwrite=false → 2 copied
- srcDay 2 users, dstDay has 1 overlapping user, overwrite=false → 1 copied
- overwrite=true → 2 copied (overwrites)

## Success Criteria

- [ ] All 5 new services covered by Go tests (no mocks)
- [ ] `go test ./internal/services/... -count=1` passes
- [ ] Wails bindings regenerated without manual edit
- [ ] `wails dev` starts successfully
- [ ] No regression in existing matrix tests
- [ ] Audit log 1 entry per bulk op (not per row)

## Risk Assessment

- **Low**: SQLite single-file, no concurrent writers
- **Med**: wails binding regen drift — pin Wails v2.12.0, verify after each change
- **Low**: Transaction size (max ~3100 rows) — well below SQLite limits

## Security Considerations

- SQL injection: all queries use `?` placeholders (existing pattern)
- Coefficient range enforced server-side (0-3)
- Name length cap (100 chars) — prevent DB bloat
- No auth layer — single-user desktop app (OK)

## Next steps

Phase 2 (bulk UI) consumes `BulkUpsertCell`, `BulkDeleteAttendance`. Phase 3 consumes `BulkCreateUsers`. Phase 4 consumes `CopyDayForAll`. Proceed only after all Phase 1 tests green.
