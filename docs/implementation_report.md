# SmartMeal — Báo cáo xử lý gap FE/BE (13–14/10/2026)

| | |
|---|---|
| Phạm vi | Toàn bộ mục trong [`SmartMeal_FE_API_Gap_Report.md`](SmartMeal_FE_API_Gap_Report.md) và các lỗi của PR #9 ([review](reviews/pr9-gamification-scanner-review.md)) |
| Nhánh | `main`, từ `1bb95ae`. Đợt 1 đến `c477a29`; đợt 2 (thông báo, chia sẻ bộ sưu tập, xóa tài khoản, chạy BE local); đợt 3 bỏ đăng nhập Google (`4778a35`, `4996f3e`) |
| Hợp đồng API | [`SmartMeal_API_Contract.md`](SmartMeal_API_Contract.md) — đã cập nhật theo code |
| Trạng thái từng mục | Báo cáo gap, §0 |

## 1. Kết quả

| Kiểm tra | Kết quả |
|---|---|
| BE — xUnit tích hợp (API thật trên PostgreSQL) | 231/231 qua (sau khi bỏ test Google) |
| FE — `npx jest` | 501 qua (82 test live tự bỏ qua khi không có `LIVE_API_URL`) |
| FE — test live, gọi BE thật qua HTTP | 82/82 qua |
| FE — `npx tsc --noEmit` / `npx expo lint` | Sạch / 0 lỗi (16 cảnh báo cũ, không phát sinh mới) |

Mọi mục P0, P1 và gần hết P2 của báo cáo gap đã xong; đợt 2 làm thêm thông báo trong app, chia sẻ bộ sưu tập bằng liên kết thu hồi được và màn xóa tài khoản. Còn lại (xem §6):

- **F13 — Health Connect/HealthKit native:** phải chuyển dự án từ Expo Go sang Dev Client, cần nhóm quyết định.
- **Push từ server và cổng thanh toán thật:** cũng cần Dev Client hoặc tài khoản merchant.

## 2. Backend

### Đã có trước đợt này

Gồm các commit từ `173d948` đến `5479400`, merge vào `main` ở `c899714`:

- Envelope lỗi thống nhất, cấu hình bắt buộc và bí mật không nằm trong git.
- Auth đầy đủ: refresh token xoay vòng, OTP quên/đổi mật khẩu, khoá đăng nhập, rate limit. Đăng nhập Google từng có (đã sửa để xác minh ID token), sau đó bị bỏ ở đợt 3.
- Nhật ký ghi cả bữa trong một transaction, có sửa/xoá; nước uống.
- Hồ sơ sức khỏe lưu ngày sinh và chế độ ăn, sửa được từng phần.
- Health-sync idempotent.
- Pro chỉ kích hoạt qua webhook có chữ ký.
- AI bắt đăng nhập, có hạn mức, gắn cờ `isDemo`.
- Công thức lọc dị ứng, có phân trang, có CRUD bộ sưu tập.
- Planner mỗi ô một món, có `keepExisting` và đánh dấu đã nấu.
- Grocery tính giá theo đơn vị.
- Món Việt, món tự nhập, tra mã vạch, mục gần đây/yêu thích.
- Gamification tính XP, thử thách, huy hiệu, trang phục thật.

### Làm thêm trong đợt này

Các commit nằm trên nhánh `feat/be-gap-fixes`.

