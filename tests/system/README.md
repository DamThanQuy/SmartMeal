# SmartMeal — một lệnh kiểm thử toàn hệ thống

Từ **thư mục gốc SmartMeal**, chạy:

```powershell
npm run test:e2e
```

Yêu cầu có **Node.js 24.3 trở lên** và **Docker Desktop / Docker Compose v2**. Không cần cài .NET SDK trên Windows: bộ `SmartMeal.Tests` chạy trong container SDK .NET 9. Lần đầu cần Internet để tải package, browser và image Docker. Runner tự kiểm tra dependencies; nếu thiếu hoặc không hợp lệ sẽ dùng `npm ci` từ lockfile.

## Sửa lỗi phiên bản Node trên Windows

Nếu lệnh báo `Node >=24.3 is required; found 22.19.0`, runner đã dừng trước khi chạy các bộ kiểm thử. Kiểm tra phiên bản và đường dẫn Node mà PowerShell đang chọn:

```powershell
node --version
node -p process.execPath
Get-Command node -All
```

Cài hoặc chọn **bản Node.js 24 LTS mới nhất** từ [trang Node.js chính thức](https://nodejs.org/en/download), sau đó đóng và mở lại PowerShell (hoặc ứng dụng đang mở terminal). Nếu đã cài nhiều bản Node, chọn lại bản 24 trong công cụ quản lý phiên bản hoặc đưa thư mục của bản đó lên trước trong `PATH`. Không hạ kiểm tra phiên bản trong runner: dependencies của Admin cũng yêu cầu Node mới hơn bản 22.19.0.

Chạy lại hai lệnh kiểm tra phiên bản và đường dẫn ở trên, rồi chạy:

```powershell
$env:SMARTMEAL_E2E_SLOWMO = '600'
npm run test:e2e -- --headed
```

## Lệnh tự làm những gì?

1. Kiểm tra Node, Docker và các dependencies của mobile, admin, browser tests; cài Chromium và WebKit nếu cần.
2. Tạo lượt chạy riêng trong `.e2e-results/<run-id>` và dựng Compose project **`smartmeal-e2e`** dùng PostgreSQL tạm.
3. Chạy **toàn bộ** `backend/SmartMeal.Tests/SmartMeal.Tests.csproj` với PostgreSQL thật; lưu kết quả TRX.
4. Chạy toàn bộ mobile Jest và Admin Vitest, bật các bộ **live service tests** bằng `LIVE_API_URL` trỏ tới API QA. Các service, mapper và HTTP client của FE gọi BE thật.
5. Kiểm tra TypeScript/lint, build Admin và export mobile web với cấu hình API QA.
6. Chạy browser E2E bằng Playwright: Admin trên Chromium, mobile web trên Chromium và WebKit ở viewport điện thoại. Test đăng nhập và thao tác UI thật; các luồng ghi dữ liệu kiểm tra lại bằng API hoặc tải lại trang.
7. Chụp ảnh mỗi browser test; giữ trace/video khi lỗi; sinh báo cáo Markdown, JSON, HTML và log.
8. Dừng các tiến trình QA do lượt chạy tạo ra, dọn database QA và trả **exit code 0 khi mọi bước đạt**, **khác 0 khi có bước lỗi hoặc bị chặn**.

Các bước độc lập vẫn được chạy khi một bộ test lỗi. Báo cáo cũng được tạo khi có lỗi khởi động, build hoặc kiểm thử; không coi bước chưa chạy là PASS. Khóa lượt chạy ngăn hai lệnh đồng thời sử dụng cùng project QA.

## Xem báo cáo và ảnh

- Báo cáo: `docs/test-reports/SYSTEM_E2E_FE_BE_ADMIN_<YYYY-MM-DD>.md` theo giờ Việt Nam.
- Ảnh PNG thật, được liên kết và nhúng vào báo cáo: `docs/test-reports/assets/system-e2e-<run-id>/`.
- Log, kết quả JSON/TRX, HTML report, trace/video: `.e2e-results/<run-id>/`.
- Bản lưu báo cáo của từng lượt cũng nằm trong thư mục raw kết quả; chạy lại cùng ngày cập nhật báo cáo ngày đó.

Mở HTML report tương tác (thay `<run-id>` bằng thư mục được in cuối lệnh):

```powershell
node tests/system/node_modules/playwright/cli.js show-report .e2e-results/<run-id>/playwright-report
```

## Các tùy chọn

Hiện cửa sổ browser trong lúc chạy:

```powershell
npm run test:e2e -- --headed
```

Làm chậm mỗi thao tác (mili giây) để dễ theo dõi khi bật `--headed`:

```powershell
$env:SMARTMEAL_E2E_SLOWMO=600; npm run test:e2e -- --headed
```

Cài lại toàn bộ dependencies từ lockfile:

```powershell
npm run test:e2e -- --fresh
```

Chỉ kiểm tra logic tổng hợp báo cáo và trạng thái kết quả:

```powershell
npm run test:e2e:runner
```

## Môi trường dữ liệu

| Thành phần QA | Địa chỉ |
|---|---|
| API ASP.NET | `http://127.0.0.1:5001` |
| Admin | `http://127.0.0.1:3001` |
| Mobile web build | `http://127.0.0.1:8082` |
| PostgreSQL | Chỉ trong Docker network QA; dữ liệu ở tmpfs |

QA dùng tài khoản, mật khẩu và khóa ký **mẫu dành riêng cho test**, không nạp `backend/.env`. Backend tests sao chép source vào vùng làm việc container, loại `.env`, `bin`, `obj`; không ghi bản build test lên source của host. Runner chỉ dọn Compose project `smartmeal-e2e` và các tiến trình do nó tạo. Nếu một cổng QA đã được chương trình khác dùng, bước khởi động sẽ báo lỗi thay vì dừng chương trình đó.

## Phạm vi và giới hạn

- Backend integration, FE live-service và browser E2E là ba lớp bằng chứng khác nhau; báo cáo ghi số lượng và kết quả riêng.
- **Mobile web Chromium/WebKit không phải ứng dụng native chạy trên iPhone.** Bộ này không kiểm tra camera, microphone, push native, quyền iOS hoặc khả năng mở app trong Expo Go trên thiết bị thật.
- Gemini dùng demo được gắn cờ; SMTP không gửi mail ra ngoài; thanh toán chỉ kiểm tra nghiệp vụ nội bộ bằng khóa giả. Không thực hiện chuyển tiền hay khẳng định đã kiểm thử nhà cung cấp bên ngoài.
- Ảnh chụp là bằng chứng trạng thái giao diện; đây không phải bộ so sánh ảnh chuẩn để kết luận thiết kế đúng từng pixel.
- Không thực hiện load test, kiểm thử xâm nhập hoặc chứng nhận đã phủ mọi tình huống nghiệp vụ.

## Cấu trúc

- `run.mjs`: điều phối, khởi động/dọn QA, exit code và log.
- `docker-compose.e2e.yml`: API, PostgreSQL và SDK container chạy `SmartMeal.Tests`.
- `playwright.config.mjs`: browser projects, screenshot, trace và reporter.
- `specs/admin.spec.mjs`, `specs/mobile.spec.mjs`: các ca kiểm thử giao diện và lưu dữ liệu thật.
- `report.mjs`: đọc JSON/TRX, tổng hợp lỗi/bỏ qua, sao chép ảnh và tạo báo cáo.
- `report.test.mjs`: kiểm tra logic tổng hợp để tránh báo xanh khi thiếu bằng chứng hoặc có bước lỗi.
