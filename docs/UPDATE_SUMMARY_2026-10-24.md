# Cập nhật SmartMeal ngày 24/10/2026

## Mốc code

- Nhánh: `main`, remote `origin` — `https://github.com/DamThanQuy/SmartMeal.git`.
- Trước cập nhật: `bd738b69b744578c41bb41d9acf46d14c91e7691`.
- Sau cập nhật: `9743be8125e75bcc47be9ba0284a5aa09916e6af`.
- Lệnh: `git fetch --prune origin`, sau đó `git pull --ff-only origin main`.
- Kết quả: fast-forward, không xung đột; **26 commit**, trong đó 20 commit không phải merge và 6 commit merge; 93 file thay đổi theo diff giữa hai mốc.
- File sơ đồ cục bộ trong `docs/diagrams/` được giữ nguyên. Không thực hiện commit hoặc push trong lần chạy này.

## Những gì mới so với bản trước

| Nhóm | Thay đổi thực tế | Commit tham chiếu |
|---|---|---|
| Web Admin | Thêm ứng dụng React/Vite tại `frontend/admin-web`, chạy bằng Docker ở cổng 3000; quản lý người dùng, công thức, gói/transaction, thử thách/phần thưởng, hoạt động hệ thống, doanh thu và tương tác. | `666ed0a` |
| API quản trị | Thêm `AdminController` và DTO; xác thực quản trị, quản lý dữ liệu, báo cáo. Các endpoint quản trị yêu cầu role Admin. Bổ sung tài khoản Admin seed theo cấu hình môi trường. | `666ed0a` |
| Bảo mật/nghiệp vụ Admin | Bổ sung `TokenVersion`, kiểm tra trạng thái/vai trò tài khoản từ DB khi xác thực JWT, thu hồi phiên khi thay đổi tài khoản; sửa các xử lý quản trị và trạng thái thanh toán. | `e255ccf` |
| UI Admin | Phân trang, sửa trang đăng nhập, xử lý lỗi và các màn quản trị. | `c74fccf` |
| Nhập công thức từ Excel | Thêm modal nhập Excel trên Admin, kiểm tra dữ liệu và endpoint bulk import; dữ liệu seed công thức được tách sang JSON. | `b2d86b0` |
| Chất lượng dữ liệu món | Sửa ánh xạ dị ứng cho nguyên liệu, bổ sung nguyên liệu còn thiếu, điều chỉnh tag `quick`; migration `FixExpandedRecipeSeedData` sửa dữ liệu phù hợp trên DB đã chạy, không chỉ seed DB mới. | `2694b64`, `4667cfa` |
| Mobile mở app | Không chặn render trong lúc font tải; thêm cơ chế ẩn splash dự phòng sau 3 giây để giảm treo màn khởi động. | `3bf9673` |
| Avatar Dashboard | Dùng chung `UserAvatar`, phản ánh ảnh hồ sơ thay vì chỉ chữ viết tắt. | `62d57a8` |
| Danh sách đi chợ | Xếp chuối, táo, xoài, dâu tây vào nhóm Rau củ; ưu tiên nhóm này để tránh nhận “chuối tiêu” thành gia vị. | `bb1ab97` |
| Kiểm thử | Thêm test Web Admin/API quản trị, test hồi quy ThemeProvider, haptics, recipe mapper/API/filter, grocery và chất lượng dữ liệu seed; có hai báo cáo test ngày 22/10. | `de9acce`, `ac68e03`, `f89b8ef`, `ead813a` |
| CI/CD | Sửa lockfile để npm ci dùng được; thêm workflow CD chạy trên self-hosted Windows runner `tkm2`, build lại backend và kiểm tra Swagger; sửa tương thích PowerShell/docker-compose. Workflow là cấu hình trong repo, chưa xác minh lần deploy từ máy này. | `d9db4b0`, `92a6c98`, `fe56a1a`, `8712b8e`, `6df4c29` |
| Tài liệu | Thêm sơ đồ use case và kiến trúc hệ thống trong `docs`. | `0a69156`, `aa7ad93` |

Lưu ý: sơ đồ cục bộ `docs/diagrams/SmartMeal_Use_Cases.drawio` tạo theo mốc 21/10 chưa bao gồm Web Admin mới. File này không được sửa trong lần cập nhật/chạy app.

## Chạy và kiểm tra sau cập nhật

- Khởi động Docker Desktop, chạy `docker compose up -d --build`: build thành công backend và Admin Web; PostgreSQL healthy, API và Admin đang chạy.
- Log API xác nhận migration và seed thành công. Không xóa volume/database.
- Mobile sử dụng dependencies hiện có; `package.json` và `package-lock.json` Mobile không đổi giữa hai mốc cập nhật nên không cài lại toàn bộ.
- Expo Go: SDK manifest `57.0.0`, Metro ở cổng 443; backend ở cổng 5000. Hai tiến trình Cloudflare riêng cho Metro và API.
- Manifest iOS qua Cloudflare trả HTTP 200 và trỏ bundle đúng hostname công khai. Bundle iOS trả HTTP 200, dung lượng 18.153.183 byte ở lần kiểm tra đầu tiên và chứa API URL mới.
- Swagger qua Cloudflare HTTP 200; API recipes HTTP 200, truy vấn thử trả 3 công thức. Admin tại `http://localhost:3000` HTTP 200.
- Chạy 6 test suite Mobile: `FridgeScreen`, `ThemeProvider`, `groceryAggregation`, `recipeFilters`, `recipeService.api`, `haptics`: **6/6 suite, 66/66 test pass**. ThemeProvider có cảnh báo React `act(...)`; test vẫn pass.
- Chưa kiểm thử thao tác trực tiếp trên iPhone, chưa chạy toàn bộ test backend/Admin và chưa gọi AI hoặc thực hiện giao dịch thanh toán trong lần kiểm tra này.

Hướng dẫn và QR điện thoại: [PHONE_DEMO_2026-10-24.md](run/PHONE_DEMO_2026-10-24.md).

Đóng góp của An-251: [AN_251_CONTRIBUTIONS_2026-10-24.md](AN_251_CONTRIBUTIONS_2026-10-24.md).
