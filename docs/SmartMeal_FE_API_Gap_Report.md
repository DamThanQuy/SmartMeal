# SmartMeal — Báo cáo API còn thiếu cho frontend

Ngày rà soát: **13/10/2026**. Mã nguồn đối chiếu: nhánh `main`, commit `c69fc09`.

Phạm vi: frontend React Native/Expo tại `frontend/SmartMealMobile` và backend ASP.NET Core tại `backend`. Báo cáo dựa trên controller, DTO, service, mapper, hook và các màn hình hiện có; **chưa kiểm thử HTTP với backend/database đang chạy**. Các đường dẫn API bên dưới đã bao gồm tiền tố `/api`.

Đã đọc tài liệu tổng quan V1/V2, API Contract, business rules, kiến trúc, tech stack, thiết kế và kế hoạch nối API Phần 1/2. Khi tài liệu và code khác nhau, báo cáo dùng code hiện tại để xác định trạng thái triển khai. Các endpoint/field ghi **đề xuất** là yêu cầu bổ sung cho nghiệp vụ hoặc UI, chưa phải hợp đồng backend đã triển khai.

## 1. Kết quả chính

**Có 20 thao tác HTTP mà code gọi API của FE đã sử dụng nhưng controller BE chưa khai báo.** Một thao tác được tính theo cặp `method + path`, nên `POST` và `DELETE` cùng một đường dẫn là hai thao tác. Đây là các lời gọi có trong code FE; khả năng chạy tới chúng còn phụ thuộc màn hình, chế độ mock và trạng thái phiên.

Ngoài API thiếu, có các lỗi tương thích cần xử lý trước:

- `/foods` thiếu `servings` và `allergyIds`: mapper FE không đọc được dữ liệu backend hiện tại.
- Nhật ký thiếu `createdAt`: mapper gọi xử lý ngày trên `undefined`, làm hỏng cả ngày có món ăn.
- `/meta/*` thiếu `code`, hồ sơ sức khỏe thiếu các mảng ID: FE có thể gửi hoặc hiển thị danh sách dị ứng/bệnh lý rỗng.
- Khảo sát FE gửi `dateOfBirth`, BE nhận `age`: tuổi không được gửi, có thể bị lưu thành `0` và làm sai BMR/TDEE.
- FE fallback ghi nhật ký dùng sai tên field và gửi song song, có nguy cơ lưu dữ liệu sai và tạo nhóm bữa trùng.
- Favorites/Collections có API nhưng nhiều màn vẫn dùng store và công thức mock.

### Mức ưu tiên

| Mức | Ý nghĩa trong báo cáo |
|---|---|
| **P0** | Lỗi làm hỏng luồng cốt lõi, ghi sai dữ liệu, bỏ sót ràng buộc dị ứng hoặc xác thực/thanh toán không đúng |
| **P1** | Thiếu chức năng đang có trên UI hoặc dữ liệu khiến chức năng hoạt động không đầy đủ |
| **P2** | Bổ sung trải nghiệm, khả năng mở rộng hoặc phạm vi cần chốt thêm |

### Trạng thái theo module

| Module | BE đã có | Khoảng thiếu chính |
|---|---|---|
| Auth/Profile | Register, login, Google, me, cập nhật tên/avatar URL | Refresh/logout, OTP/reset password, upload avatar, xóa dữ liệu; Google sai hợp đồng |
| Health/Meta | Survey, đọc hồ sơ, ghi/lịch sử cân nặng, danh mục | PUT hồ sơ, ngày sinh/chế độ ăn/nước, ID lựa chọn, `code` danh mục |
| Nutrition | Log một món, daily, weekly, delete | Batch, PUT món, metadata món; fallback FE sai request; macro tuần |
| Foods | GET danh sách và chi tiết nguyên liệu | Khẩu phần, dị ứng nhiều loại, scope, món tự nhập, favorite, barcode |
| Water | POST ghi nước | GET lịch sử, DELETE lần uống, `entryId`, mục tiêu theo hồ sơ |
| Recipes/Collections | List/detail/pantry/favorite; GET/POST collections và thêm món | FE còn mock; thiếu CRUD chi tiết, quyền sở hữu, dị ứng, bộ lọc mở rộng |
| Planner | Week/assign/delete/auto-generate | FE bỏ `mealPlanId`; thiếu hoàn thành/giữ ô cũ; lọc dị ứng và mục tiêu chưa đủ |
| Grocery | List/generate/add/check/delete/clear-checked | FE chưa sinh danh sách khi thực đơn đổi; tuần, carry-over, chi phí thực tế, số món được gộp |
| AI/Scanner | Snap, fridge, voice bằng text, check-safety | Quota, nhận audio/OCR ảnh, barcode thật, cờ demo; FE còn dữ liệu cố định |
| Health Sync | POST số liệu, GET daily-summary | BE cộng dồn trong khi FE gửi tổng ngày; thiếu nguồn đang dùng và trạng thái chưa đồng bộ |
| Gamification | Pet/streak/challenges/join | XP/level không cập nhật theo sự kiện, tiến độ/hoàn thành, huy hiệu/trang phục |
| Subscription | Plans/checkout/activate-mock | Status/transactions/cancel, thời hạn gói và xác nhận thanh toán thật |
| Reminders/Notifications | Chưa có controller | FE chỉ giữ dữ liệu cục bộ/mẫu; backend cần nếu muốn đồng bộ/push |

## 2. API FE đã gọi nhưng BE chưa có — 20 thao tác

Các API trong bảng cần bổ sung ở BE hoặc sửa FE để dùng một hợp đồng thống nhất. Thêm hằng số vào `endpoints.ts` hoặc viết service FE không có nghĩa backend đã hỗ trợ.

