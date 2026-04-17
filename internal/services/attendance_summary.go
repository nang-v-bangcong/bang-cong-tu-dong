package services

import (
	"bang-cong/internal/models"
)

func GetMonthSummary(userID int64, yearMonth string) (models.MonthSummary, error) {
	var s models.MonthSummary
	if err := ValidateYearMonth(yearMonth); err != nil {
		return s, err
	}

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
	if err := ValidateYearMonth(yearMonth); err != nil {
		return nil, err
	}
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

// GetTeamMonthSummaries returns per-user summary for every non-self user in one round-trip.
// Replaces the N+1 pattern of calling GetMonthSummary per user.
func GetTeamMonthSummaries(yearMonth string) ([]models.UserMonthSummary, error) {
	if err := ValidateYearMonth(yearMonth); err != nil {
		return nil, err
	}
	prefix := yearMonth + "%"

	rows, err := db.Query(`
		SELECT
			u.id, u.name,
			COALESCE(COUNT(a.id), 0),
			COALESCE(SUM(a.coefficient), 0),
			COALESCE(SUM(CASE WHEN COALESCE(w.daily_wage, 0) > 0 THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN COALESCE(w.daily_wage, 0) > 0 THEN a.coefficient ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN COALESCE(w.daily_wage, 0) > 0 THEN 0 ELSE 1 END), 0),
			COALESCE(SUM(CASE WHEN COALESCE(w.daily_wage, 0) > 0 THEN 0 ELSE a.coefficient END), 0),
			COALESCE(SUM(a.coefficient * COALESCE(w.daily_wage, 0)), 0)
		FROM users u
		LEFT JOIN attendance a ON a.user_id = u.id AND a.date LIKE ?
		LEFT JOIN worksites w ON a.worksite_id = w.id
		WHERE u.is_self = 0
		GROUP BY u.id, u.name
		ORDER BY u.id
	`, prefix)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	results := make(map[int64]*models.UserMonthSummary)
	var order []int64
	for rows.Next() {
		var uid int64
		var uname string
		var s models.MonthSummary
		if err := rows.Scan(
			&uid, &uname,
			&s.TotalDays, &s.TotalCoefficient,
			&s.PaidDays, &s.PaidCoefficient,
			&s.UnpaidDays, &s.UnpaidCoefficient,
			&s.TotalSalary,
		); err != nil {
			return nil, err
		}
		results[uid] = &models.UserMonthSummary{UserID: uid, UserName: uname, Summary: s}
		order = append(order, uid)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	advRows, err := db.Query(`
		SELECT user_id, COALESCE(SUM(amount), 0)
		FROM advances
		WHERE date LIKE ?
		GROUP BY user_id
	`, prefix)
	if err != nil {
		return nil, err
	}
	defer advRows.Close()
	for advRows.Next() {
		var uid int64
		var total int64
		if err := advRows.Scan(&uid, &total); err != nil {
			return nil, err
		}
		if r, ok := results[uid]; ok {
			r.Summary.TotalAdvances = total
		}
	}
	if err := advRows.Err(); err != nil {
		return nil, err
	}

	out := make([]models.UserMonthSummary, 0, len(order))
	for _, uid := range order {
		r := results[uid]
		r.Summary.NetSalary = r.Summary.TotalSalary - float64(r.Summary.TotalAdvances)
		out = append(out, *r)
	}
	return out, nil
}
