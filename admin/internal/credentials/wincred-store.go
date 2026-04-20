// Package credentials stores GitHub PAT + repo config in Windows Credential Manager.
package credentials

import (
	"errors"
	"fmt"
	"regexp"

	"github.com/danieljoos/wincred"
)

const (
	targetToken = "BangCongAdmin/GitHubPAT"
	targetRepo  = "BangCongAdmin/Repo"
)

var repoRegex = regexp.MustCompile(`^[\w.-]+/[\w.-]+$`)

// Credentials holds GitHub PAT + repo identifier (owner/name).
type Credentials struct {
	Token string `json:"token"`
	Repo  string `json:"repo"`
}

// Validate checks that Token is non-empty and Repo matches owner/name.
func (c *Credentials) Validate() error {
	if c.Token == "" {
		return errors.New("token rỗng")
	}
	if !repoRegex.MatchString(c.Repo) {
		return fmt.Errorf("repo sai định dạng (cần owner/name): %s", c.Repo)
	}
	return nil
}

// Save persists credentials into Windows Credential Manager.
func Save(c Credentials) error {
	if err := c.Validate(); err != nil {
		return err
	}
	tokenCred := wincred.NewGenericCredential(targetToken)
	tokenCred.CredentialBlob = []byte(c.Token)
	tokenCred.Persist = wincred.PersistLocalMachine
	if err := tokenCred.Write(); err != nil {
		return fmt.Errorf("lưu token: %w", err)
	}
	repoCred := wincred.NewGenericCredential(targetRepo)
	repoCred.CredentialBlob = []byte(c.Repo)
	repoCred.Persist = wincred.PersistLocalMachine
	if err := repoCred.Write(); err != nil {
		return fmt.Errorf("lưu repo: %w", err)
	}
	return nil
}

// Load retrieves credentials; returns error if any target missing.
func Load() (Credentials, error) {
	tokenCred, err := wincred.GetGenericCredential(targetToken)
	if err != nil {
		return Credentials{}, fmt.Errorf("đọc token: %w", err)
	}
	repoCred, err := wincred.GetGenericCredential(targetRepo)
	if err != nil {
		return Credentials{}, fmt.Errorf("đọc repo: %w", err)
	}
	return Credentials{
		Token: string(tokenCred.CredentialBlob),
		Repo:  string(repoCred.CredentialBlob),
	}, nil
}

// Delete removes both credential targets; missing entries are tolerated.
func Delete() error {
	if cred, err := wincred.GetGenericCredential(targetToken); err == nil {
		if err := cred.Delete(); err != nil {
			return fmt.Errorf("xóa token: %w", err)
		}
	}
	if cred, err := wincred.GetGenericCredential(targetRepo); err == nil {
		if err := cred.Delete(); err != nil {
			return fmt.Errorf("xóa repo: %w", err)
		}
	}
	return nil
}
