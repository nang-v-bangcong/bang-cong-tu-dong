package main

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

// TestGetLatestExe_PicksNewest creates two .exe files with different ModTimes
// and verifies GetLatestExe picks the newer one.
func TestGetLatestExe_PicksNewest(t *testing.T) {
	root, adminBin := seedProjectFixture(t)
	buildBin := filepath.Join(root, "build", "bin")
	if err := os.MkdirAll(buildBin, 0755); err != nil {
		t.Fatal(err)
	}
	old := filepath.Join(buildBin, "BangCong-old.exe")
	newer := filepath.Join(buildBin, "BangCong.exe")

	if err := os.WriteFile(old, []byte("x"), 0644); err != nil {
		t.Fatal(err)
	}
	oldT := time.Now().Add(-1 * time.Hour)
	if err := os.Chtimes(old, oldT, oldT); err != nil {
		t.Fatal(err)
	}

	if err := os.WriteFile(newer, []byte("xy"), 0644); err != nil {
		t.Fatal(err)
	}
	newerT := time.Now()
	if err := os.Chtimes(newer, newerT, newerT); err != nil {
		t.Fatal(err)
	}

	app := &App{mainAppRoot: root}
	info, err := app.GetLatestExe()
	if err != nil {
		t.Fatalf("GetLatestExe: %v", err)
	}
	if info.Name != "BangCong.exe" {
		t.Fatalf("picked %q want BangCong.exe (newer)", info.Name)
	}
	if info.Size != 2 {
		t.Fatalf("size %d want 2", info.Size)
	}
	if info.Path != newer {
		t.Fatalf("path %q want %q", info.Path, newer)
	}
	_ = adminBin // seedProjectFixture also creates admin/build/bin; unused here.
}

func TestGetLatestExe_EmptyDir(t *testing.T) {
	root, _ := seedProjectFixture(t)
	if err := os.MkdirAll(filepath.Join(root, "build", "bin"), 0755); err != nil {
		t.Fatal(err)
	}
	app := &App{mainAppRoot: root}
	_, err := app.GetLatestExe()
	if err == nil {
		t.Fatal("expected error for empty build/bin")
	}
}

func TestGetLatestExe_NoRoot(t *testing.T) {
	app := &App{}
	_, err := app.GetLatestExe()
	if err == nil {
		t.Fatal("expected error when mainAppRoot empty")
	}
}
