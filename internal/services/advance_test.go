package services

import "testing"

func TestCreateAdvance_Validation(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()
	uid := seedTeamUser(t, "Anh A")

	// Invalid date
	if _, err := CreateAdvance(uid, "2024-02-30", 100000, ""); err == nil {
		t.Error("expected error for impossible date 2024-02-30")
	}
	if _, err := CreateAdvance(uid, "bad", 100000, ""); err == nil {
		t.Error("expected error for non-date string")
	}
	// Non-positive amount
	if _, err := CreateAdvance(uid, "2026-04-17", 0, ""); err == nil {
		t.Error("expected error for amount=0")
	}
	if _, err := CreateAdvance(uid, "2026-04-17", -100, ""); err == nil {
		t.Error("expected error for negative amount")
	}
	// Valid
	a, err := CreateAdvance(uid, "2026-04-17", 100000, "ok")
	if err != nil {
		t.Fatalf("valid create: %v", err)
	}
	if a.Amount != 100000 || a.Date != "2026-04-17" {
		t.Errorf("unexpected advance: %+v", a)
	}
}

func TestUpdateAdvance_Validation(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()
	uid := seedTeamUser(t, "Anh A")
	a, err := CreateAdvance(uid, "2026-04-17", 100000, "")
	if err != nil {
		t.Fatalf("seed: %v", err)
	}

	if err := UpdateAdvance(a.ID, "2024-02-30", 50000, ""); err == nil {
		t.Error("expected error for impossible date in update")
	}
	if err := UpdateAdvance(a.ID, "2026-04-17", -1, ""); err == nil {
		t.Error("expected error for negative amount in update")
	}
	if err := UpdateAdvance(a.ID, "2026-04-18", 50000, "edited"); err != nil {
		t.Errorf("valid update: %v", err)
	}
}

func TestGetMonthAdvances(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()
	uid := seedTeamUser(t, "Anh A")

	if _, err := CreateAdvance(uid, "2026-04-01", 100000, ""); err != nil {
		t.Fatal(err)
	}
	if _, err := CreateAdvance(uid, "2026-04-15", 50000, ""); err != nil {
		t.Fatal(err)
	}
	if _, err := CreateAdvance(uid, "2026-05-01", 200000, ""); err != nil {
		t.Fatal(err)
	}

	april, err := GetMonthAdvances(uid, "2026-04")
	if err != nil {
		t.Fatalf("get april: %v", err)
	}
	if len(april) != 2 {
		t.Fatalf("want 2 april advances, got %d", len(april))
	}

	may, _ := GetMonthAdvances(uid, "2026-05")
	if len(may) != 1 {
		t.Fatalf("want 1 may advance, got %d", len(may))
	}
}

func TestDeleteAdvance(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()
	uid := seedTeamUser(t, "Anh A")
	a, _ := CreateAdvance(uid, "2026-04-17", 100000, "")

	if err := DeleteAdvance(a.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
	list, _ := GetMonthAdvances(uid, "2026-04")
	if len(list) != 0 {
		t.Errorf("expected 0 after delete, got %d", len(list))
	}
}
