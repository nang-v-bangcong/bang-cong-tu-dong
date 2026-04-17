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
