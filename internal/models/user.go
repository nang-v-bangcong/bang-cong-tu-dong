package models

type User struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	DailyWage int64  `json:"dailyWage"` // Won per day
	IsSelf    bool   `json:"isSelf"`    // true = personal tab user
	CreatedAt string `json:"createdAt"`
}

// BulkCreateResult captures outcome of a batch user creation:
// which rows were inserted and which names were skipped as duplicates.
type BulkCreateResult struct {
	Created []User   `json:"created"`
	Skipped []string `json:"skipped"`
}
