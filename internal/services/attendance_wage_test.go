package services

import "testing"

// seedTeamUserWithWage creates a team user with an explicit base daily wage.
func seedTeamUserWithWage(t *testing.T, name string, wage int64) int64 {
	t.Helper()
	u, err := CreateTeamUser(name, wage)
	if err != nil {
		t.Fatalf("create user: %v", err)
	}
	return u.ID
}

func TestGetMonthSummary_UserBaseWage_WhenWorksiteWageZero(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	// Worker has base wage 150k, worksite has no override (wage=0 → fall back to user).
	uid := seedTeamUserWithWage(t, "Tho", 150000)
	ws := seedWorksite(t, "Site-Noop", 0)

	for _, d := range []string{"2026-04-01", "2026-04-02"} {
		if _, err := UpsertAttendance(uid, d, 1.0, &ws, ""); err != nil {
			t.Fatal(err)
		}
	}

	s, err := GetMonthSummary(uid, "2026-04")
	if err != nil {
		t.Fatal(err)
	}
	if s.TotalSalary != 300000 {
		t.Errorf("TotalSalary=%v want 300000 (2 days * 150k user base)", s.TotalSalary)
	}
	if s.PaidDays != 2 {
		t.Errorf("PaidDays=%d want 2 (user base makes them paid)", s.PaidDays)
	}
}

func TestGetMonthSummary_WorksiteOverridesUserWage(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	// User base 150k, worksite alba 200k → worksite wins.
	uid := seedTeamUserWithWage(t, "Tho", 150000)
	alba := seedWorksite(t, "Alba", 200000)

	if _, err := UpsertAttendance(uid, "2026-04-01", 1.0, &alba, ""); err != nil {
		t.Fatal(err)
	}

	s, err := GetMonthSummary(uid, "2026-04")
	if err != nil {
		t.Fatal(err)
	}
	if s.TotalSalary != 200000 {
		t.Errorf("TotalSalary=%v want 200000 (worksite override beats user base)", s.TotalSalary)
	}
}

func TestGetMonthSummary_ApprenticeStillUnpaidWithZeroBase(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	// Apprentice (wage 0) at worksite with no override → still unpaid.
	uid := seedTeamUserWithWage(t, "Hocviec", 0)
	ws := seedWorksite(t, "Site", 0)

	if _, err := UpsertAttendance(uid, "2026-04-01", 1.0, &ws, ""); err != nil {
		t.Fatal(err)
	}

	s, err := GetMonthSummary(uid, "2026-04")
	if err != nil {
		t.Fatal(err)
	}
	if s.TotalSalary != 0 {
		t.Errorf("TotalSalary=%v want 0", s.TotalSalary)
	}
	if s.UnpaidDays != 1 {
		t.Errorf("UnpaidDays=%d want 1", s.UnpaidDays)
	}
	if s.PaidDays != 0 {
		t.Errorf("PaidDays=%d want 0", s.PaidDays)
	}
}

func TestGetTeamMonthMatrix_UsesUserBaseWageFallback(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	uid := seedTeamUserWithWage(t, "Tho", 150000)
	ws := seedWorksite(t, "Site-Noop", 0)
	if _, err := UpsertAttendance(uid, "2026-04-01", 1.0, &ws, ""); err != nil {
		t.Fatal(err)
	}

	m, err := GetTeamMonthMatrix("2026-04")
	if err != nil {
		t.Fatal(err)
	}
	var salary float64
	for _, r := range m.Rows {
		if r.UserID == uid {
			salary = r.Salary
		}
	}
	if salary != 150000 {
		t.Errorf("row.Salary=%v want 150000 (user base fallback)", salary)
	}
}
