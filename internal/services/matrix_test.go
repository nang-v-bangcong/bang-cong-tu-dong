package services

import (
	"bang-cong/internal/models"
	"testing"
)

func seedWorksite(t *testing.T, name string, wage int64) int64 {
	t.Helper()
	w, err := CreateWorksite(name, wage)
	if err != nil {
		t.Fatalf("create worksite: %v", err)
	}
	return w.ID
}

func seedTeamUser(t *testing.T, name string) int64 {
	t.Helper()
	u, err := CreateTeamUser(name, 0)
	if err != nil {
		t.Fatalf("create user: %v", err)
	}
	return u.ID
}

func TestGetTeamMonthMatrix_EmptyMonth(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	m, err := GetTeamMonthMatrix("2026-02")
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if m.YearMonth != "2026-02" {
		t.Errorf("yearMonth wrong: %s", m.YearMonth)
	}
	if m.DaysInMonth != 28 {
		t.Errorf("feb 2026 has 28 days, got %d", m.DaysInMonth)
	}
	if len(m.Rows) != 0 {
		t.Errorf("no users, rows=%d", len(m.Rows))
	}
}

func TestGetTeamMonthMatrix_DaysInMonth(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	cases := []struct {
		ym   string
		days int
	}{
		{"2026-01", 31},
		{"2026-02", 28},
		{"2024-02", 29}, // leap year
		{"2026-04", 30},
		{"2026-12", 31},
	}
	for _, c := range cases {
		m, err := GetTeamMonthMatrix(c.ym)
		if err != nil {
			t.Errorf("%s: %v", c.ym, err)
			continue
		}
		if m.DaysInMonth != c.days {
			t.Errorf("%s: want %d days, got %d", c.ym, c.days, m.DaysInMonth)
		}
	}
}

func TestGetTeamMonthMatrix_AggregatesCorrectly(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	wsA := seedWorksite(t, "Công trường A", 200000)
	wsB := seedWorksite(t, "Công trường B", 150000)

	u1 := seedTeamUser(t, "Alice")
	u2 := seedTeamUser(t, "Bob")

	// Alice: day 1 wsA coef=1, day 2 wsA coef=0.5, day 5 wsB coef=1
	if _, err := UpsertAttendance(u1, "2026-04-01", 1.0, &wsA, ""); err != nil {
		t.Fatal(err)
	}
	if _, err := UpsertAttendance(u1, "2026-04-02", 0.5, &wsA, ""); err != nil {
		t.Fatal(err)
	}
	if _, err := UpsertAttendance(u1, "2026-04-05", 1.0, &wsB, ""); err != nil {
		t.Fatal(err)
	}
	// Bob: day 1 wsB coef=1
	if _, err := UpsertAttendance(u2, "2026-04-01", 1.0, &wsB, "note-b"); err != nil {
		t.Fatal(err)
	}
	// Day note
	if err := UpsertDayNote("2026-04", 1, "Khởi công"); err != nil {
		t.Fatal(err)
	}

	m, err := GetTeamMonthMatrix("2026-04")
	if err != nil {
		t.Fatal(err)
	}
	if len(m.Rows) != 2 {
		t.Fatalf("want 2 rows, got %d", len(m.Rows))
	}

	var alice, bob *models.MatrixRow
	for i := range m.Rows {
		r := &m.Rows[i]
		if r.UserID == u1 {
			alice = r
		} else if r.UserID == u2 {
			bob = r
		}
	}
	if alice == nil || bob == nil {
		t.Fatalf("missing rows: %+v", m.Rows)
	}

	// Alice totals: days with coef>0 = 3; coef = 2.5; salary = 1*200k + 0.5*200k + 1*150k = 450000
	if alice.TotalDays != 3 {
		t.Errorf("alice totalDays=%d want 3", alice.TotalDays)
	}
	if alice.TotalCoef != 2.5 {
		t.Errorf("alice totalCoef=%v want 2.5", alice.TotalCoef)
	}
	if alice.Salary != 450000 {
		t.Errorf("alice salary=%v want 450000", alice.Salary)
	}

	// Cells
	c1 := alice.Cells[1]
	if c1.Coefficient != 1.0 || c1.WorksiteName != "Công trường A" {
		t.Errorf("alice day1 cell wrong: %+v", c1)
	}
	if alice.Cells[3].AttendanceID != 0 {
		t.Errorf("alice day3 should be empty, got %+v", alice.Cells[3])
	}

	// Bob note preserved
	if bob.Cells[1].Note != "note-b" {
		t.Errorf("bob note lost: %+v", bob.Cells[1])
	}

	// DayTotals: day 1 = 1 (alice) + 1 (bob) = 2; day 2 = 0.5; day 5 = 1
	if m.DayTotals[1] != 2.0 {
		t.Errorf("dayTotals[1]=%v want 2", m.DayTotals[1])
	}
	if m.DayTotals[2] != 0.5 {
		t.Errorf("dayTotals[2]=%v want 0.5", m.DayTotals[2])
	}
	if m.DayTotals[5] != 1.0 {
		t.Errorf("dayTotals[5]=%v want 1", m.DayTotals[5])
	}

	// Day notes
	if m.DayNotes[1] != "Khởi công" {
		t.Errorf("dayNotes[1]=%q", m.DayNotes[1])
	}
}

