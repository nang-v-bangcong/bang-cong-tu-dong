// Package githubapi is a thin HTTP client for GitHub REST v3 used by admin app.
package githubapi

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// ErrUnauthorized means token is invalid or expired (401).
var ErrUnauthorized = errors.New("unauthorized")

// ErrConflict means SHA mismatch on PUT contents (409).
var ErrConflict = errors.New("conflict")

// Client holds PAT + repo info. Safe for reuse across calls.
type Client struct {
	http  *http.Client
	token string
	Owner string
	Repo  string
}

// New parses "owner/name" and returns client with sane defaults.
func New(token, repo string) (*Client, error) {
	parts := strings.SplitN(repo, "/", 2)
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return nil, fmt.Errorf("repo sai định dạng: %s", repo)
	}
	return &Client{
		http:  &http.Client{Timeout: 30 * time.Second},
		token: token,
		Owner: parts[0],
		Repo:  parts[1],
	}, nil
}

// NewWithClient lets caller inject custom http.Client (used for stream upload with Timeout=0).
func NewWithClient(token, repo string, hc *http.Client) (*Client, error) {
	c, err := New(token, repo)
	if err != nil {
		return nil, err
	}
	c.http = hc
	return c, nil
}

// HTTPClient exposes underlying http.Client for ad-hoc requests (stream upload).
func (c *Client) HTTPClient() *http.Client { return c.http }

// Token returns the configured PAT (used when constructing raw requests).
func (c *Client) Token() string { return c.token }

// Do sends method+path (path is appended to https://api.github.com).
// body, if non-nil, is JSON-encoded. Caller closes resp.Body.
func (c *Client) Do(ctx context.Context, method, path string, body any) (*http.Response, error) {
	var reader io.Reader
	if body != nil {
		buf, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("marshal body: %w", err)
		}
		reader = bytes.NewReader(buf)
	}
	url := "https://api.github.com" + path
	req, err := http.NewRequestWithContext(ctx, method, url, reader)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	return c.http.Do(req)
}

// ClassifyStatus returns ErrUnauthorized / ErrConflict / generic err for non-2xx.
// Returns nil for 2xx codes.
func ClassifyStatus(resp *http.Response) error {
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return nil
	}
	msg, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
	switch resp.StatusCode {
	case http.StatusUnauthorized:
		return ErrUnauthorized
	case http.StatusConflict:
		return ErrConflict
	}
	return fmt.Errorf("HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(msg)))
}
