package main

import (
	"os"
	"path/filepath"
	"testing"
)

// seedProjectFixture lays out a directory that looks like the real project:
//
//	root/
//	├── wails.json
//	├── frontend/package.json
//	└── admin/
//	    └── build/bin/    (where admin exe would sit)
func seedProjectFixture(t *testing.T) (root, adminBin string) {
	t.Helper()
	root = t.TempDir()
	if err := os.WriteFile(filepath.Join(root, "wails.json"), []byte("{}"), 0644); err != nil {
		t.Fatal(err)
	}
	feDir := filepath.Join(root, "frontend")
	if err := os.MkdirAll(feDir, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(feDir, "package.json"), []byte("{}"), 0644); err != nil {
		t.Fatal(err)
	}
	adminBin = filepath.Join(root, "admin", "build", "bin")
	if err := os.MkdirAll(adminBin, 0755); err != nil {
		t.Fatal(err)
	}
	return root, adminBin
}

func TestLooksLikeProjectRoot_DetectsRealFixture(t *testing.T) {
	root, _ := seedProjectFixture(t)
	if !looksLikeProjectRoot(root) {
		t.Fatal("root not detected")
	}
}

func TestLooksLikeProjectRoot_RejectsAdminDir(t *testing.T) {
	root, _ := seedProjectFixture(t)
	// Make admin/ look the same (has frontend + wails.json) to confirm the
	// base-name skip kicks in.
	adminDir := filepath.Join(root, "admin")
	if err := os.WriteFile(filepath.Join(adminDir, "wails.json"), []byte("{}"), 0644); err != nil {
		t.Fatal(err)
	}
	adminFE := filepath.Join(adminDir, "frontend")
	if err := os.MkdirAll(adminFE, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(adminFE, "package.json"), []byte("{}"), 0644); err != nil {
		t.Fatal(err)
	}
	if looksLikeProjectRoot(adminDir) {
		t.Fatal("should reject dir named 'admin' even if it looks otherwise")
	}
}

func TestWalkUp_FindsRootFromAdminBin(t *testing.T) {
	root, adminBin := seedProjectFixture(t)
	// Resolve symlinks (TempDir on Windows may include \\?\ prefixes differ).
	wantAbs, _ := filepath.Abs(root)
	got := walkUp(adminBin)
	gotAbs, _ := filepath.Abs(got)
	if gotAbs != wantAbs {
		t.Fatalf("got %q want %q", gotAbs, wantAbs)
	}
}

func TestWalkUp_ReturnsEmptyWhenNoMatch(t *testing.T) {
	lone := t.TempDir()
	if got := walkUp(lone); got != "" {
		t.Fatalf("expected empty; got %q", got)
	}
}

func TestPercent_Clamps(t *testing.T) {
	cases := []struct {
		read, total int64
		want        int
	}{
		{0, 100, 0},
		{50, 100, 50},
		{100, 100, 100},
		{200, 100, 100}, // clamp
		{10, 0, 0},      // guard zero total
	}
	for _, c := range cases {
		if got := percent(c.read, c.total); got != c.want {
			t.Errorf("percent(%d,%d)=%d want %d", c.read, c.total, got, c.want)
		}
	}
}
