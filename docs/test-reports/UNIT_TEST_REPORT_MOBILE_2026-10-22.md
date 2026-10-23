# BÁO CÁO KẾT QUẢ UNIT TEST — MOBILE APP

## 1. Thông tin chung (General Information)

| Mục | Nội dung |
|---|---|
| **Tên dự án / Repository** | SmartMeal — AI-Powered Smart Nutrition & Meal Management, ứng dụng di động (`DamThanQuy/SmartMeal`, nhánh `main`, commit `f89b8ef` + bản sửa lỗi Web Admin chưa commit) |
| **Module / Service / File** | **Mobile** `frontend/SmartMealMobile/src` (13 feature: auth, health, dashboard, nutrition, recipes, meal-planner, grocery, scanner, ai, gamification, premium, profile, dev + services, state, theme, navigation, utils) · **Backend phục vụ app** `backend/` (SmartMeal.API, .Application, .Domain, .Infrastructure — mọi API trừ `/api/admin/*`, phần đó nằm trong báo cáo Web Admin) |
| **Test Framework** | **Mobile:** Jest 29.7.0 + jest-expo 57.0.6 + react-test-renderer; bộ *live test* chạy service thật của app (axios + interceptor + mapper) với backend Docker · **Backend:** xUnit 2.9.3 + `WebApplicationFactory` (API thật) + PostgreSQL 16 (Docker), coverage coverlet 6.0.2 |
| **Người thực hiện** | AI Assistant (Claude Code) |
| **Ngày thực hiện** | 22/10/2026 — lần 2 (chạy lại sau khi sửa lỗi Web Admin, vì bản sửa đụng tới phần xác thực dùng chung với app) |
| **Môi trường** | Windows 11 Pro · Node.js 22.19.0 · Docker (`mcr.microsoft.com/dotnet/sdk:9.0`, `postgres:16-alpine`, image `smartmeal-backend-api` build lại từ mã đã sửa) · Gemini `gemini-3.8-flash` (fallback `gemini-flash-lite-latest`) |

> Lần 2 trong ngày: bản sửa lỗi Web Admin thay đổi phần backend dùng chung với app — mọi access token mang thêm claim `token_version` (cột mới `Users.TokenVersion`), `OnTokenValidated` đọc vai trò và phiên bản token từ DB ở mỗi request, đăng nhập dùng chung `VerifyCredentialsAsync` với cổng Admin. Vì vậy chạy lại backend và live test của app để xác nhận không hồi quy. Mã nguồn mobile không đổi so với lần 1 (unit test chạy lại cho kết quả y hệt); so với báo cáo 21/10, mobile chỉ đổi ở commit `3bf9673` "fix(mobile): không treo splash screen khi chờ font Inter tải xong" (`App.tsx`, `src/theme/ThemeProvider.tsx`) — đợt này bổ sung 7 test hồi quy cho thay đổi đó (mục 3.1).

## 2. Tổng quan kết quả (Test Run Summary)

| Chỉ số (Metric) | Backend API cho app (xUnit) | Mobile unit (Jest) | Mobile live (Jest + BE thật) | **Tổng** |
|---|---|---|---|---|
| 📦 **Test Suites** | 34 Passed / 38 Total (89.5%) | 57 Passed / 58 Total (98.3%) | 10 Passed / 12 Total (83.3%) | 101 Passed / 108 Total (93.5%) |
| 🧪 **Test Cases (Specs)** | 292 | 587 | 82 | **961** |
| 🟢 **PASS** | 269 (92.1%) | 586 (99.8%) | 79 (96.3%) | **934 (97.2%)** |
| 🔴 **FAIL** | 23 (7.9%) | 1 (0.2%) | 3 (3.7%) | **27 (2.8%)** |
| 🟡 **SKIPPED** | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| ⏱️ **Thời gian chạy (Duration)** | 245.0s (4m05s) ¹ | 138.0s (2m18s) | 287.2s (4m47s) | 670.2s (11m10s) |

¹ Backend chạy chung một lượt `dotnet test` với 79 test của `AdminApiTests` (371 test, 4m05s, song song theo lớp); 292 test ở đây là toàn bộ các lớp còn lại. Mobile unit chạy `--runInBand` kèm đo coverage; live test `--runInBand --testTimeout=90000`. Suite: backend = 1 lớp test, mobile = 1 file `*.test.ts(x)`.

**So với các lần chạy trước:**

| Lần chạy | Backend | Mobile unit | Mobile live | Ghi chú |
|---|---|---|---|---|
| 21/10/2026 | 292 — 269 PASS / 23 FAIL | 580 — 579 PASS / 1 FAIL | 82 — 80 PASS / 2 FAIL | |
| 22/10/2026 — lần 1 | 292 — 269 PASS / 23 FAIL | 587 — 586 PASS / 1 FAIL | 82 — 80 PASS / 2 FAIL | +7 test `ThemeProvider` (đều PASS) |
| **22/10/2026 — lần 2** (sau khi sửa Web Admin) | **292 — 269 PASS / 23 FAIL** | **587 — 586 PASS / 1 FAIL** | **82 — 79 PASS / 3 FAIL** | Backend phục vụ app: cùng 23 test FAIL như trước, **không hồi quy** sau thay đổi xác thực. Live: bộ `auth` 12/12 PASS; FAIL thêm 1 do Gemini hết hạn mức ngày (Fail 27). **Các lỗi đã báo 21/10 vẫn chưa được sửa** |

### 📊 Độ bao phủ mã nguồn (Code Coverage Summary)

**Yêu cầu mức bao phủ tối thiểu (Target): ≥ 80%**

| Chỉ số | Backend (trừ Migrations và phần Admin) | Mobile — toàn bộ `src/` | Mobile — lớp logic ² |
|---|---|---|---|
| **Statements** | — ³ | ❌ 33.9% (1935/5700) | ❌ 60.2% (1572/2610) |
| **Branches** (Nhánh điều kiện) | ❌ 75.4% (2031/2694) | ❌ 27.0% (974/3607) | ❌ 63.5% (791/1246) |
| **Functions** (Hàm) | ✅ 97.1% (1763/1815) | ❌ 27.4% (648/2362) | ❌ 53.1% (556/1047) |
| **Lines** | ✅ 92.0% (8597/9347) | ❌ 34.0% (1744/5136) | ❌ 60.2% (1394/2316) |

² Lớp logic = service, mapper, utils, state, hook (`.ts`), **không** gồm screen/component/navigation/theme (`.tsx`) — phần mà unit test nhắm tới.
³ coverlet đo theo dòng (sequence point) nên không có số Statements riêng.

Coverage backend theo project (không tính `AdminController.cs`, `AdminDTOs.cs`):

| Project | Lines | Branches | Methods |
|---|---|---|---|
| SmartMeal.Application | 96.4% (991/1028) | 75.7% (156/206) | 98.8% (665/673) |
| SmartMeal.Domain | 98.3% (345/351) | 85.7% (12/14) | 98.3% (338/344) |
| SmartMeal.Infrastructure | 91.4% (6081/6653) | 77.0% (1535/1994) | 94.6% (601/635) |
| SmartMeal.API | 89.7% (1180/1315) | 68.3% (328/480) | 97.5% (159/163) |

Coverage mobile theo thư mục (`src/`, Lines):

| Thư mục | Lines | | Thư mục | Lines |
|---|---|---|---|---|
| `theme` | ✅ 97.8% (45/46) | | `nutrition` | 34.6% (190/549) |
| `config` | ✅ 100% (10/10) | | `gamification` | 31.8% (96/302) |
| `utils` | ✅ 90.0% (36/40) | | `profile` | 29.8% (189/634) |
| `constants` | ✅ 90.9% (10/11) | | `auth` | 24.6% (114/464) |
| `services` | 78.3% (188/240) | | `grocery` | 22.8% (42/184) |
| `state` | 71.1% (32/45) | | `ai` | 20.3% (117/575) |
| `components` | 62.7% (42/67) | | `recipes` | 19.1% (83/434) |
| `navigation` | 57.4% (27/47) | | `dashboard` | 13.6% (21/154) |
| `health` | 50.3% (195/388) | | `dev` | 10.5% (2/19) |
| `scanner` | 42.7% (158/370) | | `meal-planner` | ❌ 3.4% (7/208) |
| `premium` | 39.3% (131/333) | | `hooks` | 0% (0/5) |

**Nhận xét coverage:** Backend đạt mục tiêu về Lines/Functions, Branches (75.4%) chưa đạt — thấp nhất ở `SmartMeal.API` (68.3%); file seed `DbInitializer.Recipes.cs` (~900 dòng dữ liệu) làm Lines của Infrastructure cao hơn thực tế. Mobile toàn `src/` còn xa mục tiêu vì gần như **không có test cho màn hình (screens/components `.tsx`)**; lớp logic 60.2% cũng chưa đạt; `meal-planner` gần như chưa có test (3.4%).

## 3. Chi tiết các Test Case (Unit Test Cases)

