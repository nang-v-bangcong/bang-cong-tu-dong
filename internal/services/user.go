package services

import (
	"bang-cong/internal/models"
	"database/sql"
	"errors"
	"fmt"
	"strings"
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

// BulkCreateUsers inserts multiple team users in a single transaction.
// Duplicate names (case-sensitive, already present in users) are skipped — the tx
// keeps going and reports them in the Skipped slice. Blank/overlong names fail fast.
func BulkCreateUsers(names []string) (models.BulkCreateResult, error) {
	var result models.BulkCreateResult
	if len(names) == 0 {
		return result, fmt.Errorf("danh sách tên trống")
	}

	// Dedupe within the request itself and validate early.
	seen := map[string]bool{}
	clean := make([]string, 0, len(names))
	for _, raw := range names {
		n := strings.TrimSpace(raw)
		if n == "" {
			return result, fmt.Errorf("tên không hợp lệ")
		}
		if len([]rune(n)) > 100 {
			return result, fmt.Errorf("tên quá dài: %s", n)
		}
		if seen[n] {
			continue
		}
		seen[n] = true
		clean = append(clean, n)
	}

	tx, err := db.Begin()
	if err != nil {
		return result, err
	}
	defer tx.Rollback()

	// Detect existing names so we can report them as "skipped" without relying
	// on RowsAffected (modernc sqlite returns 1 even for INSERT OR IGNORE no-ops
	// on some builds — safer to check upfront).
	existing := map[string]bool{}
	for _, n := range clean {
		var id int64
		err := tx.QueryRow(`SELECT id FROM users WHERE name = ?`, n).Scan(&id)
		if err == nil {
			existing[n] = true
			result.Skipped = append(result.Skipped, n)
		} else if !errors.Is(err, sql.ErrNoRows) {
			return models.BulkCreateResult{}, err
		}
	}

	stmt, err := tx.Prepare(`INSERT INTO users (name, is_self) VALUES (?, 0)`)
	if err != nil {
		return models.BulkCreateResult{}, err
	}
	defer stmt.Close()

	for _, n := range clean {
		if existing[n] {
			continue
		}
		res, err := stmt.Exec(n)
		if err != nil {
			return models.BulkCreateResult{}, err
		}
		id, _ := res.LastInsertId()
		result.Created = append(result.Created, models.User{ID: id, Name: n, IsSelf: false})
	}

	if err := tx.Commit(); err != nil {
		return models.BulkCreateResult{}, err
	}
	if len(result.Created) > 0 {
		WriteAudit("bulk_create", "user", int64(len(result.Created)),
			fmt.Sprintf("Thêm %d người (%d trùng bỏ qua)", len(result.Created), len(result.Skipped)))
	}
	return result, nil
}
