# API Reference — Wails Go Bindings

Tất cả hàm dưới đây được expose qua Wails và gọi từ frontend qua `wailsjs/go/main/App`.

---

## Models mới (v2)

### `TeamMatrix`
```ts
{
  yearMonth: string        // "2026-04"
  daysInMonth: number      // số ngày trong tháng
  rows: MatrixRow[]        // mỗi phần tử là 1 người
  dayNotes: Record<number, string>   // key = ngày (1-31)
  dayTotals: Record<number, number>  // tổng hệ số toàn nhóm theo ngày
}
```

### `DayNote`
```ts
{
  yearMonth: string   // "2026-04"
  day: number         // 1-31
  note: string        // tối đa 500 ký tự
  updatedAt: string   // ISO timestamp
}
```

### `CellRef`
```ts
{
  userId: number
  date: string   // "2026-04-17"
}
```

---

## API mới (v2)

### `GetTeamMonthMatrix(yearMonth: string): Promise<TeamMatrix>`
Trả về ma trận chấm công toàn nhóm cho tháng `yearMonth` (format `"YYYY-MM"`).  
Bao gồm `dayNotes` và `dayTotals` inline.

### `GetDayNotes(yearMonth: string): Promise<DayNote[]>`
Lấy tất cả ghi chú ngày trong tháng.

### `UpsertDayNote(yearMonth: string, day: number, note: string): Promise<void>`
Tạo hoặc cập nhật ghi chú cho ngày `day` trong tháng.  
- `note = ""` → xóa ghi chú (upsert trống).

### `BulkUpsertWorksite(cells: CellRef[], worksiteID: number | null): Promise<void>`
Gán công trường hàng loạt cho danh sách ô `cells`.  
- `worksiteID = null` → bỏ gán công trường cho các ô đó.

---

## API hiện có (tham khảo nhanh)

| Hàm | Mô tả |
|-----|-------|
| `GetTeamUsers()` | Danh sách thành viên |
| `GetWorksites()` | Danh sách công trường |
| `GetMonthAttendance(userID, yearMonth)` | Chấm công 1 người |
| `UpsertAttendance(userID, date, coefficient, worksiteID, note)` | Chấm / cập nhật 1 ngày |
| `DeleteAttendance(id)` | Xóa 1 bản ghi chấm công |
| `GetMonthSummary(userID, yearMonth)` | Tổng hợp lương tháng |
| `CopyPreviousDay(userID, targetDate)` | Copy chấm công ngày trước |
| `ExportPDF(userID, yearMonth, path)` | Xuất PDF |
| `BackupDB()` | Sao lưu SQLite |
| `RestoreDB()` | Khôi phục SQLite |
| `GetAuditLog(limit, offset)` | Lịch sử thay đổi |
| `CreateTeamUser(name)` | Thêm 1 thành viên mới |
| `BulkCreateUsers(names)` | Thêm nhiều thành viên (bulk paste) |
| `BulkUpsertWorksite(cells, worksiteID)` | Gán công trường hàng loạt |
| `BulkUpsertCell(cells)` | Chấm hàng loạt nhiều ô |
| `BulkDeleteAttendance(cells)` | Xóa hàng loạt nhiều ô |
| `FillDayForAllUsers(date, coefficient, worksiteID)` | Điền hệ số 1 ngày cho toàn nhóm |
| `CopyDayForAll(fromDate, toDate, overwrite)` | Copy ngày → ngày cho toàn nhóm |
| `UpsertDayNote(yearMonth, day, note)` | Tạo/cập nhật ghi chú ngày |
| `GetDayNotes(yearMonth)` | Lấy ghi chú tất cả ngày trong tháng |
| `ExportMatrixExcel(yearMonth, path)` | Xuất ma trận ra file .xlsx |
| `GetToday()` | Trả về ngày hôm nay (server-side) |

---

## Cơ sở dữ liệu

Bảng mới: `day_notes` (thêm từ v2)

```sql
CREATE TABLE day_notes (
  year_month TEXT NOT NULL,
  day        INTEGER NOT NULL,
  note       TEXT NOT NULL DEFAULT '',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (year_month, day)
);
```
