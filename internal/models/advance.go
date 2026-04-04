package models

type Advance struct {
	ID        int64  `json:"id"`
	UserID    int64  `json:"userId"`
	Date      string `json:"date"` // YYYY-MM-DD
	Amount    int64  `json:"amount"`
	Note      string `json:"note"`
	CreatedAt string `json:"createdAt"`
}
