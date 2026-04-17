package services

import "testing"

func TestValidateDate_Strict(t *testing.T) {
	tests := []struct {
		date    string
		wantErr bool
	}{
		{"2026-04-17", false},
		{"2024-02-29", false},  // leap
		{"2025-02-29", true},   // non-leap
		{"2024-02-30", true},   // impossible
		{"2024-13-01", true},   // month 13
		{"2024-00-01", true},   // month 0
		{"2024-04-31", true},   // April has 30
		{"2024-4-1", true},     // format: not zero-padded
		{"24-04-01", true},     // 2-digit year
		{"2024/04/01", true},   // wrong separator
		{"", true},
		{"abc", true},
	}
	for _, tc := range tests {
		err := ValidateDate(tc.date)
		if (err != nil) != tc.wantErr {
			t.Errorf("ValidateDate(%q) err=%v wantErr=%v", tc.date, err, tc.wantErr)
		}
	}
}

func TestValidateYearMonth_Strict(t *testing.T) {
	tests := []struct {
		ym      string
		wantErr bool
	}{
		{"2026-04", false},
		{"2024-13", true},
		{"2024-00", true},
		{"24-04", true},
		{"", true},
	}
	for _, tc := range tests {
		err := ValidateYearMonth(tc.ym)
		if (err != nil) != tc.wantErr {
			t.Errorf("ValidateYearMonth(%q) err=%v wantErr=%v", tc.ym, err, tc.wantErr)
		}
	}
}

func TestDaysInMonth(t *testing.T) {
	cases := map[string]int{
		"2024-01": 31,
		"2024-02": 29, // leap
		"2025-02": 28,
		"2024-04": 30,
		"2024-12": 31,
	}
	for ym, want := range cases {
		if got := DaysInMonth(ym); got != want {
			t.Errorf("DaysInMonth(%s) = %d, want %d", ym, got, want)
		}
	}
}

func TestUpsertAttendance_RejectsImpossibleDate(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()
	uid := seedTeamUser(t, "Anh A")

	if _, err := UpsertAttendance(uid, "2024-02-30", 1.0, nil, ""); err == nil {
		t.Error("expected error for 2024-02-30")
	}
	if _, err := UpsertAttendance(uid, "2024-04-31", 1.0, nil, ""); err == nil {
		t.Error("expected error for 2024-04-31")
	}
}

func TestUpsertAttendance_RejectsCoefOutOfRange(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()
	uid := seedTeamUser(t, "Anh A")

	if _, err := UpsertAttendance(uid, "2026-04-01", -0.5, nil, ""); err == nil {
		t.Error("expected error for negative coef")
	}
	if _, err := UpsertAttendance(uid, "2026-04-01", 3.1, nil, ""); err == nil {
		t.Error("expected error for coef>3")
	}
}

