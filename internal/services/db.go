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

func RestoreDB(srcPath string) error {
	destPath, err := GetDBPath()
	if err != nil {
		return err
	}
	data, err := os.ReadFile(srcPath)
	if err != nil {
		return err
	}
	connStr := "file:" + destPath + "?_pragma=journal_mode(wal)&_pragma=foreign_keys(1)"
	db.Close()
	if err := os.WriteFile(destPath, data, 0644); err != nil {
		db, _ = sql.Open("sqlite", connStr)
		return err
	}
	db, err = sql.Open("sqlite", connStr)
	return err
}

func getDataDir() (string, error) {
	exe, err := os.Executable()
	if err != nil {
		return "", err
	}
	return filepath.Dir(exe), nil
}