| Commit | Nội dung | Mục gap |
|---|---|---|
| `1f584d5` | Planner: `assign` từ chối món gây dị ứng (`400 allergen_conflict`). Auto-generate:<ul><li>áp ngưỡng bệnh lý (`HealthConditionLimits`: tiểu đường, huyết áp, mỡ máu, gout)</li><li>chọn món theo mục tiêu calo từng bữa (±15%, tối thiểu ±50 kcal)</li><li>`dietTag` là ưu tiên mềm</li><li>trả `no_suitable_recipes` khi không đủ món</li></ul>`RecipeDto` thêm `tagCodes` và `healthWarnings`. | C02, C08 |
| `67d8e01` | Scanner:<ul><li>`check-safety {barcode}` tra trong CSDL, không cho AI đoán (`404 product_not_found`)</li><li>cảnh báo ngưỡng /100 g theo `ProductSafety` (mức FSA)</li><li>`POST /ai/scan-label`: ảnh nhãn, không tính hạn mức, có rate limit `scanner`</li><li>`POST /ai/voice-log/audio`: file ghi âm, tính hạn mức, trả `transcript`, lỗi `voice_unrecognized`</li></ul> | B15, §6 Barcode/OCR/Voice |
| `4b38519` | Grocery: danh sách lưu theo kỳ (`periodStart/End`, `generatedAt`), món tự thêm (`isManual`) được giữ lại. `POST /grocery/complete` chạy trong một transaction: lưu chi phí thật, giữ hoặc bỏ món chưa mua, cộng thực đơn kỳ sau. Có `lastTrip`. Migration `GroceryListPeriodAndTrips`. | B14, C07 |
| `0952465` | `GET /healthprofile/weight-history?days=` (1–3650). | C10 |
| `e25f41f` | Middleware `Idempotency-Key` cho mọi request ghi:<ul><li>lưu phản hồi 24 giờ</li><li>gửi lại trả đúng phản hồi cũ kèm header `Idempotency-Replayed: true`</li><li>lỗi `409 idempotency_key_reused` / `idempotency_in_progress`</li></ul>Migration `IdempotencyKeys`. | F12 |

Cấu hình mới (đều có giá trị mặc định): `HealthConditionLimits:*`, `ProductSafety:*`, `Ai:MaxAudioBytes`, `RateLimiting:ScannerPermitsPerMinute`. Xem Contract §4.

### Đợt 2 (14/10)

| Commit | Nội dung | Mục gap |
|---|---|---|
| `a2f4bb6` | Bảng `UserNotifications`, có khóa sự kiện duy nhất theo người dùng. Thêm cột `ShareToken`/`SharedAt` cho bộ sưu tập. Migration `NotificationsAndCollectionSharing`. | §6 |
| `ce9f091` | Thông báo trong app:<ul><li>`GET /notifications`, `PATCH /notifications/{id}/read`, `POST /notifications/read-all`.</li><li>Tạo ngay tại sự kiện thật: lên cấp (kèm trang phục mở được), mở huy hiệu, hoàn thành thử thách, danh sách đi chợ (mỗi kỳ một lần), kích hoạt Pro.</li><li>Báo Pro sắp hết hạn khi còn ≤ 3 ngày.</li><li>Ghi `INSERT … ON CONFLICT DO NOTHING` nên không trùng; dọn thông báo quá 90 ngày.</li></ul> | §6 Notifications |
| `dadaebb` | Liên kết chia sẻ bộ sưu tập:<ul><li>`POST/DELETE /recipes/collections/{id}/share` (chỉ chủ sở hữu, có `regenerate`).</li><li>`GET /recipes/collections/shared/{token}`: không cần đăng nhập, chỉ đọc, xem được cả bộ sưu tập riêng tư.</li></ul> | §6 Chia sẻ |
| `1c460e3` | `UserDto.hasPassword` — app biết khi xóa tài khoản phải hỏi mật khẩu hay email. | §6 Account |
| `cc98da0` | 11 test mới: thông báo, chia sẻ, `hasPassword`. | — |

## 3. Frontend

