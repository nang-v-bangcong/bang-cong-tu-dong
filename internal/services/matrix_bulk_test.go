package services

import (
	"bang-cong/internal/models"
	"testing"
)

func TestBulkUpsertCell_CoefOnly_UpdatesOnlyCoef(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	wsOld := seedWorksite(t, "WS-old", 100000)
	u := seedTeamUser(t, "U")
	if _, err := UpsertAttendance(u, "2026-04-01", 0.5, &wsOld, "keep-note"); err != nil {
		t.Fatal(err)
	}

	coef := 1.5
	cells := []models.CellRef{{UserID: u, Date: "2026-04-01"}}
	if err := BulkUpsertCell(cells, &coef, nil); err != nil {
		t.Fatal(err)
	}

	m, _ := GetTeamMonthMatrix("2026-04")
	c := m.Rows[0].Cells[1]
	if c.Coefficient != 1.5 {
		t.Errorf("coef=%v want 1.5", c.Coefficient)
	}
	if c.WorksiteID == nil || *c.WorksiteID != wsOld {
		t.Errorf("worksite should remain %d, got %+v", wsOld, c.WorksiteID)
	}
	if c.Note != "keep-note" {
		t.Errorf("note should remain, got %q", c.Note)
	}
}

func TestBulkUpsertCell_WorksiteOnly_UpdatesOnlyWorksite(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	wsOld := seedWorksite(t, "WS-old", 100000)
	wsNew := seedWorksite(t, "WS-new", 200000)
	u := seedTeamUser(t, "U")
	if _, err := UpsertAttendance(u, "2026-04-01", 0.5, &wsOld, "n"); err != nil {
		t.Fatal(err)
	}

	cells := []models.CellRef{{UserID: u, Date: "2026-04-01"}}
	if err := BulkUpsertCell(cells, nil, &wsNew); err != nil {
		t.Fatal(err)
	}

	m, _ := GetTeamMonthMatrix("2026-04")
	c := m.Rows[0].Cells[1]
	if c.Coefficient != 0.5 {
		t.Errorf("coef should stay 0.5, got %v", c.Coefficient)
	}
	if c.WorksiteID == nil || *c.WorksiteID != wsNew {
		t.Errorf("worksite should be %d, got %+v", wsNew, c.WorksiteID)
	}
}

func TestBulkUpsertCell_Both_UpdatesBoth(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	ws := seedWorksite(t, "WS", 100000)
	u := seedTeamUser(t, "U")

	coef := 2.0
	cells := []models.CellRef{{UserID: u, Date: "2026-04-01"}}
	if err := BulkUpsertCell(cells, &coef, &ws); err != nil {
		t.Fatal(err)
	}

	m, _ := GetTeamMonthMatrix("2026-04")
	c := m.Rows[0].Cells[1]
	if c.Coefficient != 2.0 || c.WorksiteID == nil || *c.WorksiteID != ws {
		t.Errorf("want coef=2 ws=%d, got %+v", ws, c)
	}
}

func TestBulkUpsertCell_BothNil_Errors(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	cells := []models.CellRef{{UserID: 1, Date: "2026-04-01"}}
	if err := BulkUpsertCell(cells, nil, nil); err == nil {
		t.Error("want error when both nil")
	}
}

func TestBulkUpsertCell_CoefOutOfRange_Errors(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	bad := 3.5
	cells := []models.CellRef{{UserID: 1, Date: "2026-04-01"}}
	if err := BulkUpsertCell(cells, &bad, nil); err == nil {
		t.Error("want error for coef=3.5")
	}
	neg := -0.1
	if err := BulkUpsertCell(cells, &neg, nil); err == nil {
		t.Error("want error for coef=-0.1")
	}
}

func TestBulkUpsertCell_CoefOnly_InsertsNewWithNullWorksite(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	u := seedTeamUser(t, "U")
	coef := 1.0
	cells := []models.CellRef{{UserID: u, Date: "2026-04-05"}}
	if err := BulkUpsertCell(cells, &coef, nil); err != nil {
		t.Fatal(err)
	}
	m, _ := GetTeamMonthMatrix("2026-04")
	c := m.Rows[0].Cells[5]
	if c.Coefficient != 1.0 {
		t.Errorf("coef=%v want 1.0", c.Coefficient)
	}
	if c.WorksiteID != nil {
		t.Errorf("worksite should be nil for new row, got %+v", c.WorksiteID)
	}
}

