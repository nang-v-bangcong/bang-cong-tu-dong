package services

import "testing"

func TestBulkCreateUsers_AllNew(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	res, err := BulkCreateUsers([]string{"A", "B", "C"})
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if len(res.Created) != 3 {
		t.Errorf("created=%d want 3 (%+v)", len(res.Created), res.Created)
	}
	if len(res.Skipped) != 0 {
		t.Errorf("skipped=%d want 0 (%+v)", len(res.Skipped), res.Skipped)
	}

	users, _ := GetTeamUsers()
	if len(users) != 3 {
		t.Errorf("DB has %d users, want 3", len(users))
	}
}

func TestBulkCreateUsers_SkipDuplicates(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	if _, err := CreateTeamUser("A", 0); err != nil {
		t.Fatal(err)
	}
	res, err := BulkCreateUsers([]string{"A", "B"})
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if len(res.Created) != 1 || res.Created[0].Name != "B" {
		t.Errorf("created=%+v want only B", res.Created)
	}
	if len(res.Skipped) != 1 || res.Skipped[0] != "A" {
		t.Errorf("skipped=%+v want [A]", res.Skipped)
	}

	users, _ := GetTeamUsers()
	if len(users) != 2 {
		t.Errorf("DB has %d users, want 2 (A+B)", len(users))
	}
}

func TestBulkCreateUsers_EmptyArray(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	if _, err := BulkCreateUsers(nil); err == nil {
		t.Error("want error on empty slice")
	}
}

func TestBulkCreateUsers_BlankName(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	if _, err := BulkCreateUsers([]string{"A", "  ", "B"}); err == nil {
		t.Error("want error on blank name")
	}
	users, _ := GetTeamUsers()
	if len(users) != 0 {
		t.Errorf("tx should have rolled back, got %d users", len(users))
	}
}

func TestBulkCreateUsers_DedupeWithinRequest(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	// "A" appears twice in the input: one create + one skip so the caller can
	// surface the duplicate line to the user.
	res, err := BulkCreateUsers([]string{"A", "A", "B"})
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if len(res.Created) != 2 {
		t.Errorf("created=%d want 2 (%+v)", len(res.Created), res.Created)
	}
	if len(res.Skipped) != 1 || res.Skipped[0] != "A" {
		t.Errorf("skipped=%+v want [A]", res.Skipped)
	}
}

func TestBulkCreateUsers_DedupeCaseInsensitive(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	// "Nam" and "nam" must collapse to one person so attendance/salary can't
	// drift across two rows for the same worker.
	res, err := BulkCreateUsers([]string{"Nam", "nam", "NAM", "Hoa"})
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if len(res.Created) != 2 {
		t.Errorf("created=%d want 2 (%+v)", len(res.Created), res.Created)
	}
	if len(res.Skipped) != 2 {
		t.Errorf("skipped=%+v want 2 entries (the casing duplicates)", res.Skipped)
	}
}

func TestBulkCreateUsers_SkipExistingCaseInsensitive(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	if _, err := CreateTeamUser("Nam", 0); err != nil {
		t.Fatal(err)
	}
	res, err := BulkCreateUsers([]string{"NAM", "nam", "Hoa"})
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if len(res.Created) != 1 || res.Created[0].Name != "Hoa" {
		t.Errorf("created=%+v want only Hoa", res.Created)
	}
	if len(res.Skipped) != 2 {
		t.Errorf("skipped=%+v want 2 entries", res.Skipped)
	}
}

func TestCreateTeamUser_RejectsDuplicateCaseInsensitive(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	if _, err := CreateTeamUser("Nam", 0); err != nil {
		t.Fatal(err)
	}
	if _, err := CreateTeamUser("nam", 0); err == nil {
		t.Error("expected rejection: 'Nam' and 'nam' must be treated as the same person")
	}
	if _, err := CreateTeamUser("NAM", 0); err == nil {
		t.Error("expected rejection for upper-case duplicate")
	}
}

func TestBulkCreateUsers_TrimsWhitespace(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	res, err := BulkCreateUsers([]string{"  Alice  "})
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if len(res.Created) != 1 || res.Created[0].Name != "Alice" {
		t.Errorf("want Alice (trimmed), got %+v", res.Created)
	}
}

func TestCreateTeamUser_RejectsDuplicate(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	if _, err := CreateTeamUser("Anh A", 0); err != nil {
		t.Fatal(err)
	}
	if _, err := CreateTeamUser("Anh A", 0); err == nil {
		t.Error("expected duplicate rejection")
	}
}

func TestCreateTeamUser_RejectsBlank(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	if _, err := CreateTeamUser("   ", 0); err == nil {
		t.Error("expected blank name rejection")
	}
}

func TestCreateTeamUser_TrimsWhitespace(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	u, err := CreateTeamUser("  Anh B  ", 0)
	if err != nil {
		t.Fatal(err)
	}
	if u.Name != "Anh B" {
		t.Errorf("name=%q want 'Anh B'", u.Name)
	}
}

func TestUpdateUser_RejectsDuplicate(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	a, err := CreateTeamUser("Anh A", 0)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := CreateTeamUser("Anh B", 0); err != nil {
		t.Fatal(err)
	}
	if err := UpdateUser(a.ID, "Anh B", 0); err == nil {
		t.Error("expected rename-to-duplicate rejection")
	}
}

func TestUpdateUser_KeepsSameName(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	a, err := CreateTeamUser("Anh A", 0)
	if err != nil {
		t.Fatal(err)
	}
	if err := UpdateUser(a.ID, "Anh A", 0); err != nil {
		t.Errorf("renaming user to its own name should be a noop, got %v", err)
	}
}
