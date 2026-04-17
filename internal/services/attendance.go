package services

import (
	"bang-cong/internal/models"
	"fmt"
	"time"
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

// ValidateDate parses "YYYY-MM-DD" strictly: rejects impossible dates like 2024-02-30.
func ValidateDate(date string) error {
	if _, err := time.Parse("2006-01-02", date); err != nil {
		return fmt.Errorf("invalid date: %s", date)
	}
	return nil
}

// ValidateYearMonth parses "YYYY-MM" strictly: rejects month 00, 13, etc.
func ValidateYearMonth(ym string) error {
	if _, err := time.Parse("2006-01", ym); err != nil {
		return fmt.Errorf("invalid yearMonth: %s", ym)
	}
	return nil
}

// DaysInMonth returns the number of days in the given "YYYY-MM".
// Caller must ensure yearMonth already passed ValidateYearMonth.
func DaysInMonth(yearMonth string) int {
	t, err := time.Parse("2006-01", yearMonth)
	if err != nil {
		return 0
	}
	// First of next month minus one day.
	return time.Date(t.Year(), t.Month()+1, 0, 0, 0, 0, 0, time.UTC).Day()
}

func UpsertAttendance(userID int64, date string, coefficient float64, worksiteID *int64, note string) (models.Attendance, error) {
	if err := ValidateDate(date); err != nil {
		return models.Attendance{}, err
	}
	if coefficient < 0 || coefficient > 3.0 {
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

func GetMonthSummary(userID int64, yearMonth string) (models.MonthSummary, error) {
	var s models.MonthSummary

	// Paid: attendance với worksite có daily_wage > 0.
	// Unpaid: phần còn lại (không có worksite hoặc worksite daily_wage = 0).
	err := db.QueryRow(`
		SELECT
			COUNT(*),
			COALESCE(SUM(a.coefficient), 0),
			COALESCE(SUM(CASE WHEN COALESCE(w.daily_wage, 0) > 0 THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN COALESCE(w.daily_wage, 0) > 0 THEN a.coefficient ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN COALESCE(w.daily_wage, 0) > 0 THEN 0 ELSE 1 END), 0),
			COALESCE(SUM(CASE WHEN COALESCE(w.daily_wage, 0) > 0 THEN 0 ELSE a.coefficient END), 0),
			COALESCE(SUM(a.coefficient * COALESCE(w.daily_wage, 0)), 0)
		FROM attendance a
		LEFT JOIN worksites w ON a.worksite_id = w.id
		WHERE a.user_id = ? AND a.date LIKE ?
	`, userID, yearMonth+"%").Scan(
		&s.TotalDays, &s.TotalCoefficient,
		&s.PaidDays, &s.PaidCoefficient,
		&s.UnpaidDays, &s.UnpaidCoefficient,
		&s.TotalSalary,
	)
	if err != nil {
		return s, err
	}

	err = db.QueryRow(`
		SELECT COALESCE(SUM(amount), 0)
		FROM advances
		WHERE user_id = ? AND date LIKE ?
	`, userID, yearMonth+"%").Scan(&s.TotalAdvances)
	if err != nil {
		return s, err
	}
	s.NetSalary = s.TotalSalary - float64(s.TotalAdvances)
	return s, nil
}

func GetWorksiteSummary(userID int64, yearMonth string) ([]models.WorksiteSummary, error) {
	rows, err := db.Query(`
		SELECT a.worksite_id, COALESCE(w.name, 'Không xác định'),
			COALESCE(w.daily_wage, 0), SUM(a.coefficient),
			SUM(a.coefficient * COALESCE(w.daily_wage, 0))
		FROM attendance a
		LEFT JOIN worksites w ON a.worksite_id = w.id
		WHERE a.user_id = ? AND a.date LIKE ?
		GROUP BY a.worksite_id
		ORDER BY SUM(a.coefficient) DESC
	`, userID, yearMonth+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.WorksiteSummary
	for rows.Next() {
		var s models.WorksiteSummary
		if err := rows.Scan(&s.WorksiteID, &s.WorksiteName, &s.DailyWage, &s.TotalCoeff, &s.TotalSalary); err != nil {
			return nil, err
		}
		items = append(items, s)
	}
	return items, rows.Err()
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
