# SmartMeal Mobile — Nối API thật · Phần 1/2: Nền tảng & luồng cốt lõi

| | |
|---|---|
| Đối tượng đọc | Dev FE (Expo/React Native) phụ trách Phần 1; người phụ trách BE đọc §12 |
| Phạm vi | Hạ tầng gọi API dùng chung + `auth`, `health` (+ meta), `nutrition`, `dashboard`, `profile`, nước uống |
| Phần còn lại | [Phần 2 — Nội dung & thông minh](./part2_content_smart.md) |
| Nguồn sự thật | **Code BE**: `backend/SmartMeal.API/Controllers/*`, `backend/SmartMeal.Application/DTOs/*`, `backend/SmartMeal.Infrastructure/Services/*`. **Không** dùng `docs/SmartMeal_API_Contract.md` làm chuẩn (đã cũ, xem §1.2) |
| Đối chiếu với | `main` @ `6370a62` · 2026-10-02 · chưa chạy BE thật để kiểm chứng — chỗ nào suy ra từ code mà chưa chạy thử đều ghi rõ "chưa kiểm chứng" |
| Trạng thái | **Đã triển khai** ở nhánh `feat/fetch-api-part1` (2026-10-03). Chỗ code khác với tài liệu này và các phát hiện khi làm được ghi ở [§16](#16-trạng-thái-triển-khai-nhánh-featfetch-api-part1); §1–§15 giữ nguyên làm đặc tả gốc |

---

## 0. Đọc trước

### 0.1 Chia 2 phần

Chia theo luồng phụ thuộc để 2 dev làm song song, không đụng file của nhau.

| | Phần 1 (file này) | Phần 2 |
|---|---|---|
| Chủ đề | Hạ tầng API + người dùng & nhật ký | Nội dung & tính năng thông minh |
| Feature FE | `auth`, `health`, `nutrition`, `dashboard`, `profile`, nước uống (`gamification/waterService`) | `recipes` (+ yêu thích/bộ sưu tập), `meal-planner`, `grocery`, `ai` + `scanner`, `gamification` (pet/challenge/badge), `premium` |
| Endpoint BE | 21 | 29 |
| Quan hệ | **§4 (nền tảng) phải merge trước** khi Phần 2 viết code gọi API | Dùng `apiClient`, `ENDPOINTS`, `unwrap`, hồ sơ dị ứng từ Phần 1 |

### 0.2 Ký hiệu trạng thái

| | Ý nghĩa |
|---|---|
| 🟢 | Nối được ngay — BE có endpoint, map 1-1 hoặc adapter đơn giản |
| 🟡 | Nối được nhưng cần adapter/quy ước/quyết định — đọc cột ghi chú |
| 🔴 | BE chưa có (hoặc chưa an toàn để dùng) — giữ mock, ghi vào §13, gửi §12 cho BE |

### 0.3 Quy tắc kiến trúc áp dụng (không đổi so với CLAUDE.md)

- `Screen → Hook → Feature Service → apiClient → BE`. Screen/Hook **không** import `axios`, không import `mocks/`.
- **Chữ ký hàm của `xxxService` giữ nguyên** để hook/screen không phải sửa. Chỗ nào bắt buộc đổi chữ ký sẽ ghi "đổi chữ ký" trong bảng.
- Mọi chuyển đổi DTO ↔ type FE nằm trong `features/<f>/services/<f>.mapper.ts` (hàm thuần, có unit test). DTO của BE không lọt lên hook/screen.
- Không hard-code URL/route/màu; URL từ `src/config/env.ts`, route từ `ENDPOINTS` (§4).
- Server state qua TanStack Query; token chỉ ở `expo-secure-store`, **không** vào Zustand/AsyncStorage.
- Loading / Empty / Error vẫn bắt buộc. Ở chế độ API thật, `MOCK_SCENARIO` không còn tác dụng — xem cách kiểm thử các state ở §14.

### 0.4 Quyết định cần chốt trước khi code

| # | Vấn đề | Đề xuất |
|---|---|---|
| D1 | Giữ mock song song hay xóa hẳn khi nối API | Giữ qua pattern "mock fallback" (§4.9) tới hết nghiệm thu, rồi xóa |
| D2 | OTP khi đăng ký (BE không có) | Bỏ qua bước OTP khi gọi BE thật; giữ `OtpScreen` cho luồng quên mật khẩu (mock) |
| D3 | Mục tiêu "Tăng cân": FE +300 kcal, BE `GainWeight` +400 / `GainMuscle` +300 | Gửi `GainWeight`; **hiển thị số của BE** (BR-022); nhờ PO/BE xác nhận con số |
| D4 | Giới tính "Khác": BE chỉ có công thức Nam/Nữ, `Other` rơi vào công thức nữ | Gửi `Other` nguyên văn, ghi nhận lệch số liệu, hỏi PO (P1-BE-04) |
| D5 | Tìm món (FoodSearch) chỉ từ `/foods` (12 nguyên liệu seed) hay gộp cả `/recipes` | Giai đoạn 1 chỉ `/foods`; yêu cầu BE seed thêm món ăn (P1-BE-08) |
| D6 | Nước uống: BE chỉ có `POST` ghi, chưa có `GET`/`DELETE` | Giữ nguyên mock tới khi BE bổ sung — **không** nối riêng `POST` (sẽ lệch dữ liệu) |

---

## 1. Hiện trạng & chênh lệch

### 1.1 FE

- UI mock đã dựng gần đủ (xem `docs/ui-progress.md`); mọi `features/<f>/services/*` đang trả dữ liệu in-memory, đánh dấu `// TODO: replace mock with real API`.
- **Chưa có**: `src/services/api/*` (client/interceptors/endpoints), `src/services/storage/secureStorage.ts`, `.env`/`app.config.ts`.
- `src/config/env.ts` đang để `apiBaseUrl: 'https://api.smartmeal.dev'` — placeholder, không phải BE thật.
- `authStore` chỉ giữ `{ id, fullName, email }`, không có token/`isPro`/`hasCompletedSurvey`; `App.tsx` dùng `new QueryClient()` mặc định (retry 3 lần kể cả lỗi 4xx).
- Đã cài sẵn: `axios`, `expo-secure-store`, `expo-constants`, `expo-web-browser`, `expo-camera`, `expo-image-picker`, `expo-av`, `@tanstack/react-query`, `zod`, `date-fns`. **Không cần cài thêm package** cho Phần 1.
- Nhiều store Zustand đang **seed dữ liệu giả** (`userProfileStore` "nam 172cm", `favoritesStore`, `premiumStore.transactions`, `xpLedger`). Khi nối API phải bỏ seed hoặc chỉ dùng khi `ENV.useMockApi`, nếu không user mới đăng ký sẽ thấy dữ liệu của người khác.

### 1.2 Contract (`docs/SmartMeal_API_Contract.md`) ↔ code BE

BE có **50 endpoint**. Contract lệch code ở các điểm sau — FE mock "khớp contract" nên **không** khớp BE thật:

| Contract ghi | Code BE thật |
|---|---|
| 14 dòng trạng thái "⏳ Chưa làm" (auth/profile, weight-log, weight-history, favorite, favorites, collections, water, health-sync, pet, streak, challenges, subscription plans, create-checkout-session, foods) | **Tất cả đã có code** |
| `POST /auth/google` body `{ idToken }` | Body `{ googleId, email, fullName, avatarUrl }`, **không verify** token (§12 P1-BE-01) |
| Auth response `{ token, user }` | Thêm `expiresAt`; `user` thêm `role`; `/auth/me` **không** có `createdAt` |
| Survey: `height, weight, targetWeight, dietGoal, activityLevel:"ModeratelyActive"`, `allergyIds` là GUID | `heightCm, currentWeightKg, targetWeightKg, goal, activityLevel:"Moderate"`, `allergyIds`/`medicalConditionIds` là **int** |
| Survey response `{ bmi, calorieGoal, targetCarbsGrams, …, waterGoalMl }` | `HealthProfileDto` phẳng: `dailyCaloriesTarget`, `dailyCarbsTargetGrams`…, `allergies: string[]`; **không có** `waterGoalMl` |
| `weight-log { weight, recordedAt }`; `weight-history?days=30` trả mảng | `{ weightKg, recordedAt }`; không có `days`; trả object `{ currentWeightKg, …, history[] }` |
| Diary log `{ date, portionGrams, carbs, protein, fat }` | `{ logDate, servingSize, unit, carbsGrams, fatGrams, proteinGrams, logMethod }` |
| Daily summary `{ caloriesConsumed, calorieGoal, waterIntakeMl, activeCaloriesBurned, meals:{ breakfast:[] } }` | `{ totalCalories, targetCalories, … , meals: MealGroup[] }`; **không** có nước/calo vận động |
| `GET /recipes` có `mealType, page, pageSize`; `RecipeDto.instructions` là mảng, `calories/carbs…` | Chỉ `search, tag, difficulty, maxCalories`, **không phân trang**; `instructions` là **string**; `caloriesPerServing…`, `prepTimeMinutes`, `cookTimeMinutes`, `isPremium` |
| `suggest-by-pantry { ingredients }` | `{ availableIngredients }` |
| Voice-log item `{ name }` | `{ foodName }` |
| Health-sync `{ stepCount, activeCaloriesBurned }` | Nhận cả `steps`/`stepCount` và `burnedCalories`/`activeCaloriesBurned`; có thêm `GET /health-sync/daily-summary` |
| `PATCH /grocery/items/{id}/check` (toggle) | **Bắt buộc body** `{ isChecked: boolean }` |
| — | Có trong code nhưng không có trong contract: `DELETE /mealplanner/{id}`, `GET /grocery`, `POST /grocery/items`, `DELETE /grocery/items/{id}`, `DELETE /grocery/clear-checked`, `GET /health-sync/daily-summary`, `GET /foods/{id}`, `POST /subscription/activate-mock`, alias `POST /healthprofile` và `/healthprofile/setup`, alias `/api/recipe` |

Đề xuất: cập nhật contract theo code (hoặc sinh từ Swagger `/swagger/v1/swagger.json`) — xem P1-BE-11.

### 1.3 Nhánh Git

`origin/feat/fetch-api` hiện **cũ hơn `main`** (Metro config và `package.json` đang lùi so với commit "fix run web"). Tạo nhánh làm việc mới từ `main`, đừng kế thừa nhánh đó nguyên trạng.

### 1.4 Chỗ FE đang đi vòng qua tầng service (phải sửa khi nối API)

Quét `src/` cho thấy một số Screen/`index.ts` **import thẳng mock hoặc hằng mock**, bỏ qua `Screen → Hook → Service`. Nếu chỉ sửa service thì các chỗ này vẫn hiện số liệu giả. Phần thuộc Phần 1:

| File | Đang làm | Khi nối API |
|---|---|---|
| `dashboard/screens/CalorieBudgetScreen.tsx` | Import `TODAY_ACTIVITY_CALORIES_BURNED_MOCK`, `ACTIVITY_CALORIE_SOURCES_MOCK`, `ACTIVITY_LOG_ENTRIES_MOCK` | Calo vận động → hook `useHealthSyncDaily(dateIso)` (§8). Khối "Nguồn vận động"/"Hoạt động được tính": BE chỉ có `sources: string[]`, không có danh sách hoạt động → giữ tĩnh/ẩn (🔴, §13) |
| `nutrition/index.ts` | `export * from './mocks/diary.mock'` → lộ `CURRENT_USER_DAILY_TARGET`, `TODAY_ACTIVITY_CALORIES_BURNED_MOCK` cho feature khác | Chuyển nơi dùng sang `useUserProfileStore.result.calorieTarget` / `useHealthSyncDaily`; bỏ re-export khi tắt mock. Nơi dùng ngoài Phần 1: `meal-planner/screens/PlannerRegenerateScreen.tsx` (Phần 2 — xem P2 §0.4) |
| `state/user/userProfileStore.ts` | Seed hồ sơ giả | Xem §6.5 |
| Nhiều screen `nutrition/*` | Import `todayIso`, type `FoodSearchFilter`/`NewMealLogInput` **từ `../services/nutritionService`** | Giữ nguyên các export phụ này khi tách file (xem cảnh báo ở §4.9) |

---

## 2. Bản đồ endpoint BE (50)

`Auth`: ✅ = cần JWT · ➖ = public · ◐ = public nhưng đọc JWT nếu có. Cột "§" trỏ tới phần mô tả chi tiết.

| # | Method + Path | Auth | Request → Response | § |
|---|---|---|---|---|
| 1 | `POST /auth/register` | ➖ | `RegisterRequest` → `AuthResponse` | P1 §5 |
| 2 | `POST /auth/login` | ➖ | `LoginRequest` → `AuthResponse` | P1 §5 |
| 3 | `POST /auth/google` | ➖ | `GoogleAuthRequest` → `AuthResponse` | P1 §5 |
| 4 | `GET /auth/me` | ✅ | → `UserDto` | P1 §5 |
| 5 | `PUT /auth/profile` | ✅ | `UpdateProfileRequest` → `UserDto` | P1 §9 |
| 6 | `POST /healthprofile/survey` (alias `/setup`, `/`) | ✅ | `HealthSurveyRequest` → `HealthProfileDto` | P1 §6 |
| 7 | `GET /healthprofile` | ✅ | → `HealthProfileDto` (404 nếu chưa khảo sát) | P1 §6 |
| 8 | `POST /healthprofile/weight-log` | ✅ | `WeightLogRequest` → `WeightPointDto` | P1 §9 |
| 9 | `GET /healthprofile/weight-history` | ✅ | → `WeightHistoryResponse` | P1 §9 |
| 10 | `GET /meta/allergies` | ➖ | → `MetaItem[]` | P1 §6 |
| 11 | `GET /meta/medical-conditions` | ➖ | → `MetaItem[]` | P1 §6 |
| 12 | `GET /meta/tags` | ➖ | → `MetaItem[]` | P1 §6, P2 §1 |
| 13 | `POST /nutritiondiary/log` | ✅ | `LogMealRequest` → `DiaryItemDto` | P1 §7 |
| 14 | `GET /nutritiondiary/daily?date=` | ✅ | → `DailyDiarySummaryDto` | P1 §7 |
| 15 | `GET /nutritiondiary/weekly-progress?startDate=` | ✅ | → `WeeklyProgressDto` | P1 §7 |
| 16 | `DELETE /nutritiondiary/items/{id}` | ✅ | → `boolean` | P1 §7 |
| 17 | `POST /nutritiondiary/water` | ✅ | `LogWaterRequest` → `WaterSummaryDto` | P1 §10 |
| 18 | `GET /foods?search&category&page&pageSize` | ➖ | → `PagedResult<FoodItemDto>` | P1 §7 |
| 19 | `GET /foods/{id}` | ➖ | → `FoodItemDto` | P1 §7 |
| 20 | `POST /health-sync/steps-and-calories` | ✅ | `SyncMetricsRequest` → `SyncMetricsResponse` | P1 §9 |
| 21 | `GET /health-sync/daily-summary?date=` | ✅ | → `DailyHealthSyncSummaryDto` | P1 §7, §8 |
| 22–29 | `recipes/*` (8 endpoint) | ➖/✅ | xem Phần 2 §1 | P2 |
| 30–33 | `mealplanner/*` (4) | ✅ | xem Phần 2 §2 | P2 |
| 34–39 | `grocery/*` (6) | ✅ | xem Phần 2 §3 | P2 |
| 40–43 | `ai/*` (4) | ➖/◐ | xem Phần 2 §4 | P2 |
| 44–47 | `gamification/*` (4) | ✅ | xem Phần 2 §5 | P2 |
| 48–50 | `subscription/*` (3) | ➖/✅ | xem Phần 2 §6 | P2 |

---

## 3. Quy ước giao tiếp với BE

### 3.1 Base URL

Mọi route nằm dưới `/api`; ASP.NET không phân biệt hoa/thường (`/api/nutritiondiary` = `/api/NutritionDiary`). CORS đang `AllowAnyOrigin` → chạy được cả trên web (`npx expo start --web`).

| Môi trường chạy app | `EXPO_PUBLIC_API_URL` |
|---|---|
| Android emulator | `http://10.0.2.2:5000/api` |
| iOS simulator / web | `http://localhost:5000/api` |
| Điện thoại thật (Expo Go, cùng Wi-Fi) | `http://<IP-LAN-máy-tính>:5000/api` |

Điện thoại thật cần BE nghe trên mọi interface: `dotnet run --launch-profile http` chỉ bind `localhost:5000` (xem `launchSettings.json`), nên chạy `dotnet run --launch-profile http --urls http://0.0.0.0:5000` **hoặc** `docker compose up` (container đã nghe `0.0.0.0`, map `5000:8080`). Windows Firewall phải cho phép cổng 5000 vào. iOS có thể hỏi quyền Local Network lần đầu.

Cách chạy BE + Postgres: xem `README.md` gốc, mục 3 (`docker compose up -d postgres pgadmin` rồi `dotnet run`; BE tự migrate và seed khi khởi động). Swagger để thử tay: `http://localhost:5000/swagger`. File `SmartMeal.API.http` trong repo chỉ là template mặc định (weatherforecast), không dùng được.

### 3.2 Envelope

Mọi endpoint do controller trả đều bọc:

```json
{ "success": true, "message": "…tiếng Việt…", "data": { }, "errors": null }
```

`message` là câu tiếng Việt hiển thị được thẳng lên UI. `errors` là `string[]` hoặc `null`. **Luôn kiểm tra `success`, không chỉ HTTP status** — có endpoint trả HTTP 200 kèm `success:false` (`POST /recipes/suggest-by-pantry` khi danh sách rỗng, `POST /subscription/activate-mock` khi không thấy user).

### 3.3 Lỗi — không phải lúc nào cũng có envelope

| Tình huống | HTTP | Body |
|---|---|---|
| Sai email/mật khẩu (`/auth/login`) | 401 | envelope, `message: "Email hoặc mật khẩu không chính xác."` |
| Email trùng (`/auth/register`) | 400 | envelope, `message: "Email đã được sử dụng."` |
| Thiếu/sai/hết hạn JWT trên endpoint `[Authorize]` | 401 | **rỗng** (middleware, không envelope) |
| Lỗi nghiệp vụ (không tìm thấy bản ghi, chưa khảo sát…) | 400/404 | envelope |
| Lỗi binding (`?date=abc`, JSON hỏng) | 400 | `ProblemDetails`: `{ title, status, errors: { field: [msg] }, traceId }` |
| `{id}` không phải GUID (ràng buộc `:guid`) | 404 | **rỗng** |
| Gửi JSON vào endpoint `multipart/form-data` (`/ai/snap-and-track`, `/ai/fridge-scanner`) | 415 | rỗng/ProblemDetails |
| Lỗi chưa bắt (không có exception middleware) | 500 | rỗng hoặc trang lỗi dev |

→ Bộ chuẩn hóa lỗi ở §4.4 phải xử lý cả 3 dạng body (envelope, ProblemDetails, rỗng).

### 3.4 Xác thực

- `Authorization: Bearer <token>`. JWT sống **30 ngày**, `expiresAt` (UTC) trả kèm. **Không có refresh token, không có endpoint logout** → đăng xuất chỉ là xóa token ở máy; 401 trên endpoint cần token = phải đăng nhập lại.
- Claim `isPro` trong token sẽ **cũ** sau khi nâng cấp — đừng đọc từ token; lấy `isPro` từ `GET /auth/me`.
- Endpoint ◐ (`/ai/snap-and-track`, `/ai/check-safety`) vẫn hoạt động khi không có token, chỉ mất phần cảnh báo dị ứng cá nhân hóa.

### 3.5 Ngày giờ & múi giờ

- `DateOnly` ↔ `"yyyy-MM-dd"`. `DateTime` ↔ ISO 8601 UTC (`"2026-09-26T08:00:00Z"`).
- BE lấy "hôm nay" theo **UTC** khi thiếu tham số (`date`, `startDate`…). Việt Nam là UTC+7 nên từ 00:00–07:00 sẽ lệch ngày → **luôn gửi ngày tường minh** theo giờ máy (`format(new Date(), 'yyyy-MM-dd')` — đã có `todayIso()`).
- Khi gửi `DateTime` (vd. `recordedAt`) hãy gửi `new Date().toISOString()` (có `Z`). Không gửi chuỗi chỉ có ngày vào trường `DateTime` — chưa kiểm chứng, nhưng Npgsql có thể từ chối `DateTime` kiểu Unspecified khi ghi `timestamptz`.

### 3.6 Casing & giá trị enum

- JSON **camelCase**; từ viết tắt hạ hết: `BMI→bmi`, `BMR→bmr`, `TDEE→tdee`, `BMICategory→bmiCategory`.
- BE coi enum là **string tự do, không validate** (gõ sai vẫn lưu). Phải gửi đúng PascalCase — vd. gửi `breakfast` thay vì `Breakfast` sẽ tạo bản ghi nhật ký riêng và món đó có thể không hiện trong `/nutritiondiary/daily`:

| FE | BE |
|---|---|
| `MealType` `breakfast/lunch/dinner/snack` | `Breakfast/Lunch/Dinner/Snack` |
| `Gender` `male/female/other` | `Male/Female/Other` |
| `ActivityLevel` `sedentary/light/moderate/active/veryActive` | `Sedentary/Light/Moderate/Active/VeryActive` |
| `HealthGoal` `lose/maintain/gain` | `LoseWeight/Maintain/GainWeight` (+ `GainMuscle`, FE chưa có) |
| `FoodLogSource` `manual/database/ai` | `logMethod`: `Manual/AiImage/Voice/Barcode` |
| `BillingPlanId` `monthly/yearly` | `PRO_MONTHLY/PRO_YEARLY` |
| `PaymentMethodId` `vnpay/momo/card` | `VNPAY/MOMO/STRIPE` |

### 3.7 ID, phân trang, null, validate

- Entity dùng **GUID string**; `allergy`/`medicalCondition`/`tag` dùng **int**. ID dạng slug trong mock (`'salad-uc-ga'`, `'pho-bo-tai'`) sẽ không còn tồn tại.
- Chỉ `GET /foods` phân trang: `{ items, page, pageSize, totalCount, totalPages }`, `pageSize` 1–100 (ngoài khoảng → 20). Các danh sách khác trả toàn bộ.
- BE trả `null` tường minh cho field rỗng; type FE phải cho phép (`string | null`).
- BE **gần như không validate** (độ dài mật khẩu, định dạng email, khoảng giá trị số). zod ở FE là chốt chặn duy nhất — giữ nguyên rule hiện có.

---

## 4. Nền tảng FE — PR "Bước 0" (merge trước khi Phần 2 viết code)

### 4.1 File cần tạo/sửa

Đường dẫn tính từ `frontend/SmartMealMobile/`.

```
.env.example                              # mới (commit); .env thật không commit — .gitignore gốc đã chặn
App.tsx                                   # dùng queryClient chung, gắn navigationRef, gọi bootstrap session
src/config/env.ts, api.ts                 # sửa
src/constants/storage.ts                  # thêm khóa SecureStore
src/types/api.ts                          # mới: ApiEnvelope, PagedResult
src/types/meal.types.ts                   # thêm toApiMealType / fromApiMealType
src/services/api/client.ts                # mới
src/services/api/interceptors.ts          # mới
src/services/api/endpoints.ts             # mới — khai báo ĐỦ 50 endpoint ngay từ PR này (tránh Phần 2 sửa cùng file)
src/services/api/errors.ts                # mới: ApiError + toApiError
src/services/api/unwrap.ts                # mới
src/services/api/queryClient.ts           # mới
src/services/api/index.ts                 # re-export
src/services/storage/secureStorage.ts     # mới: tokenStorage
src/state/auth/authStore.ts               # sửa (§4.7)
src/navigation/AppNavigator.tsx           # sửa: bootstrapping / onboarding
src/navigation/navigationRef.ts           # mới: điều hướng từ ngoài React tree (hết phiên → StateSession)
src/features/auth/services/sessionService.ts   # mới: restore / expire / logout
__tests__/api/                            # unwrap, toApiError, mapper
```

### 4.2 Env & base URL

`.env` (không commit) — đổi xong phải restart Metro: `npx expo start --clear`.

```bash
EXPO_PUBLIC_API_URL=http://localhost:5000/api
EXPO_PUBLIC_USE_MOCK_API=false
EXPO_PUBLIC_API_TIMEOUT_MS=15000
EXPO_PUBLIC_AI_TIMEOUT_MS=60000
```

```ts
// src/config/env.ts (ví dụ)
export type AppEnv = 'development' | 'staging' | 'production';

export const ENV = {
  appEnv: (process.env.EXPO_PUBLIC_APP_ENV ?? 'development') as AppEnv,
  // Phải viết nguyên văn process.env.EXPO_PUBLIC_* — Metro chỉ inline được dạng này
  // (không destructure, không dùng key động).
  apiBaseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api',
  apiTimeoutMs: Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS ?? 15000),
  aiTimeoutMs: Number(process.env.EXPO_PUBLIC_AI_TIMEOUT_MS ?? 60000), // Gemini có thể mất 5–20s
  useMockApi: process.env.EXPO_PUBLIC_USE_MOCK_API === 'true',
} as const;
```

`API_CONFIG` thêm `aiTimeout: ENV.aiTimeoutMs` để các endpoint `/ai/*` ghi đè timeout theo từng request.

### 4.3 `client.ts`, `interceptors.ts`, `endpoints.ts`

```ts
// src/services/api/client.ts
import axios from 'axios';
import { API_CONFIG } from '@/config/api';

export const apiClient = axios.create({
  baseURL: API_CONFIG.baseURL, // đã gồm /api → ENDPOINTS chỉ chứa '/auth/login'…
  timeout: API_CONFIG.timeout,
  headers: { Accept: 'application/json' },
});
```

```ts
// src/services/api/interceptors.ts (ví dụ)
import type { AxiosError } from 'axios';
import { tokenStorage } from '@/services/storage/secureStorage';
import { apiClient } from './client';
import { toApiError } from './errors';

let onUnauthorized: () => void = () => {};
// Đăng ký từ App.tsx để tránh import vòng (interceptor ↔ authStore ↔ queryClient).
export const setUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler;
};

const AUTH_PUBLIC_PATHS = ['/auth/login', '/auth/register', '/auth/google'];

apiClient.interceptors.request.use(async config => {
  const token = await tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  response => response,
  (error: AxiosError) => {
    const url = error.config?.url ?? '';
    const hadToken = Boolean(error.config?.headers?.Authorization);
    const isAuthPublic = AUTH_PUBLIC_PATHS.some(path => url.endsWith(path));
    // 401 ở /auth/login = sai mật khẩu, KHÔNG phải hết phiên. Guest (không token) cũng không logout.
    if (error.response?.status === 401 && hadToken && !isAuthPublic) onUnauthorized();
    return Promise.reject(toApiError(error));
  },
);
```

`endpoints.ts` khai báo **đủ 50 endpoint** trong PR nền tảng và chốt tên để hai phần dùng chung (Phần 2 chỉ import, không sửa):

```ts
// src/services/api/endpoints.ts
export const ENDPOINTS = {
  auth: { register: '/auth/register', login: '/auth/login', google: '/auth/google', me: '/auth/me', profile: '/auth/profile' },
  healthProfile: { base: '/healthprofile', survey: '/healthprofile/survey', weightLog: '/healthprofile/weight-log', weightHistory: '/healthprofile/weight-history' },
  meta: { allergies: '/meta/allergies', medicalConditions: '/meta/medical-conditions', tags: '/meta/tags' },
  nutritionDiary: {
    log: '/nutritiondiary/log', daily: '/nutritiondiary/daily', weeklyProgress: '/nutritiondiary/weekly-progress',
    item: (id: string) => `/nutritiondiary/items/${id}`, water: '/nutritiondiary/water',
  },
  foods: { list: '/foods', byId: (id: string) => `/foods/${id}` },
  healthSync: { stepsAndCalories: '/health-sync/steps-and-calories', dailySummary: '/health-sync/daily-summary' },
  recipes: {
    list: '/recipes', byId: (id: string) => `/recipes/${id}`, suggestByPantry: '/recipes/suggest-by-pantry',
    favorite: (id: string) => `/recipes/${id}/favorite`, favorites: '/recipes/favorites',
    collections: '/recipes/collections', collectionItems: (id: string) => `/recipes/collections/${id}/items`,
  },
  mealPlanner: { week: '/mealplanner/week', assign: '/mealplanner/assign', byId: (id: string) => `/mealplanner/${id}`, autoGenerate: '/mealplanner/auto-generate' },
  grocery: {
    list: '/grocery', generateFromPlan: '/grocery/generate-from-plan', items: '/grocery/items',
    itemCheck: (id: string) => `/grocery/items/${id}/check`, item: (id: string) => `/grocery/items/${id}`, clearChecked: '/grocery/clear-checked',
  },
  ai: { snapAndTrack: '/ai/snap-and-track', fridgeScanner: '/ai/fridge-scanner', voiceLog: '/ai/voice-log', checkSafety: '/ai/check-safety' },
  gamification: { pet: '/gamification/pet', streak: '/gamification/streak', challenges: '/gamification/challenges', joinChallenge: (id: string) => `/gamification/challenges/${id}/join` },
  subscription: { plans: '/subscription/plans', createCheckoutSession: '/subscription/create-checkout-session', activateMock: '/subscription/activate-mock' },
} as const;
```

### 4.4 `errors.ts` + `unwrap.ts`

`ApiError.message` **phải là câu tiếng Việt thân thiện** — các screen hiện tại đã hiển thị `error.message` (vd. `loginMutation.error.message`) nên giữ được nguyên UI.

```ts
// src/services/api/errors.ts (ví dụ)
export type ApiErrorCode =
  | 'NETWORK' | 'TIMEOUT' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND'
  | 'VALIDATION' | 'BUSINESS' | 'SERVER' | 'UNKNOWN';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: ApiErrorCode,
    readonly status: number | null = null,
    readonly details: string[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

`toApiError(error: unknown): ApiError` — thứ tự xử lý:

1. Đã là `ApiError` → trả nguyên.
2. Không có `response`: `ECONNABORTED`/`ETIMEDOUT` → `TIMEOUT` ("Máy chủ phản hồi quá lâu, vui lòng thử lại."); còn lại → `NETWORK` ("Không kết nối được máy chủ. Kiểm tra mạng và thử lại.").
3. Body có `success === false` (envelope) → dùng `message` + `errors`; `code` theo status (400→`BUSINESS`, 404→`NOT_FOUND`, 401→`UNAUTHORIZED`).
4. Body là ProblemDetails (`errors` là object) → `VALIDATION`, gom các message vào `details`.
5. Body rỗng → theo status: 401 "Phiên đăng nhập đã hết hạn.", 403 "Bạn không có quyền thực hiện thao tác này.", 404 "Không tìm thấy dữ liệu.", ≥500 "Máy chủ gặp sự cố, vui lòng thử lại sau."

```ts
// src/services/api/unwrap.ts (ví dụ)
export function unwrap<T>(response: AxiosResponse<ApiEnvelope<T>>): T {
  const body = response.data;
  if (!body.success) {
    throw new ApiError(body.message || 'Thao tác không thành công.', 'BUSINESS', response.status, body.errors ?? []);
  }
  return body.data as T;
}
```

Cách dùng trong service: `const dto = unwrap(await apiClient.get<ApiEnvelope<DailySummaryDto>>(ENDPOINTS.nutritionDiary.daily, { params: { date } }));`

### 4.5 Lưu token — `secureStorage.ts`

- Dùng `expo-secure-store` (khóa hợp lệ: chữ/số/`.`/`-`/`_`, vd. `auth.accessToken`). Giữ bản **cache trong bộ nhớ** để interceptor không đọc SecureStore ở mọi request.
- `expo-secure-store` **không chạy trên web** (đang chạy `expo start --web` sau commit "fix run web") → nhánh `Platform.OS === 'web'` fallback sang `storageService` (AsyncStorage/localStorage), ghi chú rõ "chỉ để dev".
- API: `tokenStorage.get() / set(token) / clear()`.

### 4.6 `queryClient.ts`

Chuyển `new QueryClient()` ra module riêng (để interceptor/logout `clear()` được) với mặc định hợp lý:

```ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Chỉ retry lỗi hạ tầng. 4xx/lỗi nghiệp vụ retry là vô nghĩa.
      retry: (failureCount, error) =>
        error instanceof ApiError && ['NETWORK', 'TIMEOUT', 'SERVER'].includes(error.code)
          ? failureCount < 2
          : false,
    },
    mutations: { retry: false },
  },
});
```

`staleTime` gợi ý theo loại dữ liệu: meta 24h · recipes/foods 5 phút · diary/dashboard 30s (mặc định) — khai ở từng hook khi cần.

### 4.7 Phiên đăng nhập (session)

**`authStore` thay đổi**

- `AuthUser` thêm `avatarUrl?: string | null`, `isPro: boolean`, `role: string`, `hasCompletedSurvey: boolean`.
- `pendingUser` đổi thành `AuthUser | null` (cần đủ `id`).
- Thêm `isBootstrapping: boolean` (mặc định `true`).
- Token **không** nằm trong store (xem §4.5).

**Máy trạng thái điều hướng** (`AppNavigator`)

| Trạng thái | Điều kiện | Hiển thị |
|---|---|---|
| bootstrapping | đang đọc token + `GET /auth/me` | giữ splash (return `null`) |
| bootstrap lỗi mạng | có token nhưng `/auth/me` NETWORK/TIMEOUT | màn lỗi + nút "Thử lại" — **không** logout, **không** xóa token |
| unauthenticated | không có token, hoặc `/auth/me` 401 (xóa token) | `AuthNavigator` (Welcome/Login) |
| onboarding | có token, `hasCompletedSurvey = false` | `AuthNavigator`, `initialRouteName = HEALTH_PROFILE_BASIC_INFO` |
| authenticated | token + `hasCompletedSurvey = true` | `MainNavigator` |
| guest | `isGuest` | `MainNavigator` (tab Khám phá) — không gọi API cần token |

`AppNavigator` chỉ render `MainNavigator` khi `isGuest` **hoặc** (`isAuthenticated` **và** `user.hasCompletedSurvey`); mọi trường hợp còn lại render `AuthNavigator` (hiện đang là `isAuthenticated || isGuest`).

**Khởi động app** (`sessionService.restoreSession()`): đọc token → `GET /auth/me` → nếu `hasCompletedSurvey` thì `GET /healthprofile` rồi hydrate `userProfileStore` (§6.5) → `isBootstrapping=false`.

**Hết phiên** (`setUnauthorizedHandler` — chỉ chạy khi request **có token** trả 401 và `authStore.isAuthenticated`): `tokenStorage.clear()` + `queryClient.cancelQueries()` + `queryClient.clear()`, rồi **điều hướng sang `StateSession` với `variant: 'expired'`** qua một `navigationRef` (file mới `src/navigation/navigationRef.ts` = `createNavigationContainerRef`, gắn `ref` vào `NavigationContainer` ở `App.tsx`).

- **Không** gọi `logout()` ngay trong handler: khi `isAuthenticated=false`, `AppNavigator` unmount Main nên người dùng không thấy thông báo. `StateSessionScreen` đã tự gọi `logout('expired')` khi bấm "Đăng nhập lại" và `AuthNavigator` đã tự mở thẳng Login khi `lastExitReason = 'expired'`.
- 401 xảy ra ở bước restore lúc khởi động (chưa vào Main): `restoreSession()` tự xóa token rồi `logout('expired')` để mở Login; handler bỏ qua vì `isAuthenticated=false`.
- BE không có khái niệm khóa tài khoản (không trả 423) → variant `'locked'` của `StateSession` chỉ còn là mock (§13).

**Đăng xuất chủ động**: `tokenStorage.clear()` + `queryClient.clear()` + `resetUserData()` (registry các store mock cục bộ) + `authStore.logout()`.

### 4.8 Lớp mapping

Mỗi feature thêm 2 file cạnh type hiện có, đặt tên theo `docs/structure_system.md` §19:

```
features/<f>/types/<f>.api.types.ts      # DTO của BE (xem Phụ lục A) — chỉ service/mapper import
features/<f>/services/<f>.mapper.ts      # hàm thuần: DTO ↔ type FE
```

Quy tắc: service = gọi `apiClient` → `unwrap` → mapper → trả type FE. Hook/screen không biết DTO. Mapper không gọi API, không đọc store (nhận dependency qua tham số) để test bằng fixture JSON thật copy từ Swagger.

### 4.9 Pattern "mock fallback" (đề xuất cho D1)

Giữ code mock cũ để demo không cần BE và để nối **từng hàm một**:

```ts
// features/nutrition/services/nutritionService.mock.ts  ← đổi tên từ nutritionService.ts hiện tại (đổi export thành nutritionMockService)
// features/nutrition/services/nutritionService.api.ts   ← chỉ chứa các hàm ĐÃ nối API
// features/nutrition/services/nutritionService.ts       ← bộ chọn
import { ENV } from '@/config/env';
import { nutritionApiService } from './nutritionService.api';
import { nutritionMockService } from './nutritionService.mock';