| ID | Ưu tiên | API còn thiếu | FE dùng ở đâu / tác động | Bằng chứng |
|---|---|---|---|---|
| A01 | P1 | `POST /api/auth/refresh` | Interceptor làm mới phiên; BE cũng chưa trả refresh token nên phiên hiện tại không thể refresh | [F-TOKEN], [B-AUTH], [B-AUTH-DTO] |
| A02 | P1 | `POST /api/auth/logout` | Service logout gửi refresh token để thu hồi phiên; hiện chưa có xử lý phía server | [F-AUTH], [B-AUTH] |
| A03 | P1 | `POST /api/auth/forgot-password` | Yêu cầu mã khôi phục mật khẩu | [F-AUTH], [B-AUTH] |
| A04 | P1 | `POST /api/auth/resend-otp` | Gửi lại mã OTP theo `email`, `purpose` | [F-AUTH], [B-AUTH] |
| A05 | P1 | `POST /api/auth/verify-otp` | Xác minh `email`, `code`, `purpose`; cần trả token đặt lại mật khẩu | [F-AUTH], [B-AUTH] |
| A06 | P1 | `POST /api/auth/reset-password` | Đặt mật khẩu bằng `resetToken`; luồng quên mật khẩu hiện chưa hoàn tất | [F-AUTH], [B-AUTH] |
| A07 | P1 | `POST /api/auth/avatar` | FE đã chọn ảnh và gửi multipart field `file`; `PUT /auth/profile` hiện chỉ lưu URL có sẵn | [F-AUTH], [B-AUTH] |
| A08 | P1 | `DELETE /api/me/data` | `DeleteDataScreen` gọi server trước khi reset máy/đăng xuất; với BE hiện tại thao tác bị lỗi | [F-AUTH], [F-DELETE], [B-PROGRAM] |
| A09 | P0 | `PUT /api/healthprofile` | Sửa thông tin cơ bản, dị ứng/bệnh lý/chế độ ăn, mục tiêu nước; BE chỉ có GET và POST khảo sát | [F-HEALTH], [B-HEALTH] |
| A10 | P0 | `POST /api/nutritiondiary/log/batch` | Ghi cả bữa trong một request; hiện rơi về fallback có lỗi tại C01 | [F-NUT], [B-DIARY] |
| A11 | P1 | `PUT /api/nutritiondiary/items/{id}` | Sửa khối lượng/bữa ăn, FE đã gọi PUT; BE chỉ có DELETE tại đường dẫn này | [F-NUT], [B-DIARY] |
| A12 | P1 | `GET /api/nutritiondiary/water?date=&days=` | WaterLog, tổng nước ngày/tuần, nhiệm vụ Pet và huy hiệu | [F-WATER], [B-DIARY] |
| A13 | P1 | `DELETE /api/nutritiondiary/water/{id}` | Xóa hoặc hoàn tác lần uống; POST hiện có nhưng không đủ cho cả luồng | [F-WATER], [B-DIARY] |
| A14 | P1 | `POST /api/foods` | Lưu món tự nhập từ CreateFood lên server | [F-NUT], [B-FOODS] |
| A15 | P1 | `POST /api/foods/{id}/favorite` | Đánh dấu **thực phẩm** yêu thích; khác API yêu thích **công thức** đã có | [F-NUT], [B-FOODS] |
| A16 | P1 | `DELETE /api/foods/{id}/favorite` | Bỏ thực phẩm yêu thích theo trạng thái đích | [F-NUT], [B-FOODS] |
| A17 | P1 | `GET /api/ai/quota` | FE đọc hạn mức, số lượt dùng/còn lại và giờ reset; hiện dùng số mặc định khi chưa tải được | [F-AI], [F-QUOTA], [B-AI] |
| A18 | P1 | `GET /api/subscription/status` | Đọc trạng thái và hạn gói; checkout gọi API này **trước** tạo phiên thanh toán nên hiện bị chặn ngay đầu luồng | [F-PREMIUM], [B-SUB] |
| A19 | P1 | `GET /api/subscription/transactions` | Lịch sử giao dịch ở Subscription | [F-PREMIUM], [B-SUB] |
| A20 | P1 | `POST /api/subscription/cancel` | Hủy gia hạn nhưng giữ quyền Pro tới hết hạn | [F-PREMIUM], [B-SUB] |

Lưu ý: thiếu một method tại route đã tồn tại có thể trả **405**, không nhất thiết 404. Ví dụ `PUT /healthprofile` và `POST /foods`. FE không tự chuyển sang mock khi một hàm API thật nhận 404/405; `selectService` chỉ fallback nếu **không có implementation của hàm**.

## 3. API đã có nhưng thiếu field hoặc khác request FE

Tên field trong bảng dùng dạng JSON camelCase. Cột “cần có” phân biệt trường **FE đã khai báo/đọc** với trường **đề xuất để phục vụ UI**.

