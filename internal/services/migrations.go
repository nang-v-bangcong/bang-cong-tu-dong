package services

import "database/sql"

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

	// Guard against name collisions for users: app-layer checks had a TOCTOU
	// window. Only create the UNIQUE index if the current data is already clean
	// so legacy DBs with duplicates don't fail to migrate.
	var dupes int
	if err := db.QueryRow(`SELECT COUNT(*) FROM (SELECT name FROM users GROUP BY name HAVING COUNT(*) > 1)`).Scan(&dupes); err == nil && dupes == 0 {
		db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_name_unique ON users(name)`)
	}

	return nil
}

func addColumnIfMissing(db *sql.DB, table, column, colDef string) {
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM pragma_table_info(?) WHERE name=?`, table, column).Scan(&count)
	if count == 0 {
		db.Exec(`ALTER TABLE ` + table + ` ADD COLUMN ` + column + ` ` + colDef)
	}
}
