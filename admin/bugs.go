package main

import (
	"github.com/nang-v-bangcong/bang-cong-tu-dong/admin/internal/githubapi"
)

// BugListResult mirrors frontend shape.
type BugListResult struct {
	Issues  []githubapi.Issue `json:"issues"`
	HasNext bool              `json:"hasNext"`
}

// ListBugReports returns open bug issues (paginated 30/page).
func (a *App) ListBugReports(page int) (BugListResult, error) {
	var out BugListResult
	cl, err := a.ghClient()
	if err != nil {
		return out, err
	}
	res, err := githubapi.ListBugReports(a.ctx, cl, page)
	if err != nil {
		return out, a.handleUnauthorized(err)
	}
	return BugListResult{Issues: res.Issues, HasNext: res.HasNext}, nil
}

// ResolveBugReport optionally comments, then closes the issue and adds "resolved" label.
func (a *App) ResolveBugReport(number int, note string) error {
	cl, err := a.ghClient()
	if err != nil {
		return err
	}
	if note != "" {
		if err := githubapi.CommentIssue(a.ctx, cl, number, note); err != nil {
			return a.handleUnauthorized(err)
		}
	}
	if err := githubapi.CloseIssue(a.ctx, cl, number, "resolved"); err != nil {
		return a.handleUnauthorized(err)
	}
	return nil
}
