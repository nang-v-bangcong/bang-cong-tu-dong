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
          <li><b>Gõ 0</b> hoặc <kbd>Delete</kbd> / <kbd>Backspace</kbd> → xoá ô.</li>
          <li><b>Enter</b> → lưu, xuống ô dưới.</li>
          <li><b>Tab</b> → lưu, sang ô phải.</li>
          <li><b>Esc</b> → huỷ thay đổi.</li>
          <li>Cột "Công" / "Lương" bên phải tự tính theo dòng.</li>
        </ul>
      </section>
      <section>
        <h3>Kéo điền dải (drag-fill)</h3>
        <ul>
          <li>Focus 1 ô → xuất hiện <b>chấm xanh góc phải dưới</b>.</li>
          <li>Nhấn giữ chấm xanh, kéo sang ô khác → điền cả <b>hệ số + công trường</b> từ ô nguồn cho cả vùng.</li>
          <li>Kéo dọc, ngang, hoặc theo chéo để điền vùng chữ nhật.</li>
          <li><kbd>Esc</kbd> khi đang kéo → huỷ.</li>
        </ul>
      </section>
      <section>
        <h3>Dán từ Excel / Google Sheets</h3>
        <ul>
          <li>Copy vùng dữ liệu từ Excel (Ctrl+C).</li>
          <li>Sang app, click vào ô <b>bắt đầu</b> (góc trên-trái), bấm <kbd>Ctrl</kbd>+<kbd>V</kbd>.</li>
          <li>App dán cả vùng, mỗi ô ghi hệ số riêng. Bỏ qua ô ngoài bảng hoặc không hợp lệ.</li>
          <li>Ghi chú và công trường cũ của ô đích được giữ nguyên.</li>
        </ul>
      </section>
      <section>
        <h3>Gán công trường</h3>
        <ul>
          <li><b>Double-click</b> vào ô → mở popup chọn công trường.</li>
          <li>Chấm màu dưới góc ô = màu cố định cho mỗi công trường (bật/tắt bằng nút "Màu ô" trên toolbar).</li>
          <li><b>Chọn nhiều ô để gán hàng loạt:</b></li>
          <li>• <kbd>Shift</kbd>+click → chọn vùng chữ nhật từ ô trước đến ô hiện tại.</li>
          <li>• <kbd>Ctrl</kbd>+click → thêm/bớt từng ô.</li>
          <li>• Sau khi chọn, thanh dưới cùng hiện "Gán công trường" → chọn 1 phát gán tất cả.</li>
        </ul>
      </section>
      <section>
        <h3>Thao tác theo ngày (cột)</h3>
        <ul>
          <li>Phải chuột vào số ngày ở header → mở menu: <b>chấm cả cột</b>, <b>sao chép từ ngày trước</b>, <b>xoá cả cột</b>.</li>
          <li>"Chấm cả cột" → áp dụng 1 hệ số + công trường cho tất cả người ngày đó.</li>
          <li>"Sao chép ngày trước" → copy nguyên ngày N-1 sang ngày N.</li>
        </ul>
      </section>
      <section>
        <h3>Hoàn tác / Làm lại</h3>
        <ul>
          <li><kbd>Ctrl</kbd>+<kbd>Z</kbd> → hoàn tác thao tác gần nhất.</li>
          <li><kbd>Ctrl</kbd>+<kbd>Y</kbd> hoặc <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> → làm lại.</li>
          <li>Lịch sử tối đa ~50 bước, áp dụng cho mọi thay đổi ô: chấm, xoá, điền dải, dán, gán công trường, chấm cả cột.</li>
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
          <li><kbd>Delete</kbd> / <kbd>Backspace</kbd> → xoá ô (hoặc gõ 0).</li>
          <li><kbd>Ctrl</kbd>+<kbd>C</kbd> / <kbd>V</kbd> → copy/paste.</li>
          <li><kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Y</kbd> → hoàn tác/làm lại.</li>
          <li><kbd>Ctrl</kbd> + lăn chuột → zoom theo con trỏ (50%-200%). Góc trái dưới hiện % và nút reset.</li>
          <li><kbd>F1</kbd> → mở hướng dẫn.</li>
          <li><kbd>Esc</kbd> → bỏ chọn / huỷ edit / huỷ kéo điền.</li>
        </ul>
      </section>
      <section>
        <h3>Tìm kiếm & sắp xếp</h3>
        <ul>
          <li>Ô tìm tên trên toolbar → lọc theo tên (không phân biệt hoa thường).</li>
          <li>Dropdown "Sắp xếp" → theo Tên / Công / Lương; mũi tên bên cạnh → đảo tăng/giảm.</li>
        </ul>
      </section>
      <section>
        <h3>Xuất Excel / PDF</h3>
        <ul>
          <li>Nút <b>Excel</b> → xuất cả bảng ra file .xlsx.</li>
          <li>Nút <b>PDF</b> → xuất bảng tổng thành PDF.</li>
        </ul>
      </section>
      <section>
        <h3>Câu hỏi thường gặp</h3>
        <dl>
          <dt>Sửa ở Bảng tổng có ảnh hưởng tab Nhóm?</dt>
          <dd>Có. Cùng 1 nguồn dữ liệu, sửa ô ở đây = sửa trong tab Nhóm.</dd>
          <dt>Ghi chú ngày khác ghi chú cá nhân?</dt>
          <dd>Khác. Ghi chú ngày (ở đây) là chung cho cả team. Ghi chú cá nhân ở tab Cá nhân/Nhóm là của riêng từng ngày chấm công.</dd>
          <dt>Kéo điền có ghi đè ghi chú cũ không?</dt>
          <dd>Không. Chỉ ghi đè hệ số và công trường. Ghi chú của ô đích được giữ nguyên.</dd>
          <dt>Mức zoom được nhớ ở đâu?</dt>
          <dd>localStorage trình duyệt. Mở app lại giữ nguyên. Mỗi tab lưu riêng.</dd>
          <dt>Gán công trường mà ô chưa có hệ số?</dt>
          <dd>Mặc định gán hệ số = 1 (1 công) cùng lúc. Sửa lại sau nếu cần.</dd>
        </dl>
      </section>
    </>
  )
}
