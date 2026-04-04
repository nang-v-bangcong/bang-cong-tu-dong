package services

import "bang-cong/internal/models"

func WriteAudit(action, target string, targetID int64, details string) {
	db.Exec(`INSERT INTO audit_log (action, target, target_id, details) VALUES (?, ?, ?, ?)`,
		action, target, targetID, details)
}

func GetAuditLog(limit int, offset int) ([]models.AuditLog, error) {
	if limit <= 0 {
		limit = 50
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
