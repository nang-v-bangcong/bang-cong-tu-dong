package main

import (
	"bang-cong/internal/models"
	"bang-cong/internal/services"
	"context"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx         context.Context
	quitConfirm bool
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
	// User đã xác nhận thoát qua dialog — cho phép đóng thật.
	if a.quitConfirm {
		return false
	}
	// Chặn lần đầu, để frontend mở dialog xác nhận.
	runtime.EventsEmit(ctx, "app:quit-request")
	return true
}

// Quit — frontend gọi sau khi người dùng xác nhận trong dialog.
func (a *App) Quit() {
	a.quitConfirm = true
	runtime.Quit(a.ctx)
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

func (a *App) BulkCreateUsers(names []string) (models.BulkCreateResult, error) {
	return services.BulkCreateUsers(names)
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

func (a *App) GetTeamMonthSummaries(yearMonth string) ([]models.UserMonthSummary, error) {
	return services.GetTeamMonthSummaries(yearMonth)
}

func (a *App) CopyPreviousDay(userID int64, targetDate string) (models.Attendance, error) {
	return services.CopyPreviousDay(userID, targetDate)
}

func (a *App) GetToday() string {
	return services.TodayKST()
}

// --- Matrix & Day Notes ---

func (a *App) GetTeamMonthMatrix(yearMonth string) (models.TeamMatrix, error) {
	return services.GetTeamMonthMatrix(yearMonth)
}

func (a *App) GetDayNotes(yearMonth string) ([]models.DayNote, error) {
	return services.GetDayNotes(yearMonth)
}

func (a *App) UpsertDayNote(yearMonth string, day int, note string) error {
	return services.UpsertDayNote(yearMonth, day, note)
}

func (a *App) BulkUpsertWorksite(cells []models.CellRef, worksiteID *int64) error {
	return services.BulkUpsertWorksite(cells, worksiteID)
}

func (a *App) BulkUpsertCell(cells []models.CellRef, coef *float64, worksiteID *int64) error {
	return services.BulkUpsertCell(cells, coef, worksiteID)
}

func (a *App) BulkUpsertCells(items []services.CellUpsert) error {
	return services.BulkUpsertCells(items)
}

func (a *App) BulkDeleteAttendance(cells []models.CellRef) (int, error) {
	return services.BulkDeleteAttendance(cells)
}

func (a *App) FillDayForAllUsers(yearMonth string, day int, coef float64, worksiteID *int64, overwrite bool) (int, error) {
	return services.FillDayForAllUsers(yearMonth, day, coef, worksiteID, overwrite)
}

func (a *App) CopyDayForAll(yearMonth string, srcDay, dstDay int, overwrite bool) (int, error) {
	return services.CopyDayForAll(yearMonth, srcDay, dstDay, overwrite)
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

// --- Export ---

func (a *App) ExportMatrixExcel(yearMonth string) (string, error) {
	return services.ExportMatrixExcel(a.ctx, yearMonth)
}
