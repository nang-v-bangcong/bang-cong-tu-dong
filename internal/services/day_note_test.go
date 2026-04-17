package services

import (
	"strings"
	"testing"
)

func TestValidateDay(t *testing.T) {
	tests := []struct {
		day     int
		wantErr bool
	}{
		{0, true},
		{-1, true},
		{1, false},
		{15, false},
		{31, false},
		{32, true},
		{100, true},
	}
	for _, tc := range tests {
		err := ValidateDay(tc.day)
		if (err != nil) != tc.wantErr {
			t.Errorf("ValidateDay(%d) err=%v wantErr=%v", tc.day, err, tc.wantErr)
		}
	}
}

func TestUpsertDayNote_InsertUpdateDelete(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	// Insert
	if err := UpsertDayNote("2026-04", 5, "Ngày nghỉ bù"); err != nil {
		t.Fatalf("insert: %v", err)
	}
	notes, err := GetDayNotes("2026-04")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if len(notes) != 1 || notes[0].Day != 5 || notes[0].Note != "Ngày nghỉ bù" {
		t.Fatalf("unexpected notes: %+v", notes)
	}

	// Update (same PK)
	if err := UpsertDayNote("2026-04", 5, "Sửa lại"); err != nil {
		t.Fatalf("update: %v", err)
	}
	notes, _ = GetDayNotes("2026-04")
	if len(notes) != 1 || notes[0].Note != "Sửa lại" {
		t.Fatalf("update failed: %+v", notes)
	}

	// Delete via empty string
	if err := UpsertDayNote("2026-04", 5, ""); err != nil {
		t.Fatalf("delete: %v", err)
	}
	notes, _ = GetDayNotes("2026-04")
	if len(notes) != 0 {
		t.Fatalf("expected deleted, got: %+v", notes)
	}

	// Whitespace-only also deletes
	if err := UpsertDayNote("2026-04", 6, "    "); err != nil {
		t.Fatalf("whitespace: %v", err)
	}
	notes, _ = GetDayNotes("2026-04")
	if len(notes) != 0 {
		t.Fatalf("whitespace should not insert: %+v", notes)
	}
}

func TestUpsertDayNote_Validation(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	if err := UpsertDayNote("bad", 1, "x"); err == nil {
		t.Error("expected invalid yearMonth error")
	}
	if err := UpsertDayNote("2026-04", 0, "x"); err == nil {
		t.Error("expected invalid day=0 error")
	}
	if err := UpsertDayNote("2026-04", 32, "x"); err == nil {
		t.Error("expected invalid day=32 error")
	}
	// Over 500 chars (rune count)
	long := strings.Repeat("a", 501)
	if err := UpsertDayNote("2026-04", 1, long); err == nil {
		t.Error("expected length error")
	}
	// Exactly 500 passes
	exact := strings.Repeat("a", 500)
	if err := UpsertDayNote("2026-04", 1, exact); err != nil {
		t.Errorf("500 chars should pass: %v", err)
	}
}

func TestGetDayNotes_MultipleMonths(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	if err := UpsertDayNote("2026-04", 1, "April-1"); err != nil {
		t.Fatal(err)
	}
	if err := UpsertDayNote("2026-05", 1, "May-1"); err != nil {
		t.Fatal(err)
	}
	if err := UpsertDayNote("2026-04", 15, "April-15"); err != nil {
		t.Fatal(err)
	}

	april, _ := GetDayNotes("2026-04")
	if len(april) != 2 {
		t.Fatalf("april want 2, got %d", len(april))
	}
	if april[0].Day != 1 || april[1].Day != 15 {
		t.Errorf("not ordered by day: %+v", april)
	}
	may, _ := GetDayNotes("2026-05")
	if len(may) != 1 {
		t.Fatalf("may want 1, got %d", len(may))
	}
}
