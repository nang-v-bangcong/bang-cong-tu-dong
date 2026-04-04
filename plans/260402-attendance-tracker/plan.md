# Bảng Công Tự Động - Implementation Plan

## Overview
Desktop attendance tracker for construction workers in South Korea.
Built with Wails v2 (Go + React/TypeScript).

**Date:** 2026-04-02
**Status:** Planning

## Tech Stack
- **Backend:** Go + Wails v2
- **Frontend:** React + TypeScript + Tailwind CSS
- **State:** Zustand
- **Database:** modernc.org/sqlite (pure Go, no CGO)
- **PDF:** jung-kurt/gofpdf v2 (UTF-8 Vietnamese)
- **UI:** Lucide React icons, sonner toasts

## Phases

| # | Phase | Status | File |
|---|-------|--------|------|
| 1 | Project Setup & Database | pending | [phase-01](phase-01-project-setup.md) |
| 2 | Core Attendance (Personal Tab) | pending | [phase-02](phase-02-personal-tab.md) |
| 3 | Multi-person Tab | pending | [phase-03](phase-03-multi-person-tab.md) |
| 4 | Worksite Management | pending | [phase-04](phase-04-worksite-management.md) |
| 5 | Advance/Deduction & Statistics | pending | [phase-05](phase-05-advance-statistics.md) |
| 6 | PDF Export | pending | [phase-06](phase-06-pdf-export.md) |
| 7 | Reminders & Polish | pending | [phase-07](phase-07-reminders-polish.md) |

## Architecture

```
bang-cong/
├── main.go                  # Wails entry point
├── app.go                   # Main App struct + bindings
├── internal/
│   ├── models/              # Data structs
│   │   ├── attendance.go
│   │   ├── user.go
│   │   ├── worksite.go
│   │   └── advance.go
│   ├── services/            # Business logic
│   │   ├── db.go            # SQLite init + migrations
│   │   ├── attendance.go
│   │   ├── user.go
│   │   ├── worksite.go
│   │   ├── advance.go
│   │   ├── stats.go
│   │   └── pdf.go
│   └── utils/
│       └── helpers.go
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── stores/          # Zustand stores
│   │   │   ├── attendance.ts
│   │   │   ├── user.ts
│   │   │   └── worksite.ts
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── header.tsx
│   │   │   │   ├── sidebar.tsx
│   │   │   │   └── tab-nav.tsx
│   │   │   ├── attendance/
│   │   │   │   ├── table.tsx
│   │   │   │   ├── row.tsx
│   │   │   │   ├── quick-add.tsx
│   │   │   │   └── month-summary.tsx
│   │   │   ├── multi-person/
│   │   │   │   ├── person-list.tsx
│   │   │   │   ├── person-table.tsx
│   │   │   │   └── ranking.tsx
│   │   │   ├── worksite/
│   │   │   │   └── manager.tsx
│   │   │   └── shared/
│   │   │       ├── theme-toggle.tsx
│   │   │       └── month-picker.tsx
│   │   ├── pages/
│   │   │   ├── personal.tsx
│   │   │   └── team.tsx
│   │   └── lib/
│   │       └── utils.ts
│   └── wailsjs/             # Auto-generated bindings
├── wails.json
└── go.mod
```

## Database Schema

```sql
-- Worksites (construction sites)
CREATE TABLE worksites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Users (for multi-person tab)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    daily_wage INTEGER NOT NULL,  -- Won per day
    is_self INTEGER DEFAULT 0,    -- 1 = personal tab user
    created_at TEXT DEFAULT (datetime('now'))
);

-- Attendance records
CREATE TABLE attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,            -- YYYY-MM-DD
    coefficient REAL NOT NULL,     -- 0.3, 0.5, 0.7, 1.0, 1.3, 1.5...
    worksite_id INTEGER,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(worksite_id) REFERENCES worksites(id),
    UNIQUE(user_id, date)
);

-- Advances/deductions
CREATE TABLE advances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    amount INTEGER NOT NULL,       -- Won (positive = advance, negative = bonus)
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
```
