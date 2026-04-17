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
	// One-time migration: move DB from legacy exe-dir location to AppData.
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

// migrateLegacyDB copies bang-cong.db (+ -wal/-shm sidecars) from the exe
// directory to the new dataDir, once, if dataDir has no DB yet.
// Safe to call when no legacy DB exists — returns nil.
func migrateLegacyDB(dataDir string) error {
	newPath := filepath.Join(dataDir, "bang-cong.db")
	if _, err := os.Stat(newPath); err == nil {
		return nil // already migrated
	}
	exe, err := os.Executable()
	if err != nil {
		return nil // best effort
	}
	legacyDir := filepath.Dir(exe)
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
// The global db is only swapped after the new file is safely in place and
// can be opened; on any failure the existing db remains usable.
func RestoreDB(srcPath string) error {
	destPath, err := GetDBPath()
	if err != nil {
		return err
	}
	data, err := os.ReadFile(srcPath)
	if err != nil {
		return err
	}
	// Stage the new file beside the destination, then atomic-rename.
	tmpPath := destPath + ".restore.tmp"
	if err := os.WriteFile(tmpPath, data, 0644); err != nil {
		return err
	}

	connStr := "file:" + destPath + "?_pragma=journal_mode(wal)&_pragma=foreign_keys(1)"

	// Close current handle so Windows lets us replace the file.
	if db != nil {
		_ = db.Close()
	}
	if err := os.Rename(tmpPath, destPath); err != nil {
		// Best-effort reopen of the original DB so the app keeps working.
		db, _ = sql.Open("sqlite", connStr)
		_ = os.Remove(tmpPath)
		return err
	}

	newDB, err := sql.Open("sqlite", connStr)
	if err != nil {
		db = nil
		return err
	}
	if err := newDB.Ping(); err != nil {
		_ = newDB.Close()
		db = nil
		return err
	}
	db = newDB
	return nil
}

// getDataDir returns the writable data directory:
// %AppData%\bang-cong on Windows, $XDG_CONFIG_HOME/bang-cong elsewhere.
// The directory is created if it does not exist.
func getDataDir() (string, error) {
	root, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(root, "bang-cong")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}
	return dir, nil
}
