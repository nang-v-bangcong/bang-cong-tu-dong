# Phase 08 — Admin Tab: Báo lỗi (Bug List & Resolve)

## Context links

- [plan.md](./plan.md)
- [phase-05-admin-app-bootstrap.md](./phase-05-admin-app-bootstrap.md)
- [phase-06-admin-announcement.md](./phase-06-admin-announcement.md) (reuse client.go)
- [research/researcher-01-external-services.md](./research/researcher-01-external-services.md) (§1 Issues API)

## Overview

- **Date:** 2026-04-19
- **Description:** Tab "Báo lỗi" fetch issues `labels=bug-report&state=open`, paginated 30/page. List: title + ngày + user contact. Detail modal: markdown body + ảnh embed (`react-markdown`). Nút "Đã xử lý" (close + add label `resolved`) + "Đóng kèm note" (comment + close). Badge count sidebar.
- **Priority:** Trung bình.
- **Implementation status:** Completed
- **Review status:** Completed (2026-04-20, user manual test pass)

## Key Insights

- Issues API list filter → array với `number, title, body, created_at, html_url`.
- Pagination: `per_page=30&page=N`. Header `Link: ...; rel="next"` → parse bằng `Contains("rel=\"next\"")`.
- Close = PATCH `/issues/{n}` `{state: "closed"}`. Add label = POST `/issues/{n}/labels` `{labels: ["resolved"]}`.
- Comment = POST `/issues/{n}/comments` `{body}`.
- `react-markdown` v9 ~30KB, tự sanitize URL, ảnh embed `![](url)` OK. KHÔNG dùng `rehypeRaw` (XSS).
- Badge count: derive từ `issues.length` sau fetch, set qua admin-store.
- User contact regex `/\*\*User Contact:\*\* (.+)/` trên body.

## Requirements

**Functional:**
- Mount + refresh: `GET /issues?labels=bug-report&state=open&per_page=30&page=1`.
- Bảng: `#{number}` | Title (truncate 50) | Ngày `dd/MM HH:mm` | User Contact.
- Pagination: nút "Tải thêm" nếu `hasNext`.
- Click issue → detail modal (hoặc split pane):
  - Title + link "Xem trên GitHub" (OpenURL).
  - Body `<ReactMarkdown>` render markdown + ảnh.
  - Nút "Đã xử lý" (primary) → confirm → close + label `resolved` → reload list.
  - Nút "Đóng kèm note" → textarea → Submit → comment + close.
  - Nút "Hủy".
- Sidebar badge số open.
- Refresh manual.

**Non-functional:**
- `bugs-page.tsx` ≤ 200 dòng (tách list + detail nếu vượt).
- `internal/githubapi/issues.go` ≤ 150 dòng.
- Thêm dep: `react-markdown@^9.0.0`.

## Architecture

```
admin/
├─ internal/githubapi/issues.go (mới, ~140 dòng)
│   - ListBugReports(cl, page) (issues, hasNext, err)
│   - CloseIssue(cl, number, addLabel) error
│   - CommentIssue(cl, number, body) error
├─ app.go (edit):
│   - ListBugReports(page) (BugListResult, error)
│   - ResolveBugReport(number, note string) error

admin/frontend/src/
├─ pages/bugs-page.tsx (~180 dòng)
├─ components/{bug-list-item, bug-detail-modal}.tsx
└─ components/sidebar.tsx (edit: badge)
```

## Related code files

- Tạo: `admin/internal/githubapi/issues.go`, `admin/frontend/src/components/bug-list-item.tsx`, `bug-detail-modal.tsx`.
- Sửa: `admin/app.go`, `admin/frontend/src/pages/bugs-page.tsx`, `components/sidebar.tsx`, `admin/frontend/package.json`.

## Implementation Steps