func TestDeleteAttendance(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()
	uid := seedTeamUser(t, "Anh A")

	a, err := UpsertAttendance(uid, "2026-04-17", 1.0, nil, "")
	if err != nil {
		t.Fatalf("seed: %v", err)
	}
	if err := DeleteAttendance(a.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
	list, _ := GetMonthAttendance(uid, "2026-04")
	if len(list) != 0 {
		t.Errorf("want 0 after delete, got %d", len(list))
	}
	// Deleting missing ID is a noop, not an error.
	if err := DeleteAttendance(99999); err != nil {
		t.Errorf("delete missing should be noop: %v", err)
	}
}

func TestGetMonthSummary_NoWorksite(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()
	uid := seedTeamUser(t, "Anh A")

	// Two unpaid cells (no worksite).
	if _, err := UpsertAttendance(uid, "2026-04-01", 1.0, nil, ""); err != nil {
		t.Fatal(err)
	}
	if _, err := UpsertAttendance(uid, "2026-04-02", 1.5, nil, ""); err != nil {
		t.Fatal(err)
	}

	s, err := GetMonthSummary(uid, "2026-04")
	if err != nil {
		t.Fatalf("summary: %v", err)
	}
	if s.TotalDays != 2 {
		t.Errorf("TotalDays=%d want 2", s.TotalDays)
	}
	if s.TotalCoefficient != 2.5 {
		t.Errorf("TotalCoefficient=%v want 2.5", s.TotalCoefficient)
	}
	if s.PaidDays != 0 || s.UnpaidDays != 2 {
		t.Errorf("paid=%d unpaid=%d want 0/2", s.PaidDays, s.UnpaidDays)
	}
	if s.TotalSalary != 0 {
		t.Errorf("TotalSalary=%v want 0 (no worksite)", s.TotalSalary)
	}
}

func TestGetMonthSummary_PaidAndAdvance(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()
	uid := seedTeamUser(t, "Anh A")
	ws := seedWorksite(t, "Site-A", 150000)

	// 3 days * coef 1.0 at 150k = 450k
	for _, d := range []string{"2026-04-01", "2026-04-02", "2026-04-03"} {
		if _, err := UpsertAttendance(uid, d, 1.0, &ws, ""); err != nil {
			t.Fatal(err)
		}
	}
	// One advance of 100k
	if _, err := CreateAdvance(uid, "2026-04-05", 100000, ""); err != nil {
		t.Fatal(err)
	}

	s, err := GetMonthSummary(uid, "2026-04")
	if err != nil {
		t.Fatalf("summary: %v", err)
	}
	if s.TotalSalary != 450000 {
		t.Errorf("TotalSalary=%v want 450000", s.TotalSalary)
	}
	if s.TotalAdvances != 100000 {
		t.Errorf("TotalAdvances=%v want 100000", s.TotalAdvances)
	}
	if s.NetSalary != 350000 {
		t.Errorf("NetSalary=%v want 350000", s.NetSalary)
	}
	if s.PaidDays != 3 {
		t.Errorf("PaidDays=%d want 3", s.PaidDays)
	}
}

func TestGetWorksiteSummary(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()
	uid := seedTeamUser(t, "Anh A")
	a := seedWorksite(t, "Site-A", 100000)
	b := seedWorksite(t, "Site-B", 200000)

	if _, err := UpsertAttendance(uid, "2026-04-01", 1.0, &a, ""); err != nil {
		t.Fatal(err)
	}
	if _, err := UpsertAttendance(uid, "2026-04-02", 1.5, &a, ""); err != nil {
		t.Fatal(err)
	}
	if _, err := UpsertAttendance(uid, "2026-04-03", 1.0, &b, ""); err != nil {
		t.Fatal(err)
	}

	list, err := GetWorksiteSummary(uid, "2026-04")
	if err != nil {
		t.Fatalf("summary: %v", err)
	}
	if len(list) != 2 {
		t.Fatalf("want 2 worksites, got %d", len(list))
	}
	// Ordered by total coef desc: A has 2.5, B has 1.0
	if list[0].TotalCoeff != 2.5 {
		t.Errorf("first.TotalCoeff=%v want 2.5", list[0].TotalCoeff)
	}
	if list[0].TotalSalary != 250000 {
		t.Errorf("first.TotalSalary=%v want 250000", list[0].TotalSalary)
	}
}

func TestCopyPreviousDay(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()
	uid := seedTeamUser(t, "Anh A")
	ws := seedWorksite(t, "WS", 100000)

	// Seed a prior day.
	if _, err := UpsertAttendance(uid, "2026-04-05", 1.5, &ws, "prior"); err != nil {
		t.Fatal(err)
	}

	got, err := CopyPreviousDay(uid, "2026-04-06")
	if err != nil {
		t.Fatalf("copy: %v", err)
	}
	if got.Coefficient != 1.5 {
		t.Errorf("coef=%v want 1.5", got.Coefficient)
	}
	if got.WorksiteID == nil || *got.WorksiteID != ws {
		t.Errorf("worksite not copied: %+v", got.WorksiteID)
	}
	if got.Note != "prior" {
		t.Errorf("note=%q want 'prior'", got.Note)
	}
}

func TestCopyPreviousDay_NoPrior(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()
	uid := seedTeamUser(t, "Anh A")

	if _, err := CopyPreviousDay(uid, "2026-04-06"); err == nil {
		t.Error("expected error when there is no prior day")
	}
}
