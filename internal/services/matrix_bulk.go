package services

import (
	"bang-cong/internal/models"
	"fmt"
)

// BulkUpsertCell updates coefficient and/or worksite for many cells in one tx.
// At least one of coef/worksiteID must be provided (nil = skip that column).
func BulkUpsertCell(cells []models.CellRef, coef *float64, worksiteID *int64) error {
	if len(cells) == 0 {
		return nil
	}
	if coef == nil && worksiteID == nil {
		return fmt.Errorf("phải cung cấp hệ số hoặc công trường")
	}
	if coef != nil && (*coef <= 0 || *coef > 3.0) {
		return fmt.Errorf("hệ số ngoài khoảng: %.1f", *coef)
	}

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var (
		query   string
		details string
	)
	switch {
	case coef != nil && worksiteID != nil:
		query = `INSERT INTO attendance (user_id, date, coefficient, worksite_id, note) VALUES (?, ?, ?, ?, '') ON CONFLICT(user_id, date) DO UPDATE SET coefficient = excluded.coefficient, worksite_id = excluded.worksite_id`
		details = fmt.Sprintf("Cập nhật hệ số %.1f & công trường cho %d ô", *coef, len(cells))
	case coef != nil:
		query = `INSERT INTO attendance (user_id, date, coefficient, worksite_id, note) VALUES (?, ?, ?, NULL, '') ON CONFLICT(user_id, date) DO UPDATE SET coefficient = excluded.coefficient`
		details = fmt.Sprintf("Cập nhật hệ số %.1f cho %d ô", *coef, len(cells))
	default:
		query = `INSERT INTO attendance (user_id, date, coefficient, worksite_id, note) VALUES (?, ?, 1, ?, '') ON CONFLICT(user_id, date) DO UPDATE SET worksite_id = excluded.worksite_id`
		details = fmt.Sprintf("Gán công trường %d ô", len(cells))
	}

	stmt, err := tx.Prepare(query)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, c := range cells {
		if err := ValidateDate(c.Date); err != nil {
			return err
		}
		var args []any
		switch {
		case coef != nil && worksiteID != nil:
			args = []any{c.UserID, c.Date, *coef, worksiteID}
		case coef != nil:
			args = []any{c.UserID, c.Date, *coef}
		default:
			args = []any{c.UserID, c.Date, worksiteID}
		}
		if _, err := stmt.Exec(args...); err != nil {
			return err
		}
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	WriteAudit("bulk_update", "attendance", int64(len(cells)), details)
	return nil
}

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

// BulkDeleteAttendance removes attendance rows matching (user_id, date) pairs.
// Missing pairs are silently skipped. Returns the count actually deleted.
func BulkDeleteAttendance(cells []models.CellRef) (int, error) {
	if len(cells) == 0 {
		return 0, nil
	}
	tx, err := db.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`DELETE FROM attendance WHERE user_id = ? AND date = ?`)
	if err != nil {
		return 0, err
	}
	defer stmt.Close()

	total := 0
	for _, c := range cells {
		if err := ValidateDate(c.Date); err != nil {
			return 0, err
		}
		res, err := stmt.Exec(c.UserID, c.Date)
		if err != nil {
			return 0, err
		}
		n, _ := res.RowsAffected()
		total += int(n)
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	if total > 0 {
		WriteAudit("bulk_delete", "attendance", int64(total), fmt.Sprintf("Xóa %d ô chấm công", total))
	}
	return total, nil
}

// BulkUpsertWorksite sets worksite for many cells.
// - worksiteID != nil: upsert (create empty-shift cells with coef=1 if missing).
// - worksiteID == nil: clear worksite on existing cells only; never create rows.
func BulkUpsertWorksite(cells []models.CellRef, worksiteID *int64) error {
	if len(cells) == 0 {
		return nil
	}
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var query string
	if worksiteID != nil {
		query = `INSERT INTO attendance (user_id, date, coefficient, worksite_id, note) VALUES (?, ?, 1, ?, '') ON CONFLICT(user_id, date) DO UPDATE SET worksite_id = excluded.worksite_id`
	} else {
		query = `UPDATE attendance SET worksite_id = NULL WHERE user_id = ? AND date = ?`
	}
	stmt, err := tx.Prepare(query)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, c := range cells {
		if err := ValidateDate(c.Date); err != nil {
			return err
		}
		var execErr error
		if worksiteID != nil {
			_, execErr = stmt.Exec(c.UserID, c.Date, worksiteID)
		} else {
			_, execErr = stmt.Exec(c.UserID, c.Date)
		}
		if execErr != nil {
			return execErr
		}
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	action := "Gán công trường"
	if worksiteID == nil {
		action = "Bỏ công trường"
	}
	WriteAudit("bulk_update", "attendance", int64(len(cells)), fmt.Sprintf("%s %d ô", action, len(cells)))
	return nil
}
