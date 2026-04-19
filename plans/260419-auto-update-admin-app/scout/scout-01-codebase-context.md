# Scout Report 01 - Codebase Context Verification

Date: 2026-04-19
Scope: Verify technical assumptions for auto-update + bug report + admin app plan

---

## 1. Header Component & Toolbar Layout

File: /frontend/src/components/header.tsx (97 lines)

Component: Header() function, flex container
Background: CSS var(--bg-card) + 1px border  
Header height: py-1.5 padding — NOT fixed h-14/h-16 class. Dynamic height from content.

Icons (right side, L73-91, order):
1. RefreshCw (Refresh data)
2. History (Audit log)
3. Building2 (Manage worksites)
4. Download (Backup)
5. Upload (Restore)
6. HelpButton — HelpCircle icon from help-button.tsx
7. ThemeToggle

All icons from lucide-react v0.500.0.

Insertion points for new elements:
- (a) Announcement text: Between MonthPicker (L70) and icon group (L73)
- (b) Bug icon: Before HelpButton (L89) — natural position

---

## 2. Version Information

wails.json L16: productVersion = 1.0.0
versioninfo.json L4: Major:1 Minor:0 Patch:0 Build:0
versioninfo.json L16: ProductName = Bảng Công Tự Động

VERSION constant: NONE FOUND in frontend/src or app.go

Build outputs:
- build.bat: wails build -clean → build/bin/BangCong.exe
- build-installer.bat: wails build -nsis → BangCong.exe + installer

Note: Version hardcoded in JSON only. Need Go const or derivation at build time.

---

## 3. Toast Usage Pattern

File: /frontend/src/App.tsx (93 lines, Toaster L2)

Examples:
- toast.success(...) — L40, header.tsx:21
- toast.warning(...) — L39
- toast.error(...) — L27, 35

Toast config (L85): <Toaster richColors position="bottom-right" />

No toast.action() yet — can add for interactive toasts.

---

## 4. Dialog/Modal Patterns

Primary template: /frontend/src/components/help-dialog.tsx (69 lines)

Patterns:
- Fixed overlay: fixed inset-0 z-50 + rgba(0,0,0,0.5)
- Content: max-w-3xl w-full max-h-[90vh] overflow-auto
- Header (sticky): sticky top-0, print:hidden
- Close: ESC key + click outside (stopPropagation)
- Styling: CSS vars (--bg-card, --border, --radius-lg, --shadow-lg)

Simpler variant: /frontend/src/components/confirm-dialog.tsx (31 lines)
Exit variant: /frontend/src/components/exit-dialog.tsx (69 lines, z-[60])

No external UI lib (Radix/shadcn) — custom CSS + React.

---

## 5. Wails Binding & Go Methods

File: /app.go (203 lines)

Exported methods (PascalCase):
- Quit() — L46
- User: GetSelfUser, EnsureSelfUser, UpdateUser, GetTeamUsers, CreateTeamUser, DeleteTeamUser, BulkCreateUsers
- Worksite: GetWorksites, CreateWorksite, UpdateWorksite, DeleteWorksite
- Attendance: GetMonthAttendance, UpsertAttendance, DeleteAttendance, GetMonthSummary, GetWorksiteSummary, GetTeamMonthSummaries, CopyPreviousDay, GetToday
- Matrix: GetTeamMonthMatrix, GetDayNotes, UpsertDayNote, BulkUpsertWorksite, BulkUpsertCell, BulkDeleteAttendance, FillDayForAllUsers, FillSundaysForAllUsers, CopyDayForAll
- Advance: GetMonthAdvances, CreateAdvance, UpdateAdvance, DeleteAdvance
- Audit: GetAuditLog
- Export: ExportMatrixExcel

File: /app-export.go (95 lines):
- BackupDB() → (string, error) with SaveFileDialog (L12)
- RestoreDB() → OpenFileDialog (L26)
- ExportPDF() → SaveFileDialog + complex logic (L41-94)

