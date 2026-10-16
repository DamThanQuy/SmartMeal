# SmartMeal — Hợp đồng API (v3, sinh từ code)

| | |
|---|---|
| Cập nhật | 2026-10-14 (bổ sung thông báo, chia sẻ bộ sưu tập, `hasPassword`). Lần 2 cùng ngày: khôi phục `POST /auth/google` (xác minh ID token, chỉ liên kết vào tài khoản đã xác minh email); thêm `GET /nutritiondiary/progress`, `otherAllergies` trong hồ sơ sức khỏe, tra mã vạch qua Open Food Facts khi CSDL chưa có. 15/10: cổng thanh toán **PayOS** (`paymentMethod = PAYOS`, `GET /subscription/check-status/{orderCode}`, `POST /subscription/payos-webhook`) |
| Nguồn | Swagger của backend (`/swagger/v1/swagger.json`, bật ở môi trường Development) + chú thích XML và thuộc tính trong `SmartMeal.API/Controllers` và `SmartMeal.Application/DTOs` @ `cc98da0` (bổ sung: thông báo trong app, liên kết chia sẻ bộ sưu tập, `UserDto.hasPassword`; scan-label, voice-log/audio, grocery/complete, Idempotency-Key, tra mã vạch bằng CSDL, ngưỡng bệnh lý) |
| Thay thế | Bản V2.0 (2026-09-26) đã cũ: nhiều endpoint ghi "chưa làm" nhưng đã có, đường dẫn và field khác |
| Nguồn sự thật | **Code backend.** Tài liệu này được sinh lại từ code mỗi khi API đổi; nếu lệch thì code thắng |

## 1. Quy ước chung

- **Base URL**: `https://<host>/api` (dev: `http://localhost:5000/api`). JSON **camelCase**.
- **Envelope**: mọi response (kể cả lỗi) có dạng `{ "success": bool, "message": "tiếng Việt", "data": T | null, "errors": string[] | null }`. `message` hiển thị thẳng cho người dùng được. 401/403/404/500 do middleware cũng dùng envelope.
- **Ngày giờ**: `DateOnly` = `"yyyy-MM-dd"` (ngày theo giờ máy của người dùng); `DateTime` = ISO 8601 UTC. Ngày ghi/đọc nhật ký, nước, thực đơn không được quá `hôm nay (UTC) + 1 ngày`.
- **Xác thực**: `Authorization: Bearer <accessToken>`. Access token sống `Jwt:AccessTokenMinutes` (mặc định 60 phút); `POST /auth/refresh` đổi refresh token (dùng một lần, xoay vòng) lấy cặp mới. Refresh token đã dùng bị dùng lại ngoài khoảng gia hạn song song (`Auth:RefreshReuseGraceSeconds`) → coi là bị đánh cắp, thu hồi cả phiên.
- **Mã trạng thái**: `200` thành công · `400` dữ liệu sai/vi phạm nghiệp vụ (kèm `errors[]` khi là lỗi từng trường) · `401` thiếu/hết hạn token hoặc sai mật khẩu · `403` không có quyền (vd. sửa bộ sưu tập của người khác) · `404` không tồn tại/không thuộc về bạn · `409` xung đột (trùng dữ liệu, thực đơn đang được cập nhật ở nơi khác) · `423` tài khoản bị khóa tạm thời · `429` quá nhiều request hoặc hết hạn mức AI Free (`errors` có `ai_quota_exceeded`) · `502/503` dịch vụ phía sau (Gemini) lỗi/chưa cấu hình · `500` lỗi chưa bắt (không lộ stack trace).
- **Giới hạn tần suất**: nhóm endpoint đăng nhập/OTP dùng policy `auth` (mặc định 30 request/phút/IP, đổi bằng `RateLimiting:AuthPermitsPerMinute`) → `429`. `POST /ai/check-safety` và `/ai/scan-label` (không tính hạn mức AI) dùng policy `scanner` (mặc định 20 request/phút/người dùng, `RateLimiting:ScannerPermitsPerMinute`). Đăng nhập sai liên tiếp `Auth:MaxFailedLoginAttempts` (5) lần khóa `Auth:LockoutMinutes` (15) phút → `423`.
- **Phân trang**: `GET /foods` trả `data` là `PagedResult` (`items`, `page`, `pageSize`, `totalCount`, `totalPages`). `GET /recipes` trả `data` là **mảng**, thông tin phân trang nằm ở header `X-Total-Count`, `X-Page`, `X-Page-Size`, `X-Total-Pages` (không gửi `page`/`pageSize` = trả tất cả).
- **Enum** là chuỗi, so khớp không phân biệt hoa/thường và lưu/trả dạng chuẩn: `mealType` `Breakfast|Lunch|Dinner|Snack`; `logMethod` `Manual|AiImage|Voice|Barcode|Ocr`; xem cột "Ghi chú" của từng DTO.
- **Danh mục theo mã**: `/meta/allergies|medical-conditions|tags` trả `{ id, code, name, description }`. Client gửi/nhận **id** nhưng nên ánh xạ theo **`code`** ổn định (vd. `seafood`, `peanut`, `diabetes`, `keto`), không hard-code id.
- **Idempotency**: mọi `POST/PUT/PATCH/DELETE` của người dùng đã đăng nhập nhận header tùy chọn `Idempotency-Key` (1–100 ký tự `A-Z a-z 0-9 . _ : -`). Lần đầu chạy bình thường và phản hồi được lưu 24 giờ; gửi lại **cùng khóa + cùng nội dung** nhận lại đúng phản hồi đó kèm header `Idempotency-Replayed: true`, không ghi thêm. Cùng khóa khác nội dung → `409` `idempotency_key_reused`; lần đầu chưa xong → `409` `idempotency_in_progress`; khóa sai định dạng → `400` `idempotency_key_invalid`. Lỗi 5xx và lỗi tạm thời (408/409/423/429) không được lưu. App dùng cho hàng đợi offline khi ghi nhật ký (BR-261). Không gửi header thì như cũ (health-sync theo `(ngày, nguồn)`, yêu thích thực phẩm và webhook vốn idempotent).
- **Upload**: `POST /auth/avatar` (field `file`, jpg/png/webp ≤ `Storage:MaxAvatarBytes`, mặc định 2 MB), `POST /ai/snap-and-track`, `/ai/fridge-scanner` và `/ai/scan-label` (field `image`, ≤ `Ai:MaxImageBytes`, mặc định 5 MB), `POST /ai/voice-log/audio` (field `audio`, WAV/AAC/M4A/MP3/OGG/FLAC/WebM, ≤ `Ai:MaxAudioBytes`, mặc định 10 MB). Loại file được nhận bằng nội dung file, không tin `Content-Type`.

## 2. Danh sách endpoint

| Nhóm | Method | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|---|
| Xác thực & tài khoản | POST | `/api/auth/register` | Công khai | Đăng ký bằng email + mật khẩu; trả cặp access/refresh token. |
| Xác thực & tài khoản | POST | `/api/auth/login` | Công khai | Đăng nhập |
| Xác thực & tài khoản | POST | `/api/auth/google` | Công khai | Đăng nhập/tạo tài khoản bằng Google ID token (máy chủ tự xác minh với Google). |
| Xác thực & tài khoản | POST | `/api/auth/refresh` | Công khai | Đổi refresh token (dùng một lần) lấy cặp access + refresh token mới |
| Xác thực & tài khoản | POST | `/api/auth/logout` | Công khai | Đăng xuất: thu hồi refresh token |
| Xác thực & tài khoản | POST | `/api/auth/forgot-password` | Công khai | Gửi OTP đặt lại mật khẩu tới email |
| Xác thực & tài khoản | POST | `/api/auth/resend-otp` | Công khai | Gửi lại OTP (`reset-password` hoặc `verify-email`); có thời gian chờ giữa hai lần gửi. |
| Xác thực & tài khoản | POST | `/api/auth/verify-otp` | Công khai | Xác minh OTP 6 số |
| Xác thực & tài khoản | POST | `/api/auth/reset-password` | Công khai | Đặt mật khẩu mới bằng mã đặt lại (resetToken) nhận được sau verify-otp; thu hồi mọi phiên cũ. |
| Xác thực & tài khoản | POST | `/api/auth/change-password` | Cần đăng nhập | Đổi mật khẩu khi đã đăng nhập: thu hồi mọi phiên cũ và trả cặp token mới cho phiên hiện tại. |
| Xác thực & tài khoản | GET | `/api/auth/me` | Cần đăng nhập | Thông tin tài khoản hiện tại (gồm gói Pro, đã làm khảo sát sức khỏe chưa). |
| Xác thực & tài khoản | PUT | `/api/auth/profile` | Cần đăng nhập | Sửa họ tên / ảnh đại diện. |
| Xác thực & tài khoản | POST | `/api/auth/avatar` | Cần đăng nhập | Tải ảnh đại diện (multipart, trường `file`; JPG/PNG/WebP, tối đa 2 MB) |
| Xác thực & tài khoản | DELETE | `/api/auth/account` | Cần đăng nhập | Xóa vĩnh viễn tài khoản và dữ liệu (BR-271) |
| Dữ liệu cá nhân | DELETE | `/api/me/data` | Cần đăng nhập | Xóa dữ liệu cá nhân (nhật ký, nước, hồ sơ sức khỏe và cân nặng, thực đơn, danh sách đi chợ, yêu thích/bộ sưu tập, pet và thử thách) nhưng giữ tài khoản |
| Hồ sơ sức khỏe | POST | `/api/healthprofile/survey` | Cần đăng nhập | Khảo sát sức khỏe: tạo hồ sơ hoặc ghi đè toàn bộ |
| Hồ sơ sức khỏe | POST | `/api/healthprofile/setup` | Cần đăng nhập | Khảo sát sức khỏe: tạo hồ sơ hoặc ghi đè toàn bộ *(bí danh cũ)* |
| Hồ sơ sức khỏe | POST | `/api/healthprofile` | Cần đăng nhập | Khảo sát sức khỏe: tạo hồ sơ hoặc ghi đè toàn bộ *(bí danh cũ)* |
| Hồ sơ sức khỏe | PUT | `/api/healthprofile` | Cần đăng nhập | Cập nhật từng phần hồ sơ đã có; tự tính lại BMI/BMR/TDEE/mục tiêu |
| Hồ sơ sức khỏe | GET | `/api/healthprofile` | Cần đăng nhập | Hồ sơ sức khỏe hiện tại kèm chỉ số tính sẵn; 404 khi chưa làm khảo sát. |
| Hồ sơ sức khỏe | POST | `/api/healthprofile/weight-log` | Cần đăng nhập | Ghi cân nặng mới (thêm một dòng lịch sử, cập nhật hồ sơ và tính lại chỉ số). |
| Hồ sơ sức khỏe | GET | `/api/healthprofile/weight-history` | Cần đăng nhập | Lịch sử cân nặng, cũ → mới; `days` (1–3650, tùy chọn) chỉ lấy N ngày gần nhất. |
| Danh mục (dị ứng, bệnh lý, chế độ ăn) | GET | `/api/meta/allergies` | Công khai | Danh mục chất gây dị ứng `{ id, code, name, description }`. |
| Danh mục (dị ứng, bệnh lý, chế độ ăn) | GET | `/api/meta/medical-conditions` | Công khai | Danh mục bệnh lý nền `{ id, code, name, description }`. |
| Danh mục (dị ứng, bệnh lý, chế độ ăn) | GET | `/api/meta/tags` | Công khai | Danh mục thẻ/chế độ ăn ưu tiên (Eat Clean, Keto…) `{ id, code, name, description }`. |
| Nhật ký dinh dưỡng & nước uống | POST | `/api/nutritiondiary/log` | Cần đăng nhập | Ghi một món vào nhật ký |
| Nhật ký dinh dưỡng & nước uống | POST | `/api/nutritiondiary/log/batch` | Cần đăng nhập | Ghi nhiều món vào cùng một bữa — hoặc tất cả được lưu, hoặc không món nào. |
| Nhật ký dinh dưỡng & nước uống | GET | `/api/nutritiondiary/daily` | Cần đăng nhập | Nhật ký một ngày: luôn đủ 4 bữa (kể cả rỗng), tổng và mục tiêu calo/macro lấy từ hồ sơ sức khỏe. |
| Nhật ký dinh dưỡng & nước uống | GET | `/api/nutritiondiary/weekly-progress` | Cần đăng nhập | 7 ngày liên tiếp kể từ `startDate`: calo, macro và mục tiêu từng ngày. |
| Nhật ký dinh dưỡng & nước uống | GET | `/api/nutritiondiary/progress` | Cần đăng nhập | Như weekly-progress nhưng cho khoảng `[startDate, endDate]` bất kỳ, tối đa 31 ngày (biểu đồ "Tháng"). |
| Nhật ký dinh dưỡng & nước uống | PUT | `/api/nutritiondiary/items/{itemId}` | Cần đăng nhập | Sửa một món đã ghi (khẩu phần, dinh dưỡng, chuyển bữa/ngày) |
| Nhật ký dinh dưỡng & nước uống | DELETE | `/api/nutritiondiary/items/{itemId}` | Cần đăng nhập | Xóa một món đã ghi (chỉ món của chính người dùng). |
| Nhật ký dinh dưỡng & nước uống | POST | `/api/nutritiondiary/water` | Cần đăng nhập | Ghi một lần uống nước |
| Nhật ký dinh dưỡng & nước uống | GET | `/api/nutritiondiary/water` | Cần đăng nhập | Lịch sử nước uống `days` ngày kết thúc ở `date` (tăng dần, gồm cả ngày không có log). |
| Nhật ký dinh dưỡng & nước uống | DELETE | `/api/nutritiondiary/water/{entryId}` | Cần đăng nhập | Xóa một lần uống nước (dùng cho "Hoàn tác"); trả tổng của ngày sau khi xóa. |
| Thực phẩm | GET | `/api/foods` | Công khai (token tùy chọn: cá nhân hóa `isFavorite`, `scope`…) | Tìm thực phẩm (nguyên liệu + món ăn) |
| Thực phẩm | POST | `/api/foods` | Cần đăng nhập | Người dùng tự nhập một món (BR-120/121): gắn nhãn "do người dùng nhập", chỉ chủ sở hữu thấy. |
| Thực phẩm | GET | `/api/foods/{id}` | Công khai (token tùy chọn: cá nhân hóa `isFavorite`, `scope`…) | Chi tiết thực phẩm (món của người khác không xem được: 404). |
| Thực phẩm | DELETE | `/api/foods/{id}` | Cần đăng nhập | Xóa món do chính mình tự nhập; nhật ký đã ghi giữ nguyên số liệu. |
| Thực phẩm | GET | `/api/foods/barcode/{code}` | Công khai (token tùy chọn: cá nhân hóa `isFavorite`, `scope`…) | Tra mã vạch (8–14 chữ số) |
| Thực phẩm | POST | `/api/foods/{id}/favorite` | Cần đăng nhập | Thêm vào yêu thích (idempotent). |
| Thực phẩm | DELETE | `/api/foods/{id}/favorite` | Cần đăng nhập | Bỏ khỏi yêu thích (idempotent). |
| Đồng bộ vận động | POST | `/api/health-sync/steps-and-calories` | Cần đăng nhập | Gửi tổng của một ngày từ một nguồn |
| Đồng bộ vận động | GET | `/api/health-sync/daily-summary` | Cần đăng nhập | Tổng kết vận động của một ngày theo nguồn ưu tiên cao nhất (kèm calo đã ăn, còn lại so với mục tiêu). |
| Công thức, yêu thích, bộ sưu tập | GET | `/api/recipes` | Công khai (token tùy chọn: cá nhân hóa `isFavorite`, `scope`…) | Danh sách công thức |
| Công thức, yêu thích, bộ sưu tập | GET | `/api/recipes/{id}` | Công khai (token tùy chọn: cá nhân hóa `isFavorite`, `scope`…) | Chi tiết công thức kèm nguyên liệu (mỗi nguyên liệu có `allergyIds`), `allergyIds` của cả công thức và `isFavorite`. |
| Công thức, yêu thích, bộ sưu tập | POST | `/api/recipes/suggest-by-pantry` | Công khai (có token thì loại món chứa dị ứng của người dùng) | Gợi ý theo tủ lạnh |
| Công thức, yêu thích, bộ sưu tập | POST | `/api/recipes/{id}/favorite` | Cần đăng nhập | Bật/tắt yêu thích (TOGGLE): trả `isFavorite` mới và `totalFavorites`. |
| Công thức, yêu thích, bộ sưu tập | GET | `/api/recipes/favorites` | Cần đăng nhập | Các công thức người dùng đã yêu thích. |
| Công thức, yêu thích, bộ sưu tập | GET | `/api/recipes/collections` | Cần đăng nhập | Bộ sưu tập của người dùng và các bộ sưu tập công khai của người khác (mới → cũ); `isOwner` cho biết có quyền sửa hay không. |
| Công thức, yêu thích, bộ sưu tập | POST | `/api/recipes/collections` | Cần đăng nhập | Tạo bộ sưu tập (mặc định riêng tư). |
| Công thức, yêu thích, bộ sưu tập | GET | `/api/recipes/collections/{collectionId}` | Cần đăng nhập | Chi tiết một bộ sưu tập (của mình hoặc công khai); bộ sưu tập riêng của người khác trả 404. |
| Công thức, yêu thích, bộ sưu tập | PATCH | `/api/recipes/collections/{collectionId}` | Cần đăng nhập | Đổi tên/mô tả/ảnh bìa/công khai — chỉ chủ sở hữu (403 với người khác, BR-152). |
| Công thức, yêu thích, bộ sưu tập | DELETE | `/api/recipes/collections/{collectionId}` | Cần đăng nhập | Xóa bộ sưu tập — chỉ chủ sở hữu. |
| Công thức, yêu thích, bộ sưu tập | POST | `/api/recipes/collections/{collectionId}/items` | Cần đăng nhập | Thêm công thức vào bộ sưu tập — chỉ chủ sở hữu. |
| Công thức, yêu thích, bộ sưu tập | DELETE | `/api/recipes/collections/{collectionId}/items/{recipeId}` | Cần đăng nhập | Bỏ công thức khỏi bộ sưu tập — chỉ chủ sở hữu. |
| Công thức, yêu thích, bộ sưu tập | POST | `/api/recipes/collections/{collectionId}/share` | Cần đăng nhập | Bật liên kết chia sẻ chỉ đọc — chỉ chủ sở hữu; đã bật thì trả mã cũ, `regenerate=true` đổi mã. |
| Công thức, yêu thích, bộ sưu tập | DELETE | `/api/recipes/collections/{collectionId}/share` | Cần đăng nhập | Tắt liên kết chia sẻ (idempotent) — chỉ chủ sở hữu. |
| Công thức, yêu thích, bộ sưu tập | GET | `/api/recipes/collections/shared/{shareToken}` | Công khai (token tùy chọn: cá nhân hóa `isFavorite`, `healthWarnings`) | Xem bộ sưu tập qua liên kết chia sẻ (chỉ đọc, kể cả riêng tư); mã sai/đã tắt → 404. |
| Thực đơn tuần | GET | `/api/mealplanner/week` | Cần đăng nhập | Lấy kế hoạch thực đơn 7 ngày trong tuần (kèm tổng Calo & Macros mỗi ngày). |
| Thực đơn tuần | POST | `/api/mealplanner/assign` | Cần đăng nhập | Gán hoặc thay đổi một món ăn vào lịch tuần (Sáng, Trưa, Tối, Phụ); món chứa chất gây dị ứng của người dùng → `400` `allergen_conflict` |
| Thực đơn tuần | PATCH | `/api/mealplanner/{id}/complete` | Cần đăng nhập | Đánh dấu một món trong thực đơn là đã nấu/ăn (hoặc bỏ đánh dấu) |
| Thực đơn tuần | DELETE | `/api/mealplanner/{id}` | Cần đăng nhập | Xóa một món ăn khỏi thực đơn tuần. |
| Thực đơn tuần | POST | `/api/mealplanner/auto-generate` | Cần đăng nhập | Tự động sinh thực đơn 7 ngày: loại món chứa chất gây dị ứng và món vượt ngưỡng bệnh lý, chọn món gần mục tiêu calo; không đủ món phù hợp → `400` `no_suitable_recipes` |
| Đi chợ | GET | `/api/grocery` | Cần đăng nhập | Lấy danh sách đi chợ hiện tại của người dùng (nhóm theo quầy siêu thị & tính tổng chi phí ước tính). |
| Đi chợ | POST | `/api/grocery/generate-from-plan` | Cần đăng nhập | Tự động tổng hợp danh sách đi chợ từ thực đơn trong khoảng ngày (gộp nguyên liệu cùng tên/đơn vị, kèm số bữa đã gộp). |
| Đi chợ | POST | `/api/grocery/items` | Cần đăng nhập | Thêm thủ công một món hàng cần mua vào danh sách đi chợ. |
| Đi chợ | PATCH | `/api/grocery/items/check-all` | Cần đăng nhập | Đánh dấu đã mua (hoặc bỏ đánh dấu) toàn bộ danh sách trong một lần |
| Đi chợ | PATCH | `/api/grocery/items/{id}/check` | Cần đăng nhập | Đánh dấu đã mua hoặc bỏ đánh dấu cho một món đồ trong danh sách đi chợ. |
| Đi chợ | DELETE | `/api/grocery/items/{id}` | Cần đăng nhập | Xóa một món đồ khỏi danh sách đi chợ. |
| Đi chợ | DELETE | `/api/grocery/clear-checked` | Cần đăng nhập | Dọn dẹp toàn bộ các món đồ đã đánh dấu mua (Clear Checked Items). |
| Đi chợ | POST | `/api/grocery/complete` | Cần đăng nhập | Hoàn tất mua sắm: lưu chi phí thực tế, bỏ món đã mua, giữ/bỏ món chưa mua và có thể cộng thực đơn kỳ kế tiếp — một transaction. |
| AI | GET | `/api/ai/quota` | Cần đăng nhập | Hạn mức AI còn lại hôm nay. |
| AI | POST | `/api/ai/snap-and-track` | Cần đăng nhập | AI Snap & Track: ảnh đĩa thức ăn (multipart, trường `image`; JPG/PNG/WebP, tối đa 5 MB). |
| AI | POST | `/api/ai/fridge-scanner` | Cần đăng nhập | Fridge Scanner (**chỉ Pro**, Free → `403 pro_required`): ảnh nguyên liệu trong tủ lạnh (multipart, trường `image`). |
| AI | POST | `/api/ai/voice-log` | Cần đăng nhập | Voice Log: văn bản (người dùng gõ hoặc đã nhận dạng trên máy) → món ăn kèm dinh dưỡng. |
| AI | POST | `/api/ai/voice-log/audio` | Cần đăng nhập | Voice Log từ file ghi âm (multipart, trường `audio`, tối đa 10 MB): AI chép lời rồi bóc tách món; trả `transcript`. |
| AI | POST | `/api/ai/check-safety` | Cần đăng nhập | Kiểm tra an toàn sản phẩm theo dị ứng/bệnh lý của người dùng (BR-140); `barcode` tra trong CSDL (`404` `product_not_found` khi chưa có) |
| AI | POST | `/api/ai/scan-label` | Cần đăng nhập | Đọc nhãn dinh dưỡng từ ảnh (multipart, trường `image`) rồi kiểm tra an toàn; không tính hạn mức. |
| Bé Mầm: XP, thử thách, huy hiệu | GET | `/api/gamification/pet` | Cần đăng nhập | Trạng thái pet: cấp độ, XP, nhiệm vụ hôm nay |
| Bé Mầm: XP, thử thách, huy hiệu | GET | `/api/gamification/streak` | Cần đăng nhập | Chuỗi ngày hiện tại, dài nhất và 7 ngày của tuần. |
| Bé Mầm: XP, thử thách, huy hiệu | GET | `/api/gamification/challenges` | Cần đăng nhập | Danh sách thử thách kèm tiến độ của người dùng. |
| Bé Mầm: XP, thử thách, huy hiệu | POST | `/api/gamification/challenges/{id}/join` | Cần đăng nhập | Tham gia thử thách (idempotent): bắt đầu khung ngày từ hôm nay; đã tham gia thì trả lại bản cũ. |
| Bé Mầm: XP, thử thách, huy hiệu | GET | `/api/gamification/badges` | Cần đăng nhập | Huy hiệu (đã mở/chưa) và trang phục (đã mở/đang mặc). |
| Bé Mầm: XP, thử thách, huy hiệu | POST | `/api/gamification/costumes/{costumeId}/equip` | Cần đăng nhập | Mặc một trang phục đã mở (400 nếu chưa mở khóa, 404 nếu không có). |
| Bé Mầm: XP, thử thách, huy hiệu | DELETE | `/api/gamification/costumes/equipped` | Cần đăng nhập | Cởi trang phục đang mặc. |
| Thông báo | GET | `/api/notifications` | Cần đăng nhập | Thông báo trong app (mới → cũ) kèm `unreadCount`; `date`, `limit` (1–100, mặc định 50). |
| Thông báo | PATCH | `/api/notifications/{id}/read` | Cần đăng nhập | Đánh dấu một thông báo đã đọc (idempotent); của người khác → 404. |
| Thông báo | POST | `/api/notifications/read-all` | Cần đăng nhập | Đánh dấu đã đọc tất cả; trả số thông báo vừa đánh dấu. |
| Thông báo | WebSocket | `/api/hubs/notifications` | Cần đăng nhập | Hub SignalR: server đẩy sự kiện `notification` (NotificationDto) ngay khi tạo thông báo mới — xem mục "Thông báo real-time". |
| Gói Pro & thanh toán | GET | `/api/subscription/plans` | Công khai | Bảng giá các gói Pro (giá, chu kỳ, quyền lợi) — nguồn duy nhất cho giá. |
| Gói Pro & thanh toán | POST | `/api/subscription/create-checkout-session` | Cần đăng nhập | Tạo phiên thanh toán |
| Gói Pro & thanh toán | POST | `/api/subscription/activate-mock` | Cần đăng nhập | Chỉ dùng khi phát triển: mô phỏng cổng thanh toán xác nhận |
| Gói Pro & thanh toán | POST | `/api/subscription/sepay-webhook` | Công khai | Webhook của SePay (tiền vào tài khoản); xác thực bằng header `Authorization: Apikey ...` (`SePay:WebhookApiKey`). |
| Gói Pro & thanh toán | POST | `/api/subscription/payos-webhook` | Công khai | Webhook của PayOS; chữ ký xác minh bằng `PayOS:ChecksumKey`. |
| Gói Pro & thanh toán | GET | `/api/subscription/check-status/{orderCode}` | Cần đăng nhập | Trạng thái giao dịch PayOS/SePay của chính mình; còn chờ thì máy chủ hỏi cổng thanh toán và kích hoạt Pro khi đã nhận đủ tiền. |
| Gói Pro & thanh toán | GET | `/api/subscription/status` | Cần đăng nhập | Trạng thái gói: Free \| Premium \| Expired \| Cancelled, gói và hạn dùng. |
| Gói Pro & thanh toán | GET | `/api/subscription/transactions` | Cần đăng nhập | Lịch sử giao dịch của người dùng (mới → cũ). |
| Gói Pro & thanh toán | POST | `/api/subscription/cancel` | Cần đăng nhập | Hủy gia hạn: vẫn dùng Pro tới hết hạn. |

