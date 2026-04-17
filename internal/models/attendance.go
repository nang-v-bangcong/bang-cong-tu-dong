package models

type Attendance struct {
	ID          int64   `json:"id"`
	UserID      int64   `json:"userId"`
	Date        string  `json:"date"`        // YYYY-MM-DD
	Coefficient float64 `json:"coefficient"` // 0.3, 0.5, 1.0, 1.5...
	WorksiteID  *int64  `json:"worksiteId"`
	Note        string  `json:"note"`
	CreatedAt   string  `json:"createdAt"`
	// Computed fields (not stored in DB)
	WorksiteName string  `json:"worksiteName,omitempty"`
	Salary       float64 `json:"salary,omitempty"`
}

type WorksiteSummary struct {
	WorksiteID   *int64  `json:"worksiteId"`
	WorksiteName string  `json:"worksiteName"`
	DailyWage    int64   `json:"dailyWage"`
	TotalCoeff   float64 `json:"totalCoeff"`
	TotalSalary  float64 `json:"totalSalary"`
}

type MatrixCell struct {
	AttendanceID int64   `json:"attendanceId"`
	Coefficient  float64 `json:"coefficient"`
	WorksiteID   *int64  `json:"worksiteId"`
	WorksiteName string  `json:"worksiteName"`
	Note         string  `json:"note"`
}

type MatrixRow struct {
	UserID    int64               `json:"userId"`
	UserName  string              `json:"userName"`
	Cells     map[int]MatrixCell  `json:"cells"`
	TotalDays int                 `json:"totalDays"`
	TotalCoef float64             `json:"totalCoef"`
	Salary    float64             `json:"salary"`
}

type TeamMatrix struct {
	YearMonth   string          `json:"yearMonth"`
	DaysInMonth int             `json:"daysInMonth"`
	Rows        []MatrixRow     `json:"rows"`
	DayNotes    map[int]string  `json:"dayNotes"`
	DayTotals   map[int]float64 `json:"dayTotals"`
}

type CellRef struct {
	UserID int64  `json:"userId"`
	Date   string `json:"date"`
}

type MonthSummary struct {
	TotalDays         int     `json:"totalDays"`
	TotalCoefficient  float64 `json:"totalCoefficient"`
	TotalSalary       float64 `json:"totalSalary"`
	TotalAdvances     int64   `json:"totalAdvances"`
	NetSalary         float64 `json:"netSalary"`
	PaidDays          int     `json:"paidDays"`
	PaidCoefficient   float64 `json:"paidCoefficient"`
	UnpaidDays        int     `json:"unpaidDays"`
	UnpaidCoefficient float64 `json:"unpaidCoefficient"`
}

type UserMonthSummary struct {
	UserID   int64        `json:"userId"`
	UserName string       `json:"userName"`
	Summary  MonthSummary `json:"summary"`
}
