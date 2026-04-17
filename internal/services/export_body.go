package services

import (
	"bang-cong/internal/models"

	"github.com/xuri/excelize/v2"
)

func writeMatrixBody(f *excelize.File, sheet string, m models.TeamMatrix, numStyle, moneyStyle, sunStyle int) error {
	startRow := 4
	for i, r := range m.Rows {
		row := startRow + i
		nc, _ := excelize.CoordinatesToCellName(1, row)
		if err := f.SetCellValue(sheet, nc, r.UserName); err != nil {
			return err
		}
		for d := 1; d <= m.DaysInMonth; d++ {
			c, _ := excelize.CoordinatesToCellName(d+1, row)
			if cell, ok := r.Cells[d]; ok && cell.Coefficient != 0 {
				if err := f.SetCellValue(sheet, c, cell.Coefficient); err != nil {
					return err
				}
			}
			style := numStyle
			if isSundayOfYM(m.YearMonth, d) {
				style = sunStyle
			}
			if err := f.SetCellStyle(sheet, c, c, style); err != nil {
				return err
			}
		}
		tc, _ := excelize.CoordinatesToCellName(m.DaysInMonth+2, row)
		sc, _ := excelize.CoordinatesToCellName(m.DaysInMonth+3, row)
		if err := f.SetCellValue(sheet, tc, r.TotalCoef); err != nil {
			return err
		}
		if err := f.SetCellValue(sheet, sc, r.Salary); err != nil {
			return err
		}
		if err := f.SetCellStyle(sheet, tc, tc, numStyle); err != nil {
			return err
		}
		if err := f.SetCellStyle(sheet, sc, sc, moneyStyle); err != nil {
			return err
		}
	}
	return nil
}

func writeMatrixFooter(f *excelize.File, sheet string, m models.TeamMatrix, totalStyle, totalMoneyStyle int) error {
	row := 4 + len(m.Rows)
	nc, _ := excelize.CoordinatesToCellName(1, row)
	if err := f.SetCellValue(sheet, nc, "Tổng"); err != nil {
		return err
	}
	if err := f.SetCellStyle(sheet, nc, nc, totalStyle); err != nil {
		return err
	}
	var grandCoef, grandSalary float64
	for _, r := range m.Rows {
		grandCoef += r.TotalCoef
		grandSalary += r.Salary
	}
	for d := 1; d <= m.DaysInMonth; d++ {
		c, _ := excelize.CoordinatesToCellName(d+1, row)
		if err := f.SetCellValue(sheet, c, m.DayTotals[d]); err != nil {
			return err
		}
		if err := f.SetCellStyle(sheet, c, c, totalStyle); err != nil {
			return err
		}
	}
	tc, _ := excelize.CoordinatesToCellName(m.DaysInMonth+2, row)
	sc, _ := excelize.CoordinatesToCellName(m.DaysInMonth+3, row)
	if err := f.SetCellValue(sheet, tc, grandCoef); err != nil {
		return err
	}
	if err := f.SetCellValue(sheet, sc, grandSalary); err != nil {
		return err
	}
	if err := f.SetCellStyle(sheet, tc, tc, totalStyle); err != nil {
		return err
	}
	if err := f.SetCellStyle(sheet, sc, sc, totalMoneyStyle); err != nil {
		return err
	}
	return nil
}
