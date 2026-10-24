# Kiểm thử lại toàn bộ Admin SmartMeal — 24/10/2026

## Kết quả sau sửa lỗi

Mốc Git: `main` tại `9743be8`, cộng các thay đổi cục bộ sửa Pagination và luồng nhập Excel trong phiên kiểm thử này. Không commit hoặc push.

| Nhóm kiểm tra | Pass / Tổng | Fail | Skip |
|---|---:|---:|---:|
| Admin Web: component, điều hướng và API client | 184 / 184 | 0 | 0 |
| Backend: toàn bộ `AdminApiTests` trên PostgreSQL thật | 79 / 79 | 0 | 0 |
| Web service gọi API thật, gồm nhập Excel/bulk import | 31 / 31 | 0 | 0 |
| **Tổng test tự động** | **294 / 294** | **0** | **0** |
| Smoke test bản Docker qua cổng 3000 | 15 / 15 | 0 | — |

Hai image Docker `admin-web` và `backend-api` build thành công và đã được cập nhật vào các container đang chạy. Admin hiện tại: **http://localhost:3000**; API: **http://localhost:5000**. JavaScript đang phục vụ sau cập nhật: `/assets/index-yAccszYo.js`.

## Phạm vi chức năng

| Chức năng | Nội dung đã kiểm tra |
|---|---|
| Đăng nhập/phiên | Đăng nhập Admin, sai mật khẩu, từ chối User thường, token không hợp lệ/hết hạn, đăng xuất; backend kiểm tra brute-force lockout và refresh token. |
| Phân quyền | Endpoint quản trị yêu cầu token/quyền Admin, nâng/hạ vai trò, quyền của token đã phát thay đổi theo DB; chặn tự khóa/xóa/hạ quyền tài khoản quản trị đang dùng. |
| Dashboard | Thống kê người dùng, Pro/Free, trạng thái khóa, món ăn, gói và doanh thu; gọi lại khi làm mới. |
| Người dùng | Tìm kiếm/bộ lọc/phân trang, chi tiết hồ sơ, đổi quyền, khóa/gỡ khóa, kiểm duyệt tên/mật khẩu, cấp/hủy Pro, xóa và giữ lịch sử thanh toán. |
| Món ăn | Danh sách/tìm kiếm/bữa ăn/độ khó/phân trang, tạo/sửa/xóa, nguyên liệu/tag/ảnh, trùng tên và dữ liệu không hợp lệ; kiểm tra món xuất hiện đúng trên API Mobile. |
| Nhập Excel | Đọc workbook `.xlsx` trong bộ nhớ bằng thư viện XLSX thật, mapping cột Việt/Anh, preview, lọc dòng thiếu tên/calo, lượng thập phân, thời gian 0 phút, tùy chọn ghi đè, lỗi API/thử lại và khóa nút khi nhập. |
| Bulk import | Thêm nhiều món, giữ nguyên món trùng khi không ghi đè, cập nhật khi bật ghi đè; từ chối batch có độ khó/bữa ăn/calo/khẩu phần/tag quick sai, không lưu món đầu tiên trước khi từ chối; danh sách trống và dòng null. |
| Gói/giao dịch | Giá gói Web khớp Mobile, lọc và phân trang giao dịch, duyệt giao dịch chờ, chặn duyệt lặp, kích hoạt Pro và thông báo nghiệp vụ. |
| Phần thưởng | CRUD thử thách, category hợp lệ, huy hiệu, XP, tăng cấp pet và lịch sử XP. |
| Giám sát | Trạng thái/độ trễ DB, uptime, nhật ký AI/bữa ăn/sự kiện bảo mật; tự làm mới và ngừng timer khi rời màn hình. |
| Báo cáo | Doanh thu theo ngày/khoảng ngày/cổng/gói, CSV trong DOM test; DAU/WAU/MAU, hoạt động người dùng và bảng tương tác. |
| Thành phần chung | Sidebar, Topbar, chuyển đủ các mục menu, thông báo, nút làm mới, form thêm món từ thanh trên, component phân trang. |

## Lỗi phát hiện và đã sửa

