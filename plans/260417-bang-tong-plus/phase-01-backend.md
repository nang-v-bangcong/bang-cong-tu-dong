# Phase 1: Backend (DB + API)

**Thời gian ước tính:** 3-4 giờ
**Dependencies:** none
**Output:** 4 Wails API mới callable từ frontend qua `wailsjs/go/main/App`
**Status:** ✅ DONE (2026-04-17)

---

## 1.1 DB Migration — thêm table `day_notes`

**File sửa:** [internal/services/migrations.go](../../internal/services/migrations.go)

Thêm vào `runMigrations()` sau khối `audit_log`:

```go
_, err = db.Exec(`
    CREATE TABLE IF NOT EXISTS day_notes (
        year_month TEXT NOT NULL,
        day INTEGER NOT NULL,
        note TEXT DEFAULT '',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (year_month, day)
    )
`)
if err != nil {
    return err
}
```

**Validate:**
- `year_month` format: `YYYY-MM` (reuse `ValidateYearMonth`)
- `day` range: 1-31 (thêm `ValidateDay`)
- `note` max length: 500 chars (chặn ở service layer)

## 1.2 Model mới

**File mới:** [internal/models/day_note.go](../../internal/models/day_note.go) (~15 dòng)

```go
package models

type DayNote struct {
    YearMonth string `json:"yearMonth"` // YYYY-MM
    Day       int    `json:"day"`       // 1-31
    Note      string `json:"note"`
    UpdatedAt string `json:"updatedAt"`
}
```

## 1.3 Service `day_note.go`

**File mới:** [internal/services/day_note.go](../../internal/services/day_note.go) (~80 dòng)

Functions:

### `GetDayNotes(yearMonth string) ([]models.DayNote, error)`
```sql
SELECT year_month, day, note, updated_at
FROM day_notes
WHERE year_month = ?
ORDER BY day
```

### `UpsertDayNote(yearMonth string, day int, note string) error`
- Validate `yearMonth`, `day` (1-31), `note` length ≤ 500
- Nếu `note` rỗng → `DELETE` (không lưu rác)
- Ngược lại `INSERT ... ON CONFLICT(year_month, day) DO UPDATE SET note = excluded.note, updated_at = CURRENT_TIMESTAMP`
- Audit log: `WriteAudit("update", "day_note", int64(day), fmt.Sprintf("Ghi chú ngày %s-%02d", yearMonth, day))`

### `ValidateDay(day int) error`
```go
if day < 1 || day > 31 {
    return fmt.Errorf("invalid day: %d", day)
}
return nil
```

## 1.4 Service `attendance.go` — thêm `GetTeamMonthMatrix`

**File sửa:** [internal/services/attendance.go](../../internal/services/attendance.go)

Thêm model mới vào [internal/models/attendance.go](../../internal/models/attendance.go):

```go
type MatrixRow struct {
    UserID    int64                 `json:"userId"`
    UserName  string                `json:"userName"`
    Cells     map[int]MatrixCell    `json:"cells"`     // key = day (1-31)
    TotalDays int                   `json:"totalDays"`
    TotalCoef float64               `json:"totalCoef"`
    Salary    float64               `json:"salary"`
}

type MatrixCell struct {
    AttendanceID int64   `json:"attendanceId"`
    Coefficient  float64 `json:"coefficient"`
    WorksiteID   *int64  `json:"worksiteId"`
    WorksiteName string  `json:"worksiteName"`
    Note         string  `json:"note"` // note per-person (không show ở matrix nhưng giữ để sync)
}

type TeamMatrix struct {
    YearMonth    string             `json:"yearMonth"`
    DaysInMonth  int                `json:"daysInMonth"`
    Rows         []MatrixRow        `json:"rows"`
    DayNotes     map[int]string     `json:"dayNotes"`     // key = day
    DayTotals    map[int]float64    `json:"dayTotals"`    // tổng công/ngày
}
```

**Function:** `GetTeamMonthMatrix(yearMonth string) (models.TeamMatrix, error)`

Logic:
1. Validate `yearMonth`
2. Tính `daysInMonth` (dùng `time.Date` → cuối tháng)
3. Query tất cả team users (exclude is_self): `SELECT id, name FROM users WHERE is_self = 0 ORDER BY name`
4. 1 query lớn lấy toàn bộ attendance tháng đó JOIN worksites:
   ```sql
   SELECT a.id, a.user_id, a.date, a.coefficient, a.worksite_id, a.note,
          COALESCE(w.name, ''), COALESCE(w.daily_wage, 0)
   FROM attendance a
   LEFT JOIN worksites w ON a.worksite_id = w.id
   WHERE a.date LIKE ? -- yearMonth + '%'
   ```
