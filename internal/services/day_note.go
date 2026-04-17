package services

import (
	"bang-cong/internal/models"
	"fmt"
	"strings"
)

const dayNoteMaxLen = 500

func ValidateDay(day int) error {
	if day < 1 || day > 31 {
		return fmt.Errorf("invalid day: %d", day)
	}
	return nil
}

func GetDayNotes(yearMonth string) ([]models.DayNote, error) {
	if err := ValidateYearMonth(yearMonth); err != nil {
		return nil, err
	}
	rows, err := db.Query(`
		SELECT year_month, day, note, updated_at
		FROM day_notes
		WHERE year_month = ?
		ORDER BY day
	`, yearMonth)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []models.DayNote{}
	for rows.Next() {
		var n models.DayNote
		if err := rows.Scan(&n.YearMonth, &n.Day, &n.Note, &n.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, n)
	}
	return items, rows.Err()
}

func UpsertDayNote(yearMonth string, day int, note string) error {
	if err := ValidateYearMonth(yearMonth); err != nil {
		return err
	}
	if err := ValidateDay(day); err != nil {
		return err
	}
	trimmed := strings.TrimSpace(note)
	if len([]rune(trimmed)) > dayNoteMaxLen {
		return fmt.Errorf("note too long (>%d chars)", dayNoteMaxLen)
	}
	if trimmed == "" {
		_, err := db.Exec(`DELETE FROM day_notes WHERE year_month = ? AND day = ?`, yearMonth, day)
		if err == nil {
			WriteAudit("delete", "day_note", int64(day), fmt.Sprintf("Xoá ghi chú ngày %s-%02d", yearMonth, day))
		}
		return err
	}
	_, err := db.Exec(`
		INSERT INTO day_notes (year_month, day, note, updated_at)
		VALUES (?, ?, ?, datetime('now'))
		ON CONFLICT(year_month, day) DO UPDATE SET
			note = excluded.note,
			updated_at = excluded.updated_at
	`, yearMonth, day, trimmed)
	if err == nil {
		WriteAudit("update", "day_note", int64(day), fmt.Sprintf("Ghi chú ngày %s-%02d", yearMonth, day))
	}
	return err
}
