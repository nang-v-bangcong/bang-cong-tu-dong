package githubapi

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
)

type contentsResponse struct {
	Content  string `json:"content"`
	Encoding string `json:"encoding"`
	SHA      string `json:"sha"`
}

type putContentsBody struct {
	Message string `json:"message"`
	Content string `json:"content"`
	SHA     string `json:"sha,omitempty"`
}

// GetJSONFile fetches a JSON file via Contents API and unmarshals into out.
// Returns the file SHA for later update. out may be nil (SHA-only fetch).
func GetJSONFile(ctx context.Context, cl *Client, path string, out any) (string, error) {
	resp, err := cl.Do(ctx, http.MethodGet, contentsPath(cl, path), nil)
	if err != nil {
		return "", fmt.Errorf("GET %s: %w", path, err)
	}
	defer resp.Body.Close()
	if err := ClassifyStatus(resp); err != nil {
		return "", err
	}
	var cr contentsResponse
	if err := json.NewDecoder(resp.Body).Decode(&cr); err != nil {
		return "", fmt.Errorf("decode contents: %w", err)
	}
	if cr.Encoding != "base64" {
		return "", fmt.Errorf("unsupported encoding: %s", cr.Encoding)
	}
	raw, err := decodeBase64(cr.Content)
	if err != nil {
		return cr.SHA, fmt.Errorf("base64: %w", err)
	}
	if out != nil {
		if err := json.Unmarshal(raw, out); err != nil {
			return cr.SHA, fmt.Errorf("unmarshal JSON: %w", err)
		}
	}
	return cr.SHA, nil
}

// UpdateJSONFile writes data as pretty JSON via Contents API. Retries once on 409.
// Creates the file if missing (sha="").
func UpdateJSONFile(ctx context.Context, cl *Client, path string, data any, message string) error {
	raw, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal: %w", err)
	}
	encoded := base64.StdEncoding.EncodeToString(raw)

	var lastErr error
	for attempt := 0; attempt < 2; attempt++ {
		sha, getErr := getSHA(ctx, cl, path)
		if getErr != nil {
			return getErr
		}
		body := putContentsBody{Message: message, Content: encoded, SHA: sha}
		resp, err := cl.Do(ctx, http.MethodPut, contentsPath(cl, path), body)
		if err != nil {
			return fmt.Errorf("PUT %s: %w", path, err)
		}
		err = ClassifyStatus(resp)
		resp.Body.Close()
		if err == nil {
			return nil
		}
		if errors.Is(err, ErrConflict) {
			lastErr = err
			continue
		}
		return err
	}
	return fmt.Errorf("sau retry vẫn xung đột: %w", lastErr)
}

// getSHA returns current file SHA or "" when file does not exist.
func getSHA(ctx context.Context, cl *Client, path string) (string, error) {
	resp, err := cl.Do(ctx, http.MethodGet, contentsPath(cl, path), nil)
	if err != nil {
		return "", fmt.Errorf("GET sha %s: %w", path, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return "", nil
	}
	if err := ClassifyStatus(resp); err != nil {
		return "", err
	}
	var cr contentsResponse
	if err := json.NewDecoder(resp.Body).Decode(&cr); err != nil {
		return "", fmt.Errorf("decode sha: %w", err)
	}
	return cr.SHA, nil
}

func contentsPath(cl *Client, path string) string {
	return fmt.Sprintf("/repos/%s/%s/contents/%s", cl.Owner, cl.Repo, path)
}

// decodeBase64 trims newlines that GitHub inserts every 60 chars.
func decodeBase64(s string) ([]byte, error) {
	cleaned := strings.NewReplacer("\n", "", "\r", "").Replace(s)
	return base64.StdEncoding.DecodeString(cleaned)
}