## 3. Chi tiết endpoint

### Xác thực & tài khoản

> Đăng ký không bắt xác minh email: tài khoản dùng được ngay nhưng **chưa được coi là đã xác minh email**. Email được xác minh khi người dùng xác thực OTP (`verify-email`, hoặc đặt lại mật khẩu qua `reset-password`). OTP chỉ dùng cho hai mục đích đó.

> Khi bật `Auth:RequireEmailVerification` (để trống = bật khi đã cấu hình SMTP), tài khoản mới phải xác minh email trước khi dùng tiếp: `register` vẫn trả token nhưng kèm `requiresEmailVerification = true` và gửi OTP `verify-email` tới email; trước khi `verify-otp` thành công, `login` đúng mật khẩu trả `403` (`errors` có `email_not_verified`, đồng thời gửi mã mới) và `refresh` trả `401` (`email_not_verified`). Khi tắt (chưa có SMTP) thì như đoạn trên: tài khoản dùng được ngay.

> OTP 6 chữ số, hiệu lực `Auth:OtpMinutes` (5 phút), tối đa `Auth:OtpMaxAttempts` (5) lần nhập sai, lưu dạng băm. Gửi lại cách nhau tối thiểu `Auth:OtpResendCooldownSeconds` (60 giây): trong thời gian chờ endpoint vẫn trả `200` nhưng **không** phát mã mới. `forgot-password` luôn trả `200` để không lộ email nào đã đăng ký.

> `verify-otp` trả `resetToken` (sống `Auth:ResetTokenMinutes` = 10 phút); `reset-password` và `change-password` thu hồi mọi phiên cũ (đổi mật khẩu trả cặp token mới cho phiên hiện tại).

> Chưa cấu hình SMTP (`Smtp:Host` và địa chỉ gửi `Smtp:From`/`Smtp:User`) thì không gửi email thật: backend chỉ ghi log, và ở Development ghi cả nội dung có mã OTP (`[DEV EMAIL …]`) để dev thử. Gmail: `Smtp:Host = smtp.gmail.com`, `Port = 587`, `User` = địa chỉ Gmail, `Password` = App Password.

> Đăng nhập bằng **email + mật khẩu** hoặc **Google** (`POST /auth/google { idToken }`, khôi phục sau khi bỏ ngày 14/10/2026). Máy chủ xác minh ID token với Google (audience = `Google:ClientId`), không tin email client gửi. Lần đầu: tạo tài khoản không mật khẩu (`hasPassword = false`, đặt mật khẩu qua "Quên mật khẩu"). Email đã có tài khoản mật khẩu: chỉ liên kết khi email đó **đã được xác minh** — chưa xác minh trả `409` (chặn việc ai đó đăng ký trước bằng email của người khác rồi chiếm tài khoản khi chủ thật đăng nhập Google). Chưa cấu hình `Google:ClientId` → `503`; token sai/hết hạn → `401`.

> `DELETE /auth/account` cần `password` hiện tại; tài khoản không có mật khẩu (tạo bằng đăng nhập Google trước đây) phải gửi `confirmEmail` đúng bằng email của chính mình. Sai mật khẩu nhiều lần cũng bị khóa tạm thời (trả 400 chứ không phải 401, để app không hiểu nhầm là phiên hết hạn). Giao dịch thanh toán được giữ lại ở dạng ẩn danh (BR-271).

#### `POST /api/auth/register`

Đăng ký bằng email + mật khẩu; trả cặp access/refresh token. `requiresEmailVerification = true` khi phải nhập mã OTP vừa gửi qua email (`verify-otp`, purpose `verify-email`).