| Commit | Nội dung | Mục gap |
|---|---|---|
| `ce2e822` | Bỏ fallback `/log/batch` gửi sai DTO và mã debug ở `App.tsx`. Danh sách dị ứng là trường bắt buộc: thiếu thì báo lỗi, không coi là "không dị ứng". | C01, PR #9 N1/M1/S4 |
| `2ac7b37`, `fa17712` | Công thức, yêu thích, bộ sưu tập theo pattern mock/api/mapper:<ul><li>lọc dị ứng ở cả server và máy</li><li>bộ sưu tập: tạo, sửa, thêm/bớt món, công khai, xoá</li><li>deep link `collections/:id`</li><li>SlotPicker đọc dữ liệu server</li></ul> | F01, F02, F07, F10, F11 |
| `64c9060`, `13a1e07`, `a2e2d58` | Thực đơn giữ `mealPlanId`, có xoá món, đánh dấu đã nấu, tạo tuần theo calo của hồ sơ. Đi chợ tự sinh khi rỗng, có banner "đã cũ", tick một món hoặc tất cả, hoàn tất mua sắm. | F04, F05 |
| `deed5f9` | Dashboard gợi ý món từ công thức thật. | F08 |
| `9916999`, `890b783` | Bé Mầm, thử thách, huy hiệu, trang phục đọc từ server và gửi `?date=` theo ngày máy. Bỏ `completeChallenge` cục bộ. | C09, F09, PR #9 G1–G5 |
| `9f926f9`, `2bdd244` | Scanner:<ul><li>mã vạch quét bằng `expo-camera` hoặc nhập tay</li><li>nhãn đọc từ ảnh thật</li><li>tủ lạnh dùng 1–4 ảnh thật, nguyên liệu chờ xác nhận</li><li>cảnh báo lấy từ server; banner demo</li><li>món tạo từ ProductNotFound gắn mã vạch</li></ul> | F06, PR #9 S1–S3, S5 |
| `7a771ea` | Voice gửi file ghi âm `.m4a` (đã thu bằng `expo-av`). Không nghe ra món thì mở màn "AI chưa nhận diện được". Ghi với `logMethod: 'Voice'`. | §6 Voice |
| `de9fc1c` | Đăng nhập Google bằng `expo-auth-session`: lấy ID token rồi gửi `/auth/google`. Client ID lấy từ `EXPO_PUBLIC_GOOGLE_{WEB,ANDROID,IOS}_CLIENT_ID`. **Đã bỏ ở đợt 3.** | C03, F03 |
| `9915e80`, `1b87ae9` | Nhắc nhở cục bộ bằng `expo-notifications`: bữa ăn, nước mỗi 2 giờ, chuỗi ngày. Cài đặt lưu theo tài khoản; lịch được lên lại khi đăng nhập và huỷ khi đăng xuất. | §6 Reminders |
| `f22c22c`, `c477a29` | Hàng đợi offline:<ul><li>mỗi lần ghi món gửi kèm `Idempotency-Key`</li><li>mất mạng hoặc rớt mạng giữa chừng thì vào hàng đợi lưu bền (AsyncStorage)</li><li>có mạng lại thì gửi lại đúng request cũ, không ghi trùng</li><li>thẻ "Chờ đồng bộ" ở Diary</li></ul>Dùng `@react-native-community/netinfo`. | F12 |
| `7bcbaa5`, `78c6223` | Hạ tầng test live gửi được multipart thật (ảnh, ghi âm). Sửa test cân nặng phụ thuộc giờ chạy. | — |

Gói mới, đều cài bằng `npx expo install` và tương thích Expo SDK 57:

- `expo-auth-session`, `expo-crypto` — đã gỡ ở đợt 3 cùng đăng nhập Google
- `@react-native-community/netinfo`

### Đợt 2 (14/10)

| Commit | Nội dung | Mục gap |
|---|---|---|
| `f64ceb9` | "Chia sẻ" tạo liên kết chỉ đọc có mã `smartmealmobile://shared/collections/<mã>`; bộ sưu tập vẫn riêng tư, "Tắt liên kết" làm liên kết cũ hết hiệu lực. Màn SharedCollection mở từ deep link. | §6 Chia sẻ |
| `a58312b` | Thông báo đọc từ server:<ul><li>bấm thì đánh dấu đã đọc rồi mở màn liên quan (Pet, Thử thách, Huy hiệu, Đi chợ, Gói của tôi);</li><li>"Đọc hết";</li><li>chấm đỏ ở chuông Dashboard khi có thông báo chưa đọc.</li></ul> | §6 Notifications |
| `8cf63ac` | Cài đặt → "Xóa tài khoản": xác nhận bằng mật khẩu, hoặc bằng email với tài khoản không có mật khẩu (tạo bằng Google trước đây). Thành công thì xóa dữ liệu cục bộ, hàng đợi offline và đăng xuất. | §6 Account |
| `81579b9` | Test unit và live cho ba phần trên. | — |

