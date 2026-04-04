package models

type User struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	DailyWage int64  `json:"dailyWage"` // Won per day
	IsSelf    bool   `json:"isSelf"`    // true = personal tab user
	CreatedAt string `json:"createdAt"`
}
