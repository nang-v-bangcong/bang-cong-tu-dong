# Phase 07 - Reminders & Polish

**Status:** pending
**Priority:** low
**Date:** 2026-04-02

## Overview
End-of-day reminder notification and UI polish.

## Implementation Steps

### 1. Reminder system
- [ ] Check if today's attendance is recorded
- [ ] If not recorded by configurable time (default 20:00), show notification
- [ ] Use Wails system tray for background presence
- [ ] Windows toast notification

### 2. Settings page
- [ ] Personal info (name, daily wage)
- [ ] Reminder time setting
- [ ] Theme toggle (dark/light)
- [ ] App version info

### 3. UI polish
- [ ] Loading states and error handling
- [ ] Empty states ("Chua co du lieu")
- [ ] Keyboard shortcuts (Ctrl+N = new record, Ctrl+S = save)
- [ ] Smooth transitions between tabs/months
- [ ] Responsive layout for different window sizes

## Success Criteria
- Reminder fires at set time if attendance not recorded
- Settings persist across app restarts
- UI feels polished and responsive
