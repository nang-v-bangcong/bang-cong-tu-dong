package services

import "testing"

func TestFillDayForAllUsers_AllMissing(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	ws := seedWorksite(t, "W", 100000)
	seedTeamUser(t, "A")
	seedTeamUser(t, "B")
	seedTeamUser(t, "C")

	n, err := FillDayForAllUsers("2026-04", 15, 1.0, &ws, false)
	if err != nil {
		t.Fatal(err)
	}
	if n != 3 {
		t.Errorf("affected=%d want 3", n)
	}
}

func TestFillDayForAllUsers_SkipExistingWhenNotOverwrite(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	ws := seedWorksite(t, "W", 100000)
	a := seedTeamUser(t, "A")
	seedTeamUser(t, "B")
	seedTeamUser(t, "C")

	if _, err := UpsertAttendance(a, "2026-04-15", 2.0, &ws, "existing"); err != nil {
		t.Fatal(err)
	}

	n, err := FillDayForAllUsers("2026-04", 15, 1.0, &ws, false)
	if err != nil {
		t.Fatal(err)
	}
	if n != 2 {
		t.Errorf("affected=%d want 2 (a skipped)", n)
	}

	m, _ := GetTeamMonthMatrix("2026-04")
	for _, r := range m.Rows {
		if r.UserID == a {
			if r.Cells[15].Coefficient != 2.0 {
				t.Errorf("a's existing cell should stay 2.0, got %v", r.Cells[15].Coefficient)
			}
			if r.Cells[15].Note != "existing" {
				t.Errorf("a's note should stay, got %q", r.Cells[15].Note)
			}
		} else {
			if r.Cells[15].Coefficient != 1.0 {
				t.Errorf("%s day15=%v want 1.0", r.UserName, r.Cells[15].Coefficient)
			}
		}
	}
}

func TestFillDayForAllUsers_OverwriteReplacesExisting(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	ws := seedWorksite(t, "W", 100000)
	a := seedTeamUser(t, "A")
	seedTeamUser(t, "B")

	if _, err := UpsertAttendance(a, "2026-04-15", 2.0, &ws, "note"); err != nil {
		t.Fatal(err)
	}

	n, err := FillDayForAllUsers("2026-04", 15, 1.0, &ws, true)
	if err != nil {
		t.Fatal(err)
	}
	if n < 2 {
		t.Errorf("affected=%d want >=2", n)
	}

	m, _ := GetTeamMonthMatrix("2026-04")
	for _, r := range m.Rows {
		if r.Cells[15].Coefficient != 1.0 {
			t.Errorf("%s day15=%v want 1.0", r.UserName, r.Cells[15].Coefficient)
		}
	}
}

func TestFillDayForAllUsers_ExcludesSelfUser(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	ws := seedWorksite(t, "W", 100000)
	seedTeamUser(t, "A")
	self, _ := EnsureSelfUser("Me", 0)

	n, err := FillDayForAllUsers("2026-04", 10, 1.0, &ws, false)
	if err != nil {
		t.Fatal(err)
	}
	if n != 1 {
		t.Errorf("affected=%d want 1 (only team)", n)
	}

	// self should not have been touched
	items, _ := GetMonthAttendance(self.ID, "2026-04")
	if len(items) != 0 {
		t.Errorf("self should not get a row, got %+v", items)
	}
}

func TestFillDayForAllUsers_InvalidDay(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	if _, err := FillDayForAllUsers("2026-04", 31, 1.0, nil, false); err == nil {
		t.Error("april has 30 days, day 31 should error")
	}
	if _, err := FillDayForAllUsers("2026-04", 0, 1.0, nil, false); err == nil {
		t.Error("day 0 should error")
	}
}

func TestFillDayForAllUsers_CoefOutOfRange(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	if _, err := FillDayForAllUsers("2026-04", 1, 3.5, nil, false); err == nil {
		t.Error("coef 3.5 should error")
	}
}

func TestCopyDayForAll_CopiesDayNote(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()
	ws := seedWorksite(t, "WS", 100000)
	u := seedTeamUser(t, "U")
	if _, err := UpsertAttendance(u, "2026-04-10", 1.0, &ws, ""); err != nil {
		t.Fatal(err)
	}
	if err := UpsertDayNote("2026-04", 10, "original note"); err != nil {
		t.Fatal(err)
	}

	if _, err := CopyDayForAll("2026-04", 10, 11, false); err != nil {
		t.Fatal(err)
	}

	notes, err := GetDayNotes("2026-04")
	if err != nil {
		t.Fatal(err)
	}
	var got string
	for _, n := range notes {
		if n.Day == 11 {
			got = n.Note
		}
	}
	if got != "original note" {
		t.Errorf("day 11 note=%q want 'original note'", got)
	}
}

func TestCopyDayForAll_NoOverwriteKeepsDstNote(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()
	ws := seedWorksite(t, "WS", 100000)
	u := seedTeamUser(t, "U")
	if _, err := UpsertAttendance(u, "2026-04-10", 1.0, &ws, ""); err != nil {
		t.Fatal(err)
	}
	if err := UpsertDayNote("2026-04", 10, "src note"); err != nil {
		t.Fatal(err)
	}
	if err := UpsertDayNote("2026-04", 11, "dst note"); err != nil {
		t.Fatal(err)
	}

	if _, err := CopyDayForAll("2026-04", 10, 11, false); err != nil {
		t.Fatal(err)
	}

	notes, _ := GetDayNotes("2026-04")
	for _, n := range notes {
		if n.Day == 11 && n.Note != "dst note" {
			t.Errorf("dst note overwritten: got %q", n.Note)
		}
	}
}

