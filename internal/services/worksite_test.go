package services

import (
	"strings"
	"testing"
)

func TestDeleteWorksite_RejectsIfInUse(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()
	u := seedTeamUser(t, "U")
	ws := seedWorksite(t, "WS", 100000)
	if _, err := UpsertAttendance(u, "2026-04-01", 1.0, &ws, ""); err != nil {
		t.Fatal(err)
	}

	err := DeleteWorksite(ws)
	if err == nil {
		t.Fatal("expected error when worksite is in use")
	}
	if !strings.Contains(err.Error(), "1 ô") {
		t.Errorf("error message should mention the 1 cell in use, got: %v", err)
	}
}

func TestDeleteWorksite_DeletesWhenFree(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()
	ws, err := CreateWorksite("Temp", 100000)
	if err != nil {
		t.Fatal(err)
	}
	if err := DeleteWorksite(ws.ID); err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	list, _ := GetWorksites()
	for _, w := range list {
		if w.ID == ws.ID {
			t.Errorf("worksite not deleted")
		}
	}
}