export const nutritionService = ENV.useMockApi
  ? nutritionMockService
  : { ...nutritionMockService, ...nutritionApiService }; // hàm chưa nối API tự rơi về mock
```

- Hook/screen vẫn import `nutritionService` như cũ → không phải sửa.
- **Giữ nguyên mọi export phụ** của file `xxxService.ts` cũ: nhiều screen import chúng từ chính đường dẫn đó (`todayIso`, type `FoodSearchFilter`/`NewMealLogInput` ở `nutritionService`; lớp lỗi `AiRecognitionFailedError` ở `aiService`; `CameraPermissionDeniedError` ở `scannerService`; `currentWeekStartIso`/`shiftWeek` ở `mealPlannerService`; hằng `CUP_ML` ở `waterService`) và `features/<f>/index.ts` đang `export *` từ file này. Khi tách, hoặc để các export phụ lại trong `xxxService.ts`, hoặc re-export từ đó — đừng bắt screen đổi import.
- Nối theo **nhóm hàm cùng một tài nguyên** (đọc + ghi + xóa) trong cùng PR — đừng để ghi lên BE mà đọc lại từ mock in-memory (hoặc ngược lại), dữ liệu sẽ lệch nhau.
- Hàm chưa nối (🔴) tự dùng mock; liệt kê trong §13 để không bị quên. Gợi ý thêm `console.warn` một lần ở chế độ dev khi một hàm rơi về mock.
- Khi nối xong cả Phần 1 + 2 và nghiệm thu: xóa `*.mock.ts` của service + cờ `useMockApi`, giữ dữ liệu `mocks/*.mock.ts` làm fixture test nếu cần (theo `structure_system.md` §5).

### 4.10 Tiện ích dùng chung

- `src/types/meal.types.ts`: `toApiMealType(mealType): 'Breakfast' | …` và `fromApiMealType(value: string): MealType` (so khớp không phân biệt hoa/thường, mặc định `'snack'`).
- `src/types/api.ts`: `ApiEnvelope<T>`, `PagedResult<T>`.
- Hàm ngày (`todayIso`, tuần bắt đầu thứ Hai) đã có ở `nutritionService`/`mealPlannerService` — giữ nguyên, **không** thay bằng `new Date().toISOString().slice(0,10)` (UTC, lệch ngày).

### 4.11 Test cho PR nền tảng

Jest (đã cấu hình `jest-expo`): `unwrap` (success / `success:false` / body null), `toApiError` (đủ 5 nhánh §4.4), `tokenStorage` (cache + web fallback). Smoke test tay bằng Swagger theo thứ tự: `register → survey → diary/log → diary/daily`.

---

## 5. Auth (`features/auth`)

| FE hiện tại | → BE | | Ghi chú |
|---|---|---|---|
| `authService.login(payload)` | `POST /auth/login` | 🟢 | Lưu token trong service rồi trả `{ user }` như cũ → `LoginScreen` không đổi. Sai mật khẩu = 401 envelope, **không** kích hoạt auto-logout (§4.3) |
| `authService.register(payload)` | `POST /auth/register` | 🟡 | BE trả token ngay, **không có OTP**. Lưu token + `setPendingUser(user)`; `RegisterResult` giữ `{ email }`. Email trùng → 400 "Email đã được sử dụng." |
| `authService.verifyOtp / resendOtp` | — | 🔴 | BE không có. **Bỏ OTP khỏi luồng đăng ký (D2)**: `RegisterScreen.onSuccess` → `navigate(HEALTH_PROFILE_BASIC_INFO)` thay vì `OTP`. Giữ `OtpScreen` cho quên mật khẩu (mock) |
| `authService.requestPasswordReset` | — | 🔴 | Mock-only. Settings → "Đổi mật khẩu" cũng mock-only |
| `AuthGoogleButton` | `POST /auth/google` | 🔴 | BE không verify ID token (P1-BE-01) → chưa nối, để nút disabled/mock |
| (mới) `authService.getMe()` | `GET /auth/me` | 🟢 | Restore session, làm mới `isPro`/`hasCompletedSurvey` |
| (mới) đăng xuất | — | 🟢 | Không có endpoint; xem §4.7 |

Việc cần sửa ngoài service:

- `auth.types.ts`: mở rộng `AuthUser` (§4.7); `LoginResult` giữ `{ user: AuthUser }`.
- `HealthResultScreen.handleStart` đang `login({ id: 'mock-user-1', … })` → dùng user thật từ `pendingUser` với `hasCompletedSurvey = true`.
- `LoginScreen`: sau khi login thành công mà `hasCompletedSurvey = false` → máy trạng thái §4.7 tự đưa vào wizard khảo sát.

---

## 6. Health & Meta (`features/health`)

| FE hiện tại | → BE | | Ghi chú |
|---|---|---|---|
| `healthProfileService.submitHealthProfile(formData)` | `POST /healthprofile/survey` | 🟡 | Map §6.2/§6.3. Trả `HealthProfileResult` lấy từ BE |
| (mới) `healthProfileService.getHealthProfile()` | `GET /healthprofile` | 🟢 | Hydrate `userProfileStore`; 404 = chưa khảo sát |
| (mới) `metaService.getAllergies / getMedicalConditions / getTags` | `GET /meta/*` | 🟢 | `staleTime` 24h; hook `useMeta()` |
| `HealthSettingsScreen` (sửa dị ứng/bệnh lý/chế độ ăn) | `POST /healthprofile/survey` | 🟡 | BE chỉ có "ghi đè toàn bộ" và **mỗi lần gọi thêm 1 dòng cân nặng** (P1-BE-04). Dùng được nhưng cảnh báo cho team |

### 6.1 Hiện trạng cần biết

- Luồng 7 bước ở FE: `useHealthProfileForm` (Zustand) gom dữ liệu → bước 7 (`HealthProfileDietScreen`) gọi `useSubmitHealthProfile` → `HealthResultScreen` hiển thị `result`. Giữ nguyên; chỉ thay phần thân `submitHealthProfile`.
- Bước 5/6/7 dùng danh sách tĩnh `ALLERGY_OPTIONS`/`HEALTH_CONDITION_OPTIONS`/`DIETARY_PREFERENCE_OPTIONS` (slug). BE dùng **id int** từ `/meta/*` → cần bảng quy đổi §6.4.

### 6.2 Request: `HealthProfileFormData` → `HealthSurveyRequest`

| FE | BE | Quy đổi |
|---|---|---|
| `gender` | `gender` | `male→Male`, `female→Female`, `other→Other` (D4) |
| `dateOfBirth {day,month,year}` | `age` (int) | `calculateAge(dob)` — **BE không lưu ngày sinh** |
| `heightCm` (string) | `heightCm` | `Number()` |
| `weightKg` | `currentWeightKg` | `Number()` |
| `goalWeightKg` | `targetWeightKg` | `Number()` |
| `activityLevel` | `activityLevel` | PascalCase: `Sedentary/Light/Moderate/Active/VeryActive` |
| `goal` | `goal` | `lose→LoseWeight`, `maintain→Maintain`, `gain→GainWeight` (D3) |
| `allergyIds` (slug) hoặc `noAllergies` | `allergyIds` (int[]) | slug → id theo §6.4; `noAllergies` → `[]`; `treeNut`/`sesame`/`other` không có id → bỏ, giữ local |
| `healthConditionIds` / `noHealthConditions` | `medicalConditionIds` (int[]) | như trên; `other` bỏ |
| `dietaryPreferenceIds`, `otherAllergyText` | — | BE **không lưu** → giữ ở `userProfileStore` (chỉ cục bộ) |

### 6.3 Response: `HealthProfileDto` → `HealthProfileResult` / store

| BE | FE |
|---|---|
| `bmi` | `bmi` |
| `bmr` (số thực, không làm tròn) | `bmr` (làm tròn khi hiển thị) |
| `tdee` | `tdee` |
| `dailyCaloriesTarget` | `calorieTarget` |
| `dailyProteinTargetGrams` / `dailyCarbsTargetGrams` / `dailyFatTargetGrams` | `macros.proteinG` / `carbsG` / `fatG` |
| `goal` | `goal` (map ngược `LoseWeight→lose`, `GainWeight`/`GainMuscle→gain`) |
| `gender`, `activityLevel` | map ngược sang slug |
| `age` | giữ `age`; ước lượng `dateOfBirth = 01/01/(năm nay − age)` (xem §6.5) |
| `allergies` / `medicalConditions` — **tên** (vd. `"Hải sản (Seafood)"`) | đối chiếu tên với `/meta/*` → id → slug |
| `bmiClassification` (vd. `"Bình thường (Normal)"`, song ngữ) | hiển thị thẳng hoặc map nhãn riêng |

### 6.4 Bảng quy đổi `/meta/*` (id cố định do `HasData` seed trong `ApplicationDbContext`)

| Dị ứng FE (slug) | BE id | `name` BE |
|---|---|---|
| `seafood` | 1 | Hải sản (Seafood) |
| `peanut` | 2 | Đậu phộng (Peanuts) |
| `dairy` | 3 | Sữa động vật (Dairy) |
| `egg` | 4 | Trứng (Eggs) |
| `gluten` | 5 | Gluten (Lúa mì) |
| `soy` | 6 | Đậu nành (Soy) |
| `treeNut`, `sesame`, `other` | — | không có trên BE |

| Bệnh lý FE | BE id | `name` BE |
|---|---|---|
| `diabetes` | 1 | Tiểu đường (Diabetes) |
| `gout` | 2 | Gout (Axit Uric cao) |
| `hypertension` | 3 | Cao huyết áp (Hypertension) |
| *(chưa có ở FE)* | 4 | Mỡ máu cao (Dyslipidemia) |
| `other` | — | không có trên BE |

| Chế độ ăn / Tag FE | BE id | `name` BE |
|---|---|---|
| `eatClean` | 1 | Eat Clean |
| `keto` | 2 | Keto |
| `vegan` | 3 | Thuần Chay (Vegan) |
| *(chưa có ở FE)* | 4 | Tăng Cơ (High Protein) |
| `quick` | 5 | Nhanh Gọn (< 15 phút) |
| *(chưa có ở FE)* | 6 | Tiết Kiệm Ngân Sách |
| `lowCarb`, `vegetarian` | — | không có trên BE |

Hiện thực: một file `features/health/utils/metaMapping.ts` (Phần 1 sở hữu, export qua `features/health/index.ts` để Phần 2 dùng). Vẫn gọi `/meta/*` lúc vào wizard để đối chiếu id↔tên; nếu id/tên lệch với bảng trên (DB bị seed lại) → log cảnh báo thay vì crash. Phương án bền hơn: BE thêm field `code` ổn định (P1-BE-04).

### 6.5 Hydrate `userProfileStore` ("mirror" đồng bộ)

Nhiều service FE đọc hồ sơ **đồng bộ** (`getCurrentUserAllergyIds()` cho lọc dị ứng ở recipes/planner/scanner) nên giữ store làm bản sao của dữ liệu server:

1. Sau login / restore session (đã `hasCompletedSurvey`): `GET /healthprofile` → `userProfileStore.hydrateFromServer(dto)`. Tới khi xong, màn đọc store phải ở trạng thái Loading — **không** hiển thị seed giả.
2. Bỏ `INITIAL_PROFILE_STATE` seed (chỉ dùng khi `ENV.useMockApi`).
3. `dateOfBirth`: BE chỉ có `age` → ước lượng; `EditProfileScreen` hiển thị "năm sinh ≈" (BR-001 cần ngày sinh thật → P1-BE-04).
4. `waterGoalMl`, `includeActivityCalories`, `dietaryPreferenceIds` tiếp tục là dữ liệu cục bộ.

### 6.6 BE là nguồn số liệu (BR-022)

Hiển thị chỉ số do BE trả; `healthCalculator.ts` + test giữ lại để xem trước/offline nhưng không hiển thị song song để khỏi lệch. Khác biệt hiện tại:

| | FE `healthCalculator.ts` | BE `NutritionCalculator` |
|---|---|---|
| BMR | Mifflin–St Jeor; `other` = trung bình nam/nữ | Mifflin–St Jeor; mọi giá trị ≠ `Male` dùng công thức nữ |
| Hệ số vận động | 1.2 / 1.375 / 1.55 / 1.725 / 1.9 | giống; chuỗi lạ → 1.375 |
| Mục tiêu calo | lose −500 · maintain 0 · gain **+300** · tối thiểu 1200 | LoseWeight −500 · Maintain 0 · GainWeight **+400** · GainMuscle **+300** · tối thiểu 1200 |
| Macro | 25% P / 25% F / 50% C | giống |
| Làm tròn | BMI 1 số lẻ; BMR, TDEE `Math.round` | BMI 1 số lẻ; TDEE làm tròn; BMR không làm tròn |

---

## 7. Nutrition (`features/nutrition`)

| FE hiện tại | → BE | | Ghi chú |
|---|---|---|---|
| `getDiaryDay(dateIso)` | `GET /nutritiondiary/daily?date=` **+** `GET /health-sync/daily-summary?date=` | 🟢 | 2 request song song; calo vận động lỗi → coi là 0. `meals` luôn đủ 4 nhóm kể cả rỗng |
| `addLogEntries(dateIso, mealType, inputs)` | `POST /nutritiondiary/log` × N | 🟢 | BE không có batch → gọi **tuần tự** (song song làm trùng dòng nhóm bữa ở BE, xem §16.3); xử lý một phần thất bại (§7.8) |
| `updateLogEntry(dateIso, entryId, patch)` | **không có PUT** | 🟡 | Tạm: `POST` bản mới **rồi** `DELETE` bản cũ (id đổi). Xin P1-BE-05 |
| `deleteLogEntry(dateIso, entryId)` | `DELETE /nutritiondiary/items/{id}` | 🟢 | |
| `getLogEntry(dateIso, entryId)` | — | 🟢 | Không cần endpoint: đổi `useMealLogEntry` sang `useDiaryDay` + `select` theo `entryId` |
| `getWeeklyProgress(dateIso)` | `GET /nutritiondiary/weekly-progress?startDate=` | 🟡 | Gửi `startDate = dateIso − 6 ngày` (7 ngày kết thúc hôm nay). **Thiếu macro/ngày** → `averageMacros` chưa tính được (P1-BE-07) |
| `searchFoods(query, filter)` | `GET /foods?search=&page=&pageSize=` | 🟡 | Chỉ filter `all` có BE. `recent`/`favorite`/`mine` giữ cục bộ (D5) |
| `getFoodById(foodId)` | `GET /foods/{id}` | 🟡 | Dinh dưỡng theo **100 g** |
| `createFood(input)` | — | 🔴 | BE chưa có (P1-BE-08) |

### 7.1 Quy ước ghi nhật ký (quan trọng)

Để `grams` / `nutritionPerGram` / "Sửa khối lượng" (BR-053) không mất thông tin khi đọc lại từ BE, **luôn gửi `unit: 'g'` và `servingSize = grams`**. Nhãn đẹp kiểu "1 tô (500 g)" sẽ hiển thị thành "500 g" sau khi tải lại — chấp nhận (BE không lưu nhãn).

### 7.2 `DiaryItemDto` → `MealLogEntry`

| BE | FE | Ghi chú |
|---|---|---|
| `id` (GUID) | `id` | |
| nhóm `meals[].mealType` | `mealType` | `fromApiMealType` |
| `foodName` | `foodName` | |
| `servingSize` + `unit` | `servingLabel` = `${servingSize} ${unit}`; `grams` = `servingSize` nếu `unit==='g'` | Mục có `unit` khác `g` (dữ liệu từ nơi khác): xem là 1 phần, **ẩn** chỉnh theo gram |
| `calories`, `proteinGrams`, `carbsGrams`, `fatGrams` | `nutrition.{calories,proteinG,carbsG,fatG}` | `sugarG/sodiumMg/fiberG` BE không lưu → `undefined` |
| — | `nutritionPerGram` | `nutrition / grams` (dùng `nutritionPerGram()` có sẵn) |
| `logMethod` | `source`, `aiConfirmed` | `Manual→'manual'`; `AiImage`/`Voice`→`'ai'` + `aiConfirmed=true`; `Barcode→'database'` |
| — (BE **không** trả giờ ghi) | `loggedAt` | Item mới tạo: lúc gọi API. Item tải về: để `undefined`/ẩn giờ trên UI (P1-BE-05) |

### 7.3 `NewMealLogInput` → `LogMealRequest`

```ts
// features/nutrition/services/nutrition.mapper.ts (ví dụ)
export function toLogMealRequest(dateIso: string, mealType: MealType, input: NewMealLogInput): LogMealRequest {
  return {
    logDate: dateIso,                       // "yyyy-MM-dd", giờ máy
    mealType: toApiMealType(mealType),      // 'Breakfast' | …
    foodName: input.foodName,
    servingSize: input.grams,
    unit: 'g',
    calories: input.nutrition.calories,
    proteinGrams: input.nutrition.proteinG,
    carbsGrams: input.nutrition.carbsG,
    fatGrams: input.nutrition.fatG,
    logMethod: input.logMethod ?? (input.source === 'ai' ? 'AiImage' : 'Manual'),
  };
}
```

`logMethod` hiện chưa có trong `NewMealLogInput` (chỉ có `source`) → thêm trường tùy chọn `logMethod?: 'Manual' | 'AiImage' | 'Voice' | 'Barcode'` để Phần 2 (AI/Barcode) phân biệt ảnh và giọng nói. `BarcodeScreen`/`OCRReviewScreen` truyền `logMethod: 'Barcode'`, luồng AI Snap truyền `'AiImage'`, Voice truyền `'Voice'`. Có thể gửi thêm `recipeId` / `ingredientId` / `imageUrl` khi có.

### 7.4 `DailyDiarySummaryDto` → `DiaryDaySummary`

- `calorieTarget ← targetCalories`; `macroTargets {proteinG ← targetProtein, carbsG ← targetCarbs, fatG ← targetFat}`.
- `activityCalories`: lấy `burnedCalories` từ health-sync rồi qua `calculateCalorieBudget(...)` **có sẵn** (tôn trọng công tắc `includeActivityCalories`) — không viết công thức thứ hai.
- BE: khi chưa có hồ sơ sức khỏe, mục tiêu mặc định `2000 kcal` / 250 C / 55 F / 125 P.

### 7.5 `WeeklyProgressDto` → `WeeklyProgressSummary`

`days[]` ← `days.map({ date, label (T2…CN tính từ date), calories, isToday })`; `calorieTarget ← days[0].targetCalories`; `averageCalories`, `daysOnTarget`, `rangeLabel` tính phía FE. `dayOfWeek` BE trả tiếng Anh (`"Monday"`) — không dùng cho UI. `averageMacros`: tạm để rỗng/ẩn khối macro tuần đến khi P1-BE-07 xong (thay vì gọi 7 lần `/daily`).

### 7.6 `/foods` → `FoodItem`

- `id`, `name`; `verified = true` (dữ liệu chuẩn của hệ thống).
- `servingOptions = [{ id: 'g-100', label: '100 g', grams: 100 }]` (+ tùy chọn thêm phía FE); `nutritionPerServing` = các cột `…Per100g` (`proteinG ← proteinPer100g`, `sugarG ← sugarPer100g`, `sodiumMg ← sodiumMgPer100g`, `fiberG ← fiberPer100g`).
- `allergenIds`: `allergyId` (int) → slug theo §6.4.
- BE seed hiện chỉ 12 **nguyên liệu** (ức gà, bò, cá hồi…), không có món như "Phở bò" → màn FoodSearch sẽ thưa dữ liệu (D5/P1-BE-08).
- Hook: debounce từ khóa 300 ms, `page=1&pageSize=20`; phân trang vô hạn là tùy chọn.

### 7.7 Hook & invalidation

Giữ nguyên query key (`['diary', date]`, `['progress', date]`, `['dashboard', date]`, `['foods', …]`). `useAddMealLogEntries` / `useUpdateMealLogEntry` / `useDeleteMealLogEntry` đã invalidate đủ 3 key đầu. Thêm: sau ghi cân nặng/sửa hồ sơ → invalidate `['health-profile']`, `['diary']`, `['dashboard']`, `['progress']`, `['meal-plan']` (đều dùng mục tiêu calo).

### 7.8 Trường hợp biên

- **Một phần thất bại** khi lưu N món (BR-054, AI Confirm): ghi tuần tự (§16.3), thu thập món lỗi; nếu có món lỗi → ném `PartialLogError` ("Đã lưu x/N món") mang `saved`/`failed`, **vẫn** invalidate cache, nơi gọi chỉ thử lại `failed`. Không gửi lại món đã lưu thành công (tránh trùng).
- **Bấm đúp**: mutation tắt nút khi `isPending`; BE không chống trùng.
- **Sửa món** (tạm): nếu `POST` mới thành công mà `DELETE` cũ lỗi → cảnh báo "có thể bị trùng", invalidate để người dùng xóa tay. Không xóa trước rồi mới tạo (mất dữ liệu nếu tạo lỗi).

---

## 8. Dashboard (`features/dashboard`)

BE không có endpoint tổng hợp → `dashboardService.getDashboardSummary()` vẫn gom từ nhiều nguồn (như hiện tại), chỉ đổi nguồn:

| `DashboardSummary` | Nguồn |
|---|---|
| `diary` | `nutritionService.getDiaryDay(todayIso())` (§7) |
| `activity {steps, caloriesBurned, syncedAtLabel}` | `GET /health-sync/daily-summary?date=` → `steps`, `burnedCalories`, `lastSyncedAt` (format `HH:mm` giờ máy). Chưa có log nào thì BE trả `sources:['Manual']`, `steps:0`, `lastSyncedAt = bây giờ` → coi là "chưa đồng bộ", đừng hiện "vừa đồng bộ" |
| `pet` | `gamificationService.getPetState()` — **Phần 2 sở hữu**; tới khi Phần 2 nối API thì vẫn là mock (chữ ký không đổi nên Dashboard tự nhận dữ liệu thật) |
| `recommendedMeal` | Tĩnh (🔴 mock-only, §13) |

Dùng `Promise.allSettled`: một nguồn lỗi (vd. pet) không làm hỏng cả Dashboard; chỉ khi **diary** lỗi mới hiện `ErrorState` toàn màn. `GET /health-sync/daily-summary` được nhiều nơi cần (Diary, Dashboard, `CalorieBudgetScreen`, `PlannerRegenerateScreen` của Phần 2) → tạo `healthSyncService.getDailySummary(dateIso)` + hook `useHealthSyncDaily(dateIso)` (key `['health-sync', 'daily', dateIso]`) trong feature `nutrition` (không phải `profile` — xem §16.2), export qua `features/nutrition/index.ts`; `nutritionService`/`dashboardService` gọi service, screen gọi hook. Gọi trùng 1 request GET ở tầng service là chấp nhận được (rẻ).

---

## 9. Profile & Health-sync (`features/profile`, `state/user`)

| FE hiện tại | → BE | | Ghi chú |
|---|---|---|---|
| `EditProfileScreen` — họ tên | `PUT /auth/profile` `{ fullName }` | 🟢 | Cập nhật `authStore.user` từ response. `avatarUrl` là chuỗi URL — BE **không** có upload ảnh, nút đổi avatar giữ giả lập |
| `EditProfileScreen` — giới tính/năm sinh/chiều cao | `POST /healthprofile/survey` (gửi lại toàn bộ hồ sơ hiện tại + phần đổi) | 🟡 | Mỗi lần thêm 1 dòng cân nặng (P1-BE-04) |
| `WeightHistoryScreen` — danh sách | `GET /healthprofile/weight-history` | 🟢 | Map §9.1 |
| `useUserProfileStore.recordWeight` / ghi cân nặng | `POST /healthprofile/weight-log` → rồi `GET /healthprofile` | 🟢 | Response chỉ trả điểm cân nặng; chỉ số mới (BMI/BMR/TDEE/macro) lấy ở `GET`. Gửi `recordedAt` dạng ISO có `Z` |
| `healthConnectService.getStatus` | local + `GET /health-sync/daily-summary` | 🟡 | "Đã kết nối/nguồn bật" là preference cục bộ; số liệu hôm nay lấy từ BE |
| `healthConnectService.syncNow` | `POST /health-sync/steps-and-calories` | 🟡 | Nguồn thật cần Dev Client → **chỉ DEV**. BE cộng dồn mọi lần gọi (P1-BE-09): gửi nhiều lần trong ngày sẽ nhân đôi số bước |
| `connect / disconnect / toggleSource` | — | 🔴 | Cục bộ (AsyncStorage) |
| `remindersService`, `notificationsService` | — | 🔴 | BE không có; giữ mock/cục bộ (+ `expo-notifications` local sau này) |
| Settings → xóa dữ liệu (`DeleteDataScreen`) | — | 🔴 | BE không có endpoint (BR-271, P1-BE-10); `resetUserData()` chỉ xóa phía máy |

### 9.1 `WeightHistoryResponse` → `weightHistory` của store

`history[] → { id, dateIso: recordedAt.slice(0,10), weightKg }` (sắp mới → cũ để khớp UI hiện tại; BE trả cũ → mới). `currentWeightKg`, `targetWeightKg`, `bmi` dùng để làm mới `result`/`weightKg` thay vì tự tính lại ở FE.

---

## 10. Nước uống (🔴 giữ mock — D6)

`waterService` nằm trong `features/gamification` nhưng endpoint thuộc module nhật ký nên **Phần 1 sở hữu** (Phần 2 chỉ đọc qua `getDaySummary` cho Pet).

| FE hiện tại | BE | |
|---|---|---|
| `addEntry(dateIso, amountMl)` | `POST /nutritiondiary/water { amountMl, date }` → `{ date, totalWaterMl, goalWaterMl, percentage }` | 🟡 chỉ ghi |
| `getDaySummary` (danh sách lần uống + tổng) | **không có GET** | 🔴 |
| `undoLastEntry`, `deleteEntry` | **không có DELETE** | 🔴 |
| `getWeekSummary` (7 ngày) | **không có** | 🔴 |
| Mục tiêu nước | BE cố định `2000` ml | 🔴 |

Lý do không nối riêng `POST`: BE sẽ tích lũy dữ liệu mà FE không đọc lại được → khi BE thêm `GET` thì hai nơi lệch nhau. Chờ P1-BE-06 rồi nối cả bộ. Hợp đồng đề xuất cho BE: `GET /nutritiondiary/water?date=&days=7` → `{ goalMl, days:[{ date, totalMl, entries:[{ id, amountMl, createdAt }] }] }` và `DELETE /nutritiondiary/water/{id}`.

---

## 11. Luồng chính

**A. Onboarding & phiên**

```
Welcome → Register ──POST /auth/register──▶ { token, user(hasCompletedSurvey=false) }
   │   lưu token (SecureStore) · setPendingUser · CHƯA isAuthenticated
   ▼
(bỏ OTP) → HealthProfile 1…7   ◀── GET /meta/allergies, /meta/medical-conditions (lấy id)
   ▼
Bước 7 "Tiếp tục" ──POST /healthprofile/survey──▶ HealthProfileDto ──▶ HealthResult (số của BE)
   ▼
"Bắt đầu với SmartMeal" → login(user{hasCompletedSurvey:true}) + hydrate userProfileStore → Main

Khởi động lại app:
  token? ─không─▶ Welcome
         ─có──▶ GET /auth/me ─401─▶ xóa token · logout('expired') → Login
                              ─lỗi mạng─▶ màn lỗi "Thử lại" (giữ token)
                              ─ok──▶ hasCompletedSurvey? ─không─▶ wizard (BasicInfo)
                                                         ─có────▶ GET /healthprofile → Main
Đang trong Main mà request có token trả 401 → StateSession(expired) → "Đăng nhập lại" → logout('expired') → Login
```

**B. Ghi & xem nhật ký**

```
FoodSearch ─GET /foods─▶ FoodDetail ─POST /nutritiondiary/log─▶ invalidate diary · progress · dashboard
Diary ─GET /nutritiondiary/daily?date + GET /health-sync/daily-summary?date─▶ hiển thị
Sửa (tạm)  : POST log (bản mới) ─▶ DELETE items/{id cũ}
Xóa        : DELETE /nutritiondiary/items/{id}
Tuần       : GET /nutritiondiary/weekly-progress?startDate=(hôm nay − 6)
```

---

## 12. Yêu cầu BE (Phần 1)

Ưu tiên: **P0** = chặn luồng hoặc rủi ro bảo mật · **P1** = cần để FE khớp thiết kế/BR · **P2** = nên có.

| ID | Ưu tiên | Yêu cầu | Lý do / màn FE | FE tạm làm gì |
|---|---|---|---|---|
| P1-BE-01 | **P0** | `POST /auth/google`: verify Google **ID token** phía server. Hiện code tin `{googleId, email, …}` từ client và tìm user theo email → ai biết email đều lấy được JWT của tài khoản đó | Bảo mật; contract cũng mô tả `idToken` | Không nối Google |
| P1-BE-02 | P1 | OTP: `verify-otp`, `resend-otp`; quên mật khẩu: `forgot-password`, `reset-password`; đổi mật khẩu: `change-password` (entity `OtpVerification` đã có) | BR-010; `OtpScreen`, `ForgotPasswordScreen`, Settings | Bỏ OTP ở đăng ký; các màn còn lại mock |
| P1-BE-03 | P2 | Refresh token (BR-014); hiện access token 30 ngày | Phiên dài/an toàn hơn | 401 → đăng nhập lại |
| P1-BE-04 | P1 | Health profile: thêm `dateOfBirth` (BR-001), `dietaryPreferences`, `waterGoalMl`; `PUT /healthprofile` cập nhật từng phần **không** thêm dòng `WeightHistory`; làm rõ `Gender=Other` và `GainWeight(+400)` vs `GainMuscle(+300)`; thêm `code` ổn định cho allergy/condition/tag. **Rủi ro chưa kiểm chứng:** gọi `POST /survey` lần 2 với cùng `allergyIds` có thể lỗi EF "instance cannot be tracked" (`Clear()` rồi `Add` cùng khóa) — BE cần test | `HealthSettings`, `EditProfile`, `HealthProfile` | Dùng `POST /survey` (chấp nhận side-effect) |
| P1-BE-05 | P1 | `PUT /nutritiondiary/items/{id}` (khối lượng/bữa); `DiaryItemDto` thêm `createdAt`, `mealType`, `recipeId`, `imageUrl` | `EditMealLog` (BR-053), giờ ghi trong Diary/offline badge | Tạo mới + xóa cũ |
| P1-BE-06 | P1 | Nước: `GET /nutritiondiary/water?date=&days=`, `DELETE /nutritiondiary/water/{id}`, mục tiêu theo hồ sơ | `WaterLog`, Pet, Reminders | Giữ mock |
| P1-BE-07 | P1 | `weekly-progress` thêm `carbs/protein/fat` mỗi ngày | `ProgressChart` (`averageMacros`) | Ẩn khối macro tuần |
| P1-BE-08 | P1 | Foods: seed **món ăn** (không chỉ nguyên liệu); `POST /foods` món người dùng tự tạo (BR-121); tra cứu barcode (BR-120); cờ `isVerified` | `FoodSearch`, `CreateFood`, `Barcode` | `/foods` hiện có + mock cho phần còn lại |
| P1-BE-09 | P1 | Health-sync: mỗi `POST` thêm 1 dòng và `daily-summary` **cộng tất cả** → gửi nhiều lần bị nhân đôi. Đề xuất upsert theo (user, date, source); trả `lastSyncedAt = null` khi chưa có log | `CalorieBudget`, `HealthConnect`, Dashboard | Chỉ đọc `daily-summary`; `syncNow` giữ mock/DEV |
| P1-BE-10 | P2 | `DELETE` dữ liệu cá nhân + xóa tài khoản (BR-271) | `DeleteData` | `resetUserData()` cục bộ |
| P1-BE-11 | P2 | Cập nhật `docs/SmartMeal_API_Contract.md` theo code (bảng §1.2) hoặc sinh từ Swagger | Tránh FE/BE lệch lại | — |

---

## 13. Mock-only registry (Phần 1 — còn giữ mock sau khi nối)

| Hàm / màn | Lý do |
|---|---|
| `authService.verifyOtp`, `resendOtp`, `requestPasswordReset`, nút Google | P1-BE-01/02 |
| `StateSession` variant `locked` | BE không có khóa tài khoản (không trả 423) |
| `nutritionService.createFood`, filter `recent`/`favorite`/`mine` của `searchFoods` | P1-BE-08 |
| Khối `averageMacros` của tuần | P1-BE-07 |
| Toàn bộ `waterService` | P1-BE-06 |
| `healthConnectService` (connect/disconnect/toggle/syncNow) | Cần Dev Client + P1-BE-09 |
| `remindersService`, `notificationsService` | BE không có |
| `DeleteDataScreen` phía server | P1-BE-10 |
| `dashboardService.recommendedMeal` | Chưa có nguồn gợi ý |
| `dietaryPreferenceIds`, `otherAllergyText`, `dateOfBirth` chính xác | P1-BE-04 (chỉ lưu cục bộ) |

---

## 14. Thứ tự làm, Definition of Done, nghiệm thu

### 14.1 Thứ tự (mỗi bước = 1 PR nhỏ, theo CLAUDE.md "mỗi lần 1 đợt")

1. **Nền tảng §4** — env, client, interceptors, errors, unwrap, secureStorage, queryClient, endpoints (đủ 50), tiện ích `meal.types`, test. *Phần 2 chờ PR này.*
2. **Auth §5** + session bootstrap + máy trạng thái điều hướng §4.7.
3. **Meta + Health §6** (survey, hydrate store, bảng quy đổi).
4. **Nutrition §7** (diary → daily/log/delete; weekly; foods) + **Dashboard §8**.
5. **Profile §9** (weight, edit profile, health-sync đọc).
6. Các mục 🔴 khi BE sẵn sàng (nước, sửa nhật ký thật, tạo món…).

### 14.2 Definition of Done (mỗi PR)

- [ ] `npx tsc --noEmit`, `npx expo lint`, `npm test` sạch; không `any`; import `@/`.
- [ ] Không còn URL/route/secret/hex hard-code; `axios` chỉ xuất hiện trong `src/services/api/`.
- [ ] Mapper có unit test với fixture JSON lấy từ BE thật (Swagger).
- [ ] Chữ ký service giữ nguyên (hoặc ghi rõ "đổi chữ ký" trong PR); hook/screen không import `mocks/`.
- [ ] Hàm còn dùng mock được ghi vào §13.
- [ ] Cập nhật `docs/ui-progress.md` nếu đổi hành vi màn hình.

### 14.3 Kiểm thử 4 trạng thái khi không còn `MOCK_SCENARIO`

| State | Cách tạo |
|---|---|
| Success | BE chạy + dữ liệu |
| Empty | Tài khoản mới đăng ký (chưa ghi gì) |
| Error | Tắt BE hoặc sai `EXPO_PUBLIC_API_URL`; hoặc bật chế độ máy bay |
| Loading/Slow | Throttle mạng (Chrome DevTools khi chạy web) |

### 14.4 Nghiệm thu Phần 1

- [ ] Đăng ký tài khoản mới → 7 bước khảo sát → `HealthResult` hiện số do BE tính → vào Main. Kill app, mở lại → vào thẳng Main (restore session).
- [ ] Kill app **giữa chừng** wizard (sau khi đăng ký) → mở lại → vào lại wizard, không bị kẹt ở Login.
- [ ] Đăng xuất → Welcome; đăng nhập lại → dữ liệu cũ còn nguyên.
- [ ] Sửa token trong SecureStore thành sai → thao tác bất kỳ → `StateSession` (hết phiên) → Login. Sai mật khẩu ở Login **không** bị coi là hết phiên.
- [ ] Ghi 1 món → Diary/Dashboard/ProgressChart cập nhật; xóa món → cập nhật.
- [ ] Tắt BE → mọi màn dữ liệu hiện `ErrorState` có nút thử lại (không trắng màn, không treo vô hạn — timeout 15s).
- [ ] Ghi cân nặng → BMI/TDEE/mục tiêu calo ở Profile, Diary, Dashboard cùng đổi.
- [ ] Người dùng mới không thấy bất kỳ dữ liệu seed giả nào (hồ sơ, yêu thích, nước…).

---

## 15. Làm song song với Phần 2

| Hạng mục | Phần 1 sở hữu | Phần 2 sở hữu |
|---|---|---|
| Thư mục feature | `auth`, `health`, `nutrition`, `dashboard`, `profile`, `gamification/services/waterService.ts` + `hooks/useWaterLog.ts` | `recipes`, `meal-planner`, `grocery`, `ai`, `scanner`, `gamification` (trừ water), `premium` |
| State | `state/auth`, `state/user` | `state/premium` |
| File dùng chung | `src/services/api/*`, `src/config/env.ts`, `src/types/*`, `constants/storage.ts` | chỉ **đọc**; cần đổi thì báo Phần 1 / mở PR riêng nhỏ |

Phần 1 cung cấp cho Phần 2 (sau PR nền tảng + §6): `apiClient`, `ENDPOINTS`, `unwrap`, `ApiError`, `ENV.useMockApi`/`aiTimeoutMs`, `toApiMealType`/`fromApiMealType`, `queryClient`, `useAuthStore` (`user.isPro`), `getCurrentUserAllergyIds()`, `metaMapping` (id↔slug).

- Nhánh: tạo từ `main` (§1.3) — `feat/fetch-api-part1`, `feat/fetch-api-part2`; PR nền tảng merge trước, Phần 2 rebase.
- Xung đột dễ xảy ra: `constants/storage.ts` (thêm khóa), `src/features/*/index.ts` (thêm export). Mỗi bên chỉ thêm dòng, không sắp xếp lại.

---

## 16. Trạng thái triển khai (nhánh `feat/fetch-api-part1`)

Cập nhật 2026-10-03. Mỗi nhóm dưới đây là 1 commit riêng (không gộp). **Chưa chạy được BE thật** (máy dev không có .NET/PostgreSQL) nên mọi thứ đã kiểm bằng `tsc`, ESLint, Jest với fixture khớp DTO C# — **cần smoke test tay với BE thật** theo §14.4 trước khi merge.

### 16.1 Các commit

| # | Commit | Nội dung |
|---|---|---|
| 1 | `docs(fetch-api)` | 2 file hướng dẫn này |
| 2 | `feat(api)` | Nền tảng §4: env, `apiClient`, interceptors (gắn token, 401 → handler), `ApiError`/`unwrap`, `tokenStorage` (SecureStore + cache, web fallback), `queryClient`, `ENDPOINTS` (đủ 50), `selectService` (mock fallback, cảnh báo dev khi hàm rơi về mock) |
| 3 | `feat(health)` | `healthProfileService` mock/api/selector (`submitHealthProfile`, `getHealthProfile`), `health.mapper`, `metaMapping` + `metaService`/`useMeta` (cache 24h, cảnh báo dev khi id lệch seed), `profileExtrasStorage`, `userProfileStore.hydrateFromServer` |
| 4 | `feat(auth)` | `authService` mock/api/selector (login, register không OTP, getMe), `sessionService` (khôi phục phiên, 401 → StateSession, dọn dữ liệu khi đăng xuất), `AppNavigator`/`AuthNavigator`/`navigationRef`, màn thử lại khi lỗi mạng lúc khởi động |
| 5 | `test` | Jest transform `gifted-charts-core` để `App.test.tsx` chạy lại được |
| 6 | `feat(nutrition)` | `nutritionService` mock/api/selector, `nutrition.mapper`, `healthSyncService` + `useHealthSyncDaily`, `utils/date`, debounce tìm món |
| 7 | `feat(dashboard)` | `dashboardService` gom bằng `Promise.allSettled`, `ActivityCard`/`CalorieBudgetScreen` đọc health-sync |
| 8 | `feat(profile)` (weight/settings/edit) | `getWeightHistory`/`recordWeight`/`updateBasicInfo`/`updateHealthSettings`, `useProfileData`, `authService.updateProfile`, `useEditProfile`, màn WeightHistory/EditProfile/HealthSettings |
| 9 | `feat(profile)` (Health Connect) | `healthConnectService` mock/api/selector, tùy chọn cục bộ, `syncMetrics` |
| 10 | `docs`, `chore(lint)`, `fix(mock)` | Ghi trạng thái (§16); cho phép `require()` trong test cần `jest.resetModules()`; nước uống/thông báo không seed dữ liệu giả khi gọi API thật |

### 16.2 Khác với đặc tả ở trên

| Mục | Đặc tả | Thực tế |
|---|---|---|
| Chế độ mặc định (§4.2) | — | `EXPO_PUBLIC_USE_MOCK_API=false` → **gọi API thật**. Muốn chạy demo không cần BE: `EXPO_PUBLIC_USE_MOCK_API=true` (mock giữ nguyên hành vi cũ, kể cả `MOCK_SCENARIO`) |
| Máy trạng thái phiên (§4.7) | `isBootstrapping: boolean`; `AppNavigator` render Main khi `isAuthenticated && user.hasCompletedSurvey` | `authStore.bootstrapStatus: 'loading' \| 'ready' \| 'failed'` và cờ `sessionExpired` (chống xử lý 401 lặp). Tài khoản chưa khảo sát nằm ở `pendingUser` (không bật `isAuthenticated`) nên `AppNavigator` giữ điều kiện `isAuthenticated \|\| isGuest`; `AuthNavigator` mở thẳng wizard khi còn `pendingUser`. Bước 1 của wizard bấm "Quay lại" khi không còn màn phía sau = đăng xuất về Welcome |
| Đăng xuất / hết phiên (§4.7) | Mỗi nơi tự gọi dọn dẹp | `startSessionLifecycle()` (gọi 1 lần ở `App.tsx`) đăng ký handler 401 **và** tự xóa token + cache query + `resetUserData()` mỗi khi phiên kết thúc → nút đăng xuất ở màn nào cũng chỉ cần `authStore.logout()`. Chế độ mock không dọn gì (giữ hành vi cũ) |
| Ghi N món vào nhật ký (§7, §7.8) | `POST /log` × N **song song** + `Promise.allSettled` | **Tuần tự.** Xem phát hiện ở §16.3. Lỗi mạng/hết phiên giữa chừng thì dừng, các món chưa gửi nằm trong `PartialLogError.failed` |
| `healthSyncService` / `useHealthSyncDaily` (§8) | Đặt trong feature `profile` | Đặt trong `features/nutrition` (nơi tính ngân sách calo; tránh vòng phụ thuộc nutrition → profile → gamification → nutrition). Export qua `@/features/nutrition` |
| `getLogEntry` (§7) | Bỏ endpoint, dùng `useDiaryDay` + `select` | Đã bỏ hàm khỏi service; `useMealLogEntry` dùng chung query của ngày. `EditMealLog`/`DeleteConfirm` nhận thêm `dateIso` (route param tùy chọn, mặc định hôm nay) để sửa/xóa món của ngày khác |
| `MealLogEntry` | `loggedAt` bắt buộc | `loggedAt?` (BE không trả giờ ghi) và thêm `unit?` (bản ghi do nơi khác tạo có thể là "phần", không phải gram); `EditMealLog` ẩn ô giờ khi thiếu |
| Tìm món (§7.6) | `recent`/`favorite`/`mine` giữ cục bộ | `all` → BE; `recent`/`favorite` → **rỗng** (không có nguồn thật, tránh trả món giả mà `/foods/{id}` không có); `mine` → món người dùng tự nhập (chỉ ở máy) |
| `HealthSettings` (§6, §9) | Luôn `POST /survey` | Chỉ gọi khi dị ứng/bệnh lý **có id trên BE** đổi; chỉ đổi chế độ ăn hoặc mục không có id (treeNut, sesame, other…) thì chỉ lưu ở máy → không ghi đè hồ sơ, không thêm dòng cân nặng thừa |
| `userProfileStore` (§6.5) | Có `weightHistory`, `recordWeight`, `updateBasicInfo` | Chỉ còn là bản sao hồ sơ (`hydrateFromServer`); lịch sử cân nặng là server state (`useWeightHistory`, mock giữ "DB" riêng); ghi cân nặng/sửa hồ sơ đi qua service rồi nạp kết quả vào store (`useProfileData`) |
| Health Connect `syncNow` (§9) | `POST /health-sync/steps-and-calories` (chỉ DEV) | Ngoài DEV: báo "cần Dev Client" (không im lặng). DEV: gửi số liệu mẫu **một lần/ngày** (BE cộng dồn mọi lần gửi). "Đã kết nối"/nguồn nào bật lưu cục bộ theo user (AsyncStorage) |
| Test | Jest cho unwrap/toApiError/tokenStorage | Thêm test cho mapper, service API (mock `api`), session, hook (`test-utils/renderHookWithQuery`), `dashboardService`, seed nước/thông báo — 288 test (`npm test`) |
| Việc Phần 2 cần làm tiếp | — | `BarcodeScreen`/`OCRReviewScreen`/AI Snap/Voice truyền `logMethod` (`'Barcode' \| 'AiImage' \| 'Voice'`) khi gọi `useAddMealLogEntries` — hiện mapper dùng mặc định `ai → AiImage`, còn lại `Manual`. `PlannerRegenerateScreen`/`mealPlannerService` còn đọc `CURRENT_USER_DAILY_TARGET` và `TODAY_ACTIVITY_CALORIES_BURNED_MOCK` (hằng số mock) → đổi sang `useUserProfileStore.result.calorieTarget` / `useHealthSyncDaily`. Nơi bắt `useAddMealLogEntries` lỗi cần xử lý `PartialLogError` (chỉ gửi lại `error.failed`) |

### 16.3 Phát hiện khi làm (cần BE biết)

- **P0 — Ghi nhật ký song song làm mất món.** `NutritionDiaryService.LogMealAsync` "tìm-hoặc-tạo" dòng `NutritionDiary` theo (user, ngày, bữa) nhưng bảng `NutritionDiaries` **không có ràng buộc duy nhất** (chỉ index `UserId`). N request song song cho cùng một bữa chưa có dòng nhóm sẽ tạo N dòng trùng; `GetDailySummaryAsync` chỉ lấy `FirstOrDefault` theo bữa nên món ở dòng sau **không hiện trong `/daily`** nhưng vẫn bị cộng vào `totalCalories`/`weekly-progress`. FE đã ghi tuần tự để né, nhưng nên sửa ở BE: unique index (UserId, LogDate, MealType) + upsert, hoặc `POST /nutritiondiary/log` nhận mảng món (P1-BE-12).
- `GET /auth/me` trả 404 khi token còn hạn nhưng tài khoản đã bị xóa → FE coi như phiên không hợp lệ (xóa token, mở Login).
- `POST /auth/login` sai mật khẩu trả **401** có envelope → interceptor không coi là hết phiên (bỏ qua `/auth/login|register|google`).

### 16.4 Bổ sung yêu cầu BE

| ID | Ưu tiên | Yêu cầu | Lý do | FE tạm làm gì |
|---|---|---|---|---|
| P1-BE-12 | **P0** | Ràng buộc duy nhất (UserId, LogDate, MealType) cho `NutritionDiaries` + upsert; hoặc `POST /nutritiondiary/log` nhận mảng | Xem §16.3 | Ghi tuần tự (chậm hơn, vẫn có thể trùng nếu 2 thiết bị ghi cùng lúc) |

### 16.5 Mock-only registry thực tế (cập nhật §13)

| Hàm / màn | Hiện trạng |
|---|---|
| `authService.verifyOtp/resendOtp/requestPasswordReset`, nút Google, đổi mật khẩu | Mock (P1-BE-01/02) |
| `StateSession` variant `locked` | Mock |
| `nutritionService.createFood` | Mock, món chỉ ở máy (xóa khi đăng xuất) |
| Tìm món `recent`/`favorite` | Rỗng; `mine` chỉ ở máy |
| `averageMacros` của tuần | Rỗng → ẩn khối "Macro trung bình" (P1-BE-07) |
| `waterService` (toàn bộ, thuộc `gamification`) | Mock cục bộ (P1-BE-06). Dữ liệu mẫu của design (5 ly, lịch sử 7 ngày) chỉ khi chạy mock; gọi API thật thì bắt đầu từ 0 |
| `healthConnectService.syncNow` | Chỉ DEV (xem trên); connect/disconnect/toggle là tùy chọn cục bộ |
| `remindersService`, `notificationsService` | Mock (BE không có). Thông báo mẫu chỉ khi chạy mock; gọi API thật thì danh sách rỗng |
| `DeleteDataScreen` | Chỉ xóa phía máy (`resetUserData()`) rồi đăng xuất — dữ liệu trên server **vẫn còn** (P1-BE-10) |
| `dashboardService.recommendedMeal`, `CalorieBudgetScreen` khối hoạt động chi tiết | Tĩnh (mock) / ẩn ở API thật (BE chỉ có tên nguồn + tổng calo) |
| Ngày sinh chính xác, `dietaryPreferenceIds`, dị ứng/bệnh lý không có id | Chỉ lưu cục bộ (P1-BE-04); ngày sinh là ước lượng 01/01 của (năm nay − tuổi) |
| Avatar | Chưa upload (BE chỉ lưu chuỗi URL) |
| `isPro` từ `/auth/me` | Có trong `authStore.user` nhưng chưa nối vào `premiumStore` (thuộc Phần 2) |

---

## Phụ lục A — DTO của BE (TypeScript, đặt vào `*.api.types.ts`)

`string` cho `Guid`/`DateOnly`/`DateTime`. Trường `?` có thể là `null`.

```ts
// types/api.ts
export interface ApiEnvelope<T> { success: boolean; message: string; data: T | null; errors: string[] | null }
export interface PagedResult<T> { items: T[]; page: number; pageSize: number; totalCount: number; totalPages: number }

