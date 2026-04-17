export function HelpContentPersonal() {
  return (
    <>
      <section>
        <h3>Tổng quan</h3>
        <p>Tab Cá nhân giúp anh theo dõi công và lương của riêng mình theo từng tháng. Mỗi ngày anh chấm 1 lần, hệ thống tự tính tổng công, tổng lương, trừ tạm ứng.</p>
      </section>
      <section>
        <h3>Lương tính thế nào?</h3>
        <p>Mỗi ngày chấm = hệ số × <b>lương/ngày có hiệu lực</b>. Lương có hiệu lực lấy theo thứ tự:</p>
        <ol>
          <li><b>Lương công trường</b> nếu công trường đó đã nhập lương riêng (ví dụ alba, tăng ca khác mức).</li>
          <li><b>Lương cơ bản của anh</b> (thiết lập ban đầu hoặc sửa sau này bằng icon bút chì) — dùng khi công trường không có lương riêng.</li>
          <li>Nếu cả 2 đều để trống → ngày đó tính là "chưa có tiền" (vẫn lưu công, chỉ không cộng tiền).</li>
        </ol>
        <p>Ví dụ: anh là thợ 150,000₩/ngày. Đa số công trường không nhập lương (dùng 150k chung). Alba ghi riêng 200,000₩ → hôm nào vào alba, tiền ngày đó = 200k.</p>
      </section>
      <section>
        <h3>Các thao tác cơ bản</h3>
        <ul>
          <li><b>Chọn tháng:</b> bấm vào tháng/năm ở Header để xem tháng khác.</li>
          <li><b>Chấm công:</b> bấm "Chấm công hôm nay" hoặc click vào ngày trong bảng, nhập hệ số (1 = 1 công, 0.5 = nửa công, 1.5 = công rưỡi).</li>
          <li><b>Chọn công trường:</b> mỗi ngày có thể gán 1 công trường khác nhau.</li>
          <li><b>Ghi chú:</b> thêm note cho ngày cụ thể (vd: "về sớm", "tăng ca").</li>
          <li><b>Xoá ngày:</b> nhập hệ số 0 (hoặc bấm icon thùng rác cuối hàng) → xoá chấm công ngày đó.</li>
          <li><b>Copy ngày trước:</b> nút nhanh để lặp lại ngày gần nhất đã chấm.</li>
          <li><b>Tạm ứng:</b> panel bên phải ghi lại các lần nhận tiền trước trong tháng.</li>
          <li><b>Sửa tên / lương:</b> icon bút chì cạnh tên để đổi tên và lương/ngày cơ bản.</li>
          <li><b>Xuất PDF:</b> bấm "Xuất PDF" để lưu bảng công tháng này (có tiếng Việt).</li>
        </ul>
      </section>
      <section>
        <h3>Các nút trên Header</h3>
        <ul>
          <li><b>Cá nhân / Nhóm / Bảng tổng:</b> chuyển tab.</li>
          <li><b>Tải lại dữ liệu</b> (icon xoay): refresh bảng nếu nghi ngờ lệch.</li>
          <li><b>Lịch sử thay đổi</b> (icon đồng hồ): xem audit log các thao tác đã làm.</li>
          <li><b>Quản lý nơi làm việc</b> (icon toà nhà): thêm/sửa/xoá công trường và đơn giá.</li>
          <li><b>Sao lưu</b> (icon mũi tên xuống): lưu file .db backup ra thư mục bất kỳ.</li>
          <li><b>Khôi phục</b> (icon mũi tên lên): mở file .db backup đã lưu (ghi đè DB hiện tại).</li>
          <li><b>Hướng dẫn</b> (dấu ?): mở dialog này. Cũng bấm được bằng <kbd>F1</kbd>.</li>
          <li><b>Dark mode</b> (mặt trời/trăng): đổi giao diện sáng/tối.</li>
        </ul>
      </section>
      <section>
        <h3>Phím tắt & mẹo</h3>
        <ul>
          <li><kbd>Ctrl</kbd> + lăn chuột → phóng to/thu nhỏ bảng công.</li>
          <li><kbd>F1</kbd> → mở hướng dẫn.</li>
          <li><kbd>Tab</kbd> / <kbd>Enter</kbd> → di chuyển giữa các ô.</li>
          <li>Quên chấm ngày cũ? Click vào ngày đó trong bảng, nhập bình thường — không bắt buộc theo thứ tự.</li>
          <li>Thoát app có hỏi xác nhận trước khi đóng.</li>
        </ul>
      </section>
      <section>
        <h3>Câu hỏi thường gặp</h3>
        <dl>
          <dt>Hệ số là gì?</dt>
          <dd>Là số công của ngày đó. 1 = nguyên ngày, 0.5 = nửa ngày, 1.5 = có tăng ca... Hệ số × lương có hiệu lực (xem mục "Lương tính thế nào?") = tiền ngày đó.</dd>
          <dt>Công chưa có tiền là gì?</dt>
          <dd>Là công mà cả lương công trường lẫn lương cơ bản của anh đều = 0 (ví dụ học việc chưa định lương). Vẫn tính vào tổng công nhưng không cộng vào lương.</dd>
          <dt>Sao lưu để ở đâu cho an toàn?</dt>
          <dd>Khuyến nghị lưu lên USB, Google Drive, hoặc OneDrive định kỳ. File .db chỉ cần copy là backup xong.</dd>
          <dt>Lỡ xoá ngày rồi làm sao?</dt>
          <dd>Tab Cá nhân chưa có Undo. Chỉ tab Bảng tổng có Ctrl+Z. Nếu đã lỡ, nhập lại hoặc khôi phục từ file backup gần nhất.</dd>
        </dl>
      </section>
    </>
  )
}
