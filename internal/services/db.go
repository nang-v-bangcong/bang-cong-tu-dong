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
	// One-time migration: copy DB from legacy AppData location to exe-dir so
	// existing users keep their data after switching to portable storage.
	if err := migrateLegacyDB(dataDir); err != nil {
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

// migrateLegacyDB copies bang-cong.db (+ -wal/-shm sidecars) from the legacy
// AppData location into the new exe-adjacent dataDir, once, if dataDir has no
// DB yet. Safe to call when no legacy DB exists — returns nil.
func migrateLegacyDB(dataDir string) error {
	newPath := filepath.Join(dataDir, "bang-cong.db")
	if _, err := os.Stat(newPath); err == nil {
		return nil // already migrated
	}
	root, err := os.UserConfigDir()
	if err != nil {
		return nil // best effort
	}
	legacyDir := filepath.Join(root, "bang-cong")
	if legacyDir == dataDir {
		return nil
	}
	legacyDB := filepath.Join(legacyDir, "bang-cong.db")
	if _, err := os.Stat(legacyDB); err != nil {
		return nil // nothing to migrate
	}
	for _, suffix := range []string{"", "-wal", "-shm"} {
		src := legacyDB + suffix
		dst := newPath + suffix
		data, err := os.ReadFile(src)
		if err != nil {
			if suffix == "" {
				return err
			}
			continue // sidecar optional
		}
		if err := os.WriteFile(dst, data, 0644); err != nil {
			return err
		}
	}
	return nil
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