| ID | Ưu tiên | API / DTO hiện có | Thiếu hoặc khác ở BE | Tác động / yêu cầu |
|---|---|---|---|---|
| B01 | P1 | Auth response của register/login/google | FE khai báo `refreshToken`, `refreshTokenExpiresAt`; BE chỉ trả `token`, `expiresAt`, `user` | Bổ sung cặp refresh token cùng A01/A02; hiện FE vẫn lưu access token được, nhưng không làm mới phiên |
| B02 | P1 | `UserDto` trong auth/me/profile | Thiếu `subscriptionStatus`, `proExpiresAt` so với type FE | Đây là thiếu ở hợp đồng; `auth.mapper` hiện chưa dùng hai field này. Luồng gói thực tế cần A18, không nên kết luận login lỗi chỉ vì B02 |
| B03 | **P0** | `POST /healthprofile/survey` | FE gửi `dateOfBirth`, `dietaryPreferenceIds`; BE DTO không có hai field này và dùng `age` | FE **không gửi `age`**. Với binding hiện tại `age` mặc định 0; ngày sinh/chế độ ăn bị bỏ qua. BE cần lưu ngày sinh, tính tuổi và lưu chế độ ăn, hoặc FE phải thích nghi tạm theo DTO BE |
| B04 | **P0** | `GET /healthprofile`, response survey | Thiếu `dateOfBirth`, `waterGoalMl`, `allergyIds`, `medicalConditionIds`, `dietaryPreferenceIds` | BE trả `allergies`/`medicalConditions` dạng tên nhưng mapper mới chỉ phục hồi từ ID. Hồ sơ có dị ứng trên server có thể trở thành `allergyIds: []` ở FE |
| B05 | **P0** | `GET /meta/allergies`, `/medical-conditions`, `/tags` | Thiếu `code` ổn định; BE trả entity có `id`, `name`, ... | `metaLookup` ánh xạ bằng `code`, không bằng tên/id seed. Thiếu `code` khiến lựa chọn như `seafood` chuyển thành `[]`; cần code khớp slug FE, ví dụ `seafood`, `diabetes`, `eatClean` |
| B06 | **P0** | `GET /foods`, `GET /foods/{id}` | FE cần `servings: [{id,label,grams}]`, `defaultServingId`, `allergyIds`, `isVerified`, `isUserCreated`, `isFavorite`, `barcode`; BE chưa trả cả 7 trường | Mapper đọc trực tiếp `dto.servings.length`, `dto.allergyIds.map(...)`, nên thiếu dữ liệu gây TypeError. BE có `allergyId` đơn lẻ nhưng mapper dinh dưỡng mới không dùng làm fallback |
| B07 | **P0** | `DiaryItemDto` của POST log và GET daily | Thiếu `mealType`, `logDate`, `createdAt`, `recipeId`, `ingredientId`, `imageUrl` | `createdAt` đang được đọc trực tiếp để parse ngày; thiếu field gây TypeError ngay cả khi bữa đã lấy từ nhóm. ID liên kết/ảnh đã có ở request/entity nhưng chưa được trả |
| B08 | P1 | `GET /nutritiondiary/weekly-progress` | Thiếu `proteinGrams`, `carbsGrams`, `fatGrams`, `targetProteinGrams`, `targetCarbsGrams`, `targetFatGrams` theo ngày | Mapper hiện tính trung bình từ các field này; ngày có dữ liệu cho kết quả `NaN`. Bổ sung BE hoặc FE ẩn macro tuần khi không đủ số liệu |
| B09 | P1 | `POST /nutritiondiary/water` → `WaterSummaryDto` | Thiếu `entryId` | FE nhận ID rỗng; cần ID lần uống vừa ghi để xóa/hoàn tác. Đồng thời mục tiêu hiện cố định 2000 ml, cần lấy từ hồ sơ |
| B10 | P1 | `GET /health-sync/daily-summary` | Thiếu `activeSource`; `lastSyncedAt` chưa nullable; `sources` không phản ánh ngày trống | FE cần nguồn đang tính vào budget, `sources: []` và `lastSyncedAt: null` khi chưa có log. BE hiện thêm `Manual` và thời điểm hiện tại dù chưa đồng bộ |
| B11 | **P0** | Snap/Voice response | FE đã đọc `isDemo`, BE chưa có field này | Khi Gemini không cấu hình/lỗi, BE vẫn trả dữ liệu mẫu thành công; FE có thể hiển thị và lưu như kết quả thật. Fridge/check-safety cũng cần cờ nguồn dữ liệu tương tự nếu còn hỗ trợ demo |
| B12 | **P0** | `RecipeDto`, `RecipeIngredientDto` | **Đề xuất:** `allergyIds` toàn công thức và từng nguyên liệu; trạng thái thành phần chưa rõ | FE đang suy dị ứng bằng tải `/foods` rồi join `ingredientId`; Recipe DTO không tự đủ dữ liệu. Cần dữ liệu dị ứng trực tiếp và lọc trên server, xem C02 |
| B13 | P1 | `RecipeCollectionDto` | **Đề xuất:** `ownerId` hoặc `isOwner`, `shareUrl`/share token khi triển khai chia sẻ | GET collections trả cả collection của user và public nhưng không trả chủ sở hữu; UI không thể xác định quyền sửa/xóa chỉ dựa trên `isPublic` |
| B14 | P1 | `GrocerySummaryDto`, `GroceryItemDto` | **Đề xuất:** `listId`, `weekStartIso`/khoảng ngày, `mergedFromRecipeCount`, `sourceRecipeIds`, `isManual`, `actualCostVnd` | UI có danh sách theo tuần, nhãn gộp nguyên liệu và nhập chi phí thực tế. BE hiện một danh sách/user; FE tự gán tuần, gán số món gộp bằng 1; chi phí nhập chưa lưu |
| B15 | P1 | `CheckSafetyResponseDto.extractedNutrition` | **Đề xuất:** `proteinGrams`, `carbsGrams`, `servingGrams` hoặc nutrition basis rõ ràng; product identity và `allergenIds` | Hiện chỉ có calo/khẩu phần dạng chuỗi/đường/natri/fat. Scanner FE tự điền protein/carbs cố định, gán ALLERGY thành peanut và dùng giá trị mỗi khẩu phần như mỗi 100 g |
| B16 | P1 | Fridge suggestion | **Đề xuất:** `recipeId` nếu gợi ý phải mở chi tiết/thêm thực đơn của recipe trong DB | Gợi ý hiện chỉ có title, mô tả và hướng dẫn ngắn. FE hiện chỉ lấy nguyên liệu rồi gọi pantry riêng; API pantry đã trả recipe ID nên không bắt buộc sửa fridge nếu giữ luồng đó |
| B17 | P1 | `ChallengeDto` | **Đề xuất:** `startDate`, `endDate`, `joinedAt`, `windowState`, phần thưởng trang phục nếu UI sử dụng | FE tự dựng ngày bắt đầu bằng hôm nay mỗi lần tải, chưa có thời gian thử thách thật; cần tiến độ và mốc thời gian từ server |
| B18 | P2 | `RecipeDto` | **Đề xuất:** `rating`, `ratingCount` nếu tiếp tục hiển thị đánh giá | FE type có `rating`, màn RecipeDetail hiển thị sao nhưng mapper hiện gán 0. `imageUrl`, `isPremium`, `description` **đã có ở BE**; FE đang bỏ chúng, xem F10 |

Bằng chứng DTO: [B-AUTH-DTO], [B-HEALTH-DTO], [B-FOOD-DTO], [B-DIARY-DTO], [B-WATER-DTO], [B-SYNC-DTO], [B-AI-DTO], [B-RECIPE-DTO], [B-COL-DTO], [B-GRO-DTO], [B-GAM-DTO]. Bằng chứng FE đọc dữ liệu: [F-HMAP], [F-META], [F-NMAP], [F-WATER], [F-SYNC-MAP], [F-AIMAP], [F-SCAN], [F-RMAP], [F-CHALLENGE].

### Ba hợp đồng response tối thiểu nên thống nhất trước

Các ví dụ là **phần dữ liệu tối thiểu cần bổ sung**, nằm trong `data` của envelope hiện có; không phải JSON đã xác nhận qua HTTP.

```json
{
  "id": "food-guid",
  "name": "Tên thực phẩm",
  "caloriesPer100g": 165,
  "proteinPer100g": 31,
  "carbsPer100g": 0,
  "fatPer100g": 3.6,
  "allergyIds": [],
  "servings": [{ "id": "serving-guid", "label": "100 g", "grams": 100 }],
  "defaultServingId": "serving-guid",
  "isVerified": false,
  "isUserCreated": false,
  "isFavorite": false,
  "barcode": null
}
```

```json
{
  "id": "diary-item-guid",
  "foodName": "Tên món",
  "mealType": "Lunch",
  "logDate": "2026-10-13",
  "createdAt": "2026-10-13T05:00:00Z",
  "servingSize": 100,
  "unit": "g",
  "calories": 165,
  "proteinGrams": 31,
  "carbsGrams": 0,
  "fatGrams": 3.6,
  "logMethod": "Manual",
  "ingredientId": "food-guid",
  "recipeId": null,
  "imageUrl": null
}
```

```json
{
  "dateOfBirth": "2004-01-15",
  "age": 22,
  "allergyIds": [1],
  "medicalConditionIds": [],
  "dietaryPreferenceIds": [1],
  "waterGoalMl": 2000
}
```

Trong `/meta/*`, các ID tương ứng phải có `code` ổn định. Các field dinh dưỡng còn lại vẫn cần trả đầy đủ theo DTO FE; ví dụ food phía trên chỉ minh họa các trường liên quan đến khoảng thiếu.

## 4. API có nhưng hành vi chưa đáp ứng FE

### C01 — P0: Fallback ghi nhật ký sai field và không an toàn khi gửi nhiều món

Khi A10 trả 404, [F-NUT] dùng `Promise.all` gửi tới `POST /nutritiondiary/log`. Request fallback khác DTO BE:

