package services

import (
	"bang-cong/internal/models"
	"fmt"
)

func GetMonthAttendance(userID int64, yearMonth string) ([]models.Attendance, error) {
	rows, err := db.Query(`
		SELECT a.id, a.user_id, a.date, a.coefficient, a.worksite_id, a.note, a.created_at,
			COALESCE(w.name, '')
		FROM attendance a
		LEFT JOIN worksites w ON a.worksite_id = w.id
		WHERE a.user_id = ? AND a.date LIKE ?
		ORDER BY a.date
	`, userID, yearMonth+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.Attendance
	for rows.Next() {
		var a models.Attendance
		if err := rows.Scan(
			&a.ID, &a.UserID, &a.Date, &a.Coefficient,
			&a.WorksiteID, &a.Note, &a.CreatedAt, &a.WorksiteName,
		); err != nil {
			return nil, err
		}
		items = append(items, a)
	}
	return items, rows.Err()
}

func UpsertAttendance(userID int64, date string, coefficient float64, worksiteID *int64, note string) (models.Attendance, error) {
	if err := ValidateDate(date); err != nil {
		return models.Attendance{}, err
	}
	if coefficient <= 0 || coefficient > 3.0 {
		return models.Attendance{}, fmt.Errorf("coefficient out of range: %.1f", coefficient)
	}
	res, err := db.Exec(`
		INSERT INTO attendance (user_id, date, coefficient, worksite_id, note)
		VALUES (?, ?, ?, ?, ?)
		ON CONFLICT(user_id, date) DO UPDATE SET
			coefficient = excluded.coefficient,
			worksite_id = excluded.worksite_id,
			note = excluded.note
	`, userID, date, coefficient, worksiteID, note)
	if err != nil {
		return models.Attendance{}, err
	}
	id, _ := res.LastInsertId()
	WriteAudit("update", "attendance", userID, fmt.Sprintf("Chấm công %s: hệ số %.1f", date, coefficient))
	return models.Attendance{
		ID: id, UserID: userID, Date: date,
		Coefficient: coefficient, WorksiteID: worksiteID, Note: note,
	}, nil
}

func DeleteAttendance(id int64) error {
	_, err := db.Exec(`DELETE FROM attendance WHERE id = ?`, id)
	if err == nil {
		WriteAudit("delete", "attendance", id, fmt.Sprintf("Xóa chấm công #%d", id))
	}
	return err
}

func CopyPreviousDay(userID int64, targetDate string) (models.Attendance, error) {
	var a models.Attendance
	err := db.QueryRow(`
		SELECT coefficient, worksite_id, note
		FROM attendance
		WHERE user_id = ? AND date < ?
		ORDER BY date DESC LIMIT 1
	`, userID, targetDate).Scan(&a.Coefficient, &a.WorksiteID, &a.Note)
	if err != nil {
		return a, fmt.Errorf("không tìm thấy ngày trước")
	}
	return UpsertAttendance(userID, targetDate, a.Coefficient, a.WorksiteID, a.Note)
}
