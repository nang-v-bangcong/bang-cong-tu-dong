package services

import (
	"database/sql"
	"path/filepath"
	"testing"
)

// TestRestoreDB_HappyPath exercises the full backup → restore cycle.
func TestRestoreDB_HappyPath(t *testing.T) {
	tmpDir := t.TempDir()
	t.Setenv("BANG_CONG_DATA_DIR", tmpDir)

	// Open real DB under the temp AppData.
	if _, err := InitDB(); err != nil {
		t.Fatalf("init: %v", err)
	}
	defer func() {
		if db != nil {
			db.Close()
			db = nil
		}
	}()

	// Seed one user so we can tell "before" from "after".
	if _, err := CreateTeamUser("Before-Restore", 0); err != nil {
		t.Fatalf("seed: %v", err)
	}

	// Backup to external file.
	backupPath := filepath.Join(tmpDir, "backup.db")
	if err := BackupDB(backupPath); err != nil {
		t.Fatalf("backup: %v", err)
	}

	// Mutate DB after backup.
	if _, err := CreateTeamUser("After-Backup", 0); err != nil {
		t.Fatalf("seed after: %v", err)
	}

	// Restore should roll back to pre-backup state.
	if err := RestoreDB(backupPath); err != nil {
		t.Fatalf("restore: %v", err)
	}

	users, err := GetTeamUsers()
	if err != nil {
		t.Fatalf("list after restore: %v", err)
	}
	names := make([]string, len(users))
	for i, u := range users {
		names[i] = u.Name
	}
	foundBefore, foundAfter := false, false
	for _, n := range names {
		if n == "Before-Restore" {
			foundBefore = true
		}
		if n == "After-Backup" {
			foundAfter = true
		}
	}
	if !foundBefore {
		t.Errorf("expected Before-Restore to survive restore, got %v", names)
	}
	if foundAfter {
		t.Errorf("After-Backup should not exist after restore, got %v", names)
	}
}

// TestRestoreDB_BadSource_KeepsOriginal ensures a missing/unreadable source
// never leaves the app with a nil or closed db.
func TestRestoreDB_BadSource_KeepsOriginal(t *testing.T) {
	tmpDir := t.TempDir()
	t.Setenv("BANG_CONG_DATA_DIR", tmpDir)

	if _, err := InitDB(); err != nil {
		t.Fatalf("init: %v", err)
	}
	defer func() {
		if db != nil {
			db.Close()
			db = nil
		}
	}()

	if _, err := CreateTeamUser("Survivor", 0); err != nil {
		t.Fatalf("seed: %v", err)
	}

	// Restore from nonexistent path must error and leave db intact.
	if err := RestoreDB(filepath.Join(tmpDir, "does-not-exist.db")); err == nil {
		t.Fatal("expected error for missing source")
	}
	if db == nil {
		t.Fatal("db became nil after failed restore")
	}
	// Original data must still be reachable.
	users, err := GetTeamUsers()
	if err != nil {
		t.Fatalf("list after failed restore: %v", err)
	}
	if len(users) == 0 {
		t.Error("original data lost after failed restore")
	}
	// Extra sanity: direct ping on global db handle.
	var one int
	if err := db.QueryRow("SELECT 1").Scan(&one); err != nil {
		t.Errorf("db unusable: %v", err)
	}
	_ = sql.ErrNoRows
}
