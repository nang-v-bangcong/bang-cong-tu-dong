package githubapi

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Label is a minimal issue label.
type Label struct {
	Name string `json:"name"`
}

// Issue is the subset we read from the Issues API.
type Issue struct {
	Number    int       `json:"number"`
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	State     string    `json:"state"`
	HTMLURL   string    `json:"html_url"`
	CreatedAt time.Time `json:"created_at"`
	Labels    []Label   `json:"labels"`
}

// ListResult is issues + pagination flag.
type ListResult struct {
	Issues  []Issue `json:"issues"`
	HasNext bool    `json:"hasNext"`
}

// ListBugReports fetches open issues with label bug-report, paginated 30/page.
func ListBugReports(ctx context.Context, cl *Client, page int) (ListResult, error) {
	if page < 1 {
		page = 1
	}
	q := url.Values{}
	q.Set("labels", "bug-report")
	q.Set("state", "open")
	q.Set("per_page", "30")
	q.Set("page", fmt.Sprintf("%d", page))
	path := fmt.Sprintf("/repos/%s/%s/issues?%s", cl.Owner, cl.Repo, q.Encode())
	resp, err := cl.Do(ctx, http.MethodGet, path, nil)
	if err != nil {
		return ListResult{}, fmt.Errorf("list issues: %w", err)
	}
	defer resp.Body.Close()
	if err := ClassifyStatus(resp); err != nil {
		return ListResult{}, err
	}
	var issues []Issue
	if err := json.NewDecoder(resp.Body).Decode(&issues); err != nil {
		return ListResult{}, fmt.Errorf("decode issues: %w", err)
	}
	hasNext := strings.Contains(resp.Header.Get("Link"), `rel="next"`)
	return ListResult{Issues: issues, HasNext: hasNext}, nil
}

// CloseIssue optionally adds a label then PATCHes state=closed.
func CloseIssue(ctx context.Context, cl *Client, number int, addLabel string) error {
	if addLabel != "" {
		if err := addIssueLabel(ctx, cl, number, addLabel); err != nil {
			return err
		}
	}
	body := map[string]any{"state": "closed"}
	resp, err := cl.Do(ctx, http.MethodPatch,
		fmt.Sprintf("/repos/%s/%s/issues/%d", cl.Owner, cl.Repo, number), body)
	if err != nil {
		return fmt.Errorf("close issue: %w", err)
	}
	defer resp.Body.Close()
	return ClassifyStatus(resp)
}

// CommentIssue posts a new comment body.
func CommentIssue(ctx context.Context, cl *Client, number int, body string) error {
	payload := map[string]any{"body": body}
	resp, err := cl.Do(ctx, http.MethodPost,
		fmt.Sprintf("/repos/%s/%s/issues/%d/comments", cl.Owner, cl.Repo, number), payload)
	if err != nil {
		return fmt.Errorf("comment issue: %w", err)
	}
	defer resp.Body.Close()
	return ClassifyStatus(resp)
}

func addIssueLabel(ctx context.Context, cl *Client, number int, label string) error {
	body := map[string]any{"labels": []string{label}}
	resp, err := cl.Do(ctx, http.MethodPost,
		fmt.Sprintf("/repos/%s/%s/issues/%d/labels", cl.Owner, cl.Repo, number), body)
	if err != nil {
		return fmt.Errorf("add label: %w", err)
	}
	defer resp.Body.Close()
	return ClassifyStatus(resp)
}