| FE fallback đang gửi | BE thực sự nhận |
|---|---|
| `planDate` | `logDate` |
| `customFoodName` | `foodName` |
| `servingSizeGrams` | `servingSize` và `unit` |
| `carbs` | `carbsGrams` |
| `protein` | `proteinGrams` |
| `fat` | `fatGrams` |

`mealType` và `calories` đúng, nhưng các field còn lại bị bỏ qua: có thể lưu tên rỗng, serving mặc định 1 phần, macro 0 và ngày mặc định UTC thay vì ngày user chọn. Fallback cũng không giữ `ingredientId`, `recipeId`, `logMethod`.

BE “tìm hoặc tạo” nhóm theo `(user, ngày, bữa)` mà chưa có unique index tương ứng. Hai request cùng tạo nhóm có thể sinh nhóm trùng; GET daily lấy `FirstOrDefault` cho từng bữa nhưng tổng calo cộng tất cả nhóm. Kết quả có thể thiếu món trên UI và tổng không khớp.

**Cần sửa:** ưu tiên batch có transaction và unique index `(UserId, LogDate, MealType)` sau khi chuẩn hóa meal type. Trong lúc chờ BE, FE gửi đúng DTO một món và tuần tự; tuần tự trên một máy vẫn không giải quyết được cạnh tranh giữa nhiều thiết bị. Bằng chứng: [F-NUT], [B-DIARY-SVC], [B-DB].

### C02 — P0: Ràng buộc dị ứng chưa được bảo đảm xuyên suốt

- GET recipes và suggest-by-pantry chưa lọc theo user phía server.
- FE Discovery/pantry có join dị ứng từ foods, nhưng hồ sơ có thể bị hydrate rỗng do B04/B05. Recipe mapper coi nguyên liệu không tìm được thông tin dị ứng như không có dị ứng, chưa đánh dấu thành phần không rõ.
- `mealPlannerService.getSlotSuggestions()` lấy recipes trực tiếp, trả `excludedAllergenIds: []`, không qua bộ lọc dị ứng của recipeService.
- `AssignMealAsync` chỉ kiểm tra recipe tồn tại, không kiểm tra dị ứng/bệnh lý của user.
- `AutoGenerateWeeklyPlanAsync` có lọc dị ứng nhưng nếu không còn món phù hợp thì gán lại `safeRecipes = allRecipes`.

**Cần sửa:** B04/B05/B12 cùng bộ lọc server; không fallback sang món có dị ứng; FE dùng chung nguồn recipe đã kiểm tra. Nếu không đủ món hợp lệ, trả lỗi hoặc kết quả rỗng có lý do. Bằng chứng: [F-HMAP], [F-META], [F-RECIPE], [F-RMAP], [F-PLAN], [B-RECIPE-SVC], [B-PLAN-SVC].

### C03 — P0: Google login có route nhưng sai hợp đồng xác thực

FE service gửi `{ idToken }`; BE nhận `{ googleId, email, fullName, avatarUrl }` và tìm/liên kết tài khoản bằng email do client gửi, không xác minh Google ID token. Nút Google hiện còn no-op ở UI nên chưa chạy service, nhưng backend vẫn có route này.

**Cần sửa:** BE nhận và xác minh `idToken`, lấy danh tính từ kết quả xác minh; sau đó FE mới nối nút đăng nhập và lấy token thật. Bằng chứng: [F-AUTH], [F-LOGIN], [B-AUTH-DTO], [B-AUTH-SVC].

### C04 — P0: Checkout và kích hoạt Pro mới là mô phỏng

`create-checkout-session` tạo session ID và URL VNPAY nhưng không lưu giao dịch, không có webhook xác minh, không xử lý khác nhau theo `paymentMethod`. `activate-mock` chỉ yêu cầu đăng nhập, không kiểm tra môi trường và chỉ đặt `user.IsPro = true`; không lưu hạn dùng hoặc dùng `planId` để tính thời hạn.

**Cần sửa:** bổ sung A18–A20, trạng thái/thời hạn gói, giao dịch và xác nhận server-to-server; giới hạn activate-mock bằng môi trường BE. Không dựa vào kiểm tra `ENV.appEnv` ở FE để bảo vệ route BE. Bằng chứng: [B-SUB], [B-SUB-SVC], [F-PREMIUM].

### C05 — P1: Health sync cộng dồn khác với hợp đồng FE

FE gửi **tổng số liệu trong ngày của một nguồn** và kỳ vọng thay thế. BE hiện mỗi POST thêm một dòng, GET cộng mọi dòng và mọi nguồn. Ví dụ đồng bộ `steps: 6240` hai lần cùng ngày/nguồn sẽ trả 12480 bước. Nút DEV `syncNow` hiện không giới hạn một lần/ngày.

**Cần sửa:** upsert theo `(UserId, SyncDate, Source)` và chọn nguồn ưu tiên khi các nguồn ghi cùng dữ liệu, hoặc đổi rõ hợp đồng thành dữ liệu tăng thêm và sửa FE tương ứng. Ngày chưa đồng bộ trả `sources: []`, `activeSource: null`, `lastSyncedAt: null`. Bằng chứng: [F-SYNC], [F-HCONNECT], [B-SYNC-SVC].

### C06 — P0/P1: AI chưa phân biệt kết quả thật, demo và hạn mức

Gemini lỗi hoặc chưa có API key vẫn trả `success: true` cùng dữ liệu mẫu cho snap/fridge/voice/check-safety. `isDemo` FE đang đọc không tồn tại trong DTO BE. AiController cũng chưa có Authorize/quota enforcement; FE `getQuota` lỗi thì dùng lượt mặc định và `recordUsage` bản thật không trừ lượt.

**Cần sửa:** production trả lỗi thật khi AI không hoạt động; demo có cờ rõ ràng và không được lưu như kết quả thật. Bổ sung quota server theo user/ngày, trả 429 khi hết lượt, chỉ tính lượt đúng theo nghiệp vụ. Hợp đồng upload cũng cần khớp giới hạn mà FE đang mô tả; BE hiện chỉ kiểm tra file không rỗng. Bằng chứng: [B-AI], [B-AI-SVC], [F-AI], [F-QUOTA].

### C07 — P1: Grocery chưa có vòng đời theo tuần và phép tính đơn vị đầy đủ

BE giữ một danh sách cho user, không có tuần trong entity/response. `clearExisting: true` xóa cả món tự thêm. `clearExisting: false` thêm các nguyên liệu đã tổng hợp vào DB, không gộp với pending cũ nên carry-over hoặc generate lặp có thể trùng món. FE carry-over xóa món đã mua trước, sau đó tuần sau không có plan thì nhận lỗi; hai bước không nguyên tử.

Giá sinh từ plan luôn là `EstimatedPriceVnd × amount / 100`, kể cả đơn vị `quả`. Nguyên liệu seed trứng giá 4000, 2 quả được tính thành 80. Cần quy định rõ giá theo 100 g hay theo đơn vị, có dữ liệu quy đổi và tính theo số phần cần mua.

