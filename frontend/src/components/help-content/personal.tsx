export function HelpContentPersonal() {
  return (
    <>
      <section>
        <h3>Tổng quan</h3>
        <p>Tab Cá nhân giúp anh theo dõi công và lương của riêng mình theo từng tháng. Mỗi ngày anh chấm 1 lần, hệ thống tự tính tổng công, tổng lương, trừ tạm ứng.</p>
      </section>
      <section>
        <h3>Các thao tác cơ bản</h3>
        <ul>
          <li><b>Chọn tháng:</b> bấm vào tháng/năm ở Header để xem tháng khác.</li>
          <li><b>Chấm công:</b> bấm "Chấm công hôm nay" hoặc click vào ngày trong bảng, nhập hệ số (1 = 1 công, 0.5 = nửa công, 1.5 = công rưỡi).</li>
          <li><b>Chọn công trường:</b> mỗi ngày có thể gán 1 công trường khác nhau.</li>
          <li><b>Ghi chú:</b> thêm note cho ngày cụ thể (vd: "về sớm", "tăng ca").</li>
          <li><b>Tạm ứng:</b> panel bên phải để ghi lại các lần anh nhận tiền trước trong tháng.</li>
          <li><b>Xuất PDF:</b> bấm "Xuất PDF" để lưu bảng công tháng này.</li>
        </ul>
      </section>
      <section>
        <h3>Phím tắt & mẹo</h3>
        <ul>
          <li><kbd>Ctrl</kbd> + lăn chuột → phóng to/thu nhỏ bảng công.</li>
          <li><kbd>F1</kbd> → mở hướng dẫn (đang xem).</li>
          <li><kbd>Tab</kbd> / <kbd>Enter</kbd> → di chuyển giữa các ô.</li>
          <li>Sao chép ngày trước: bấm "Copy ngày trước" để lặp lại chấm công gần nhất.</li>
        </ul>
      </section>
      <section>
        <h3>Câu hỏi thường gặp</h3>
        <dl>
          <dt>Hệ số là gì?</dt>
          <dd>Là số công của ngày đó. 1 = nguyên ngày, 0.5 = nửa ngày, 1.5 = có tăng ca... Hệ số × lương ngày công trường = tiền ngày đó.</dd>
          <dt>Quên chấm ngày cũ thì sao?</dt>
          <dd>Click vào ô ngày đó trong bảng, nhập bình thường. Không bắt buộc chấm theo thứ tự.</dd>
          <dt>Công chưa có tiền là gì?</dt>
          <dd>Là công ở công trường chưa nhập đơn giá. Vẫn tính vào tổng công nhưng không cộng vào lương.</dd>
        </dl>
      </section>
    </>
  )
}
