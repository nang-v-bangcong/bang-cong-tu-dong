package services

import (
	"bang-cong/internal/models"
	"fmt"
	"strconv"
	"time"
)

func daysInMonth(yearMonth string) (int, error) {
	t, err := time.Parse("2006-01", yearMonth)
	if err != nil {
		return 0, fmt.Errorf("invalid yearMonth: %s", yearMonth)
	}
	first := time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC)
	last := first.AddDate(0, 1, -1)
	return last.Day(), nil
}

func GetTeamMonthMatrix(yearMonth string) (models.TeamMatrix, error) {
	var result models.TeamMatrix
	if err := ValidateYearMonth(yearMonth); err != nil {
		return result, err
	}
	dim, err := daysInMonth(yearMonth)
	if err != nil {
		return result, err
	}
	result.YearMonth = yearMonth
	result.DaysInMonth = dim
	result.DayNotes = map[int]string{}
	result.DayTotals = map[int]float64{}

	userRows, err := db.Query(`SELECT id, name FROM users WHERE is_self = 0 ORDER BY name COLLATE NOCASE`)
	if err != nil {
		return result, err
	}
	defer userRows.Close()

	type userInfo struct {
		ID   int64
		Name string
	}
	var users []userInfo
	for userRows.Next() {
		var u userInfo
		if err := userRows.Scan(&u.ID, &u.Name); err != nil {
			return result, err
		}
		users = append(users, u)
	}
	if err := userRows.Err(); err != nil {
		return result, err
	}

	rowsMap := map[int64]*models.MatrixRow{}
	result.Rows = make([]models.MatrixRow, 0, len(users))
	for _, u := range users {
		result.Rows = append(result.Rows, models.MatrixRow{
			UserID:   u.ID,
			UserName: u.Name,
			Cells:    map[int]models.MatrixCell{},
		})
		rowsMap[u.ID] = &result.Rows[len(result.Rows)-1]
	}

	attRows, err := db.Query(`
		SELECT a.id, a.user_id, a.date, a.coefficient, a.worksite_id, a.note,
			COALESCE(w.name, ''), COALESCE(w.daily_wage, 0), COALESCE(u.daily_wage, 0)
		FROM attendance a
		LEFT JOIN worksites w ON a.worksite_id = w.id
		JOIN users u ON a.user_id = u.id
		WHERE a.date LIKE ? AND u.is_self = 0
	`, yearMonth+"%")
	if err != nil {
		return result, err
	}
	defer attRows.Close()

	for attRows.Next() {
		var (
			id            int64
			uid           int64
			date          string
			coef          float64
			wsID          *int64
			note          string
			wsName        string
			wsDailyWage   int64
			userDailyWage int64
		)
		if err := attRows.Scan(&id, &uid, &date, &coef, &wsID, &note, &wsName, &wsDailyWage, &userDailyWage); err != nil {
			return result, err
		}
		row, ok := rowsMap[uid]
		if !ok {
			continue
		}
		if len(date) < 10 {
			continue
		}
		day, err := strconv.Atoi(date[8:10])
		if err != nil {
			continue
		}
		row.Cells[day] = models.MatrixCell{
			AttendanceID: id,
			Coefficient:  coef,
			WorksiteID:   wsID,
			WorksiteName: wsName,
			Note:         note,
		}
		row.TotalCoef += coef
		if coef > 0 {
			row.TotalDays++
		}
		effective := wsDailyWage
		if effective == 0 {
			effective = userDailyWage
		}
		row.Salary += coef * float64(effective)
		result.DayTotals[day] += coef
	}
	if err := attRows.Err(); err != nil {
		return result, err
	}

	notes, err := GetDayNotes(yearMonth)
	if err != nil {
		return result, err
	}
	for _, n := range notes {
		result.DayNotes[n.Day] = n.Note
	}

	return result, nil
}
