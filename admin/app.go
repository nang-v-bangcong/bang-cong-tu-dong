package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/nang-v-bangcong/bang-cong-tu-dong/admin/internal/credentials"
	"github.com/nang-v-bangcong/bang-cong-tu-dong/admin/internal/githubapi"
)

type App struct {
	ctx         context.Context
	client      *http.Client
	mainAppRoot string
}

func NewApp() *App {
	return &App{
		client: &http.Client{Timeout: 15 * time.Second},
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.mainAppRoot = resolveMainAppRoot()
}

// GetCredentials returns stored PAT + repo; UI uses error to decide showing setup modal.
func (a *App) GetCredentials() (credentials.Credentials, error) {
	return credentials.Load()
}

// SaveCredentials validates and persists credentials.
func (a *App) SaveCredentials(c credentials.Credentials) error {
	return credentials.Save(c)
}

// DeleteCredentials wipes stored credentials.
func (a *App) DeleteCredentials() error {
	return credentials.Delete()
}

// ValidateCredentials pings GET /user + GET /repos/{repo} to confirm PAT + repo permissions.
func (a *App) ValidateCredentials(c credentials.Credentials) error {
	if err := c.Validate(); err != nil {
		return err
	}
	if err := a.ghGet(c.Token, "https://api.github.com/user"); err != nil {
		return fmt.Errorf("token sai hoặc hết hạn: %w", err)
	}
	if err := a.ghGet(c.Token, "https://api.github.com/repos/"+c.Repo); err != nil {
		return fmt.Errorf("không truy cập được repo %s: %w", c.Repo, err)
	}
	return nil
}

// ghClient builds a githubapi.Client from stored credentials.
func (a *App) ghClient() (*githubapi.Client, error) {
	c, err := credentials.Load()
	if err != nil {
		return nil, fmt.Errorf("thiếu credentials: %w", err)
	}
	return githubapi.New(c.Token, c.Repo)
}

// handleUnauthorized wipes credentials when token expired.
func (a *App) handleUnauthorized(err error) error {
	if errors.Is(err, githubapi.ErrUnauthorized) {
		_ = credentials.Delete()
	}
	return err
}

func (a *App) ghGet(token, url string) error {
	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	resp, err := a.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
	}
	return nil
}
