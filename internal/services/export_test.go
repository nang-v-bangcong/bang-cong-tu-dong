package services

import (
	"bang-cong/internal/models"
	"testing"

	"github.com/xuri/excelize/v2"
)

func TestBuildMatrixXlsx_StructureAndValues(t *testing.T) {
	cleanup := setupTestDB(t)
	defer cleanup()

	wsA := seedWorksite(t, "Công trường A", 200000)
	u1 := seedTeamUser(t, "Alice")
	u2 := seedTeamUser(t, "Bob")

	if _, err := UpsertAttendance(u1, "2026-04-01", 1.0, &wsA, ""); err != nil {
		t.Fatalf("seed u1 d1: %v", err)
	}
	if _, err := UpsertAttendance(u1, "2026-04-05", 1.5, &wsA, ""); err != nil {
		t.Fatalf("seed u1 d5: %v", err)
	}
	if _, err := UpsertAttendance(u2, "2026-04-01", 0.5, &wsA, ""); err != nil {
		t.Fatalf("seed u2 d1: %v", err)
	}
	if err := UpsertDayNote("2026-04", 1, "Mưa"); err != nil {
		t.Fatalf("day note: %v", err)
	}

	m, err := GetTeamMonthMatrix("2026-04")
	if err != nil {
		t.Fatalf("matrix: %v", err)
	}
	f, err := buildMatrixXlsx(m)
	if err != nil {
		t.Fatalf("build xlsx: %v", err)
	}
	defer f.Close()

	sheet := "Bang cong 2026-04"
	// Verify header "Tên" and day 1
	v, err := f.GetCellValue(sheet, "A1")
	if err != nil || v != "Tên" {
		t.Errorf("A1 want 'Tên', got %q err=%v", v, err)
	}
	dayCell, _ := excelize.CoordinatesToCellName(2, 1)
	v, _ = f.GetCellValue(sheet, dayCell)
	if v != "1" {
		t.Errorf("%s want '1', got %q", dayCell, v)
	}
	// Weekday row (April 1, 2026 = Wednesday = T4)
	wkCell, _ := excelize.CoordinatesToCellName(2, 2)
	v, _ = f.GetCellValue(sheet, wkCell)
	if v != "T4" {
		t.Errorf("%s want 'T4', got %q", wkCell, v)
	}
	// Day note row (row 3)
	nCell, _ := excelize.CoordinatesToCellName(2, 3)
	v, _ = f.GetCellValue(sheet, nCell)
	if v != "Mưa" {
		t.Errorf("note %s want 'Mưa', got %q", nCell, v)
	}
	// Body row 4 = Alice (alphabetical), day 1 col = B = col 2
	aliceNameCell, _ := excelize.CoordinatesToCellName(1, 4)
	v, _ = f.GetCellValue(sheet, aliceNameCell)
	if v != "Alice" {
		t.Errorf("alice name want 'Alice', got %q", v)
	}
	raw := excelize.Options{RawCellValue: true}
	aliceD1, _ := excelize.CoordinatesToCellName(2, 4)
	v, _ = f.GetCellValue(sheet, aliceD1, raw)
	if v != "1" {
		t.Errorf("alice d1 want '1', got %q", v)
	}
	aliceD5, _ := excelize.CoordinatesToCellName(6, 4)
	v, _ = f.GetCellValue(sheet, aliceD5, raw)
	if v != "1.5" {
		t.Errorf("alice d5 want '1.5', got %q", v)
	}
	// Bob row 5 d1 = 0.5
	bobD1, _ := excelize.CoordinatesToCellName(2, 5)
	v, _ = f.GetCellValue(sheet, bobD1, raw)
	if v != "0.5" {
		t.Errorf("bob d1 want '0.5', got %q", v)
	}
	// Total coef col = daysInMonth+2 = 32
	aliceTot, _ := excelize.CoordinatesToCellName(32, 4)
	v, _ = f.GetCellValue(sheet, aliceTot, raw)
	if v != "2.5" {
		t.Errorf("alice total want '2.5', got %q", v)
	}
	aliceSal, _ := excelize.CoordinatesToCellName(33, 4)
	v, _ = f.GetCellValue(sheet, aliceSal, raw)
	if v != "500000" {
		t.Errorf("alice salary want '500000', got %q", v)
	}
	// Footer row = 4 + 2 = 6
	totCell, _ := excelize.CoordinatesToCellName(1, 6)
	v, _ = f.GetCellValue(sheet, totCell, raw)
	if v != "Tổng" {
		t.Errorf("footer A6 want 'Tổng', got %q", v)
	}
	// Day 1 total = 1.0 + 0.5 = 1.5
	d1Tot, _ := excelize.CoordinatesToCellName(2, 6)
	v, _ = f.GetCellValue(sheet, d1Tot, raw)
	if v != "1.5" {
		t.Errorf("d1 total want '1.5', got %q", v)
	}
	grandCoef, _ := excelize.CoordinatesToCellName(32, 6)
	v, _ = f.GetCellValue(sheet, grandCoef, raw)
	if v != "3" {
		t.Errorf("grand coef want '3', got %q", v)
	}
	grandSal, _ := excelize.CoordinatesToCellName(33, 6)
	v, _ = f.GetCellValue(sheet, grandSal, raw)
	if v != "600000" {
		t.Errorf("grand salary want '600000', got %q", v)
	}
}

func TestBuildMatrixXlsx_EmptyMatrix(t *testing.T) {
	m := models.TeamMatrix{
		YearMonth:   "2026-02",
		DaysInMonth: 28,
		Rows:        []models.MatrixRow{},
		DayNotes:    map[int]string{},
		DayTotals:   map[int]float64{},
	}
	f, err := buildMatrixXlsx(m)
	if err != nil {
		t.Fatalf("build: %v", err)
	}
	defer f.Close()
	sheet := "Bang cong 2026-02"
	v, _ := f.GetCellValue(sheet, "A1")
	if v != "Tên" {
		t.Errorf("A1 want 'Tên', got %q", v)
	}
	// Only footer row = row 4 (no bodies)
	footer, _ := excelize.CoordinatesToCellName(1, 4)
	v, _ = f.GetCellValue(sheet, footer)
	if v != "Tổng" {
		t.Errorf("empty footer want 'Tổng' on row 4, got %q", v)
	}
}

func TestBuildMatrixXlsx_DaysInMonthDims(t *testing.T) {
	// Feb 2024 is leap year → 29 days
	m := models.TeamMatrix{
		YearMonth:   "2024-02",
		DaysInMonth: 29,
		Rows:        []models.MatrixRow{{UserID: 1, UserName: "X", Cells: map[int]models.MatrixCell{}}},
		DayNotes:    map[int]string{},
		DayTotals:   map[int]float64{},
	}
	f, err := buildMatrixXlsx(m)
	if err != nil {
		t.Fatalf("build: %v", err)
	}
	defer f.Close()
	sheet := "Bang cong 2024-02"
	// Last day column should be col 30 (B..AD = 2..30)
	last, _ := excelize.CoordinatesToCellName(30, 1)
	v, _ := f.GetCellValue(sheet, last)
	if v != "29" {
		t.Errorf("last day cell %s want '29', got %q", last, v)
	}
	// "Công" header next col
	tot, _ := excelize.CoordinatesToCellName(31, 1)
	v, _ = f.GetCellValue(sheet, tot)
	if v != "Công" {
		t.Errorf("total header want 'Công', got %q", v)
	}
}