1. `cd admin/frontend && npm install react-markdown@^9.0.0`.
2. **`issues.go`** (~140 dòng):
   - Struct `Issue{Number, Title, Body, State, CreatedAt time.Time, HTMLURL, Labels []Label}` + `Label{Name}`.
   - `ListBugReports(cl, page)`: path `/repos/{o}/{r}/issues?labels=bug-report&state=open&per_page=30&page={page}` → `cl.Do("GET", ...)` → decode array → `hasNext = strings.Contains(resp.Header.Get("Link"), "rel=\"next\"")`.
   - `CloseIssue(cl, number, addLabel)`: nếu `addLabel != ""` → POST `/issues/{n}/labels` `{labels: [addLabel]}`; rồi PATCH `/issues/{n}` `{state: "closed"}`.
   - `CommentIssue(cl, number, body)`: POST `/issues/{n}/comments` `{body}`.
3. **`admin/app.go`** thêm:
   - `type BugListResult{Issues []Issue, HasNext bool}`.
   - `ListBugReports(page)` → client → `ListBugReports` helper → wrap result.
   - `ResolveBugReport(number, note)`: nếu `note != ""` → `CommentIssue` trước; rồi `CloseIssue(n, "resolved")`.
4. **`bug-list-item.tsx`** (~40 dòng): row `#{number}`, title truncate 50, date formatted, user contact parsed via regex. `onClick → onSelect(issue)`.
5. **`bug-detail-modal.tsx`** (~120 dòng): import `ReactMarkdown`. Render title + metadata + `<ReactMarkdown>{issue.body}</ReactMarkdown>`. 3 nút:
   - "Đã xử lý" → `ResolveBugReport(num, "")`.
   - "Đóng kèm note" → inline textarea → Submit `ResolveBugReport(num, note)`.
   - "Hủy" → close modal.
6. **`bugs-page.tsx`** (~180 dòng):
   - State `issues, page, hasNext, selectedIssue`.
   - Mount → `ListBugReports(1)`.
   - Nút "Tải thêm" nếu `hasNext` → `ListBugReports(page+1)` append.
   - Click row → `setSelectedIssue(issue)` → show modal.
   - Modal submit → `ResolveBugReport` → close modal + remove issue khỏi list + decrement badge.
7. **`sidebar.tsx`** edit: fetch count (qua store sync từ bugs-page) → `<span className="badge">{count}</span>` cạnh "Báo lỗi".
8. **Test:**
   - Submit 3-5 bug report từ app chính.
   - Admin tab Báo lỗi → list 3-5 issue + badge sidebar đúng số.
   - Click 1 issue → modal hiện body markdown + ảnh (nếu có).
   - "Đã xử lý" → issue đóng + label `resolved` → biến mất list + badge giảm.
   - "Đóng kèm note" → comment hiện GitHub + issue đóng.
   - Pagination test (nếu >30 issue): nút "Tải thêm" xuất hiện.

## Todo list

- [ ] `npm install react-markdown`.
- [ ] Viết `issues.go` 3 function.
- [ ] Admin `app.go` thêm 2 method.
- [ ] Viết `bug-list-item.tsx`, `bug-detail-modal.tsx`.
- [ ] Viết `bugs-page.tsx` + pagination.
- [ ] Edit sidebar badge.
- [ ] Test 3-5 real bug report.

## Success Criteria

- [ ] List hiển thị đúng issue open, không show closed.
- [ ] Markdown + ảnh embed render đúng.
- [ ] "Đã xử lý" close + label `resolved`.
- [ ] "Đóng kèm note" comment + close.
- [ ] Badge update sau resolve.
- [ ] File ≤ 200 dòng.

## Risk Assessment

- **Low**: Issues API stable.
- **Medium**: Ảnh nhiều → render chậm → chấp nhận, user xem 1 issue/lúc.
- **Low**: Pagination Link parse đơn giản (Contains đủ).
- **Low**: `react-markdown` v9 tự sanitize URL — default safe, không dùng `rehypeRaw`.

## Security Considerations

- Body issue từ user qua bug report → `react-markdown` sanitize mặc định.
- KHÔNG dùng `rehypeRaw` (XSS risk).
- PAT qua Go client.
- Comment body → GitHub markdown; chấp nhận admin tự chịu.

## Next steps

Phase 09 build automation — cần full flow phase 05-08 chạy mới test full cycle.
