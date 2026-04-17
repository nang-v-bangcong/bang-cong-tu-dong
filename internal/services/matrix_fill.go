package services

import (
	"database/sql"
	"errors"
	"fmt"
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

// CopyDayForAll copies every team user's attendance from srcDay to dstDay in the
// same month. overwrite=false only fills empty dstDay cells.
func CopyDayForAll(yearMonth string, srcDay, dstDay int, overwrite bool) (int, error) {
	if err := ValidateYearMonth(yearMonth); err != nil {
		return 0, err
	}
	dim, err := daysInMonth(yearMonth)
	if err != nil {
		return 0, err
	}
	if srcDay < 1 || srcDay > dim || dstDay < 1 || dstDay > dim {
		return 0, fmt.Errorf("ngày ngoài tháng: src=%d dst=%d", srcDay, dstDay)
	}
	if srcDay == dstDay {
		return 0, fmt.Errorf("ngày nguồn và đích trùng nhau")
	}
	srcDate := fmt.Sprintf("%s-%02d", yearMonth, srcDay)
	dstDate := fmt.Sprintf("%s-%02d", yearMonth, dstDay)

	tx, err := db.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	rows, err := tx.Query(`SELECT a.user_id, a.coefficient, a.worksite_id, a.note FROM attendance a JOIN users u ON a.user_id = u.id WHERE a.date = ? AND u.is_self = 0`, srcDate)
	if err != nil {
		return 0, err
	}
	type srcRow struct {
		uid  int64
		coef float64
		ws   *int64
		note string
	}
	var src []srcRow
	for rows.Next() {
		var r srcRow
		if err := rows.Scan(&r.uid, &r.coef, &r.ws, &r.note); err != nil {
			rows.Close()
			return 0, err
		}
		src = append(src, r)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return 0, err
	}

	var query string
	if overwrite {
		query = `INSERT INTO attendance (user_id, date, coefficient, worksite_id, note) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, date) DO UPDATE SET coefficient = excluded.coefficient, worksite_id = excluded.worksite_id, note = excluded.note`
	} else {
		query = `INSERT INTO attendance (user_id, date, coefficient, worksite_id, note) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, date) DO NOTHING`
	}
	stmt, err := tx.Prepare(query)
	if err != nil {
		return 0, err
	}
	defer stmt.Close()

	affected := 0
	for _, r := range src {
		res, err := stmt.Exec(r.uid, dstDate, r.coef, r.ws, r.note)
		if err != nil {
			return 0, err
		}
		n, _ := res.RowsAffected()
		affected += int(n)
	}

	// Copy the day-level note (if any) from src -> dst, honoring overwrite.
	var srcNote string
	err = tx.QueryRow(`SELECT note FROM day_notes WHERE year_month = ? AND day = ?`, yearMonth, srcDay).Scan(&srcNote)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return 0, err
	}
	if err == nil && srcNote != "" {
		var noteQuery string
		if overwrite {
			noteQuery = `INSERT INTO day_notes (year_month, day, note, updated_at) VALUES (?, ?, ?, datetime('now')) ON CONFLICT(year_month, day) DO UPDATE SET note = excluded.note, updated_at = excluded.updated_at`
		} else {
			noteQuery = `INSERT INTO day_notes (year_month, day, note, updated_at) VALUES (?, ?, ?, datetime('now')) ON CONFLICT(year_month, day) DO NOTHING`
		}
		if _, err := tx.Exec(noteQuery, yearMonth, dstDay, srcNote); err != nil {
			return 0, err
		}
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}
	if affected > 0 {
		WriteAudit("copy_day", "attendance", int64(affected),
			fmt.Sprintf("Sao chép %s → %s (%s): %d ô", srcDate, dstDate, overwriteLabel(overwrite), affected))
	}
	return affected, nil
}
