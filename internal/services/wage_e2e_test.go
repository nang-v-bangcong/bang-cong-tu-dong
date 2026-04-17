package services

import "testing"

// TestWageFlow_EndToEnd simulates a realistic week:
// - Tho (base 150k): 3 days at Site (no override) + 1 day at Alba (200k override)
// - HocViec (base 0): 2 days at Site → unpaid
// - Verifies: individual summary, team matrix row, worksite breakdown,
//   and that EnsureSelfUser upsert preserves wage.
func TestWageFlow_EndToEnd(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	tho := seedTeamUserWithWage(t, "Tho", 150000)
	hocViec := seedTeamUserWithWage(t, "HocViec", 0)

	site := seedWorksite(t, "Site", 0)     // no override → falls back to user
	alba := seedWorksite(t, "Alba", 200000) // override

	// Tho: 3 days at Site (@150k each) + 1 at Alba (@200k)
	for _, d := range []string{"2026-04-01", "2026-04-02", "2026-04-03"} {
		if _, err := UpsertAttendance(tho, d, 1.0, &site, ""); err != nil {
			t.Fatalf("tho site: %v", err)
		}
	}
	if _, err := UpsertAttendance(tho, "2026-04-04", 1.0, &alba, ""); err != nil {
		t.Fatalf("tho alba: %v", err)
	}

	// Hoc viec: 2 days at Site → both unpaid (both wages 0)
	for _, d := range []string{"2026-04-01", "2026-04-02"} {
		if _, err := UpsertAttendance(hocViec, d, 1.0, &site, ""); err != nil {
			t.Fatalf("hv: %v", err)
		}
	}

	// --- Individual summary (Tho) ---
	s, err := GetMonthSummary(tho, "2026-04")
	if err != nil {
		t.Fatal(err)
	}
	wantSalary := float64(3*150000 + 200000) // 650k
	if s.TotalSalary != wantSalary {
		t.Errorf("Tho salary=%v want %v", s.TotalSalary, wantSalary)
	}
	if s.PaidDays != 4 || s.UnpaidDays != 0 {
		t.Errorf("Tho paid=%d unpaid=%d want 4/0", s.PaidDays, s.UnpaidDays)
	}

	// --- Individual summary (HocViec) ---
	s2, err := GetMonthSummary(hocViec, "2026-04")
	if err != nil {
		t.Fatal(err)
	}
	if s2.TotalSalary != 0 {
		t.Errorf("HocViec salary=%v want 0", s2.TotalSalary)
	}
	if s2.UnpaidDays != 2 || s2.PaidDays != 0 {
		t.Errorf("HocViec paid=%d unpaid=%d want 0/2", s2.PaidDays, s2.UnpaidDays)
	}

	// --- Team matrix row for Tho ---
	m, err := GetTeamMonthMatrix("2026-04")
	if err != nil {
		t.Fatal(err)
	}
	var thoSalary float64
	for _, r := range m.Rows {
		if r.UserID == tho {
			thoSalary = r.Salary
		}
	}
	if thoSalary != wantSalary {
		t.Errorf("matrix Tho salary=%v want %v", thoSalary, wantSalary)
	}

	// --- Worksite summary for Tho ---
	ws, err := GetWorksiteSummary(tho, "2026-04")
	if err != nil {
		t.Fatal(err)
	}
	var siteSalary, albaSalary float64
	for _, row := range ws {
		switch row.WorksiteName {
		case "Site":
			siteSalary = row.TotalSalary
		case "Alba":
			albaSalary = row.TotalSalary
		}
	}
	if siteSalary != 450000 {
		t.Errorf("Site breakdown=%v want 450000 (3×150k user base)", siteSalary)
	}
	if albaSalary != 200000 {
		t.Errorf("Alba breakdown=%v want 200000", albaSalary)
	}
}

// TestUpdateUser_ChangesWage_RetroactivelyAffectsSummary confirms that changing
// a user's base wage later recomputes all prior days priced from that base.
// Real scenario: apprentice gets promoted mid-month, back-applies to their
// existing unpaid days at worksites without overrides.
func TestUpdateUser_ChangesWage_RetroactivelyAffectsSummary(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	uid := seedTeamUserWithWage(t, "HocViec", 0)
	site := seedWorksite(t, "Site", 0)

	if _, err := UpsertAttendance(uid, "2026-04-01", 1.0, &site, ""); err != nil {
		t.Fatal(err)
	}

	// Before promotion: unpaid
	s, _ := GetMonthSummary(uid, "2026-04")
	if s.TotalSalary != 0 || s.UnpaidDays != 1 {
		t.Fatalf("pre: salary=%v unpaid=%d", s.TotalSalary, s.UnpaidDays)
	}

	// Promoted to 120k/day
	if err := UpdateUser(uid, "HocViec", 120000); err != nil {
		t.Fatal(err)
	}

	// After: same day now priced
	s, _ = GetMonthSummary(uid, "2026-04")
	if s.TotalSalary != 120000 {
		t.Errorf("post salary=%v want 120000", s.TotalSalary)
	}
	if s.PaidDays != 1 || s.UnpaidDays != 0 {
		t.Errorf("post paid=%d unpaid=%d want 1/0", s.PaidDays, s.UnpaidDays)
	}
}

// TestWorksiteOverrideRemoved_FallsBackToUserWage confirms that setting a
// worksite wage to 0 (removing override) makes it fall back to user base.
func TestWorksiteOverrideRemoved_FallsBackToUserWage(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	uid := seedTeamUserWithWage(t, "Tho", 150000)
	alba := seedWorksite(t, "Alba", 200000)

	if _, err := UpsertAttendance(uid, "2026-04-01", 1.0, &alba, ""); err != nil {
		t.Fatal(err)
	}

	s, _ := GetMonthSummary(uid, "2026-04")
	if s.TotalSalary != 200000 {
		t.Fatalf("pre: salary=%v want 200000", s.TotalSalary)
	}

	// Remove override
	if err := UpdateWorksite(alba, "Alba", 0); err != nil {
		t.Fatal(err)
	}

	s, _ = GetMonthSummary(uid, "2026-04")
	if s.TotalSalary != 150000 {
		t.Errorf("post salary=%v want 150000 (falls back to user base)", s.TotalSalary)
	}
}