- **Quyền**: Công khai · giới hạn tần suất (policy `auth`)
- **Body (JSON)**: [RegisterRequestDto](#schema-registerrequestdto)
- **Response `data`**: [AuthResponseDto](#schema-authresponsedto)

#### `POST /api/auth/login`

Đăng nhập. Sai quá nhiều lần → 423 (khóa tạm thời); sai thông tin → 401; đúng mật khẩu nhưng email chưa xác minh → 403 `email_not_verified` (đã gửi mã mới).

- **Quyền**: Công khai · giới hạn tần suất (policy `auth`)
- **Body (JSON)**: [LoginRequestDto](#schema-loginrequestdto)
- **Response `data`**: [AuthResponseDto](#schema-authresponsedto)

#### `POST /api/auth/google`

Đăng nhập hoặc tạo tài khoản bằng Google ID token; máy chủ tự xác minh token với Google. `401` token sai/hết hạn, `409` email đã có tài khoản mật khẩu chưa xác minh email, `503` chưa cấu hình `Google:ClientId`.

- **Quyền**: Công khai · giới hạn tần suất (policy `auth`)
- **Body (JSON)**: [GoogleAuthRequestDto](#schema-googleauthrequestdto)
- **Response `data`**: [AuthResponseDto](#schema-authresponsedto)

#### `POST /api/auth/refresh`

Đổi refresh token (dùng một lần) lấy cặp access + refresh token mới. 401 nếu token sai/đã dùng/hết hạn.

- **Quyền**: Công khai · giới hạn tần suất (policy `auth`)
- **Body (JSON)**: [RefreshTokenRequestDto](#schema-refreshtokenrequestdto)
- **Response `data`**: [AuthResponseDto](#schema-authresponsedto)

#### `POST /api/auth/logout`

Đăng xuất: thu hồi refresh token. Không cần access token (có thể đã hết hạn); luôn trả 200.

- **Quyền**: Công khai
- **Body (JSON)**: [LogoutRequestDto](#schema-logoutrequestdto)
- **Response `data`**: bool

#### `POST /api/auth/forgot-password`

Gửi OTP đặt lại mật khẩu tới email. Luôn trả 200 (không lộ email nào đã đăng ký).

- **Quyền**: Công khai · giới hạn tần suất (policy `auth`)
- **Body (JSON)**: [ForgotPasswordRequestDto](#schema-forgotpasswordrequestdto)
- **Response `data`**: bool

#### `POST /api/auth/resend-otp`

Gửi lại OTP (`reset-password` hoặc `verify-email`); có thời gian chờ giữa hai lần gửi.

- **Quyền**: Công khai · giới hạn tần suất (policy `auth`)
- **Body (JSON)**: [ResendOtpRequestDto](#schema-resendotprequestdto)
- **Response `data`**: bool

#### `POST /api/auth/verify-otp`

Xác minh OTP 6 số. Với `reset-password` trả `resetToken` dùng một lần cho bước đặt lại.

- **Quyền**: Công khai · giới hạn tần suất (policy `auth`)
- **Body (JSON)**: [VerifyOtpRequestDto](#schema-verifyotprequestdto)
- **Response `data`**: [VerifyOtpResponseDto](#schema-verifyotpresponsedto)

#### `POST /api/auth/reset-password`

Đặt mật khẩu mới bằng mã đặt lại (resetToken) nhận được sau verify-otp; thu hồi mọi phiên cũ.

- **Quyền**: Công khai · giới hạn tần suất (policy `auth`)
- **Body (JSON)**: [ResetPasswordRequestDto](#schema-resetpasswordrequestdto)
- **Response `data`**: bool

#### `POST /api/auth/change-password`

Đổi mật khẩu khi đã đăng nhập: thu hồi mọi phiên cũ và trả cặp token mới cho phiên hiện tại.

- **Quyền**: Cần đăng nhập
- **Body (JSON)**: [ChangePasswordRequestDto](#schema-changepasswordrequestdto)
- **Response `data`**: [AuthResponseDto](#schema-authresponsedto)

#### `GET /api/auth/me`

Thông tin tài khoản hiện tại (gồm gói Pro, đã làm khảo sát sức khỏe chưa).

- **Quyền**: Cần đăng nhập
- **Response `data`**: [UserDto](#schema-userdto)

#### `PUT /api/auth/profile`

Sửa họ tên / ảnh đại diện.

- **Quyền**: Cần đăng nhập
- **Body (JSON)**: [UpdateProfileRequestDto](#schema-updateprofilerequestdto)
- **Response `data`**: [UserDto](#schema-userdto)

#### `POST /api/auth/avatar`

Tải ảnh đại diện (multipart, trường `file`; JPG/PNG/WebP, tối đa 2 MB). Trả người dùng với `avatarUrl` mới.

- **Quyền**: Cần đăng nhập
- **Body (multipart/form-data)**: field `file` (file)
- **Response `data`**: [UserDto](#schema-userdto)

#### `DELETE /api/auth/account`

Xóa vĩnh viễn tài khoản và dữ liệu (BR-271). Cần `password`; tài khoản không có mật khẩu (tạo bằng đăng nhập Google trước đây) gửi `confirmEmail`.

- **Quyền**: Cần đăng nhập
- **Body (JSON)**: [DeleteAccountRequestDto](#schema-deleteaccountrequestdto)
- **Response `data`**: bool

### Dữ liệu cá nhân

> `DELETE /me/data` xóa dữ liệu cá nhân nhưng **giữ** tài khoản và lịch sử giao dịch thanh toán (BR-271).

#### `DELETE /api/me/data`

Xóa dữ liệu cá nhân (nhật ký, nước, hồ sơ sức khỏe và cân nặng, thực đơn, danh sách đi chợ, yêu thích/bộ sưu tập, pet và thử thách) nhưng giữ tài khoản. Lịch sử giao dịch thanh toán được giữ lại (BR-271).

- **Quyền**: Cần đăng nhập
- **Response `data`**: [DeleteDataResultDto](#schema-deletedataresultdto)

### Hồ sơ sức khỏe

> Hồ sơ lưu **ngày sinh** (tuổi tính từ ngày sinh, tối thiểu 13), chế độ ăn (`dietaryPreferenceIds`) và `waterGoalMl` (500–10000, mặc định 2000). `GET` trả danh sách dị ứng/bệnh lý/chế độ ăn dưới dạng cả **tên** lẫn **id**.

> `otherAllergies`: dị ứng **ngoài danh mục** người dùng tự gõ, phân tách bằng dấu phẩy (vd. `"dứa, kiwi"`, tối đa 200 ký tự; trả về dạng đã chuẩn hóa `"dứa, kiwi"`, `null` khi không có). Mỗi mục là một từ khóa khớp theo ranh giới từ với tên công thức/nguyên liệu/sản phẩm: có dấu thì khớp đúng dấu, không dấu thì khớp mọi cách viết có dấu. Dùng để loại món ở `GET /recipes?excludeMyAllergens=true`, `suggest-by-pantry`, `auto-generate`; `assign` trả `400 allergen_conflict`; chi tiết công thức có `healthWarnings`; quét mã vạch có cảnh báo `ALLERGY`. Trong `PUT`: không gửi = giữ nguyên, `""` = xóa.

> `POST /survey` ghi đè toàn bộ; `PUT` cập nhật **từng phần** (trường không gửi giữ nguyên, danh sách gửi `[]` nghĩa là xóa hết) và chỉ thêm dòng lịch sử cân nặng khi cân nặng đổi. Cả hai tính lại BMI/BMR/TDEE/mục tiêu calo/macro (BR-022).

#### `POST /api/healthprofile/survey`

Khảo sát sức khỏe: tạo hồ sơ hoặc ghi đè toàn bộ. Cần `dateOfBirth` hoặc `age`.

- **Quyền**: Cần đăng nhập
- **Body (JSON)**: [HealthSurveyRequestDto](#schema-healthsurveyrequestdto)
- **Response `data`**: [HealthProfileDto](#schema-healthprofiledto)

#### `POST /api/healthprofile/setup`

Khảo sát sức khỏe: tạo hồ sơ hoặc ghi đè toàn bộ. Cần `dateOfBirth` hoặc `age`.

- **Quyền**: Cần đăng nhập
- Bí danh cũ, giữ để tương thích
- **Body (JSON)**: [HealthSurveyRequestDto](#schema-healthsurveyrequestdto)
- **Response `data`**: [HealthProfileDto](#schema-healthprofiledto)

#### `POST /api/healthprofile`

Khảo sát sức khỏe: tạo hồ sơ hoặc ghi đè toàn bộ. Cần `dateOfBirth` hoặc `age`.

- **Quyền**: Cần đăng nhập
- Bí danh cũ, giữ để tương thích
- **Body (JSON)**: [HealthSurveyRequestDto](#schema-healthsurveyrequestdto)
- **Response `data`**: [HealthProfileDto](#schema-healthprofiledto)

#### `PUT /api/healthprofile`

Cập nhật từng phần hồ sơ đã có; tự tính lại BMI/BMR/TDEE/mục tiêu. 404 nếu chưa có hồ sơ.

- **Quyền**: Cần đăng nhập
- **Body (JSON)**: [UpdateHealthProfileRequestDto](#schema-updatehealthprofilerequestdto)
- **Response `data`**: [HealthProfileDto](#schema-healthprofiledto)

#### `GET /api/healthprofile`

Hồ sơ sức khỏe hiện tại kèm chỉ số tính sẵn; 404 khi chưa làm khảo sát.

- **Quyền**: Cần đăng nhập
- **Response `data`**: [HealthProfileDto](#schema-healthprofiledto)

#### `POST /api/healthprofile/weight-log`

Ghi cân nặng mới (thêm một dòng lịch sử, cập nhật hồ sơ và tính lại chỉ số).

- **Quyền**: Cần đăng nhập
- **Body (JSON)**: [WeightLogRequestDto](#schema-weightlogrequestdto)
- **Response `data`**: [WeightPointDto](#schema-weightpointdto)

#### `GET /api/healthprofile/weight-history`

Lịch sử cân nặng, cũ → mới. `days` (1–3650, tùy chọn) chỉ trả các lần ghi trong N ngày gần nhất; ngoài khoảng → `400`.

- **Quyền**: Cần đăng nhập
- **Response `data`**: [WeightHistoryResponseDto](#schema-weighthistoryresponsedto)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `days` | query | int |  | 1–3650 |

### Danh mục (dị ứng, bệnh lý, chế độ ăn)

> Mỗi mục có `code` ổn định (vd. `seafood`, `peanut`, `dairy`, `diabetes`, `keto`, `eatClean`). Client nên ánh xạ theo `code`, không theo `id`.

#### `GET /api/meta/allergies`

Danh mục chất gây dị ứng `{ id, code, name, description }`.

- **Quyền**: Công khai
- **Response `data`**: [MetaItemDto](#schema-metaitemdto)[]

#### `GET /api/meta/medical-conditions`

Danh mục bệnh lý nền `{ id, code, name, description }`.

- **Quyền**: Công khai
- **Response `data`**: [MetaItemDto](#schema-metaitemdto)[]

#### `GET /api/meta/tags`

Danh mục thẻ/chế độ ăn ưu tiên (Eat Clean, Keto…) `{ id, code, name, description }`.

- **Quyền**: Công khai
- **Response `data`**: [MetaItemDto](#schema-metaitemdto)[]

### Nhật ký dinh dưỡng & nước uống

> Mỗi `(người dùng, ngày, bữa)` chỉ có **một** nhóm (ràng buộc duy nhất + gộp dữ liệu cũ); `mealType` được chuẩn hóa về `Breakfast|Lunch|Dinner|Snack`, giá trị lạ → `400`.

> `POST /log/batch` ghi tối đa 50 món vào cùng một bữa trong một transaction: hoặc tất cả được lưu, hoặc không món nào. `PUT /items/{id}` sửa từng phần (chuyển bữa/ngày, khẩu phần, dinh dưỡng).

> `GET /daily` luôn trả đủ 4 bữa; mục tiêu lấy từ hồ sơ sức khỏe (chưa có hồ sơ: 2000 kcal, 250 g carbs, 55 g béo, 125 g đạm). Mỗi món có `createdAt`, `mealType`, `logDate`.

> Nước: `POST /water` trả `entryId` để hoàn tác bằng `DELETE`; `GET /water?date=&days=` (1–31 ngày, tăng dần, gồm cả ngày trống); mục tiêu nước lấy từ hồ sơ.

#### `POST /api/nutritiondiary/log`

Ghi một món vào nhật ký. `mealType` không phân biệt hoa/thường, lưu dạng chuẩn.

- **Quyền**: Cần đăng nhập
- **Body (JSON)**: [LogMealRequestDto](#schema-logmealrequestdto)
- **Response `data`**: [DiaryItemDto](#schema-diaryitemdto)

#### `POST /api/nutritiondiary/log/batch`

Ghi nhiều món vào cùng một bữa — hoặc tất cả được lưu, hoặc không món nào.

- **Quyền**: Cần đăng nhập
- **Body (JSON)**: [LogMealBatchRequestDto](#schema-logmealbatchrequestdto)
- **Response `data`**: [DiaryItemDto](#schema-diaryitemdto)[]

#### `GET /api/nutritiondiary/daily`

Nhật ký một ngày: luôn đủ 4 bữa (kể cả rỗng), tổng và mục tiêu calo/macro lấy từ hồ sơ sức khỏe.

- **Quyền**: Cần đăng nhập
- **Response `data`**: [DailyDiarySummaryDto](#schema-dailydiarysummarydto)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `date` | query | date (yyyy-MM-dd) |  |  |

#### `GET /api/nutritiondiary/weekly-progress`

7 ngày liên tiếp kể từ `startDate`: calo, macro và mục tiêu từng ngày.

- **Quyền**: Cần đăng nhập
- **Response `data`**: [WeeklyProgressDto](#schema-weeklyprogressdto)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `startDate` | query | date (yyyy-MM-dd) |  |  |

#### `GET /api/nutritiondiary/progress`

Calo, macro và mục tiêu từng ngày trong khoảng `[startDate, endDate]` (tối đa 31 ngày). Bỏ trống `endDate` = hôm nay (UTC); bỏ trống `startDate` = 29 ngày trước `endDate` (tức 30 ngày). `endDate` trước `startDate` hoặc quá 31 ngày → `400`.

- **Quyền**: Cần đăng nhập
- **Response `data`**: [WeeklyProgressDto](#schema-weeklyprogressdto) (`days` có đúng một phần tử cho mỗi ngày trong khoảng)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `startDate` | query | date (yyyy-MM-dd) |  |  |
| `endDate` | query | date (yyyy-MM-dd) |  | ≤ startDate + 30 ngày |

#### `PUT /api/nutritiondiary/items/{itemId}`

Sửa một món đã ghi (khẩu phần, dinh dưỡng, chuyển bữa/ngày). Chỉ các trường có mặt mới đổi.

- **Quyền**: Cần đăng nhập
- **Body (JSON)**: [UpdateDiaryItemRequestDto](#schema-updatediaryitemrequestdto)
- **Response `data`**: [DiaryItemDto](#schema-diaryitemdto)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `itemId` | đường dẫn | uuid | có |  |

#### `DELETE /api/nutritiondiary/items/{itemId}`

Xóa một món đã ghi (chỉ món của chính người dùng).

- **Quyền**: Cần đăng nhập
- **Response `data`**: bool

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `itemId` | đường dẫn | uuid | có |  |

#### `POST /api/nutritiondiary/water`

Ghi một lần uống nước. Response có `entryId` để hoàn tác bằng DELETE.

- **Quyền**: Cần đăng nhập
- **Body (JSON)**: [LogWaterRequestDto](#schema-logwaterrequestdto)
- **Response `data`**: [WaterSummaryDto](#schema-watersummarydto)

#### `GET /api/nutritiondiary/water`

Lịch sử nước uống `days` ngày kết thúc ở `date` (tăng dần, gồm cả ngày không có log).

- **Quyền**: Cần đăng nhập
- **Response `data`**: [WaterHistoryDto](#schema-waterhistorydto)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `date` | query | date (yyyy-MM-dd) |  |  |
| `days` | query | int |  | 1–31 |

#### `DELETE /api/nutritiondiary/water/{entryId}`

Xóa một lần uống nước (dùng cho "Hoàn tác"); trả tổng của ngày sau khi xóa.

- **Quyền**: Cần đăng nhập
- **Response `data`**: [WaterSummaryDto](#schema-watersummarydto)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `entryId` | đường dẫn | uuid | có |  |

### Thực phẩm

> `/foods` gồm nguyên liệu lẫn **món ăn** (15 món Việt mẫu, dinh dưỡng trên 100 g kèm `servings` như "1 tô vừa = 500 g"). Món mẫu có `isVerified = false` vì là số liệu ước lượng (BR-120/121).

> `scope`: `all` (mặc định: thực phẩm chung + của tôi), `mine` (tôi tự nhập), `recent` (đã ghi nhật ký gần đây, theo `ingredientId`), `favorite`; ba scope sau cần đăng nhập. Tìm kiếm không phân biệt dấu ("pho" ra "Phở").

> Món người dùng tự nhập chỉ chủ sở hữu thấy; trùng tên → `409`; tối đa 200 món/tài khoản. Số liệu trên 100 g phải hợp lý (≤ 900 kcal, carbs + béo + đạm ≤ 100 g).

#### `GET /api/foods`

Tìm thực phẩm (nguyên liệu + món ăn). `scope`: all (mặc định) | mine | recent | favorite — ba mục sau cần đăng nhập. Tìm kiếm không phân biệt hoa/thường và dấu tiếng Việt.

- **Quyền**: Công khai (token tùy chọn: cá nhân hóa `isFavorite`, `scope`…)
- **Response `data`**: [FoodItemDtoPagedResult](#schema-fooditemdtopagedresult)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `search` | query | string |  |  |
| `category` | query | string |  |  |
| `scope` | query | string |  |  |
| `page` | query | int |  |  |
| `pageSize` | query | int |  |  |

#### `POST /api/foods`

Người dùng tự nhập một món (BR-120/121): gắn nhãn "do người dùng nhập", chỉ chủ sở hữu thấy.

- **Quyền**: Cần đăng nhập
- **Body (JSON)**: [CreateFoodRequestDto](#schema-createfoodrequestdto)
- **Response `data`**: [FoodItemDto](#schema-fooditemdto)

#### `GET /api/foods/{id}`

Chi tiết thực phẩm (món của người khác không xem được: 404).

- **Quyền**: Công khai (token tùy chọn: cá nhân hóa `isFavorite`, `scope`…)
- **Response `data`**: [FoodItemDto](#schema-fooditemdto)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `id` | đường dẫn | uuid | có |  |

#### `DELETE /api/foods/{id}`

Xóa món do chính mình tự nhập; nhật ký đã ghi giữ nguyên số liệu.

- **Quyền**: Cần đăng nhập
- **Response `data`**: bool

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `id` | đường dẫn | uuid | có |  |

#### `GET /api/foods/barcode/{code}`

Tra mã vạch (8–14 chữ số). CSDL chưa có thì tra **Open Food Facts** (API công khai, không cần khóa; tắt bằng `OpenFoodFacts:Enabled=false`) và lưu sản phẩm thành thực phẩm chung `isVerified = false` (mô tả ghi nguồn), lần sau đọc từ CSDL. Chất gây dị ứng lấy từ `allergens_tags` và cả `traces_tags` (có thể chứa vết). Không tìm thấy, sản phẩm thiếu tên/năng lượng hoặc số liệu vô lý → `404` — không đoán số liệu (BR-120/130). `POST /ai/check-safety { barcode }` dùng cùng nguồn.

- **Quyền**: Công khai (token tùy chọn: cá nhân hóa `isFavorite`, `scope`…)
- **Response `data`**: [FoodItemDto](#schema-fooditemdto)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `code` | đường dẫn | string | có |  |

#### `POST /api/foods/{id}/favorite`

Thêm vào yêu thích (idempotent).

- **Quyền**: Cần đăng nhập
- **Response `data`**: [FoodFavoriteDto](#schema-foodfavoritedto)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `id` | đường dẫn | uuid | có |  |

#### `DELETE /api/foods/{id}/favorite`

Bỏ khỏi yêu thích (idempotent).

- **Quyền**: Cần đăng nhập
- **Response `data`**: [FoodFavoriteDto](#schema-foodfavoritedto)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `id` | đường dẫn | uuid | có |  |

### Đồng bộ vận động

> `POST` gửi **tổng của một ngày từ một nguồn**; gửi lại cùng `(ngày, nguồn)` **thay thế** giá trị cũ, không cộng dồn. Nguồn hợp lệ theo ưu tiên: `HealthConnect > AppleHealth > GoogleFit > Manual`.

> `GET /daily-summary` lấy số liệu từ **một** nguồn ưu tiên cao nhất có dữ liệu trong ngày (`activeSource`), không cộng các nguồn (BR-042). Chưa đồng bộ gì: `sources: []`, `lastSyncedAt: null`.

#### `POST /api/health-sync/steps-and-calories`

Gửi tổng của một ngày từ một nguồn. Gửi lại cùng (ngày, nguồn) thay thế giá trị cũ, không cộng dồn.

- **Quyền**: Cần đăng nhập
- **Body (JSON)**: [SyncHealthMetricsRequestDto](#schema-synchealthmetricsrequestdto)
- **Response `data`**: [SyncHealthMetricsResponseDto](#schema-synchealthmetricsresponsedto)

#### `GET /api/health-sync/daily-summary`

Tổng kết vận động của một ngày theo nguồn ưu tiên cao nhất (kèm calo đã ăn, còn lại so với mục tiêu).

- **Quyền**: Cần đăng nhập
- **Response `data`**: [DailyHealthSyncSummaryDto](#schema-dailyhealthsyncsummarydto)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `date` | query | date (yyyy-MM-dd) |  |  |

### Công thức, yêu thích, bộ sưu tập

> `GET /recipes` trả mảng; phân trang ở header `X-Total-Count`, `X-Page`, `X-Page-Size`, `X-Total-Pages`. Bộ lọc: `search`, `tag`, `difficulty`, `maxCalories`, `mealType`, `maxCookTimeMinutes` (tổng chuẩn bị + nấu), `excludeMyAllergens` (cần đăng nhập, loại món chứa dị ứng của người dùng — BR-101/102).

> `RecipeDto.allergyIds` gộp mọi chất gây dị ứng của các nguyên liệu (nhiều-nhiều); từng nguyên liệu có `allergyIds` riêng. `isFavorite` chỉ đúng khi có token. `POST /{id}/favorite` là **toggle**.

> Bộ sưu tập: chỉ chủ sở hữu được sửa/xóa/thêm/bỏ món (`403` với người khác); `isOwner` cho biết quyền của người đang gọi. Bí danh `/api/recipe/...` cũng hoạt động.

#### `GET /api/recipes`

Danh sách công thức. `data` luôn là mảng; thông tin phân trang nằm ở header `X-Total-Count`, `X-Page`, `X-Page-Size`, `X-Total-Pages`. Không gửi `page`/`pageSize` = trả tất cả.

- **Quyền**: Công khai (token tùy chọn: cá nhân hóa `isFavorite`, `scope`…)
- **Response `data`**: [RecipeDto](#schema-recipedto)[]

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `search` | query | string |  |  |
| `tag` | query | string |  |  |
| `difficulty` | query | string |  |  |
| `maxCalories` | query | int |  |  |
| `mealType` | query | string |  |  |
| `maxTotalMinutes` | query | int |  |  |
| `page` | query | int |  |  |
| `pageSize` | query | int |  |  |
| `excludeMyAllergens` | query | bool |  |  |
| `maxCookTimeMinutes` | query | int |  |  |

#### `GET /api/recipes/{id}`

Chi tiết công thức kèm nguyên liệu (mỗi nguyên liệu có `allergyIds`), `allergyIds` của cả công thức và `isFavorite`.

- **Quyền**: Công khai (token tùy chọn: cá nhân hóa `isFavorite`, `scope`…)
- **Response `data`**: [RecipeDto](#schema-recipedto)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `id` | đường dẫn | uuid | có |  |

#### `POST /api/recipes/suggest-by-pantry`

Gợi ý theo tủ lạnh. Có token → tự loại công thức chứa chất gây dị ứng của người dùng.

- **Quyền**: Công khai (có token thì loại món chứa dị ứng của người dùng)
- **Body (JSON)**: [PantrySuggestionRequestDto](#schema-pantrysuggestionrequestdto)
- **Response `data`**: [RecipeDto](#schema-recipedto)[]

#### `POST /api/recipes/{id}/favorite`

Bật/tắt yêu thích (TOGGLE): trả `isFavorite` mới và `totalFavorites`.

- **Quyền**: Cần đăng nhập
- **Response `data`**: [FavoriteToggleResponseDto](#schema-favoritetoggleresponsedto)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `id` | đường dẫn | uuid | có |  |

#### `GET /api/recipes/favorites`

Các công thức người dùng đã yêu thích.

- **Quyền**: Cần đăng nhập
- **Response `data`**: [RecipeDto](#schema-recipedto)[]

#### `GET /api/recipes/collections`

Bộ sưu tập của người dùng và các bộ sưu tập công khai của người khác (mới → cũ); `isOwner` cho biết có quyền sửa hay không.

- **Quyền**: Cần đăng nhập
- **Response `data`**: [RecipeCollectionDto](#schema-recipecollectiondto)[]

#### `POST /api/recipes/collections`

Tạo bộ sưu tập (mặc định riêng tư).

- **Quyền**: Cần đăng nhập
- **Body (JSON)**: [CreateCollectionRequestDto](#schema-createcollectionrequestdto)
- **Response `data`**: [RecipeCollectionDto](#schema-recipecollectiondto)

#### `GET /api/recipes/collections/{collectionId}`

Chi tiết một bộ sưu tập (của mình hoặc công khai); bộ sưu tập riêng của người khác trả 404.

- **Quyền**: Cần đăng nhập
- **Response `data`**: [RecipeCollectionDto](#schema-recipecollectiondto)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `collectionId` | đường dẫn | uuid | có |  |

#### `PATCH /api/recipes/collections/{collectionId}`

Đổi tên/mô tả/ảnh bìa/công khai — chỉ chủ sở hữu (403 với người khác, BR-152).

- **Quyền**: Cần đăng nhập
- **Body (JSON)**: [UpdateCollectionRequestDto](#schema-updatecollectionrequestdto)
- **Response `data`**: [RecipeCollectionDto](#schema-recipecollectiondto)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `collectionId` | đường dẫn | uuid | có |  |

#### `DELETE /api/recipes/collections/{collectionId}`

Xóa bộ sưu tập — chỉ chủ sở hữu.

- **Quyền**: Cần đăng nhập
- **Response `data`**: bool

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `collectionId` | đường dẫn | uuid | có |  |

#### `POST /api/recipes/collections/{collectionId}/items`

Thêm công thức vào bộ sưu tập — chỉ chủ sở hữu.

- **Quyền**: Cần đăng nhập
- **Body (JSON)**: [AddRecipeToCollectionDto](#schema-addrecipetocollectiondto)
- **Response `data`**: bool

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `collectionId` | đường dẫn | uuid | có |  |

#### `DELETE /api/recipes/collections/{collectionId}/items/{recipeId}`

Bỏ công thức khỏi bộ sưu tập — chỉ chủ sở hữu.

- **Quyền**: Cần đăng nhập
- **Response `data`**: bool

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `collectionId` | đường dẫn | uuid | có |  |
| `recipeId` | đường dẫn | uuid | có |  |

> **Liên kết chia sẻ**: mã 32 ký tự base64url ngẫu nhiên; ai có mã đều xem được bộ sưu tập (chỉ đọc) qua `GET /recipes/collections/shared/{shareToken}`, kể cả khi bộ sưu tập riêng tư — khác `isPublic` (hiện cho mọi người trong `GET /recipes/collections`). Tạo mã mới hoặc tắt liên kết thì mã cũ trả 404. `shareToken` trong `RecipeCollectionDto` chỉ có với chủ sở hữu. Deep link của app: `smartmealmobile://shared/collections/{shareToken}`.

#### `POST /api/recipes/collections/{collectionId}/share`

Bật liên kết chia sẻ chỉ đọc — chỉ chủ sở hữu (403/404 như khi sửa). Đã có mã thì trả lại mã cũ; `regenerate=true` tạo mã mới và liên kết cũ hết hiệu lực.

- **Quyền**: Cần đăng nhập
- **Response `data`**: [CollectionShareDto](#schema-collectionsharedto)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `collectionId` | đường dẫn | uuid | có |  |
| `regenerate` | query | bool |  | mặc định false |

#### `DELETE /api/recipes/collections/{collectionId}/share`

Tắt liên kết chia sẻ (idempotent) — chỉ chủ sở hữu.

- **Quyền**: Cần đăng nhập
- **Response `data`**: bool

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `collectionId` | đường dẫn | uuid | có |  |

#### `GET /api/recipes/collections/shared/{shareToken}`

Xem bộ sưu tập qua liên kết chia sẻ (chỉ đọc, kể cả bộ sưu tập riêng tư). Không cần đăng nhập; có token thì cá nhân hóa `isFavorite`/`healthWarnings`. Mã sai hoặc đã tắt → 404.

- **Quyền**: Công khai
- **Response `data`**: [RecipeCollectionDto](#schema-recipecollectiondto)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `shareToken` | đường dẫn | string | có | ≤64 ký tự |

### Thực đơn tuần

> Mỗi `(người dùng, ngày, bữa)` chỉ có một món trong thực đơn (ràng buộc duy nhất). Hai request đồng thời vào cùng ô: một bên thắng, bên kia nhận `409` kèm thông báo thử lại.

> `auto-generate` loại hẳn món chứa chất gây dị ứng của người dùng và, với `keepExisting = true`, không ghi đè các ô người dùng đã chọn (BR-163). `PATCH /{id}/complete` đánh dấu đã nấu/ăn.

> **Bệnh lý (BR-110/111)**: món vượt ngưỡng tham khảo cho một khẩu phần theo bệnh lý đã khai báo bị loại khỏi thực đơn tự tạo (tiểu đường: đường/carb; cao huyết áp: natri; mỡ máu: chất béo; gout: nhóm nguyên liệu nhiều purin) — ngưỡng ở mục `HealthConditionLimits`. Món người dùng tự chọn vẫn gán được; chi tiết công thức có `healthWarnings`. **Mục tiêu calo**: mỗi bữa có tỷ lệ của `targetDailyCalories` (mặc định lấy từ hồ sơ), ưu tiên món nằm trong ±15% (tối thiểu ±50 kcal); `dietTag` là ưu tiên mềm. Không còn món phù hợp → `400` `no_suitable_recipes`; `message` của kết quả thành công có thể kèm ghi chú (vd. phải dùng món ngoài chế độ ăn).

> `assign` từ chối món chứa chất gây dị ứng của người dùng: `400` kèm `errors: ["allergen_conflict"]` (BR-102).

#### `GET /api/mealplanner/week`

Lấy kế hoạch thực đơn 7 ngày trong tuần (kèm tổng Calo & Macros mỗi ngày).

- **Quyền**: Cần đăng nhập
- **Response `data`**: [WeeklyMealPlanDto](#schema-weeklymealplandto)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `startDate` | query | date (yyyy-MM-dd) |  |  |

#### `POST /api/mealplanner/assign`

Gán hoặc thay đổi một món ăn vào lịch tuần (Sáng, Trưa, Tối, Phụ). Mỗi (ngày, bữa) chỉ có một món.

- **Quyền**: Cần đăng nhập
- **Body (JSON)**: [AssignMealPlanRequestDto](#schema-assignmealplanrequestdto)
- **Response `data`**: [PlannedMealItemDto](#schema-plannedmealitemdto)

#### `PATCH /api/mealplanner/{id}/complete`

Đánh dấu một món trong thực đơn là đã nấu/ăn (hoặc bỏ đánh dấu). Body bỏ trống = đã nấu.

- **Quyền**: Cần đăng nhập
- **Body (JSON)**: [CompleteMealPlanRequestDto](#schema-completemealplanrequestdto)
- **Response `data`**: [PlannedMealItemDto](#schema-plannedmealitemdto)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `id` | đường dẫn | uuid | có |  |

#### `DELETE /api/mealplanner/{id}`

Xóa một món ăn khỏi thực đơn tuần.

- **Quyền**: Cần đăng nhập
- **Response `data`**: bool

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `id` | đường dẫn | uuid | có |  |

#### `POST /api/mealplanner/auto-generate`

Tự động sinh thực đơn 7 ngày, loại hẳn món chứa chất gây dị ứng của người dùng. `keepExisting=true` chỉ điền các ô còn trống. **Chỉ dành cho Pro**: tài khoản Free → `403` (`errors` có `pro_required`).

- **Quyền**: Cần đăng nhập
- **Body (JSON)**: [AutoGeneratePlanRequestDto](#schema-autogenerateplanrequestdto)
- **Response `data`**: [WeeklyMealPlanDto](#schema-weeklymealplandto)

### Đi chợ

> `generate-from-plan` gộp nguyên liệu cùng tên/đơn vị từ các món trong khoảng ngày, trả `mergedFromRecipeCount`; giá ước tính tính theo đơn vị (BR-174). Món người dùng tự thêm (`isManual`) được giữ khi tạo lại. `GET /grocery` trả kèm `periodStart/periodEnd/generatedAt` (để app biết danh sách đã cũ so với thực đơn) và `lastTrip`. `PATCH /items/check-all` đánh dấu/bỏ đánh dấu cả danh sách trong một lần.

#### `GET /api/grocery`

Lấy danh sách đi chợ hiện tại của người dùng (nhóm theo quầy siêu thị & tính tổng chi phí ước tính).

- **Quyền**: Cần đăng nhập
- **Response `data`**: [GrocerySummaryDto](#schema-grocerysummarydto)

#### `POST /api/grocery/generate-from-plan`

Tự động tổng hợp danh sách đi chợ từ thực đơn trong khoảng ngày (gộp nguyên liệu cùng tên/đơn vị, kèm số bữa đã gộp).

- **Quyền**: Cần đăng nhập
- **Body (JSON)**: [GenerateGroceryRequestDto](#schema-generategroceryrequestdto)
- **Response `data`**: [GrocerySummaryDto](#schema-grocerysummarydto)

#### `POST /api/grocery/items`

Thêm thủ công một món hàng cần mua vào danh sách đi chợ.

- **Quyền**: Cần đăng nhập
- **Body (JSON)**: [AddCustomGroceryItemDto](#schema-addcustomgroceryitemdto)
- **Response `data`**: [GroceryItemDto](#schema-groceryitemdto)

#### `PATCH /api/grocery/items/check-all`

Đánh dấu đã mua (hoặc bỏ đánh dấu) toàn bộ danh sách trong một lần. Body bỏ trống = đã mua tất cả. Trả danh sách mới.

- **Quyền**: Cần đăng nhập
- **Body (JSON)**: [CheckAllGroceryItemsRequestDto](#schema-checkallgroceryitemsrequestdto)
- **Response `data`**: [GrocerySummaryDto](#schema-grocerysummarydto)

#### `PATCH /api/grocery/items/{id}/check`

Đánh dấu đã mua hoặc bỏ đánh dấu cho một món đồ trong danh sách đi chợ.

- **Quyền**: Cần đăng nhập
- **Body (JSON)**: [ToggleGroceryItemRequestDto](#schema-togglegroceryitemrequestdto)
- **Response `data`**: [GroceryItemDto](#schema-groceryitemdto)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `id` | đường dẫn | uuid | có |  |

#### `DELETE /api/grocery/items/{id}`

Xóa một món đồ khỏi danh sách đi chợ.

- **Quyền**: Cần đăng nhập
- **Response `data`**: bool

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `id` | đường dẫn | uuid | có |  |

#### `DELETE /api/grocery/clear-checked`

Dọn dẹp toàn bộ các món đồ đã đánh dấu mua (Clear Checked Items).

- **Quyền**: Cần đăng nhập
- **Response `data`**: bool

#### `POST /api/grocery/complete`

Hoàn tất mua sắm: lưu chi phí thực tế (BR-174), bỏ các món đã mua, giữ hoặc bỏ các món chưa mua; khi giữ có thể cộng luôn thực đơn kỳ kế tiếp (gộp với món chưa mua). Tất cả trong một transaction; trả danh sách sau khi hoàn tất (kèm `lastTrip`).

- **Quyền**: Cần đăng nhập
- **Body (JSON)**: [CompleteGroceryRequestDto](#schema-completegroceryrequestdto)
- **Response `data`**: [GrocerySummaryDto](#schema-grocerysummarydto)

### AI

> Mọi endpoint AI cần đăng nhập. Tài khoản **Free có `Ai:FreeDailyLimit` (5) lượt/ngày**, Pro không giới hạn (BR-233); hết lượt → `429` kèm `errors: ["ai_quota_exceeded"]`. Ngày làm mới theo múi giờ `Ai:QuotaUtcOffsetHours` (mặc định +7).

> Lượt chỉ bị trừ khi AI trả kết quả **thành công**. `check-safety` và `scan-label` không tính vào hạn mức (tính năng an toàn) nhưng có giới hạn tần suất (policy `scanner`).

> Chưa cấu hình `Gemini:ApiKey`: ở Development trả dữ liệu **mẫu** với `isDemo: true` (cờ `Ai:AllowDemoFallback`); nơi khác trả `503` (chưa cấu hình). Đã có khóa mà Gemini lỗi thì trả `502` ở mọi môi trường (chỉ trả dữ liệu mẫu khi đặt `Ai:AllowDemoFallback=true`) thay vì giả vờ thành công. Model chính bị ngừng (404) hoặc quá tải (429/5xx) thì backend thử lần lượt các model trong `Gemini:FallbackModels`.

> `voice-log` nhận **văn bản**; `voice-log/audio` nhận **file ghi âm** (≤ `Ai:MaxAudioBytes`, 10 MB) và trả thêm `transcript` — đoạn ghi âm không nghe ra món nào → `400` `voice_unrecognized` (không trừ lượt). Ảnh `snap-and-track`/`fridge-scanner`/`scan-label` ≤ `Ai:MaxImageBytes` (5 MB), chỉ JPG/PNG/WebP.

> `check-safety` với `barcode`: tra sản phẩm trong **CSDL** (món hệ thống hoặc món người dùng tự nhập kèm mã vạch), không để AI đoán; `source = "database"`, `product` có thông tin sản phẩm, dinh dưỡng tính trên 100 g (`basis = "per100g"`). Chưa có sản phẩm → `404` `product_not_found` (trừ khi gửi kèm `ocrRawText`, khi đó AI phân tích văn bản nhãn). Cảnh báo dị ứng theo hồ sơ (`DANGER`) và cảnh báo vượt ngưỡng trên 100 g ở mục `ProductSafety` (`WARNING`, hoặc `DANGER` nếu người dùng có bệnh lý liên quan) do server tính bằng code.

#### `GET /api/ai/quota`

Hạn mức AI còn lại hôm nay.

- **Quyền**: Cần đăng nhập
- **Response `data`**: [AiQuotaDto](#schema-aiquotadto)

#### `POST /api/ai/snap-and-track`

AI Snap & Track: ảnh đĩa thức ăn (multipart, trường `image`; JPG/PNG/WebP, tối đa 5 MB).

- **Quyền**: Cần đăng nhập
- **Body (multipart/form-data)**: field `image` (file)
- **Response `data`**: [SnapAndTrackResponseDto](#schema-snapandtrackresponsedto)

#### `POST /api/ai/fridge-scanner`

Fridge Scanner: ảnh nguyên liệu trong tủ lạnh (multipart, trường `image`). **Chỉ dành cho Pro**: tài khoản Free → `403` (`errors` có `pro_required`), không tốn lượt AI.

- **Quyền**: Cần đăng nhập
- **Body (multipart/form-data)**: field `image` (file)
- **Response `data`**: [FridgeScannerResponseDto](#schema-fridgescannerresponsedto)

#### `POST /api/ai/voice-log`

Voice Log: văn bản (đã nhận dạng giọng nói trên máy) → món ăn kèm dinh dưỡng.

- **Quyền**: Cần đăng nhập
- **Body (JSON)**: [VoiceLogRequestDto](#schema-voicelogrequestdto)
- **Response `data`**: [VoiceLogResponseDto](#schema-voicelogresponsedto)

#### `POST /api/ai/voice-log/audio`

Voice Log từ file ghi âm (multipart, trường `audio`; WAV/AAC/M4A/MP3/OGG/WebM, tối đa 10 MB): AI chép lời rồi bóc tách món ăn. Kết quả có `transcript` để người dùng đối chiếu; vẫn phải qua bước xác nhận trước khi lưu (BR-054/070). Tính vào hạn mức như `voice-log`.

- **Quyền**: Cần đăng nhập
- **Body (multipart/form-data)**: field `audio` (file)
- **Response `data`**: [VoiceLogResponseDto](#schema-voicelogresponsedto)

#### `POST /api/ai/check-safety`

Kiểm tra an toàn sản phẩm theo dị ứng/bệnh lý của người dùng (BR-140). Không tính vào hạn mức miễn phí vì đây là tính năng an toàn, nhưng vẫn cần đăng nhập.

- **Quyền**: Cần đăng nhập
- **Body (JSON)**: [CheckSafetyRequestDto](#schema-checksafetyrequestdto)
- **Response `data`**: [CheckSafetyResponseDto](#schema-checksafetyresponsedto)

#### `POST /api/ai/scan-label`

Đọc nhãn dinh dưỡng từ ảnh (multipart, trường `image`) rồi kiểm tra an toàn (BR-130/140). Kết quả là ước tính của AI (`source = "ai"`, có `productName`, `ocrText`; trường nhãn không ghi để `null`), người dùng phải kiểm tra trước khi lưu. Không tính vào hạn mức miễn phí (tính năng an toàn), có giới hạn tần suất.

- **Quyền**: Cần đăng nhập
- **Body (multipart/form-data)**: field `image` (file)
- **Response `data`**: [CheckSafetyResponseDto](#schema-checksafetyresponsedto)

### Bé Mầm: XP, thử thách, huy hiệu

> Tiến trình được **tính khi đọc** (lazy): mở `/pet`, `/streak`, `/challenges`, `/badges` sẽ cộng XP cho nhiệm vụ đã hoàn thành từ nhật ký/nước/đồng bộ vận động. Mỗi sự kiện chỉ cộng **một lần** (unique `XpEvent`), đọc lại không cộng thêm. `?date=yyyy-MM-dd` cho phép tính cho một ngày gần đây (giới hạn ±1 ngày so với ngày UTC).

> Quy tắc: 500 XP mỗi cấp; nhiệm vụ ngày: ghi bữa sáng +10, đạt mục tiêu protein +20, uống đủ nước +10. Giai đoạn pet: `Baby` (<3), `Child` (<6), `Teen` (<10), `Adult`. Huy hiệu: `first-log`, `streak-3`, `hydrated`, `streak-7`, `eat-clean-7`, `grocery-shopper`, `ai-snap-10`, `protein-goal`, `resilient-30`. Trang phục: `straw-hat` (Level 3), `sunglasses` (Level 6), `green-scarf` (chuỗi 7 ngày), `backpack` (hoàn thành 1 thử thách).

> `POST /challenges/{id}/join` idempotent (đã tham gia thì trả lại bản cũ, khung ngày bắt đầu từ hôm nay). `POST /costumes/{id}/equip`: `400` nếu chưa mở khóa, `404` nếu không có.

#### `GET /api/gamification/pet`

Trạng thái pet: cấp độ, XP, nhiệm vụ hôm nay. Mở màn này cũng cộng XP cho nhiệm vụ đã làm xong (đúng một lần mỗi ngày).

- **Quyền**: Cần đăng nhập
- **Response `data`**: [HealthPetStatusDto](#schema-healthpetstatusdto)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `date` | query | date (yyyy-MM-dd) |  |  |

#### `GET /api/gamification/streak`

Chuỗi ngày hiện tại, dài nhất và 7 ngày của tuần.

- **Quyền**: Cần đăng nhập
- **Response `data`**: [StreakStatusDto](#schema-streakstatusdto)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `date` | query | date (yyyy-MM-dd) |  |  |

#### `GET /api/gamification/challenges`

Danh sách thử thách kèm tiến độ của người dùng.

- **Quyền**: Cần đăng nhập
- **Response `data`**: [ChallengeDto](#schema-challengedto)[]

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `date` | query | date (yyyy-MM-dd) |  |  |

#### `POST /api/gamification/challenges/{id}/join`

Tham gia thử thách (idempotent): bắt đầu khung ngày từ hôm nay; đã tham gia thì trả lại bản cũ.

- **Quyền**: Cần đăng nhập
- **Response `data`**: [ChallengeDto](#schema-challengedto)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `id` | đường dẫn | uuid | có |  |
| `date` | query | date (yyyy-MM-dd) |  |  |

#### `GET /api/gamification/badges`

Huy hiệu (đã mở/chưa) và trang phục (đã mở/đang mặc).

- **Quyền**: Cần đăng nhập
- **Response `data`**: [BadgesSummaryDto](#schema-badgessummarydto)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `date` | query | date (yyyy-MM-dd) |  |  |

#### `POST /api/gamification/costumes/{costumeId}/equip`

Mặc một trang phục đã mở (400 nếu chưa mở khóa, 404 nếu không có).

- **Quyền**: Cần đăng nhập
- **Response `data`**: [BadgesSummaryDto](#schema-badgessummarydto)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `costumeId` | đường dẫn | string | có |  |
| `date` | query | date (yyyy-MM-dd) |  |  |

#### `DELETE /api/gamification/costumes/equipped`

Cởi trang phục đang mặc.

- **Quyền**: Cần đăng nhập
- **Response `data`**: [BadgesSummaryDto](#schema-badgessummarydto)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `date` | query | date (yyyy-MM-dd) |  |  |

### Thông báo

> Thông báo do **server tạo từ sự kiện thật**, mỗi sự kiện đúng một lần (khóa duy nhất theo người dùng + sự kiện): Bé Mầm lên cấp (`pet`, kèm trang phục mở ở cấp đó), mở huy hiệu (`badge`), hoàn thành thử thách (`challenge`), danh sách đi chợ tạo từ thực đơn — mỗi khoảng ngày một lần (`grocery`), kích hoạt Pro và Pro còn ≤ 3 ngày (`premium`). Nhắc giờ ăn/uống nước là thông báo cục bộ của app, không đi qua API này.

> `GET /notifications` đánh giá lại tiến trình Bé Mầm như các endpoint gamification (`date` = hôm nay theo máy, ±1 ngày quanh UTC) và dọn thông báo quá 90 ngày. "Xóa dữ liệu cá nhân" xóa cả thông báo.

> Sự kiện được đánh giá **ngay lúc ghi dữ liệu**, không đợi app đọc lại: ghi/sửa món (`/nutritiondiary/log`, `/log/batch`, `PUT /items/{id}` — theo ngày của món), uống nước (`/nutritiondiary/water`), đồng bộ bước (`/health-sync/steps-and-calories`) và đi chợ đều chạy đánh giá gamification sau khi lưu (lỗi đánh giá không làm hỏng thao tác chính).

#### Thông báo real-time — `WebSocket /api/hubs/notifications`

Hub SignalR (giao thức JSON). Mỗi thông báo mới được đẩy ngay tới **mọi thiết bị đang kết nối của đúng người dùng đó**, đúng một lần, và chỉ sau khi đã lưu vào database (thông báo ghi trong transaction — vd. lên cấp cùng lúc cộng XP — được gửi sau commit).

- **Quyền**: Cần đăng nhập. App native gửi `Authorization: Bearer <token>` khi mở WebSocket; trình duyệt (Expo web) không gửi được header nên dùng query `?access_token=<token>` — query này **chỉ** được chấp nhận ở đường dẫn hub.
- **Kết nối**: WebSocket, bỏ negotiate (`skipNegotiation: true`). Client chỉ nghe, không gọi method nào lên hub.
- **Sự kiện server → app**: `notification` — payload là [NotificationDto](#schema-notificationdto), giống một phần tử của `GET /notifications`.
- Không kết nối (app tắt, mất mạng) thì không nhận gì — thông báo vẫn nằm trong `GET /notifications`. App đọc lại danh sách mỗi lần kết nối (lại) để không sót.

#### `GET /api/notifications`

Thông báo của người dùng (mới → cũ) kèm số chưa đọc.

- **Quyền**: Cần đăng nhập
- **Response `data`**: [NotificationListDto](#schema-notificationlistdto)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `limit` | query | int |  | 1–100, mặc định 50 |
| `date` | query | date (yyyy-MM-dd) |  |  |

#### `PATCH /api/notifications/{id}/read`

Đánh dấu một thông báo đã đọc (idempotent); thông báo của người khác trả 404.

- **Quyền**: Cần đăng nhập
- **Response `data`**: [NotificationDto](#schema-notificationdto)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `id` | đường dẫn | uuid | có |  |

#### `POST /api/notifications/read-all`

Đánh dấu đã đọc tất cả thông báo.

- **Quyền**: Cần đăng nhập
- **Response `data`**: [MarkAllNotificationsReadResultDto](#schema-markallnotificationsreadresultdto)

### Gói Pro & thanh toán

> Gói: `PRO_MONTHLY` 79.000đ / 30 ngày, `PRO_YEARLY` 699.000đ / 365 ngày. Phương thức: `SEPAY`, `PAYOS` (đều là chuyển khoản VietQR) và `BANK_TRANSFER` (chuyển khoản theo số tài khoản, không QR). Quyền lợi Pro (máy chủ kiểm tra): AI không giới hạn lượt (Free 5 lượt/ngày), quét tủ lạnh (`/ai/fridge-scanner`) và tự tạo thực đơn tuần (`/mealplanner/auto-generate`) — Free gọi hai tính năng này nhận `403 pro_required`.

> Pro chỉ kích hoạt khi **cổng thanh toán xác nhận đã nhận tiền** (webhook của cổng hoặc máy chủ tự hỏi cổng) — BR-241/242. Mọi đường xác nhận dùng chung một bước idempotent nên Pro không bị cộng hạn hai lần. Các cổng giả lập trước đây (`VNPAY`/`MOMO`/`STRIPE` với URL tự dựng và webhook `/subscription/webhook` tự định nghĩa) đã bị bỏ.

> **SePay** (`paymentMethod = SEPAY`): người dùng chuyển khoản thẳng vào tài khoản ngân hàng đã liên kết SePay. `create-checkout-session` trả `orderCode`, `qrCodeUrl` (ảnh VietQR đã điền sẵn số tiền và nội dung), `bankCode`, `accountNumber`, `accountName`, `transferContent` (mã thanh toán = `SePay:PaymentCodePrefix` + 8 ký tự, cũng là `sessionId`) và `expiresAt` (hạn hiển thị mã; tiền tới sau hạn vẫn được ghi nhận). Pro kích hoạt khi tiền vào đúng mã với số tiền đủ — qua `POST /subscription/sepay-webhook` (header `Authorization: Apikey {SePay:WebhookApiKey}`, sai → `401`) **hoặc** khi app gọi `check-status` và máy chủ tự hỏi API giao dịch của SePay (`SePay:ApiToken`, tối đa 1 lần / `SePay:StatusCheckIntervalSeconds` mỗi đơn). Mã được tìm cả trong trường `code` của SePay lẫn trong nội dung chuyển khoản (không phân biệt hoa thường, bỏ qua chữ/dấu ngân hàng chèn thêm). Chuyển thiếu tiền, tiền ra, nội dung không khớp đơn nào → `200 {"success": true}` nhưng không kích hoạt (ghi log để đối soát). Thiếu tài khoản nhận hoặc không có cách xác nhận nào → `503 sepay_not_configured`.

> **Chuyển khoản qua số tài khoản** (`paymentMethod = BANK_TRANSFER`): giống hệt SePay (cùng tài khoản nhận, cùng cách sinh mã nội dung, cùng webhook/`check-status` để xác nhận) nhưng **không có QR** — `qrCodeUrl = null`, `paymentUrl = ""`; app hiện `bankCode`/`accountNumber`/`accountName`/`transferContent` để người dùng tự chuyển trong app ngân hàng. Giao dịch lưu riêng `paymentMethod = BANK_TRANSFER` trong lịch sử. Cần SePay đã cấu hình (thiếu → `503 sepay_not_configured`).

> **PayOS** (`paymentMethod = PAYOS`, chuyển khoản VietQR) là cổng thật: `create-checkout-session` gọi PayOS tạo link và trả thêm `orderCode`, `qrCode` (chuỗi VietQR) và `qrCodeUrl` (ảnh QR). Pro chỉ kích hoạt khi PayOS xác nhận — qua `POST /subscription/payos-webhook` (chữ ký kiểm bằng `PayOS:ChecksumKey`, sai → `401`; webhook thử với mã đơn lạ → `200`) **hoặc** khi app gọi `GET /subscription/check-status/{orderCode}` và máy chủ hỏi thẳng PayOS thấy `PAID` với số tiền đủ (dùng được khi webhook không tới được máy chủ, vd. máy dev). Cả hai đường dùng chung một bước xác nhận idempotent nên Pro không bị cộng hạn hai lần. Thiếu khóa PayOS → `503 payos_not_configured`; PayOS lỗi khi tạo link → `502 payos_error`. App gửi kèm `returnUrl` là deep link của chính nó (`smartmealmobile://payment-result`; Expo Go `exp://…/--/payment-result`) để PayOS chuyển về đúng app; máy chủ chỉ nhận scheme `smartmealmobile` (và `exp`/`exps` ở Development), URL khác → `400 invalid_return_url`. App không điều hướng theo link này — màn chờ tự hỏi `check-status` khi app được mở lại.

> `activate-mock` mô phỏng cổng thanh toán, **chỉ chạy ở Development** (hoặc khi `Subscription:AllowMockActivation = true`); nơi khác trả `404`. Gia hạn khi còn hạn thì cộng thêm vào cuối kỳ hiện tại.

> Trạng thái: `Free`, `Premium`, `Cancelled` (đã hủy gia hạn, **vẫn là Pro tới hết hạn**), `Expired`. `isPro` đúng khi còn hiệu lực.

#### `GET /api/subscription/plans`

Bảng giá các gói Pro (giá, chu kỳ, quyền lợi) — nguồn duy nhất cho giá.

- **Quyền**: Công khai
- **Response `data`**: [SubscriptionPlanDto](#schema-subscriptionplandto)[]

#### `POST /api/subscription/create-checkout-session`

Tạo phiên thanh toán (`SEPAY`, `PAYOS` hoặc `BANK_TRANSFER`). Gói Pro chỉ được kích hoạt khi cổng thanh toán xác nhận đã nhận tiền (BR-241/242).

- **Quyền**: Cần đăng nhập
- **Body (JSON)**: [CreateCheckoutSessionRequestDto](#schema-createcheckoutsessionrequestdto)
- **Response `data`**: [CheckoutSessionResponseDto](#schema-checkoutsessionresponsedto)

#### `POST /api/subscription/activate-mock`

Chỉ dùng khi phát triển: mô phỏng cổng thanh toán xác nhận. Môi trường thật trả 404.

- **Quyền**: Cần đăng nhập
- **Body (JSON)**: [CreateCheckoutSessionRequestDto](#schema-createcheckoutsessionrequestdto)
- **Response `data`**: bool

#### `POST /api/subscription/sepay-webhook`

Webhook của SePay (đăng ký ở my.sepay.vn → WebHooks, kiểu xác thực **API Key**, URL `https://<máy-chủ>/api/subscription/sepay-webhook`). Body là JSON SePay `{ id, gateway, transactionDate, accountNumber, code, content, transferType, transferAmount, accumulated, subAccount, referenceCode, description }`; chỉ xử lý `transferType = "in"`. Header `Authorization: Apikey {SePay:WebhookApiKey}` — sai/thiếu → `401`. Đã xử lý (kể cả không khớp đơn nào) → `200 {"success": true}` để SePay không gửi lại.

- **Quyền**: Công khai
- **Response `data`**: bool

#### `POST /api/subscription/payos-webhook`

Webhook của PayOS (đăng ký URL này ở my.payos.vn). Body là JSON PayOS `{ code, desc, success, data: { orderCode, amount, ... }, signature }`.

- **Quyền**: Công khai
- **Response `data`**: bool

#### `GET /api/subscription/check-status/{orderCode}`

Trạng thái giao dịch PayOS/SePay của chính bạn; còn chờ thì máy chủ hỏi cổng thanh toán và kích hoạt Pro khi đã nhận đủ tiền (PayOS báo `PAID`; SePay có giao dịch tiền vào đúng mã). Đơn bị hủy/hết hạn bên PayOS → `Failed`. Giao dịch của người khác → `404`.

- **Quyền**: Cần đăng nhập
- **Response `data`**: [PaymentTransactionStatusDto](#schema-paymenttransactionstatusdto)

| Tham số | Vị trí | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|---|
| `orderCode` | đường dẫn | int64 | có |  |

#### `GET /api/subscription/status`

Trạng thái gói: Free | Premium | Expired | Cancelled, gói và hạn dùng.

- **Quyền**: Cần đăng nhập
- **Response `data`**: [SubscriptionStatusDto](#schema-subscriptionstatusdto)

#### `GET /api/subscription/transactions`

Lịch sử giao dịch của người dùng (mới → cũ).

- **Quyền**: Cần đăng nhập
- **Response `data`**: [PaymentTransactionDto](#schema-paymenttransactiondto)[]

#### `POST /api/subscription/cancel`

Hủy gia hạn: vẫn dùng Pro tới hết hạn.

- **Quyền**: Cần đăng nhập
- **Response `data`**: [SubscriptionStatusDto](#schema-subscriptionstatusdto)

## 4. Cấu hình (biến môi trường / appsettings)

Khóa bí mật chỉ đặt qua biến môi trường (`Muc__Khoa`, dùng `__` thay cho `:`), file `backend/.env` (đã bị `.gitignore`; mẫu ở `backend/.env.example`) hoặc User Secrets — **không** commit. Chạy bằng Docker (`docker compose up -d --build` ở thư mục gốc): compose đọc `backend/.env` cho API và tự trỏ chuỗi kết nối tới container `postgres`. Biến môi trường đặt khi chạy được ưu tiên hơn `backend/.env`.

| Khóa | Mặc định | Ý nghĩa |
|---|---|---|
| `ConnectionStrings:DefaultConnection` | — | Chuỗi kết nối PostgreSQL (bắt buộc). Khi khởi động, backend tự `Migrate` rồi seed danh mục/món mẫu. |
| `Jwt:Key` | — (bắt buộc) | Khóa ký HMAC-SHA256, ≥ 32 ký tự. Giá trị mẫu từng công khai bị từ chối ngoài Development; thiếu khóa thì không khởi động. |
| `Jwt:Issuer` / `Jwt:Audience` | `SmartMealBackend` / `SmartMealMobile` | Issuer/audience của token. |
| `Jwt:AccessTokenMinutes` / `Jwt:RefreshTokenDays` | 60 / 30 | Thời hạn access / refresh token. |
| `Auth:MaxFailedLoginAttempts` / `Auth:LockoutMinutes` | 5 / 15 | Khóa tài khoản tạm thời khi đăng nhập sai liên tiếp. |
| `Auth:RefreshReuseGraceSeconds` | 10 | Dùng lại refresh token vừa thu hồi trong khoảng này được coi là gọi trùng song song, không phải bị đánh cắp. |
| `Auth:OtpMinutes` / `Auth:OtpMaxAttempts` / `Auth:OtpResendCooldownSeconds` / `Auth:ResetTokenMinutes` | 5 / 5 / 60 / 10 | Chính sách OTP và mã đặt lại mật khẩu. |
| `Auth:RequireEmailVerification` | (trống = bật khi đã cấu hình SMTP) | Bắt xác minh email bằng OTP sau khi đăng ký: chưa xác minh thì không đăng nhập/gia hạn phiên được. |
| `RateLimiting:AuthPermitsPerMinute` | 30 | Số request/phút/IP cho nhóm endpoint đăng nhập/OTP (policy `auth`). |
| `RateLimiting:ScannerPermitsPerMinute` | 20 | Số request/phút/người dùng cho `check-safety` và `scan-label` (policy `scanner`). |
| `Smtp:Host`, `Port`, `EnableSsl`, `User`, `Password`, `From`, `FromName` | (trống) / 587 / true / … | Gửi email OTP. Cần `Host` và địa chỉ gửi (`From`, trống = dùng `User`); thiếu = chỉ ghi log (Development in cả mã OTP). Gmail cần App Password. |
| `Storage:Root` / `Storage:PublicBaseUrl` / `Storage:MaxAvatarBytes` | `uploads` cạnh ứng dụng / theo request / 2 MB | Nơi lưu và URL công khai của ảnh đại diện. Chạy Docker cần gắn volume vào `Storage:Root`. |
| `Subscription:AllowMockActivation` | (trống = chỉ Development) | Cho phép `activate-mock`. Môi trường thật phải để tắt. |
| `SePay:BankCode` / `SePay:AccountNumber` / `SePay:AccountName` | (trống = tắt SEPAY, trả 503) | Tài khoản ngân hàng nhận tiền (đã liên kết SePay) để tạo VietQR; `BankCode` theo danh sách ngân hàng của SePay (vd. `MBBank`, `VCB`). |
| `SePay:WebhookApiKey` / `SePay:ApiToken` | (trống) | **Bí mật** — chỉ đặt qua biến môi trường `SePay__*`. API Key xác thực webhook; API Token để máy chủ tự hỏi giao dịch khi webhook không tới được (máy dev). Cần ít nhất một trong hai. |
| `SePay:PaymentCodePrefix` / `ExpiryMinutes` / `StatusCheckIntervalSeconds` | `SM` / 15 / 10 | Tiền tố mã thanh toán (đặt trùng "cấu trúc mã thanh toán" trên SePay), thời gian hiển thị mã QR, khoảng cách tối thiểu giữa hai lần hỏi API SePay cho một đơn. |
| `PayOS:ClientId` / `PayOS:ApiKey` / `PayOS:ChecksumKey` | (trống = tắt PAYOS, trả 503) | Khóa PayOS (my.payos.vn → Kênh thanh toán). **Bí mật** — chỉ đặt qua biến môi trường `PayOS__*`. |
| `PayOS:ReturnUrl` / `PayOS:CancelUrl` | `smartmealmobile://payment-result` | Trang PayOS chuyển về sau khi thanh toán / khi hủy (deep link của app, scheme `smartmealmobile` trong app.json) — dùng khi app không gửi `returnUrl`. |
| `Google:ClientId` | (trống = tắt đăng nhập Google, trả 503) | Web OAuth 2.0 Client ID dùng làm audience khi xác minh ID token; trùng `EXPO_PUBLIC_GOOGLE_CLIENT_ID` của app. Không phải bí mật. |
| `OpenFoodFacts:Enabled` / `BaseUrl` / `UserAgent` / `TimeoutSeconds` | true / `https://world.openfoodfacts.org` / `SmartMeal/1.0 (PRM393 student project)` / 8 | Tra mã vạch chưa có trong CSDL qua Open Food Facts (không cần khóa). Lỗi mạng/timeout coi như không tìm thấy. |
| `Gemini:ApiKey` / `Gemini:Model` / `Gemini:FallbackModels` | (trống) / `gemini-3.8-flash` / `gemini-flash-lite-latest` | Khóa Gemini, model multimodal dùng cho ảnh, text, audio và các model dự phòng (cách nhau bằng dấu phẩy, rỗng = tắt) khi model chính bị ngừng (404) hoặc quá tải (429/5xx). Key chỉ đặt ở backend bằng biến môi trường/secret manager; trống: AI trả dữ liệu mẫu ở Development, lỗi 503 ở nơi khác. |
| `Gemini:ThinkingLevel` / `Gemini:AttemptTimeoutSeconds` / `Gemini:TimeoutSeconds` | `low` / 25 / 50 | Mức "suy nghĩ" gửi cho model (rỗng = không gửi), thời gian chờ mỗi model trước khi chuyển sang model dự phòng (model quá tải thường trả lời rất chậm) và tổng thời gian chờ một yêu cầu AI — phải nhỏ hơn timeout AI của app (60 giây). |
| `Ai:FreeDailyLimit` / `Ai:QuotaUtcOffsetHours` / `Ai:AllowDemoFallback` / `Ai:MaxImageBytes` / `Ai:MaxAudioBytes` | 5 / 7 / (trống = chỉ khi thiếu khóa ở Development) / 5 MB / 10 MB | Hạn mức AI cho Free, múi giờ đổi ngày, cho phép dữ liệu mẫu (`true` = cả khi Gemini lỗi), dung lượng ảnh và file ghi âm tối đa. |
| `HealthConditionLimits:DiabetesMaxSugarGrams` / `DiabetesMaxCarbsGrams` / `HypertensionMaxSodiumMg` / `DyslipidemiaMaxFatGrams` / `GoutAvoidCategories` | 15 / 60 / 800 / 20 / `Seafood`, `Organ` | Ngưỡng tham khảo cho **một khẩu phần** theo bệnh lý (BR-110/111): loại món khỏi thực đơn tự tạo và sinh `healthWarnings`. Không thay thế tư vấn y khoa (BR-112). |
| `ProductSafety:HighSugarGramsPer100g` / `HighSodiumMgPer100g` / `HighFatGramsPer100g` / `HighCaloriesPer100g` | 22.5 / 600 / 17.5 / 400 | Ngưỡng "cao" trên 100 g để cảnh báo sản phẩm quét được (mức "high" của nhãn UK FSA; calo là mức tham khảo). |
| `Swagger:Enabled` | false (luôn bật ở Development) | Bật Swagger ngoài Development. |
| `Cors:AllowedOrigins` | (trống) | Origin được gọi từ trình duyệt, phân tách bằng dấu phẩy. App native không cần. |
| `Seed:DevAccountPassword` | `Smartmeal@123` | Chỉ ở Development: tài khoản dev `smartmealuser@gmail.com` được tạo với mật khẩu này. Môi trường khác không tạo tài khoản mặc định. |

## 5. Schema (DTO)

Ràng buộc lấy từ DataAnnotations; vi phạm → `400` envelope kèm thông báo tiếng Việt của từng trường.

<a id="schema-addcustomgroceryitemdto"></a>
#### AddCustomGroceryItemDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `ingredientName` | string | có | ≥1 ký tự, ≤100 ký tự |  |
| `amount` | number |  | 0.01–100000 |  |
| `unit` | string? |  | ≤20 ký tự |  |
| `category` | string? |  | ≤50 ký tự |  |
| `estimatedPriceVnd` | number? |  | 0–100000000 |  |

<a id="schema-addrecipetocollectiondto"></a>
#### AddRecipeToCollectionDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `recipeId` | uuid |  |  |  |

<a id="schema-aiquotadto"></a>
#### AiQuotaDto

Hạn mức AI trong ngày (BR-233). Tài khoản Pro không giới hạn.

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `isUnlimited` | bool |  |  |  |
| `limit` | int? |  |  | Số lượt miễn phí mỗi ngày; null nếu không giới hạn. |
| `used` | int |  |  |  |
| `remaining` | int? |  |  | Số lượt còn lại hôm nay; null nếu không giới hạn. |
| `resetsAt` | datetime (ISO 8601 UTC) |  |  | Thời điểm hạn mức được làm mới (UTC). |

<a id="schema-assignmealplanrequestdto"></a>
#### AssignMealPlanRequestDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `planDate` | date (yyyy-MM-dd) | có |  |  |
| `mealType` | string | có | ≥1 ký tự | Chỉ nhận (không phân biệt hoa/thường): `Breakfast`, `Lunch`, `Dinner`, `Snack`, `ErrorMessage = "Loại bữa ăn phải là một trong các giá trị: Breakfast`, `Lunch`, `Dinner`, `Snack."` |
| `recipeId` | uuid | có |  |  |

<a id="schema-authresponsedto"></a>
#### AuthResponseDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `token` | string? |  |  | Access token (JWT) — gửi trong header Authorization: Bearer. |
| `expiresAt` | datetime (ISO 8601 UTC) |  |  | Thời điểm access token hết hạn (UTC). |
| `refreshToken` | string? |  |  | Refresh token dùng một lần để lấy cặp token mới ở POST /auth/refresh. |
| `refreshTokenExpiresAt` | datetime (ISO 8601 UTC) |  |  |  |
| `requiresEmailVerification` | bool |  |  | True khi tài khoản vừa đăng ký phải nhập mã OTP đã gửi qua email (POST /auth/verify-otp, purpose "verify-email") — chưa xác minh thì đăng nhập lại/gia hạn phiên bị từ chối với lỗi `email_not_verified`. |
| `user` | [UserDto](#schema-userdto) |  |  |  |

<a id="schema-autogenerateplanrequestdto"></a>
#### AutoGeneratePlanRequestDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `startDate` | date (yyyy-MM-dd)? |  |  |  |
| `dietTag` | string? |  | ≤50 ký tự |  |
| `targetDailyCalories` | number? |  |  |  |
| `includeSnack` | bool |  |  |  |
| `keepExisting` | bool |  |  | true = chỉ điền các ô còn trống, giữ nguyên món người dùng đã chọn (BR-163). Mặc định false = tạo lại cả tuần. |

<a id="schema-badgedto"></a>
#### BadgeDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `id` | string? |  |  |  |
| `title` | string? |  |  |  |
| `description` | string? |  |  |  |
| `unlocked` | bool |  |  |  |
| `unlockedAt` | datetime (ISO 8601 UTC)? |  |  |  |

<a id="schema-badgessummarydto"></a>
#### BadgesSummaryDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `petName` | string? |  |  |  |
| `level` | int |  |  |  |
| `streakDays` | int |  |  |  |
| `unlockedBadgeCount` | int |  |  |  |
| `totalBadgeCount` | int |  |  |  |
| `badges` | [BadgeDto](#schema-badgedto)[]? |  |  |  |
| `costumes` | [CostumeDto](#schema-costumedto)[]? |  |  |  |

<a id="schema-challengedto"></a>
#### ChallengeDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `id` | uuid |  |  |  |
| `title` | string? |  |  |  |
| `description` | string? |  |  |  |
| `imageUrl` | string? |  |  |  |
| `durationDays` | int |  |  |  |
| `completedDays` | int |  |  | Số ngày trong khung đã đạt mục tiêu của thử thách. |
| `rewardExp` | int |  |  |  |
| `rewardBadge` | string? |  |  |  |
| `isJoined` | bool |  |  |  |
| `isCompleted` | bool |  |  |  |
| `category` | string? |  |  | DrinkWater \| EatClean \| Exercise \| NoSugar. |
| `targetValuePerDay` | int |  |  | Mục tiêu mỗi ngày: ml nước (DrinkWater), số nhóm bữa đã ghi (EatClean), số bước (Exercise). |
| `startDate` | date (yyyy-MM-dd)? |  |  | Ngày bắt đầu/kết thúc khung của người dùng (null khi chưa tham gia). Kết thúc = bắt đầu + durationDays − 1. |
| `endDate` | date (yyyy-MM-dd)? |  |  |  |
| `currentDay` | int |  |  | Hôm nay là ngày thứ mấy của khung (1…durationDays); 0 khi chưa tham gia. |
| `isExpired` | bool |  |  | Đã hết khung mà chưa hoàn thành — tham gia lại sẽ bắt đầu khung mới. |

<a id="schema-changepasswordrequestdto"></a>
#### ChangePasswordRequestDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `currentPassword` | string | có | ≥1 ký tự |  |
| `newPassword` | string | có | ≥8 ký tự, ≤128 ký tự |  |

<a id="schema-checkallgroceryitemsrequestdto"></a>
#### CheckAllGroceryItemsRequestDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `isChecked` | bool |  |  | true = đánh dấu đã mua tất cả, false = bỏ đánh dấu tất cả. Bỏ trống = true. |

<a id="schema-checksafetyrequestdto"></a>
#### CheckSafetyRequestDto

Cần ít nhất một trong `barcode` hoặc `ocrRawText`.

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `barcode` | string? |  | mẫu `^[0-9A-Za-z\-]{4,64}$` |  |
| `ocrRawText` | string? |  | ≤5000 ký tự |  |

<a id="schema-checksafetyresponsedto"></a>
#### CheckSafetyResponseDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `isSafe` | bool |  |  | Không có cảnh báo mức DANGER (dị ứng, hoặc vượt ngưỡng với bệnh lý đã khai báo). Không có nghĩa "an toàn tuyệt đối" (BR-112/291). |
| `alerts` | [SafetyAlertDto](#schema-safetyalertdto)[]? |  |  |  |
| `detectedIngredients` | string[]? |  |  |  |
| `extractedNutrition` | [ExtractedNutritionFactsDto](#schema-extractednutritionfactsdto) |  |  |  |
| `isDemo` | bool |  |  |  |
| `source` | string? |  |  | Nguồn kết quả: `database` (tra mã vạch trong CSDL, không dùng AI) \| `ai` (AI đọc văn bản/ảnh nhãn) \| `demo` (dữ liệu mẫu). |
| `product` | [ScannedProductDto](#schema-scannedproductdto) |  |  | Sản phẩm tìm thấy theo mã vạch; null khi phân tích văn bản hoặc ảnh nhãn. |
| `productName` | string? |  |  | Tên sản phẩm AI đọc được trên nhãn (chỉ có ở `/ai/scan-label`). |
| `ocrText` | string? |  |  | Văn bản AI đọc được trên nhãn (chỉ có ở `/ai/scan-label`), để người dùng đối chiếu. |

<a id="schema-checkoutsessionresponsedto"></a>
#### CheckoutSessionResponseDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `sessionId` | string? |  |  |  |
| `orderCode` | int64? |  |  | Mã đơn (`SEPAY`, `PAYOS`, `BANK_TRANSFER`) — dùng cho `check-status`. |
| `paymentUrl` | string? |  |  | Với `PAYOS` là trang thanh toán PayOS; với `SEPAY` là ảnh VietQR; `BANK_TRANSFER` rỗng. |
| `qrCodeUrl` | string? |  |  | Ảnh mã QR để hiển thị; `BANK_TRANSFER` không có (null). |
| `qrCode` | string? |  |  | Chuỗi VietQR gốc (chỉ có với `PAYOS`). |
| `amountVnd` | number |  |  |  |
| `message` | string? |  |  |  |
| `bankCode` | string? |  |  | `SEPAY`, `BANK_TRANSFER`: ngân hàng nhận tiền. |
| `accountNumber` | string? |  |  | `SEPAY`, `BANK_TRANSFER`: số tài khoản nhận tiền. |
| `accountName` | string? |  |  | `SEPAY`, `BANK_TRANSFER`: tên chủ tài khoản (để người dùng đối chiếu). |
| `transferContent` | string? |  |  | `SEPAY`, `BANK_TRANSFER`: nội dung chuyển khoản bắt buộc (mã thanh toán). |
| `expiresAt` | datetime (ISO 8601 UTC)? |  |  | `SEPAY`, `BANK_TRANSFER`: hết thời gian hiển thị mã; tiền tới sau hạn vẫn được ghi nhận. |

<a id="schema-collectionsharedto"></a>
#### CollectionShareDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `shareToken` | string? |  |  |  |
| `sharedAt` | datetime (ISO 8601 UTC) |  |  | Lúc tạo mã hiện tại (UTC). |

<a id="schema-completegroceryrequestdto"></a>
#### CompleteGroceryRequestDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `actualCostVnd` | number? |  | 0–1000000000 |  |
| `keepPending` | bool |  |  | true (mặc định) = giữ các món chưa mua; false = bỏ toàn bộ danh sách còn lại. |
| `nextStartDate` | date (yyyy-MM-dd)? |  |  | Khi giữ món chưa mua: ngày bắt đầu kỳ kế tiếp để cộng nguyên liệu từ thực đơn kỳ đó vào danh sách (gộp với món chưa mua cùng tên/đơn vị). Kỳ đó chưa có thực đơn thì chỉ giữ món chưa mua, không báo lỗi. |
| `nextEndDate` | date (yyyy-MM-dd)? |  |  | Ngày kết thúc kỳ kế tiếp; bỏ trống = NextStartDate + 6 ngày. |

<a id="schema-completemealplanrequestdto"></a>
#### CompleteMealPlanRequestDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `isCompleted` | bool |  |  | true = đã nấu/ăn, false = bỏ đánh dấu. Bỏ trống = true. |

<a id="schema-costumedto"></a>
#### CostumeDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `id` | string? |  |  |  |
| `title` | string? |  |  |  |
| `unlockDescription` | string? |  |  |  |
| `unlocked` | bool |  |  |  |
| `equipped` | bool |  |  |  |

<a id="schema-createcheckoutsessionrequestdto"></a>
#### CreateCheckoutSessionRequestDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `planId` | string | có | ≥1 ký tự |  |
| `paymentMethod` | string? |  |  | Chỉ nhận (không phân biệt hoa/thường): `SEPAY`, `PAYOS`, `BANK_TRANSFER` |
| `returnUrl` | string? |  | ≤500 ký tự | `PAYOS`: deep link của app để PayOS chuyển về sau khi thanh toán/hủy. Chỉ scheme `smartmealmobile` (và `exp`/`exps` ở Development); bỏ trống = `PayOS:ReturnUrl`. |

<a id="schema-createcollectionrequestdto"></a>
#### CreateCollectionRequestDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `name` | string | có | ≥1 ký tự, ≤100 ký tự |  |
| `description` | string? |  | ≤500 ký tự |  |
| `coverImageUrl` | string? |  | ≤500 ký tự |  |
| `isPublic` | bool |  |  |  |

<a id="schema-createfoodrequestdto"></a>
#### CreateFoodRequestDto

Người dùng tự nhập một món khi không tìm thấy. Mọi số liệu do người dùng cung cấp, hệ thống không tự suy ra hay bịa (BR-120/121); món được gắn nhãn "do người dùng nhập" và chỉ chủ sở hữu thấy.

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `name` | string | có | ≥1 ký tự, ≤100 ký tự |  |
| `description` | string? |  | ≤500 ký tự |  |
| `imageUrl` | string? |  | ≤500 ký tự |  |
| `category` | string? |  | ≤50 ký tự |  |
| `barcode` | string? |  | mẫu `^\d{8,14}$` |  |
| `caloriesPer100g` | number |  | 0–900 |  |
| `carbsPer100g` | number |  | 0–100 |  |
| `fatPer100g` | number |  | 0–100 |  |
| `proteinPer100g` | number |  | 0–100 |  |
| `fiberPer100g` | number |  | 0–100 |  |
| `sugarPer100g` | number |  | 0–100 |  |
| `sodiumMgPer100g` | number |  | 0–40000 |  |
| `allergyIds` | int[]? |  | ≤20 phần tử |  |
| `servings` | [CreateFoodServingDto](#schema-createfoodservingdto)[]? |  | ≤10 phần tử |  |

<a id="schema-createfoodservingdto"></a>
#### CreateFoodServingDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `label` | string | có | ≥1 ký tự, ≤50 ký tự |  |
| `grams` | number |  | 0.1–5000 |  |
| `isDefault` | bool |  |  | Khẩu phần mặc định. Không đánh dấu thì lấy khẩu phần đầu tiên. |

<a id="schema-dailydiarysummarydto"></a>
#### DailyDiarySummaryDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `date` | date (yyyy-MM-dd) |  |  |  |
| `totalCalories` | number |  |  |  |
| `totalCarbs` | number |  |  |  |
| `totalFat` | number |  |  |  |
| `totalProtein` | number |  |  |  |
| `targetCalories` | number |  |  |  |
| `targetCarbs` | number |  |  |  |
| `targetFat` | number |  |  |  |
| `targetProtein` | number |  |  |  |
| `meals` | [MealGroupDto](#schema-mealgroupdto)[]? |  |  |  |

<a id="schema-dailyhealthsyncsummarydto"></a>
#### DailyHealthSyncSummaryDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `date` | date (yyyy-MM-dd) |  |  |  |
| `steps` | int |  |  | Số bước/calo/quãng đường lấy từ nguồn ưu tiên cao nhất có dữ liệu trong ngày (`ActiveSource`). |
| `stepGoal` | int |  |  |  |
| `burnedCalories` | number |  |  |  |
| `consumedCalories` | number |  |  |  |
| `netCalories` | number |  |  |  |
| `targetCalories` | number |  |  |  |
| `remainingCalories` | number |  |  |  |
| `distanceMeters` | number |  |  |  |
| `sources` | string[]? |  |  | Các nguồn đã có dữ liệu trong ngày (ưu tiên giảm dần). Rỗng nếu chưa đồng bộ gì. |
| `activeSource` | string? |  |  | Nguồn đang được dùng để tính số liệu; null nếu chưa có dữ liệu. |
| `lastSyncedAt` | datetime (ISO 8601 UTC)? |  |  | Lần đồng bộ gần nhất trong ngày; null nếu chưa đồng bộ. |

<a id="schema-dailyplandto"></a>
#### DailyPlanDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `date` | date (yyyy-MM-dd) |  |  |  |
| `dayOfWeek` | string? |  |  |  |
| `totalCalories` | number |  |  |  |
| `totalCarbs` | number |  |  |  |
| `totalProtein` | number |  |  |  |
| `totalFat` | number |  |  |  |
| `meals` | [PlannedMealItemDto](#schema-plannedmealitemdto)[]? |  |  |  |

<a id="schema-dailyprogresspointdto"></a>
#### DailyProgressPointDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `date` | date (yyyy-MM-dd) |  |  |  |
| `dayOfWeek` | string? |  |  |  |
| `calories` | number |  |  |  |
| `targetCalories` | number |  |  |  |
| `proteinGrams` | number |  |  |  |
| `carbsGrams` | number |  |  |  |
| `fatGrams` | number |  |  |  |
| `targetProteinGrams` | number |  |  |  |
| `targetCarbsGrams` | number |  |  |  |
| `targetFatGrams` | number |  |  |  |

<a id="schema-deleteaccountrequestdto"></a>
#### DeleteAccountRequestDto

Xóa tài khoản: tài khoản có mật khẩu gửi `password`; tài khoản không có mật khẩu (tạo bằng đăng nhập Google trước đây) gửi `confirmEmail` (đúng email của mình).

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `password` | string? |  | ≤128 ký tự |  |
| `confirmEmail` | string? |  | ≤254 ký tự |  |

<a id="schema-deletedataresultdto"></a>
#### DeleteDataResultDto

Kết quả xóa dữ liệu cá nhân: số bản ghi đã xóa theo từng nhóm.

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `deleted` | object? |  |  |  |

<a id="schema-diaryitemdto"></a>
#### DiaryItemDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `id` | uuid |  |  |  |
| `foodName` | string? |  |  |  |
| `servingSize` | number |  |  |  |
| `unit` | string? |  |  |  |
| `calories` | number |  |  |  |
| `carbsGrams` | number |  |  |  |
| `fatGrams` | number |  |  |  |
| `proteinGrams` | number |  |  |  |
| `logMethod` | string? |  |  |  |
| `mealType` | string? |  |  | Bữa ăn chứa món này (dạng chuẩn Breakfast/Lunch/Dinner/Snack). |
| `logDate` | date (yyyy-MM-dd) |  |  | Ngày của nhật ký chứa món này. |
| `createdAt` | datetime (ISO 8601 UTC) |  |  | Thời điểm ghi món (UTC). |
| `recipeId` | uuid? |  |  |  |
| `ingredientId` | uuid? |  |  |  |
| `imageUrl` | string? |  |  |  |

<a id="schema-diaryiteminputdto"></a>
#### DiaryItemInputDto

Một món ăn cần ghi vào nhật ký (dùng chung cho ghi đơn lẻ và ghi hàng loạt).

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `foodName` | string | có | ≤200 ký tự |  |
| `recipeId` | uuid? |  |  |  |
| `ingredientId` | uuid? |  |  |  |
| `servingSize` | number |  | 0.01–100000 |  |
| `unit` | string | có | ≤30 ký tự |  |
| `calories` | number |  | 0–10000 |  |
| `carbsGrams` | number |  | 0–2000 |  |
| `fatGrams` | number |  | 0–2000 |  |
| `proteinGrams` | number |  | 0–2000 |  |
| `logMethod` | string? |  |  | Chỉ nhận (không phân biệt hoa/thường): `Manual`, `AiImage`, `Voice`, `Barcode`, `Ocr` |
| `imageUrl` | string? |  | ≤500 ký tự |  |

<a id="schema-extractedmealitemdto"></a>
#### ExtractedMealItemDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `foodName` | string? |  |  |  |
| `portionDescription` | string? |  |  |  |
| `portionGrams` | number |  |  |  |
| `calories` | number |  |  |  |
| `carbs` | number |  |  |  |
| `protein` | number |  |  |  |
| `fat` | number |  |  |  |

<a id="schema-extractednutritionfactsdto"></a>
#### ExtractedNutritionFactsDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `caloriesPerServing` | number |  |  | Năng lượng theo `Basis` (giữ tên cũ để tương thích): mỗi khẩu phần, hoặc mỗi 100 g khi Basis = per100g. |
| `servingSize` | string? |  |  |  |
| `sugarGrams` | number |  |  |  |
| `sodiumMg` | number |  |  |  |
| `totalFatGrams` | number |  |  |  |
| `proteinGrams` | number? |  |  | Protein theo `Basis`; null khi nhãn không ghi. |
| `carbsGrams` | number? |  |  | Carbohydrate theo `Basis`; null khi nhãn không ghi. |
| `servingGrams` | number? |  |  | Khối lượng một khẩu phần (g) nếu biết — để quy đổi về 100 g. |
| `basis` | string? |  |  | `perServing` (số liệu cho một khẩu phần) hoặc `per100g`. |

<a id="schema-favoritetoggleresponsedto"></a>
#### FavoriteToggleResponseDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `isFavorite` | bool |  |  |  |
| `totalFavorites` | int |  |  |  |

<a id="schema-foodfavoritedto"></a>
#### FoodFavoriteDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `isFavorite` | bool |  |  |  |

<a id="schema-fooditemdto"></a>
#### FoodItemDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `id` | uuid |  |  |  |
| `name` | string? |  |  |  |
| `description` | string? |  |  |  |
| `imageUrl` | string? |  |  |  |
| `category` | string? |  |  |  |
| `defaultUnit` | string? |  |  |  |
| `estimatedPriceVnd` | number |  |  |  |
| `caloriesPer100g` | number |  |  |  |
| `carbsPer100g` | number |  |  |  |
| `fatPer100g` | number |  |  |  |
| `proteinPer100g` | number |  |  |  |
| `fiberPer100g` | number |  |  |  |
| `sugarPer100g` | number |  |  |  |
| `sodiumMgPer100g` | number |  |  |  |
| `allergyId` | int? |  |  | Chất gây dị ứng chính (giữ để tương thích). Dùng `AllergyIds` để lọc đầy đủ. |
| `allergyName` | string? |  |  |  |
| `allergyIds` | int[]? |  |  | Id (/meta/allergies) của mọi chất gây dị ứng trong thực phẩm này (BR-101/102). |
| `isVerified` | bool |  |  | Số liệu đã được kiểm chứng. false với món do người dùng nhập và món mẫu chưa rà soát (BR-120/121). |
| `isUserCreated` | bool |  |  | Do người dùng tự nhập (chỉ chủ sở hữu thấy). |
| `isFavorite` | bool |  |  | Nằm trong danh sách yêu thích của người dùng đang đăng nhập (false nếu chưa đăng nhập). |
| `barcode` | string? |  |  |  |
| `servings` | [FoodServingDto](#schema-foodservingdto)[]? |  |  |  |
| `defaultServingId` | uuid? |  |  |  |

<a id="schema-fooditemdtopagedresult"></a>
#### FoodItemDtoPagedResult

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `items` | [FoodItemDto](#schema-fooditemdto)[]? |  |  |  |
| `page` | int |  |  |  |
| `pageSize` | int |  |  |  |
| `totalCount` | int |  |  |  |
| `totalPages` | int |  |  |  |

<a id="schema-foodservingdto"></a>
#### FoodServingDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `id` | uuid |  |  |  |
| `label` | string? |  |  | Nhãn khẩu phần, vd. "1 tô". |
| `grams` | number |  |  | Khối lượng của khẩu phần (gam). |

<a id="schema-forgotpasswordrequestdto"></a>
#### ForgotPasswordRequestDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `email` | string | có | ≥1 ký tự |  |

<a id="schema-fridgerecipesuggestiondto"></a>
#### FridgeRecipeSuggestionDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `title` | string? |  |  |  |
| `description` | string? |  |  |  |
| `calories` | number |  |  |  |
| `cookingTimeMinutes` | int |  |  |  |
| `matchingIngredients` | string[]? |  |  |  |
| `missingIngredients` | string[]? |  |  |  |
| `quickInstructions` | string? |  |  |  |

<a id="schema-fridgescannerresponsedto"></a>
#### FridgeScannerResponseDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `detectedIngredients` | string[]? |  |  |  |
| `suggestedRecipes` | [FridgeRecipeSuggestionDto](#schema-fridgerecipesuggestiondto)[]? |  |  |  |
| `isDemo` | bool |  |  |  |

<a id="schema-generategroceryrequestdto"></a>
#### GenerateGroceryRequestDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `startDate` | date (yyyy-MM-dd) | có |  |  |
| `endDate` | date (yyyy-MM-dd) | có |  |  |
| `clearExisting` | bool |  |  | true (mặc định) = thay danh sách đã tạo từ thực đơn trước đó bằng danh sách mới; các món người dùng tự thêm được giữ. false = giữ mọi dòng hiện có và cộng dồn vào dòng chưa mua cùng tên/đơn vị (chuyển phần còn lại sang tuần mới) — chỉ nên dùng khi tạo cho một khoảng ngày khác, vì tạo lại cùng khoảng sẽ cộng đôi. |

<a id="schema-googleauthrequestdto"></a>
#### GoogleAuthRequestDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `idToken` | string | có | 20–8192 ký tự | Google ID token (JWT) lấy từ Google Identity Services. |

<a id="schema-grocerycategorydto"></a>
#### GroceryCategoryDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `categoryName` | string? |  |  |  |
| `items` | [GroceryItemDto](#schema-groceryitemdto)[]? |  |  |  |

<a id="schema-groceryitemdto"></a>
#### GroceryItemDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `id` | uuid |  |  |  |
| `ingredientName` | string? |  |  |  |
| `amount` | number |  |  |  |
| `unit` | string? |  |  |  |
| `category` | string? |  |  |  |
| `estimatedPriceVnd` | number |  |  |  |
| `isChecked` | bool |  |  |  |
| `recipeTitle` | string? |  |  | Công thức đầu tiên cần nguyên liệu này (null với món tự thêm). |
| `mergedFromRecipeCount` | int |  |  | Số bữa trong thực đơn được gộp vào dòng này ("Gộp từ N món"); 0 với món tự thêm. |
| `isManual` | bool |  |  | Món người dùng tự thêm (không sinh từ thực đơn) — không bị xóa khi tạo lại danh sách. |

<a id="schema-grocerysummarydto"></a>
#### GrocerySummaryDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `totalItems` | int |  |  |  |
| `checkedItems` | int |  |  |  |
| `totalEstimatedCostVnd` | number |  |  |  |
| `categories` | [GroceryCategoryDto](#schema-grocerycategorydto)[]? |  |  |  |
| `periodStart` | date (yyyy-MM-dd)? |  |  | Khoảng ngày thực đơn của lần tạo danh sách gần nhất (null khi chưa tạo từ thực đơn). |
| `periodEnd` | date (yyyy-MM-dd)? |  |  |  |
| `generatedAt` | datetime (ISO 8601 UTC)? |  |  | Thời điểm tạo danh sách từ thực đơn gần nhất (UTC). |
| `lastTrip` | [GroceryTripDto](#schema-grocerytripdto) |  |  | Lần "Hoàn tất mua sắm" gần nhất (kèm chi phí thực tế), null nếu chưa có. |

<a id="schema-grocerytripdto"></a>
#### GroceryTripDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `id` | uuid |  |  |  |
| `periodStart` | date (yyyy-MM-dd)? |  |  |  |
| `periodEnd` | date (yyyy-MM-dd)? |  |  |  |
| `purchasedItems` | int |  |  |  |
| `pendingItemsKept` | int |  |  |  |
| `estimatedCostVnd` | number |  |  |  |
| `actualCostVnd` | number? |  |  | Chi phí thực tế người dùng nhập; null nếu bỏ trống. |
| `completedAt` | datetime (ISO 8601 UTC) |  |  |  |

<a id="schema-healthpetstatusdto"></a>
#### HealthPetStatusDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `petName` | string? |  |  |  |
| `petType` | string? |  |  |  |
| `level` | int |  |  |  |
| `exp` | int |  |  | XP đang có trong cấp hiện tại (0 → `XpPerLevel`). Giữ tên cũ để tương thích. |
| `nextLevelExp` | int |  |  | XP cần cho một cấp (500). Giữ tên cũ để tương thích. |
| `totalXp` | int |  |  |  |
| `xpIntoLevel` | int |  |  |  |
| `xpPerLevel` | int |  |  |  |
| `stage` | string? |  |  |  |
| `mood` | string? |  |  |  |
| `statusMessage` | string? |  |  |  |
| `currentOutfit` | string? |  |  | Id trang phục đang mặc; "Default" = không mặc. |
| `nutritionScoreToday` | number |  |  |  |
| `tasks` | [PetTaskDto](#schema-pettaskdto)[]? |  |  | Nhiệm vụ hôm nay (ghi bữa sáng, đạt protein, uống đủ nước) kèm tiến độ; làm xong được cộng XP đúng một lần mỗi ngày (BR-202). |

<a id="schema-healthprofiledto"></a>
#### HealthProfileDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `id` | uuid |  |  |  |
| `gender` | string? |  |  |  |
| `age` | int |  |  | Tuổi hiện tại (tính từ ngày sinh nếu có). |
| `dateOfBirth` | date (yyyy-MM-dd)? |  |  |  |
| `heightCm` | number |  |  |  |
| `currentWeightKg` | number |  |  |  |
| `targetWeightKg` | number |  |  |  |
| `activityLevel` | string? |  |  |  |
| `goal` | string? |  |  |  |
| `waterGoalMl` | int |  |  |  |
| `bmi` | number |  |  |  |
| `bmiClassification` | string? |  |  |  |
| `bmr` | number |  |  |  |
| `tdee` | number |  |  |  |
| `dailyCaloriesTarget` | number |  |  |  |
| `dailyCarbsTargetGrams` | number |  |  |  |
| `dailyFatTargetGrams` | number |  |  |  |
| `dailyProteinTargetGrams` | number |  |  |  |
| `allergies` | string[]? |  |  | Tên hiển thị (giữ lại để tương thích); dùng `AllergyIds` cho logic. |
| `medicalConditions` | string[]? |  |  |  |
| `dietaryPreferences` | string[]? |  |  |  |
| `allergyIds` | int[]? |  |  |  |
| `medicalConditionIds` | int[]? |  |  |  |
| `dietaryPreferenceIds` | int[]? |  |  |  |
| `otherAllergies` | string? |  |  | Dị ứng ngoài danh mục người dùng tự nhập (vd. "dứa, kiwi"); null = không có. |

<a id="schema-healthsurveyrequestdto"></a>
#### HealthSurveyRequestDto

Khảo sát sức khỏe: tạo mới hoặc ghi đè toàn bộ hồ sơ. Cần `dateOfBirth` hoặc `age`.

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `gender` | string | có | ≥1 ký tự | Chỉ nhận (không phân biệt hoa/thường): `Male`, `Female`, `Other` |
| `age` | int? |  | 13–100 | Tuổi (13–100). Bỏ qua nếu có `DateOfBirth`. |
| `dateOfBirth` | date (yyyy-MM-dd)? |  |  | Ngày sinh (BR-001), định dạng yyyy-MM-dd. Ưu tiên hơn `Age`. |
| `heightCm` | number |  | 100–250 |  |
| `currentWeightKg` | number |  | 30–300 |  |
| `targetWeightKg` | number |  | 30–300 |  |
| `activityLevel` | string | có | ≥1 ký tự | Chỉ nhận (không phân biệt hoa/thường): `Sedentary`, `Light`, `Moderate`, `Active`, `VeryActive` |
| `goal` | string | có | ≥1 ký tự | Chỉ nhận (không phân biệt hoa/thường): `LoseWeight`, `Maintain`, `GainWeight`, `GainMuscle` |
| `allergyIds` | int[]? |  |  | Id trong /meta/allergies. |
| `medicalConditionIds` | int[]? |  |  | Id trong /meta/medical-conditions. |
| `dietaryPreferenceIds` | int[]? |  |  | Id trong /meta/tags (Eat Clean, Keto...). Bỏ trống = không có chế độ ăn ưu tiên. |
| `waterGoalMl` | int? |  | 500–10000 | Mục tiêu nước uống mỗi ngày (ml). Bỏ trống = giữ giá trị hiện có (mặc định 2000). |
| `otherAllergies` | string? |  | ≤ 200 ký tự | Dị ứng ngoài danh mục, phân tách bằng dấu phẩy (vd. "dứa, kiwi"). Bỏ trống = không có. |

<a id="schema-logmealbatchrequestdto"></a>
#### LogMealBatchRequestDto

Ghi nhiều món vào cùng một bữa trong một lần gọi — hoặc tất cả được lưu, hoặc không món nào.

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `logDate` | date (yyyy-MM-dd) |  |  |  |
| `mealType` | string | có | ≥1 ký tự | Chỉ nhận (không phân biệt hoa/thường): `Breakfast`, `Lunch`, `Dinner`, `Snack` |
| `items` | [DiaryItemInputDto](#schema-diaryiteminputdto)[] | có | ≥1 phần tử, ≤50 phần tử |  |

<a id="schema-logmealrequestdto"></a>
#### LogMealRequestDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `foodName` | string | có | ≤200 ký tự |  |
| `recipeId` | uuid? |  |  |  |
| `ingredientId` | uuid? |  |  |  |
| `servingSize` | number |  | 0.01–100000 |  |
| `unit` | string | có | ≤30 ký tự |  |
| `calories` | number |  | 0–10000 |  |
| `carbsGrams` | number |  | 0–2000 |  |
| `fatGrams` | number |  | 0–2000 |  |
| `proteinGrams` | number |  | 0–2000 |  |
| `logMethod` | string? |  |  |  |
| `imageUrl` | string? |  | ≤500 ký tự |  |
| `logDate` | date (yyyy-MM-dd) |  |  |  |
| `mealType` | string | có | ≥1 ký tự | Chỉ nhận (không phân biệt hoa/thường): `Breakfast`, `Lunch`, `Dinner`, `Snack` |

<a id="schema-logwaterrequestdto"></a>
#### LogWaterRequestDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `amountMl` | int |  | 1–5000 |  |
| `date` | date (yyyy-MM-dd)? |  |  |  |

<a id="schema-loginrequestdto"></a>
#### LoginRequestDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `email` | string | có | ≥1 ký tự |  |
| `password` | string | có | ≥1 ký tự |  |

<a id="schema-logoutrequestdto"></a>
#### LogoutRequestDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `refreshToken` | string? |  | ≤512 ký tự |  |

<a id="schema-markallnotificationsreadresultdto"></a>
#### MarkAllNotificationsReadResultDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `updated` | int |  |  | Số thông báo vừa được đánh dấu đã đọc. |

<a id="schema-mealgroupdto"></a>
#### MealGroupDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `mealType` | string? |  |  |  |
| `subtotalCalories` | number |  |  |  |
| `items` | [DiaryItemDto](#schema-diaryitemdto)[]? |  |  |  |

<a id="schema-metaitemdto"></a>
#### MetaItemDto

Một mục danh mục (dị ứng, bệnh lý, chế độ ăn). `Code` là mã ổn định để client ánh xạ.

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `id` | int |  |  |  |
| `code` | string? |  |  |  |
| `name` | string? |  |  |  |
| `description` | string? |  |  |  |

<a id="schema-notificationdto"></a>
#### NotificationDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `id` | uuid |  |  |  |
| `category` | string? |  |  | pet \| badge \| challenge \| grocery \| premium — app chọn biểu tượng và màn đích theo nhóm này. |
| `title` | string? |  |  |  |
| `body` | string? |  |  |  |
| `createdAt` | datetime (ISO 8601 UTC) |  |  | Thời điểm tạo (UTC). |
| `isRead` | bool |  |  |  |

<a id="schema-notificationlistdto"></a>
#### NotificationListDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `items` | [NotificationDto](#schema-notificationdto)[]? |  |  | Mới → cũ. |
| `unreadCount` | int |  |  | Số thông báo chưa đọc (toàn bộ, không chỉ trong trang này). |

<a id="schema-pantrysuggestionrequestdto"></a>
#### PantrySuggestionRequestDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `availableIngredients` | string[] | có | ≥1 phần tử, ≤50 phần tử |  |

<a id="schema-paymenttransactionstatusdto"></a>
#### PaymentTransactionStatusDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `orderCode` | int64 |  |  |  |
| `status` | string? |  |  | `Pending` \| `Paid` \| `Failed` |
| `isPaid` | bool |  |  |  |
| `planId` | string? |  |  |  |
| `amountVnd` | number |  |  |  |
| `paidAt` | date-time? |  |  |  |

<a id="schema-paymenttransactiondto"></a>
#### PaymentTransactionDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `id` | uuid |  |  |  |
| `sessionId` | string? |  |  |  |
| `planId` | string? |  |  |  |
| `amountVnd` | number |  |  |  |
| `paymentMethod` | string? |  |  |  |
| `status` | string? |  |  |  |
| `createdAt` | datetime (ISO 8601 UTC) |  |  |  |
| `paidAt` | datetime (ISO 8601 UTC)? |  |  |  |

<a id="schema-pettaskdto"></a>
#### PetTaskDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `id` | string? |  |  | breakfast \| protein \| water. |
| `label` | string? |  |  |  |
| `xpReward` | int |  |  |  |
| `progressCurrent` | number |  |  |  |
| `progressTarget` | number |  |  |  |
| `unit` | string? |  |  | Đơn vị của tiến độ: "bữa", "g" hoặc "ml". |
| `completed` | bool |  |  |  |

<a id="schema-plannedmealitemdto"></a>
#### PlannedMealItemDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `mealPlanId` | uuid |  |  |  |
| `mealType` | string? |  |  |  |
| `recipeId` | uuid |  |  |  |
| `recipeTitle` | string? |  |  |  |
| `recipeImageUrl` | string? |  |  |  |
| `calories` | number |  |  |  |
| `carbs` | number |  |  |  |
| `protein` | number |  |  |  |
| `fat` | number |  |  |  |
| `cookingTimeMinutes` | int |  |  |  |
| `isCompleted` | bool |  |  |  |

<a id="schema-recipecollectiondto"></a>
#### RecipeCollectionDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `id` | uuid |  |  |  |
| `name` | string? |  |  |  |
| `description` | string? |  |  |  |
| `coverImageUrl` | string? |  |  |  |
| `recipeCount` | int |  |  |  |
| `isPublic` | bool |  |  |  |
| `ownerId` | uuid |  |  | Chủ sở hữu bộ sưu tập (BR-152: chỉ chủ sở hữu được đổi tên/xóa/bỏ món). |
| `isOwner` | bool |  |  | Người dùng đang đăng nhập là chủ sở hữu. |
| `shareToken` | string? |  |  | Mã liên kết chia sẻ đang bật — chỉ trả cho chủ sở hữu; null = chưa chia sẻ (hoặc người xem không phải chủ). |
| `recipes` | [RecipeDto](#schema-recipedto)[]? |  |  |  |

<a id="schema-recipedto"></a>
#### RecipeDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `id` | uuid |  |  |  |
| `title` | string? |  |  |  |
| `description` | string? |  |  |  |
| `imageUrl` | string? |  |  |  |
| `instructions` | string? |  |  |  |
| `prepTimeMinutes` | int |  |  |  |
| `cookTimeMinutes` | int |  |  |  |
| `totalTimeMinutes` | int |  |  | Tổng thời gian chuẩn bị + nấu (phút). |
| `servings` | int |  |  |  |
| `difficulty` | string? |  |  |  |
| `isPremium` | bool |  |  |  |
| `caloriesPerServing` | number |  |  |  |
| `carbsPerServing` | number |  |  |  |
| `fatPerServing` | number |  |  |  |
| `proteinPerServing` | number |  |  |  |
| `tags` | string[]? |  |  |  |
| `tagCodes` | string[]? |  |  | Mã ổn định của từng tag (cùng thứ tự với `Tags`), khớp `code` ở /meta/tags — client lọc theo mã, không theo tên hiển thị. |
| `mealTypes` | string[]? |  |  | Các bữa phù hợp (Breakfast/Lunch/Dinner/Snack); rỗng = phù hợp mọi bữa. |
| `allergyIds` | int[]? |  |  | Id (/meta/allergies) của MỌI chất gây dị ứng trong công thức (gộp từ các nguyên liệu) — dùng để lọc theo BR-101/102. |
| `isFavorite` | bool |  |  | Công thức nằm trong danh sách yêu thích của người dùng đang đăng nhập (false nếu chưa đăng nhập). |
| `healthWarnings` | string[]? |  |  | Cảnh báo theo bệnh lý của người dùng đang đăng nhập (BR-110/111), vd. "Nhiều carbohydrate… cần lưu ý với tiểu đường". Rỗng khi chưa đăng nhập, chưa khai báo bệnh lý hoặc món nằm trong ngưỡng tham khảo. Không thay thế tư vấn y khoa (BR-112). |
| `ingredients` | [RecipeIngredientDto](#schema-recipeingredientdto)[]? |  |  |  |

<a id="schema-recipeingredientdto"></a>
#### RecipeIngredientDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `ingredientId` | uuid |  |  |  |
| `name` | string? |  |  |  |
| `amount` | number |  |  |  |
| `unit` | string? |  |  |  |
| `estimatedPriceVnd` | number |  |  |  |
| `allergyIds` | int[]? |  |  | Chất gây dị ứng của riêng nguyên liệu này. |

<a id="schema-refreshtokenrequestdto"></a>
#### RefreshTokenRequestDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `refreshToken` | string | có | ≤512 ký tự |  |

<a id="schema-registerrequestdto"></a>
#### RegisterRequestDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `email` | string | có | ≤254 ký tự |  |
| `password` | string | có | ≥8 ký tự, ≤128 ký tự |  |
| `fullName` | string | có | ≥2 ký tự, ≤100 ký tự |  |

<a id="schema-resendotprequestdto"></a>
#### ResendOtpRequestDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `email` | string | có | ≥1 ký tự |  |
| `purpose` | string? |  |  | Chỉ nhận (không phân biệt hoa/thường): `reset-password`, `verify-email` |

<a id="schema-resetpasswordrequestdto"></a>
#### ResetPasswordRequestDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `email` | string | có | ≥1 ký tự |  |
| `resetToken` | string | có | ≤512 ký tự |  |
| `newPassword` | string | có | ≥8 ký tự, ≤128 ký tự |  |

<a id="schema-safetyalertdto"></a>
#### SafetyAlertDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `type` | string? |  |  |  |
| `message` | string? |  |  |  |
| `severity` | string? |  |  |  |

<a id="schema-scannedproductdto"></a>
#### ScannedProductDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `foodId` | uuid |  |  |  |
| `name` | string? |  |  |  |
| `barcode` | string? |  |  |  |
| `isVerified` | bool |  |  | Số liệu đã được kiểm chứng; false với món do người dùng nhập hoặc chưa rà soát (BR-120/121). |
| `isUserCreated` | bool |  |  |  |
| `allergyIds` | int[]? |  |  | Id (/meta/allergies) của mọi chất gây dị ứng trong sản phẩm. |
| `matchedAllergyIds` | int[]? |  |  | Những chất gây dị ứng của sản phẩm trùng với hồ sơ người dùng. |

<a id="schema-snapandtrackresponsedto"></a>
#### SnapAndTrackResponseDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `dishName` | string? |  |  |  |
| `estimatedGrams` | number |  |  |  |
| `confidenceScore` | number |  |  |  |
| `calories` | number |  |  |  |
| `carbs` | number |  |  |  |
| `protein` | number |  |  |  |
| `fat` | number |  |  |  |
| `detectedIngredients` | string[]? |  |  |  |
| `allergyWarnings` | string[]? |  |  |  |
| `healthTips` | string? |  |  |  |
| `isDemo` | bool |  |  | True khi đây là dữ liệu MẪU (chưa cấu hình Gemini, chỉ ở môi trường phát triển), không phải kết quả thật. |

<a id="schema-streakdaydto"></a>
#### StreakDayDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `date` | date (yyyy-MM-dd) |  |  |  |
| `dayOfWeek` | string? |  |  |  |
| `hasLogged` | bool |  |  |  |

<a id="schema-streakstatusdto"></a>
#### StreakStatusDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `currentStreak` | int |  |  | Số ngày liên tiếp có ghi nhật ký tính đến hôm nay (hôm nay chưa ghi thì tính tới hôm qua). 0 nếu chưa có. |
| `longestStreak` | int |  |  |  |
| `totalActiveDays` | int |  |  |  |
| `hasLoggedToday` | bool |  |  |  |
| `recentActivity` | [StreakDayDto](#schema-streakdaydto)[]? |  |  |  |

<a id="schema-subscriptionplandto"></a>
#### SubscriptionPlanDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `id` | string? |  |  |  |
| `name` | string? |  |  |  |
| `priceVnd` | number |  |  |  |
| `billingCycle` | string? |  |  |  |
| `features` | string[]? |  |  |  |
| `isPopular` | bool |  |  |  |

<a id="schema-subscriptionstatusdto"></a>
#### SubscriptionStatusDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `status` | string? |  |  | Free \| Premium \| Expired \| Cancelled. |
| `isPro` | bool |  |  | Quyền Pro còn hiệu lực (Premium hoặc Cancelled-nhưng-chưa-hết-hạn). |
| `planId` | string? |  |  |  |
| `proExpiresAt` | datetime (ISO 8601 UTC)? |  |  |  |

<a id="schema-synchealthmetricsrequestdto"></a>
#### SyncHealthMetricsRequestDto

Gửi TỔNG của một ngày từ một nguồn. Gửi lại cùng (ngày, nguồn) sẽ thay thế giá trị trước đó, không cộng dồn.

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `date` | date (yyyy-MM-dd)? |  |  |  |
| `steps` | int |  | 0–200000 |  |
| `stepCount` | int |  |  |  |
| `burnedCalories` | number |  | 0–20000 |  |
| `activeCaloriesBurned` | number |  |  |  |
| `distanceMeters` | number |  | 0–500000 |  |
| `source` | string? |  |  | Chỉ nhận (không phân biệt hoa/thường): `HealthConnect`, `AppleHealth`, `GoogleFit`, `Manual` |

<a id="schema-synchealthmetricsresponsedto"></a>
#### SyncHealthMetricsResponseDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `date` | date (yyyy-MM-dd) |  |  |  |
| `steps` | int |  |  |  |
| `burnedCalories` | number |  |  |  |
| `distanceMeters` | number |  |  |  |
| `source` | string? |  |  |  |
| `syncedAt` | datetime (ISO 8601 UTC) |  |  |  |

<a id="schema-togglegroceryitemrequestdto"></a>
#### ToggleGroceryItemRequestDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `isChecked` | bool |  |  |  |

<a id="schema-updatecollectionrequestdto"></a>
#### UpdateCollectionRequestDto

Sửa bộ sưu tập (chỉ chủ sở hữu — BR-152). Trường không gửi giữ nguyên.

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `name` | string? |  | ≥1 ký tự, ≤100 ký tự |  |
| `description` | string? |  | ≤500 ký tự |  |
| `coverImageUrl` | string? |  | ≤500 ký tự |  |
| `isPublic` | bool? |  |  |  |

<a id="schema-updatediaryitemrequestdto"></a>
#### UpdateDiaryItemRequestDto

Sửa một món đã ghi (BR-053). Chỉ các trường có mặt mới được thay đổi.

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `mealType` | string? |  |  | Chỉ nhận (không phân biệt hoa/thường): `Breakfast`, `Lunch`, `Dinner`, `Snack` |
| `logDate` | date (yyyy-MM-dd)? |  |  |  |
| `foodName` | string? |  | ≥1 ký tự, ≤200 ký tự |  |
| `servingSize` | number? |  | 0.01–100000 |  |
| `unit` | string? |  | ≥1 ký tự, ≤30 ký tự |  |
| `calories` | number? |  | 0–10000 |  |
| `carbsGrams` | number? |  | 0–2000 |  |
| `fatGrams` | number? |  | 0–2000 |  |
| `proteinGrams` | number? |  | 0–2000 |  |

<a id="schema-updatehealthprofilerequestdto"></a>
#### UpdateHealthProfileRequestDto

Cập nhật từng phần hồ sơ đã có. Trường không gửi (null) giữ nguyên; danh sách gửi `[]` nghĩa là xóa hết.

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `gender` | string? |  |  | Chỉ nhận (không phân biệt hoa/thường): `Male`, `Female`, `Other` |
| `age` | int? |  | 13–100 |  |
| `dateOfBirth` | date (yyyy-MM-dd)? |  |  |  |
| `heightCm` | number? |  | 100–250 |  |
| `currentWeightKg` | number? |  | 30–300 |  |
| `targetWeightKg` | number? |  | 30–300 |  |
| `activityLevel` | string? |  |  | Chỉ nhận (không phân biệt hoa/thường): `Sedentary`, `Light`, `Moderate`, `Active`, `VeryActive` |
| `goal` | string? |  |  | Chỉ nhận (không phân biệt hoa/thường): `LoseWeight`, `Maintain`, `GainWeight`, `GainMuscle` |
| `allergyIds` | int[]? |  |  |  |
| `medicalConditionIds` | int[]? |  |  |  |
| `dietaryPreferenceIds` | int[]? |  |  |  |
| `waterGoalMl` | int? |  | 500–10000 |  |
| `otherAllergies` | string? |  | ≤ 200 ký tự | Dị ứng ngoài danh mục. null = giữ nguyên; chuỗi rỗng = xóa. |

<a id="schema-updateprofilerequestdto"></a>
#### UpdateProfileRequestDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `fullName` | string? |  | ≥2 ký tự, ≤100 ký tự |  |
| `avatarUrl` | string? |  | ≤500 ký tự |  |

<a id="schema-userdto"></a>
#### UserDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `id` | uuid |  |  |  |
| `email` | string? |  |  |  |
| `fullName` | string? |  |  |  |
| `avatarUrl` | string? |  |  |  |
| `isPro` | bool |  |  | Quyền Pro còn hiệu lực. Nguồn đáng tin duy nhất — đừng đọc claim "isPro" trong token vì sẽ cũ sau khi nâng cấp. |
| `subscriptionStatus` | string? |  |  | Free \| Premium \| Expired \| Cancelled. |
| `proExpiresAt` | datetime (ISO 8601 UTC)? |  |  | Hạn dùng gói Pro (UTC); null nếu chưa có hoặc không có hạn. |
| `role` | string? |  |  |  |
| `hasCompletedSurvey` | bool |  |  |  |
| `hasPassword` | bool |  |  | Tài khoản có mật khẩu. false = tài khoản tạo bằng đăng nhập Google trước đây (app đã bỏ đăng nhập Google): đặt mật khẩu qua "Quên mật khẩu"; xóa tài khoản xác nhận bằng email thay vì mật khẩu. |

<a id="schema-verifyotprequestdto"></a>
#### VerifyOtpRequestDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `email` | string | có | ≥1 ký tự |  |
| `code` | string | có | ≥1 ký tự, mẫu `^\d{6}$` |  |
| `purpose` | string? |  |  | Chỉ nhận (không phân biệt hoa/thường): `reset-password`, `verify-email` |

<a id="schema-verifyotpresponsedto"></a>
#### VerifyOtpResponseDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `verified` | bool |  |  |  |
| `resetToken` | string? |  |  | Chỉ có với purpose "reset-password": dùng một lần ở POST /auth/reset-password (hiệu lực ngắn). |
| `resetTokenExpiresAt` | datetime (ISO 8601 UTC)? |  |  |  |

<a id="schema-voicelogrequestdto"></a>
#### VoiceLogRequestDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `transcript` | string | có | ≥2 ký tự, ≤1000 ký tự |  |

<a id="schema-voicelogresponsedto"></a>
#### VoiceLogResponseDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `mealType` | string? |  |  |  |
| `transcript` | string? |  |  | Câu người dùng đã nói: văn bản gửi lên (voice-log) hoặc bản chép lời AI nghe được từ file ghi âm (voice-log/audio). |
| `extractedItems` | [ExtractedMealItemDto](#schema-extractedmealitemdto)[]? |  |  |  |
| `totalCalories` | number |  |  |  |
| `totalCarbs` | number |  |  |  |
| `totalProtein` | number |  |  |  |
| `totalFat` | number |  |  |  |
| `isDemo` | bool |  |  |  |

<a id="schema-waterdaydto"></a>
#### WaterDayDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `date` | date (yyyy-MM-dd) |  |  |  |
| `totalMl` | int |  |  |  |
| `entries` | [WaterEntryDto](#schema-waterentrydto)[]? |  |  |  |

<a id="schema-waterentrydto"></a>
#### WaterEntryDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `id` | uuid |  |  |  |
| `amountMl` | int |  |  |  |
| `createdAt` | datetime (ISO 8601 UTC) |  |  |  |

<a id="schema-waterhistorydto"></a>
#### WaterHistoryDto

Lịch sử nước uống N ngày kết thúc ở ngày yêu cầu (tăng dần), gồm cả ngày không có log (TotalMl = 0).

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `goalMl` | int |  |  |  |
| `days` | [WaterDayDto](#schema-waterdaydto)[]? |  |  |  |

<a id="schema-watersummarydto"></a>
#### WaterSummaryDto

Tổng nước uống của một ngày. Khi vừa ghi/xóa một lần uống, kèm id của lần uống đó.

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `entryId` | uuid? |  |  | Id lần uống vừa ghi (POST) — dùng cho "Hoàn tác" qua DELETE. |
| `date` | date (yyyy-MM-dd) |  |  |  |
| `totalWaterMl` | int |  |  |  |
| `goalWaterMl` | int |  |  |  |
| `percentage` | number |  |  |  |

<a id="schema-weeklymealplandto"></a>
#### WeeklyMealPlanDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `startDate` | date (yyyy-MM-dd) |  |  |  |
| `endDate` | date (yyyy-MM-dd) |  |  |  |
| `targetDailyCalories` | number |  |  |  |
| `days` | [DailyPlanDto](#schema-dailyplandto)[]? |  |  |  |

<a id="schema-weeklyprogressdto"></a>
#### WeeklyProgressDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `days` | [DailyProgressPointDto](#schema-dailyprogresspointdto)[]? |  |  |  |

<a id="schema-weighthistoryresponsedto"></a>
#### WeightHistoryResponseDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `currentWeightKg` | number |  |  |  |
| `targetWeightKg` | number |  |  |  |
| `initialWeightKg` | number |  |  |  |
| `totalWeightChangedKg` | number |  |  |  |
| `bmi` | number |  |  |  |
| `bmiCategory` | string? |  |  |  |
| `history` | [WeightPointDto](#schema-weightpointdto)[]? |  |  |  |

<a id="schema-weightlogrequestdto"></a>
#### WeightLogRequestDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `weightKg` | number |  | 30–300 |  |
| `recordedAt` | datetime (ISO 8601 UTC)? |  |  | Thời điểm đo (ISO 8601). Bỏ trống = bây giờ. Không được ở tương lai. |

<a id="schema-weightpointdto"></a>
#### WeightPointDto

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| `id` | uuid |  |  |  |
| `weightKg` | number |  |  |  |
| `recordedAt` | datetime (ISO 8601 UTC) |  |  |  |
| `diffFromTargetKg` | number |  |  |  |