**Cần sửa:** list theo tuần/khoảng ngày, source manual/generated, cơ chế regenerate/carry-over giữ pending và món tự thêm, xử lý lặp và chuẩn đơn vị giá. Bằng chứng: [B-GRO-SVC], [B-GRO-DTO], [B-SEED], [F-GRO].

### C08 — P1: Planner sinh món nhưng chưa đáp ứng cá nhân hóa và giữ ô cũ

`auto-generate` xóa cả tuần rồi chọn ngẫu nhiên; `targetDailyCalories` trong request không được dùng để chọn món. `UserConditions` được tải nhưng chưa áp dụng; diet tag chỉ được dùng nếu có ít nhất 3 món. Không có `keepExisting`; FE tự GET rồi assign từng ô trống.

**Cần sửa:** server hỗ trợ giữ ô có sẵn, kiểm tra mục tiêu/ràng buộc và trả lý do khi không thể tạo đủ; bảo đảm cập nhật tuần nhất quán khi thao tác thất bại. Bằng chứng: [B-PLAN-SVC], [B-PLAN-DTO], [F-PLAN].

### C09 — P1/P2: Gamification chưa lưu tiến độ và phần thưởng thật

Pet được tạo level 1/exp 20, nhưng không có xử lý cộng XP từ diary/water/challenge trong các service đã rà soát. Join challenge khởi tạo `CompletedDays = 1`; chưa có cập nhật tiến độ hay hoàn thành. FE `completeChallenge` chỉ GET rồi cộng XP cục bộ và trả object `completed: true`, không lưu server. Pet lại đọc XP server, còn badges đọc ledger mock seed 2400 XP nên hai màn có thể lệch cấp.

Streak ép tối thiểu 1 dù tài khoản chưa ghi món; đồng thời lấy ngày từ NutritionDiary mà không kiểm tra còn item, nên xóa món cuối cùng vẫn có thể tính ngày hoạt động.

**Cần sửa:** BE tính tiến độ/XP/phần thưởng từ dữ liệu thật và chống nhận thưởng lặp; trả streak 0 khi chưa hoạt động; FE đọc cùng một nguồn. Bằng chứng: [B-GAM-SVC], [F-GAM], [F-CHALLENGE], [F-BADGE], [F-XP].

### C10 — P1/P2: Query đã gửi hoặc ghi trong docs nhưng server chưa hỗ trợ

| API | Hiện tại | Cần bổ sung / thống nhất |
|---|---|---|
| `GET /foods` | Nhận `search`, `category`, `page`, `pageSize`; không nhận `scope` | FE gửi `all/recent/favorite/mine`, nhưng BE bỏ qua và đều trả catalog. Cần nguồn theo user, favorite/history/created foods và quyền truy cập tương ứng |
| Tìm kiếm food/recipe | `ToLower().Contains(...)` | FE comment nói tìm không dấu, nhưng code BE chưa có chuẩn hóa/bộ tìm kiếm không dấu; cần kiểm thử với DB thực tế trước khi cam kết |
| `GET /recipes` | Nhận search/tag/difficulty/maxCalories; trả mảng không phân trang | `page`, `pageSize`, `mealType`, khoảng calo và `maxCookTimeMinutes` chưa có. FE hiện tự lọc thời gian/khoảng calo trên toàn bộ kết quả |
| `GET /healthprofile/weight-history` | Trả toàn bộ history, không nhận `days` | Contract cũ mô tả `days=30`; chưa phải tham số được hỗ trợ. FE hiện có thể dùng toàn bộ history, chỉ cần bổ sung nếu muốn lọc server |

Bằng chứng: [B-FOODS], [B-FOOD-SVC], [B-RECIPE], [B-RECIPE-SVC], [B-HEALTH], [F-NUT], [F-RECIPE].

## 5. BE có API/field nhưng FE chưa nối đúng

Các mục này giao cho FE; không nên yêu cầu BE tạo lại endpoint đã tồn tại.

| ID | Ưu tiên | Hiện trạng FE | Việc cần làm / API đã có |
|---|---|---|---|
| F01 | P1 | `FavoritesScreen` đọc `useFavoritesStore` và `RECIPE_DATABASE_MOCK` | Dùng `useFavoriteRecipes`, `useCollections`, `useToggleFavorite`; GET/POST favorite và GET collections đã có. Hiện tim ở Discovery/RecipeDetail gọi thật nhưng danh sách Đã lưu vẫn mock |
| F02 | P1 | `CreateCollectionScreen` tạo ID cục bộ; `CollectionDetailScreen` tìm collection/công thức trong mock | Nối POST/GET collections hiện có; thêm món dùng POST collection items. Đổi tên/xóa/bỏ món còn cần API bổ sung tại mục 6 |
| F03 | P1 | Nút Google ở Login có `onPress={() => {}}` | Nối lấy ID token và `loginWithGoogle` sau khi sửa C03; không phải thiếu route Google |
| F04 | P1 | Planner mapper bỏ `mealPlanId`; `PlannedMealSlot` chỉ giữ recipe ID/tên/time/calo | Giữ `mealPlanId` để gọi DELETE `/mealplanner/{id}`. `isCompleted` và macro/ảnh cũng đã có ở response BE; cần map nếu UI dùng |
| F05 | P1 | Grocery GET không tự gọi generate; hook chỉ invalidate rồi GET lại | API `generate-from-plan` đã có. Cần luồng sinh/làm mới rõ ràng khi plan đổi; hiện đổi thực đơn không làm DB grocery cập nhật |
| F06 | **P0** | Scanner gọi check-safety với barcode `8934567890123` và OCR text cố định; không nhận input từ hook | Nhận mã/text/ảnh thật; bỏ protein 7.2, carbs 32.5 và fallback dinh dưỡng cố định; giữ message/type/severity và đúng loại dị ứng từ server, không quy mọi ALLERGY thành peanut |
| F07 | P1 | SlotPicker tab Yêu thích đọc mock ID; tab Collection trả mảng rỗng | Nối favorites/collections hiện có; tránh gửi slug mock vào API assign yêu cầu GUID. Gợi ý còn cần bộ lọc tại C02 |
| F08 | P1 | Dashboard luôn trả `RECOMMENDED_MEAL_MOCK`, `RECOMMENDED_MEALS_MOCK` | Dùng recipe API hiện có cho danh sách thật; nếu cần gợi ý cá nhân hóa theo budget còn lại thì thống nhất API mở rộng. Không bắt buộc tạo API dashboard tổng hợp chỉ để thay mock |
| F09 | P1 | `completeChallenge`, badges/equip vẫn thay đổi cục bộ; badge hoàn thành còn đọc getter mock | Nối dữ liệu tiến độ/phần thưởng server khi BE bổ sung C09 và mục 6; đồng bộ XP/level giữa Pet và Badges |
| F10 | P1/P2 | Recipe mapper bỏ `imageUrl`, `isPremium`, `description`, gán `rating: 0`; chỉ map 4 tag | BE đã có ảnh/cờ Premium/mô tả. Map vào model và dùng UI tương ứng; Low Carb/Vegetarian đang có option FE nhưng thiếu mapping/tag hệ thống tương ứng |
| F11 | P1 | `ENV.useMockApi` mặc định true, nhưng recipe/planner/grocery services gọi `request` trực tiếp | Áp dụng một chế độ mock/API thống nhất; bật mock hiện vẫn có thể phát sinh request BE ở các feature này. Docs Phần 1 nói mặc định API thật đã không khớp code |
| F12 | P2 | Offline queue chỉ có id/label/time và badge mô phỏng; chưa lưu payload/replay | Bổ sung queue bền vững và gửi lại khi có mạng. Có thể dùng API CRUD hiện có, không nhất thiết thêm `/sync`; cần request ID/idempotency để tránh ghi trùng |
| F13 | P2 | Health Connect connect/toggle chỉ lưu preferences, sync thật chưa có nguồn native | Hoàn thiện native integration trong Dev Client; GET/POST health-sync đã có. Backend API tồn tại không đồng nghĩa đã đọc dữ liệu thiết bị |