// auth
export interface RegisterRequest { email: string; password: string; fullName: string }
export interface LoginRequest { email: string; password: string }
export interface GoogleAuthRequest { googleId: string; email: string; fullName: string; avatarUrl?: string | null }
export interface UpdateProfileRequest { fullName?: string | null; avatarUrl?: string | null }
export interface UserDto {
  id: string; email: string; fullName: string; avatarUrl: string | null
  isPro: boolean; role: string; hasCompletedSurvey: boolean
}
export interface AuthResponse { token: string; expiresAt: string; user: UserDto }

// health
export interface HealthSurveyRequest {
  gender: string; age: number; heightCm: number; currentWeightKg: number; targetWeightKg: number
  activityLevel: string; goal: string; allergyIds: number[]; medicalConditionIds: number[]
}
export interface HealthProfileDto {
  id: string; gender: string; age: number; heightCm: number; currentWeightKg: number; targetWeightKg: number
  activityLevel: string; goal: string
  bmi: number; bmiClassification: string; bmr: number; tdee: number
  dailyCaloriesTarget: number; dailyCarbsTargetGrams: number; dailyFatTargetGrams: number; dailyProteinTargetGrams: number
  allergies: string[]; medicalConditions: string[]
}
export interface WeightLogRequest { weightKg: number; recordedAt?: string }
export interface WeightPointDto { id: string; weightKg: number; recordedAt: string; diffFromTargetKg: number }
export interface WeightHistoryResponse {
  currentWeightKg: number; targetWeightKg: number; initialWeightKg: number; totalWeightChangedKg: number
  bmi: number; bmiCategory: string; history: WeightPointDto[]
}
// /meta/* trả thẳng entity EF; có thể kèm mảng rỗng userAllergies/userConditions/recipeTags — bỏ qua. Tag không có description.
export interface MetaItem { id: number; name: string; description?: string | null }

