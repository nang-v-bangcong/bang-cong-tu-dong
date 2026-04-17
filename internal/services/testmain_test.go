package services

import (
	"database/sql"
	"os"
	"testing"

	_ "modernc.org/sqlite"
)

// setupTestDB opens an in-memory sqlite DB and runs migrations.
// Replaces package-level `db` so all service functions operate on the test DB.
func setupTestDB(t *testing.T) func() {
	t.Helper()
	conn, err := sql.Open("sqlite", "file::memory:?_pragma=foreign_keys(1)")
	if err != nil {
		t.Fatalf("open test db: %v", err)
	}
	conn.SetMaxOpenConns(1) // keep single connection for :memory:
	if err := runMigrations(conn); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	prev := db
	db = conn
	return func() {
		conn.Close()
		db = prev
	}
}

func TestMain(m *testing.M) {
	os.Exit(m.Run())
}