Convention: All methods return (Type, error) or error. No void.

Missing for plan:
- OpenURL(url string) error
- GetOSInfo() (string, error)
- Bug report submission methods

---

## 6. State Management (Zustand)

File: /frontend/src/stores/app-store.ts (75 lines)

AppState:
- tab: personal | team | matrix
- yearMonth, darkMode, dirty, refreshTrigger
- matrixSearch, matrixSortBy, matrixSortDir, matrixCellColor
- paintMode, paintCoef, paintWsId

Pattern: useAppStore((s) => s.property) with set() mutations

Note: NO config store. Use AppState extension or new store if needed.

---

## 7. Frontend Dependencies

File: /frontend/package.json (36 lines)

Current:
- sonner ^2.0.0 — Toast ready
- lucide-react ^0.500.0 — Icons ready
- zustand ^5.0.0 — State
- react ^18.2.0 — Framework
- papaparse ^5.5.3 — CSV parsing

Missing:
- html2canvas — for bug report screenshots
- react-hook-form/zod — if form validation needed

Tailwind: v4.0.0 via @tailwindcss/vite

---

## 8. CSS & Tailwind Configuration

File: /frontend/src/style.css (100+ lines)

Dark mode: @custom-variant dark (&:where(.dark, .dark *));
Uses class-based mode (.dark on html)

CSS variables (root + .dark override):
- --bg, --bg-card, --bg-muted, --bg-hover, --border, --border-light
- --text, --text-secondary, --text-muted
- --primary, --primary-hover, --primary-soft
- --danger, --danger-soft, --success, --success-soft
- --warning, --warning-soft, --orange, --orange-soft
- --radius-sm (6px), --radius (8px), --radius-lg (12px)
- --shadow-sm, --shadow, --shadow-lg, --transition (150ms ease)
- --ws-tint-alpha (0.10) for matrix cell tints

Applied in App.tsx L29:
document.documentElement.classList.toggle("dark", darkMode)

---

## 9. Plans Folder Convention

Location: /plans/260418-matrix-team-upgrade/

Standard phase file sections:
1. Context links
2. Overview (date, description, priority, status)
3. Key Insights (deep analysis)
4. Requirements (functional + non-functional)
5. Architecture (structure + pseudocode)
6. Related code files (exact paths + lines)
7. Implementation Steps (numbered, detailed)
8. Non-functional notes (code quality, limits)

---

## 10. Dialog Flow & Event Handling

Example (ExitDialog):

Backend sends event:
  EventsEmit(ctx, "app:quit-request") — app.go:41

Frontend listens:
  EventsOn("app:quit-request", () => setOpen(true)) — exit-dialog.tsx:13

User confirms:
  Quit() — exit-dialog.tsx:27

Pattern: Wails EventsOn/EventsOff for async backend → frontend signaling.

---

## 11. App Startup & Context

File: /app.go (L20-29)

func (a *App) startup(ctx context.Context) {
  a.ctx = ctx
  if _, err := services.InitDB(); err != nil {
    runtime.MessageDialog(ctx, runtime.MessageDialogOptions{})
  }
}

Context stored in App.ctx — used for all dialogs (SaveFileDialog, OpenFileDialog, Quit, EventsEmit).

---

## Summary

Ready:
- Header & toolbar component structure
- Zustand for state
- Sonner for toasts
- Dialog patterns (help-dialog.tsx template)
- Wails binding convention (PascalCase, (T, error) returns)
- CSS vars + dark mode
- Build system (wails.json + batch scripts)

Needs attention:
- Add VERSION const/binding to frontend
- Plan HTML export (html2canvas vs Wails dialog)
- Form validation if bug report form complex
- Visual test: header layout with announcement bar

Technical gaps:
- No version constant in code
- Header height is padding-based, not fixed
- Custom dialogs — no accessibility features
- No html2canvas or form validation libs yet

---

Report complete. Concise, actionable, with exact file paths and line numbers.
