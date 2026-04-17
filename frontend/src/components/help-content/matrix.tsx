export function HelpContentMatrix() {
  return (
    <>
      <section>
        <h3>Tổng quan</h3>
        <p>Tab Bảng tổng là bảng kiểu Excel: hàng là người, cột là ngày trong tháng. Phù hợp nhập liệu nhanh cho cả team khi cuối ngày chấm công. Dữ liệu dùng chung với tab Nhóm — sửa ở đâu cũng đồng bộ.</p>
      </section>
      <section>
        <h3>Nhập hệ số công</h3>
        <ul>
          <li><b>Click</b> vào ô → ô được focus (viền xanh).</li>
          <li><b>Gõ số</b> (0-9, dấu . hoặc ,) → tự động vào chế độ sửa.</li>
          <li><b>Enter</b> → lưu, xuống ô dưới.</li>
          <li><b>Tab</b> → lưu, sang ô phải.</li>
          <li><b>Esc</b> → huỷ thay đổi.</li>
          <li>Cột "Công" / "Lương" bên phải tự tính theo dòng.</li>
        </ul>
      </section>
      <section>
        <h3>Gán công trường</h3>
        <ul>
          <li><b>Double-click</b> vào ô → mở popup chọn công trường.</li>
          <li>Chấm đỏ/xanh/vàng dưới góc ô = màu cố định cho mỗi công trường.</li>
          <li><b>Chọn nhiều ô để gán hàng loạt:</b></li>
          <li>• <kbd>Shift</kbd>+click → chọn vùng chữ nhật từ ô trước đến ô hiện tại.</li>
          <li>• <kbd>Ctrl</kbd>+click → thêm/bớt từng ô.</li>
          <li>• Sau khi chọn, thanh dưới cùng hiện "Gán công trường" → chọn 1 phát gán tất cả.</li>
        </ul>
      </section>
      <section>
        <h3>Ghi chú theo ngày</h3>
        <p>Hàng "Ghi chú" ngay dưới header là ghi chú chung cho ngày đó (vd: "Lễ 30/4", "Mưa lớn nghỉ"). Khác với ghi chú cá nhân từng ô — cái này nằm ở tab Cá nhân/Nhóm, không hiện trong Bảng tổng.</p>
        <ul>
          <li>Click vào ô ghi chú → textarea mở ra.</li>
          <li><kbd>Ctrl</kbd>+<kbd>Enter</kbd> → lưu nhanh.</li>
          <li>Xoá sạch chữ → note bị xoá hẳn khỏi DB.</li>
        </ul>
      </section>
      <section>
        <h3>Phím tắt</h3>
        <ul>
          <li><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> → di chuyển focus.</li>
          <li><kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd> → sang phải / trái.</li>
          <li><kbd>Enter</kbd> / <kbd>Shift</kbd>+<kbd>Enter</kbd> → xuống / lên.</li>
          <li><kbd>Ctrl</kbd> + lăn chuột → zoom theo con trỏ (50%-200%). Góc trái dưới hiện % và nút reset.</li>
          <li><kbd>F1</kbd> → mở hướng dẫn.</li>
          <li><kbd>Esc</kbd> → bỏ chọn / huỷ edit.</li>
        </ul>
      </section>
      <section>
        <h3>Câu hỏi thường gặp</h3>
        <dl>
          <dt>Sửa ở Bảng tổng có ảnh hưởng tab Nhóm?</dt>
          <dd>Có. Cùng 1 nguồn dữ liệu, sửa ô ở đây = sửa trong tab Nhóm.</dd>
          <dt>Ghi chú ngày khác ghi chú cá nhân?</dt>
          <dd>Khác. Ghi chú ngày (ở đây) là chung cho cả team. Ghi chú cá nhân ở tab Cá nhân/Nhóm là của riêng từng ngày chấm công.</dd>
          <dt>In bảng này ra giấy?</dt>
          <dd>Chưa hỗ trợ. Dùng tab Cá nhân/Nhóm để xuất PDF từng người.</dd>
          <dt>Mức zoom được nhớ ở đâu?</dt>
          <dd>localStorage trình duyệt. Mở app lại giữ nguyên. Mỗi tab lưu riêng.</dd>
          <dt>Gán công trường mà ô chưa có hệ số?</dt>
          <dd>Mặc định gán hệ số = 1 (1 công) cùng lúc. Sửa lại sau nếu cần.</dd>
        </dl>
      </section>
    </>
  )
}
