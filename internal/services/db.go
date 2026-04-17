package services

import (
	"database/sql"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

var db *sql.DB

func InitDB() (*sql.DB, error) {
	dataDir, err := getDataDir()
	if err != nil {
		return nil, err
	}
	dbPath := filepath.Join(dataDir, "bang-cong.db")

	db, err = sql.Open("sqlite", "file:"+dbPath+"?_pragma=journal_mode(wal)&_pragma=foreign_keys(1)")
	if err != nil {
		return nil, err
	}

	if err := runMigrations(db); err != nil {
		return nil, err
	}

	return db, nil
}

func CloseDB() {
	if db != nil {
		db.Close()
	}
}

func GetDBPath() (string, error) {
	dataDir, err := getDataDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dataDir, "bang-cong.db"), nil
}

func BackupDB(destPath string) error {
	srcPath, err := GetDBPath()
	if err != nil {
		return err
	}
	if _, err := db.Exec("PRAGMA wal_checkpoint(TRUNCATE)"); err != nil {
		return err
	}
	src, err := os.ReadFile(srcPath)
	if err != nil {
		return err
	}
	return os.WriteFile(destPath, src, 0644)
}

// RestoreDB replaces the active DB with the file at srcPath.
// The staged file is validated (open + ping) before the rename, so a corrupt
// backup never clobbers the live DB. On any post-rename failure the global db
// is still reopened against the new file to avoid nil-pointer panics.
func RestoreDB(srcPath string) error {
	destPath, err := GetDBPath()
	if err != nil {
		return err
	}
	data, err := os.ReadFile(srcPath)
	if err != nil {
		return err
	}
	tmpPath := destPath + ".restore.tmp"
	if err := os.WriteFile(tmpPath, data, 0644); err != nil {
		return err
	}
	defer os.Remove(tmpPath) // no-op once renamed

	// Validate the staged file opens as a SQLite DB before we touch the live one.
	tmpConnStr := "file:" + tmpPath + "?_pragma=foreign_keys(1)"
	testDB, err := sql.Open("sqlite", tmpConnStr)
	if err != nil {
		return err
	}
	if err := testDB.Ping(); err != nil {
		_ = testDB.Close()
		return err
	}
	_ = testDB.Close()

	connStr := "file:" + destPath + "?_pragma=journal_mode(wal)&_pragma=foreign_keys(1)"

	if db != nil {
		_ = db.Close()
	}
	renameErr := os.Rename(tmpPath, destPath)
	// Always try to reopen db — either the new file (on success) or the original (on rename failure).
	reopened, openErr := sql.Open("sqlite", connStr)
	if openErr == nil {
		if pingErr := reopened.Ping(); pingErr == nil {
			db = reopened
		} else {
			_ = reopened.Close()
		}
	}
	if renameErr != nil {
		return renameErr
	}
	return nil
}

// getDataDir returns the writable data directory. Portable by default: the
// folder containing the running executable, so copying the exe folder carries
// the DB with it. Tests and power users can override via BANG_CONG_DATA_DIR.
// The directory is created if it does not exist.
func getDataDir() (string, error) {
	if override := os.Getenv("BANG_CONG_DATA_DIR"); override != "" {
		if err := os.MkdirAll(override, 0755); err != nil {
			return "", err
		}
		return override, nil
	}
	exe, err := os.Executable()
	if err != nil {
		return "", err
	}
	dir := filepath.Dir(exe)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}
	return dir, nil
}
