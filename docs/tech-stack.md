# Tech Stack

## Core
| Component | Technology | Version |
|-----------|-----------|---------|
| Desktop Framework | Wails v2 | latest |
| Backend | Go | 1.18+ |
| Frontend | React + TypeScript | 18+ |
| Styling | Tailwind CSS | 3.x |
| State Management | Zustand | latest |
| Icons | Lucide React | latest |
| Toast | sonner | latest |

## Backend Libraries
| Library | Purpose |
|---------|---------|
| modernc.org/sqlite | SQLite (pure Go, no CGO) |
| jung-kurt/gofpdf/v2 | PDF generation (UTF-8 Vietnamese) |

## Why These Choices
- **Wails v2**: Native desktop app, Go backend + React frontend, auto-generated bindings
- **modernc.org/sqlite**: Pure Go SQLite translation, no MinGW/GCC needed on Windows
- **GoFPDF v2**: Simple API, native UTF-8 support for Vietnamese diacritics
- **Zustand**: Lightweight state management, minimal boilerplate
- **Tailwind**: Dark/light mode via `dark:` classes, rapid UI development
