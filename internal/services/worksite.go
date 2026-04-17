package services

import (
	"bang-cong/internal/models"
	"fmt"
	"strings"
)

const worksiteNameMaxLen = 100

func validateWorksiteInput(name string, dailyWage int64) (string, error) {
	n := strings.TrimSpace(name)
	if n == "" {
		return "", fmt.Errorf("tên nơi làm việc không hợp lệ")
	}
	if len([]rune(n)) > worksiteNameMaxLen {
		return "", fmt.Errorf("tên nơi làm việc quá dài")
	}
	if dailyWage < 0 {
		return "", fmt.Errorf("lương ngày không được âm")
	}
	return n, nil
}

func GetWorksites() ([]models.Worksite, error) {
	rows, err := db.Query(`SELECT id, name, daily_wage, created_at FROM worksites ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.Worksite
	for rows.Next() {
		var w models.Worksite
		if err := rows.Scan(&w.ID, &w.Name, &w.DailyWage, &w.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, w)
	}
	return items, rows.Err()
}

func CreateWorksite(name string, dailyWage int64) (models.Worksite, error) {
	n, err := validateWorksiteInput(name, dailyWage)
	if err != nil {
		return models.Worksite{}, err
	}
	res, err := db.Exec(`INSERT INTO worksites (name, daily_wage) VALUES (?, ?)`, n, dailyWage)
	if err != nil {
		return models.Worksite{}, err
	}
	id, _ := res.LastInsertId()
	WriteAudit("create", "worksite", id, fmt.Sprintf("Tạo nơi làm việc: %s (%d₩)", n, dailyWage))
	return models.Worksite{ID: id, Name: n, DailyWage: dailyWage}, nil
}

func UpdateWorksite(id int64, name string, dailyWage int64) error {
	n, err := validateWorksiteInput(name, dailyWage)
	if err != nil {
		return err
	}
	_, err = db.Exec(`UPDATE worksites SET name = ?, daily_wage = ? WHERE id = ?`, n, dailyWage, id)
	if err == nil {
		WriteAudit("update", "worksite", id, fmt.Sprintf("Sửa nơi làm việc #%d: %s (%d₩)", id, n, dailyWage))
	}
	return err
}

func DeleteWorksite(id int64) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var inUse int
	if err := tx.QueryRow(`SELECT COUNT(*) FROM attendance WHERE worksite_id = ?`, id).Scan(&inUse); err != nil {
		return err
	}
	if inUse > 0 {
		return fmt.Errorf("đang dùng ở %d ô chấm công, cần đổi công trường trước khi xóa", inUse)
	}
	if _, err := tx.Exec(`DELETE FROM worksites WHERE id = ?`, id); err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	WriteAudit("delete", "worksite", id, fmt.Sprintf("Xóa nơi làm việc #%d", id))
	return nil
}