Bằng chứng: [F-FAV], [F-CREATECOL], [F-COL], [F-LOGIN], [F-PLAN], [F-GRO], [F-SCAN], [F-SCANHOOK], [F-SLOT], [F-DASH], [F-CHALLENGE], [F-BADGE], [F-RMAP], [F-ENV], [F-OFFLINE], [F-HCONNECT].

## 6. API bổ sung để hoàn thiện UI — chưa phải lời gọi thật hiện tại

Các đường dẫn dưới đây là **đề xuất**, cần thống nhất method, request, response giữa FE/BE. Không cộng chúng vào 20 thao tác ở mục 2.

| Nhóm / ưu tiên | API hoặc năng lực cần bổ sung | Thuộc tính / hành vi tối thiểu |
|---|---|---|
| Collections — P1 | `GET /recipes/collections/{id}`, `PATCH` hoặc `PUT` cùng đường dẫn, `DELETE` cùng đường dẫn, `DELETE /recipes/collections/{id}/items/{recipeId}` | Detail gồm recipes, quyền chủ sở hữu; sửa tên/mô tả/ảnh/quyền chia sẻ; kiểm tra owner khi sửa/xóa |
| Chia sẻ collection — P2 | Tạo/thu hồi liên kết và GET collection được chia sẻ | `shareUrl` hoặc token xem, chỉ đọc, trạng thái public/thu hồi; hiện `isPublic` đã có nhưng chưa có luồng chia sẻ hoàn chỉnh |
| Planner — P1 | `PATCH /mealplanner/{id}/complete`; tùy chọn `keepExisting` trên auto-generate | `isCompleted`, ý nghĩa đã nấu/đã ăn; nếu tích hợp diary phải chống ghi trùng |
| Grocery — P1/P2 | `PATCH /grocery/items/check-all`; sửa item; thao tác hoàn tất/carry-over theo list | Bulk trả kết quả nhất quán; lưu `actualCostVnd`; pending/món thủ công được giữ; tuần sau chưa có plan vẫn xử lý được |
| Barcode — P1 | `GET /foods/barcode/{code}` hoặc năng lực tương đương | Product/food ID, barcode, tên/brand, serving grams, macro, allergens; không tìm được trả trạng thái rõ để vào ProductNotFound |
| Voice — P1 | Nhận audio để STT, hoặc FE native STT rồi dùng `/ai/voice-log` hiện có | Transcript thật, ngôn ngữ, món nhận diện; không yêu cầu endpoint audio nếu FE đã cung cấp được text thật |
| OCR — P1 | Nhận ảnh nhãn để OCR, hoặc FE OCR rồi dùng `/ai/check-safety` hiện có | Text thật, nutrition basis/khẩu phần, protein/carbs/fat/sugar/sodium, độ chắc chắn; cần khả năng sửa trước khi lưu |
| Gamification — P1 | GET tiến độ/nhiệm vụ; BE tính/cập nhật completion; GET badges/costumes; equip/unequip | XP/level, thưởng đã nhận, mốc ngày; unlock/equipped nằm trên server. Nếu có endpoint claim, server kiểm tra điều kiện thay vì nhận `completed=true` từ client |
| Reminders — P2 | GET/PUT cài đặt nhắc nhở nếu cần đồng bộ giữa thiết bị | Bữa/giờ/enabled, chu kỳ nước, quiet hours/timezone; nhắc cục bộ có thể dùng native service và storage mà không cần backend. FE hiện tại: [F-REMINDERS] |
| Notifications — P2 | GET danh sách, PATCH đã đọc/đọc tất cả; đăng ký/hủy push token nếu có push | id/type/title/body/createdAt/readAt/navigation target; hiện danh sách API mode bắt đầu rỗng và markAllRead chỉ sửa bộ nhớ. FE hiện tại: [F-NOTIFICATIONS] |
| Account/password — P2 | `POST /auth/change-password`, `DELETE /auth/account` nếu phạm vi yêu cầu | Đổi mật khẩu trực tiếp và xóa tài khoản khác xóa dữ liệu cá nhân. Các URL đã có trong constants nhưng chưa thấy lời gọi thực tế |
| Gợi ý cá nhân hóa — P2 | Mở rộng recipes/recommendations hoặc gợi ý slot có user context | Recipe ID, lý do, dị ứng/bệnh lý/chế độ ăn, ngân sách còn lại. Không cần tạo API mới nếu mở rộng GET recipes đáp ứng đủ |

`endpoints.ts` còn khai báo `GET /mealplanner/{id}` và các URL như badges/equip/check-all/collection detail nhưng chưa có controller tương ứng. Chỉ khai báo URL là chưa đủ để xem là đã nối. Ngược lại, GET một món nhật ký riêng không bắt buộc: FE hiện lấy ngày rồi chọn item bằng ID.

## 7. Những chỗ tài liệu hiện tại đã cũ