func TestCopyDayForAll_CopiesToEmptyDay(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	ws := seedWorksite(t, "W", 100000)
	a := seedTeamUser(t, "A")
	b := seedTeamUser(t, "B")

	if _, err := UpsertAttendance(a, "2026-04-10", 1.5, &ws, "note-a"); err != nil {
		t.Fatal(err)
	}
	if _, err := UpsertAttendance(b, "2026-04-10", 0.5, &ws, "note-b"); err != nil {
		t.Fatal(err)
	}

	n, err := CopyDayForAll("2026-04", 10, 11, false)
	if err != nil {
		t.Fatal(err)
	}
	if n != 2 {
		t.Errorf("copied=%d want 2", n)
	}

	m, _ := GetTeamMonthMatrix("2026-04")
	for _, r := range m.Rows {
		src := r.Cells[10]
		dst := r.Cells[11]
		if src.Coefficient != dst.Coefficient || src.Note != dst.Note {
			t.Errorf("%s day11 should match day10, src=%+v dst=%+v", r.UserName, src, dst)
		}
	}
}

func TestCopyDayForAll_SkipsExistingWhenNotOverwrite(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	ws := seedWorksite(t, "W", 100000)
	a := seedTeamUser(t, "A")
	b := seedTeamUser(t, "B")

	if _, err := UpsertAttendance(a, "2026-04-10", 1.5, &ws, "src-a"); err != nil {
		t.Fatal(err)
	}
	if _, err := UpsertAttendance(b, "2026-04-10", 0.5, &ws, "src-b"); err != nil {
		t.Fatal(err)
	}
	// a already has dst cell
	if _, err := UpsertAttendance(a, "2026-04-11", 2.0, &ws, "keep"); err != nil {
		t.Fatal(err)
	}

	n, err := CopyDayForAll("2026-04", 10, 11, false)
	if err != nil {
		t.Fatal(err)
	}
	if n != 1 {
		t.Errorf("copied=%d want 1 (a skipped)", n)
	}

	m, _ := GetTeamMonthMatrix("2026-04")
	for _, r := range m.Rows {
		if r.UserID == a {
			if r.Cells[11].Coefficient != 2.0 || r.Cells[11].Note != "keep" {
				t.Errorf("a day11 should remain, got %+v", r.Cells[11])
			}
		}
	}
}

func TestCopyDayForAll_OverwriteReplaces(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	ws := seedWorksite(t, "W", 100000)
	a := seedTeamUser(t, "A")

	if _, err := UpsertAttendance(a, "2026-04-10", 1.5, &ws, "src"); err != nil {
		t.Fatal(err)
	}
	if _, err := UpsertAttendance(a, "2026-04-11", 2.0, &ws, "keep"); err != nil {
		t.Fatal(err)
	}

	n, err := CopyDayForAll("2026-04", 10, 11, true)
	if err != nil {
		t.Fatal(err)
	}
	if n != 1 {
		t.Errorf("copied=%d want 1", n)
	}

	m, _ := GetTeamMonthMatrix("2026-04")
	if m.Rows[0].Cells[11].Coefficient != 1.5 || m.Rows[0].Cells[11].Note != "src" {
		t.Errorf("day11 should be overwritten, got %+v", m.Rows[0].Cells[11])
	}
}

func TestCopyDayForAll_EmptySrcNoop(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	seedTeamUser(t, "A")
	n, err := CopyDayForAll("2026-04", 10, 11, false)
	if err != nil {
		t.Fatal(err)
	}
	if n != 0 {
		t.Errorf("copied=%d want 0 (no src data)", n)
	}
}

func TestCopyDayForAll_SameDayErrors(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	if _, err := CopyDayForAll("2026-04", 5, 5, false); err == nil {
		t.Error("src==dst should error")
	}
}

func TestCopyDayForAll_OutOfRange(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	if _, err := CopyDayForAll("2026-04", 1, 31, false); err == nil {
		t.Error("dst=31 in april should error")
	}
	if _, err := CopyDayForAll("2026-04", 0, 2, false); err == nil {
		t.Error("src=0 should error")
	}
}

func TestCopyDayForAll_ExcludesSelfUser(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	ws := seedWorksite(t, "W", 100000)
	a := seedTeamUser(t, "A")
	self, _ := EnsureSelfUser("Me", 0)

	if _, err := UpsertAttendance(self.ID, "2026-04-10", 1.0, &ws, ""); err != nil {
		t.Fatal(err)
	}
	if _, err := UpsertAttendance(a, "2026-04-10", 1.5, &ws, ""); err != nil {
		t.Fatal(err)
	}

	n, err := CopyDayForAll("2026-04", 10, 11, false)
	if err != nil {
		t.Fatal(err)
	}
	if n != 1 {
		t.Errorf("copied=%d want 1 (self excluded)", n)
	}

	items, _ := GetMonthAttendance(self.ID, "2026-04")
	days := map[string]bool{}
	for _, a := range items {
		days[a.Date] = true
	}
	if days["2026-04-11"] {
		t.Error("self day11 should not exist")
	}
}
