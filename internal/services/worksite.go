package services

import (
	"bang-cong/internal/models"
	"fmt"
)

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
	res, err := db.Exec(`INSERT INTO worksites (name, daily_wage) VALUES (?, ?)`, name, dailyWage)
	if err != nil {
		return models.Worksite{}, err
	}
	id, _ := res.LastInsertId()
	WriteAudit("create", "worksite", id, fmt.Sprintf("Tạo nơi làm việc: %s (%d₩)", name, dailyWage))
	return models.Worksite{ID: id, Name: name, DailyWage: dailyWage}, nil
}

func UpdateWorksite(id int64, name string, dailyWage int64) error {
	_, err := db.Exec(`UPDATE worksites SET name = ?, daily_wage = ? WHERE id = ?`, name, dailyWage, id)
	if err == nil {
		WriteAudit("update", "worksite", id, fmt.Sprintf("Sửa nơi làm việc #%d: %s (%d₩)", id, name, dailyWage))
	}
	return err
}

func DeleteWorksite(id int64) error {
	_, err := db.Exec(`DELETE FROM worksites WHERE id = ?`, id)
	if err == nil {
		WriteAudit("delete", "worksite", id, fmt.Sprintf("Xóa nơi làm việc #%d", id))
	}
	return err
}
