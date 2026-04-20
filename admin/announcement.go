package main

import (
	"fmt"

	"github.com/nang-v-bangcong/bang-cong-tu-dong/admin/internal/githubapi"
)

// Announcement mirrors remote announcement.json shape.
type Announcement struct {
	Enabled bool   `json:"enabled"`
	Text    string `json:"text"`
	Color   string `json:"color"`
}

// GetAnnouncement fetches current announcement.json.
func (a *App) GetAnnouncement() (Announcement, error) {
	var ann Announcement
	cl, err := a.ghClient()
	if err != nil {
		return ann, err
	}
	if _, err := githubapi.GetJSONFile(a.ctx, cl, "announcement.json", &ann); err != nil {
		return ann, a.handleUnauthorized(err)
	}
	return ann, nil
}

// SaveAnnouncement validates & PUTs announcement.json with retry on 409.
func (a *App) SaveAnnouncement(ann Announcement) error {
	if len(ann.Text) > 100 {
		return fmt.Errorf("text quá 100 ký tự")
	}
	switch ann.Color {
	case "red", "green", "black":
	default:
		return fmt.Errorf("color phải là red/green/black")
	}
	cl, err := a.ghClient()
	if err != nil {
		return err
	}
	if err := githubapi.UpdateJSONFile(a.ctx, cl, "announcement.json", ann, "chore: update announcement"); err != nil {
		return a.handleUnauthorized(err)
	}
	return nil
}