func TestBulkDeleteAttendance_DeletesExisting(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	ws := seedWorksite(t, "W", 100000)
	u1 := seedTeamUser(t, "A")
	u2 := seedTeamUser(t, "B")
	dates := []string{"2026-04-01", "2026-04-02", "2026-04-03"}
	for _, d := range dates {
		if _, err := UpsertAttendance(u1, d, 1.0, &ws, ""); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := UpsertAttendance(u2, "2026-04-01", 1.0, &ws, ""); err != nil {
		t.Fatal(err)
	}

	cells := []models.CellRef{
		{UserID: u1, Date: "2026-04-01"},
		{UserID: u1, Date: "2026-04-02"},
		{UserID: u2, Date: "2026-04-01"},
	}
	n, err := BulkDeleteAttendance(cells)
	if err != nil {
		t.Fatal(err)
	}
	if n != 3 {
		t.Errorf("deleted=%d want 3", n)
	}

	m, _ := GetTeamMonthMatrix("2026-04")
	for _, row := range m.Rows {
		if row.UserID == u1 {
			if row.Cells[1].AttendanceID != 0 || row.Cells[2].AttendanceID != 0 {
				t.Errorf("u1 day1/2 should be gone: %+v", row.Cells)
			}
			if row.Cells[3].AttendanceID == 0 {
				t.Errorf("u1 day3 should remain: %+v", row.Cells)
			}
		}
	}
}

func TestBulkDeleteAttendance_IgnoresMissing(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	ws := seedWorksite(t, "W", 100000)
	u := seedTeamUser(t, "U")
	if _, err := UpsertAttendance(u, "2026-04-01", 1.0, &ws, ""); err != nil {
		t.Fatal(err)
	}
	cells := []models.CellRef{
		{UserID: u, Date: "2026-04-01"}, // exists
		{UserID: u, Date: "2026-04-02"}, // absent
		{UserID: 9999, Date: "2026-04-01"},
	}
	n, err := BulkDeleteAttendance(cells)
	if err != nil {
		t.Fatal(err)
	}
	if n != 1 {
		t.Errorf("deleted=%d want 1", n)
	}
}

func TestBulkDeleteAttendance_EmptyNoop(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	n, err := BulkDeleteAttendance(nil)
	if err != nil || n != 0 {
		t.Errorf("empty: err=%v n=%d", err, n)
	}
}

func TestBulkDeleteAttendance_InvalidDate(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	cells := []models.CellRef{{UserID: 1, Date: "bad"}}
	if _, err := BulkDeleteAttendance(cells); err == nil {
		t.Error("want error on invalid date")
	}
}

func TestBulkUpsertCells_AtomicMultiCoef(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()
	ws := seedWorksite(t, "WS", 100000)
	u1 := seedTeamUser(t, "A")
	u2 := seedTeamUser(t, "B")

	items := []CellUpsert{
		{UserID: u1, Date: "2026-04-01", Coefficient: 1.0, WorksiteID: &ws},
		{UserID: u1, Date: "2026-04-02", Coefficient: 0.5, WorksiteID: &ws},
		{UserID: u2, Date: "2026-04-01", Coefficient: 1.5, WorksiteID: nil, Note: "extra"},
	}
	if err := BulkUpsertCells(items); err != nil {
		t.Fatal(err)
	}

	m, _ := GetTeamMonthMatrix("2026-04")
	var a, b *models.MatrixRow
	for i := range m.Rows {
		switch m.Rows[i].UserID {
		case u1:
			a = &m.Rows[i]
		case u2:
			b = &m.Rows[i]
		}
	}
	if a == nil || b == nil {
		t.Fatal("rows missing")
	}
	if a.Cells[1].Coefficient != 1.0 || a.Cells[2].Coefficient != 0.5 {
		t.Errorf("u1 coefs wrong: %+v", a.Cells)
	}
	if b.Cells[1].Coefficient != 1.5 || b.Cells[1].WorksiteID != nil || b.Cells[1].Note != "extra" {
		t.Errorf("u2 cell wrong: %+v", b.Cells[1])
	}
}

func TestBulkUpsertCells_RejectsBadItem_RollbackAll(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()
	u := seedTeamUser(t, "U")

	items := []CellUpsert{
		{UserID: u, Date: "2026-04-01", Coefficient: 1.0},
		{UserID: u, Date: "2026-04-02", Coefficient: 5.0}, // out of range
	}
	if err := BulkUpsertCells(items); err == nil {
		t.Fatal("expected error")
	}
	m, _ := GetTeamMonthMatrix("2026-04")
	if len(m.Rows) > 0 && m.Rows[0].Cells[1].AttendanceID != 0 {
		t.Error("first cell should not have been committed when batch fails")
	}
}

func TestBulkUpsertCells_RejectsCoefZero(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()
	u := seedTeamUser(t, "U")
	if err := BulkUpsertCells([]CellUpsert{{UserID: u, Date: "2026-04-01", Coefficient: 0}}); err == nil {
		t.Error("expected error for coef=0")
	}
}

func TestBulkUpsertCells_EmptyNoop(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()
	if err := BulkUpsertCells(nil); err != nil {
		t.Errorf("nil: %v", err)
	}
}

// Clearing worksite (wsID=nil) on empty cells must NOT create coef=1 rows.
func TestBulkUpsertWorksite_NilOnEmptyCells_NoInsert(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()
	u := seedTeamUser(t, "U")

	cells := []models.CellRef{{UserID: u, Date: "2026-04-05"}}
	if err := BulkUpsertWorksite(cells, nil); err != nil {
		t.Fatal(err)
	}

	m, _ := GetTeamMonthMatrix("2026-04")
	if len(m.Rows) == 0 {
		t.Fatal("no rows")
	}
	c := m.Rows[0].Cells[5]
	if c.AttendanceID != 0 {
		t.Errorf("expected no row created, got attendanceID=%d coef=%v", c.AttendanceID, c.Coefficient)
	}
}

// Clearing worksite (wsID=nil) on existing cells should clear only worksite_id.
func TestBulkUpsertWorksite_NilOnExisting_ClearsWorksiteOnly(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()
	ws := seedWorksite(t, "WS", 100000)
	u := seedTeamUser(t, "U")
	if _, err := UpsertAttendance(u, "2026-04-01", 1.5, &ws, "keep"); err != nil {
		t.Fatal(err)
	}

	cells := []models.CellRef{{UserID: u, Date: "2026-04-01"}}
	if err := BulkUpsertWorksite(cells, nil); err != nil {
		t.Fatal(err)
	}

	m, _ := GetTeamMonthMatrix("2026-04")
	c := m.Rows[0].Cells[1]
	if c.Coefficient != 1.5 {
		t.Errorf("coef changed: %v", c.Coefficient)
	}
	if c.WorksiteID != nil {
		t.Errorf("worksite should be nil, got %+v", c.WorksiteID)
	}
	if c.Note != "keep" {
		t.Errorf("note changed: %q", c.Note)
	}
}
