package services

import (
	"bang-cong/internal/models"
	"context"
	"fmt"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"github.com/xuri/excelize/v2"
)

// ExportMatrixExcel loads the team matrix for a month and writes it to a .xlsx
// file chosen by the user via the native save dialog. Returns the saved path.
func ExportMatrixExcel(ctx context.Context, yearMonth string) (string, error) {
	m, err := GetTeamMonthMatrix(yearMonth)
	if err != nil {
		return "", err
	}
	f, err := buildMatrixXlsx(m)
	if err != nil {
		return "", err
	}
	defer f.Close()

	path, err := runtime.SaveFileDialog(ctx, runtime.SaveDialogOptions{
		DefaultFilename: fmt.Sprintf("bang-cong-%s.xlsx", yearMonth),
		Title:           "Lưu bảng công",
		Filters: []runtime.FileFilter{
			{DisplayName: "Excel (*.xlsx)", Pattern: "*.xlsx"},
		},
	})
	if err != nil {
		return "", err
	}
	if path == "" {
		return "", nil
	}
	if err := f.SaveAs(path); err != nil {
		return "", err
	}
	WriteAudit("export_excel", "matrix", 0, fmt.Sprintf("Xuất Excel %s → %s", yearMonth, path))
	return path, nil
}

// buildMatrixXlsx renders the TeamMatrix into an excelize file in memory.
// Pure function; no I/O. Extracted for unit testing.
func buildMatrixXlsx(m models.TeamMatrix) (*excelize.File, error) {
	f := excelize.NewFile()
	sheet := "Bang cong " + m.YearMonth
	idx, err := f.NewSheet(sheet)
	if err != nil {
		return nil, err
	}
	f.SetActiveSheet(idx)
	if err := f.DeleteSheet("Sheet1"); err != nil {
		return nil, err
	}

	hdrStyle, err := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"#E8EEF5"}, Pattern: 1},
		Border: []excelize.Border{
			{Type: "left", Color: "#CFD6DF", Style: 1},
			{Type: "right", Color: "#CFD6DF", Style: 1},
			{Type: "top", Color: "#CFD6DF", Style: 1},
			{Type: "bottom", Color: "#CFD6DF", Style: 1},
		},
	})
	if err != nil {
		return nil, err
	}
	sunStyle, err := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "#C0392B"},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"#FCEDEC"}, Pattern: 1},
		Border: []excelize.Border{
			{Type: "left", Color: "#CFD6DF", Style: 1},
			{Type: "right", Color: "#CFD6DF", Style: 1},
			{Type: "top", Color: "#CFD6DF", Style: 1},
			{Type: "bottom", Color: "#CFD6DF", Style: 1},
		},
	})
	if err != nil {
		return nil, err
	}
	numStyle, err := f.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "center"},
		NumFmt:    2, // 0.00
	})
	if err != nil {
		return nil, err
	}
	moneyStyle, err := f.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "right"},
		NumFmt:    3, // #,##0
	})
	if err != nil {
		return nil, err
	}
	totalStyle, err := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"#F2F4F7"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center"},
		NumFmt:    2,
	})
	if err != nil {
		return nil, err
	}
	totalMoneyStyle, err := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"#F2F4F7"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "right"},
		NumFmt:    3,
	})
	if err != nil {
		return nil, err
	}

	if err := writeMatrixHeader(f, sheet, m, hdrStyle, sunStyle); err != nil {
		return nil, err
	}
	if err := writeMatrixBody(f, sheet, m, numStyle, moneyStyle, sunStyle); err != nil {
		return nil, err
	}
	if err := writeMatrixFooter(f, sheet, m, totalStyle, totalMoneyStyle); err != nil {
		return nil, err
	}
	if err := applyMatrixLayout(f, sheet, m); err != nil {
		return nil, err
	}
	return f, nil
}

func isSundayOfYM(yearMonth string, day int) bool {
	t, err := time.Parse("2006-01-02", fmt.Sprintf("%s-%02d", yearMonth, day))
	if err != nil {
		return false
	}
	return t.Weekday() == time.Sunday
}

func weekdayShort(yearMonth string, day int) string {
	t, err := time.Parse("2006-01-02", fmt.Sprintf("%s-%02d", yearMonth, day))
	if err != nil {
		return ""
	}
	return [...]string{"CN", "T2", "T3", "T4", "T5", "T6", "T7"}[int(t.Weekday())]
}