### Đợt 3 (14/10): bỏ đăng nhập Google

Theo quyết định của nhóm, app chỉ đăng nhập bằng email + mật khẩu.

| Commit | Nội dung |
|---|---|
| `4778a35` (BE) | Bỏ phần BE:<ul><li>`POST /auth/google` (giờ trả 404) và bộ xác minh ID token;</li><li>gói `Google.Apis.Auth`, cấu hình `Google:ClientIds`.</li></ul>Giữ cột `Users.GoogleId` để không mất dữ liệu cũ. Tài khoản tạo bằng Google trước đây (`hasPassword = false`) đặt mật khẩu qua "Quên mật khẩu" và xóa tài khoản bằng email. |
| `4996f3e` (FE) | Bỏ nút Google và đường kẻ "hoặc" ở Welcome/Login/Register, cùng service, hook và cấu hình `EXPO_PUBLIC_GOOGLE_*`. Gỡ `expo-auth-session`, `expo-crypto`. |

## 4. Cách kiểm chứng lại

**Backend:** cần PostgreSQL và .NET 9. Chi tiết xem [`backend/SmartMeal.Tests/README.md`](../backend/SmartMeal.Tests/README.md).

```bash
# Test tích hợp — mỗi lần chạy tạo một DB tạm trên server này
export SMARTMEAL_TEST_DB="Host=127.0.0.1;Port=5432;Username=postgres;Password=<mật khẩu>"
dotnet test backend/SmartMeal.Tests
```

**Frontend:**

```bash
cd frontend/SmartMealMobile
npx tsc --noEmit && npx expo lint && npx jest
```

**Test live:** FE gọi BE đang chạy ở chế độ Development.

```bash
export LIVE_API_URL=http://127.0.0.1:5099/api
export LIVE_BE_LOG=<file log của BE>   # đọc mã OTP mà BE ghi ra log
npx jest __tests__/live
```

> Từ đợt 2, biến môi trường đặt khi chạy được ưu tiên hơn `backend/.env` (DotNetEnv `NoClobber`). Vì vậy có thể chạy BE với DB hoặc cổng khác mà vẫn dùng khóa Gemini/JWT trong `.env`, ví dụ `ConnectionStrings__DefaultConnection=… ASPNETCORE_URLS=http://0.0.0.0:5000 dotnet run --project backend/SmartMeal.API`.

## 5. Cấu hình cần làm khi triển khai thật

| Việc | Ở đâu |
|---|---|
| AI thật | `Gemini:ApiKey`. Khi thiếu, ở Development mọi kết quả AI là dữ liệu mẫu có `isDemo: true` (app hiện banner demo); ở môi trường khác trả `503`. |
| Thanh toán | Chưa tích hợp cổng thật: URL thanh toán là sandbox. Cần đặt `Subscription:WebhookSecret` và nối cổng thanh toán. |
| Nhắc nhở | Không cần BE. Trên Android 13 trở lên, lần đầu bật nhắc nhở app sẽ xin quyền thông báo. |

## 6. Còn lại

- **F13 — Health Connect/HealthKit:** cần thư viện native, tức phải chuyển từ Expo Go sang Dev Client. `structure_system.md` §2/§11 yêu cầu nhóm quyết định trước. API `POST /health-sync/steps-and-calories` đã sẵn sàng.
- **Push từ server:** Expo Go trên Android không nhận push từ xa. Thông báo hiện xem trong app; nhắc nhở dùng thông báo cục bộ.
- **Cổng thanh toán thật (VNPay/MoMo):** cần mã merchant và secret của nhóm. Hiện Pro kích hoạt qua webhook có chữ ký hoặc `activate-mock` ở Development.
