package services

import (
	"database/sql"
	"fmt"
	"regexp"
)

// safeIdent matches SQL identifiers we generate internally (tables/columns).
// Defensive filter: these values are hardcoded today, but this guards against
// accidental unsafe call sites added later.
var safeIdent = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)

func runMigrations(db *sql.DB) error {
	schema := `
	CREATE TABLE IF NOT EXISTS worksites (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL UNIQUE,
		created_at TEXT DEFAULT (datetime('now'))
	);

	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		daily_wage INTEGER NOT NULL DEFAULT 0,
		is_self INTEGER DEFAULT 0,
		created_at TEXT DEFAULT (datetime('now'))
	);

	CREATE TABLE IF NOT EXISTS attendance (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		date TEXT NOT NULL,
		coefficient REAL NOT NULL DEFAULT 1.0,
		worksite_id INTEGER,
		note TEXT DEFAULT '',
		created_at TEXT DEFAULT (datetime('now')),
		FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY(worksite_id) REFERENCES worksites(id),
		UNIQUE(user_id, date)
	);

	CREATE TABLE IF NOT EXISTS advances (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		date TEXT NOT NULL,
		amount INTEGER NOT NULL,
		note TEXT DEFAULT '',
		created_at TEXT DEFAULT (datetime('now')),
		FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS audit_log (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		action TEXT NOT NULL,
		target TEXT NOT NULL,
		target_id INTEGER NOT NULL DEFAULT 0,
		details TEXT NOT NULL DEFAULT '',
		created_at TEXT DEFAULT (datetime('now'))
	);

	CREATE TABLE IF NOT EXISTS day_notes (
		year_month TEXT NOT NULL,
		day INTEGER NOT NULL,
		note TEXT DEFAULT '',
		updated_at TEXT DEFAULT (datetime('now')),
		PRIMARY KEY (year_month, day)
	);

	CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date);
	CREATE INDEX IF NOT EXISTS idx_advances_user_date ON advances(user_id, date);
	CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
	`
	if _, err := db.Exec(schema); err != nil {
		return err
	}

	// Column migrations
	addColumnIfMissing(db, "worksites", "daily_wage", "INTEGER NOT NULL DEFAULT 0")

	// Guard against name collisions for users. The old index was case-sensitive
	// (so "Nam" and "nam" could coexist) — drop it and try to create a
	// case-insensitive replacement. Only create the new index if current data
	// has no case-insensitive duplicates, so legacy DBs don't fail to migrate.
	db.Exec(`DROP INDEX IF EXISTS idx_users_name_unique`)
	var dupes int
	if err := db.QueryRow(
		`SELECT COUNT(*) FROM (SELECT 1 FROM users GROUP BY name COLLATE NOCASE HAVING COUNT(*) > 1)`,
	).Scan(&dupes); err == nil && dupes == 0 {
		db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_name_unique_nocase ON users(name COLLATE NOCASE)`)
	}

	return nil
}

func addColumnIfMissing(db *sql.DB, table, column, colDef string) {
	// SQLite does not support parameterized identifiers, so we interpolate.
	// Reject anything that isn't a plain identifier to keep this call site safe
	// even if a future caller passes non-literal values.
	if !safeIdent.MatchString(table) || !safeIdent.MatchString(column) {
		return
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM pragma_table_info(?) WHERE name=?`, table, column).Scan(&count)
	if count == 0 {
		db.Exec(fmt.Sprintf(`ALTER TABLE %s ADD COLUMN %s %s`, table, column, colDef))
	}
}