Toàn bộ 961 test case (mỗi test một dòng, kèm trạng thái và thời gian) ở **[Phụ lục A](#phụ-lục-a-danh-sách-đầy-đủ-test-case)**. Mục này trình bày theo form: test case mới (3.1), các test case FAIL (3.2) và tổng hợp theo module (3.3).

### 3.1 Test case mới bổ sung — `frontend/SmartMealMobile/__tests__/ui/ThemeProvider.test.tsx`

Mục tiêu: bảo vệ bản sửa `3bf9673` — `ThemeProvider` không còn chặn render tới khi `useFonts` xong (trước đó splash screen treo vô hạn trên máy tải font chậm). `expo-font` và `nativewind` được mock, AsyncStorage dùng bản mock chính thức.

| # | Function / Component | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 1 | `ThemeProvider` | font Inter chưa tải xong vẫn render children và báo onReady đúng 1 lần (không treo splash) | `useFonts` → `[false, null]` mãi mãi | Children hiện ra; `onReady` gọi đúng 1 lần (App.tsx ẩn splash) | Đúng như mong đợi | 🟢 PASS |
| 2 | `ThemeProvider` | font lỗi khi tải cũng không chặn render | `useFonts` → `[false, Error('font not found')]` | Children vẫn hiện (dùng font hệ thống) | Đúng như mong đợi | 🟢 PASS |
| 3 | `ThemeProvider` | chưa đọc xong theme mode đã lưu thì chưa render (tránh chớp sáng/tối) | Render đồng bộ, AsyncStorage chưa trả kết quả | Cây render = `null` | Đúng như mong đợi | 🟢 PASS |
| 4 | `ThemeProvider` / `useTheme` | khôi phục chế độ tối đã lưu và dùng bảng màu tối | AsyncStorage `app.themeMode = 'dark'` | `mode = dark`, `resolvedScheme = dark`, `colors = darkColors`, NativeWind `setColorScheme('dark')` | Đúng như mong đợi | 🟢 PASS |
| 5 | `ThemeProvider` | giá trị lưu không hợp lệ → theo hệ thống (sáng) | `app.themeMode = 'tím'` | `mode = system`, `colors = lightColors` | Đúng như mong đợi | 🟢 PASS |
| 6 | `useTheme().setMode` | setMode đổi theme ngay và lưu lại cho lần mở app sau | `setMode('dark')` | `resolvedScheme = dark`; AsyncStorage lưu `'dark'` | Đúng như mong đợi | 🟢 PASS |
| 7 | `useTheme` | useTheme() ngoài ThemeProvider ném lỗi rõ ràng | Render `useTheme()` không có Provider | Ném "useTheme() phải được gọi bên trong <ThemeProvider>." | Đúng như mong đợi | 🟢 PASS |

> Phần fallback 3 giây trong `App.tsx` (`setTimeout(() => SplashScreen.hideAsync())`) chỉ được phủ gián tiếp bởi smoke test `App.test.tsx` (mount không lỗi) — chưa có test kiểm tra riêng việc tự ẩn splash sau 3 s.

### 3.2 Các test case FAIL (theo form)

| # | Function / Component | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 1 | `DbInitializer` (seed) | `Recipes_tagged_quick_take_at_most_15_minutes` | 56 món seed có tag `quick` | Mọi món tag "Nhanh Gọn (< 15 phút)" có prep + cook ≤ 15 phút | 7 món 16–30 phút | 🔴 FAIL |
| 2 | `DbInitializer` (seed) | `An_allergen_named_in_the_title_is_reported_in_the_recipe_allergy_list` | Tên món chứa phô mai / đậu phộng / cua / hạnh nhân / hạt dẻ / óc chó / hạt điều | `AllergyIds` có chất gây dị ứng tương ứng (BR-102) | 7 món thiếu khai báo | 🔴 FAIL |
| 3 | `GET /api/recipes?excludeMyAllergens=true` | `Excluding_my_allergens_hides_dishes_whose_name_mentions_one_of_them` | User dị ứng sữa, đậu phộng, hải sản, hạt cây | Không còn món có chất gây dị ứng trong tên | 6 món nguy hiểm vẫn hiện | 🔴 FAIL |
| 4 | `categorizeIngredient()` | "Chuối tiêu" (chuối) không bị xếp vào Gia vị chỉ vì có chữ "tiêu" | `'Chuối tiêu'` | Không phải `'Gia vị'` | `'Gia vị'` | 🔴 FAIL |
| 5–24 | `RecipeTests` (11), `FoodTests` (5), `GroceryTests` (4) | 20 test có sẵn giả định seed 6 món / 27 thực phẩm | Database test seed theo commit `dd46fbb` (56 món, 61 thực phẩm) | Số lượng / `Single(...)` theo dữ liệu cũ | Số lượng 56 / 61; "Sequence contains more than one matching element" — chi tiết ở Fail 05 → 24 (mục 4) | 🔴 FAIL |
| 25 | `aiService.transcribeVoiceAudio` (live) | Voice Log từ file ghi âm: gửi multipart `audio`, trả món + câu chép lời, trừ đúng một lượt | File WAV tổng hợp gửi tới Gemini thật | Nhận ra ≥ 1 món, trừ 1 lượt AI | "Chưa nghe ra món ăn nào trong đoạn ghi âm…" | 🔴 FAIL |
| 26 | `scannerService.analyzeOcrLabel` (live) | đọc nhãn: ảnh gửi multipart `image` tới /ai/scan-label, kết quả bản demo được gắn cờ | Ảnh nhãn tổng hợp gửi tới Gemini thật | `fields.length > 0` | `0` trường đọc được | 🔴 FAIL |
| 27 | `aiService.transcribeVoice` (live) | Voice Log từ văn bản: trả các món kèm dinh dưỡng, bữa theo lựa chọn, và trừ đúng một lượt | Câu mô tả bữa ăn gửi tới Gemini thật | Trả ≥ 1 món kèm dinh dưỡng, trừ 1 lượt | "Dịch vụ AI đang gặp sự cố…" (Gemini 429 — hết hạn mức ngày) | 🔴 FAIL |

### 3.3 Tổng hợp theo module

| Tầng | Module | Suites | Test cases | 🟢 PASS | 🔴 FAIL | 🟡 SKIPPED |
|---|---|---|---|---|---|---|
| Backend | AI (Snap & Track, giọng nói, nhãn, tủ lạnh, hạn mức) (`AiTests`) | 1 | 25 | 25 | 0 | 0 |
| Backend | Chất lượng dữ liệu seed công thức (`RecipeSeedQualityTests`) | 1 | 7 | 4 | 3 | 0 |
| Backend | Chia sẻ bộ sưu tập (`CollectionShareTests`) | 1 | 3 | 3 | 0 | 0 |
| Backend | Công thức, yêu thích, bộ sưu tập (`RecipeTests`) | 1 | 19 | 8 | 11 | 0 |
| Backend | Danh mục thực phẩm (`FoodTests`) | 1 | 13 | 8 | 5 | 0 |
| Backend | Danh sách đi chợ (`GroceryTests`) | 1 | 16 | 12 | 4 | 0 |
| Backend | Danh sách ngân hàng VietQR (`VietQrBanksTests`) | 1 | 12 | 12 | 0 | 0 |
| Backend | Dị ứng tự khai báo (`OtherAllergiesTests`) | 1 | 4 | 4 | 0 | 0 |
| Backend | Đăng ký / đăng nhập / refresh / khóa tài khoản (`AuthTests`) | 1 | 15 | 15 | 0 | 0 |
| Backend | Đăng nhập Google (đã gỡ) (`GoogleLoginTests`) | 1 | 3 | 3 | 0 | 0 |
| Backend | Đồng bộ bước chân / calo (Health Connect, Google Fit) (`HealthSyncTests`) | 1 | 9 | 9 | 0 | 0 |
| Backend | Envelope lỗi chuẩn (400/401/403/404/500) (`ErrorEnvelopeTests`) | 1 | 8 | 8 | 0 | 0 |
| Backend | Gamification (pet, streak, thử thách, huy hiệu) (`GamificationTests`) | 1 | 18 | 18 | 0 | 0 |
| Backend | Gói Pro / Subscription (`SubscriptionTests`) | 1 | 8 | 8 | 0 | 0 |
| Backend | Hồ sơ sức khoẻ (BMI/BMR/TDEE) (`HealthProfileTests`) | 1 | 21 | 21 | 0 | 0 |
| Backend | Idempotency (chống ghi trùng) (`IdempotencyTests`) | 1 | 5 | 5 | 0 | 0 |
| Backend | Lên thực đơn (Meal Planner) (`PlannerTests`) | 1 | 15 | 15 | 0 | 0 |
| Backend | Mật khẩu (đổi, quên, OTP) (`PasswordTests`) | 1 | 15 | 15 | 0 | 0 |
| Backend | Migration — công thức (`RecipeMigrationTests`) | 1 | 1 | 1 | 0 | 0 |
| Backend | Migration — đi chợ (`GroceryMigrationTests`) | 1 | 1 | 1 | 0 | 0 |
| Backend | Migration — đồng bộ sức khoẻ (`HealthSyncMigrationTests`) | 1 | 1 | 1 | 0 | 0 |
| Backend | Migration — gamification (`GamificationMigrationTests`) | 1 | 1 | 1 | 0 | 0 |
| Backend | Migration — gói Pro (`SubscriptionMigrationTests`) | 1 | 1 | 1 | 0 | 0 |
| Backend | Migration — hồ sơ sức khoẻ (`HealthMigrationTests`) | 1 | 1 | 1 | 0 | 0 |
| Backend | Migration — nhật ký (`DiaryMigrationTests`) | 1 | 1 | 1 | 0 | 0 |
| Backend | Migration — thực đơn (`PlannerMigrationTests`) | 1 | 1 | 1 | 0 | 0 |
| Backend | Migration — thực phẩm (`FoodMigrationTests`) | 1 | 1 | 1 | 0 | 0 |
| Backend | Migration — xác thực (`AuthMigrationTests`) | 1 | 1 | 1 | 0 | 0 |
| Backend | Nhật ký ăn uống (`DiaryTests`) | 1 | 13 | 13 | 0 | 0 |
| Backend | Seed dữ liệu (`SeedTests`) | 1 | 2 | 2 | 0 | 0 |
| Backend | Smoke (health check, Swagger) (`SmokeTests`) | 1 | 3 | 3 | 0 | 0 |
| Backend | Tài khoản (hồ sơ, ảnh đại diện, xóa tài khoản) (`AccountTests`) | 1 | 13 | 13 | 0 | 0 |
| Backend | Thanh toán PayOS (`PayOSTests`) | 1 | 6 | 6 | 0 | 0 |
| Backend | Thanh toán SePay (webhook) (`SePayTests`) | 1 | 9 | 9 | 0 | 0 |
| Backend | Thông báo (`NotificationTests`) | 1 | 7 | 7 | 0 | 0 |
| Backend | Thông báo realtime (SignalR) (`NotificationRealtimeTests`) | 1 | 4 | 4 | 0 | 0 |
| Backend | Tra mã vạch (Open Food Facts) (`BarcodeLookupTests`) | 1 | 4 | 4 | 0 | 0 |
| Backend | Uống nước (`WaterTests`) | 1 | 5 | 5 | 0 | 0 |
| Mobile (unit) | AI (Snap, giọng nói, quét nhãn) (`__tests__/ai/`) | 4 | 36 | 36 | 0 | 0 |
| Mobile (unit) | API client & interceptor (`__tests__/api/`) | 7 | 65 | 65 | 0 | 0 |
| Mobile (unit) | Công thức (`__tests__/recipes/`) | 3 | 29 | 29 | 0 | 0 |
| Mobile (unit) | Đi chợ (`__tests__/grocery/`) | 3 | 21 | 20 | 1 | 0 |
| Mobile (unit) | Gamification (`__tests__/gamification/`) | 3 | 8 | 8 | 0 | 0 |
| Mobile (unit) | Hồ sơ (`__tests__/profile/`) | 5 | 37 | 37 | 0 | 0 |
| Mobile (unit) | Khác (`__tests__/App.test.tsx`) | 1 | 1 | 1 | 0 | 0 |
| Mobile (unit) | Khác (`__tests__/healthCalculator.test.ts`) | 1 | 13 | 13 | 0 | 0 |
| Mobile (unit) | Máy quét (barcode, tủ lạnh) (`__tests__/scanner/`) | 2 | 14 | 14 | 0 | 0 |
| Mobile (unit) | Nhật ký dinh dưỡng (`__tests__/nutrition/`) | 6 | 100 | 100 | 0 | 0 |
| Mobile (unit) | Premium (`__tests__/premium/`) | 6 | 49 | 49 | 0 | 0 |
| Mobile (unit) | Realtime (SignalR) (`__tests__/realtime/`) | 1 | 5 | 5 | 0 | 0 |
| Mobile (unit) | Sức khoẻ (`__tests__/health/`) | 6 | 95 | 95 | 0 | 0 |
| Mobile (unit) | Tiện ích (`__tests__/utils/`) | 1 | 11 | 11 | 0 | 0 |
| Mobile (unit) | Trang chủ (`__tests__/dashboard/`) | 1 | 7 | 7 | 0 | 0 |
| Mobile (unit) | UI dùng chung & theme (`__tests__/ui/`) | 2 | 11 | 11 | 0 | 0 |
| Mobile (unit) | Uống nước (`__tests__/water/`) | 2 | 17 | 17 | 0 | 0 |
| Mobile (unit) | Xác thực (`__tests__/auth/`) | 4 | 68 | 68 | 0 | 0 |
| Mobile (live) | `ai.live.test.ts` | 1 | 7 | 5 | 2 | 0 |
| Mobile (live) | `auth.live.test.ts` | 1 | 12 | 12 | 0 | 0 |
| Mobile (live) | `gamification.live.test.ts` | 1 | 3 | 3 | 0 | 0 |
| Mobile (live) | `health.live.test.ts` | 1 | 7 | 7 | 0 | 0 |
| Mobile (live) | `healthsync.live.test.ts` | 1 | 7 | 7 | 0 | 0 |
| Mobile (live) | `notifications.live.test.ts` | 1 | 2 | 2 | 0 | 0 |
| Mobile (live) | `nutrition.live.test.ts` | 1 | 15 | 15 | 0 | 0 |
| Mobile (live) | `plannerGrocery.live.test.ts` | 1 | 4 | 4 | 0 | 0 |
| Mobile (live) | `premium.live.test.ts` | 1 | 7 | 7 | 0 | 0 |
| Mobile (live) | `recipes.live.test.ts` | 1 | 6 | 6 | 0 | 0 |
| Mobile (live) | `scanner.live.test.ts` | 1 | 4 | 3 | 1 | 0 |
| Mobile (live) | `water.live.test.ts` | 1 | 8 | 8 | 0 | 0 |


## 4. Chi tiết các Test Case bị lỗi (Failed Test Cases Log)

### 🔴 Fail 01: `Recipes_tagged_quick_take_at_most_15_minutes` — 7 món gắn tag "Nhanh Gọn (< 15 phút)" nhưng nấu lâu hơn

**File:** `backend/SmartMeal.Tests/RecipeSeedQualityTests.cs:127`

**Lỗi nhận được (Error Output):**
```
Assert.True() Failure
7 vi phạm:
Bò cuộn nấm kim châm nướng sốt tương: 20 phút
Canh chua cá lóc rau muống bắp chuối: 30 phút
Canh rong biển đậu hũ non thịt bằm: 18 phút
Cháo yến mạch thịt bò bằm cà rốt: 20 phút
Miến dong xào tôm nõn rau củ thập cẩm: 23 phút
Mực nang hấp gừng sả chấm mắm ớt: 18 phút
Salad tôm bơ trứng luộc sốt mè rang: 16 phút
```

**Nguyên nhân nghi vấn:** dữ liệu seed (`DbInitializer.Recipes.cs`, commit `dd46fbb`) gắn `quick` mà không đối chiếu `PrepTimeMinutes + CookTimeMinutes`. Người dùng lọc "Nhanh" thấy món 30 phút. Form thêm món của Admin Web còn ghi nhãn "Nhanh Dưới 20p" nên lỗi sẽ tiếp tục phát sinh (xem báo cáo Web Admin, Fail 32). **Đề xuất:** bỏ tag `quick` ở 7 món trên (hoặc sửa thời gian nếu số liệu sai).

### 🔴 Fail 02: `An_allergen_named_in_the_title_is_reported_in_the_recipe_allergy_list` — 7 món có chất gây dị ứng ngay trong tên nhưng không khai báo (BR-102)

**File:** `backend/SmartMeal.Tests/RecipeSeedQualityTests.cs:173`

**Lỗi nhận được (Error Output):**
```
7 vi phạm:
Bánh mì nướng bơ tỏi kẹp phô mai ít béo: tên món có 'dairy' nhưng AllergyIds = [5]
Bún bò xào Nam Bộ rau sống đậu phộng: tên món có 'peanut' nhưng AllergyIds = []
Bún riêu cua bắp bò đậu hũ Eat Clean: tên món có 'seafood' nhưng AllergyIds = [6]
Pudding hạt chia sữa hạnh nhân xoài cát: tên món có 'treeNut' nhưng AllergyIds = []
Salad cầu vồng bơ hạt dẻ sốt chanh leo: tên món có 'treeNut' nhưng AllergyIds = []
Sữa chua Hy Lạp mix dâu tây granola hạt óc chó: tên món có 'treeNut' nhưng AllergyIds = [3, 5]
Thanh ngũ cốc Granola mật ong hạt điều: tên món có 'treeNut' nhưng AllergyIds = [5]
```

**Nguyên nhân nghi vấn:** `AllergyIds` của món được suy ra từ nguyên liệu; 7 món trên không có nguyên liệu mang dị ứng tương ứng (vd. "đậu phộng" chỉ nằm trong tên, không có trong danh sách nguyên liệu). **Mức độ nghiêm trọng:** người dị ứng đậu phộng / hải sản / hạt vẫn được gợi ý món nguy hiểm, và thực đơn tự động coi các món này là "an toàn". **Đề xuất:** bổ sung nguyên liệu (phô mai, đậu phộng, cua, hạnh nhân, hạt dẻ, óc chó, hạt điều) có `IngredientAllergies` đúng cho 7 món.

### 🔴 Fail 03: `Excluding_my_allergens_hides_dishes_whose_name_mentions_one_of_them` — người dị ứng vẫn thấy 6 món nguy hiểm

**File:** `backend/SmartMeal.Tests/RecipeSeedQualityTests.cs:206`

**Lỗi nhận được (Error Output):**
```
6 vi phạm:
Bánh mì nướng bơ tỏi kẹp phô mai ít béo (dairy)
Bún bò xào Nam Bộ rau sống đậu phộng (peanut)
Bún riêu cua bắp bò đậu hũ Eat Clean (seafood)
Pudding hạt chia sữa hạnh nhân xoài cát (treeNut)
Salad cầu vồng bơ hạt dẻ sốt chanh leo (treeNut)
Thanh ngũ cốc Granola mật ong hạt điều (treeNut)
```

**Nguyên nhân nghi vấn:** hệ quả trực tiếp của Fail 02 — bộ lọc `excludeMyAllergens` đúng logic nhưng dữ liệu dị ứng của món thiếu. **Đề xuất:** như Fail 02; sau khi sửa seed, chạy lại `RecipeSeedQualityTests`.

### 🔴 Fail 04: `categorizeIngredient()` — "Chuối tiêu" bị xếp vào nhóm Gia vị

**File:** `frontend/SmartMealMobile/__tests__/grocery/groceryAggregation.test.ts:32`

**Lỗi nhận được (Error Output):**
```
expect(received).not.toBe(expected) // Object.is equality

Expected: not "Gia vị"
```

**Nguyên nhân nghi vấn:** `categorizeIngredient` (`src/features/grocery/utils/groceryAggregation.ts:33`) so khớp chuỗi con với từ khóa nhóm Gia vị (`'tiêu'`, dòng 26) nên "Chuối **tiêu**" (một loại chuối) rơi vào Gia vị trên danh sách đi chợ. **Đề xuất:** so khớp theo ranh giới từ / ưu tiên khớp dài nhất, hoặc kiểm tra nhóm Trái cây trước.

### 🔴 Fail 05 → 24: 20 test backend có sẵn hỏng từ commit `dd46fbb` "Feat: add food list"

**Nguyên nhân chung:** các test được viết khi seed chỉ có **6 món / 27 thực phẩm**. Commit `dd46fbb` thêm 50 món và 34 thực phẩm vào seed, nên (a) các số đếm cứng (6, 27, 2…) sai, (b) helper `Single(r => r.Title.Contains("…"))` khớp nhiều món (vd. "Ức gà" xuất hiện ở nhiều tên món mới) → `InvalidOperationException`. Đây chủ yếu là **kỳ vọng lỗi thời của test**, không phải lỗi API — riêng `Auto_generate_creates_nothing_and_says_why_when_no_recipe_is_safe` trả 200 vì các món mới thiếu khai báo dị ứng (Fail 02) nên bị coi là "an toàn". CI backend trên `main` vì vậy vẫn đỏ từ 21/10.

| Fail | Test | File | Lỗi nhận được (rút gọn) |
|---|---|---|---|
| 05 | `The_list_is_public_and_every_recipe_reports_its_allergens` | `RecipeTests.cs:60` | Expected: 6 · Actual: 56 |
| 06 | `Excluding_my_allergens_removes_every_recipe_that_contains_one` | `RecipeTests.cs:82` | Expected: 6 · Actual: 56 |
| 07 | `A_user_without_declared_allergies_still_sees_everything` | `RecipeTests.cs:102` | Expected: 6 · Actual: 56 |
| 08 | `Paging_returns_the_page_and_reports_totals_in_headers_while_data_stays_an_array` | `RecipeTests.cs:113` | X-Total-Count Expected: "6" · Actual: "56" |
| 09 | `Meal_type_filter_keeps_only_matching_recipes_and_rejects_unknown_values` | `RecipeTests.cs:137` | Expected: 2 · Actual: 18 |
| 10 | `Max_cook_time_filter_uses_prep_plus_cook_minutes` | `RecipeTests.cs:149` | Expected: 2 · Actual: 14 |
| 11 | `Search_ignores_case_and_vietnamese_diacritics` | `RecipeTests.cs:161` | Expected: 2 · Actual: 7 |
| 12 | `The_owner_can_rename_fill_empty_and_delete_a_collection` | `RecipeTests.cs:285` | Expected: 6 · Actual: 56 |
| 13 | `Auto_generated_plans_never_contain_my_allergens_and_do_not_fall_back_when_nothing_is_safe` | `RecipeTests.cs:340` | InvalidOperationException: Sequence contains more than one matching element |
| 14 | `Auto_generate_creates_nothing_and_says_why_when_no_recipe_is_safe` | `RecipeTests.cs:370` | Expected: BadRequest · Actual: OK |
| 15 | `Recipes_warn_about_the_viewers_conditions_and_expose_stable_tag_codes` | `RecipeTests.cs:394` | InvalidOperationException: Sequence contains more than one matching element |
| 16 | `Vietnamese_dishes_are_searchable_with_or_without_diacritics_and_carry_servings` | `FoodTests.cs:73` | "phở" trả 3 món, "PHO BO" trả 1 món (kỳ vọng hai tập bằng nhau) |
| 17 | `Existing_ingredients_stay_verified_and_get_a_default_serving` | `FoodTests.cs:88` | Expected: 27 · Actual: 61 |
| 18 | `Listing_pages_and_filters_by_category` | `FoodTests.cs:119` | Expected: 27 · Actual: 61 |
| 19 | `A_custom_food_is_labelled_unverified_and_visible_only_to_its_owner` | `FoodTests.cs:162` | Expected: 28 · Actual: 62 |
| 20 | `Deleting_my_personal_data_removes_my_custom_foods_and_favorites` | `FoodTests.cs:315` | Expected: 27 · Actual: 61 |
| 21 | `Generating_merges_the_same_ingredient_and_reports_how_many_meals_it_came_from` | `GroceryTests.cs:62` | InvalidOperationException: Sequence contains more than one matching element |
| 22 | `Regenerating_replaces_the_generated_lines_but_keeps_items_the_user_added` | `GroceryTests.cs:140` | InvalidOperationException: Sequence contains more than one matching element |
| 23 | `Carry_over_keeps_leftovers_and_adds_the_new_week_on_top` | `GroceryTests.cs:158` | InvalidOperationException: Sequence contains more than one matching element |
| 24 | `Completing_records_the_trip_with_its_real_cost_and_carries_pending_items_into_next_week` | `GroceryTests.cs:306` | InvalidOperationException: Sequence contains more than one matching element |

**Đề xuất:** cập nhật test dùng số đếm động (lấy từ API trước khi thêm dữ liệu) và tên món đủ cụ thể cho `Single(...)`, hoặc seed bộ món mở rộng chỉ ở Development (tách khỏi môi trường Testing).

### 🔴 Fail 25, 26: Live test AI gửi dữ liệu tổng hợp tới Gemini thật

| Fail | Test | File | Lỗi nhận được |
|---|---|---|---|
| 25 | `AI (backend thật) › Voice Log từ file ghi âm: gửi multipart audio, trả món + câu chép lời, trừ đúng một lượt` | `__tests__/live/ai.live.test.ts:60` | `Error: Chưa nghe ra món ăn nào trong đoạn ghi âm. Hãy nói rõ hơn hoặc gõ bữa ăn của bạn.` (từ `aiService.api.ts:89`) |
| 26 | `scanner (backend thật) › đọc nhãn: ảnh gửi multipart image tới /ai/scan-label, kết quả bản demo được gắn cờ` | `__tests__/live/scanner.live.test.ts:89` | `expect(received).toBeGreaterThan(expected) — Expected: > 0, Received: 0` |

**Nguyên nhân nghi vấn:** fixture là âm thanh / ảnh nhãn **tổng hợp** (không có lời nói / chữ thật) nên Gemini trả về rỗng — đúng hành vi; luồng multipart, hạn mức và thông báo lỗi đều hoạt động. **Đề xuất:** thay fixture bằng file ghi âm và ảnh nhãn thật, hoặc tách 2 test này khỏi bộ live mặc định.

### 🔴 Fail 27 (chỉ ở lượt live lần 2): Gemini hết hạn mức miễn phí trong ngày

| Fail | Test | File | Lỗi nhận được |
|---|---|---|---|
| 27 | `AI (backend thật) › Voice Log từ văn bản: trả các món kèm dinh dưỡng, bữa theo lựa chọn, và trừ đúng một lượt` | `__tests__/live/ai.live.test.ts:47` | `ApiError: Dịch vụ AI đang gặp sự cố, vui lòng thử lại sau.` |

**Nguyên nhân:** môi trường, không phải lỗi code — đây là lượt live thứ hai trong ngày; log backend ghi 9 lần `Gemini API returned error code TooManyRequests for model gemini-3.8-flash` (hạn mức miễn phí ~20 yêu cầu/ngày đã dùng hết ở các lượt trước) và model dự phòng `gemini-flash-lite-latest` cũng không trả được kết quả cho yêu cầu này. Test này PASS ở lượt live lần 1 cùng ngày (80/82). App hiển thị đúng thông báo lỗi thân thiện. **Đề xuất:** chạy bộ live AI với API key có hạn mức trả phí, hoặc tách các test gọi Gemini thật ra lịch chạy riêng.

### ⚠️ Môi trường lần chạy này

| Hạng mục | Ghi chú |
|---|---|
| `node_modules` của SmartMealMobile | Đủ so với `package-lock.json` (lần trước thiếu `expo-image-manipulator`) — không phải cài bổ sung |
| `FridgeScreen.test.tsx` | Không vượt timeout (chạy khi máy rảnh) |
| Gemini | Lượt live lần 2 gặp 429 TooManyRequests (hết hạn mức miễn phí trong ngày) → Fail 27 |
| Backend Docker | Build lại image từ mã đã sửa (migration `UserTokenVersion` áp lên DB dev khi khởi động), chạy với override live-test trong thư mục tạm (rate limit 100000/phút, tắt SMTP, không bắt xác minh email, bật mock activation); không sửa `backend/.env` |

## 5. Kết luận & Đánh giá (Conclusion)

**Trạng thái Code Base:** ⚠️ **Chưa sẵn sàng merge / deploy** — không có lỗi mới, nhưng toàn bộ lỗi của báo cáo 21/10 vẫn còn.

- **Backend:** logic API ổn định; mọi FAIL đến từ **dữ liệu seed** của commit `dd46fbb`: 20 test cũ hỏng do kỳ vọng lỗi thời (CI `main` vẫn đỏ) và 3 test chất lượng dữ liệu phát hiện lỗi thật, trong đó **thiếu khai báo dị ứng (BR-102) là nghiêm trọng**.
- **Mobile:** 586/587 unit test PASS (1 lỗi nhỏ `categorizeIngredient`); live test với backend thật 79/82 ở lần 2 (lần 1: 80/82) — 2 FAIL do fixture AI tổng hợp, 1 do Gemini hết hạn mức ngày; bộ đăng nhập / phiên 12/12 PASS sau thay đổi `TokenVersion` ở backend. Bản sửa splash screen `3bf9673` đã có test hồi quy (7/7 PASS).
- **Coverage:** Backend Lines 92.0% / Functions 97.1% đạt, Branches 75.4% chưa đạt; Mobile chưa đạt 80% (toàn `src/` 34.0% lines, lớp logic 60.2%) vì thiếu test màn hình và `meal-planner`.

**Kế hoạch tiếp theo:**

1. **[Cao]** Bổ sung nguyên liệu gây dị ứng cho 7 món (Fail 02/03) trong `DbInitializer.Recipes.cs`; chạy lại `RecipeSeedQualityTests` và `RecipeTests`.
2. **[Cao]** Làm xanh CI backend: cập nhật 20 test có kỳ vọng lỗi thời hoặc tách seed mở rộng khỏi môi trường Testing (Fail 05–24).
3. **[Trung bình]** Bỏ tag `quick` ở 7 món nấu > 15 phút (Fail 01). (Admin Web đã sửa nhãn và backend đã chặn gắn tag này cho món > 15 phút khi tạo / sửa qua Admin, nhưng dữ liệu seed hiện có vẫn sai.)
4. **[Thấp]** Sửa `categorizeIngredient()` khớp theo ranh giới từ (Fail 04).
5. Nâng coverage mobile: test cho `meal-planner`, các screen/hook chính (Diary, Grocery, Recipe Detail…) và test riêng cho fallback 3 s ẩn splash trong `App.tsx`; nâng branch coverage `SmartMeal.API` (68%).
6. Thay fixture tổng hợp của 2 live test AI bằng ghi âm / ảnh nhãn thật (Fail 25–26); chạy bộ live AI bằng API key có hạn mức trả phí (Fail 27).

---

## Phụ lục A: Danh sách đầy đủ test case

Mỗi bảng có thể mở/đóng. "Đúng như mong đợi" = mọi assertion của test case đều đạt; với test FAIL, cột Actual Result là thông báo lỗi rút gọn (chi tiết ở mục 4).

<!-- APPENDIX:START -->

### A.1 Backend — xUnit (SmartMeal.Tests, trừ `AdminApiTests`)

<details><summary><b>AiTests</b> — AI (Snap & Track, giọng nói, nhãn, tủ lạnh, hạn mức) · 25/25 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 1 | `AiTests` | A barcode is checked against the database and never sent to the ai | Đúng như mong đợi | 🟢 PASS | 9.41s |
| 2 | `AiTests` | A label photo is read by the ai checked by code and does not use quota | Đúng như mong đợi | 🟢 PASS | 2.76s |
| 3 | `AiTests` | A label without some numbers is still read when the model answers null | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 4 | `AiTests` | A model that answers too slowly gives way to the next model | Đúng như mong đợi | 🟢 PASS | 8.79s |
| 5 | `AiTests` | A real upstream failure is a 502 and never fake data unless demo is enabled | Đúng như mong đợi | 🟢 PASS | 9.17s |
| 6 | `AiTests` | A rejected request is not retried on other models | Đúng như mong đợi | 🟢 PASS | 2.53s |
| 7 | `AiTests` | A retired or overloaded model falls back to the next configured model | Đúng như mong đợi | 🟢 PASS | 2.86s |
| 8 | `AiTests` | A snapped photo is kept logged with the meal and removed with the last item using it | Đúng như mong đợi | 🟢 PASS | 8.41s |
| 9 | `AiTests` | An answer wrapped in an array or a code fence is still read | Đúng như mong đợi | 🟢 PASS | 2.41s |
| 10 | `AiTests` | Demo mode must be enabled explicitly and is labelled | Đúng như mong đợi | 🟢 PASS | 10.39s |
| 11 | `AiTests` | Every ai endpoint requires authentication | Đúng như mong đợi | 🟢 PASS | 0.06s |
| 12 | `AiTests` | Free accounts have a daily quota that pro accounts do not | Đúng như mong đợi | 🟢 PASS | 2.69s |
| 13 | `AiTests` | Gemini is asked to think less by default so answers come back faster | Đúng như mong đợi | 🟢 PASS | 0.21s |
| 14 | `AiTests` | In development a configured key reports gemini failures instead of returning demo data | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 15 | `AiTests` | Live captions are rate limited per user | Đúng như mong đợi | 🟢 PASS | 10.87s |
| 16 | `AiTests` | Live captions transcribe the recording without using quota but stop once the quota is gone | Đúng như mong đợi | 🟢 PASS | 2.73s |
| 17 | `AiTests` | Pro only features are refused to free accounts by the server not just hidden in the app | Đúng như mong đợi | 🟢 PASS | 0.58s |
| 18 | `AiTests` | Scanning endpoints are rate limited per user | Đúng như mong đợi | 🟢 PASS | 2.92s |
| 19 | `AiTests` | Text inputs are validated | Đúng như mong đợi | 🟢 PASS | 2.08s |
| 20 | `AiTests` | The gemini key is sent in a header and never in the url | Đúng như mong đợi | 🟢 PASS | 10.75s |
| 21 | `AiTests` | The server adds allergy warnings the model forgot and flags unsafe products | Đúng như mong đợi | 🟢 PASS | 2.94s |
| 22 | `AiTests` | Uploaded images are limited in size and checked by content | Đúng như mong đợi | 🟢 PASS | 2.66s |
| 23 | `AiTests` | Usage from before today does not count | Đúng như mong đợi | 🟢 PASS | 20.48s |
| 24 | `AiTests` | Voice can be sent as a recording and comes back with its transcript | Đúng như mong đợi | 🟢 PASS | 2.59s |
| 25 | `AiTests` | Without a gemini key the api reports it instead of returning fake data and uses no quota | Đúng như mong đợi | 🟢 PASS | 11.60s |

</details>

<details><summary><b>RecipeSeedQualityTests</b> — Chất lượng dữ liệu seed công thức · 4/7 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 26 | `RecipeSeedQualityTests` | An allergen named in the title is reported in the recipe allergy list | 7 vi phạm: Bánh mì nướng bơ tỏi kẹp phô mai ít béo: tên món có 'dairy' nhưng AllergyIds = [5] Bún bò xào Nam Bộ rau sống đậu phộng: tên món có 'peanut' nhưng AllergyIds = [] Bún… | 🔴 FAIL | 0.46s |
| 27 | `RecipeSeedQualityTests` | Calories per serving agree with the macros within 20 percent | Đúng như mong đợi | 🟢 PASS | 0.21s |
| 28 | `RecipeSeedQualityTests` | Every seeded recipe has ingredients tags and values the app understands | Đúng như mong đợi | 🟢 PASS | 0.22s |
| 29 | `RecipeSeedQualityTests` | Excluding my allergens hides dishes whose name mentions one of them | 6 vi phạm: Bánh mì nướng bơ tỏi kẹp phô mai ít béo (dairy) Bún bò xào Nam Bộ rau sống đậu phộng (peanut) Bún riêu cua bắp bò đậu hũ Eat Clean (seafood) Pudding hạt chia sữa hạnh… | 🔴 FAIL | 4.80s |
| 30 | `RecipeSeedQualityTests` | Recipes tagged quick take at most 15 minutes | 7 vi phạm: Bò cuộn nấm kim châm nướng sốt tương: 20 phút Canh chua cá lóc rau muống bắp chuối: 30 phút Canh rong biển đậu hũ non thịt bằm: 18 phút Cháo yến mạch thịt bò bằm cà r… | 🔴 FAIL | 17.52s |
| 31 | `RecipeSeedQualityTests` | Seeding again adds no duplicate recipes or ingredients | Đúng như mong đợi | 🟢 PASS | 0.62s |
| 32 | `RecipeSeedQualityTests` | Vegan recipes have no animal ingredients and vegetarian ones have no meat or seafood | Đúng như mong đợi | 🟢 PASS | 0.22s |

</details>

<details><summary><b>CollectionShareTests</b> — Chia sẻ bộ sưu tập · 3/3 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 33 | `CollectionShareTests` | Anyone with the link can view a private collection read only | Đúng như mong đợi | 🟢 PASS | 2.37s |
| 34 | `CollectionShareTests` | Only the owner can share and unknown links are not found | Đúng như mong đợi | 🟢 PASS | 3.68s |
| 35 | `CollectionShareTests` | Sharing again keeps the link regenerating replaces it and revoking closes it | Đúng như mong đợi | 🟢 PASS | 10.06s |

</details>

<details><summary><b>RecipeTests</b> — Công thức, yêu thích, bộ sưu tập · 8/19 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 36 | `RecipeTests` | A user without declared allergies still sees everything | Assert.Equal() Failure: Values differ Expected: 6 Actual: 56 | 🔴 FAIL | 1.22s |
| 37 | `RecipeTests` | Auto generate creates nothing and says why when no recipe is safe | Assert.Equal() Failure: Values differ Expected: BadRequest Actual: OK | 🔴 FAIL | 9.61s |
| 38 | `RecipeTests` | Auto generated plans never contain my allergens and do not fall back when nothing is safe | System.InvalidOperationException : Sequence contains more than one matching element | 🔴 FAIL | 1.71s |
| 39 | `RecipeTests` | Collection validation and missing targets return proper errors | Đúng như mong đợi | 🟢 PASS | 0.97s |
| 40 | `RecipeTests` | Detail is public reports my favorite flag and 404s for unknown ids | Đúng như mong đợi | 🟢 PASS | 1.80s |
| 41 | `RecipeTests` | Excluding allergens needs a login | Đúng như mong đợi | 🟢 PASS | 0.02s |
| 42 | `RecipeTests` | Excluding my allergens removes every recipe that contains one | Assert.Equal() Failure: Values differ Expected: 6 Actual: 56 | 🔴 FAIL | 7.95s |
| 43 | `RecipeTests` | Max cook time filter uses prep plus cook minutes | Assert.Equal() Failure: Values differ Expected: 2 Actual: 14 | 🔴 FAIL | 0.58s |
| 44 | `RecipeTests` | Meal type filter keeps only matching recipes and rejects unknown values | Assert.Equal() Failure: Values differ Expected: 2 Actual: 18 | 🔴 FAIL | 0.42s |
| 45 | `RecipeTests` | Only the owner may change a collection even when it is public | Đúng như mong đợi | 🟢 PASS | 2.00s |
| 46 | `RecipeTests` | Paging returns the page and reports totals in headers while data stays an array | Assert.Equal() Failure: Strings differ ↓ (pos 0) Expected: "6" Actual: "56" ↑ (pos 0) | 🔴 FAIL | 0.13s |
| 47 | `RecipeTests` | Pantry suggestions match without diacritics and never include my allergens | Đúng như mong đợi | 🟢 PASS | 0.70s |
| 48 | `RecipeTests` | Pantry suggestions need at least one ingredient | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 49 | `RecipeTests` | Recipes warn about the viewers conditions and expose stable tag codes | System.InvalidOperationException : Sequence contains more than one matching element | 🔴 FAIL | 1.25s |
| 50 | `RecipeTests` | Search ignores case and vietnamese diacritics | Assert.Equal() Failure: Values differ Expected: 2 Actual: 7 | 🔴 FAIL | 0.77s |
| 51 | `RecipeTests` | The list is public and every recipe reports its allergens | Assert.Equal() Failure: Values differ Expected: 6 Actual: 56 | 🔴 FAIL | 0.13s |
| 52 | `RecipeTests` | The owner can rename fill empty and delete a collection | Assert.Equal() Failure: Values differ Expected: 6 Actual: 56 | 🔴 FAIL | 1.38s |
| 53 | `RecipeTests` | Toggling a favorite twice removes it and unknown recipes are 404 | Đúng như mong đợi | 🟢 PASS | 1.59s |
| 54 | `RecipeTests` | When every match is unsafe the suggestions are empty with a message not a fallback | Đúng như mong đợi | 🟢 PASS | 1.47s |

</details>

<details><summary><b>FoodTests</b> — Danh mục thực phẩm · 8/13 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 55 | `FoodTests` | A custom food is labelled unverified and visible only to its owner | Assert.Equal() Failure: Values differ Expected: 28 Actual: 62 | 🔴 FAIL | 6.20s |
| 56 | `FoodTests` | A custom food keeps the servings and allergens the user entered | Đúng như mong đợi | 🟢 PASS | 2.44s |
| 57 | `FoodTests` | Barcode lookup finds the users own product and 404s otherwise | Đúng như mong đợi | 🟢 PASS | 11.61s |
| 58 | `FoodTests` | Custom food input is validated without inventing numbers | Đúng như mong đợi | 🟢 PASS | 1.14s |
| 59 | `FoodTests` | Deleting my personal data removes my custom foods and favorites | Assert.Equal() Failure: Values differ Expected: 27 Actual: 61 | 🔴 FAIL | 4.91s |
| 60 | `FoodTests` | Existing ingredients stay verified and get a default serving | Assert.Equal() Failure: Values differ Expected: 27 Actual: 61 | 🔴 FAIL | 0.13s |
| 61 | `FoodTests` | Favoriting is idempotent listed by scope and limited to visible foods | Đúng như mong đợi | 🟢 PASS | 3.70s |
| 62 | `FoodTests` | Foods report every allergen they contain | Đúng như mong đợi | 🟢 PASS | 0.08s |
| 63 | `FoodTests` | Listing pages and filters by category | Assert.Equal() Failure: Values differ Expected: 27 Actual: 61 | 🔴 FAIL | 0.96s |
| 64 | `FoodTests` | Only the owner can delete a custom food and logged meals survive | Đúng như mong đợi | 🟢 PASS | 7.42s |
| 65 | `FoodTests` | Recent foods come from the diary most recent first | Đúng như mong đợi | 🟢 PASS | 16.39s |
| 66 | `FoodTests` | Unknown scope is rejected and personal scopes need a login | Đúng như mong đợi | 🟢 PASS | 0.03s |
| 67 | `FoodTests` | Vietnamese dishes are searchable with or without diacritics and carry servings | Assert.Equal() Failure: Collections differ ↓ (pos 1) Expected: [1b40f302-de8e-47e7-9f96-45bf42359674, 49550ed7-67a3-46ed-9c65-30b98cde19e9, f0ceb8fa-47cc-4b78-a545-6493cd4204f3]… | 🔴 FAIL | 0.16s |

</details>

<details><summary><b>GroceryTests</b> — Danh sách đi chợ · 12/16 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 68 | `GroceryTests` | Carry over keeps leftovers and adds the new week on top | System.InvalidOperationException : Sequence contains more than one matching element | 🔴 FAIL | 2.62s |
| 69 | `GroceryTests` | Check all marks every item and can be undone | Đúng như mong đợi | 🟢 PASS | 3.75s |
| 70 | `GroceryTests` | Check all only touches the callers own list | Đúng như mong đợi | 🟢 PASS | 5.98s |
| 71 | `GroceryTests` | Clear checked removes only bought items | Đúng như mong đợi | 🟢 PASS | 3.03s |
| 72 | `GroceryTests` | Completing records the trip with its real cost and carries pending items into next week | System.InvalidOperationException : Sequence contains more than one matching element | 🔴 FAIL | 2.97s |
| 73 | `GroceryTests` | Completing without a plan for next week keeps pending items and still succeeds | Đúng như mong đợi | 🟢 PASS | 2.94s |
| 74 | `GroceryTests` | Completing without keeping empties the list and an empty list cannot be completed | Đúng như mong đợi | 🟢 PASS | 3.44s |
| 75 | `GroceryTests` | Countable ingredients are priced per unit not per hundred | Đúng như mong đợi | 🟢 PASS | 2.64s |
| 76 | `GroceryTests` | Custom items are validated and the list needs a login | Đúng như mong đợi | 🟢 PASS | 3.26s |
| 77 | `GroceryTests` | Generating merges the same ingredient and reports how many meals it came from | System.InvalidOperationException : Sequence contains more than one matching element | 🔴 FAIL | 2.49s |
| 78 | `GroceryTests` | Generating validates the range and needs planned meals | Đúng như mong đợi | 🟢 PASS | 3.21s |
| 79 | `GroceryTests` | Items belong to their owner and missing ones are 404 | Đúng như mong đợi | 🟢 PASS | 5.98s |
| 80 | `GroceryTests` | Kilograms and grams of one ingredient are merged in grams | Đúng như mong đợi | 🟢 PASS | 15.48s |
| 81 | `GroceryTests` | Regenerating replaces the generated lines but keeps items the user added | System.InvalidOperationException : Sequence contains more than one matching element | 🔴 FAIL | 2.10s |
| 82 | `GroceryTests` | The list knows which week it was made for and which items were added by hand | Đúng như mong đợi | 🟢 PASS | 21.61s |
| 83 | `GroceryTests` | The same dish planned on two days doubles the amount and the meal count | Đúng như mong đợi | 🟢 PASS | 3.07s |

</details>

<details><summary><b>VietQrBanksTests</b> — Danh sách ngân hàng VietQR · 12/12 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 84 | `VietQrBanksTests` | App deep links are the only allowed return targets | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 85 | `VietQrBanksTests` | Known banks map to their lowercase vietqr code (bankCode: " TPBank ", expected: "tpb") | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 86 | `VietQrBanksTests` | Known banks map to their lowercase vietqr code (bankCode: "970422", expected: "mb") | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 87 | `VietQrBanksTests` | Known banks map to their lowercase vietqr code (bankCode: "MB", expected: "mb") | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 88 | `VietQrBanksTests` | Known banks map to their lowercase vietqr code (bankCode: "mbbank", expected: "mb") | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 89 | `VietQrBanksTests` | Known banks map to their lowercase vietqr code (bankCode: "MBBank", expected: "mb") | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 90 | `VietQrBanksTests` | Known banks map to their lowercase vietqr code (bankCode: "VCB", expected: "vcb") | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 91 | `VietQrBanksTests` | Known banks map to their lowercase vietqr code (bankCode: "Vietcombank", expected: "vcb") | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 92 | `VietQrBanksTests` | Known banks map to their lowercase vietqr code (bankCode: "VietinBank", expected: "icb") | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 93 | `VietQrBanksTests` | Unknown banks have no code (bankCode: "") | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 94 | `VietQrBanksTests` | Unknown banks have no code (bankCode: "NotABank") | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 95 | `VietQrBanksTests` | Unknown banks have no code (bankCode: null) | Đúng như mong đợi | 🟢 PASS | 0.00s |

</details>

<details><summary><b>OtherAllergiesTests</b> — Dị ứng tự khai báo · 4/4 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 96 | `OtherAllergiesTests` | A keyword that matches nothing changes nothing | Đúng như mong đợi | 🟢 PASS | 1.55s |
| 97 | `OtherAllergiesTests` | Keywords match whole words and respect diacritics | Đúng như mong đợi | 🟢 PASS | 0.05s |
| 98 | `OtherAllergiesTests` | Recipes pantry planner and detail respect other allergies | Đúng như mong đợi | 🟢 PASS | 10.16s |
| 99 | `OtherAllergiesTests` | Survey stores other allergies and put changes keeps or clears them | Đúng như mong đợi | 🟢 PASS | 1.94s |

</details>

<details><summary><b>AuthTests</b> — Đăng ký / đăng nhập / refresh / khóa tài khoản · 15/15 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 100 | `AuthTests` | A successful login resets the failed attempt counter | Đúng như mong đợi | 🟢 PASS | 49.15s |
| 101 | `AuthTests` | Accounts registered with email report that they have a password | Đúng như mong đợi | 🟢 PASS | 1.48s |
| 102 | `AuthTests` | Accounts without a password report it and cannot sign in with a password | Đúng như mong đợi | 🟢 PASS | 1.90s |
| 103 | `AuthTests` | An expired access token is reported as token expired | Đúng như mong đợi | 🟢 PASS | 0.02s |
| 104 | `AuthTests` | Auth endpoints are rate limited per client | Đúng như mong đợi | 🟢 PASS | 13.43s |
| 105 | `AuthTests` | Duplicate email is rejected regardless of case | Đúng như mong đợi | 🟢 PASS | 1.20s |
| 106 | `AuthTests` | Expired and unknown refresh tokens are rejected | Đúng như mong đợi | 🟢 PASS | 12.14s |
| 107 | `AuthTests` | Google login endpoint requires an ID token | Đúng như mong đợi | 🟢 PASS | 0.04s |
| 108 | `AuthTests` | Logout revokes the refresh token and is idempotent | Đúng như mong đợi | 🟢 PASS | 0.87s |
| 109 | `AuthTests` | Profile update validates the avatar url and can clear it | Đúng như mong đợi | 🟢 PASS | 1.25s |
| 110 | `AuthTests` | Refresh rotates the token and the old one no longer works | Đúng như mong đợi | 🟢 PASS | 2.66s |
| 111 | `AuthTests` | Register and login issue an access token and a refresh token | Đúng như mong đợi | 🟢 PASS | 1.79s |
| 112 | `AuthTests` | Reusing a rotated token after the grace period revokes every session of the user | Đúng như mong đợi | 🟢 PASS | 16.56s |
| 113 | `AuthTests` | Too many wrong passwords lock the account even for the correct password | Đúng như mong đợi | 🟢 PASS | 10.99s |
| 114 | `AuthTests` | Unknown email and wrong password are indistinguishable | Đúng như mong đợi | 🟢 PASS | 2.46s |

</details>

<details><summary><b>GoogleLoginTests</b> — Đăng nhập Google (đã gỡ) · 3/3 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 115 | `GoogleLoginTests` | A new google account is created and signs in again as the same user | Đúng như mong đợi | 🟢 PASS | 0.15s |
| 116 | `GoogleLoginTests` | An invalid token is rejected | Đúng như mong đợi | 🟢 PASS | 0.02s |
| 117 | `GoogleLoginTests` | Google does not take over a password account whose email was never verified | Đúng như mong đợi | 🟢 PASS | 9.08s |

</details>

<details><summary><b>HealthSyncTests</b> — Đồng bộ bước chân / calo (Health Connect, Google Fit) · 9/9 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 118 | `HealthSyncTests` | A day without any sync reports no sources and no last synced time | Đúng như mong đợi | 🟢 PASS | 1.05s |
| 119 | `HealthSyncTests` | Another users data is not visible | Đúng như mong đợi | 🟢 PASS | 8.81s |
| 120 | `HealthSyncTests` | Concurrent syncs for one day and source end with a single record | Đúng như mong đợi | 🟢 PASS | 1.42s |
| 121 | `HealthSyncTests` | Invalid values are rejected | Đúng như mong đợi | 🟢 PASS | 1.86s |
| 122 | `HealthSyncTests` | Posting the same day and source again replaces the values | Đúng như mong đợi | 🟢 PASS | 1.53s |
| 123 | `HealthSyncTests` | Source is case insensitive and an unknown source is rejected | Đúng như mong đợi | 🟢 PASS | 1.60s |
| 124 | `HealthSyncTests` | Summary combines eaten and burned calories with the target | Đúng như mong đợi | 🟢 PASS | 1.56s |
| 125 | `HealthSyncTests` | The highest priority source is used and sources are never summed | Đúng như mong đợi | 🟢 PASS | 1.48s |
| 126 | `HealthSyncTests` | The legacy field names are still accepted | Đúng như mong đợi | 🟢 PASS | 1.11s |

</details>

<details><summary><b>ErrorEnvelopeTests</b> — Envelope lỗi chuẩn (400/401/403/404/500) · 8/8 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 127 | `ErrorEnvelopeTests` | Invalid register body returns 400 with vietnamese error list | Đúng như mong đợi | 🟢 PASS | 0.03s |
| 128 | `ErrorEnvelopeTests` | Invalid token returns 401 envelope | Đúng như mong đợi | 🟢 PASS | 0.09s |
| 129 | `ErrorEnvelopeTests` | Malformed json returns 400 envelope without internal details | Đúng như mong đợi | 🟢 PASS | 0.17s |
| 130 | `ErrorEnvelopeTests` | Missing token returns 401 envelope instead of empty body | Đúng như mong đợi | 🟢 PASS | 9.25s |
| 131 | `ErrorEnvelopeTests` | Unhandled exception returns 500 envelope with trace id and no stack trace | Đúng như mong đợi | 🟢 PASS | 1.77s |
| 132 | `ErrorEnvelopeTests` | Unknown route returns 404 envelope | Đúng như mong đợi | 🟢 PASS | 0.03s |
| 133 | `ErrorEnvelopeTests` | Wrong http method returns 405 envelope | Đúng như mong đợi | 🟢 PASS | 0.03s |
| 134 | `ErrorEnvelopeTests` | Wrong password still returns 401 with message | Đúng như mong đợi | 🟢 PASS | 3.90s |

</details>

<details><summary><b>GamificationTests</b> — Gamification (pet, streak, thử thách, huy hiệu) · 18/18 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 135 | `GamificationTests` | A new user has every badge and costume locked | Đúng như mong đợi | 🟢 PASS | 1.12s |
| 136 | `GamificationTests` | A new user starts at level one with no xp and no streak | Đúng như mong đợi | 🟢 PASS | 1.09s |
| 137 | `GamificationTests` | A streak survives until the end of today without a log | Đúng như mong đợi | 🟢 PASS | 0.95s |
| 138 | `GamificationTests` | An expired unfinished challenge shows as expired and joining again restarts the window | Đúng như mong đợi | 🟢 PASS | 1.50s |
| 139 | `GamificationTests` | Badges unlock from real activity and stay unlocked | Đúng như mong đợi | 🟢 PASS | 4.17s |
| 140 | `GamificationTests` | Completing a challenge awards its xp exactly once and unlocks the backpack | Đúng như mong đợi | 🟢 PASS | 7.07s |
| 141 | `GamificationTests` | Concurrent reads never award the same event twice | Đúng như mong đợi | 🟢 PASS | 1.94s |
| 142 | `GamificationTests` | Costumes can only be worn once unlocked and can be taken off | Đúng như mong đợi | 🟢 PASS | 2.52s |
| 143 | `GamificationTests` | Data for far away dates never earns xp and a bad date is rejected | Đúng như mong đợi | 🟢 PASS | 1.56s |
| 144 | `GamificationTests` | Deleting my data resets xp badges and challenge progress | Đúng như mong đợi | 🟢 PASS | 10.26s |
| 145 | `GamificationTests` | Finishing the daily tasks awards xp once each and never twice | Đúng như mong đợi | 🟢 PASS | 3.14s |
| 146 | `GamificationTests` | Gamification needs a login | Đúng như mong đợi | 🟢 PASS | 0.03s |
| 147 | `GamificationTests` | Joining a challenge starts its window today and is idempotent | Đúng như mong đợi | 🟢 PASS | 1.75s |
| 148 | `GamificationTests` | Parallel joins create a single record | Đúng như mong đợi | 🟢 PASS | 1.74s |
| 149 | `GamificationTests` | The protein badge needs five days on target | Đúng như mong đợi | 🟢 PASS | 2.07s |
| 150 | `GamificationTests` | The streak counts consecutive logged days and keeps the longest run | Đúng như mong đợi | 🟢 PASS | 1.71s |
| 151 | `GamificationTests` | Ticking a grocery item earns the shopper badge even if the list is cleared straight away | Đúng như mong đợi | 🟢 PASS | 1.64s |
| 152 | `GamificationTests` | Water eat clean and step challenges count the days that meet their goal | Đúng như mong đợi | 🟢 PASS | 2.08s |

</details>

<details><summary><b>SubscriptionTests</b> — Gói Pro / Subscription · 8/8 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 153 | `SubscriptionTests` | Activate mock does not exist outside development so nobody can self upgrade | Đúng như mong đợi | 🟢 PASS | 19.10s |
| 154 | `SubscriptionTests` | Activate mock grants pro with an expiry in development and stacks periods | Đúng như mong đợi | 🟢 PASS | 3.78s |
| 155 | `SubscriptionTests` | An expired subscription is no longer pro and reports expired | Đúng như mong đợi | 🟢 PASS | 11.57s |
| 156 | `SubscriptionTests` | Cancelling keeps pro until the expiry date | Đúng như mong đợi | 🟢 PASS | 2.47s |
| 157 | `SubscriptionTests` | Checkout validates the plan and the payment method | Đúng như mong đợi | 🟢 PASS | 3.18s |
| 158 | `SubscriptionTests` | Creating a checkout session does not grant pro and records a pending transaction | Đúng như mong đợi | 🟢 PASS | 2.90s |
| 159 | `SubscriptionTests` | Deleting the account keeps the payment history anonymised | Đúng như mong đợi | 🟢 PASS | 4.64s |
| 160 | `SubscriptionTests` | Plans are public and come from the catalog | Đúng như mong đợi | 🟢 PASS | 0.23s |

</details>

<details><summary><b>HealthProfileTests</b> — Hồ sơ sức khoẻ (BMI/BMR/TDEE) · 21/21 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 161 | `HealthProfileTests` | A back dated weight entry does not override the current weight | Đúng như mong đợi | 🟢 PASS | 2.73s |
| 162 | `HealthProfileTests` | Duplicate ids in the request are stored once | Đúng như mong đợi | 🟢 PASS | 1.02s |
| 163 | `HealthProfileTests` | Enumerations are case insensitive and stored in canonical form | Đúng như mong đợi | 🟢 PASS | 3.12s |
| 164 | `HealthProfileTests` | Gender other currently uses the female bmr formula | Đúng như mong đợi | 🟢 PASS | 2.74s |
| 165 | `HealthProfileTests` | Meta lists expose unique stable codes including the added catalog entries | Đúng như mong đợi | 🟢 PASS | 0.34s |
| 166 | `HealthProfileTests` | Put can change date of birth and age stays consistent | Đúng như mong đợi | 🟢 PASS | 13.71s |
| 167 | `HealthProfileTests` | Put changes only the given fields and recomputes the metrics | Đúng như mong đợi | 🟢 PASS | 3.20s |
| 168 | `HealthProfileTests` | Put replaces the given lists and an empty list clears them | Đúng như mong đợi | 🟢 PASS | 3.67s |
| 169 | `HealthProfileTests` | Put without a profile returns 404 and invalid values return 400 | Đúng như mong đợi | 🟢 PASS | 0.88s |
| 170 | `HealthProfileTests` | Saving the survey again with the same choices works and keeps exactly those choices | Đúng như mong đợi | 🟢 PASS | 3.96s |
| 171 | `HealthProfileTests` | Survey creates the profile and computes metrics | Đúng như mong đợi | 🟢 PASS | 2.32s |
| 172 | `HealthProfileTests` | Survey rejects a future or implausible date of birth | Đúng như mong đợi | 🟢 PASS | 1.88s |
| 173 | `HealthProfileTests` | Survey rejects out of range and unknown values with clear messages | Đúng như mong đợi | 🟢 PASS | 2.64s |
| 174 | `HealthProfileTests` | Survey requires age or date of birth | Đúng như mong đợi | 🟢 PASS | 0.96s |
| 175 | `HealthProfileTests` | Survey with date of birth stores it and derives the age | Đúng như mong đợi | 🟢 PASS | 4.11s |
| 176 | `HealthProfileTests` | Unknown reference ids return 400 not 500 | Đúng như mong đợi | 🟢 PASS | 4.15s |
| 177 | `HealthProfileTests` | Water goal from the profile drives the water endpoints | Đúng như mong đợi | 🟢 PASS | 2.79s |
| 178 | `HealthProfileTests` | Weight history can be limited to the last days without changing the starting weight | Đúng như mong đợi | 🟢 PASS | 7.59s |
| 179 | `HealthProfileTests` | Weight history only grows when the weight actually changes | Đúng như mong đợi | 🟢 PASS | 1.62s |
| 180 | `HealthProfileTests` | Weight log accepts a date without a time zone and validates the range | Đúng như mong đợi | 🟢 PASS | 2.89s |
| 181 | `HealthProfileTests` | Weight log without a profile is rejected | Đúng như mong đợi | 🟢 PASS | 1.20s |

</details>

<details><summary><b>IdempotencyTests</b> — Idempotency (chống ghi trùng) · 5/5 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 182 | `IdempotencyTests` | Keys belong to each user and invalid keys are rejected | Đúng như mong đợi | 🟢 PASS | 16.57s |
| 183 | `IdempotencyTests` | Reusing a key for a different request is refused | Đúng như mong đợi | 🟢 PASS | 2.91s |
| 184 | `IdempotencyTests` | Sending the same request twice with a key writes once and replays the first answer | Đúng như mong đợi | 🟢 PASS | 4.03s |
| 185 | `IdempotencyTests` | Validation errors are replayed but a fixed request needs a new key | Đúng như mong đợi | 🟢 PASS | 3.08s |
| 186 | `IdempotencyTests` | Without a key or with different keys each request is written | Đúng như mong đợi | 🟢 PASS | 3.95s |

</details>

<details><summary><b>PlannerTests</b> — Lên thực đơn (Meal Planner) · 15/15 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 187 | `PlannerTests` | Assign refuses a dish that contains one of the users allergens | Đúng như mong đợi | 🟢 PASS | 4.20s |
| 188 | `PlannerTests` | Assign validates the meal type the recipe and the session | Đúng như mong đợi | 🟢 PASS | 7.54s |
| 189 | `PlannerTests` | Assigning into a slot replaces the dish and normalises the meal type | Đúng như mong đợi | 🟢 PASS | 2.63s |
| 190 | `PlannerTests` | Auto generate adds a snack each day only when asked | Đúng như mong đợi | 🟢 PASS | 4.76s |
| 191 | `PlannerTests` | Auto generate fills every slot once with dishes that suit the meal | Đúng như mong đợi | 🟢 PASS | 3.58s |
| 192 | `PlannerTests` | Auto generate follows the daily calorie target | Đúng như mong đợi | 🟢 PASS | 3.11s |
| 193 | `PlannerTests` | Auto generate leaves out dishes above the limits of the users conditions and says so | Đúng như mong đợi | 🟢 PASS | 2.73s |
| 194 | `PlannerTests` | Auto generate only touches the requested week and the callers own plan | Đúng như mong đợi | 🟢 PASS | 6.97s |
| 195 | `PlannerTests` | Auto generate refuses and keeps the week when no dish fits the users conditions | Đúng như mong đợi | 🟢 PASS | 15.29s |
| 196 | `PlannerTests` | Auto generate replaces the week by default but keeps chosen dishes with keepExisting | Đúng như mong đợi | 🟢 PASS | 3.12s |
| 197 | `PlannerTests` | Completing a meal can be undone and belongs to its owner | Đúng như mong đợi | 🟢 PASS | 6.71s |
| 198 | `PlannerTests` | Completing without a body means done | Đúng như mong đợi | 🟢 PASS | 20.31s |
| 199 | `PlannerTests` | Parallel assignments to the same slot all succeed and leave a single dish | Đúng như mong đợi | 🟢 PASS | 17.75s |
| 200 | `PlannerTests` | Planner endpoints require a login | Đúng như mong đợi | 🟢 PASS | 0.03s |
| 201 | `PlannerTests` | The week lists each days meals in meal order | Đúng như mong đợi | 🟢 PASS | 3.82s |

</details>

<details><summary><b>PasswordTests</b> — Mật khẩu (đổi, quên, OTP) · 15/15 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 202 | `PasswordTests` | A code for one email cannot be used for another | Đúng như mong đợi | 🟢 PASS | 1.80s |
| 203 | `PasswordTests` | A code is single use and expires | Đúng như mong đợi | 🟢 PASS | 2.40s |
| 204 | `PasswordTests` | A wrong code is rejected and five wrong attempts invalidate the code | Đúng như mong đợi | 🟢 PASS | 1.17s |
| 205 | `PasswordTests` | Accounts without a password must use forgot password to create one | Đúng như mong đợi | 🟢 PASS | 2.90s |
| 206 | `PasswordTests` | Change password requires the current password and signs other sessions out | Đúng như mong đợi | 🟢 PASS | 6.77s |
| 207 | `PasswordTests` | Codes are stored as hashes never as plain text | Đúng như mong đợi | 🟢 PASS | 11.98s |
| 208 | `PasswordTests` | Email matching ignores case and the code format is validated | Đúng như mong đợi | 🟢 PASS | 1.43s |
| 209 | `PasswordTests` | Forgot password emails a six digit code and never reveals whether the email exists | Đúng như mong đợi | 🟢 PASS | 1.12s |
| 210 | `PasswordTests` | Guessing the current password through change password locks the account | Đúng như mong đợi | 🟢 PASS | 6.40s |
| 211 | `PasswordTests` | Resending within the cooldown sends nothing new and after it replaces the old code | Đúng như mong đợi | 🟢 PASS | 9.21s |
| 212 | `PasswordTests` | The full flow sets a new password and signs every old session out | Đúng như mong đợi | 🟢 PASS | 9.16s |
| 213 | `PasswordTests` | The reset token is single use tied to the email and the new password is validated | Đúng như mong đợi | 🟢 PASS | 3.82s |
| 214 | `PasswordTests` | Verify email purpose marks the email verified and is a no op when already verified | Đúng như mong đợi | 🟢 PASS | 1.20s |
| 215 | `PasswordTests` | With email verification a new account must enter the emailed code before signing in again | Đúng như mong đợi | 🟢 PASS | 10.79s |
| 216 | `PasswordTests` | Without smtp new accounts are not asked for a code they could never receive | Đúng như mong đợi | 🟢 PASS | 1.97s |

</details>

<details><summary><b>RecipeMigrationTests</b> — Migration — công thức · 1/1 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 217 | `RecipeMigrationTests` | Existing ingredient allergens are copied and old recipes default to every meal | Đúng như mong đợi | 🟢 PASS | 5.31s |

</details>

<details><summary><b>GroceryMigrationTests</b> — Migration — đi chợ · 1/1 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 218 | `GroceryMigrationTests` | Old generated lines count as one meal and custom lines stay at zero | Đúng như mong đợi | 🟢 PASS | 5.92s |

</details>

<details><summary><b>HealthSyncMigrationTests</b> — Migration — đồng bộ sức khoẻ · 1/1 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 219 | `HealthSyncMigrationTests` | Migration keeps the latest row per day and source and normalizes sources | Đúng như mong đợi | 🟢 PASS | 4.19s |

</details>

<details><summary><b>GamificationMigrationTests</b> — Migration — gamification · 1/1 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 220 | `GamificationMigrationTests` | Legacy pets and challenge joins are cleaned and the seed challenges get their rules | Đúng như mong đợi | 🟢 PASS | 17.42s |

</details>

<details><summary><b>SubscriptionMigrationTests</b> — Migration — gói Pro · 1/1 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 221 | `SubscriptionMigrationTests` | Existing pro accounts become premium without expiry and others stay free | Đúng như mong đợi | 🟢 PASS | 9.19s |

</details>

<details><summary><b>HealthMigrationTests</b> — Migration — hồ sơ sức khoẻ · 1/1 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 222 | `HealthMigrationTests` | Existing profiles get the default water goal and catalog entries get codes | Đúng như mong đợi | 🟢 PASS | 3.93s |

</details>

<details><summary><b>DiaryMigrationTests</b> — Migration — nhật ký · 1/1 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 223 | `DiaryMigrationTests` | Migration merges duplicate groups normalizes meal types and keeps every item | Đúng như mong đợi | 🟢 PASS | 4.45s |

</details>

<details><summary><b>PlannerMigrationTests</b> — Migration — thực đơn · 1/1 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 224 | `PlannerMigrationTests` | Duplicate slots are merged keeping the completed one and the slot becomes unique | Đúng như mong đợi | 🟢 PASS | 11.60s |

</details>

<details><summary><b>FoodMigrationTests</b> — Migration — thực phẩm · 1/1 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 225 | `FoodMigrationTests` | Legacy ingredients become verified and startup fills servings search text and dishes once | Đúng như mong đợi | 🟢 PASS | 6.88s |

</details>

<details><summary><b>AuthMigrationTests</b> — Migration — xác thực · 1/1 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 226 | `AuthMigrationTests` | Migration clears duplicate google ids keeping the oldest account and enforces uniqueness | Đúng như mong đợi | 🟢 PASS | 5.13s |

</details>

<details><summary><b>DiaryTests</b> — Nhật ký ăn uống · 13/13 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 227 | `DiaryTests` | Batch log saves all items in order in one call | Đúng như mong đợi | 🟢 PASS | 0.66s |
| 228 | `DiaryTests` | Batch log with an unknown reference saves nothing | Đúng như mong đợi | 🟢 PASS | 0.79s |
| 229 | `DiaryTests` | Concurrent logs for one meal create a single group and every item is listed | Đúng như mong đợi | 🟢 PASS | 1.76s |
| 230 | `DiaryTests` | Invalid numbers and far future dates are rejected | Đúng như mong đợi | 🟢 PASS | 0.83s |
| 231 | `DiaryTests` | Items carry a logging time and come back in logging order | Đúng như mong đợi | 🟢 PASS | 1.43s |
| 232 | `DiaryTests` | Meal type is case insensitive and stored in canonical form | Đúng như mong đợi | 🟢 PASS | 0.69s |
| 233 | `DiaryTests` | Progress covers any range up to 31 days | Đúng như mong đợi | 🟢 PASS | 1.73s |
| 234 | `DiaryTests` | Unknown meal type is rejected instead of creating an invisible item | Đúng như mong đợi | 🟢 PASS | 8.56s |
| 235 | `DiaryTests` | Update and delete of another users item return 404 | Đúng như mong đợi | 🟢 PASS | 2.30s |
| 236 | `DiaryTests` | Update can move an item to another day | Đúng như mong đợi | 🟢 PASS | 0.97s |
| 237 | `DiaryTests` | Update changes amounts and moves the item to another meal | Đúng như mong đợi | 🟢 PASS | 1.05s |
| 238 | `DiaryTests` | Update validates input | Đúng như mong đợi | 🟢 PASS | 0.92s |
| 239 | `DiaryTests` | Weekly progress reports macros and targets for every day | Đúng như mong đợi | 🟢 PASS | 0.76s |

</details>

<details><summary><b>SeedTests</b> — Seed dữ liệu · 2/2 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 240 | `SeedTests` | The dev account is created once with a real profile when enabled | Đúng như mong đợi | 🟢 PASS | 10.98s |
| 241 | `SeedTests` | The dev account is not created outside development | Đúng như mong đợi | 🟢 PASS | 9.78s |

</details>

<details><summary><b>SmokeTests</b> — Smoke (health check, Swagger) · 3/3 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 242 | `SmokeTests` | Migration and seed provide reference data | Đúng như mong đợi | 🟢 PASS | 0.17s |
| 243 | `SmokeTests` | Protected endpoint without token is rejected | Đúng như mong đợi | 🟢 PASS | 15.76s |
| 244 | `SmokeTests` | Registered user can read own profile with the issued token | Đúng như mong đợi | 🟢 PASS | 3.25s |

</details>

<details><summary><b>AccountTests</b> — Tài khoản (hồ sơ, ảnh đại diện, xóa tài khoản) · 13/13 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 245 | `AccountTests` | A file above the hard request limit is rejected by the server | Đúng như mong đợi | 🟢 PASS | 2.79s |
| 246 | `AccountTests` | An account without a password confirms deletion with its own email | Đúng như mong đợi | 🟢 PASS | 2.95s |
| 247 | `AccountTests` | An oversized empty or missing file is rejected | Đúng như mong đợi | 🟢 PASS | 5.05s |
| 248 | `AccountTests` | Avatar upload requires authentication | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 249 | `AccountTests` | Delete account needs the right password then removes everything and the old token stops working | Đúng như mong đợi | 🟢 PASS | 18.66s |
| 250 | `AccountTests` | Delete my data removes personal data but keeps the account and other users data | Đúng như mong đợi | 🟢 PASS | 8.21s |
| 251 | `AccountTests` | Delete my data requires authentication | Đúng như mong đợi | 🟢 PASS | 8.11s |
| 252 | `AccountTests` | Deleting personal data also deletes saved meal photos but keeps the avatar | Đúng như mong đợi | 🟢 PASS | 3.56s |
| 253 | `AccountTests` | Guessing the password through delete account locks the account | Đúng như mong đợi | 🟢 PASS | 14.69s |
| 254 | `AccountTests` | Removing the avatar clears it and deletes the file | Đúng như mong đợi | 🟢 PASS | 2.29s |
| 255 | `AccountTests` | Replacing the avatar removes the previous file | Đúng như mong đợi | 🟢 PASS | 2.93s |
| 256 | `AccountTests` | The file type is decided by content not by the name or content type the client sends | Đúng như mong đợi | 🟢 PASS | 3.27s |
| 257 | `AccountTests` | Uploading a valid image updates the avatar and the file is served with nosniff | Đúng như mong đợi | 🟢 PASS | 4.16s |

</details>

<details><summary><b>PayOSTests</b> — Thanh toán PayOS · 6/6 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 258 | `PayOSTests` | Checkout returns the payos link and pro activates only after payos reports paid | Đúng như mong đợi | 🟢 PASS | 1.55s |
| 259 | `PayOSTests` | Only the owner can check an order | Đúng như mong đợi | 🟢 PASS | 1.91s |
| 260 | `PayOSTests` | PayOS returns to the app deep link and never to other urls | Đúng như mong đợi | 🟢 PASS | 1.16s |
| 261 | `PayOSTests` | Payos test webhook for an unknown order is acknowledged | Đúng như mong đợi | 🟢 PASS | 0.02s |
| 262 | `PayOSTests` | Signed webhook activates pro and bad signatures or amounts do not | Đúng như mong đợi | 🟢 PASS | 7.71s |
| 263 | `PayOSTests` | Without keys payos is unavailable | Đúng như mong đợi | 🟢 PASS | 7.72s |

</details>

<details><summary><b>SePayTests</b> — Thanh toán SePay (webhook) · 9/9 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 264 | `SePayTests` | A webhook with the right api key and transfer code activates pro once | Đúng như mong đợi | 🟢 PASS | 1.63s |
| 265 | `SePayTests` | Bank app gives the vietqr bank code to open the bank app and is confirmed like sepay | Đúng như mong đợi | 🟢 PASS | 1.46s |
| 266 | `SePayTests` | Bank transfer is no longer offered | Đúng như mong đợi | 🟢 PASS | 1.76s |
| 267 | `SePayTests` | Checkout shows a vietqr to the linked account with a unique transfer code and grants nothing yet | Đúng như mong đợi | 🟢 PASS | 1.38s |
| 268 | `SePayTests` | SePay is disabled until it is configured | Đúng như mong đợi | 🟢 PASS | 7.10s |
| 269 | `SePayTests` | The bank return page only links back to the app | Đúng như mong đợi | 🟢 PASS | 6.56s |
| 270 | `SePayTests` | Without a webhook a bank app transfer is found through the sepay api | Đúng như mong đợi | 🟢 PASS | 1.46s |
| 271 | `SePayTests` | Without a webhook check status finds the transfer through the sepay api | Đúng như mong đợi | 🟢 PASS | 1.15s |
| 272 | `SePayTests` | Wrong api keys are rejected and underpaid outgoing or unrelated transfers never grant pro | Đúng như mong đợi | 🟢 PASS | 1.36s |

</details>

<details><summary><b>NotificationTests</b> — Thông báo · 7/7 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 273 | `NotificationTests` | A new account has no notifications | Đúng như mong đợi | 🟢 PASS | 7.93s |
| 274 | `NotificationTests` | Activating pro and nearing its expiry are notified | Đúng như mong đợi | 🟢 PASS | 16.74s |
| 275 | `NotificationTests` | Completing a challenge notifies the completion and the level up once | Đúng như mong đợi | 🟢 PASS | 14.15s |
| 276 | `NotificationTests` | Deleting personal data removes notifications and bad limits are rejected | Đúng như mong đợi | 🟢 PASS | 1.80s |
| 277 | `NotificationTests` | Generating a grocery list notifies once per period | Đúng như mong đợi | 🟢 PASS | 3.09s |
| 278 | `NotificationTests` | Notifications can be marked read one by one or all at once and stay private | Đúng như mong đợi | 🟢 PASS | 3.02s |
| 279 | `NotificationTests` | The first logged meal creates one badge notification however often it is evaluated | Đúng như mong đợi | 🟢 PASS | 13.02s |

</details>

<details><summary><b>NotificationRealtimeTests</b> — Thông báo realtime (SignalR) · 4/4 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 280 | `NotificationRealtimeTests` | Activating pro pushes the premium notification | Đúng như mong đợi | 🟢 PASS | 11.70s |
| 281 | `NotificationRealtimeTests` | Completing a challenge pushes it and the level ups awarded in the same transaction | Đúng như mong đợi | 🟢 PASS | 14.96s |
| 282 | `NotificationRealtimeTests` | Logging the first meal pushes its badge right away to that user only | Đúng như mong đợi | 🟢 PASS | 6.77s |
| 283 | `NotificationRealtimeTests` | The hub needs a valid token and the query token only works for the hub | Đúng như mong đợi | 🟢 PASS | 18.78s |

</details>

<details><summary><b>BarcodeLookupTests</b> — Tra mã vạch (Open Food Facts) · 4/4 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 284 | `BarcodeLookupTests` | A barcode open food facts does not know is still a 404 | Đúng như mong đợi | 🟢 PASS | 9.54s |
| 285 | `BarcodeLookupTests` | An unknown barcode is imported once from open food facts as an unverified shared food | Đúng như mong đợi | 🟢 PASS | 11.26s |
| 286 | `BarcodeLookupTests` | Parsing rejects products without usable data and converts units | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 287 | `BarcodeLookupTests` | Scanning an imported product warns about the users allergy | Đúng như mong đợi | 🟢 PASS | 10.78s |

</details>

<details><summary><b>WaterTests</b> — Uống nước · 5/5 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 288 | `WaterTests` | Another users water entry cannot be deleted | Đúng như mong đợi | 🟢 PASS | 15.52s |
| 289 | `WaterTests` | Deleting an entry lowers the total and cannot be repeated | Đúng như mong đợi | 🟢 PASS | 2.53s |
| 290 | `WaterTests` | History lists each entry and includes days without logs | Đúng như mong đợi | 🟢 PASS | 3.67s |
| 291 | `WaterTests` | Logging water returns the entry id and running total | Đúng như mong đợi | 🟢 PASS | 2.76s |
| 292 | `WaterTests` | Water input is validated | Đúng như mong đợi | 🟢 PASS | 3.00s |

</details>

### A.2 Mobile — Jest unit test (`frontend/SmartMealMobile/__tests__/`, trừ `live/`)

<details><summary><b>__tests__/ai/ai.mapper.test.ts</b> · 11/11 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 293 | fromSnapResponse | độ tin cậy cao: một món đã chắc chắn, số liệu làm tròn, nhãn theo gram | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 294 | fromSnapResponse | cảnh báo dị ứng, lời khuyên và cờ dữ liệu mẫu được giữ lại | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 295 | fromSnapResponse | ảnh BE đã lưu được giữ lại để gắn vào món khi ghi nhật ký; không lưu được thì bỏ trống | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 296 | fromSnapResponse | độ tin cậy thấp (BR-072): món bị đánh dấu chưa chắc, kèm lựa chọn tên + 3 cỡ khẩu phần dựng từ số liệu của BE | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 297 | fromSnapResponse | đúng ngưỡng 0,6 thì coi là đã chắc chắn | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 298 | fromSnapResponse | khối lượng ước tính bằng 0 không gây chia cho 0 | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 299 | fromVoiceResponse | các món theo thứ tự BE, bữa theo lựa chọn của người dùng, văn bản gốc được giữ | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 300 | fromVoiceResponse | không phải dữ liệu mẫu → không có cờ isDemo | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 301 | quota | Free: số lượt dùng/còn lại, thời điểm làm mới ở dạng ISO UTC | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 302 | quota | Pro: không giới hạn, limit/remaining là null | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 303 | quota | giờ làm mới (BE trả ở dạng UTC) hiển thị theo giờ máy | Đúng như mong đợi | 🟢 PASS | 0.00s |

</details>

<details><summary><b>__tests__/ai/aiService.api.test.ts</b> · 14/14 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 304 | getQuota | GET /ai/quota → hạn mức Free | Đúng như mong đợi | 🟢 PASS | 0.48s |
| 305 | getQuota | Pro → không giới hạn | Đúng như mong đợi | 🟢 PASS | 0.42s |
| 306 | analyzeMealPhoto | POST /ai/snap-and-track multipart với trường "image" và timeout dài cho Gemini | Đúng như mong đợi | 🟢 PASS | 0.36s |
| 307 | analyzeMealPhoto | không có ảnh → báo rõ, không gọi API và không trả kết quả giả | Đúng như mong đợi | 🟢 PASS | 0.33s |
| 308 | analyzeMealPhoto | hết lượt miễn phí (429) → lỗi RATE_LIMITED nhận ra được để mở màn "Hết lượt AI" | Đúng như mong đợi | 🟢 PASS | 0.41s |
| 309 | analyzeMealPhoto | AI chưa cấu hình/đang lỗi (503) → ném lỗi của BE kèm thông báo tiếng Việt | Đúng như mong đợi | 🟢 PASS | 0.42s |
| 310 | transcribeVoice | POST /ai/voice-log với văn bản đã cắt khoảng trắng và timeout dài | Đúng như mong đợi | 🟢 PASS | 0.46s |
| 311 | transcribeVoice | không có văn bản (chưa có nhận dạng giọng nói) → báo chưa hỗ trợ, không trả kết quả giả | Đúng như mong đợi | 🟢 PASS | 0.36s |
| 312 | transcribeVoiceAudio | POST /ai/voice-log/audio multipart; câu hiển thị lấy từ bản chép lời của server | Đúng như mong đợi | 🟢 PASS | 0.32s |
| 313 | transcribeVoiceAudio | server không nghe ra món (voice_unrecognized) → AiRecognitionFailedError, lỗi khác ném nguyên | Đúng như mong đợi | 🟢 PASS | 0.31s |
| 314 | transcribeVoiceAudio | không có file ghi âm → báo rõ, không gọi server | Đúng như mong đợi | 🟢 PASS | 0.32s |
| 315 | transcribeVoiceDraft | POST /ai/voice-log/transcribe với file WAV đang ghi, trả câu đã chép (bỏ khoảng trắng thừa) | Đúng như mong đợi | 🟢 PASS | 0.31s |
| 316 | transcribeVoiceDraft | lỗi của server (hết lượt, gửi quá dày) ném nguyên để hook ngừng phụ đề | Đúng như mong đợi | 🟢 PASS | 0.31s |
| 317 | recordUsage | bản thật không tự trừ lượt (server đếm khi AI thành công) | Đúng như mong đợi | 🟢 PASS | 0.33s |

</details>

<details><summary><b>__tests__/ai/pcmAudio.test.ts</b> · 6/6 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 318 | pcmDurationMillis / pcmBytesFor | 16 kHz mono 16-bit = 32 000 byte mỗi giây | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 319 | pcmLevel | im lặng / đoạn rỗng → 0 | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 320 | pcmLevel | to hết cỡ → 1, nhỏ dần theo dBFS (-20 dB ≈ 2/3, dưới -60 dB → 0) | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 321 | pcmLevel | đọc đúng đoạn nằm giữa một ArrayBuffer lớn hơn (byteOffset ≠ 0) | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 322 | encodeWav | header RIFF/WAVE PCM 16-bit đúng chuẩn và dữ liệu nối đúng thứ tự | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 323 | encodeWav | chưa có âm thanh → WAV rỗng nhưng header vẫn hợp lệ | Đúng như mong đợi | 🟢 PASS | 0.00s |

</details>

<details><summary><b>__tests__/ai/useAiQuota.test.tsx</b> · 5/5 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 324 | useAiQuota | Free: số lượt từ server, còn lượt thì dùng được | Đúng như mong đợi | 🟢 PASS | 0.06s |
| 325 | useAiQuota | hết lượt (remaining = 0) → hasRemaining = false | Đúng như mong đợi | 🟢 PASS | 0.08s |
| 326 | useAiQuota | Pro: không giới hạn, luôn còn lượt | Đúng như mong đợi | 🟢 PASS | 0.08s |
| 327 | useAiQuota | chưa đọc được hạn mức (lỗi mạng): Free vẫn không bị chặn, Pro vẫn là không giới hạn theo gói | Đúng như mong đợi | 🟢 PASS | 0.17s |
| 328 | useAiQuota | consumeQuota: ghi nhận lượt rồi đọc lại hạn mức từ server | Đúng như mong đợi | 🟢 PASS | 0.09s |

</details>

<details><summary><b>__tests__/api/apiBaseUrl.test.ts</b> · 3/3 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 329 | resolveApiBaseUrl | có EXPO_PUBLIC_API_URL → dùng đúng giá trị đó | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 330 | resolveApiBaseUrl | để trống → lấy IP của máy chạy Metro + cổng API | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 331 | resolveApiBaseUrl | tunnel (tên miền exp.direct) hoặc không chạy qua Expo → localhost | Đúng như mong đợi | 🟢 PASS | 0.00s |

</details>

<details><summary><b>__tests__/api/errors.test.ts</b> · 25/25 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 332 | toApiError | giữ nguyên ApiError đã chuẩn hóa | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 333 | toApiError | lỗi không phải Axios → UNKNOWN với message tiếng Việt | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 334 | toApiError | không có response + ECONNABORTED → TIMEOUT | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 335 | toApiError | không có response + lỗi khác → NETWORK | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 336 | toApiError | envelope: dùng message của BE (vd. sai mật khẩu 401 vẫn có message) | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 337 | toApiError | envelope 400 → BUSINESS, giữ errors[] làm details | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 338 | toApiError | envelope 404 → NOT_FOUND | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 339 | toApiError | envelope 400 do validate: message là lỗi đầu tiên, errors[] giữ đủ danh sách | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 340 | toApiError | envelope 409 → CONFLICT, dùng message của BE | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 341 | toApiError | envelope 423 → LOCKED, dùng message của BE | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 342 | toApiError | envelope 429 → RATE_LIMITED, dùng message của BE | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 343 | toApiError | envelope 502 → UNAVAILABLE, dùng message của BE | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 344 | toApiError | envelope 503 → UNAVAILABLE, dùng message của BE | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 345 | toApiError | không có envelope, status 401 → UNAUTHORIZED | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 346 | toApiError | không có envelope, status 403 → FORBIDDEN | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 347 | toApiError | không có envelope, status 404 → NOT_FOUND | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 348 | toApiError | không có envelope, status 409 → CONFLICT | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 349 | toApiError | không có envelope, status 423 → LOCKED | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 350 | toApiError | không có envelope, status 429 → RATE_LIMITED | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 351 | toApiError | không có envelope, status 500 → SERVER | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 352 | toApiError | không có envelope, status 503 → UNAVAILABLE | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 353 | toApiError | isApiError nhận diện đúng | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 354 | unwrap | success:true → trả data | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 355 | unwrap | success:false dù HTTP 200 → ApiError BUSINESS với message của BE | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 356 | unwrap | body không phải envelope (null/chuỗi) → ApiError UNKNOWN | Đúng như mong đợi | 🟢 PASS | 0.00s |

</details>

<details><summary><b>__tests__/api/freshAccessToken.test.ts</b> · 5/5 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 357 | getFreshAccessToken | token còn hạn → dùng luôn, không gọi /auth/refresh | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 358 | getFreshAccessToken | token sắp hết hạn → làm mới trước rồi trả token mới | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 359 | getFreshAccessToken | refresh token không còn dùng được → xử lý hết phiên và ném lỗi | Đúng như mong đợi | 🟢 PASS | 0.03s |
| 360 | getFreshAccessToken | mất mạng khi làm mới → ném lỗi để thử lại sau, KHÔNG đăng xuất | Đúng như mong đợi | 🟢 PASS | 0.02s |
| 361 | getFreshAccessToken | chưa đăng nhập → ném lỗi | Đúng như mong đợi | 🟢 PASS | 0.00s |

</details>

<details><summary><b>__tests__/api/interceptors.test.ts</b> · 14/14 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 362 | installInterceptors | gắn Authorization: Bearer <token> khi có token | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 363 | installInterceptors | không gắn Authorization khi chưa có token | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 364 | installInterceptors › 401 trên request có token | làm mới phiên rồi gửi lại request bằng token mới (không báo hết phiên) | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 365 | installInterceptors › 401 trên request có token | nhiều request cùng nhận 401 chỉ làm mới MỘT lần rồi cùng thử lại | Đúng như mong đợi | 🟢 PASS | 0.04s |
| 366 | installInterceptors › 401 trên request có token | không có refresh token → hết phiên | Đúng như mong đợi | 🟢 PASS | 0.03s |
| 367 | installInterceptors › 401 trên request có token | refresh token bị từ chối (401) → hết phiên, không thử lại vô hạn | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 368 | installInterceptors › 401 trên request có token | mất mạng khi làm mới → KHÔNG đăng xuất, báo lỗi mạng | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 369 | installInterceptors › 401 trên request có token | đã làm mới mà request vẫn 401 → hết phiên (không làm mới lần hai) | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 370 | installInterceptors | 401 ở /auth/login (sai thông tin/mã) KHÔNG làm mới và KHÔNG phải hết phiên | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 371 | installInterceptors | 401 ở /auth/register (sai thông tin/mã) KHÔNG làm mới và KHÔNG phải hết phiên | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 372 | installInterceptors | 401 ở /auth/verify-otp (sai thông tin/mã) KHÔNG làm mới và KHÔNG phải hết phiên | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 373 | installInterceptors | 401 ở /auth/reset-password (sai thông tin/mã) KHÔNG làm mới và KHÔNG phải hết phiên | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 374 | installInterceptors | 401 khi không có token (guest) KHÔNG làm mới và KHÔNG gọi handler | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 375 | installInterceptors | lỗi mạng → ApiError NETWORK, không gọi handler | Đúng như mong đợi | 🟢 PASS | 0.00s |

</details>

<details><summary><b>__tests__/api/linking.test.ts</b> · 4/4 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 376 | isPaymentReturnPath | nhận payment-result kèm hoặc không kèm "/" và tham số PayOS gắn thêm | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 377 | isPaymentReturnPath | đường dẫn khác không bị chặn | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 378 | linking.getStateFromPath | PayOS chuyển về → không có state điều hướng (giữ nguyên màn đang chờ) | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 379 | linking.getStateFromPath | liên kết chia sẻ bộ sưu tập vẫn mở đúng màn | Đúng như mong đợi | 🟢 PASS | 0.01s |

</details>

<details><summary><b>__tests__/api/mealType.test.ts</b> · 4/4 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 380 | toApiMealType | PascalCase đúng giá trị backend | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 381 | fromApiMealType | không phân biệt hoa/thường | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 382 | fromApiMealType | giá trị lạ rơi về snack | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 383 | fromApiMealType | khứ hồi với mọi MealType | Đúng như mong đợi | 🟢 PASS | 0.00s |

</details>

<details><summary><b>__tests__/api/tokenStorage.test.ts</b> · 10/10 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 384 | tokenStorage (native) | get() đọc SecureStore đúng 1 lần rồi dùng cache | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 385 | tokenStorage (native) | chưa có token → null và cũng được cache | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 386 | tokenStorage (native) | SecureStore ném lỗi khi đọc → coi như chưa đăng nhập (không crash) | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 387 | tokenStorage (native) | set() ghi SecureStore và cập nhật cache | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 388 | tokenStorage (native) | set() lỗi ghi storage vẫn giữ token trong phiên hiện tại | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 389 | tokenStorage (native) | clear() xóa khỏi SecureStore và cache | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 390 | tokenStorage (web) | dùng AsyncStorage thay cho SecureStore | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 391 | refresh token + cặp token phiên | refreshTokenStorage dùng khóa riêng và cache như access token | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 392 | refresh token + cặp token phiên | saveSessionTokens ghi cả hai token; thiếu refresh token thì chỉ ghi access token | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 393 | refresh token + cặp token phiên | clearSessionTokens xóa cả hai khỏi SecureStore và cache | Đúng như mong đợi | 🟢 PASS | 0.01s |

</details>

<details><summary><b>__tests__/App.test.tsx</b> · 1/1 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 394 | App.test.tsx | renders <App /> without throwing | Đúng như mong đợi | 🟢 PASS | 0.93s |

</details>

<details><summary><b>__tests__/auth/authService.api.test.ts</b> · 25/25 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 395 | login | POST /auth/login, lưu token và trả user đã quy đổi | Đúng như mong đợi | 🟢 PASS | 0.19s |
| 396 | login | sai mật khẩu → ném lỗi và KHÔNG lưu token | Đúng như mong đợi | 🟢 PASS | 0.10s |
| 397 | register | POST /auth/register, lưu token, không cần OTP và chưa có hồ sơ sức khỏe | Đúng như mong đợi | 🟢 PASS | 0.10s |
| 398 | register | server đã gửi mã xác minh email (requiresEmailVerification) → cần OTP trước Health Profile | Đúng như mong đợi | 🟢 PASS | 0.10s |
| 399 | register | email trùng → ném lỗi của BE và KHÔNG lưu token | Đúng như mong đợi | 🟢 PASS | 0.12s |
| 400 | getMe | GET /auth/me → AuthUser mới nhất (isPro, hasCompletedSurvey) | Đúng như mong đợi | 🟢 PASS | 0.10s |
| 401 | updateProfile | PUT /auth/profile { fullName } (đã cắt khoảng trắng) và trả họ tên BE đã lưu | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 402 | updateProfile | BE báo lỗi → ném lỗi | Đúng như mong đợi | 🟢 PASS | 0.11s |
| 403 | logout | POST /auth/logout với refresh token đã đọc từ trước, không gắn Bearer | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 404 | quên / xác thực OTP / đặt lại mật khẩu | requestPasswordReset: POST /auth/forgot-password với email đã cắt khoảng trắng | Đúng như mong đợi | 🟢 PASS | 0.11s |
| 405 | quên / xác thực OTP / đặt lại mật khẩu | resendOtp: mục đích reset-password gửi slug reset-password | Đúng như mong đợi | 🟢 PASS | 0.09s |
| 406 | quên / xác thực OTP / đặt lại mật khẩu | resendOtp: mục đích register gửi slug verify-email | Đúng như mong đợi | 🟢 PASS | 0.10s |
| 407 | quên / xác thực OTP / đặt lại mật khẩu | verifyOtp: gửi mã 6 số và trả resetToken của BE | Đúng như mong đợi | 🟢 PASS | 0.11s |
| 408 | quên / xác thực OTP / đặt lại mật khẩu | verifyOtp: xác thực email (không có resetToken) → resetToken undefined | Đúng như mong đợi | 🟢 PASS | 0.09s |
| 409 | quên / xác thực OTP / đặt lại mật khẩu | verifyOtp: mã sai → ném lỗi của BE | Đúng như mong đợi | 🟢 PASS | 0.09s |
| 410 | quên / xác thực OTP / đặt lại mật khẩu | resetPassword: POST /auth/reset-password kèm resetToken | Đúng như mong đợi | 🟢 PASS | 0.09s |
| 411 | changePassword | POST /auth/change-password rồi lưu ngay cặp token mới (BE thu hồi phiên cũ) | Đúng như mong đợi | 🟢 PASS | 0.10s |
| 412 | changePassword | sai mật khẩu hiện tại → ném lỗi và KHÔNG đổi token đang có | Đúng như mong đợi | 🟢 PASS | 0.10s |
| 413 | ảnh đại diện và xóa dữ liệu | uploadAvatar: POST /auth/avatar dạng multipart với trường file, trả avatarUrl mới | Đúng như mong đợi | 🟢 PASS | 0.09s |
| 414 | ảnh đại diện và xóa dữ liệu | uploadAvatar: BE từ chối ảnh (sai loại/quá lớn) → ném lỗi của BE | Đúng như mong đợi | 🟢 PASS | 0.09s |
| 415 | ảnh đại diện và xóa dữ liệu | removeAvatar: DELETE /auth/avatar, user quay về không có ảnh | Đúng như mong đợi | 🟢 PASS | 0.10s |
| 416 | ảnh đại diện và xóa dữ liệu | deleteMyData: DELETE /me/data | Đúng như mong đợi | 🟢 PASS | 0.11s |
| 417 | deleteAccount | tài khoản có mật khẩu → DELETE /auth/account kèm mật khẩu trong body | Đúng như mong đợi | 🟢 PASS | 0.11s |
| 418 | deleteAccount | tài khoản chỉ có Google → xác nhận bằng email (đã cắt khoảng trắng) | Đúng như mong đợi | 🟢 PASS | 0.09s |
| 419 | deleteAccount | UserDto.hasPassword=false (chỉ Google) được giữ khi quy đổi | Đúng như mong đợi | 🟢 PASS | 0.10s |

</details>

<details><summary><b>__tests__/auth/authStore.test.ts</b> · 8/8 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 420 | trạng thái khởi tạo | phải khôi phục phiên (loading), chưa đăng nhập | Đúng như mong đợi | 🟢 PASS | 0.12s |
| 421 | login / logout | login đặt user, xóa pendingUser và lý do thoát gần nhất | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 422 | login / logout | logout xóa user/pendingUser, ghi lý do và mở lại cờ hết phiên | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 423 | login / logout | logout mặc định là đăng xuất chủ động | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 424 | login / logout | Guest không có user thật | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 425 | login / logout | updateUser chỉ sửa họ tên và bỏ qua khi chưa đăng nhập | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 426 | getCurrentUserId | ưu tiên user đã đăng nhập, rồi tới tài khoản đang onboarding, không có → null | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 427 | bootstrapStatus | setBootstrapStatus đổi trạng thái khôi phục phiên | Đúng như mong đợi | 🟢 PASS | 0.00s |

</details>

<details><summary><b>__tests__/auth/nativeGoogleSignIn.test.ts</b> · 3/3 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 428 | nativeGoogleSignIn | Expo Go: không có đăng nhập Google, không nạp thư viện native | Đúng như mong đợi | 🟢 PASS | 0.16s |
| 429 | nativeGoogleSignIn | dev build: nạp thư viện khi cần và chỉ cấu hình một lần | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 430 | nativeGoogleSignIn | web: dùng nút Google Identity Services, không nạp thư viện native | Đúng như mong đợi | 🟢 PASS | 0.00s |

</details>

<details><summary><b>__tests__/auth/sessionService.test.ts</b> · 32/32 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 431 | openSession | chưa có hồ sơ sức khỏe → phải làm Health Profile, không gọi BE | Đúng như mong đợi | 🟢 PASS | 0.30s |
| 432 | openSession | đã có hồ sơ → nạp vào userProfileStore trước khi vào Main | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 433 | openSession | server chưa có hồ sơ (null) → giữ nguyên store | Đúng như mong đợi | 🟢 PASS | 0.12s |
| 434 | openSession | nạp hồ sơ lỗi → ném lỗi (đăng nhập không được coi là xong) | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 435 | openSession | nạp gói thành viên do server báo vào premiumStore (cả khi chưa làm khảo sát) | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 436 | openSession | đọc gói lỗi → không chặn đăng nhập, dùng cờ isPro của đăng nhập làm dự phòng | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 437 | bootstrapSession | chưa có token → ready, chưa đăng nhập (đi Welcome), không gọi API | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 438 | bootstrapSession | token hợp lệ + đã có hồ sơ → đăng nhập, store đã được nạp | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 439 | bootstrapSession | token hợp lệ nhưng chưa làm khảo sát → onboarding (pendingUser), chưa vào Main | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 440 | bootstrapSession | /auth/me 401 (token hết hạn/bị thu hồi) → xóa token và mở Login | Đúng như mong đợi | 🟢 PASS | 0.15s |
| 441 | bootstrapSession | /auth/me 404 (tài khoản không còn) → xóa token và mở Login | Đúng như mong đợi | 🟢 PASS | 0.17s |
| 442 | bootstrapSession | /auth/me mất mạng → failed, GIỮ token để thử lại | Đúng như mong đợi | 🟢 PASS | 0.17s |
| 443 | bootstrapSession | /auth/me quá thời gian → failed, GIỮ token để thử lại | Đúng như mong đợi | 🟢 PASS | 0.17s |
| 444 | bootstrapSession | /auth/me máy chủ lỗi → failed, GIỮ token để thử lại | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 445 | bootstrapSession | nạp hồ sơ lỗi mạng sau khi /auth/me thành công → failed, chưa đăng nhập | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 446 | bootstrapSession | thử lại sau khi failed → ready và đăng nhập | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 447 | handleSessionExpired | đang đăng nhập → xóa token + cache và mở màn "Phiên hết hạn", chưa logout | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 448 | handleSessionExpired | nhiều request cùng 401 → chỉ xử lý một lần | Đúng như mong đợi | 🟢 PASS | 0.12s |
| 449 | handleSessionExpired | chưa đăng nhập (đang khôi phục phiên, Guest, sai mật khẩu) → bỏ qua | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 450 | handleSessionExpired | navigation chưa sẵn sàng → về Login ngay (logout expired) | Đúng như mong đợi | 🟢 PASS | 0.12s |
| 451 | handleSessionExpired | đăng nhập lại sau khi hết hạn mở lại cờ để lần hết hạn sau vẫn được xử lý | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 452 | startSessionLifecycle | đăng ký handler 401 và hủy được | Đúng như mong đợi | 🟢 PASS | 0.11s |
| 453 | startSessionLifecycle | đăng xuất chủ động → thu hồi refresh token ở máy chủ bằng bản đã đọc trước khi xóa | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 454 | startSessionLifecycle | đăng xuất → huỷ nhắc nhở cục bộ của tài khoản vừa thoát | Đúng như mong đợi | 🟢 PASS | 0.11s |
| 455 | startSessionLifecycle | không có refresh token (phiên cũ) → chỉ dọn cục bộ, không gọi máy chủ | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 456 | startSessionLifecycle | thu hồi ở máy chủ lỗi (mất mạng) → vẫn đăng xuất và dọn dữ liệu cục bộ | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 457 | startSessionLifecycle | đăng xuất → xóa token, cache và dữ liệu người dùng cục bộ | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 458 | startSessionLifecycle | đăng xuất → gói thành viên về Free (không để tài khoản sau thừa hưởng Pro của người trước) | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 459 | startSessionLifecycle | "Đăng nhập lại" sau khi hết hạn cũng dọn dữ liệu của phiên cũ | Đúng như mong đợi | 🟢 PASS | 0.12s |
| 460 | startSessionLifecycle | thoát Guest và thoát onboarding (pendingUser) cũng được coi là kết thúc phiên | Đúng như mong đợi | 🟢 PASS | 0.15s |
| 461 | startSessionLifecycle | đăng nhập, hoàn tất onboarding (pendingUser → login) và đổi trạng thái khác không dọn gì | Đúng như mong đợi | 🟢 PASS | 0.15s |
| 462 | startSessionLifecycle | sau khi hủy không còn phản ứng với đăng xuất | Đúng như mong đợi | 🟢 PASS | 0.13s |

</details>

<details><summary><b>__tests__/dashboard/dashboardService.test.ts</b> · 7/7 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 463 | getDashboardSummary | gom nhật ký, vận động và Bé Mầm của hôm nay (cùng một ngày giờ máy) | Đúng như mong đợi | 🟢 PASS | 0.28s |
| 464 | getDashboardSummary | vận động: giờ đồng bộ theo giờ máy và nhãn nguồn | Đúng như mong đợi | 🟢 PASS | 0.17s |
| 465 | getDashboardSummary | hôm nay chưa đồng bộ → không có nhãn giờ (UI không hiện "vừa đồng bộ") | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 466 | getDashboardSummary | Bé Mầm lỗi → khối pet biến mất, Dashboard vẫn hiện | Đúng như mong đợi | 🟢 PASS | 0.10s |
| 467 | getDashboardSummary | công thức lỗi → không có gợi ý, Dashboard vẫn hiện | Đúng như mong đợi | 🟢 PASS | 0.11s |
| 468 | getDashboardSummary | vận động lỗi → khối vận động biến mất, Dashboard vẫn hiện | Đúng như mong đợi | 🟢 PASS | 0.11s |
| 469 | getDashboardSummary | nhật ký lỗi → báo lỗi cả màn (kể cả khi các nguồn khác vẫn ổn) | Đúng như mong đợi | 🟢 PASS | 0.10s |

</details>

<details><summary><b>__tests__/gamification/badgeService.api.test.ts</b> · 2/2 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 470 | badgeService.api — trang phục | mặc: POST /gamification/costumes/{id}/equip | Đúng như mong đợi | 🟢 PASS | 0.23s |
| 471 | badgeService.api — trang phục | tháo: DELETE /gamification/costumes/equipped | Đúng như mong đợi | 🟢 PASS | 0.13s |

</details>

<details><summary><b>__tests__/gamification/challengeService.api.test.ts</b> · 3/3 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 472 | challengeService.api | khung ngày của người tham gia lấy từ server; chưa tham gia = khung nếu tham gia hôm nay | Đúng như mong đợi | 🟢 PASS | 0.35s |
| 473 | challengeService.api | tham gia gửi ngày theo giờ máy | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 474 | challengeService.api | không còn hàm hoàn thành thử thách phía client | Đúng như mong đợi | 🟢 PASS | 0.14s |

</details>

<details><summary><b>__tests__/gamification/gamificationService.api.test.ts</b> · 3/3 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 475 | gamificationService.api | dùng nhiệm vụ, cấp và XP của server; gửi ngày theo giờ máy | Đúng như mong đợi | 🟢 PASS | 0.26s |
| 476 | gamificationService.api | chuỗi ngày đặt theo ngày vào Thứ 2 → CN của tuần này, không theo vị trí trong mảng | Đúng như mong đợi | 🟢 PASS | 0.12s |
| 477 | gamificationService.api | thẻ thử thách là thử thách đang tham gia; tải thử thách lỗi vẫn hiện pet | Đúng như mong đợi | 🟢 PASS | 0.24s |

</details>

<details><summary><b>__tests__/grocery/grocery.mapper.test.ts</b> · 2/2 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 478 | grocery.mapper | quy đổi nhóm BE; nhóm gộp/lạ phân loại lại theo tên; nhóm FE giữ nguyên | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 479 | grocery.mapper | gom lại theo nhóm FE, sắp theo thiết kế, giữ kỳ danh sách và lần đi chợ trước | Đúng như mong đợi | 🟢 PASS | 0.00s |

</details>

<details><summary><b>__tests__/grocery/groceryAggregation.test.ts</b> · 17/18 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 480 | categorizeIngredient | Xà lách Romaine → Rau củ | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 481 | categorizeIngredient | Nấm đông cô → Rau củ | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 482 | categorizeIngredient | Cá hồi phi lê → Thịt cá | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 483 | categorizeIngredient | Đậu hũ non → Thịt cá | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 484 | categorizeIngredient | Sữa chua Hy Lạp → Sữa | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 485 | categorizeIngredient | Gạo lứt đỏ → Ngũ cốc | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 486 | categorizeIngredient | Bánh mì nguyên cám → Ngũ cốc | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 487 | categorizeIngredient | Sốt mè rang → Gia vị | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 488 | categorizeIngredient | Mật ong → Đồ khô | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 489 | categorizeIngredient | Giấy bạc → Đồ khô | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 490 | categorizeIngredient | không phân biệt hoa/thường | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 491 | categorizeIngredient | "Chuối tiêu" (chuối) không bị xếp vào Gia vị chỉ vì có chữ "tiêu" | Error: expect(received).not.toBe(expected) // Object.is equality Expected: not "Gia vị" at Object.toBe (D:\Sem8\PRM393\SmartMeal\frontend\SmartMealMobile\__tests__\grocery\groce… | 🔴 FAIL | 0.00s |
| 492 | manualQuantityToParsedAmount | kg → g và l → ml, g/ml giữ nguyên | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 493 | manualQuantityToParsedAmount | đơn vị đếm (quả, bó, gói…) giữ nguyên nhãn gốc để hiển thị | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 494 | estimateItemCostVnd | dùng giá theo gram/ml/cái của nguyên liệu và làm tròn tới nghìn đồng | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 495 | estimateItemCostVnd | nguyên liệu không có trong bảng giá → giá mặc định theo đơn vị | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 496 | estimateItemCostVnd | "cà chua bi" lấy giá riêng, không lấy giá "cà chua" | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 497 | estimateItemCostVnd | không đọc được số lượng ("Vừa đủ") → chi phí tối thiểu 5.000đ | Đúng như mong đợi | 🟢 PASS | 0.00s |

</details>

<details><summary><b>__tests__/grocery/groceryService.clearPurchased.test.ts</b> · 1/1 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 498 | groceryService.api.clearPurchased | DELETE /grocery/clear-checked | Đúng như mong đợi | 🟢 PASS | 3.53s |

</details>

<details><summary><b>__tests__/health/health.mapper.test.ts</b> · 41/41 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 499 | profileInputFromForm / selectionFromForm | đổi chuỗi của wizard sang số, ngày sinh sang Date (giờ máy) | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 500 | profileInputFromForm / selectionFromForm | chưa chọn → giá trị mặc định như bản mock cũ; chưa nhập cân nặng mục tiêu → bằng cân nặng | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 501 | profileInputFromForm / selectionFromForm | "Không có" thắng danh sách đã tick | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 502 | Dị ứng khác (tự gõ) | wizard gửi chữ đã gõ lên khảo sát; để trống thì không gửi | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 503 | Dị ứng khác (tự gõ) | cập nhật: chuỗi rỗng là xóa, không có trường là giữ nguyên | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 504 | Dị ứng khác (tự gõ) | đọc từ hồ sơ BE; null là không có | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 505 | toSurveyRequest | gửi NGÀY SINH thật (không còn tuổi), enum PascalCase, slug → id BE theo code | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 506 | toSurveyRequest | ngày sinh theo giờ máy, không lệch một ngày do UTC | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 507 | toSurveyRequest | slug không có trên BE ("other") bị bỏ, id không trùng | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 508 | toSurveyRequest | gender male → Male | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 509 | toSurveyRequest | gender female → Female | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 510 | toSurveyRequest | gender other → Other | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 511 | toSurveyRequest | activityLevel sedentary → Sedentary | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 512 | toSurveyRequest | activityLevel light → Light | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 513 | toSurveyRequest | activityLevel moderate → Moderate | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 514 | toSurveyRequest | activityLevel active → Active | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 515 | toSurveyRequest | activityLevel veryActive → VeryActive | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 516 | toSurveyRequest | goal lose → LoseWeight | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 517 | toSurveyRequest | goal maintain → Maintain | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 518 | toSurveyRequest | goal gain → GainWeight | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 519 | cập nhật từng phần (PUT /healthprofile) | toBasicInfoUpdateRequest chỉ gồm giới tính, ngày sinh, chiều cao | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 520 | cập nhật từng phần (PUT /healthprofile) | toSelectionUpdateRequest luôn gửi đủ ba danh sách; rỗng nghĩa là xóa hết | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 521 | quy đổi ngược enum từ BE | không phân biệt hoa/thường, giá trị lạ rơi về mặc định an toàn | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 522 | toHealthProfileResult / fromHealthProfileDto | làm tròn số thực của BE, giữ BMI nguyên | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 523 | toHealthProfileResult / fromHealthProfileDto | đổi id dị ứng/bệnh lý/chế độ ăn của BE về slug FE theo code; có ngày sinh và mục tiêu nước | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 524 | toHealthProfileResult / fromHealthProfileDto | hồ sơ cũ chưa có ngày sinh → dateOfBirth undefined (store sẽ ước lượng từ tuổi) | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 525 | toHealthProfileResult / fromHealthProfileDto | id lạ (BE thêm mục mới mà FE chưa biết) bị bỏ, không làm hỏng hồ sơ | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 526 | toHealthProfileResult / fromHealthProfileDto | hồ sơ không có dị ứng/bệnh lý → mảng rỗng | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 527 | toHealthProfileResult / fromHealthProfileDto | thiếu danh sách dị ứng → báo lỗi, không coi là "không dị ứng" (fail-closed, BR-101/102) | Đúng như mong đợi | 🟢 PASS | 0.07s |
| 528 | phần hồ sơ giữ cục bộ (extras) | extrasFromSelection chỉ giữ slug BE không có (vd. "other") | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 529 | phần hồ sơ giữ cục bộ (extras) | selectionFromServer ghép mục BE lưu với mục "Khác" ở máy, không trùng | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 530 | phần hồ sơ giữ cục bộ (extras) | chọn → gửi BE/giữ máy → ghép lại cho ra đúng lựa chọn ban đầu | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 531 | ngày sinh ước lượng (chỉ cho hồ sơ cũ chưa có ngày sinh) | approximateDateOfBirth = 01/01 của (năm nay − tuổi) | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 532 | ngày sinh ước lượng (chỉ cho hồ sơ cũ chưa có ngày sinh) | resolveDateOfBirth giữ ngày sinh đang có nếu vẫn khớp tuổi BE | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 533 | ngày sinh ước lượng (chỉ cho hồ sơ cũ chưa có ngày sinh) | resolveDateOfBirth ước lượng lại khi ngày sinh đang có lệch tuổi BE hoặc không hợp lệ | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 534 | fromWeightHistoryDto | đảo thành mới → cũ, giữ id và cân nặng | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 535 | fromWeightHistoryDto | ngày theo giờ máy của thời điểm UTC (kể cả chuỗi thiếu múi giờ) | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 536 | fromWeightHistoryDto | chưa có điểm nào → rỗng | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 537 | fromWeightHistoryDto | không làm thay đổi mảng gốc của BE | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 538 | toRecordedAtIso | hôm nay → thời điểm hiện tại dạng ISO UTC có Z | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 539 | toRecordedAtIso | ngày khác → 12:00 giờ máy của ngày đó (không bị lệch sang ngày kề do UTC) | Đúng như mong đợi | 🟢 PASS | 0.00s |

</details>

<details><summary><b>__tests__/health/healthProfileService.api.test.ts</b> · 20/20 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 540 | submitHealthProfile | POST /healthprofile/survey với NGÀY SINH, dị ứng và chế độ ăn theo id BE; trả kết quả do BE tính | Đúng như mong đợi | 🟢 PASS | 0.30s |
| 541 | submitHealthProfile | chỉ lưu cục bộ lựa chọn "Khác" cho user hiện tại (cả user đang onboarding) | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 542 | submitHealthProfile | chưa biết user (mock/Guest) → không lưu phần cục bộ nhưng vẫn trả kết quả | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 543 | submitHealthProfile | BE báo lỗi → ném ApiError và KHÔNG lưu phần cục bộ | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 544 | getHealthProfile | GET /healthprofile → snapshot theo code + phần "Khác" cục bộ của đúng user | Đúng như mong đợi | 🟢 PASS | 0.15s |
| 545 | getHealthProfile | BE trả 404 (chưa khảo sát) → null | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 546 | getHealthProfile | mất mạng → ném lại lỗi, không coi là "chưa khảo sát" | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 547 | getHealthProfile | lỗi máy chủ → ném lại lỗi, không coi là "chưa khảo sát" | Đúng như mong đợi | 🟢 PASS | 0.12s |
| 548 | getHealthProfile | phiên hết hạn → ném lại lỗi, không coi là "chưa khảo sát" | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 549 | getWeightHistory | GET /healthprofile/weight-history → mới → cũ | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 550 | recordWeight | POST /healthprofile/weight-log (recordedAt ISO có Z) RỒI GET /healthprofile lấy chỉ số mới | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 551 | recordWeight | ghi cân nặng lỗi → ném lỗi và không đọc lại hồ sơ | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 552 | updateBasicInfo | PUT /healthprofile chỉ với giới tính, ngày sinh, chiều cao — không ghi đè cả hồ sơ | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 553 | updateBasicInfo | BE từ chối (vd. ngày sinh vô lý) → ném lỗi của BE | Đúng như mong đợi | 🟢 PASS | 0.12s |
| 554 | updateHealthSettings | PUT /healthprofile với dị ứng/bệnh lý/chế độ ăn theo id BE rồi lưu phần "Khác" ở máy | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 555 | updateHealthSettings | chỉ đổi chế độ ăn vẫn gọi BE (chế độ ăn nay do BE lưu) | Đúng như mong đợi | 🟢 PASS | 0.12s |
| 556 | updateHealthSettings | chọn "Không có" gửi danh sách rỗng để BE xóa dữ liệu cũ | Đúng như mong đợi | 🟢 PASS | 0.11s |
| 557 | updateHealthSettings | BE báo lỗi → ném lỗi và KHÔNG lưu phần ở máy | Đúng như mong đợi | 🟢 PASS | 0.18s |
| 558 | updateWaterGoal | PUT /healthprofile chỉ với waterGoalMl; trả hồ sơ mới có mục tiêu nước do BE lưu | Đúng như mong đợi | 🟢 PASS | 0.16s |
| 559 | updateWaterGoal | BE từ chối (ngoài 500–10000 ml) → ném lỗi của BE | Đúng như mong đợi | 🟢 PASS | 0.12s |

</details>

<details><summary><b>__tests__/health/metaCatalog.test.ts</b> · 10/10 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 560 | metaLookup | ánh xạ hai chiều theo code, không phụ thuộc giá trị id | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 561 | metaLookup | mục BE không có ("other") hoặc id lạ → undefined/false | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 562 | metaLookup | toMetaIds bỏ slug không có trên BE và loại trùng; toMetaCodes bỏ id lạ và loại trùng | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 563 | metaLookup | DB seed lại với id khác vẫn ánh xạ đúng (vì dựa vào code) | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 564 | danh mục mock khớp backend và các lựa chọn trên giao diện | mọi lựa chọn dị ứng của giao diện (trừ "Khác") có code tương ứng trên BE | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 565 | danh mục mock khớp backend và các lựa chọn trên giao diện | mọi lựa chọn bệnh lý của giao diện (trừ "Khác") có code tương ứng trên BE | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 566 | danh mục mock khớp backend và các lựa chọn trên giao diện | mọi lựa chọn chế độ ăn của giao diện (trừ "Khác") có code tương ứng trên BE | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 567 | danh mục mock khớp backend và các lựa chọn trên giao diện | "Khác" không có trên BE nên chỉ lưu ở máy | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 568 | getMetaCatalog | tải một lần cho cả phiên rồi dùng lại | Đúng như mong đợi | 🟢 PASS | 0.15s |
| 569 | getMetaCatalog | lỗi mạng không bị cache: lần gọi sau thử lại | Đúng như mong đợi | 🟢 PASS | 0.01s |

</details>

<details><summary><b>__tests__/health/profileExtrasStorage.test.ts</b> · 8/8 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 570 | profileExtrasStorage | save ghi JSON vào khóa theo từng user | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 571 | profileExtrasStorage | load đọc lại đúng dữ liệu đã lưu của đúng user | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 572 | profileExtrasStorage | chưa lưu gì → rỗng | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 573 | profileExtrasStorage | dữ liệu hỏng → rỗng, không ném lỗi | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 574 | profileExtrasStorage | thiếu field hoặc phần tử sai kiểu → chỉ giữ chuỗi hợp lệ | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 575 | profileExtrasStorage | dữ liệu cũ còn trường dietaryPreferenceIds (nay do BE lưu) → bỏ qua | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 576 | profileExtrasStorage | storage lỗi khi đọc → rỗng; lỗi khi ghi → không ném (chỉ cảnh báo) | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 577 | profileExtrasStorage | clear xóa khóa của user và không ném khi storage lỗi | Đúng như mong đợi | 🟢 PASS | 0.01s |

</details>

<details><summary><b>__tests__/health/useProfileData.test.tsx</b> · 8/8 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 578 | useRecordWeight | gửi cân nặng cho service, nạp chỉ số mới vào store và giữ mục "Khác" ở máy | Đúng như mong đợi | 🟢 PASS | 0.08s |
| 579 | useRecordWeight | service lỗi → store giữ nguyên, mutation báo lỗi | Đúng như mong đợi | 🟢 PASS | 0.09s |
| 580 | useUpdateBasicInfo | nạp hồ sơ mới và dùng đúng ngày sinh BE đã lưu | Đúng như mong đợi | 🟢 PASS | 0.09s |
| 581 | useUpdateHealthSettings | BE trả hồ sơ mới → nạp lại, ghép với mục "Khác" giữ ở máy | Đúng như mong đợi | 🟢 PASS | 0.08s |
| 582 | useUpdateHealthSettings | service lỗi → store giữ nguyên lựa chọn cũ | Đúng như mong đợi | 🟢 PASS | 0.12s |
| 583 | useWeightHistory | lấy lịch sử cân nặng từ service (key weight-history) | Đúng như mong đợi | 🟢 PASS | 0.08s |
| 584 | useUpdateWaterGoal | BE trả hồ sơ mới → nạp mục tiêu nước vào store và làm mới nước + Bé Mầm | Đúng như mong đợi | 🟢 PASS | 0.09s |
| 585 | useUpdateWaterGoal | BE từ chối → store giữ nguyên mục tiêu cũ, mutation báo lỗi | Đúng như mong đợi | 🟢 PASS | 0.08s |

</details>

<details><summary><b>__tests__/health/userProfileStore.test.ts</b> · 8/8 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 586 | trạng thái ban đầu | bắt đầu rỗng, không có số liệu giả | Đúng như mong đợi | 🟢 PASS | 0.38s |
| 587 | hydrateFromServer | đổ hồ sơ từ BE vào store, ghép với phần giữ cục bộ | Đúng như mong đợi | 🟢 PASS | 0.15s |
| 588 | hydrateFromServer | mục tiêu nước của BE được nạp; không có thì giữ giá trị đang dùng | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 589 | hydrateFromServer | hồ sơ cũ BE chưa có ngày sinh → ước lượng = 01/01 của (năm nay − tuổi) | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 590 | hydrateFromServer | ngày sinh đang có vẫn khớp tuổi BE → giữ nguyên (không đánh mất ngày sinh vừa nhập) | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 591 | hydrateFromServer | BE đã lưu ngày sinh → dùng đúng ngày đó, không ước lượng | Đúng như mong đợi | 🟢 PASS | 0.15s |
| 592 | hydrateFromServer | hydrate lần sau thay hẳn dữ liệu cũ (không cộng dồn dị ứng) | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 593 | hydrateFromServer | đăng xuất/xóa dữ liệu (resetUserData) đưa store về rỗng | Đúng như mong đợi | 🟢 PASS | 0.13s |

</details>

<details><summary><b>__tests__/healthCalculator.test.ts</b> · 13/13 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 594 | calculateAge (BR-020) | trừ 1 tuổi nếu chưa tới sinh nhật trong năm nay | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 595 | calculateAge (BR-020) | tính đủ tuổi khi đã qua sinh nhật trong năm | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 596 | calculateBmi (BR-021) | BMI = weight(kg) / height(m)^2 | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 597 | calculateBmr (BR-022, Mifflin-St Jeor) | nam: 10*w + 6.25*h - 5*age + 5 | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 598 | calculateBmr (BR-022, Mifflin-St Jeor) | nữ: 10*w + 6.25*h - 5*age - 161 | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 599 | calculateBmr (BR-022, Mifflin-St Jeor) | other: trung bình offset nam/nữ (chưa có BR quy định — giá trị phỏng đoán) | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 600 | calculateTdee (BR-023) | TDEE = BMR × activity factor | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 601 | calculateCalorieTarget (BR-024) | giảm cân → TDEE - 500 | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 602 | calculateCalorieTarget (BR-024) | giữ cân → xấp xỉ TDEE | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 603 | calculateCalorieTarget (BR-024) | tăng cân → TDEE + 300 | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 604 | calculateCalorieTarget (BR-024) | không xuống dưới ngưỡng an toàn tối thiểu | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 605 | calculateMacroTargets (BR-030) | protein 25% / carbs 50% / fat 25% theo calorie target | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 606 | calculateHealthProfileResult (BR-003 — chuỗi tính toán đầy đủ) | trả về BMI/BMR/TDEE/calorieTarget/macros nhất quán với từng hàm con | Đúng như mong đợi | 🟢 PASS | 0.00s |

</details>

<details><summary><b>__tests__/nutrition/date.test.ts</b> · 8/8 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 607 | formatDateIso / todayIso | theo giờ máy, không phải UTC | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 608 | formatDateIso / todayIso | đệm số 0 cho tháng/ngày một chữ số | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 609 | parseDateIso | 0h00 giờ máy của đúng ngày đó | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 610 | parseDateIso | khứ hồi với formatDateIso | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 611 | addDaysIso | cộng/trừ ngày, qua ranh giới tháng và năm | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 612 | parseApiDateTime | chuỗi UTC có Z | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 613 | parseApiDateTime | chuỗi thiếu múi giờ vẫn hiểu là UTC (BE trả DateTime kiểu Unspecified) | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 614 | parseApiDateTime | phần thập phân dài của .NET (7 chữ số) và offset rõ ràng | Đúng như mong đợi | 🟢 PASS | 0.00s |

</details>

<details><summary><b>__tests__/nutrition/healthSync.test.ts</b> · 7/7 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 615 | fromDailySummaryDto | đã đồng bộ: giữ nguồn và giờ đồng bộ, làm tròn calo | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 616 | fromDailySummaryDto | chưa đồng bộ (sources rỗng, lastSyncedAt null) → chưa có dữ liệu, không hiện "vừa đồng bộ" | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 617 | fromDailySummaryDto | đã đồng bộ nhưng 0 bước từ một nguồn thật vẫn là "đã đồng bộ" | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 618 | fromDailySummaryDto | nhiều nguồn: chỉ nguồn ưu tiên cao nhất được cộng vào ngân sách, các nguồn còn lại bị bỏ qua (BR-042) | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 619 | fromDailySummaryDto | thiếu activeSource (không nên xảy ra) → coi nguồn đầu tiên là nguồn đang dùng | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 620 | healthSyncApiService | GET /health-sync/daily-summary?date= với ngày giờ máy | Đúng như mong đợi | 🟢 PASS | 0.15s |
| 621 | healthSyncApiService.syncMetrics | POST /health-sync/steps-and-calories với ngày giờ máy, đúng tên field của BE | Đúng như mong đợi | 🟢 PASS | 0.01s |

</details>

<details><summary><b>__tests__/nutrition/nutrition.mapper.test.ts</b> · 45/45 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 622 | toDiaryItemInput | luôn gửi unit "g" và servingSize = grams (BR-053) | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 623 | toDiaryItemInput | món lấy từ danh mục mang theo id thực phẩm/công thức để "Gần đây" nhớ món | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 624 | toDiaryItemInput | logMethod: mặc định theo source, truyền rõ thì giữ nguyên | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 625 | toDiaryItemInput | món AI Snap gửi kèm URL ảnh đã chụp để nhật ký hiện lại ảnh | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 626 | toDiaryItemInput | ghi lại bản ghi đơn vị khác gram thì giữ nguyên đơn vị | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 627 | toLogMealBatchRequest | cả bữa trong một request: ngày theo giờ máy, tên bữa PascalCase, mọi món theo thứ tự | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 628 | toLogMealBatchRequest | bữa breakfast → Breakfast | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 629 | toLogMealBatchRequest | bữa lunch → Lunch | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 630 | toLogMealBatchRequest | bữa dinner → Dinner | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 631 | toLogMealBatchRequest | bữa snack → Snack | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 632 | toUpdateDiaryItemRequest | chỉ đổi bữa → chỉ gửi mealType (BE giữ nguyên các trường còn lại) | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 633 | toUpdateDiaryItemRequest | đổi khối lượng → gửi kèm dinh dưỡng đã tính lại | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 634 | toUpdateDiaryItemRequest | đổi cả bữa lẫn khối lượng | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 635 | logMethod ↔ source | Manual → manual; AiImage/Voice → ai (đã xác nhận); Barcode → database | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 636 | logMethod ↔ source | sourceToLogMethod là nghịch đảo cho bản ghi đã lưu | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 637 | fromDiaryItemDto | món tính theo gram: nhãn "450 g", bữa lấy từ DTO, giờ ghi = createdAt, dinh dưỡng làm tròn | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 638 | fromDiaryItemDto | bữa truyền vào (nhóm của daily) được ưu tiên hơn bữa trong DTO | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 639 | fromDiaryItemDto | giờ ghi thiếu múi giờ vẫn được hiểu là UTC; chuỗi hỏng → không có giờ ghi | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 640 | fromDiaryItemDto | ảnh món (AI Snap) BE trả về được giữ để nhật ký hiện ảnh; không có ảnh → undefined | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 641 | fromDiaryItemDto | nutritionPerGram tính từ số thực của BE, không từ số đã làm tròn | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 642 | fromDiaryItemDto | bản ghi do nơi khác tạo với đơn vị "phần": giữ đơn vị, số lượng thành "grams" | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 643 | fromDiaryItemDto | servingSize không hợp lệ (0) được coi là 1 để không chia cho 0 | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 644 | fromDiaryItemDto | AI → đã xác nhận (BR-054) | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 645 | fromDailyDiaryDto | luôn đủ 4 bữa, gom món đúng bữa, mục tiêu làm tròn | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 646 | fromDailyDiaryDto | tên bữa không phân biệt hoa/thường; bữa lạ rơi về bữa phụ | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 647 | fromDailyDiaryDto | calo vận động chỉ được cộng khi bật công tắc (BR-040→042) | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 648 | fromDailyDiaryDto | findEntryById tìm đúng bản ghi ở mọi bữa | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 649 | fromWeeklyProgressDto | nhãn thứ tính từ ngày (BE trả tiếng Anh), đánh dấu hôm nay, khoảng ngày | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 650 | fromWeeklyProgressDto | ngày chưa ghi gì không tính vào trung bình và "ngày đạt mục tiêu" | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 651 | fromWeeklyProgressDto | macro trung bình tính trên các ngày đã ghi, so với mục tiêu macro của hồ sơ | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 652 | fromWeeklyProgressDto | tuần chưa ghi gì → trung bình 0, không chia cho 0, ẩn khối macro | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 653 | fromWeeklyProgressDto | BE không trả ngày nào → không ném lỗi | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 654 | fromFoodDto | dinh dưỡng theo khẩu phần mặc định "100 g", dữ liệu đã xác minh | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 655 | fromFoodDto | khẩu phần có nhãn ghi kèm gram và dinh dưỡng nhân theo khẩu phần mặc định | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 656 | fromFoodDto | không có khẩu phần hoặc id mặc định lạ → rơi về khẩu phần hợp lệ, không ném lỗi | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 657 | fromFoodDto | mọi id dị ứng của BE → slug FE, bỏ trùng và id lạ; không có thì không cảnh báo | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 658 | fromFoodDto | món chưa kiểm chứng/tự nhập không được gắn "đã xác minh" (BR-120/121); giữ trạng thái yêu thích | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 659 | toCreateFoodRequest | g: số liệu của cả khẩu phần quy về trên 100 g; khẩu phần duy nhất là phần đã nhập | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 660 | toCreateFoodRequest | ml được coi như g (BE chỉ biết gam), nhãn giữ "ml" | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 661 | toCreateFoodRequest | không để nhiễu dấu phẩy động (2.4600000000000004) lên server | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 662 | toCreateFoodRequest | "phần" nhỏ: khối lượng quy ước 100 g/phần nên số trên 100 g bằng đúng số người dùng nhập | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 663 | toCreateFoodRequest | "phần" lớn: nới khối lượng để tổng đa lượng/100 g không vượt giới hạn 100 g của BE | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 664 | toCreateFoodRequest | "phần" giàu năng lượng: khối lượng đủ để không quá 900 kcal/100 g | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 665 | toCreateFoodRequest | nhiều phần: khẩu phần là cả số phần đã nhập, quy ra gam theo từng phần | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 666 | toCreateFoodRequest | khẩu phần mặc định cho đúng số đã nhập sau khi đọc lại (round-trip với fromFoodDto) | Đúng như mong đợi | 🟢 PASS | 0.00s |

</details>

<details><summary><b>__tests__/nutrition/nutritionService.api.test.ts</b> · 30/30 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 667 | getDiaryDay | GET /nutritiondiary/daily?date= và GET /health-sync/daily-summary cùng ngày, cộng calo vận động | Đúng như mong đợi | 🟢 PASS | 0.32s |
| 668 | getDiaryDay | tắt công tắc "Cộng calo vận động" → activityCalories = 0 | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 669 | getDiaryDay | lấy calo vận động lỗi → coi là 0, nhật ký vẫn hiện | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 670 | getDiaryDay | nhật ký lỗi → ném lỗi (màn hình hiện ErrorState) | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 671 | addLogEntries | cả bữa trong MỘT request POST /nutritiondiary/log/batch, trả các bản ghi đã tạo kèm giờ ghi | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 672 | addLogEntries | có idempotencyKey → gửi header Idempotency-Key để gửi lại không ghi trùng (F12) | Đúng như mong đợi | 🟢 PASS | 0.28s |
| 673 | addLogEntries | món lấy từ danh mục mang theo id thực phẩm | Đúng như mong đợi | 🟢 PASS | 0.20s |
| 674 | addLogEntries | lỗi → không món nào được lưu: ném đúng lỗi gốc, không còn "lưu một phần" | Đúng như mong đợi | 🟢 PASS | 0.23s |
| 675 | addLogEntries | danh sách rỗng → không gọi API (BE từ chối danh sách rỗng) | Đúng như mong đợi | 🟢 PASS | 0.18s |
| 676 | updateLogEntry | đổi khối lượng: đọc bản ghi, tính lại dinh dưỡng rồi PUT /nutritiondiary/items/{id} (không tạo bản mới) | Đúng như mong đợi | 🟢 PASS | 0.16s |
| 677 | updateLogEntry | chỉ đổi bữa: PUT { mealType } và không cần đọc nhật ký | Đúng như mong đợi | 🟢 PASS | 0.15s |
| 678 | updateLogEntry | đổi cả bữa lẫn khối lượng trong một PUT | Đúng như mong đợi | 🟢 PASS | 0.16s |
| 679 | updateLogEntry | không thấy bản ghi → báo lỗi, không ghi gì | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 680 | updateLogEntry | bản ghi đơn vị "phần": đổi số lượng, không gửi đơn vị (BE giữ nguyên) | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 681 | updateLogEntry | PUT lỗi → ném lỗi gốc để màn hình báo, nhật ký không bị đổi | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 682 | deleteLogEntry | DELETE /nutritiondiary/items/{id} | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 683 | deleteLogEntry | BE báo không tìm thấy → ném lỗi | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 684 | foods | searchFoods: GET /foods với search, scope, trang; mọi dị ứng đổi sang slug, khẩu phần nhân đúng | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 685 | foods | bộ lọc "all" → scope tương ứng của BE, không còn tự trả rỗng hay lấy ở máy | Đúng như mong đợi | 🟢 PASS | 0.12s |
| 686 | foods | bộ lọc "recent" → scope tương ứng của BE, không còn tự trả rỗng hay lấy ở máy | Đúng như mong đợi | 🟢 PASS | 0.12s |
| 687 | foods | bộ lọc "favorite" → scope tương ứng của BE, không còn tự trả rỗng hay lấy ở máy | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 688 | foods | bộ lọc "mine" → scope tương ứng của BE, không còn tự trả rỗng hay lấy ở máy | Đúng như mong đợi | 🟢 PASS | 0.12s |
| 689 | foods | searchFoods lỗi → ném lỗi gốc (màn hình hiện ErrorState) | Đúng như mong đợi | 🟢 PASS | 0.11s |
| 690 | foods | getFoodById: GET /foods/{id} | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 691 | foods | createFood: POST /foods với số liệu quy về trên 100 g; món trả về là "do bạn nhập", chưa xác minh | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 692 | foods | createFood: BE từ chối (trùng tên…) → ném lỗi gốc với thông báo tiếng Việt | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 693 | foods | setFoodFavorite(true) → POST /foods/{id}/favorite, trả trạng thái do BE xác nhận | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 694 | foods | setFoodFavorite(false) → DELETE /foods/{id}/favorite | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 695 | getWeeklyProgress | GET /nutritiondiary/weekly-progress?startDate= = 6 ngày trước, kết thúc ở hôm nay; có macro trung bình | Đúng như mong đợi | 🟢 PASS | 0.15s |
| 696 | phủ hết hàm của feature | tạo món và yêu thích đã nối API (không còn rơi về mock) | Đúng như mong đợi | 🟢 PASS | 0.15s |

</details>

<details><summary><b>__tests__/nutrition/offlineQueue.test.ts</b> · 5/5 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 697 | hàng đợi offline (F12) | mục chờ giữ nguyên payload + khóa idempotency hợp lệ với máy chủ; nhãn dễ đọc | Đúng như mong đợi | 🟢 PASS | 0.38s |
| 698 | hàng đợi offline (F12) | gửi lại đúng khóa cũ; thành công thì xoá khỏi hàng đợi và khỏi bộ nhớ máy | Đúng như mong đợi | 🟢 PASS | 0.25s |
| 699 | hàng đợi offline (F12) | vẫn mất mạng → dừng, giữ nguyên các mục để lần sau gửi lại | Đúng như mong đợi | 🟢 PASS | 0.24s |
| 700 | hàng đợi offline (F12) | máy chủ từ chối (lỗi nghiệp vụ) → đánh dấu lỗi, không gửi lại tự động, mục sau vẫn được gửi | Đúng như mong đợi | 🟢 PASS | 0.25s |
| 701 | hàng đợi offline (F12) | hàng đợi lưu theo tài khoản: nạp lại sau khi mở app; dữ liệu hỏng thì bỏ qua | Đúng như mong đợi | 🟢 PASS | 0.27s |

</details>

<details><summary><b>__tests__/nutrition/progress.test.ts</b> · 5/5 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 702 | buildDayProgress | calo từng bữa theo thứ tự Sáng–Trưa–Tối–Phụ, tổng và ngân sách gồm calo vận động | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 703 | buildDayProgress | macro cộng dồn cả ngày so với mục tiêu | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 704 | fromMonthlyProgressDto | nhãn ngày trong tháng mỗi 5 ngày và ngày cuối, các ngày khác để trống | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 705 | fromMonthlyProgressDto | trung bình và ngày đạt mục tiêu chỉ tính các ngày đã ghi | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 706 | pickedFoodFromItem | lấy khẩu phần mặc định và dinh dưỡng của khẩu phần đó, key duy nhất theo thời điểm chọn | Đúng như mong đợi | 🟢 PASS | 0.00s |

</details>

<details><summary><b>__tests__/premium/bankAppLink.test.ts</b> · 4/4 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 707 | buildBankAppLink | biết mã VietQR của ngân hàng nhận → kèm STK@mã, số tiền, nội dung, chủ TK và trang quay về http | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 708 | buildBankAppLink | không biết mã ngân hàng nhận → chỉ mở app (người dùng dán nội dung đã được sao chép) | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 709 | bankReturnPageUrl | trang quay về trên backend, deep link của app được mã hóa trong `to` | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 710 | BANK_APPS | app tự điền đứng đầu danh sách, mã app không trùng | Đúng như mong đợi | 🟢 PASS | 0.00s |

</details>

<details><summary><b>__tests__/premium/paymentCheckTrigger.test.ts</b> · 2/2 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 711 | PaymentCheckTrigger | không ai gọi checkNow → chờ đủ thời gian | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 712 | PaymentCheckTrigger | checkNow kết thúc ngay mọi lượt đang chờ; gọi khi không có ai chờ thì không ảnh hưởng lượt sau | Đúng như mong đợi | 🟢 PASS | 0.00s |

</details>

<details><summary><b>__tests__/premium/premium.mapper.test.ts</b> · 19/19 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 713 | mã gói và phương thức thanh toán | gói FE ↔ id của BE, không phân biệt hoa/thường, gói lạ → null | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 714 | mã gói và phương thức thanh toán | phương thức FE ↔ BE: mở app ngân hàng/SePay/PayOS để chọn; giao dịch cũ giữ nhãn cũ; giá trị lạ → mặc định SePay | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 715 | fromPlanDto | giá do BE quyết định, nhãn theo chu kỳ (không dùng tên dài của BE) | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 716 | fromPlanDto | gói chưa có trong FE bị bỏ | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 717 | fromStatusDto | Premium: gói và ngày hết hạn theo giờ máy | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 718 | fromStatusDto | trạng thái "Free" → free | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 719 | fromStatusDto | trạng thái "Premium" → premium | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 720 | fromStatusDto | trạng thái "Expired" → expired | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 721 | fromStatusDto | trạng thái "Cancelled" → cancelled | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 722 | fromStatusDto | trạng thái "premium" → premium | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 723 | fromStatusDto | trạng thái "Gì đó lạ" → free | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 724 | fromStatusDto | chưa từng có gói → không gói, không hạn | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 725 | fromStatusDto | ngày hết hạn hỏng → không có hạn thay vì làm hỏng cả trạng thái | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 726 | isProMembership | Premium và "đã hủy gia hạn" còn dùng được Pro; Free và hết hạn thì không | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 727 | fromTransactionDto | Paid → thành công, không ghi chú | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 728 | fromTransactionDto | Pending → đang chờ kèm ghi chú "chỉ kích hoạt sau khi xác nhận" (BR-241/242) | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 729 | fromTransactionDto | Failed → thất bại kèm ghi chú "chưa bị trừ tiền"; trạng thái lạ coi là đang chờ | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 730 | fromTransactionDto | giao dịch kích hoạt thử (MOCK) hiện đúng phương thức; gói lạ bị bỏ | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 731 | fromTransactionDto | thời điểm tạo thiếu múi giờ vẫn được hiểu là UTC | Đúng như mong đợi | 🟢 PASS | 0.00s |

</details>

<details><summary><b>__tests__/premium/premiumService.api.test.ts</b> · 15/15 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 732 | checkout SePay (chuyển khoản VietQR vào tài khoản ngân hàng) | báo QR + thông tin chuyển khoản cho màn hình, hỏi check-status tới khi server xác nhận; không kích hoạt thử | Đúng như mong đợi | 🟢 PASS | 0.31s |
| 733 | checkout SePay (chuyển khoản VietQR vào tài khoản ngân hàng) | gói năm gửi PRO_YEARLY | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 734 | checkout SePay (chuyển khoản VietQR vào tài khoản ngân hàng) | tạo giao dịch lỗi (vd. SePay chưa cấu hình) → ném lỗi của BE, không chờ gì | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 735 | checkout SePay (chuyển khoản VietQR vào tài khoản ngân hàng) | chờ tới hạn của mã QR (lâu hơn 10 phút) mà chưa nhận được tiền → PaymentNotConfirmedError, KHÔNG coi là Pro | Đúng như mong đợi | 🟢 PASS | 0.21s |
| 736 | checkout mở app ngân hàng (BANK_APP, không QR) | gửi BANK_APP, báo số tài khoản + nội dung + mã VietQR của ngân hàng nhận (không QR) rồi chờ server xác nhận | Đúng như mong đợi | 🟢 PASS | 0.16s |
| 737 | checkout mở app ngân hàng (BANK_APP, không QR) | "Tôi đã chuyển khoản"/quay lại app: trigger hỏi ngay không chờ hết nhịp; mỗi lần còn chờ thì báo onPending | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 738 | checkout PayOS (cổng thật: hiện QR, server hỏi PayOS) | báo phiên (QR, mã đơn) cho màn hình rồi hỏi check-status tới khi server xác nhận; không kích hoạt thử | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 739 | checkout PayOS (cổng thật: hiện QR, server hỏi PayOS) | gửi kèm deep link của app để PayOS chuyển về đúng app (Expo Go: exp://…/--/payment-result) | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 740 | checkout PayOS (cổng thật: hiện QR, server hỏi PayOS) | PayOS báo đơn bị hủy/hết hạn → PaymentFailedError | Đúng như mong đợi | 🟢 PASS | 0.12s |
| 741 | checkout PayOS (cổng thật: hiện QR, server hỏi PayOS) | rời màn hình (abort) → dừng hỏi, PaymentCancelledError | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 742 | trạng thái, giao dịch, bảng giá, hủy gia hạn | getStatus: GET /subscription/status | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 743 | trạng thái, giao dịch, bảng giá, hủy gia hạn | getTransactions: GET /subscription/transactions, bỏ giao dịch gói lạ | Đúng như mong đợi | 🟢 PASS | 0.12s |
| 744 | trạng thái, giao dịch, bảng giá, hủy gia hạn | getPlans: GET /subscription/plans → giá do BE | Đúng như mong đợi | 🟢 PASS | 0.16s |
| 745 | trạng thái, giao dịch, bảng giá, hủy gia hạn | cancelRenewal: POST /subscription/cancel → "đã hủy" nhưng vẫn còn hạn | Đúng như mong đợi | 🟢 PASS | 0.12s |
| 746 | trạng thái, giao dịch, bảng giá, hủy gia hạn | cancelRenewal khi chưa có Pro → ném lỗi của BE | Đúng như mong đợi | 🟢 PASS | 0.16s |

</details>

<details><summary><b>__tests__/premium/premiumStore.test.ts</b> · 2/2 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 747 | premiumStore | hydrateMembership nạp đúng trạng thái; Pro tính cả "đã hủy gia hạn" | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 748 | premiumStore | resetToFree xóa gói; expireMembership chuyển sang "hết hạn" | Đúng như mong đợi | 🟢 PASS | 0.00s |

</details>

<details><summary><b>__tests__/premium/useSubscription.test.tsx</b> · 7/7 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 749 | useSubscriptionStatus | đọc trạng thái từ server và nạp vào premiumStore | Đúng như mong đợi | 🟢 PASS | 0.03s |
| 750 | useSubscriptionStatus | server lỗi → store giữ nguyên trạng thái đang có | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 751 | useSubscriptionPlans / useSubscriptionTransactions | bảng giá và lịch sử giao dịch lấy từ service | Đúng như mong đợi | 🟢 PASS | 0.02s |
| 752 | useCheckoutPremium | thanh toán xong (server đã xác nhận) → nạp gói vào store, làm mới giao dịch và hạn mức AI | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 753 | useCheckoutPremium | lỗi/chưa xác nhận → KHÔNG kích hoạt Pro ở máy, nhưng vẫn đọc lại gói và lịch sử từ server | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 754 | useCancelRenewal | hủy gia hạn → store thành "đã hủy" (vẫn còn hạn), làm mới trạng thái và hạn mức AI | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 755 | useCancelRenewal | BE từ chối → store giữ nguyên | Đúng như mong đợi | 🟢 PASS | 0.05s |

</details>

<details><summary><b>__tests__/profile/healthConnect.test.ts</b> · 13/13 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 756 | parseHealthConnectPreferences | chưa lưu / dữ liệu hỏng → mặc định (chưa kết nối, bật mọi nguồn) | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 757 | parseHealthConnectPreferences | đọc lại đúng tùy chọn đã lưu, bỏ id nguồn lạ | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 758 | parseHealthConnectPreferences | connected sai kiểu → dùng mặc định | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 759 | healthConnectPreferences (lưu theo user) | ghi/đọc theo khóa của user hiện tại; chưa đăng nhập dùng khóa "guest" | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 760 | healthConnectPreferences (lưu theo user) | storage lỗi khi đọc → mặc định, không ném lỗi | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 761 | toHealthConnectState | ghép tùy chọn cục bộ với số liệu hôm nay của BE | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 762 | toHealthConnectState | hôm nay chưa đồng bộ → "Chưa đồng bộ" và số liệu 0 | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 763 | toHealthConnectState | chưa kết nối | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 764 | healthConnectApiService | getStatus: tùy chọn cục bộ + số liệu hôm nay từ health-sync, không báo "đã kết nối" khi chưa đọc được thật | Đúng như mong đợi | 🟢 PASS | 0.12s |
| 765 | healthConnectApiService | toggleSource: bật/tắt nguồn trong tùy chọn cục bộ | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 766 | healthConnectApiService | disconnect lưu cờ "chưa kết nối", giữ nguồn đã tắt; connect báo rõ chưa hỗ trợ, không giả vờ kết nối | Đúng như mong đợi | 🟢 PASS | 0.16s |
| 767 | healthConnectApiService | syncNow (__DEV__=true): báo rõ cần Dev Client, không gửi số liệu mẫu lên server | Đúng như mong đợi | 🟢 PASS | 0.12s |
| 768 | healthConnectApiService | syncNow (__DEV__=false): báo rõ cần Dev Client, không gửi số liệu mẫu lên server | Đúng như mong đợi | 🟢 PASS | 0.12s |

</details>

<details><summary><b>__tests__/profile/notifications.test.ts</b> · 5/5 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 769 | notifications.mapper | nhãn thời gian theo giờ máy: hôm nay HH:mm, hôm qua, ngày trước dd/MM, năm khác dd/MM/yyyy | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 770 | notifications.mapper | nhóm của server → biểu tượng; nhóm lạ vẫn hiện với biểu tượng chung | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 771 | notifications.mapper | thời điểm BE thiếu hậu tố múi giờ vẫn hiểu là UTC | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 772 | notificationsService.api | GET /notifications kèm ngày theo máy; trả danh sách đã quy đổi và số chưa đọc | Đúng như mong đợi | 🟢 PASS | 0.20s |
| 773 | notificationsService.api | đánh dấu một thông báo / tất cả đã đọc gọi đúng endpoint | Đúng như mong đợi | 🟢 PASS | 0.13s |

</details>

<details><summary><b>__tests__/profile/realtimeNotifications.test.ts</b> · 7/7 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 774 | subscribeToNotifications | payload hợp lệ → NotificationItem + nhóm; payload lạ bị bỏ qua | Đúng như mong đợi | 🟢 PASS | 0.28s |
| 775 | useRealtimeNotifications | chưa đăng nhập (Guest) → không mở kết nối | Đúng như mong đợi | 🟢 PASS | 0.04s |
| 776 | useRealtimeNotifications | thông báo mới → đầu danh sách, +1 chưa đọc, báo ra ngoài; nhận lại cùng id không thêm lần nữa | Đúng như mong đợi | 🟢 PASS | 0.12s |
| 777 | useRealtimeNotifications | gói Pro vừa kích hoạt → nạp lại gói vào premiumStore để mở khóa ngay | Đúng như mong đợi | 🟢 PASS | 0.08s |
| 778 | useRealtimeNotifications | kết nối xong → đọc lại danh sách; hết phiên → ngắt kết nối | Đúng như mong đợi | 🟢 PASS | 0.11s |
| 779 | notificationTarget | mỗi nhóm mở đúng màn; đi chợ là route lồng trong tab Thực đơn; nhóm chung không có màn | Đúng như mong đợi | 🟢 PASS | 0.11s |
| 780 | notificationTarget | chỉ nhận biểu tượng hợp lệ đọc lại từ data của thông báo hệ thống | Đúng như mong đợi | 🟢 PASS | 0.10s |

</details>

<details><summary><b>__tests__/profile/reminders.test.ts</b> · 7/7 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 781 | reminderSchedule | mặc định: sáng/trưa/tối + 7 lần uống nước + chuỗi ngày; bữa phụ và thử thách không lên lịch | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 782 | reminderSchedule | tắt hết → không có nhắc nào | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 783 | reminderSchedule | dữ liệu lưu hỏng hoặc thiếu field → giữ mặc định cho phần thiếu | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 784 | remindersService | banner theo quyền thông báo thật; nhãn giờ theo cài đặt | Đúng như mong đợi | 🟢 PASS | 19.95s |
| 785 | remindersService | bật nhắc bữa phụ: lưu lại, xin quyền, lên lịch lại có bữa phụ | Đúng như mong đợi | 🟢 PASS | 3.08s |
| 786 | remindersService | tắt nhắc nước khi chưa có quyền: chỉ lưu, không xin quyền, không lên lịch | Đúng như mong đợi | 🟢 PASS | 3.03s |
| 787 | remindersService | người dùng từ chối quyền: cài đặt vẫn lưu nhưng không lên lịch | Đúng như mong đợi | 🟢 PASS | 3.06s |

</details>

<details><summary><b>__tests__/profile/useEditProfile.test.tsx</b> · 5/5 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 788 | useEditProfile | chỉ đổi họ tên → chỉ gọi cập nhật tài khoản | Đúng như mong đợi | 🟢 PASS | 0.06s |
| 789 | useEditProfile | chỉ đổi thông tin cơ bản → chỉ gọi cập nhật hồ sơ sức khỏe | Đúng như mong đợi | 🟢 PASS | 0.09s |
| 790 | useEditProfile | đổi cả hai → họ tên trước, hồ sơ sức khỏe sau | Đúng như mong đợi | 🟢 PASS | 0.09s |
| 791 | useEditProfile | lưu họ tên lỗi → dừng, không đụng tới hồ sơ sức khỏe | Đúng như mong đợi | 🟢 PASS | 0.08s |
| 792 | useEditProfile | họ tên đã lưu nhưng hồ sơ sức khỏe lỗi → báo lỗi (họ tên đã được ghi vào tài khoản) | Đúng như mong đợi | 🟢 PASS | 0.08s |

</details>

<details><summary><b>__tests__/realtime/realtimeConnection.test.ts</b> · 5/5 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 793 | realtimeConnection.test.ts | kết nối WebSocket tới hub dưới base URL API, gắn handler và báo đã kết nối | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 794 | realtimeConnection.test.ts | kết nối lỗi (server chưa chạy) → thử lại sau 1s, 2s… tới khi được | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 795 | realtimeConnection.test.ts | rớt kết nối → tự kết nối lại và báo onConnected để lấy bù dữ liệu | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 796 | realtimeConnection.test.ts | quay lại app khi đang mất kết nối → kết nối lại ngay, không đợi lượt thử kế tiếp | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 797 | realtimeConnection.test.ts | đóng (đăng xuất) → ngắt kết nối, bỏ nghe AppState và không thử lại nữa | Đúng như mong đợi | 🟢 PASS | 0.00s |

</details>

<details><summary><b>__tests__/recipes/recipe.mapper.test.ts</b> · 7/7 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 798 | recipe.mapper | dị ứng và tag ánh xạ theo code, chỉ giữ tag FE biết, bữa hợp lệ, số làm tròn | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 799 | recipe.mapper | chỉ nhận ảnh URL tuyệt đối; tách các bước và bỏ tiền tố số | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 800 | recipe.mapper | bộ sưu tập giữ quyền sở hữu và chế độ chia sẻ | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 801 | recipe.mapper | chủ sở hữu thấy mã liên kết chia sẻ đang bật | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 802 | recipe.mapper | bộ lọc → tham số GET /recipes; chỉ yêu cầu loại dị ứng khi đã đăng nhập | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 803 | recipeService.api — liên kết chia sẻ bộ sưu tập | bật / tắt liên kết gọi đúng endpoint của chủ sở hữu | Đúng như mong đợi | 🟢 PASS | 0.29s |
| 804 | recipeService.api — liên kết chia sẻ bộ sưu tập | mở liên kết: đọc bộ sưu tập theo mã; liên kết đã tắt (404) → undefined | Đúng như mong đợi | 🟢 PASS | 0.13s |

</details>

<details><summary><b>__tests__/recipes/recipeFilters.test.ts</b> · 14/14 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 805 | filterOutUserAllergens | loại món chứa dị ứng đã khai báo và trả các dị ứng đã dùng để lọc | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 806 | filterOutUserAllergens | chưa khai báo dị ứng → giữ nguyên danh sách, không báo dị ứng nào | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 807 | filterOutUserAllergens | mọi món đều chứa dị ứng → danh sách rỗng (không trả món chưa lọc) | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 808 | matchesCalorieFilter | under300 với 299 kcal → true | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 809 | matchesCalorieFilter | under300 với 300 kcal → false | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 810 | matchesCalorieFilter | 300to500 với 300 kcal → true | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 811 | matchesCalorieFilter | 300to500 với 500 kcal → true | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 812 | matchesCalorieFilter | 300to500 với 501 kcal → false | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 813 | matchesCalorieFilter | over500 với 500 kcal → false | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 814 | matchesCalorieFilter | over500 với 501 kcal → true | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 815 | matchesCalorieFilter | không chọn khoảng calo → món nào cũng khớp | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 816 | foldText / matchIngredientCount | bỏ dấu tiếng Việt, đ → d, chữ thường, cắt khoảng trắng | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 817 | foldText / matchIngredientCount | đếm nguyên liệu khớp theo cả hai chiều chứa nhau, bỏ qua tên rỗng | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 818 | rankByPantry | bỏ món không khớp nguyên liệu nào, xếp theo tỉ lệ nguyên liệu đang có giảm dần | Đúng như mong đợi | 🟢 PASS | 0.00s |

</details>

<details><summary><b>__tests__/recipes/recipeService.api.test.ts</b> · 8/8 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 819 | getRecommended | đã đăng nhập → gửi excludeMyAllergens, FE vẫn lọc lại món chứa dị ứng và báo dị ứng đang lọc | Đúng như mong đợi | 🟢 PASS | 0.36s |
| 820 | getRecommended | khách (chưa đăng nhập) → không gửi excludeMyAllergens, không báo dị ứng | Đúng như mong đợi | 🟢 PASS | 0.16s |
| 821 | getRecommended | khoảng 300–500 kcal: BE chỉ có maxCalories nên FE bỏ món dưới 300 kcal | Đúng như mong đợi | 🟢 PASS | 0.15s |
| 822 | getRecipeById | GET /recipes/{id} → Recipe đã ánh xạ | Đúng như mong đợi | 🟢 PASS | 0.15s |
| 823 | getRecipeById | 404 → undefined (màn hiện "không tìm thấy"); lỗi khác ném nguyên | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 824 | getRecipesForIngredients | POST /recipes/suggest-by-pantry, bỏ món chứa dị ứng rồi xếp theo tỉ lệ nguyên liệu đang có | Đúng như mong đợi | 🟢 PASS | 0.16s |
| 825 | collections & favorites | tạo bộ sưu tập cắt khoảng trắng tên; thêm/xóa món gọi đúng endpoint | Đúng như mong đợi | 🟢 PASS | 0.19s |
| 826 | collections & favorites | toggleFavorite trả trạng thái mới của BE; liên kết chia sẻ sai → undefined | Đúng như mong đợi | 🟢 PASS | 0.20s |

</details>

<details><summary><b>__tests__/scanner/FridgeScreen.test.tsx</b> · 8/8 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 827 | FridgeScreen ingredient review | AI ingredients require selection and an explicit confirmation before requesting recipes | Đúng như mong đợi | 🟢 PASS | 0.39s |
| 828 | FridgeScreen ingredient review | selecting all remains an explicit review step before recipe suggestions | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 829 | FridgeScreen ingredient review | adding a trimmed name confirms only the manually entered ingredient and clears the input | Đúng như mong đợi | 🟢 PASS | 0.19s |
| 830 | FridgeScreen ingredient review | manual entry also makes the empty scan usable | Đúng như mong đợi | 🟢 PASS | 0.10s |
| 831 | FridgeScreen ingredient review | editing does not toggle selection, and saving the corrected name invalidates old suggestions | Đúng như mong đợi | 🟢 PASS | 0.26s |
| 832 | FridgeScreen ingredient review | a duplicate edit stays open and preserves the original ingredients | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 833 | FridgeScreen ingredient review | removing the selected ingredient clears suggestions and disables confirmation | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 834 | FridgeScreen ingredient review | a failed recipe request shows an actionable error and retries the request | Đúng như mong đợi | 🟢 PASS | 0.12s |

</details>

<details><summary><b>__tests__/scanner/scannerService.api.test.ts</b> · 6/6 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 835 | scannerService.api | scanBarcode gửi { barcode } tới /ai/check-safety và map sản phẩm + cảnh báo | Đúng như mong đợi | 🟢 PASS | 0.19s |
| 836 | scannerService.api | scanBarcode trả null khi server không có sản phẩm (404) — không bịa sản phẩm mặc định | Đúng như mong đợi | 🟢 PASS | 0.11s |
| 837 | scannerService.api | scanBarcode ném lại lỗi khác 404 | Đúng như mong đợi | 🟢 PASS | 0.09s |
| 838 | scannerService.api | analyzeOcrLabel gửi ảnh multipart tới /ai/scan-label; trường nhãn không ghi để trống | Đúng như mong đợi | 🟢 PASS | 0.11s |
| 839 | scannerService.api | scanFridge gửi từng ảnh, gộp nguyên liệu bỏ trùng, mọi món chờ xác nhận | Đúng như mong đợi | 🟢 PASS | 0.11s |
| 840 | scannerService.api | scanFridge không có ảnh thì báo lỗi, không gửi ảnh mẫu | Đúng như mong đợi | 🟢 PASS | 0.10s |

</details>

<details><summary><b>__tests__/ui/AppText.test.tsx</b> · 4/4 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 841 | AppText | dùng màu của prop color khi className không đặt màu chữ | Đúng như mong đợi | 🟢 PASS | 0.03s |
| 842 | AppText | màu chữ trong className thay hẳn màu mặc định | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 843 | AppText | nhận cả màu có độ mờ (text-on-primary/80) | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 844 | AppText | cỡ chữ và căn lề (text-body, text-center) không bị coi là màu | Đúng như mong đợi | 🟢 PASS | 0.00s |

</details>

<details><summary><b>__tests__/ui/ThemeProvider.test.tsx</b> · 7/7 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 845 | ThemeProvider | font Inter chưa tải xong vẫn render children và báo onReady đúng 1 lần (không treo splash) | Đúng như mong đợi | 🟢 PASS | 0.08s |
| 846 | ThemeProvider | font lỗi khi tải cũng không chặn render | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 847 | ThemeProvider | chưa đọc xong theme mode đã lưu thì chưa render (tránh chớp sáng/tối) | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 848 | ThemeProvider | khôi phục chế độ tối đã lưu và dùng bảng màu tối | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 849 | ThemeProvider | giá trị lưu không hợp lệ → theo hệ thống (sáng) | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 850 | ThemeProvider | setMode đổi theme ngay và lưu lại cho lần mở app sau | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 851 | ThemeProvider | useTheme() ngoài ThemeProvider ném lỗi rõ ràng | Đúng như mong đợi | 🟢 PASS | 0.06s |

</details>

<details><summary><b>__tests__/utils/haptics.test.ts</b> · 11/11 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 852 | triggerHaptic | light → impactAsync(light) | Đúng như mong đợi | 🟢 PASS | 0.19s |
| 853 | triggerHaptic | medium → impactAsync(medium) | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 854 | triggerHaptic | heavy → impactAsync(heavy) | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 855 | triggerHaptic | success → notificationAsync(success) | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 856 | triggerHaptic | warning → notificationAsync(warning) | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 857 | triggerHaptic | error → notificationAsync(error) | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 858 | triggerHaptic | selection và loại không xác định → selectionAsync | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 859 | triggerHaptic | mặc định là light | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 860 | triggerHaptic | web → không gọi expo-haptics | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 861 | triggerHaptic | thiết bị không hỗ trợ (API ném lỗi) → nuốt lỗi, không ném ra UI | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 862 | triggerHaptic | haptic.* là lối tắt cho từng loại | Đúng như mong đợi | 🟢 PASS | 0.01s |

</details>

<details><summary><b>__tests__/water/water.mapper.test.ts</b> · 8/8 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 863 | fromWaterEntryDto | giờ ghi hiển thị theo giờ máy ("HH:mm") | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 864 | fromWaterEntryDto | thời điểm thiếu múi giờ vẫn được hiểu là UTC | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 865 | fromWaterEntryDto | thời điểm hỏng → nhãn giờ để trống, không làm hỏng cả danh sách | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 866 | fromWaterHistoryToDay | tổng, mục tiêu và các lần uống theo thứ tự BE trả (cũ → mới) | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 867 | fromWaterHistoryToDay | ngày không có trong lịch sử → chưa uống gì nhưng vẫn có mục tiêu | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 868 | fromWaterHistoryToWeek | nhãn thứ tính từ ngày (BE chỉ trả ngày), đánh dấu hôm nay | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 869 | fromWaterHistoryToWeek | mục tiêu hiện tại của hồ sơ áp cho mọi ngày; "Đạt n/7 ngày" đếm ngày ≥ mục tiêu | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 870 | fromWaterHistoryToWeek | chưa có ngày nào → rỗng, không ném lỗi | Đúng như mong đợi | 🟢 PASS | 0.00s |

</details>

<details><summary><b>__tests__/water/waterService.api.test.ts</b> · 9/9 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 871 | getDaySummary | GET /nutritiondiary/water?date=&days=1 → tổng, mục tiêu của hồ sơ, các lần uống | Đúng như mong đợi | 🟢 PASS | 0.26s |
| 872 | getDaySummary | lỗi → ném lỗi gốc (màn hình hiện ErrorState) | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 873 | addEntry | POST /nutritiondiary/water với lượng nước và ngày; trả lần uống mang id do BE cấp | Đúng như mong đợi | 🟢 PASS | 0.15s |
| 874 | addEntry | BE từ chối (vd. quá 5000 ml) → ném lỗi của BE | Đúng như mong đợi | 🟢 PASS | 0.12s |
| 875 | undoLastEntry | đọc các lần uống của ngày rồi DELETE lần mới nhất | Đúng như mong đợi | 🟢 PASS | 0.12s |
| 876 | undoLastEntry | chưa có lần uống nào → không gọi DELETE | Đúng như mong đợi | 🟢 PASS | 0.12s |
| 877 | deleteEntry | DELETE /nutritiondiary/water/{id} | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 878 | deleteEntry | lần uống không tồn tại → ném lỗi NOT_FOUND | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 879 | getWeekSummary | GET /nutritiondiary/water?date=&days=7, "Đạt n/7 ngày" theo mục tiêu của hồ sơ | Đúng như mong đợi | 🟢 PASS | 0.13s |

</details>

### A.3 Mobile — Jest live test (`__tests__/live/`, gọi backend Docker thật)

<details><summary><b>__tests__/live/ai.live.test.ts</b> · 5/7 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 880 | AI (backend thật) | tài khoản Free mới: 5 lượt/ngày, chưa dùng lượt nào, làm mới trong vòng 24 giờ tới (đúng đầu giờ) | Đúng như mong đợi | 🟢 PASS | 0.84s |
| 881 | AI (backend thật) | Voice Log từ văn bản: trả các món kèm dinh dưỡng, bữa theo lựa chọn, và trừ đúng một lượt | ApiError: Dịch vụ AI đang gặp sự cố, vui lòng thử lại sau. at toApiError (D:\Sem8\PRM393\SmartMeal\frontend\SmartMealMobile\src\services\api\errors.ts:132:12) at D:\Sem8\PRM393\… | 🔴 FAIL | 50.59s |
| 882 | AI (backend thật) | Voice Log từ file ghi âm: gửi multipart `audio`, trả món + câu chép lời, trừ đúng một lượt | Error: Chưa nghe ra món ăn nào trong đoạn ghi âm. Hãy nói rõ hơn hoặc gõ bữa ăn của bạn. at D:\Sem8\PRM393\SmartMeal\frontend\SmartMealMobile\src\features\ai\services\aiService.… | 🔴 FAIL | 29.55s |
| 883 | AI (backend thật) | văn bản không hợp lệ (quá ngắn) → BE từ chối và KHÔNG trừ lượt | Đúng như mong đợi | 🟢 PASS | 0.17s |
| 884 | AI (backend thật) | không có văn bản (chưa có nhận dạng giọng nói) → báo chưa hỗ trợ, không gọi BE, không trừ lượt | Đúng như mong đợi | 🟢 PASS | 0.16s |
| 885 | AI (backend thật) | hết 5 lượt → lượt thứ 6 bị từ chối 429 (nhận ra được để mở màn "Hết lượt AI"); nâng cấp Pro thì dùng lại được | Đúng như mong đợi | 🟢 PASS | 31.56s |
| 886 | AI (backend thật) | hạn mức của mỗi tài khoản tách biệt | Đúng như mong đợi | 🟢 PASS | 1.86s |

</details>

<details><summary><b>__tests__/live/auth.live.test.ts</b> · 12/12 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 887 | auth (backend thật) | đăng ký lưu cả hai token, /auth/me trả đúng người dùng chưa có hồ sơ | Đúng như mong đợi | 🟢 PASS | 0.16s |
| 888 | auth (backend thật) | xóa tài khoản: sai mật khẩu bị từ chối; đúng mật khẩu thì xóa hẳn, không đăng nhập lại được | Đúng như mong đợi | 🟢 PASS | 0.77s |
| 889 | auth (backend thật) | email trùng → lỗi nghiệp vụ tiếng Việt của BE, không lưu token | Đúng như mong đợi | 🟢 PASS | 0.16s |
| 890 | auth (backend thật) | access token hết hạn → interceptor tự làm mới và request vẫn thành công, token được xoay vòng | Đúng như mong đợi | 🟢 PASS | 0.17s |
| 891 | auth (backend thật) | nhiều request cùng hết hạn chỉ làm mới một lần và đều thành công | Đúng như mong đợi | 🟢 PASS | 0.17s |
| 892 | auth (backend thật) | đăng xuất thu hồi refresh token: phiên cũ không làm mới được nữa → báo hết phiên | Đúng như mong đợi | 🟢 PASS | 0.18s |
| 893 | auth (backend thật) | sai mật khẩu là 401 nhưng KHÔNG phải hết phiên; đúng mật khẩu thì đăng nhập được | Đúng như mong đợi | 🟢 PASS | 0.45s |
| 894 | auth (backend thật) | đăng nhập sai quá nhiều lần → 423 LOCKED kèm message của BE | Đúng như mong đợi | 🟢 PASS | 0.94s |
| 895 | auth (backend thật) | quên mật khẩu: gửi mã → mã sai bị từ chối → mã đúng cấp resetToken → đặt lại → mật khẩu mới đăng nhập được | Đúng như mong đợi | 🟢 PASS | 0.69s |
| 896 | auth (backend thật) | gửi lại mã trong thời gian chờ vẫn trả thành công nhưng KHÔNG phát hành mã mới (mã cũ còn dùng được) | Đúng như mong đợi | 🟢 PASS | 0.26s |
| 897 | auth (backend thật) | xóa dữ liệu cá nhân thành công và giữ lại tài khoản | Đúng như mong đợi | 🟢 PASS | 0.32s |
| 898 | auth (backend thật) | forgot-password với email chưa đăng ký vẫn thành công (không lộ tài khoản) | Đúng như mong đợi | 🟢 PASS | 0.01s |

</details>

<details><summary><b>__tests__/live/gamification.live.test.ts</b> · 3/3 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 899 | Bé Mầm, thử thách, huy hiệu (backend thật) | ghi bữa sáng → nhiệm vụ xong và XP tăng đúng một lần; ô hôm nay trong chuỗi ngày sáng lên | Đúng như mong đợi | 🟢 PASS | 0.43s |
| 900 | Bé Mầm, thử thách, huy hiệu (backend thật) | tham gia thử thách mở khung từ hôm nay và hiện trên màn Bé Mầm | Đúng như mong đợi | 🟢 PASS | 0.43s |
| 901 | Bé Mầm, thử thách, huy hiệu (backend thật) | huy hiệu và trang phục đọc từ server; trang phục chưa mở thì không mặc được | Đúng như mong đợi | 🟢 PASS | 0.38s |

</details>

<details><summary><b>__tests__/live/health.live.test.ts</b> · 7/7 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 902 | health profile (backend thật) | danh mục /meta thật có code cho mọi lựa chọn của giao diện (trừ "Khác") | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 903 | health profile (backend thật) | khảo sát lưu ngày sinh thật, dị ứng, bệnh lý, chế độ ăn; đọc lại đúng và giữ mục "Khác" ở máy | Đúng như mong đợi | 🟢 PASS | 0.31s |
| 904 | health profile (backend thật) | sửa chiều cao/ngày sinh bằng PUT: tính lại chỉ số, giữ dị ứng/chế độ ăn, KHÔNG thêm dòng cân nặng | Đúng như mong đợi | 🟢 PASS | 0.46s |
| 905 | health profile (backend thật) | đổi dị ứng/bệnh lý/chế độ ăn bằng PUT, kể cả "Không có" (xóa hết) và chỉ đổi chế độ ăn | Đúng như mong đợi | 🟢 PASS | 0.45s |
| 906 | health profile (backend thật) | ghi cân nặng thêm đúng một dòng lịch sử và trả chỉ số tính lại | Đúng như mong đợi | 🟢 PASS | 0.48s |
| 907 | health profile (backend thật) | ngày sinh không hợp lệ (dưới 13 tuổi) → BE từ chối bằng thông báo tiếng Việt | Đúng như mong đợi | 🟢 PASS | 0.30s |
| 908 | health profile (backend thật) | tài khoản chưa khảo sát → getHealthProfile trả null (404 được hiểu là chưa có hồ sơ) | Đúng như mong đợi | 🟢 PASS | 0.25s |

</details>

<details><summary><b>__tests__/live/healthsync.live.test.ts</b> · 7/7 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 909 | đồng bộ vận động (backend thật) | chưa đồng bộ gì: không có nguồn, không có giờ đồng bộ, mục tiêu bước mặc định | Đúng như mong đợi | 🟢 PASS | 0.21s |
| 910 | đồng bộ vận động (backend thật) | gửi tổng của ngày từ một nguồn; gửi lại cùng nguồn THAY THẾ chứ không cộng dồn | Đúng như mong đợi | 🟢 PASS | 0.35s |
| 911 | đồng bộ vận động (backend thật) | nhiều nguồn: chỉ nguồn ưu tiên cao nhất được dùng, không cộng các nguồn lại (BR-042) | Đúng như mong đợi | 🟢 PASS | 0.52s |
| 912 | đồng bộ vận động (backend thật) | nguồn không hợp lệ → BE từ chối bằng thông báo tiếng Việt, không ghi gì | Đúng như mong đợi | 🟢 PASS | 0.36s |
| 913 | đồng bộ vận động (backend thật) | calo vận động cộng vào ngân sách của Nhật ký khi bật công tắc, không cộng khi tắt | Đúng như mong đợi | 🟢 PASS | 0.38s |
| 914 | đồng bộ vận động (backend thật) | "Đồng bộ ngay": chưa đọc được Health Connect thật nên báo rõ, không gửi số liệu mẫu lên server | Đúng như mong đợi | 🟢 PASS | 0.34s |
| 915 | đồng bộ vận động (backend thật) | số liệu vận động của mỗi người dùng tách biệt | Đúng như mong đợi | 🟢 PASS | 0.48s |

</details>

<details><summary><b>__tests__/live/notifications.live.test.ts</b> · 2/2 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 916 | thông báo (backend thật) | tài khoản mới không có thông báo nào (không có thông báo mẫu) | Đúng như mong đợi | 🟢 PASS | 0.26s |
| 917 | thông báo (backend thật) | ghi bữa đầu tiên → đúng một thông báo huy hiệu, mở lại không nhân đôi; đọc từng cái rồi đọc hết | Đúng như mong đợi | 🟢 PASS | 0.41s |

</details>

<details><summary><b>__tests__/live/nutrition.live.test.ts</b> · 15/15 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 918 | nhật ký dinh dưỡng và thực phẩm (backend thật) › nhật ký | ghi cả bữa trong một request: đọc lại đúng bữa, đúng số, có giờ ghi do BE lưu | Đúng như mong đợi | 🟢 PASS | 0.39s |
| 919 | nhật ký dinh dưỡng và thực phẩm (backend thật) › nhật ký | một món sai → BE từ chối cả bữa bằng thông báo tiếng Việt, không món nào được lưu | Đúng như mong đợi | 🟢 PASS | 0.29s |
| 920 | nhật ký dinh dưỡng và thực phẩm (backend thật) › nhật ký | sửa khối lượng rồi đổi bữa bằng PUT: giữ nguyên id, tính lại dinh dưỡng, không tạo món trùng | Đúng như mong đợi | 🟢 PASS | 0.40s |
| 921 | nhật ký dinh dưỡng và thực phẩm (backend thật) › nhật ký | hàng đợi offline gửi lại cùng Idempotency-Key → máy chủ trả lại kết quả cũ, không ghi trùng (F12) | Đúng như mong đợi | 🟢 PASS | 0.47s |
| 922 | nhật ký dinh dưỡng và thực phẩm (backend thật) › nhật ký | sửa món không tồn tại → lỗi, nhật ký không đổi | Đúng như mong đợi | 🟢 PASS | 0.33s |
| 923 | nhật ký dinh dưỡng và thực phẩm (backend thật) › nhật ký | xóa món; xóa lần nữa → NOT_FOUND | Đúng như mong đợi | 🟢 PASS | 0.34s |
| 924 | nhật ký dinh dưỡng và thực phẩm (backend thật) › nhật ký | mục tiêu calo/macro lấy từ hồ sơ sức khỏe; tiến độ tuần có macro trung bình | Đúng như mong đợi | 🟢 PASS | 0.42s |
| 925 | nhật ký dinh dưỡng và thực phẩm (backend thật) › thực phẩm | tìm có dấu lẫn không dấu đều ra "Phở bò"; khẩu phần theo tô, dinh dưỡng nhân theo khẩu phần, chưa xác minh | Đúng như mong đợi | 🟢 PASS | 0.45s |
| 926 | nhật ký dinh dưỡng và thực phẩm (backend thật) › thực phẩm | món có chất gây dị ứng mang slug của giao diện (đổi theo code của /meta) | Đúng như mong đợi | 🟢 PASS | 0.35s |
| 927 | nhật ký dinh dưỡng và thực phẩm (backend thật) › thực phẩm | yêu thích: bật/tắt, bấm lặp không lỗi, tab "Yêu thích" và chi tiết khớp | Đúng như mong đợi | 🟢 PASS | 0.62s |
| 928 | nhật ký dinh dưỡng và thực phẩm (backend thật) › thực phẩm | "Gần đây": món ghi kèm id thực phẩm xuất hiện; món ghi tay không có id thì không | Đúng như mong đợi | 🟢 PASS | 0.58s |
| 929 | nhật ký dinh dưỡng và thực phẩm (backend thật) › thực phẩm | món tự nhập: lưu trên server, hiện ở "Món của tôi", chưa xác minh, trùng tên bị từ chối | Đúng như mong đợi | 🟢 PASS | 0.53s |
| 930 | nhật ký dinh dưỡng và thực phẩm (backend thật) › thực phẩm | món tự nhập chỉ chủ sở hữu thấy | Đúng như mong đợi | 🟢 PASS | 0.68s |
| 931 | nhật ký dinh dưỡng và thực phẩm (backend thật) › thực phẩm | "phần" lớn (130 g đa lượng/phần) vẫn lưu được và ghi vào nhật ký đúng số đã nhập | Đúng như mong đợi | 🟢 PASS | 0.36s |
| 932 | nhật ký dinh dưỡng và thực phẩm (backend thật) › thực phẩm | số liệu vô lý (500 kcal trong 10 g) → BE từ chối bằng thông báo tiếng Việt | Đúng như mong đợi | 🟢 PASS | 0.30s |

</details>

<details><summary><b>__tests__/live/plannerGrocery.live.test.ts</b> · 4/4 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 933 | thực đơn & đi chợ (backend thật) | xếp, đánh dấu đã nấu và xóa một món; server từ chối món chứa dị ứng | Đúng như mong đợi | 🟢 PASS | 0.83s |
| 934 | thực đơn & đi chợ (backend thật) | server từ chối xếp món chứa dị ứng kể cả khi gọi thẳng | Đúng như mong đợi | 🟢 PASS | 0.64s |
| 935 | thực đơn & đi chợ (backend thật) | tạo tuần tự động giữ món đã chọn và trả ghi chú; gợi ý ô theo bữa | Đúng như mong đợi | 🟢 PASS | 0.35s |
| 936 | thực đơn & đi chợ (backend thật) | đi chợ: tự tạo từ thực đơn, tick, món tự thêm, hoàn tất giữ món chưa mua sang tuần sau | Đúng như mong đợi | 🟢 PASS | 0.97s |

</details>

<details><summary><b>__tests__/live/premium.live.test.ts</b> · 7/7 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 937 | gói thành viên (backend thật) | bảng giá do BE quyết định: tháng 79.000đ, năm 699.000đ | Đúng như mong đợi | 🟢 PASS | 0.22s |
| 938 | gói thành viên (backend thật) | tài khoản mới: Free, chưa có giao dịch nào | Đúng như mong đợi | 🟢 PASS | 0.23s |
| 939 | gói thành viên (backend thật) | kích hoạt gói tháng (Development): server bật Pro 30 ngày và ghi lịch sử | Đúng như mong đợi | 🟢 PASS | 0.24s |
| 940 | gói thành viên (backend thật) | hủy gia hạn: vẫn là Pro tới hết hạn (giữ gói và hạn), hủy lần nữa khi chưa có Pro bị từ chối | Đúng như mong đợi | 🟢 PASS | 0.27s |
| 941 | gói thành viên (backend thật) | gia hạn khi còn hạn cộng thêm vào cuối kỳ hiện tại, không tính lại từ hôm nay | Đúng như mong đợi | 🟢 PASS | 0.25s |
| 942 | gói thành viên (backend thật) | gia hạn sau khi đã hủy gia hạn: gói Premium trở lại | Đúng như mong đợi | 🟢 PASS | 0.27s |
| 943 | gói thành viên (backend thật) | gói của mỗi tài khoản tách biệt | Đúng như mong đợi | 🟢 PASS | 0.51s |

</details>

<details><summary><b>__tests__/live/recipes.live.test.ts</b> · 6/6 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 944 | công thức & bộ sưu tập (backend thật) | người dị ứng hải sản không thấy món cá hồi; chi tiết món vẫn ghi rõ nguyên liệu gây dị ứng | Đúng như mong đợi | 🟢 PASS | 0.85s |
| 945 | công thức & bộ sưu tập (backend thật) | lọc theo bữa và thời gian nấu chạy ở server | Đúng như mong đợi | 🟢 PASS | 0.55s |
| 946 | công thức & bộ sưu tập (backend thật) | tim lưu trên server; bộ sưu tập: tạo, thêm/bỏ món, đổi tên, chia sẻ, xóa | Đúng như mong đợi | 🟢 PASS | 0.88s |
| 947 | công thức & bộ sưu tập (backend thật) | bộ sưu tập công khai của người khác chỉ xem; riêng tư thì không thấy | Đúng như mong đợi | 🟢 PASS | 0.76s |
| 948 | công thức & bộ sưu tập (backend thật) | liên kết chia sẻ: người khác xem được bộ sưu tập riêng tư (chỉ đọc); tắt liên kết thì hết hiệu lực | Đúng như mong đợi | 🟢 PASS | 1.13s |
| 949 | công thức & bộ sưu tập (backend thật) | gợi ý theo tủ lạnh tính số nguyên liệu khớp, không phân biệt dấu | Đúng như mong đợi | 🟢 PASS | 0.34s |

</details>

<details><summary><b>__tests__/live/scanner.live.test.ts</b> · 3/4 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 950 | scanner (backend thật) | mã vạch không có trong CSDL → null để màn chuyển sang "Không tìm thấy sản phẩm" | Đúng như mong đợi | 🟢 PASS | 1.32s |
| 951 | scanner (backend thật) | món tự nhập kèm mã vạch → lần quét sau tìm thấy, dinh dưỡng /100 g và cảnh báo đường cao | Đúng như mong đợi | 🟢 PASS | 0.18s |
| 952 | scanner (backend thật) | đọc nhãn: ảnh gửi multipart `image` tới /ai/scan-label, kết quả bản demo được gắn cờ | Error: expect(received).toBeGreaterThan(expected) Expected: > 0 Received: 0 at Object.toBeGreaterThan (D:\Sem8\PRM393\SmartMeal\frontend\SmartMealMobile\__tests__\live\scanner.l… | 🔴 FAIL | 6.60s |
| 953 | scanner (backend thật) | tủ lạnh: gửi từng ảnh tới /ai/fridge-scanner, nguyên liệu gộp và đều chờ xác nhận | Đúng như mong đợi | 🟢 PASS | 10.45s |

</details>

<details><summary><b>__tests__/live/water.live.test.ts</b> · 8/8 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 954 | nước uống (backend thật) | người dùng mới: chưa uống gì, mục tiêu mặc định 2000 ml | Đúng như mong đợi | 🟢 PASS | 0.45s |
| 955 | nước uống (backend thật) | ghi nhiều lần: tổng cộng dồn, các lần uống theo thứ tự cũ → mới, mỗi lần có id và giờ | Đúng như mong đợi | 🟢 PASS | 0.47s |
| 956 | nước uống (backend thật) | "Hoàn tác" xóa đúng lần uống mới nhất; không còn gì để hoàn tác thì không lỗi | Đúng như mong đợi | 🟢 PASS | 0.45s |
| 957 | nước uống (backend thật) | xóa một lần uống theo id; xóa lại → NOT_FOUND | Đúng như mong đợi | 🟢 PASS | 0.35s |
| 958 | nước uống (backend thật) | lượng nước ngoài 1–5000 ml → BE từ chối bằng thông báo tiếng Việt, không ghi gì | Đúng như mong đợi | 🟢 PASS | 0.29s |
| 959 | nước uống (backend thật) | 7 ngày qua: đủ 7 ngày kết thúc hôm nay, ngày trống = 0, đếm số ngày đạt mục tiêu | Đúng như mong đợi | 🟢 PASS | 0.42s |
| 960 | nước uống (backend thật) | đổi mục tiêu nước lưu vào hồ sơ trên server và hiện ở nhật ký + 7 ngày qua; ngoài 500–10000 ml bị từ chối | Đúng như mong đợi | 🟢 PASS | 0.34s |
| 961 | nước uống (backend thật) | nước uống của mỗi người dùng tách biệt | Đúng như mong đợi | 🟢 PASS | 0.48s |

</details>


<!-- APPENDIX:END -->

## Phụ lục B: Cách chạy lại

```bash
# 1) Backend (Git Bash, tại thư mục gốc repo; PostgreSQL của docker compose đang chạy)
docker compose up -d postgres
MSYS_NO_PATHCONV=1 docker run --rm --network smartmeal_default \
  -v "$PWD/backend:/src" -w /src \
  -e SMARTMEAL_TEST_DB="Host=postgres;Port=5432;Username=postgres;Password=postgrespassword;Database=postgres" \
  mcr.microsoft.com/dotnet/sdk:9.0 dotnet test SmartMeal.sln --filter "FullyQualifiedName!~AdminApiTests"
#   coverage: thêm package coverlet.collector vào SmartMeal.Tests rồi chạy với --collect:"XPlat Code Coverage"

# 2) Mobile unit test + coverage (tại frontend/SmartMealMobile)
npm ci
npx jest --runInBand --testPathIgnorePatterns='__tests__/live/' --coverage --collectCoverageFrom='src/**/*.{ts,tsx}'

# 3) Mobile live test (backend chạy ở :5000, tắt rate limit/SMTP, bật mock activation — xem test-utils/live.ts)
LIVE_API_URL=http://127.0.0.1:5000/api LIVE_BE_LOG=<file log của backend> npx jest --runInBand --testTimeout=90000 __tests__/live/
```

Test mới thêm trong đợt này: `frontend/SmartMealMobile/__tests__/ui/ThemeProvider.test.tsx`.
