package models

type DayNote struct {
	YearMonth string `json:"yearMonth"`
	Day       int    `json:"day"`
	Note      string `json:"note"`
	UpdatedAt string `json:"updatedAt"`
}
