# Chạy SmartMeal trên điện thoại — phiên 24/10/2026

Code đang chạy: `main` tại `9743be8`. Điện thoại có thể dùng 4G/5G hoặc Wi-Fi khác mạng máy tính.

## Mở bằng Expo Go

1. Mở **Camera iPhone**, quét QR bên dưới và chọn mở trong **Expo Go**. Expo Go cần hỗ trợ SDK 57 của dự án.
2. Nếu mở lại dự án cũ bị lỗi 530 hoặc không kết nối được, quay về trang chủ Expo Go và quét **QR mới**; không dùng lại địa chỉ Cloudflare của phiên trước.
3. Chờ tải bundle lần đầu. Đăng nhập email/mật khẩu để thử các chức năng cá nhân.

![QR mở SmartMeal trong Expo Go](SmartMeal_Expo_QR_2026-10-24.png)

Địa chỉ Expo Go:

```text
exps://wheat-codes-unless-angle.trycloudflare.com
```

| Thành phần | Địa chỉ |
|---|---|
| Metro/Expo công khai | https://wheat-codes-unless-angle.trycloudflare.com |
| API công khai | https://advances-nova-nearly-bid.trycloudflare.com/api |
| Swagger kiểm tra API | https://advances-nova-nearly-bid.trycloudflare.com/swagger |
| Admin Web trên máy tính | http://localhost:3000 |

Địa chỉ HTTPS Metro ở trên là máy chủ phát triển cho Expo. Hướng dẫn này dùng Expo Go, chưa xác minh giao diện Expo Web trên Safari.

## Cấu hình và tiến trình đang chạy

- Backend/PostgreSQL/Admin: Docker Compose ở thư mục gốc.
- API: `localhost:5000` → tunnel Cloudflare API.
- Metro: `localhost:443` (HTTP nội bộ) → tunnel Cloudflare HTTPS.
- `frontend/SmartMealMobile/.env`: `EXPO_PUBLIC_API_URL` trỏ tới API công khai ở trên.
- Expo được khởi động với `EXPO_PACKAGER_PROXY_URL` là HTTPS Metro công khai để manifest, bundle và asset không trỏ về IP LAN.
- Nhật ký và trạng thái cục bộ: `frontend/SmartMealMobile/.expo/run-2026-10-24/` và `.expo/cloudflare-session.json` (được Git bỏ qua, không chứa trong tài liệu commit).

Máy tính cần giữ hoạt động, có Internet, Docker, Expo và hai tiến trình `cloudflared` phải tiếp tục chạy. Đây là **Quick Tunnel tạm thời**: dừng/tạo lại tunnel có thể đổi địa chỉ. QR này chỉ dùng cho phiên hiện tại; sau khi tạo tunnel mới phải cập nhật API URL, proxy URL và QR tương ứng.

## Kiểm tra nhanh khi gặp lỗi

```powershell
# Tại thư mục gốc SmartMeal
docker compose ps
docker compose logs --tail 40 backend-api

# Kiểm tra Metro và API trên máy
curl.exe -I http://localhost:443
curl.exe -I http://localhost:5000/swagger/index.html
```

- **530/Cloudflare Tunnel error:** kiểm tra tunnel còn chạy và dùng đúng hostname của phiên này.
- **Could not connect to development server:** kiểm tra Metro, manifest và bundle qua hostname Expo công khai; quét lại QR mới.
- **App mở nhưng không tải dữ liệu:** kiểm tra API công khai, Docker và giá trị `EXPO_PUBLIC_API_URL`; thay API URL cần khởi động lại Expo/xóa cache.
- Trên Expo Go hiện chưa đọc Apple Health/Health Connect; native notifications bị bỏ qua theo code. Google Sign-In cũng được ẩn khi native service không sẵn sàng; dùng email/mật khẩu cho buổi demo này.

Kết quả xác minh tại máy: manifest và bundle iOS qua tunnel HTTP 200; bundle chứa API URL mới; Swagger và truy vấn công thức qua tunnel HTTP 200. Chưa thay cho kiểm thử trực tiếp các thao tác trên iPhone.
