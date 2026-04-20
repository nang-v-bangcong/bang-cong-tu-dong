package services

import (
	"bang-cong/internal/models"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

// BulkCreateUsers inserts multiple team users in a single transaction.
// Duplicate names are detected case-insensitively (so "Nam" and "nam" collide)
// and reported in the Skipped slice; the transaction still commits the rest.
// Blank/overlong names fail fast.
func BulkCreateUsers(names []string) (models.BulkCreateResult, error) {
	var result models.BulkCreateResult
	if len(names) == 0 {
		return result, fmt.Errorf("danh sách tên trống")
	}

	// Dedupe within the request itself (case-insensitively). Names that
	// collide inside the same batch are reported as skipped so the user
	// knows exactly which lines were duplicates.
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
		key := strings.ToLower(n)
		if seen[key] {
			result.Skipped = append(result.Skipped, n)
			continue
		}
		seen[key] = true
		clean = append(clean, n)
	}

	tx, err := db.Begin()
	if err != nil {
		return result, err
	}
	defer tx.Rollback()

	// Detect existing names (case-insensitive) so we can report them as
	// "skipped" without relying on RowsAffected (modernc sqlite returns 1 even
	// for INSERT OR IGNORE no-ops on some builds — safer to check upfront).
	existing := map[string]bool{}
	for _, n := range clean {
		var id int64
		err := tx.QueryRow(`SELECT id FROM users WHERE name = ? COLLATE NOCASE`, n).Scan(&id)
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
