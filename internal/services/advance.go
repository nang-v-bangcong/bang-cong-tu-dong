package services

import (
	"bang-cong/internal/models"
	"fmt"
)

func GetMonthAdvances(userID int64, yearMonth string) ([]models.Advance, error) {
	rows, err := db.Query(`
		SELECT id, user_id, date, amount, note, created_at
		FROM advances
		WHERE user_id = ? AND date LIKE ?
		ORDER BY date
	`, userID, yearMonth+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.Advance
	for rows.Next() {
		var a models.Advance
		if err := rows.Scan(&a.ID, &a.UserID, &a.Date, &a.Amount, &a.Note, &a.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, a)
	}
	return items, rows.Err()
}

func CreateAdvance(userID int64, date string, amount int64, note string) (models.Advance, error) {
	res, err := db.Exec(
		`INSERT INTO advances (user_id, date, amount, note) VALUES (?, ?, ?, ?)`,
		userID, date, amount, note,
	)
	if err != nil {
		return models.Advance{}, err
	}
	id, _ := res.LastInsertId()
	WriteAudit("create", "advance", userID, fmt.Sprintf("Tạm ứng %s: %d₩", date, amount))
	return models.Advance{ID: id, UserID: userID, Date: date, Amount: amount, Note: note}, nil
}

func UpdateAdvance(id int64, date string, amount int64, note string) error {
	_, err := db.Exec(
		`UPDATE advances SET date = ?, amount = ?, note = ? WHERE id = ?`,
		date, amount, note, id,
	)
	if err == nil {
		WriteAudit("update", "advance", id, fmt.Sprintf("Sửa tạm ứng #%d: %s %d₩", id, date, amount))
	}
	return err
}

func DeleteAdvance(id int64) error {
	_, err := db.Exec(`DELETE FROM advances WHERE id = ?`, id)
	if err == nil {
		WriteAudit("delete", "advance", id, fmt.Sprintf("Xóa tạm ứng #%d", id))
	}
	return err
}
