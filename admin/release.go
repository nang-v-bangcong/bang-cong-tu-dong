package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	runtime_wails "github.com/wailsapp/wails/v2/pkg/runtime"

	"github.com/nang-v-bangcong/bang-cong-tu-dong/admin/internal/githubapi"
)

// ExeInfo describes the main-app exe candidate picked by GetLatestExe.
type ExeInfo struct {
	Path    string `json:"path"`
	Name    string `json:"name"`
	Size    int64  `json:"size"`
	ModTime string `json:"modTime"`
}

// VersionInfo is the remote version.json shape.
type VersionInfo struct {
	Version     string `json:"version"`
	DownloadURL string `json:"download_url"`
	Changelog   string `json:"changelog"`
}

// GetLatestExe scans ../build/bin (relative to resolved main-app root) and
// returns the most-recent .exe.
func (a *App) GetLatestExe() (ExeInfo, error) {
	var out ExeInfo
	if a.mainAppRoot == "" {
		return out, fmt.Errorf("không xác định được thư mục app chính")
	}
	dir := filepath.Join(a.mainAppRoot, "build", "bin")
	entries, err := os.ReadDir(dir)
	if err != nil {
		return out, fmt.Errorf("đọc %s: %w", dir, err)
	}
	var best os.FileInfo
	var bestPath string
	for _, e := range entries {
		if e.IsDir() || !strings.EqualFold(filepath.Ext(e.Name()), ".exe") {
			continue
		}
		fi, err := e.Info()
		if err != nil {
			continue
		}
		if best == nil || fi.ModTime().After(best.ModTime()) {
			best = fi
			bestPath = filepath.Join(dir, e.Name())
		}
	}
	if best == nil {
		return out, fmt.Errorf("không tìm thấy .exe trong %s", dir)
	}
	return ExeInfo{
		Path:    bestPath,
		Name:    best.Name(),
		Size:    best.Size(),
		ModTime: best.ModTime().Format(time.RFC3339),
	}, nil
}

// GetRemoteVersion returns current version.json on GitHub.
func (a *App) GetRemoteVersion() (VersionInfo, error) {
	var vi VersionInfo
	cl, err := a.ghClient()
	if err != nil {
		return vi, err
	}
	if _, err := githubapi.GetJSONFile(a.ctx, cl, "version.json", &vi); err != nil {
		return vi, a.handleUnauthorized(err)
	}
	return vi, nil
}

// PublishRelease runs the 5-step release flow with rollback.
func (a *App) PublishRelease(version, changelog string) error {
	version = strings.TrimPrefix(strings.TrimSpace(version), "v")
	if version == "" {
		return fmt.Errorf("version rỗng")
	}
	exe, err := a.GetLatestExe()
	if err != nil {
		return err
	}
	cl, err := a.ghClient()
	if err != nil {
		return err
	}
	// Upload client with no timeout, separate from cl.http (15s).
	uploadCl, err := githubapi.NewWithClient(cl.Token(), cl.Owner+"/"+cl.Repo, &http.Client{Timeout: 0})
	if err != nil {
		return err
	}

	// Pre-check: handle stale draft / conflicting published release at same tag.
	tag := "v" + version
	if existing, err := githubapi.GetReleaseByTag(a.ctx, cl, tag); err == nil && existing != nil {
		return fmt.Errorf("%s đã đăng trước đó. Hãy bump version hoặc xoá release cũ trên GitHub", tag)
	}
	if drafts, err := githubapi.ListDraftReleasesByTag(a.ctx, cl, tag); err == nil {
		for _, d := range drafts {
			a.emitStatus(fmt.Sprintf("Dọn draft cũ id=%d...", d.ID))
			_ = githubapi.DeleteRelease(a.ctx, cl, d.ID)
		}
	}

	a.emitStatus("Đang tạo release...")
	rel, err := githubapi.CreateRelease(a.ctx, cl, tag, "Bản "+version, changelog, true)
	if err != nil {
		return a.handleUnauthorized(fmt.Errorf("tạo release: %w", err))
	}

	a.emitStatus("Đang upload file...")
	const assetName = "BangCong.exe" // stable name, independent of local filename
	_, err = githubapi.UploadAsset(a.ctx, uploadCl, rel.UploadURL, exe.Path, assetName, func(read, total int64) {
		runtime_wails.EventsEmit(a.ctx, "release-upload-progress", map[string]any{
			"read":    read,
			"total":   total,
			"percent": percent(read, total),
		})
	})
	if err != nil {
		a.rollback(rel.ID)
		return fmt.Errorf("upload: %w", err)
	}

	a.emitStatus("Đang publish...")
	if err := githubapi.PublishRelease(a.ctx, cl, rel.ID); err != nil {
		a.rollback(rel.ID)
		return fmt.Errorf("publish: %w", err)
	}
	// After publish, tag is created — build real tagged URLs from owner/repo/tag.
	// UploadAsset returns a draft "untagged-XXX" URL that 404s after publish.
	publishedURL := fmt.Sprintf("https://github.com/%s/%s/releases/tag/v%s", cl.Owner, cl.Repo, version)
	downloadURL := fmt.Sprintf("https://github.com/%s/%s/releases/download/v%s/%s",
		cl.Owner, cl.Repo, version, assetName)

	a.emitStatus("Đang cập nhật version.json...")
	info := VersionInfo{Version: version, DownloadURL: downloadURL, Changelog: changelog}
	if err := githubapi.UpdateJSONFile(a.ctx, cl, "version.json", info,
		"chore: bump version "+version); err != nil {
		// Release already public — do NOT rollback; surface error to user.
		return a.handleUnauthorized(fmt.Errorf("cập nhật version.json: %w", err))
	}

	runtime_wails.EventsEmit(a.ctx, "release-done", map[string]any{"htmlUrl": publishedURL})
	return nil
}

func (a *App) rollback(id int64) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	cl, err := a.ghClient()
	if err != nil {
		return
	}
	if err := githubapi.DeleteRelease(ctx, cl, id); err != nil && !errors.Is(err, githubapi.ErrUnauthorized) {
		runtime_wails.LogWarningf(a.ctx, "rollback fail: %v", err)
	}
}

func (a *App) emitStatus(msg string) {
	runtime_wails.EventsEmit(a.ctx, "release-status", msg)
}

func percent(read, total int64) int {
	if total <= 0 {
		return 0
	}
	p := int(read * 100 / total)
	if p > 100 {
		return 100
	}
	return p
}