| Vấn đề | Trước sửa | Sau sửa / bằng chứng |
|---|---|---|
| Thiếu import `Pagination` | Mở Quản lý món ăn gây `ReferenceError`, trang trắng. | Đã bổ sung import ở phiên sửa trước; toàn bộ test `RecipesView`, `Pagination` và điều hướng App qua lại. |
| File Excel mới rỗng giữ preview cũ | Chọn file hợp lệ rồi chọn file rỗng: nút nhập vẫn bật và còn danh sách file cũ, có nguy cơ nhập nhầm. | Xóa `parsedRecipes` ngay khi chọn file mới. Test trước sửa thất bại, sau sửa pass. |
| Thời gian 0 phút bị thay mặc định | `parseInt(...) || 10/15` biến số 0 thành thời gian mặc định, có thể làm sai tổng thời gian/tag quick. | Chỉ dùng mặc định khi parse ra NaN, giữ 0 phút. Test workbook thật trước sửa fail, sau sửa pass. |
| Bulk import bỏ qua kiểm tra dữ liệu của form đơn lẻ | API nhận độ khó/bữa ăn không hỗ trợ, calo âm, khẩu phần 0 và tag quick cho món lâu hơn 15 phút. | DTO nhập hàng loạt kế thừa `AdminCreateRecipeDto`, dùng chung validation nghiệp vụ trước khi lưu cả batch; chuẩn hóa bữa ăn. Năm test live trước sửa fail, sau sửa pass và không có món lưu dở dang. |
| Dòng null làm API lỗi 500 | Gửi `recipes: [null]` gây lỗi nội bộ. | Kiểm tra null và trả 400. Live test trước sửa fail, sau sửa pass; smoke test cổng 3000 cũng xác nhận 400. |

Các file đã sửa trong lần kiểm thử này:

- `frontend/admin-web/src/components/RecipeExcelImportModal.jsx`.
- `backend/SmartMeal.Application/DTOs/Admin/AdminDTOs.cs`.
- `backend/SmartMeal.API/Controllers/AdminController.cs`.

Bổ sung **7 test UI Excel** tại `frontend/admin-web/src/__tests__/components/RecipeExcelImportModal.test.jsx` và **7 test live bulk import** tại `frontend/admin-web/src/__tests__/live/adminApi.live.test.js`.

## Coverage Admin Web

| Chỉ số | Đã phủ / Tổng | Tỷ lệ |
|---|---:|---:|
| Lines | 771 / 835 | **92,33%** |
| Statements | 805 / 880 | 91,47% |
| Branches | 607 / 688 | 88,22% |
| Functions | 244 / 284 | 85,91% |

Trước bổ sung test Excel, line coverage toàn Admin là **81,10%**; riêng modal nhập Excel là **6,66%**. Sau bổ sung, modal đạt **84,67%** line coverage.

Coverage trên là của Web, không phải coverage backend hoặc tỷ lệ bảo đảm mọi tình huống đều đúng.

### Kết quả từng file test Web

| File | Số test pass |
|---|---:|
| `App.test.jsx` | 17 |
| `DashboardView.test.jsx` | 9 |
| `LoginView.test.jsx` | 8 |
| `Pagination.test.jsx` | 5 |
| `RecipeExcelImportModal.test.jsx` | 7 |
| `RecipesView.test.jsx` | 19 |
| `ReportViews.test.jsx` | 19 |
| `RewardsView.test.jsx` | 14 |
| `ShellComponents.test.jsx` | 14 |
| `SubscriptionsView.test.jsx` | 9 |
| `UsersView.test.jsx` | 23 |
| `api.test.js` | 40 |

## Môi trường và bảo toàn dữ liệu

- Web: Node **24.21.0**, Vitest **5.0.5**, Testing Library/jsdom.
- Backend: .NET **9** trong Docker SDK, ASP.NET `WebApplicationFactory`, PostgreSQL **16** thật. Máy Windows hiện không có .NET SDK nên không dùng `dotnet test` trực tiếp trên host.
- Các test tạo/sửa/xóa tài khoản, món ăn, thử thách, XP và duyệt giao dịch chạy trên network/container PostgreSQL riêng của QA. `ApiFactory` tạo database riêng; live test chạy API riêng ở `127.0.0.1:5001`, không dùng database demo `SmartMealDb`.
- SMTP, Gemini và thông tin xác minh giao dịch bên ngoài không dùng khóa thật. Luồng duyệt giao dịch kiểm tra nghiệp vụ nội bộ bằng cấu hình ngân hàng test, không chuyển tiền hoặc gọi cổng thanh toán thật.
- Smoke test trên bản Docker của người dùng thực hiện đăng nhập Admin, GET các API và POST một batch null không hợp lệ; không tạo món hoặc duyệt giao dịch trên database demo.
- Container/network QA được dọn sau kiểm tra. Các container PostgreSQL/API/Admin/pgAdmin của dự án tiếp tục chạy.

