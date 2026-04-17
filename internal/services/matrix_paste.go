package services

import (
	"fmt"
)

// CellUpsert is one atomic upsert payload: full replacement of coef + worksite + note.
type CellUpsert struct {
	UserID      int64   `json:"userId"`
	Date        string  `json:"date"`
	Coefficient float64 `json:"coefficient"`
	WorksiteID  *int64  `json:"worksiteId"`
	Note        string  `json:"note"`
}

// BulkUpsertCells commits a heterogeneous list of per-cell upserts in one transaction.
// Unlike BulkUpsertCell (single coef for all cells), this supports varying coef per cell —
// used for paste operations where each source cell has its own coefficient.
func BulkUpsertCells(items []CellUpsert) error {
	if len(items) == 0 {
		return nil
	}
	for _, it := range items {
		if err := ValidateDate(it.Date); err != nil {
			return err
		}
		if it.Coefficient <= 0 || it.Coefficient > 3.0 {
			return fmt.Errorf("hệ số ngoài khoảng: %.1f", it.Coefficient)
		}
	}

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`
		INSERT INTO attendance (user_id, date, coefficient, worksite_id, note)
		VALUES (?, ?, ?, ?, ?)
		ON CONFLICT(user_id, date) DO UPDATE SET
			coefficient = excluded.coefficient,
			worksite_id = excluded.worksite_id,
			note = excluded.note
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, it := range items {
		if _, err := stmt.Exec(it.UserID, it.Date, it.Coefficient, it.WorksiteID, it.Note); err != nil {
			return err
		}
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	WriteAudit("bulk_upsert", "attendance", int64(len(items)), fmt.Sprintf("Dán %d ô", len(items)))
	return nil
}
