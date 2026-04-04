# Phase 02 - Personal Tab (Core Attendance)

**Status:** pending
**Priority:** high
**Date:** 2026-04-02

## Overview
Build the main personal attendance tab with table view, quick-add, and month summary.

## Key Features
- Table: Date | Coefficient | Worksite | Note | Salary
- Quick-add today button (1-click attendance)
- Copy from previous day
- Month picker to switch months
- Month summary: total days worked, total salary

## Implementation Steps

### 1. Personal user setup
- [ ] Auto-create "self" user on first launch (prompt for name + daily wage)
- [ ] Settings to update name/daily wage later

### 2. Attendance table
- [ ] Month picker component (navigate months)
- [ ] Table component showing all days in selected month
- [ ] Each row: date, coefficient input (number), worksite dropdown, note text, calculated salary
- [ ] Salary = coefficient × daily_wage (auto-calculated)
- [ ] Empty rows for days without records (greyed out)

### 3. Quick actions
- [ ] "Chấm công hôm nay" button — opens form with today's date pre-filled
- [ ] "Copy ngày trước" button — copies previous day's data to today
- [ ] Inline editing — click on a cell to edit directly

### 4. Month summary bar
- [ ] Total coefficient (sum of all coefficients in month)
- [ ] Total days worked (count of non-zero records)
- [ ] Total salary (sum of all daily salaries)
- [ ] Display at top of table

## Success Criteria
- Can add/edit/delete attendance for any day
- Quick-add works correctly
- Copy from previous day works
- Monthly totals calculate accurately
- Salary = coefficient × daily wage for each row
