package services

import (
	"testing"
	"time"
)

func TestTodayKST_Format(t *testing.T) {
	got := TodayKST()
	if _, err := time.Parse("2006-01-02", got); err != nil {
		t.Errorf("TodayKST() = %q, not YYYY-MM-DD: %v", got, err)
	}
}

func TestTodayKST_MatchesSeoulClock(t *testing.T) {
	// Whatever the OS timezone is, TodayKST must agree with UTC+9 wall clock.
	want := time.Now().UTC().Add(9 * time.Hour).Format("2006-01-02")
	if got := TodayKST(); got != want {
		t.Errorf("TodayKST() = %q, want %q (UTC+9)", got, want)
	}
}
