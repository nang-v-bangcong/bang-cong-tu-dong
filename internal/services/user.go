package services

import (
	"bang-cong/internal/models"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

// GetUserDailyWage returns the user's configured base wage; 0 if not set.
// Used as the fallback when a worksite has no override wage.
func GetUserDailyWage(id int64) (int64, error) {
	var w int64
	err := db.QueryRow(`SELECT COALESCE(daily_wage, 0) FROM users WHERE id = ?`, id).Scan(&w)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, nil
	}
	return w, err
}

func GetSelfUser() (models.User, error) {
	var u models.User
	err := db.QueryRow(
		`SELECT id, name, daily_wage, is_self, created_at FROM users WHERE is_self = 1`,
	).Scan(&u.ID, &u.Name, &u.DailyWage, &u.IsSelf, &u.CreatedAt)
	return u, err
}

func EnsureSelfUser(name string, dailyWage int64) (models.User, error) {
	u, err := GetSelfUser()
	if err == nil {
		return u, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return models.User{}, err
	}
	if dailyWage < 0 {
		return models.User{}, fmt.Errorf("lương không được âm")
	}
	res, err := db.Exec(
		`INSERT INTO users (name, daily_wage, is_self) VALUES (?, ?, 1)`,
		name, dailyWage,
	)
	if err != nil {
		return models.User{}, err
	}
	id, _ := res.LastInsertId()
	WriteAudit("create", "user", id, fmt.Sprintf("Thiết lập người dùng: %s (%d₩/ngày)", name, dailyWage))
	return models.User{ID: id, Name: name, DailyWage: dailyWage, IsSelf: true}, nil
}

func UpdateUser(id int64, name string, dailyWage int64) error {
	n := strings.TrimSpace(name)
	if n == "" {
		return fmt.Errorf("tên không hợp lệ")
	}
	if dailyWage < 0 {
		return fmt.Errorf("lương không được âm")
	}
	if err := checkNameUnique(n, id); err != nil {
		return err
	}
	_, err := db.Exec(`UPDATE users SET name = ?, daily_wage = ? WHERE id = ?`, n, dailyWage, id)
	if err == nil {
		WriteAudit("update", "user", id, fmt.Sprintf("Cập nhật người #%d: %s (%d₩/ngày)", id, n, dailyWage))
	}
	return err
}

// checkNameUnique returns an error if another user already has this name.
// Comparison is case-insensitive: "Nam" and "nam" are treated as the same person.
// excludeID=0 skips no one (use for create); otherwise exclude that ID (use for update).
func checkNameUnique(name string, excludeID int64) error {
	var id int64
	var existing string
	err := db.QueryRow(
		`SELECT id, name FROM users WHERE name = ? COLLATE NOCASE LIMIT 1`, name,
	).Scan(&id, &existing)
	if errors.Is(err, sql.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	if id == excludeID {
		return nil
	}
	// Show the existing spelling so the user can add a suffix (e.g. "Nam A")
	// instead of guessing what they typed before.
	return fmt.Errorf("tên đã tồn tại: %q — vui lòng thêm họ hoặc số để phân biệt", existing)
}

func GetTeamUsers() ([]models.User, error) {
	rows, err := db.Query(
		`SELECT id, name, daily_wage, is_self, created_at FROM users WHERE is_self = 0 ORDER BY name COLLATE NOCASE`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Name, &u.DailyWage, &u.IsSelf, &u.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func CreateTeamUser(name string, dailyWage int64) (models.User, error) {
	n := strings.TrimSpace(name)
	if n == "" {
		return models.User{}, fmt.Errorf("tên không hợp lệ")
	}
	if dailyWage < 0 {
		return models.User{}, fmt.Errorf("lương không được âm")
	}
	if err := checkNameUnique(n, 0); err != nil {
		return models.User{}, err
	}
	res, err := db.Exec(`INSERT INTO users (name, daily_wage, is_self) VALUES (?, ?, 0)`, n, dailyWage)
	if err != nil {
		return models.User{}, err
	}
	id, _ := res.LastInsertId()
	WriteAudit("create", "user", id, fmt.Sprintf("Thêm người: %s (%d₩/ngày)", n, dailyWage))
	return models.User{ID: id, Name: n, DailyWage: dailyWage}, nil
}

func DeleteTeamUser(id int64) error {
	_, err := db.Exec(`DELETE FROM users WHERE id = ? AND is_self = 0`, id)
	if err == nil {
		WriteAudit("delete", "user", id, fmt.Sprintf("Xóa người #%d", id))
	}
	return err
}