| Tài liệu | Nội dung cần cập nhật |
|---|---|
| `README.md`, Overview V1 | Một số phần còn mô tả Flutter/mobile; code hiện là React Native/Expo ở `frontend/SmartMealMobile` |
| `docs/SmartMeal_API_Contract.md` | Nhiều API ghi chưa làm nhưng controller đã có: profile, cân nặng, nước POST, favorites/collections, health-sync, gamification, subscription và foods GET |
| API Contract — health | Body dùng `height`, `weight`, `dietGoal` và allergy GUID; code BE là `heightCm`, `currentWeightKg`, `goal`, allergy/condition ID int; FE mới lại dùng ngày sinh thay tuổi |
| API Contract — diary | Body dùng `date`, `portionGrams`, `carbs/protein/fat`; DTO BE là `logDate`, `servingSize`, `carbsGrams/proteinGrams/fatGrams`; daily là `meals[]` và `totalCalories/targetCalories`, không phải object bốn bữa như ví dụ cũ |
| API Contract — recipes/pantry | Instructions BE là chuỗi; thời gian gồm prep/cook; dinh dưỡng là `*PerServing`; pantry nhận `availableIngredients`, không phải `ingredients` |
| Fetch API Phần 1, §16 | Mô tả còn ghi nhật ký tuần tự, sửa bằng tạo/xóa, macro tuần ẩn, OTP/avatar/delete/water còn mock; code hiện đã gọi API mới nhưng BE chưa đáp ứng |
| Fetch API Phần 2 | Mô tả workflow dự kiến; Favorites/Collections/SlotPicker vẫn dùng mock ở nhiều màn. Không dùng kế hoạch này làm bằng chứng chức năng đã hoàn tất |
| Comments trong FE `*.api.ts` | Nhiều comment khẳng định BE đã lưu ngày sinh, hỗ trợ batch, quota, upsert sync hay giới hạn activate-mock; các khẳng định này chưa đúng với BE tại commit rà soát |

Nên cập nhật API Contract theo controller/DTO sau khi chốt sửa, kèm trạng thái **BE có / FE nối / HTTP đã kiểm thử** riêng biệt. Không chỉ đổi nhãn “đã làm” theo việc có service FE.

## 8. Thứ tự xử lý đề nghị

1. **Khôi phục luồng dữ liệu cốt lõi:** B05/B04/B03 cho health/meta; B06 cho foods; B07 và C01/A10 cho diary. Tránh gửi dị ứng rỗng hoặc lưu sai request trong giai đoạn chuyển tiếp.
2. **Bảo đảm ràng buộc và kết quả thật:** C02 dị ứng, C03 Google, C04 thanh toán và C06 AI fallback. Hoàn tất server trước khi mở các luồng FE tương ứng.
3. **Hoàn thiện chức năng FE đã gọi:** PUT health/diary, water GET/DELETE, POST foods/favorite, auth OTP/avatar/delete/refresh và subscription status/history/cancel; bổ sung field trong mục 3 cùng lúc.
4. **Nối các màn còn mock bằng API hiện có:** Favorites/Collections/SlotPicker, giữ planner ID, sinh grocery, đề xuất Dashboard và chế độ mock thống nhất.
5. **Hoàn thiện nghiệp vụ nâng cao:** sync không nhân đôi, grocery theo tuần/giá/chi phí, gamification tiến độ/phần thưởng, scanner native/STT/OCR và offline replay.

### Tiêu chí kiểm chứng khi triển khai

- Dữ liệu food/diary/meta đúng DTO BE đi qua mapper không lỗi; tuổi và dị ứng không mất sau đăng nhập lại.
- Ghi nhiều món, ghi cho ngày khác, retry và ghi từ hai thiết bị không sinh nhóm/món trùng; tổng khớp danh sách.
- Sửa/xóa nhật ký và nước giữ đúng quyền sở hữu, trả ID/ngày/giờ nhất quán; macro tuần không có `NaN`.
- Món chứa dị ứng không xuất hiện trong gợi ý/plan; không có món phù hợp thì trả lý do, không dùng fallback không hợp lệ.
- Đồng bộ cùng tổng ngày hai lần không nhân đôi; ngày chưa sync không hiện “vừa đồng bộ”.
- Collection/favorites tạo từ app có thể đọc lại từ server; Grocery phản ánh thực đơn và giữ món thủ công/pending.
- Hết hạn/đăng xuất/đổi mật khẩu có hành vi phiên rõ ràng; Google phải xác minh token; Pro chỉ mở theo trạng thái server đã xác nhận.
- AI demo/lỗi không được trình bày như dữ liệu nhận diện thật; quota, XP và phần thưởng không do client tự quyết định.

## 9. Kiểm tra đã thực hiện trong lần rà soát

Đã đối chiếu route của **12 controller** với các lời gọi FE và xác nhận thiếu 20 cặp method/path ở mục 2. Đã so sánh field của 11 DTO FE/BE cho auth, health, food, diary, weekly, water, sync và AI.

Đã chạy **mapper FE hiện tại** bằng Node/TypeScript với fixture có shape theo DTO BE hiện tại, không sửa code ứng dụng và không gọi server:

| Kiểm tra | Kết quả quan sát |
|---|---|
| `fromFoodDto` với FoodItemDto BE | `TypeError: Cannot read properties of undefined (reading 'length')` do thiếu `servings` |
| `fromDiaryItemDto`, đã truyền bữa `lunch` | `TypeError: Cannot read properties of undefined (reading 'split')` do thiếu `createdAt` |
| `fromWeeklyProgressDto`, ngày có 165 kcal và không có macro | Ba macro có `consumedG` và `targetG` là `NaN` |
| `toMetaIds(['seafood'], createMetaLookup(meta BE không có code))` | Trả `[]`, mất ID dị ứng được chọn |

Các kết quả trên kiểm chứng lỗi tương thích mapper. Những lỗi liên quan transaction, cạnh tranh DB, middleware và nhà cung cấp AI/thanh toán được xác định từ code; cần kiểm thử tích hợp sau khi triển khai sửa. Báo cáo không khẳng định backend đang deploy có cùng phiên bản repo.

## 10. Tài liệu nguồn

Các mã tham chiếu như `[F-NUT]`, `[B-DIARY]` ở từng phát hiện là liên kết tới file mã nguồn tương ứng. Tài liệu dự án được dùng để xác định nghiệp vụ và phạm vi:

- [Overview V1](SmartMeal_Overview.md), [Overview V2](SmartMeal_Overview_V2.md), [API Contract hiện tại](SmartMeal_API_Contract.md).
- [Business rules](../frontend/SmartMealMobile/docs/business_rule.md), [kiến trúc frontend](../frontend/SmartMealMobile/docs/structure_system.md), [tech stack](../frontend/SmartMealMobile/docs/tech_stack.md).
- [Thiết kế UI](../frontend/SmartMealMobile/docs/design.md), [tiến độ UI](../frontend/SmartMealMobile/docs/ui-progress.md).
- [Kế hoạch nối API Phần 1](../frontend/SmartMealMobile/docs/fetch-api/part1_foundation_core.md), [Phần 2](../frontend/SmartMealMobile/docs/fetch-api/part2_content_smart.md).

