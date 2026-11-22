# Bệnh viện không ngủ — Hệ thống thần y

Web đọc truyện xuyên không/hệ thống kết hợp Nhi khoa Y6. Ba khoa mở đầu: Tiêu hóa, Hô hấp, Tim mạch. Truyện, tình huống, bệnh án là hư cấu; thông tin học tập liên kết nguồn tham khảo. Dùng GitHub Pages (static HTML/CSS/JS), lưu XP, trang đọc, bookmark trong localStorage. Có dark mode, font tùy chỉnh, đọc thành tiếng qua giọng máy. Dữ liệu cũ nằm ở nhánh backup-before-nhi-story-2026-11-22.

## Nghe dưới nền

Nghe bằng MP3 HTMLAudio và Media Session API, có nút trong trang đọc, phát/tạm dừng, ±15 giây, đổi tốc độ, tự chuyển tập, điều khiển màn hình khóa và lưu vị trí nghe. Máy Android hỗ trợ phát media dưới nền sẽ tiếp tục phát khi tắt màn hình hoặc chuyển app. Nếu chưa có MP3, có thể dùng Chrome > Nghe trang này (tùy trình duyệt).

Tệp MP3 tạo bởi workflow `.github/workflows/generate-audiobook.yml` với `scripts/generate_audio.py` (neural TTS nếu dịch vụ hoạt động; fallback offline) và nằm trong thư mục `audio/`. Giọng và chất lượng có thể thay đổi theo dịch vụ.
