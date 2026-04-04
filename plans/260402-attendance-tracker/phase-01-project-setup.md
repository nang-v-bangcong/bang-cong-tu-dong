# Phase 01 - Project Setup & Database

**Status:** pending
**Priority:** high
**Date:** 2026-04-02

## Overview
Initialize Wails v2 project, configure SQLite, create database schema and services.

## Requirements
- Wails CLI installed (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`)
- Go 1.18+, Node.js 14+
- Windows 10+ (WebView2 built-in)

## Implementation Steps

### 1. Init Wails project
- [ ] Run `wails init -n bang-cong -t react-ts`
- [ ] Verify `wails dev` runs successfully
- [ ] Configure wails.json (window size, title)

### 2. Setup Go backend
- [ ] Add `modernc.org/sqlite` dependency
- [ ] Create `internal/models/` with structs (Attendance, User, Worksite, Advance)
- [ ] Create `internal/services/db.go` — init SQLite, run migrations
- [ ] Create all service files with CRUD operations

### 3. Setup React frontend
- [ ] Install Tailwind CSS, Zustand, sonner, lucide-react
- [ ] Configure dark/light mode with Tailwind `dark:` classes
- [ ] Create base layout (header + tab navigation)
- [ ] Create Zustand stores

### 4. Wire Go ↔ React
- [ ] Expose Go service methods via App struct
- [ ] Verify auto-generated TypeScript bindings work
- [ ] Test a simple round-trip (create + read attendance)

## Success Criteria
- `wails dev` runs without errors
- SQLite database created on first launch
- Go ↔ React communication works
- Dark/light mode toggle works
