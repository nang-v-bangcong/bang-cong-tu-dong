package services

import (
	"bang-cong/internal/models"
	"fmt"
	"strings"

	"github.com/jung-kurt/gofpdf"
)

type PDFData struct {
	Title         string
	UserName      string
	YearMonth     string
	Records       []models.Attendance
	Summary       models.MonthSummary
	Worksites     map[int64]string
	WorksiteWages map[int64]int64
}

func GeneratePDF(data PDFData, filePath string) error {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetAutoPageBreak(true, 15)
	pdf.AddPage()

	// Title
	pdf.SetFont("Arial", "B", 16)
	pdf.CellFormat(0, 10, data.Title, "", 1, "C", false, 0, "")
	pdf.Ln(2)

	// Info
	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(0, 6, fmt.Sprintf("Name: %s", data.UserName), "", 1, "L", false, 0, "")
	pdf.CellFormat(0, 6, fmt.Sprintf("Period: %s", data.YearMonth), "", 1, "L", false, 0, "")
	pdf.Ln(4)

	// Summary
	pdf.SetFont("Arial", "B", 10)
	pdf.SetFillColor(230, 240, 255)
	pdf.CellFormat(38, 7, "Days worked", "1", 0, "C", true, 0, "")
	pdf.CellFormat(38, 7, "Total coeff", "1", 0, "C", true, 0, "")
	pdf.CellFormat(38, 7, "Gross salary", "1", 0, "C", true, 0, "")
	pdf.CellFormat(38, 7, "Advances", "1", 0, "C", true, 0, "")
	pdf.CellFormat(38, 7, "Net salary", "1", 1, "C", true, 0, "")

	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(38, 7, fmt.Sprintf("%d", data.Summary.TotalDays), "1", 0, "C", false, 0, "")
	pdf.CellFormat(38, 7, fmt.Sprintf("%.1f", data.Summary.TotalCoefficient), "1", 0, "C", false, 0, "")
	pdf.CellFormat(38, 7, formatNumber(int64(data.Summary.TotalSalary))+" Won", "1", 0, "C", false, 0, "")
	pdf.CellFormat(38, 7, formatNumber(data.Summary.TotalAdvances)+" Won", "1", 0, "C", false, 0, "")
	pdf.CellFormat(38, 7, formatNumber(int64(data.Summary.NetSalary))+" Won", "1", 1, "C", false, 0, "")
	pdf.Ln(4)

	// Table header
	pdf.SetFont("Arial", "B", 9)
	pdf.SetFillColor(240, 240, 240)
	pdf.CellFormat(22, 7, "Date", "1", 0, "C", true, 0, "")
	pdf.CellFormat(18, 7, "Coeff", "1", 0, "C", true, 0, "")
	pdf.CellFormat(55, 7, "Worksite", "1", 0, "C", true, 0, "")
	pdf.CellFormat(55, 7, "Note", "1", 0, "C", true, 0, "")
	pdf.CellFormat(40, 7, "Salary (Won)", "1", 1, "C", true, 0, "")

	// Table body
	pdf.SetFont("Arial", "", 9)
	for _, r := range data.Records {
		wsName := ""
		if r.WorksiteID != nil {
			wsName = data.Worksites[*r.WorksiteID]
		}
		var wage int64
		if r.WorksiteID != nil {
			wage = data.WorksiteWages[*r.WorksiteID]
		}
		salary := r.Coefficient * float64(wage)
		date := r.Date
		if len(date) > 5 {
			date = date[5:]
		}

		pdf.CellFormat(22, 6, date, "1", 0, "C", false, 0, "")
		pdf.CellFormat(18, 6, fmt.Sprintf("%.1f", r.Coefficient), "1", 0, "C", false, 0, "")
		pdf.CellFormat(55, 6, truncate(wsName, 28), "1", 0, "L", false, 0, "")
		pdf.CellFormat(55, 6, truncate(r.Note, 28), "1", 0, "L", false, 0, "")
		pdf.CellFormat(40, 6, formatNumber(int64(salary)), "1", 1, "R", false, 0, "")
	}

	return pdf.OutputFileAndClose(filePath)
}

func formatNumber(n int64) string {
	s := fmt.Sprintf("%d", n)
	if n < 0 {
		s = s[1:]
	}
	parts := []string{}
	for i := len(s); i > 0; i -= 3 {
		start := i - 3
		if start < 0 {
			start = 0
		}
		parts = append([]string{s[start:i]}, parts...)
	}
	result := strings.Join(parts, ",")
	if n < 0 {
		result = "-" + result
	}
	return result
}

func truncate(s string, max int) string {
	runes := []rune(s)
	if len(runes) <= max {
		return s
	}
	return string(runes[:max-2]) + ".."
}