func TestGetTeamMonthMatrix_ExcludesSelfUser(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	self, err := EnsureSelfUser("Me", 0)
	if err != nil {
		t.Fatal(err)
	}
	ws := seedWorksite(t, "W", 100000)
	if _, err := UpsertAttendance(self.ID, "2026-04-01", 1.0, &ws, ""); err != nil {
		t.Fatal(err)
	}

	m, _ := GetTeamMonthMatrix("2026-04")
	if len(m.Rows) != 0 {
		t.Errorf("self user must not appear in matrix: %+v", m.Rows)
	}
	if m.DayTotals[1] != 0 {
		t.Errorf("self's attendance leaked into DayTotals: %v", m.DayTotals[1])
	}
}

func TestGetTeamMonthMatrix_InvalidYearMonth(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	if _, err := GetTeamMonthMatrix("bad"); err == nil {
		t.Error("expected error")
	}
	if _, err := GetTeamMonthMatrix("2026-13"); err == nil {
		// regex allows 2026-13 but time.Parse catches it
		t.Error("expected time-parse error for month 13")
	}
}

func TestBulkUpsertWorksite_InsertsAndUpdates(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	ws := seedWorksite(t, "WS", 100000)
	u1 := seedTeamUser(t, "A")
	u2 := seedTeamUser(t, "B")

	// Seed existing for u1 with different worksite
	wsOld := seedWorksite(t, "WS-old", 50000)
	if _, err := UpsertAttendance(u1, "2026-04-01", 0.5, &wsOld, "hello"); err != nil {
		t.Fatal(err)
	}

	cells := []models.CellRef{
		{UserID: u1, Date: "2026-04-01"}, // existing → update worksite, keep coef & note
		{UserID: u1, Date: "2026-04-02"}, // new → insert with coef=1
		{UserID: u2, Date: "2026-04-01"}, // new for u2
	}
	if err := BulkUpsertWorksite(cells, &ws); err != nil {
		t.Fatal(err)
	}

	m, _ := GetTeamMonthMatrix("2026-04")
	rows := map[int64]models.MatrixRow{}
	for _, r := range m.Rows {
		rows[r.UserID] = r
	}
	// u1 day1: coef unchanged (0.5), worksite switched
	c := rows[u1].Cells[1]
	if c.Coefficient != 0.5 {
		t.Errorf("coef should remain 0.5, got %v", c.Coefficient)
	}
	if c.WorksiteID == nil || *c.WorksiteID != ws {
		t.Errorf("worksite not switched: %+v", c)
	}
	if c.Note != "hello" {
		t.Errorf("note should remain: %q", c.Note)
	}
	// u1 day2: new with coef=1
	c2 := rows[u1].Cells[2]
	if c2.Coefficient != 1.0 || c2.WorksiteID == nil || *c2.WorksiteID != ws {
		t.Errorf("u1 day2 wrong: %+v", c2)
	}
	// u2 day1: new
	c3 := rows[u2].Cells[1]
	if c3.Coefficient != 1.0 || c3.WorksiteID == nil || *c3.WorksiteID != ws {
		t.Errorf("u2 day1 wrong: %+v", c3)
	}
}

func TestBulkUpsertWorksite_ClearWorksite(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	ws := seedWorksite(t, "WS", 100000)
	u := seedTeamUser(t, "U")
	if _, err := UpsertAttendance(u, "2026-04-01", 1.0, &ws, ""); err != nil {
		t.Fatal(err)
	}
	cells := []models.CellRef{{UserID: u, Date: "2026-04-01"}}
	if err := BulkUpsertWorksite(cells, nil); err != nil {
		t.Fatal(err)
	}
	m, _ := GetTeamMonthMatrix("2026-04")
	if m.Rows[0].Cells[1].WorksiteID != nil {
		t.Errorf("worksite should be NULL: %+v", m.Rows[0].Cells[1])
	}
}

func TestBulkUpsertWorksite_InvalidDate(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	ws := seedWorksite(t, "WS", 100000)
	cells := []models.CellRef{{UserID: 1, Date: "bad-date"}}
	if err := BulkUpsertWorksite(cells, &ws); err == nil {
		t.Error("expected invalid date error")
	}
}

func TestBulkUpsertWorksite_EmptyNoop(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	if err := BulkUpsertWorksite(nil, nil); err != nil {
		t.Errorf("empty should be noop, got %v", err)
	}
}
