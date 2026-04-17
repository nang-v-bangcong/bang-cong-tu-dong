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