## Smoke test sau triển khai

Qua `http://localhost:3000` và proxy nginx:

- `GET /api/admin/stats` không token → **401**.
- Đăng nhập Admin → **200**, sau đó 11 GET có token đều **200**: stats, users, recipes, plans, transactions, challenges, badges, XP events, system activity, revenue, engagement.
- `POST /api/admin/recipes/bulk-import` với dòng null → **400**.
- Trang Admin và asset JavaScript mới tải được; asset → **200**.

## Cảnh báo và giới hạn còn lại

- `npm run lint` thoát **0**, không có lỗi lint nhưng còn **56 warning**: chủ yếu import/biến không dùng và React hook/effect. Các cảnh báo này chưa được dọn trong lần kiểm thử nghiệp vụ này.
- Build Vite có cảnh báo bundle trên 500 kB. Build vẫn thành công; đây là vấn đề tối ưu tải, chưa phải lỗi chức năng được chứng minh.
- Lockfile Admin hiện không đồng bộ hoàn toàn với `package.json`: `npm ci` ban đầu bị từ chối. Phiên này cài bằng `npm install --package-lock=false --no-audit --no-fund` và không thay lockfile. Cần đồng bộ lockfile trước khi chuyển CI Admin sang `npm ci`.
- Node 20 trong image build tạo được bundle, nhưng test runner/jsdom/undici hiện tại lỗi trước khi chạy test trên Node 20. Các kết quả pass ở đây chạy trên Node 24; image production phục vụ bằng nginx.
- Test UI dùng DOM giả lập; chưa kiểm tra thủ công bố cục bằng trình duyệt thật, viewport điện thoại hoặc toàn bộ nội dung file CSV/Excel tải xuống từ trình duyệt. Không khẳng định đã xác minh hình ảnh từng màn hình.
- Không kiểm thử giao dịch ngân hàng, email, Gemini thật hay tải đồng thời/lỗi DB giữa chừng. Việc kiểm tra trước cả batch ngăn ghi dở dang do dữ liệu đầu vào sai; chưa biến toàn bộ import thành một transaction duy nhất cho mọi lỗi hạ tầng.

## Lệnh chạy lại

Trong `frontend/admin-web`, dùng Node 24 và dependencies tương thích:

```powershell
npm install --package-lock=false --no-audit --no-fund
npm test -- --coverage --exclude "src/__tests__/live/**"
npm run lint
npm run build
```

Chỉ bật live test khi `LIVE_API_URL` trỏ tới API dùng **database QA riêng**, cấu hình tắt SMTP/xác minh email, nới rate limit và dùng SePay test như mô tả đầu file live test:

```powershell
$env:LIVE_API_URL = "http://127.0.0.1:5001/api"
npm test -- src/__tests__/live
```

Backend (máy có SDK .NET 9; chuỗi kết nối là server QA cho phép tạo/xóa database test):

```powershell
$env:SMARTMEAL_TEST_DB = "Host=127.0.0.1;Port=<QA_PORT>;Username=postgres;Password=<QA_PASSWORD>;Database=postgres"
dotnet test backend/SmartMeal.Tests/SmartMeal.Tests.csproj --configuration Release --filter "FullyQualifiedName~Admin"
```

Log/JSON/TRX/coverage chi tiết của phiên này ở `frontend/SmartMealMobile/.expo/run-2026-10-24/admin-qa/` (Git bỏ qua). Báo cáo đối chiếu các file `unit-tests-final.json`, `live-tests-final.json`, `admin-api.trx`, `coverage-final/coverage-summary.json` và `production-smoke.json`.
