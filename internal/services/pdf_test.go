package services

import (
	"bang-cong/internal/models"
	"os"
	"path/filepath"
	"testing"
)

// Real PDF is generated (no mocks) with Vietnamese diacritics in the visible
// fields; the test asserts the file is a valid PDF on disk. This also proves
// the embedded Noto Sans font loads — before this change, PDF export depended
// on C:\Windows\Fonts\arial.ttf being present.
func TestGeneratePDF_VietnameseContent(t *testing.T) {
	dir := t.TempDir()
	out := filepath.Join(dir, "out.pdf")

	wsID := int64(1)
	data := PDFData{
		Title:     "Bảng công tháng 04/2026",
		UserName:  "Nguyễn Văn Tuấn",
		YearMonth: "2026-04",
		Records: []models.Attendance{
			{Date: "2026-04-01", Coefficient: 1.0, WorksiteID: &wsID, Note: "Làm móng"},
			{Date: "2026-04-02", Coefficient: 1.5, WorksiteID: nil, Note: "Đổ bê tông — tăng ca"},
		},
		Summary: models.MonthSummary{
			TotalDays:        2,
			TotalCoefficient: 2.5,
			TotalSalary:      375000,
			TotalAdvances:    50000,
			NetSalary:        325000,
		},
		Worksites:     map[int64]string{1: "Công trường Gangnam — Hàn Quốc"},
		WorksiteWages: map[int64]int64{1: 150000},
		UserDailyWage: 150000,
	}

	if err := GeneratePDF(data, out); err != nil {
		t.Fatalf("GeneratePDF: %v", err)
	}

	info, err := os.Stat(out)
	if err != nil {
		t.Fatalf("stat output: %v", err)
	}
	if info.Size() == 0 {
		t.Fatal("PDF file is empty")
	}

	head, err := os.ReadFile(out)
	if err != nil {
		t.Fatalf("read output: %v", err)
	}
	if len(head) < 4 || string(head[:4]) != "%PDF" {
		t.Fatalf("output is not a PDF (magic=%q)", string(head[:min(4, len(head))]))
	}
}
