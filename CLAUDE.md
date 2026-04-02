# CLAUDE.md - Multiprofile V2 Windows

## Ngôn ngữ giao tiếp

**LUÔN LUÔN trả lời bằng tiếng Việt.** Mọi giải thích, báo cáo, câu hỏi, và tương tác với người dùng đều phải bằng tiếng Việt. Code, tên biến, commit message, và tài liệu kỹ thuật (comments) vẫn viết bằng tiếng Anh.

## Quy tắc quan trọng

- KHÔNG dùng mock/fake data trong tests - phải test thật
- KHÔNG thêm feature thừa ngoài yêu cầu (YAGNI)
- Giữ code đơn giản (KISS), không over-engineer
- Không lặp lại logic (DRY) - trích xuất hàm khi thấy code trùng
- Commit message bằng tiếng Anh, theo conventional commits
- KHÔNG commit file .env, credentials, API keys
- Khi sửa code, đọc file trước rồi mới sửa
- Sau khi sửa code, luôn compile/build để kiểm tra lỗi trước khi báo xong
- File tối đa 200 dòng - nếu vượt thì tách theo chức năng
- KHÔNG tạo file mới kiểu "-v2", "-new", "-enhanced" - sửa trực tiếp file gốc
- Tên file dùng kebab-case (ví dụ: `video-manager.tsx`, `chrome-connector.go`)
- Lưu trữ dữ liệu: JSON hoặc SQLite - KHÔNG dùng database server (PostgreSQL, MongoDB...)

## Tech Stack (bắt buộc)

Go + Wails v2 | React + TypeScript + Tailwind CSS | Zustand | sonner | Lucide React

## Quy tắc làm việc

- Khi tôi yêu cầu TẠO TÍNH NĂNG MỚI hoặc SỬA LỖI PHỨC TẠP (nhiều file): kiểm tra .claude/commands/ và ĐỀ XUẤT lệnh phù hợp kèm GIẢI THÍCH NGẮN tác dụng, CHỜ tôi xác nhận.
- Sửa nhỏ (1-2 file, rõ ràng): làm trực tiếp, không cần lệnh.
