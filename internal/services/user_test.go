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

	if _, err := CreateTeamUser("A"); err != nil {
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

	// "A" appears twice in the input — should count as 1 create, 0 skip.
	res, err := BulkCreateUsers([]string{"A", "A", "B"})
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if len(res.Created) != 2 {
		t.Errorf("created=%d want 2 (%+v)", len(res.Created), res.Created)
	}
	if len(res.Skipped) != 0 {
		t.Errorf("skipped=%d want 0 (%+v)", len(res.Skipped), res.Skipped)
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
