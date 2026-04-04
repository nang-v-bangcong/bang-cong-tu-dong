package main

import (
	"bang-cong/internal/models"
	"bang-cong/internal/services"
	"context"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx context.Context
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	if _, err := services.InitDB(); err != nil {
		runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
			Type:    runtime.ErrorDialog,
			Title:   "Lỗi khởi động",
			Message: "Không thể mở database: " + err.Error(),
		})
	}
}

func (a *App) shutdown(ctx context.Context) {
	services.CloseDB()
}

func (a *App) beforeClose(ctx context.Context) (prevent bool) {
	dialog, err := runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
		Type:          runtime.QuestionDialog,
		Title:         "Thoát ứng dụng",
		Message:       "Bạn có chắc muốn thoát? Hãy đảm bảo đã lưu dữ liệu.",
		DefaultButton: "No",
		Buttons:       []string{"Yes", "No"},
	})
	if err != nil {
		return false
	}
	return dialog == "No"
}

// --- User ---

func (a *App) GetSelfUser() (models.User, error) {
	return services.GetSelfUser()
}

func (a *App) EnsureSelfUser(name string, dailyWage int64) (models.User, error) {
	return services.EnsureSelfUser(name, dailyWage)
}

func (a *App) UpdateUser(id int64, name string, dailyWage int64) error {
	return services.UpdateUser(id, name, dailyWage)
}

func (a *App) GetTeamUsers() ([]models.User, error) {
	return services.GetTeamUsers()
}

func (a *App) CreateTeamUser(name string, dailyWage int64) (models.User, error) {
	return services.CreateTeamUser(name, dailyWage)
}

func (a *App) DeleteTeamUser(id int64) error {
	return services.DeleteTeamUser(id)
}

// --- Worksite ---

func (a *App) GetWorksites() ([]models.Worksite, error) {
	return services.GetWorksites()
}

func (a *App) CreateWorksite(name string, dailyWage int64) (models.Worksite, error) {
	return services.CreateWorksite(name, dailyWage)
}

func (a *App) UpdateWorksite(id int64, name string, dailyWage int64) error {
	return services.UpdateWorksite(id, name, dailyWage)
}

func (a *App) DeleteWorksite(id int64) error {
	return services.DeleteWorksite(id)
}

// --- Attendance ---

func (a *App) GetMonthAttendance(userID int64, yearMonth string) ([]models.Attendance, error) {
	return services.GetMonthAttendance(userID, yearMonth)
}

func (a *App) UpsertAttendance(userID int64, date string, coefficient float64, worksiteID *int64, note string) (models.Attendance, error) {
	return services.UpsertAttendance(userID, date, coefficient, worksiteID, note)
}

func (a *App) DeleteAttendance(id int64) error {
	return services.DeleteAttendance(id)
}

func (a *App) GetMonthSummary(userID int64, yearMonth string) (models.MonthSummary, error) {
	return services.GetMonthSummary(userID, yearMonth)
}

func (a *App) GetWorksiteSummary(userID int64, yearMonth string) ([]models.WorksiteSummary, error) {
	return services.GetWorksiteSummary(userID, yearMonth)
}

func (a *App) CopyPreviousDay(userID int64, targetDate string) (models.Attendance, error) {
	return services.CopyPreviousDay(userID, targetDate)
}

func (a *App) GetToday() string {
	return time.Now().Format("2006-01-02")
}

// --- Advance ---

func (a *App) GetMonthAdvances(userID int64, yearMonth string) ([]models.Advance, error) {
	return services.GetMonthAdvances(userID, yearMonth)
}

func (a *App) CreateAdvance(userID int64, date string, amount int64, note string) (models.Advance, error) {
	return services.CreateAdvance(userID, date, amount, note)
}

func (a *App) UpdateAdvance(id int64, date string, amount int64, note string) error {
	return services.UpdateAdvance(id, date, amount, note)
}

func (a *App) DeleteAdvance(id int64) error {
	return services.DeleteAdvance(id)
}

// --- Audit Log ---

func (a *App) GetAuditLog(limit int, offset int) ([]models.AuditLog, error) {
	return services.GetAuditLog(limit, offset)
}
