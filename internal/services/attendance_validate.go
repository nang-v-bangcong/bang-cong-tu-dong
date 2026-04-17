package services

import (
	"fmt"
	"time"
)

// ValidateDate parses "YYYY-MM-DD" strictly: rejects impossible dates like 2024-02-30.
func ValidateDate(date string) error {
	if _, err := time.Parse("2006-01-02", date); err != nil {
		return fmt.Errorf("invalid date: %s", date)
	}
	return nil
}

// ValidateYearMonth parses "YYYY-MM" strictly: rejects month 00, 13, etc.
func ValidateYearMonth(ym string) error {
	if _, err := time.Parse("2006-01", ym); err != nil {
		return fmt.Errorf("invalid yearMonth: %s", ym)
	}
	return nil
}

// DaysInMonth returns the number of days in the given "YYYY-MM".
// Caller must ensure yearMonth already passed ValidateYearMonth.
func DaysInMonth(yearMonth string) int {
	t, err := time.Parse("2006-01", yearMonth)
	if err != nil {
		return 0
	}
	// First of next month minus one day.
	return time.Date(t.Year(), t.Month()+1, 0, 0, 0, 0, 0, time.UTC).Day()
}