[F-AUTH]: ../frontend/SmartMealMobile/src/features/auth/services/authService.api.ts
[F-TOKEN]: ../frontend/SmartMealMobile/src/services/api/interceptors.ts
[F-LOGIN]: ../frontend/SmartMealMobile/src/features/auth/screens/LoginScreen.tsx
[F-DELETE]: ../frontend/SmartMealMobile/src/features/profile/screens/DeleteDataScreen.tsx
[F-HEALTH]: ../frontend/SmartMealMobile/src/features/health/services/healthProfileService.api.ts
[F-HMAP]: ../frontend/SmartMealMobile/src/features/health/services/health.mapper.ts
[F-META]: ../frontend/SmartMealMobile/src/features/health/services/metaLookup.ts
[F-NUT]: ../frontend/SmartMealMobile/src/features/nutrition/services/nutritionService.api.ts
[F-NMAP]: ../frontend/SmartMealMobile/src/features/nutrition/services/nutrition.mapper.ts
[F-WATER]: ../frontend/SmartMealMobile/src/features/gamification/services/waterService.api.ts
[F-PREMIUM]: ../frontend/SmartMealMobile/src/features/premium/services/premiumService.api.ts
[F-AI]: ../frontend/SmartMealMobile/src/features/ai/services/aiService.api.ts
[F-AIMAP]: ../frontend/SmartMealMobile/src/features/ai/services/ai.mapper.ts
[F-QUOTA]: ../frontend/SmartMealMobile/src/features/ai/hooks/useAiQuota.ts
[F-SCAN]: ../frontend/SmartMealMobile/src/features/scanner/services/scannerService.api.ts
[F-SCANHOOK]: ../frontend/SmartMealMobile/src/features/scanner/hooks/useScanner.ts
[F-RECIPE]: ../frontend/SmartMealMobile/src/features/recipes/services/recipeService.ts
[F-RMAP]: ../frontend/SmartMealMobile/src/features/recipes/services/recipeMapper.ts
[F-FAV]: ../frontend/SmartMealMobile/src/features/recipes/screens/FavoritesScreen.tsx
[F-CREATECOL]: ../frontend/SmartMealMobile/src/features/recipes/screens/CreateCollectionScreen.tsx
[F-COL]: ../frontend/SmartMealMobile/src/features/recipes/screens/CollectionDetailScreen.tsx
[F-SLOT]: ../frontend/SmartMealMobile/src/features/meal-planner/screens/SlotPickerScreen.tsx
[F-PLAN]: ../frontend/SmartMealMobile/src/features/meal-planner/services/mealPlannerService.ts
[F-GRO]: ../frontend/SmartMealMobile/src/features/grocery/services/groceryService.ts
[F-DASH]: ../frontend/SmartMealMobile/src/features/dashboard/services/dashboardService.ts
[F-SYNC]: ../frontend/SmartMealMobile/src/features/nutrition/services/healthSyncService.api.ts
[F-SYNC-MAP]: ../frontend/SmartMealMobile/src/features/nutrition/services/healthSync.mapper.ts
[F-HCONNECT]: ../frontend/SmartMealMobile/src/features/profile/services/healthConnectService.api.ts
[F-REMINDERS]: ../frontend/SmartMealMobile/src/features/profile/services/remindersService.ts
[F-NOTIFICATIONS]: ../frontend/SmartMealMobile/src/features/profile/services/notificationsService.ts
[F-GAM]: ../frontend/SmartMealMobile/src/features/gamification/services/gamificationService.api.ts
[F-CHALLENGE]: ../frontend/SmartMealMobile/src/features/gamification/services/challengeService.api.ts
[F-BADGE]: ../frontend/SmartMealMobile/src/features/gamification/services/badgeService.ts
[F-XP]: ../frontend/SmartMealMobile/src/features/gamification/services/xpLedger.ts
[F-ENV]: ../frontend/SmartMealMobile/src/config/env.ts
[F-OFFLINE]: ../frontend/SmartMealMobile/src/features/nutrition/state/offlineSyncStore.ts
[B-PROGRAM]: ../backend/SmartMeal.API/Program.cs
[B-AUTH]: ../backend/SmartMeal.API/Controllers/AuthController.cs
[B-HEALTH]: ../backend/SmartMeal.API/Controllers/HealthProfileController.cs
[B-FOODS]: ../backend/SmartMeal.API/Controllers/FoodsController.cs
[B-DIARY]: ../backend/SmartMeal.API/Controllers/NutritionDiaryController.cs
[B-RECIPE]: ../backend/SmartMeal.API/Controllers/RecipeController.cs
[B-AI]: ../backend/SmartMeal.API/Controllers/AiController.cs
[B-SUB]: ../backend/SmartMeal.API/Controllers/SubscriptionController.cs
[B-AUTH-DTO]: ../backend/SmartMeal.Application/DTOs/Auth/AuthDTOs.cs
[B-HEALTH-DTO]: ../backend/SmartMeal.Application/DTOs/Health/HealthProfileDTOs.cs
[B-FOOD-DTO]: ../backend/SmartMeal.Application/DTOs/Foods/FoodDTOs.cs
[B-DIARY-DTO]: ../backend/SmartMeal.Application/DTOs/Diary/DiaryDTOs.cs
[B-WATER-DTO]: ../backend/SmartMeal.Application/DTOs/Diary/WaterDTOs.cs
[B-SYNC-DTO]: ../backend/SmartMeal.Application/DTOs/HealthSync/HealthSyncDTOs.cs
[B-AI-DTO]: ../backend/SmartMeal.Application/DTOs/AI/AiDTOs.cs
[B-RECIPE-DTO]: ../backend/SmartMeal.Application/DTOs/Recipes/RecipeDTOs.cs
[B-COL-DTO]: ../backend/SmartMeal.Application/DTOs/Recipes/CollectionsAndFavoritesDTOs.cs
[B-PLAN-DTO]: ../backend/SmartMeal.Application/DTOs/MealPlanner/MealPlannerDTOs.cs
[B-GRO-DTO]: ../backend/SmartMeal.Application/DTOs/Grocery/GroceryDTOs.cs
[B-GAM-DTO]: ../backend/SmartMeal.Application/DTOs/Gamification/GamificationDTOs.cs
[B-AUTH-SVC]: ../backend/SmartMeal.Infrastructure/Services/AuthService.cs
[B-FOOD-SVC]: ../backend/SmartMeal.Infrastructure/Services/FoodService.cs
[B-DIARY-SVC]: ../backend/SmartMeal.Infrastructure/Services/NutritionDiaryService.cs
[B-RECIPE-SVC]: ../backend/SmartMeal.Infrastructure/Services/RecipeService.cs
[B-PLAN-SVC]: ../backend/SmartMeal.Infrastructure/Services/MealPlannerService.cs
[B-GRO-SVC]: ../backend/SmartMeal.Infrastructure/Services/GroceryService.cs
[B-SYNC-SVC]: ../backend/SmartMeal.Infrastructure/Services/HealthSyncService.cs
[B-AI-SVC]: ../backend/SmartMeal.Infrastructure/Services/GeminiAiVisionService.cs
[B-SUB-SVC]: ../backend/SmartMeal.Infrastructure/Services/SubscriptionService.cs
[B-GAM-SVC]: ../backend/SmartMeal.Infrastructure/Services/GamificationService.cs
[B-DB]: ../backend/SmartMeal.Infrastructure/Data/ApplicationDbContext.cs
[B-SEED]: ../backend/SmartMeal.Infrastructure/Data/DbInitializer.cs
