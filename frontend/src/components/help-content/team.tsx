export function HelpContentTeam() {
  return (
    <>
      <section>
        <h3>Tổng quan</h3>
        <p>Tab Nhóm dành cho cai thầu quản lý nhiều người. Xem chi tiết từng người, tổng công/lương cả nhóm, và chấm công nhóm hàng loạt.</p>
      </section>
      <section>
        <h3>Các thao tác cơ bản</h3>
        <ul>
          <li><b>Thêm người:</b> bấm "Thêm người" → nhập tên → OK.</li>
          <li><b>Chọn người:</b> click tên người ở bảng tổng nhóm để xem bảng công chi tiết bên trái.</li>
          <li><b>Chấm công nhóm:</b> bấm "Chấm công nhóm" → chọn nhiều người cùng 1 ngày → nhập hệ số chung → OK.</li>
          <li><b>Sửa/xoá người:</b> icon bút chì trên bảng, thùng rác bên cạnh tên.</li>
          <li><b>Tạm ứng:</b> panel bên phải lưu tạm ứng riêng mỗi người.</li>
          <li><b>Xuất PDF:</b> xuất bảng công của người đang chọn.</li>
          <li><b>Điều chỉnh tỷ lệ bảng/sidebar:</b> kéo thanh chia giữa.</li>
        </ul>
      </section>
      <section>
        <h3>So với tab Bảng tổng</h3>
        <ul>
          <li><b>Tab Nhóm (ở đây):</b> xem chi tiết từng người, nhập liệu cẩn thận, có sidebar tổng kết công trường.</li>
          <li><b>Tab Bảng tổng:</b> nhập liệu siêu nhanh kiểu Excel cho cả team, có drag-fill, dán từ Excel, Undo/Redo.</li>
          <li>Dữ liệu cùng 1 nguồn — sửa ở đâu cũng đồng bộ.</li>
        </ul>
      </section>
      <section>
        <h3>Phím tắt & mẹo</h3>
        <ul>
          <li><kbd>Ctrl</kbd> + lăn chuột → zoom bảng công bên trái (sidebar giữ nguyên).</li>
          <li><kbd>F1</kbd> → mở hướng dẫn.</li>
          <li>Các nút header (sao lưu, khôi phục, lịch sử, quản lý nơi làm việc, dark mode) — xem mô tả ở tab Cá nhân.</li>
        </ul>
      </section>
      <section>
        <h3>Câu hỏi thường gặp</h3>
        <dl>
          <dt>Xoá người có mất data không?</dt>
          <dd>Có. Xoá người = xoá cả lịch sử chấm công và tạm ứng. Có dialog xác nhận trước khi xoá.</dd>
          <dt>Khi nào nên dùng tab Nhóm, khi nào nên dùng Bảng tổng?</dt>
          <dd>Tab Nhóm để xem chi tiết, sửa cẩn thận. Bảng tổng để nhập nhanh cả team.</dd>
          <dt>Tạm ứng nhóm có không?</dt>
          <dd>Chưa, tạm ứng vẫn ghi từng người.</dd>
          <dt>Xoá công trường đang dùng có được không?</dt>
          <dd>Không. App chặn và báo số ô đang dùng — cần đổi/xoá các ô đó trước.</dd>
        </dl>
      </section>
    </>
  )
}
