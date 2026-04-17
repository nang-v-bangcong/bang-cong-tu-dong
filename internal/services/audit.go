package services

import (
	"bang-cong/internal/models"
	"log"
)

func WriteAudit(action, target string, targetID int64, details string) {
	if _, err := db.Exec(`INSERT INTO audit_log (action, target, target_id, details) VALUES (?, ?, ?, ?)`,
		action, target, targetID, details); err != nil {
		log.Printf("audit write failed (%s/%s/%d): %v", action, target, targetID, err)
	}
}

func GetAuditLog(limit int, offset int) ([]models.AuditLog, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 500 {
		limit = 500
	}
	if offset < 0 {
		offset = 0
	}
	rows, err := db.Query(`
		SELECT id, action, target, target_id, details, created_at
		FROM audit_log ORDER BY created_at DESC LIMIT ? OFFSET ?
	`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.AuditLog
	for rows.Next() {
		var a models.AuditLog
		if err := rows.Scan(&a.ID, &a.Action, &a.Target, &a.TargetID, &a.Details, &a.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, a)
	}
	return items, rows.Err()
}
