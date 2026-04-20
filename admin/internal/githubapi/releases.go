package githubapi

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/nang-v-bangcong/bang-cong-tu-dong/admin/internal/progress"
)

// Release subset returned by Releases API.
type Release struct {
	ID        int64  `json:"id"`
	TagName   string `json:"tag_name"`
	Name      string `json:"name"`
	HTMLURL   string `json:"html_url"`
	UploadURL string `json:"upload_url"`
	Draft     bool   `json:"draft"`
}

type createReleaseBody struct {
	TagName string `json:"tag_name"`
	Name    string `json:"name"`
	Body    string `json:"body"`
	Draft   bool   `json:"draft"`
}

type publishBody struct {
	Draft bool `json:"draft"`
}

type uploadedAsset struct {
	BrowserDownloadURL string `json:"browser_download_url"`
	Name               string `json:"name"`
	Size               int64  `json:"size"`
}

// GetReleaseByTag GETs /releases/tags/{tag}. Returns (nil, nil) on 404.
func GetReleaseByTag(ctx context.Context, cl *Client, tag string) (*Release, error) {
	resp, err := cl.Do(ctx, http.MethodGet,
		fmt.Sprintf("/repos/%s/%s/releases/tags/%s", cl.Owner, cl.Repo, tag), nil)
	if err != nil {
		return nil, fmt.Errorf("get release by tag: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return nil, nil
	}
	if err := ClassifyStatus(resp); err != nil {
		return nil, err
	}
	var rel Release
	if err := json.NewDecoder(resp.Body).Decode(&rel); err != nil {
		return nil, fmt.Errorf("decode: %w", err)
	}
	return &rel, nil
}

// ListDraftReleasesByTag returns all draft releases whose tag_name matches.
// Drafts aren't surfaced by GET /releases/tags/{tag}; we must scan /releases.
func ListDraftReleasesByTag(ctx context.Context, cl *Client, tag string) ([]Release, error) {
	resp, err := cl.Do(ctx, http.MethodGet,
		fmt.Sprintf("/repos/%s/%s/releases?per_page=100", cl.Owner, cl.Repo), nil)
	if err != nil {
		return nil, fmt.Errorf("list releases: %w", err)
	}
	defer resp.Body.Close()
	if err := ClassifyStatus(resp); err != nil {
		return nil, err
	}
	var all []Release
	if err := json.NewDecoder(resp.Body).Decode(&all); err != nil {
		return nil, fmt.Errorf("decode: %w", err)
	}
	var out []Release
	for _, r := range all {
		if r.Draft && r.TagName == tag {
			out = append(out, r)
		}
	}
	return out, nil
}

// CreateRelease POSTs /releases and returns the parsed Release.
func CreateRelease(ctx context.Context, cl *Client, tag, name, body string, draft bool) (Release, error) {
	var rel Release
	resp, err := cl.Do(ctx, http.MethodPost,
		fmt.Sprintf("/repos/%s/%s/releases", cl.Owner, cl.Repo),
		createReleaseBody{TagName: tag, Name: name, Body: body, Draft: draft},
	)
	if err != nil {
		return rel, fmt.Errorf("create release: %w", err)
	}
	defer resp.Body.Close()
	if err := ClassifyStatus(resp); err != nil {
		return rel, err
	}
	if err := json.NewDecoder(resp.Body).Decode(&rel); err != nil {
		return rel, fmt.Errorf("decode release: %w", err)
	}
	return rel, nil
}

// UploadAsset streams filePath to uploadURL, emitting progress via cb.
// Asset is uploaded as assetName (caller-supplied) regardless of local filename.
// Returns browser_download_url. Caller's http.Client should have Timeout=0.
func UploadAsset(ctx context.Context, cl *Client, uploadURL, filePath, assetName string, cb func(read, total int64)) (string, error) {
	f, err := os.Open(filePath)
	if err != nil {
		return "", fmt.Errorf("open file: %w", err)
	}
	defer f.Close()
	st, err := f.Stat()
	if err != nil {
		return "", fmt.Errorf("stat: %w", err)
	}
	size := st.Size()

	uploadURL = buildAssetUploadURL(uploadURL, assetName)

	pr := progress.New(f, size, cb)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, uploadURL, pr)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+cl.token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	req.Header.Set("Content-Type", "application/octet-stream")
	req.ContentLength = size

	hc := cl.http
	if hc.Timeout != 0 {
		// Avoid stalling on large uploads; caller should pass timeout-0 client but guard anyway.
		clone := *hc
		clone.Timeout = 0
		hc = &clone
	}
	resp, err := hc.Do(req)
	if err != nil {
		return "", fmt.Errorf("upload: %w", err)
	}
	defer resp.Body.Close()
	if err := ClassifyStatus(resp); err != nil {
		return "", err
	}
	var asset uploadedAsset
	if err := json.NewDecoder(resp.Body).Decode(&asset); err != nil {
		return "", fmt.Errorf("decode asset: %w", err)
	}
	return asset.BrowserDownloadURL, nil
}

// PublishRelease flips draft=false.
func PublishRelease(ctx context.Context, cl *Client, id int64) error {
	resp, err := cl.Do(ctx, http.MethodPatch,
		fmt.Sprintf("/repos/%s/%s/releases/%d", cl.Owner, cl.Repo, id),
		publishBody{Draft: false},
	)
	if err != nil {
		return fmt.Errorf("publish: %w", err)
	}
	defer resp.Body.Close()
	return ClassifyStatus(resp)
}

// DeleteRelease deletes a release (used for rollback).
func DeleteRelease(ctx context.Context, cl *Client, id int64) error {
	resp, err := cl.Do(ctx, http.MethodDelete,
		fmt.Sprintf("/repos/%s/%s/releases/%d", cl.Owner, cl.Repo, id),
		nil,
	)
	if err != nil {
		return fmt.Errorf("delete: %w", err)
	}
	defer resp.Body.Close()
	// 204 or 404 (already gone) acceptable.
	if resp.StatusCode == http.StatusNoContent || resp.StatusCode == http.StatusNotFound {
		return nil
	}
	msg, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
	return fmt.Errorf("delete release HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(msg)))
}

// buildAssetUploadURL strips GitHub's upload_url template "{?name,label}"
// and appends ?name=<url.QueryEscape(name)>.
func buildAssetUploadURL(template, name string) string {
	if i := strings.Index(template, "{"); i >= 0 {
		template = template[:i]
	}
	return template + "?name=" + url.QueryEscape(name)
}
