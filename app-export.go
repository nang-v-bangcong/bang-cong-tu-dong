package main

import (
	"bang-cong/internal/services"
	"fmt"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// --- Backup/Restore ---

func (a *App) BackupDB() (string, error) {
	filePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Sao luu du lieu",
		DefaultFilename: fmt.Sprintf("bang-cong-backup-%s.db", services.TodayKST()),
		Filters: []runtime.FileFilter{
			{DisplayName: "SQLite Database", Pattern: "*.db"},
		},
	})
	if err != nil || filePath == "" {
		return "", fmt.Errorf("cancelled")
	}
	return filePath, services.BackupDB(filePath)
}

func (a *App) RestoreDB() error {
	filePath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Khoi phuc du lieu",
		Filters: []runtime.FileFilter{
			{DisplayName: "SQLite Database", Pattern: "*.db"},
		},
	})
	if err != nil || filePath == "" {
		return fmt.Errorf("cancelled")
	}
	return services.RestoreDB(filePath)
}

// --- PDF Export ---

func (a *App) ExportPDF(userID int64, userName string, yearMonth string) (string, error) {
	filePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Luu PDF",
		DefaultFilename: fmt.Sprintf("bang-cong-%s-%s.pdf", userName, yearMonth),
		Filters: []runtime.FileFilter{
			{DisplayName: "PDF Files", Pattern: "*.pdf"},
		},
	})
	if err != nil || filePath == "" {
		return "", fmt.Errorf("cancelled")
	}

	records, err := services.GetMonthAttendance(userID, yearMonth)
	if err != nil {
		return "", err
	}

	summary, err := services.GetMonthSummary(userID, yearMonth)
	if err != nil {
		return "", err
	}

	worksites, err := services.GetWorksites()
	if err != nil {
		return "", err
	}
	wsMap := make(map[int64]string)
	wsWages := make(map[int64]int64)
	for _, w := range worksites {
		wsMap[w.ID] = w.Name
		wsWages[w.ID] = w.DailyWage
	}

	userWage, err := services.GetUserDailyWage(userID)
	if err != nil {
		return "", err
	}

	data := services.PDFData{
		Title:         "Bang Cong - " + yearMonth,
		UserName:      userName,
		YearMonth:     yearMonth,
		Records:       records,
		Summary:       summary,
		Worksites:     wsMap,
		WorksiteWages: wsWages,
		UserDailyWage: userWage,
	}

	if err := services.GeneratePDF(data, filePath); err != nil {
		return "", err
	}
	return filePath, nil
}