// nutrition diary
export interface LogMealRequest {
  logDate: string; mealType: string; foodName: string
  recipeId?: string | null; ingredientId?: string | null
  servingSize: number; unit: string
  calories: number; carbsGrams: number; fatGrams: number; proteinGrams: number
  logMethod: string; imageUrl?: string | null
}
export interface DiaryItemDto {
  id: string; foodName: string; servingSize: number; unit: string
  calories: number; carbsGrams: number; fatGrams: number; proteinGrams: number; logMethod: string
}
export interface MealGroupDto { mealType: string; subtotalCalories: number; items: DiaryItemDto[] }
export interface DailyDiarySummaryDto {
  date: string
  totalCalories: number; totalCarbs: number; totalFat: number; totalProtein: number
  targetCalories: number; targetCarbs: number; targetFat: number; targetProtein: number
  meals: MealGroupDto[]
}
export interface DailyProgressPointDto { date: string; dayOfWeek: string; calories: number; targetCalories: number }
export interface WeeklyProgressDto { days: DailyProgressPointDto[] }
export interface LogWaterRequest { amountMl: number; date?: string | null }
export interface WaterSummaryDto { date: string; totalWaterMl: number; goalWaterMl: number; percentage: number }

// foods
export interface FoodItemDto {
  id: string; name: string; description: string | null; imageUrl: string | null
  category: string; defaultUnit: string; estimatedPriceVnd: number
  caloriesPer100g: number; carbsPer100g: number; fatPer100g: number; proteinPer100g: number
  fiberPer100g: number; sugarPer100g: number; sodiumMgPer100g: number
  allergyId: number | null; allergyName: string | null
}

// health-sync (request chấp nhận cả steps|stepCount và burnedCalories|activeCaloriesBurned)
export interface SyncMetricsRequest {
  date?: string | null; steps: number; burnedCalories: number; distanceMeters: number; source: string
}
export interface SyncMetricsResponse {
  date: string; steps: number; burnedCalories: number; distanceMeters: number; source: string; syncedAt: string
}
export interface DailyHealthSyncSummaryDto {
  date: string; steps: number; stepGoal: number
  burnedCalories: number; consumedCalories: number; netCalories: number
  targetCalories: number; remainingCalories: number; distanceMeters: number
  sources: string[]; lastSyncedAt: string
}
```
