package models

type Worksite struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	DailyWage int64  `json:"dailyWage"`
	CreatedAt string `json:"createdAt"`
}
