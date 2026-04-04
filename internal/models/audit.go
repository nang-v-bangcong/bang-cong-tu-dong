package models

type AuditLog struct {
	ID        int64  `json:"id"`
	Action    string `json:"action"`    // create, update, delete
	Target    string `json:"target"`    // attendance, advance, worksite, user
	TargetID  int64  `json:"targetId"`
	Details   string `json:"details"`   // human-readable description
	CreatedAt string `json:"createdAt"`
}
