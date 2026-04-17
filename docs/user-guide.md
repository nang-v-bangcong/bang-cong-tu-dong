# Hướng dẫn sử dụng — Bảng Công Tự Động

## Các tab chính

### Tab Cá nhân
Xem và chấm công cho bản thân theo từng ngày. Click ô ngày để chỉnh hệ số (0, 0.5, 1, 1.5, 2) và gán công trường.

### Tab Nhóm
Xem tổng hợp công và lương của tất cả thành viên trong tháng.

### Tab Bảng tổng
Ma trận Excel hiển thị tất cả người (hàng) × ngày (cột) trong tháng — tối đa 100 người × 31 ngày.

**Chấm công nhanh trong Bảng tổng:**
- Click chọn ô, gõ `0` `1` `2` `3` để chấm hệ số 0 / 0.5 / 1 / 1.5
- `Delete` / `Backspace` để xóa công ngày đó
- Chọn nhiều ô rồi gán công trường hàng loạt qua dropdown phía trên

**Ghi chú ngày (header Bảng tổng):**
- Click vào số ngày ở hàng header để thêm/sửa ghi chú (tối đa 500 ký tự)
- `Ctrl+Enter` để lưu, `Escape` để hủy

**Tính năng mới (Bảng tổng Plus v2):**
- **Thêm người** — nút "+" trên toolbar: nhập 1 người hoặc paste danh sách nhiều tên
- **Bulk input** — chọn vùng nhiều ô rồi gõ số hoặc `Delete` để chấm / xóa hàng loạt
- **Right-click header ngày** — menu: Fill toàn nhóm / Clear toàn nhóm / Copy ngày trước
- **Copy ngày → ngày** — dialog chọn nguồn + đích + toggle ghi đè
- **Paste từ clipboard** — `Ctrl+V` trên ô đang focus: dán bảng từ Google Sheets (HTML) hoặc Excel (TSV)
- **Xuất Excel** — nút "Xuất Excel" → SaveFileDialog → file .xlsx
- **In / PDF** — nút "In/PDF" → `window.print()` với CSS @media print
- **Tìm kiếm** — ô filter trên toolbar, lọc tên theo thời gian thực
- **Undo / Redo** — `Ctrl+Z` / `Ctrl+Y` hoặc `Ctrl+Shift+Z`, tối đa 50 bước
- **Cột hôm nay** — cột ngày hiện tại được highlight tự động
- **Sắp xếp hàng** — click header "Tên" / "Công" / "Lương" để sort asc/desc
- **Màu công trường** — nút toggle show/hide màu nền theo công trường
- **Drag-fill** — kéo fill handle (góc ô đang focus) để sao chép hệ số sang nhiều ô

---

## Phím tắt

### Toàn ứng dụng
| Phím | Chức năng |
|------|-----------|
| `F1` | Mở hướng dẫn phím tắt (nội dung theo tab đang mở) |
| `Ctrl + Scroll` | Phóng to / thu nhỏ (0.5× – 2.0×), anchor tại con trỏ |

### Tab Bảng tổng
| Phím | Chức năng |
|------|-----------|
| `←` `→` `↑` `↓` | Di chuyển ô |
| `Tab` | Sang ô kế tiếp |
| `Enter` | Xác nhận / xuống dòng dưới |
| `Escape` | Bỏ chọn |
| `0` | Hệ số 0 (nghỉ) |
| `1` | Hệ số 1 (1 ngày) |
| `2` | Hệ số 1.5 |
| `3` | Hệ số 2 (OT) |
| `Delete` / `Backspace` | Xóa công |
| `Shift + Click` | Chọn vùng liên tiếp |
| `Ctrl + Click` | Thêm/bỏ ô vào vùng chọn |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Ctrl+V` | Paste bảng từ clipboard (Google Sheets / Excel) |
| Right-click header ngày | Menu: Fill / Clear / Copy ngày trước |
| Kéo fill handle | Drag-fill sao chép hệ số sang ô liền kề |

### In hướng dẫn
Trong dialog F1, nhấn nút **Máy in** để in trang phím tắt.

---

## Zoom
- Mỗi tab lưu mức zoom riêng vào localStorage.
- Khi zoom khác 1×, nút **Reset** xuất hiện trên toolbar — click để về mặc định.

---

## Xuất PDF
Tab Cá nhân → nút **Xuất PDF** → chọn đường dẫn lưu.

## Sao lưu / Khôi phục
Menu → **Sao lưu DB** / **Khôi phục DB** để sao lưu file SQLite.
