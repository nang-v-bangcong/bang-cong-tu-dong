package services

import (
	"bang-cong/internal/models"

	"github.com/xuri/excelize/v2"
)

func colName(col int) string {
	n, _ := excelize.ColumnNumberToName(col)
	return n
}

func writeMatrixHeader(f *excelize.File, sheet string, m models.TeamMatrix, hdr, sun int) error {
	if err := f.SetCellValue(sheet, "A1", "Tên"); err != nil {
		return err
	}
	if err := f.MergeCell(sheet, "A1", "A2"); err != nil {
		return err
	}
	if err := f.SetCellStyle(sheet, "A1", "A2", hdr); err != nil {
		return err
	}
	for d := 1; d <= m.DaysInMonth; d++ {
		col := d + 1
		c1, _ := excelize.CoordinatesToCellName(col, 1)
		c2, _ := excelize.CoordinatesToCellName(col, 2)
		if err := f.SetCellValue(sheet, c1, d); err != nil {
			return err
		}
		if err := f.SetCellValue(sheet, c2, weekdayShort(m.YearMonth, d)); err != nil {
			return err
		}
		style := hdr
		if isSundayOfYM(m.YearMonth, d) {
			style = sun
		}
		if err := f.SetCellStyle(sheet, c1, c2, style); err != nil {
			return err
		}
	}
	tc1, _ := excelize.CoordinatesToCellName(m.DaysInMonth+2, 1)
	tc2, _ := excelize.CoordinatesToCellName(m.DaysInMonth+2, 2)
	sc1, _ := excelize.CoordinatesToCellName(m.DaysInMonth+3, 1)
	sc2, _ := excelize.CoordinatesToCellName(m.DaysInMonth+3, 2)
	if err := f.SetCellValue(sheet, tc1, "Công"); err != nil {
		return err
	}
	if err := f.SetCellValue(sheet, sc1, "Lương"); err != nil {
		return err
	}
	if err := f.MergeCell(sheet, tc1, tc2); err != nil {
		return err
	}
	if err := f.MergeCell(sheet, sc1, sc2); err != nil {
		return err
	}
	if err := f.SetCellStyle(sheet, tc1, tc2, hdr); err != nil {
		return err
	}
	if err := f.SetCellStyle(sheet, sc1, sc2, hdr); err != nil {
		return err
	}
	return writeNoteRow(f, sheet, m)
}

func writeNoteRow(f *excelize.File, sheet string, m models.TeamMatrix) error {
	if err := f.SetCellValue(sheet, "A3", "Ghi chú"); err != nil {
		return err
	}
	noteStyle, err := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Italic: true, Color: "#505A69"},
		Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center", WrapText: true},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"#FAFBFC"}, Pattern: 1},
	})
	if err != nil {
		return err
	}
	for d := 1; d <= m.DaysInMonth; d++ {
		c, _ := excelize.CoordinatesToCellName(d+1, 3)
		if err := f.SetCellValue(sheet, c, m.DayNotes[d]); err != nil {
			return err
		}
		if err := f.SetCellStyle(sheet, c, c, noteStyle); err != nil {
			return err
		}
	}
	return nil
}

func applyMatrixLayout(f *excelize.File, sheet string, m models.TeamMatrix) error {
	if err := f.SetColWidth(sheet, "A", "A", 22); err != nil {
		return err
	}
	if err := f.SetColWidth(sheet, "B", colName(m.DaysInMonth+1), 5.2); err != nil {
		return err
	}
	tot := colName(m.DaysInMonth + 2)
	sal := colName(m.DaysInMonth + 3)
	if err := f.SetColWidth(sheet, tot, tot, 7); err != nil {
		return err
	}
	if err := f.SetColWidth(sheet, sal, sal, 14); err != nil {
		return err
	}
	if err := f.SetRowHeight(sheet, 1, 20); err != nil {
		return err
	}
	if err := f.SetRowHeight(sheet, 2, 16); err != nil {
		return err
	}
	if err := f.SetRowHeight(sheet, 3, 18); err != nil {
		return err
	}
	return f.SetPanes(sheet, &excelize.Panes{
		Freeze:      true,
		XSplit:      1,
		YSplit:      3,
		TopLeftCell: "B4",
		ActivePane:  "bottomRight",
	})
}
