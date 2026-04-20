package services

import (
	"fmt"
	"time"
)

func overwriteLabel(overwrite bool) string {
	if overwrite {
		return "ghi đè"
	}
	return "giữ ô có sẵn"
}

// FillDayForAllUsers stamps the given coef (and optional worksite) into one day
// for every team user. overwrite=false keeps existing cells untouched.
// Returns the number of cells actually created/updated.
func FillDayForAllUsers(yearMonth string, day int, coef float64, worksiteID *int64, overwrite bool) (int, error) {
	if err := ValidateYearMonth(yearMonth); err != nil {
		return 0, err
	}
	dim, err := daysInMonth(yearMonth)
	if err != nil {
		return 0, err
	}
	if day < 1 || day > dim {
		return 0, fmt.Errorf("ngày %d ngoài tháng %s", day, yearMonth)
	}
	if coef <= 0 || coef > 3.0 {
		return 0, fmt.Errorf("hệ số ngoài khoảng: %.1f", coef)
	}
	date := fmt.Sprintf("%s-%02d", yearMonth, day)

	tx, err := db.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	rows, err := tx.Query(`SELECT id FROM users WHERE is_self = 0`)
	if err != nil {
		return 0, err
	}
	var uids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return 0, err
		}
		uids = append(uids, id)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return 0, err
	}

	var query string
	if overwrite {
		query = `INSERT INTO attendance (user_id, date, coefficient, worksite_id, note) VALUES (?, ?, ?, ?, '') ON CONFLICT(user_id, date) DO UPDATE SET coefficient = excluded.coefficient, worksite_id = excluded.worksite_id`
	} else {
		query = `INSERT INTO attendance (user_id, date, coefficient, worksite_id, note) VALUES (?, ?, ?, ?, '') ON CONFLICT(user_id, date) DO NOTHING`
	}
	stmt, err := tx.Prepare(query)
	if err != nil {
		return 0, err
	}
	defer stmt.Close()

	affected := 0
	for _, uid := range uids {
		res, err := stmt.Exec(uid, date, coef, worksiteID)
		if err != nil {
			return 0, err
		}
		n, _ := res.RowsAffected()
		affected += int(n)
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	if affected > 0 {
		WriteAudit("fill_day", "attendance", int64(affected),
			fmt.Sprintf("Điền ngày %s hệ số %.1f (%s): %d ô", date, coef, overwriteLabel(overwrite), affected))
	}
	return affected, nil
}

// FillSundaysForAllUsers stamps the given coef into every Sunday of the month
// for every team user, in one transaction. overwrite=false keeps existing
// cells untouched. Returns the number of cells actually created/updated.
func FillSundaysForAllUsers(yearMonth string, coef float64, worksiteID *int64, overwrite bool) (int, error) {
	if err := ValidateYearMonth(yearMonth); err != nil {
		return 0, err
	}
	if coef <= 0 || coef > 3.0 {
		return 0, fmt.Errorf("hệ số ngoài khoảng: %.1f", coef)
	}
	dim, err := daysInMonth(yearMonth)
	if err != nil {
		return 0, err
	}
	first, err := time.Parse("2006-01", yearMonth)
	if err != nil {
		return 0, fmt.Errorf("invalid yearMonth: %s", yearMonth)
	}
	var sundays []int
	for d := 1; d <= dim; d++ {
		if time.Date(first.Year(), first.Month(), d, 0, 0, 0, 0, time.UTC).Weekday() == time.Sunday {
			sundays = append(sundays, d)
		}
	}
	if len(sundays) == 0 {
		return 0, nil
	}

	tx, err := db.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	rows, err := tx.Query(`SELECT id FROM users WHERE is_self = 0`)
	if err != nil {
		return 0, err
	}
	var uids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return 0, err
		}
		uids = append(uids, id)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return 0, err
	}

	var query string
	if overwrite {
		query = `INSERT INTO attendance (user_id, date, coefficient, worksite_id, note) VALUES (?, ?, ?, ?, '') ON CONFLICT(user_id, date) DO UPDATE SET coefficient = excluded.coefficient, worksite_id = excluded.worksite_id`
	} else {
		query = `INSERT INTO attendance (user_id, date, coefficient, worksite_id, note) VALUES (?, ?, ?, ?, '') ON CONFLICT(user_id, date) DO NOTHING`
	}
	stmt, err := tx.Prepare(query)
	if err != nil {
		return 0, err
	}
	defer stmt.Close()

	affected := 0
	for _, uid := range uids {
		for _, d := range sundays {
			date := fmt.Sprintf("%s-%02d", yearMonth, d)
			res, err := stmt.Exec(uid, date, coef, worksiteID)
			if err != nil {
				return 0, err
			}
			n, _ := res.RowsAffected()
			affected += int(n)
		}
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	if affected > 0 {
		WriteAudit("fill_sundays", "attendance", int64(affected),
			fmt.Sprintf("Điền các Chủ nhật tháng %s hệ số %.1f (%s): %d ô", yearMonth, coef, overwriteLabel(overwrite), affected))
	}
	return affected, nil
}