5. Group by user_id → fill `Rows[i].Cells[day]`
6. Tính `TotalDays`, `TotalCoef`, `Salary` per row (dùng daily_wage)
7. Tính `DayTotals[day]` = sum coefficient tất cả user ngày đó
8. Gọi `GetDayNotes(yearMonth)` → fill `DayNotes`

**Perf note:** 1 query duy nhất cho attendance (không N+1). Expect 100 users × 31 days = max 3100 rows → nhẹ.

## 1.5 Service — `BulkUpsertWorksite` (cho multi-select)

**File sửa:** [internal/services/attendance.go](../../internal/services/attendance.go)

```go
type CellRef struct {
    UserID int64  `json:"userId"`
    Date   string `json:"date"`
}

func BulkUpsertWorksite(cells []CellRef, worksiteID *int64) error {
    tx, err := db.Begin()
    if err != nil { return err }
    defer tx.Rollback()

    stmt, err := tx.Prepare(`
        INSERT INTO attendance (user_id, date, coefficient, worksite_id, note)
        VALUES (?, ?, 0, ?, '')
        ON CONFLICT(user_id, date) DO UPDATE SET worksite_id = excluded.worksite_id
    `)
    if err != nil { return err }
    defer stmt.Close()

    for _, c := range cells {
        if err := ValidateDate(c.Date); err != nil { return err }
        if _, err := stmt.Exec(c.UserID, c.Date, worksiteID); err != nil { return err }
    }
    WriteAudit("bulk_update", "attendance", int64(len(cells)), fmt.Sprintf("Gán công trường %d ô", len(cells)))
    return tx.Commit()
}
```

**Quan trọng:**
- Nếu ô chưa có record → insert với `coefficient=0` (nghĩa là chưa chấm công, chỉ gán nơi). Frontend phải handle hiển thị: coefficient=0 + worksite → hiện ghế ri công trường nhưng không tính vào tổng.
- ORACH khác: chỉ update ô đã có record, skip ô rỗng → đơn giản hơn nhưng user phải gõ hệ số trước. **Chọn phương án này** (KISS):

```go
// Chỉ update nếu record tồn tại
UPDATE attendance SET worksite_id = ? WHERE user_id = ? AND date = ?
```

→ Frontend UX: "Gán công trường chỉ cho ô đã có hệ số" — cần hiển thị toast cảnh báo nếu user chọn ô trống.

**Quyết định cuối:** Dùng `INSERT ... ON CONFLICT` với `coefficient=1` default (mặc định 1 công). Nếu user muốn 0.5 → tự sửa sau. Đây là cách thực tế cai thầu thường làm.

## 1.6 Wails bindings

**File sửa:** [app.go](../../app.go)

Thêm section `// --- Matrix & Day Notes ---`:

```go
func (a *App) GetTeamMonthMatrix(yearMonth string) (models.TeamMatrix, error) {
    return services.GetTeamMonthMatrix(yearMonth)
}

func (a *App) GetDayNotes(yearMonth string) ([]models.DayNote, error) {
    return services.GetDayNotes(yearMonth)
}

func (a *App) UpsertDayNote(yearMonth string, day int, note string) error {
    return services.UpsertDayNote(yearMonth, day, note)
}

func (a *App) BulkUpsertWorksite(cells []services.CellRef, worksiteID *int64) error {
    return services.BulkUpsertWorksite(cells, worksiteID)
}
```

Note: `CellRef` phải export được qua Wails → đặt trong `models` package cho clean:

**Di chuyển:** `CellRef` vào `internal/models/attendance.go`, service import `models.CellRef`.

## 1.7 Build & test checklist

- [ ] `wails dev` chạy được, DB migrate không lỗi
- [ ] SQLite browser xác nhận table `day_notes` tạo đúng
- [ ] Frontend `wailsjs/go/main/App.d.ts` tự động có 4 method mới sau khi Wails rebuild
- [ ] Test manual từ browser console: `window.go.main.App.GetTeamMonthMatrix("2026-04")` → trả JSON đúng
- [ ] Test `UpsertDayNote("2026-04", 15, "test")` → reload thấy note
- [ ] Test `UpsertDayNote("2026-04", 15, "")` → record bị xoá (check SQLite)

## 1.8 Files touched

| File | Action | Est. lines |
|---|---|---|
| `internal/services/migrations.go` | Edit | +10 |
| `internal/services/day_note.go` | New | ~80 |
| `internal/services/attendance.go` | Edit | +120 |
| `internal/models/day_note.go` | New | ~15 |
| `internal/models/attendance.go` | Edit | +40 |
| `app.go` | Edit | +20 |

**Total:** ~285 dòng mới / sửa. Không file nào vượt 200.
