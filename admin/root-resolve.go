package main

import (
	"os"
	"path/filepath"
)

// resolveMainAppRoot walks up from exe/cwd to find the project root
// (dir containing "build/bin" OR "frontend/package.json" AND "go.mod").
// Dev mode (wails dev admin/): cwd = admin/ → root = admin/..
// Built mode: exe = admin/build/bin/BangCong_Admin.exe → root = admin/../..
// Returns absolute path or empty on failure.
func resolveMainAppRoot() string {
	starts := candidateStarts()
	for _, start := range starts {
		if root := walkUp(start); root != "" {
			abs, err := filepath.Abs(root)
			if err == nil {
				return abs
			}
		}
	}
	return ""
}

func candidateStarts() []string {
	out := []string{}
	if exe, err := os.Executable(); err == nil {
		out = append(out, filepath.Dir(exe))
	}
	if cwd, err := os.Getwd(); err == nil {
		out = append(out, cwd)
	}
	return out
}

// walkUp ascends up to 6 levels looking for a dir that (a) is the main app
// root — has both frontend/ and build/ subdirs AND is NOT the admin/ dir.
func walkUp(start string) string {
	cur := start
	for i := 0; i < 6; i++ {
		if looksLikeProjectRoot(cur) {
			return cur
		}
		parent := filepath.Dir(cur)
		if parent == cur {
			return ""
		}
		cur = parent
	}
	return ""
}

func looksLikeProjectRoot(p string) bool {
	if filepath.Base(p) == "admin" {
		return false
	}
	if _, err := os.Stat(filepath.Join(p, "frontend", "package.json")); err != nil {
		return false
	}
	if _, err := os.Stat(filepath.Join(p, "wails.json")); err != nil {
		return false
	}
	return true
}
