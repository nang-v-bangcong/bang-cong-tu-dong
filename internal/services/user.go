package services

import (
	"bang-cong/internal/models"
	"database/sql"
	"errors"
	"fmt"
)

func GetSelfUser() (models.User, error) {
	var u models.User
	err := db.QueryRow(
		`SELECT id, name, daily_wage, is_self, created_at FROM users WHERE is_self = 1`,
	).Scan(&u.ID, &u.Name, &u.DailyWage, &u.IsSelf, &u.CreatedAt)
	return u, err
}

func EnsureSelfUser(name string) (models.User, error) {
	u, err := GetSelfUser()
	if err == nil {
		return u, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return models.User{}, err
	}
	res, err := db.Exec(
		`INSERT INTO users (name, is_self) VALUES (?, 1)`,
		name,
	)
	if err != nil {
		return models.User{}, err
	}
	id, _ := res.LastInsertId()
	WriteAudit("create", "user", id, fmt.Sprintf("Thiết lập người dùng: %s", name))
	return models.User{ID: id, Name: name, IsSelf: true}, nil
}

func UpdateUser(id int64, name string) error {
	_, err := db.Exec(
		`UPDATE users SET name = ? WHERE id = ?`,
		name, id,
	)
	if err == nil {
		WriteAudit("update", "user", id, fmt.Sprintf("Đổi tên: %s", name))
	}
	return err
}

func GetTeamUsers() ([]models.User, error) {
	rows, err := db.Query(
		`SELECT id, name, daily_wage, is_self, created_at FROM users WHERE is_self = 0 ORDER BY name`,
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

func CreateTeamUser(name string) (models.User, error) {
	res, err := db.Exec(
		`INSERT INTO users (name, is_self) VALUES (?, 0)`,
		name,
	)
	if err != nil {
		return models.User{}, err
	}
	id, _ := res.LastInsertId()
	WriteAudit("create", "user", id, fmt.Sprintf("Thêm người: %s", name))
	return models.User{ID: id, Name: name}, nil
}

func DeleteTeamUser(id int64) error {
	_, err := db.Exec(`DELETE FROM users WHERE id = ? AND is_self = 0`, id)
	if err == nil {
		WriteAudit("delete", "user", id, fmt.Sprintf("Xóa người #%d", id))
	}
	return err
}
