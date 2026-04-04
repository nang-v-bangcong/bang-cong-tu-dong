# Phase 06 - PDF Export

**Status:** pending
**Priority:** medium
**Date:** 2026-04-02

## Overview
Export attendance tables to PDF using GoFPDF v2 with Vietnamese font support.

## Implementation Steps

### 1. PDF service
- [ ] Add `jung-kurt/gofpdf/v2` dependency
- [ ] Bundle a Unicode TTF font (NotoSans or similar) for Vietnamese
- [ ] Create PDF template: header, table, summary footer

### 2. Personal PDF
- [ ] Export current month's attendance as PDF
- [ ] Include: name, month, daily wage, attendance table, totals, advances, net salary
- [ ] Use Wails SaveFileDialog to pick save location

### 3. Per-person PDF (multi-person tab)
- [ ] Export individual person's monthly report
- [ ] Same format as personal PDF but with person's info

### 4. Team summary PDF
- [ ] All people summary in one PDF
- [ ] Table: Person | Days | Gross salary | Advances | Net salary

## Success Criteria
- PDF opens correctly on phone (simple layout)
- Vietnamese characters display properly
- All numbers match app calculations
- Save dialog works on Windows
