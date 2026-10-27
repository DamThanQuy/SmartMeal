# SmartMeal — Báo cáo rà soát tổng thể (27/10/2026)

| | |
|---|---|
| Mã nguồn | nhánh `main`, commit `16a1f37` |
| Phạm vi | Backend ASP.NET Core (`backend/`), app Expo (`frontend/SmartMealMobile`), Admin Web (`frontend/admin-web`), tài liệu (`README.md`, `docs/`, `frontend/SmartMealMobile/docs`) |
| Giai đoạn | Chỉ rà soát và đề xuất. Không sửa code, không cài package, không chạy migration, không đổi dữ liệu |
| Skill đã dùng | `business-analyst` (đối chiếu nghiệp vụ BR-xxx với code), `impeccable` (khung audit native 5 tiêu chí + heuristic Nielsen, chạy single-context; detector chạy trên Admin Web), `ui-ux-pro-max` (checklist a11y/touch/điều hướng), `design-taste-frontend` (chạy `lint.mjs` trên Admin Web) |
| Skill không dùng | `BMAD Method` không được cài. `Hallmark` chỉ dành cho thiết kế mới, không hợp với rà soát. `superpowers` không có skill riêng cho rà soát dự án |

**Ký hiệu:** ✅ **Đã xác minh** = đọc code hoặc chạy lệnh thấy tận mắt. 💡 **Đề xuất** = cải tiến, không phải lỗi. ❓ **Cần xác nhận** = phụ thuộc quyết định nghiệp vụ.

## 0. Kiểm tra đã chạy

| Kiểm tra | Kết quả |
|---|---|
| Mobile `npx tsc --noEmit` | Sạch |
| Mobile `npx expo lint` | 0 lỗi, 4 cảnh báo |
| Mobile `npx jest` | 586 pass, 82 bỏ qua (test live), 1 lỗi timeout ở `__tests__/scanner/FridgeScreen.test.tsx`. Chạy riêng file đó thì 8/8 pass, nên đây là test **chập chờn khi máy tải nặng**, không phải lỗi logic |
| Admin `vitest run` (bỏ test live) | 141/141 test pass, nhưng 3/12 file test **không chạy được** vì `node_modules` ở máy này thiếu `xlsx` (đã khai báo trong `package.json`, máy chưa `npm install` lại) |
| Admin `oxlint` | 0 lỗi, 56 cảnh báo (38 biến không dùng, 9 thiếu deps của `useEffect`, 8 gọi setState trong effect) |
| Admin `impeccable detect` | 0 phát hiện (detector đọc JSX còn hạn chế, không nên coi là "sạch") |
| Admin `design-taste-frontend lint.mjs` | 53 FAIL, 34 WARN theo quy tắc của skill: gradient (15), viền 1px (19), shadow (11), tím/indigo (10), emoji (6), glass blur (4) |
| Backend `dotnet build` | **Không chạy được**: máy không có .NET SDK. Backend **chưa được build hay test** trong lần rà soát này |
| Chạy app, chụp màn hình | **Chưa làm**: nhận xét UI dựa trên đọc code, không dựa trên ảnh chụp |

## 1. Tóm tắt

Dự án đã ở mức hoàn thiện cao: kiến trúc phân lớp rõ ràng, có xoay vòng refresh token, rate limit, idempotency cho hàng đợi offline, webhook thanh toán xác minh phía server (BR-241), lọc dị ứng ở gợi ý món và thực đơn (BR-102), luồng AI luôn qua bước người dùng xác nhận (BR-054), và test tương đối dày. Các vấn đề còn lại tập trung ở bốn chỗ:

1. **Bảo mật khóa tài khoản:** người dùng bị admin khóa hoặc cấm có thể tự mở khóa bằng "Quên mật khẩu".
2. **Ghi sai bữa:** các lối tắt AI trên Trang chủ luôn ghi vào bữa cố định.
3. **Tài liệu, code và tính năng lệch nhau:** đăng nhập Google, Health Connect, công thức "Pro".
4. **Số liệu chưa đúng:** đi chợ cộng quá số lượng; quy tắc mục tiêu cân nặng chưa được kiểm tra.

## 2. Lỗi cần sửa

### L1. Tài khoản bị admin khóa/cấm tự mở khóa được qua "Quên mật khẩu" — **Cao** ✅
- **Vấn đề:** Khóa của admin (`PUT /admin/users/{id}/status`, `/ban`) và khóa do nhập sai mật khẩu dùng chung một cột `User.LockoutEnd`. Luồng đặt lại mật khẩu xóa cột này.
- **Bằng chứng:** `backend/SmartMeal.Infrastructure/Services/PasswordService.cs:193` (`user.LockoutEnd = null` trong `ResetPasswordAsync`); `backend/SmartMeal.API/Controllers/AdminController.cs:391` và `:1226` (khóa bằng `LockoutEnd`). Thông báo 423 còn gợi ý luôn cách vượt khóa: `AuthService.cs:528` ("…hoặc dùng \"Quên mật khẩu\"").
- **Ảnh hưởng:** Lệnh cấm của admin vô hiệu, vi phạm BR-013 ("không bị khóa"). Người bị cấm còn nhận thông báo sai: "nhập sai mật khẩu quá nhiều lần… thử lại sau ~26 triệu phút".
- **Đề xuất:** Thêm trường riêng (`BannedUntil`, `BanReason`) tách khỏi `LockoutEnd`. Kiểm tra trạng thái cấm ở login, refresh, Google login và reset-password. Viết thông báo riêng cho tài khoản bị cấm. Thêm test: tài khoản bị cấm → reset-password → vẫn không đăng nhập được.

### L2. Đăng nhập Google không kiểm tra khóa hoặc cấm — **Trung bình** ✅
- **Bằng chứng:** `AuthService.cs:235-301`: `GoogleLoginAsync` cấp token mà không gọi `RemainingLockout`.
- **Ảnh hưởng:** Khi bật `Google:ClientId`, tài khoản bị cấm vẫn đăng nhập được bằng Google.
- **Đề xuất:** Gộp chung bước kiểm tra trạng thái tài khoản cho mọi cách đăng nhập (sửa cùng L1).

### L3. Lối tắt trên Trang chủ ghi món vào bữa cố định, sai bữa — **Cao** ✅
- **Bằng chứng:** `frontend/SmartMealMobile/src/features/dashboard/screens/DashboardScreen.tsx:282` (AI Snap luôn `'dinner'`), `:290` (giọng nói luôn `'breakfast'`), `:295` (tìm món luôn `'dinner'`). Riêng quét mã vạch dùng `getMealTypeForHour`. Màn `AISnapResultScreen` và `VoiceLogScreen` không có chỗ đổi bữa (`mealType` lấy cố định từ route). Backend có trả bữa do AI nhận ra (`VoiceLogResponseDto.MealType`, `AiDTOs.cs:55`) nhưng app bỏ qua.
- **Ảnh hưởng:** Chụp bữa trưa lúc 12h thì món vào "Bữa tối"; nói "sáng nay tôi ăn…" lúc 20h thì món vào "Bữa sáng" dù câu nói khác. Nhật ký, tổng theo bữa và streak "ghi đủ bữa" sai.
- **Đề xuất:** Lấy bữa mặc định bằng `getMealTypeForHour()`. Với giọng nói, ưu tiên `mealType` AI trả về. Thêm bộ chọn bữa (chip giống `QuickLogScreen`) ở màn xác nhận kết quả AI.

### L4. Danh sách đi chợ cộng nguyên liệu của cả công thức thay vì 1 khẩu phần — **Trung bình** ✅
- **Bằng chứng:** `GroceryService.cs:235-246` cộng `ri.Amount` của toàn công thức cho mỗi ô thực đơn. `MealPlan` không có trường số khẩu phần (`Domain/Entities/NutritionDiary.cs:42-53`), trong khi calo của thực đơn tính theo `CaloriesPerServing`. Dữ liệu mẫu có 8 công thức `servings` > 1 (2, 4, 5 phần).
- **Ảnh hưởng:** Với các món này, số lượng và chi phí ước tính (BR-174) bị nhân 2–5 lần.
- **Đề xuất:** Chia `ri.Amount / Recipe.Servings` (rồi nhân số người ăn nếu có). ❓ Cần chốt: thực đơn tính cho 1 người hay cả gia đình (xem Q4).

### L5. Phân loại BMI sai ở mốc 24,9 — **Thấp** ✅
- **Bằng chứng:** `backend/SmartMeal.Application/Services/NutritionCalculator.cs:58` (`bmi < 24.9`): BMI = 24,9 bị xếp "Tiền béo phì", trong khi chuẩn WHO là 18,5–24,9.
- **Đề xuất:** Đổi thành `< 25`. ❓ Có dùng ngưỡng cho người châu Á (≥ 23 là thừa cân) không? Xem Q6.

### L6. Ảnh AI Snap được lưu ngay cả khi người dùng không xác nhận — **Thấp** ✅
- **Bằng chứng:** `AiController.cs:94` lưu ảnh ngay khi phân tích xong, trước bước người dùng xác nhận (BR-054).
- **Ảnh hưởng:** Thư mục `uploads` tích ảnh mồ côi. Ảnh bữa ăn là dữ liệu cá nhân nhưng vẫn nằm lại sau khi người dùng hủy.
- **Đề xuất:** Lưu ảnh khi ghi nhật ký, hoặc dọn định kỳ ảnh không gắn với `DiaryItem` nào.

### L7. Admin xóa người dùng không xóa file ảnh — **Thấp** ✅
- **Bằng chứng:** `AdminController.cs:491` chỉ gọi `_db.Users.Remove(user)`. Luồng người dùng tự xóa tài khoản thì có xóa avatar và thư mục ảnh món (`AccountService.DeleteAccountAsync`).
- **Đề xuất:** Gọi lại logic xóa file của `AccountService` từ endpoint admin.

### L8. Test chập chờn và môi trường test lệch — **Thấp** ✅
- `FridgeScreen.test.tsx` vượt timeout 5 giây khi chạy cả bộ, chạy riêng thì pass. Nên tăng timeout hoặc dùng fake timer.
- Admin Web: `node_modules` ở máy này thiếu `xlsx` nên 3 file test không chạy. Chạy `npm ci` trước khi báo cáo test (bước này chưa làm vì không được cài package).

## 3. Nghiệp vụ cần điều chỉnh

### N1. Tài liệu ghi "đã bỏ đăng nhập Google" nhưng code đã khôi phục — **Cao** ✅❓
- **Bằng chứng:** `README.md`, `docs/SmartMeal_Overview_V2.md` và `business_rule.md` (BR-010) ghi đã bỏ từ 14/10/2026. Nhưng `POST /api/auth/google` vẫn hoạt động (`AuthController.cs:74`), app vẫn có nút "Tiếp tục với Google" (`LoginScreen.tsx:176-183`), có package `@react-native-google-signin/google-signin`, và git cho thấy tính năng được khôi phục ở PR #11 và #15.
- **Đề xuất:** Chốt một quyết định (Q1), rồi cập nhật BR-010/BR-012, README và API Contract, hoặc gỡ code.

### N2. Health Connect và "Dynamic Calorie Budget" chưa chạy được, các tính năng phụ thuộc bị treo — **Cao** ✅❓
- **Bằng chứng:** `features/profile/services/healthConnectService.api.ts:31,44`: `connect()` và `syncNow()` luôn báo lỗi "chưa đọc được Health Connect". App không có thư viện Health Connect hay HealthKit nào, dù đã có thư mục `android/` (đã prebuild). Admin vẫn tạo được thử thách loại `Exercise` (bước chân) (`AdminController.cs`, `UnsupportedCategoryMessage`).
- **Ảnh hưởng:** README quảng cáo "Đồng bộ thiết bị đeo" và "ngân sách calo động", nhưng calo vận động luôn bằng 0. Người dùng không thể hoàn thành thử thách bước chân. Màn Health Connect có nút mà không bao giờ hoạt động.
- **Đề xuất (chọn một, xem Q2):** (a) tích hợp `react-native-health-connect` trên Dev Client (đã có `android/`); (b) cho nhập bước chân và calo vận động thủ công; (c) ẩn tính năng và chặn tạo thử thách `Exercise` cho tới khi có dữ liệu.

### N3. Công thức "Pro" chỉ có nhãn, không giới hạn quyền xem — **Trung bình** ✅❓
- **Bằng chứng:** `Recipe.IsPremium` chỉ được map ra DTO (`RecipeService.cs:627`). App hiển thị badge "Pro" (`RecipeDetailScreen.tsx:167`) nhưng không backend hay app nào chặn tài khoản Free.
- **Đề xuất:** Hoặc chặn xem chi tiết/thêm vào thực đơn với Free (backend trả 403 `pro_required`, app mở màn Premium), hoặc bỏ nhãn "Pro". Xem Q3.

### N4. Chưa kiểm tra mục tiêu có khớp với cân nặng mục tiêu không — **Trung bình** ✅
- **Bằng chứng:** `HealthProfileDTOs.cs` và `HealthProfileService.cs:88,183` nhận `Goal = LoseWeight` cùng `TargetWeightKg > CurrentWeightKg` mà không báo lỗi. Cũng không cảnh báo khi người thiếu cân (BMI < 18,5) chọn giảm cân.
- **Ảnh hưởng:** Calo mục tiêu (TDEE − 500) mâu thuẫn với cân nặng mục tiêu. Lời khuyên dinh dưỡng có thể không an toàn (BR-112).
- **Đề xuất:** Validate ở backend: Lose → target < current; Gain → target > current; Maintain → |target − current| ≤ ngưỡng. Hiện cảnh báo ở bước Goal của wizard.

### N5. Hạn mức AI không tính đọc nhãn bằng Gemini — **Trung bình** ✅❓
- **Bằng chứng:** `AiController.cs:177,203`: `check-safety` (văn bản OCR) và `scan-label` (ảnh) gọi Gemini nhưng không đi qua `RunWithQuotaAsync`, chỉ bị giới hạn 20 lần/phút. Tài khoản Free có 5 lượt AI/ngày (`AiOptions.cs:12`).
- **Ảnh hưởng:** Free dùng Gemini gần như không giới hạn qua tính năng đọc nhãn, trong khi BR-233 yêu cầu kiểm quota trước mọi tác vụ AI. Có rủi ro chi phí API.
- **Đề xuất:** Chốt (Q5) đọc nhãn có tính vào quota không. Nếu không tính, ghi rõ vào BR và hạ rate limit.

### N6. Quét tủ lạnh: gói Free bị chặn hoàn toàn, tài liệu nói "không giới hạn cho Pro" — **Thấp** ✅❓
- **Bằng chứng:** `AiController.cs` (`requiresPro: true` cho `fridge-scanner`). `SmartMeal_Overview_V2.md` §12 ghi Pro được "quét tủ lạnh không giới hạn", ngụ ý Free có số lượt giới hạn.
- **Đề xuất:** Thống nhất BR-080/§12. Code hiện tại khớp `business_rule.md` §2.3 (chỉ Premium).

### N7. Prompt quét tủ lạnh không có hồ sơ dị ứng — **Thấp** ✅
- **Bằng chứng:** `GeminiAiVisionService.cs:241-260`: prompt xin Gemini gợi ý 2–3 món mà không truyền dị ứng hay mục tiêu calo (BR-080). App hiện **không dùng** `suggestedRecipes`: chỉ lấy nguyên liệu rồi gợi ý món từ CSDL đã lọc dị ứng (`FridgeScreen.tsx:94`). Vì vậy người dùng chưa bị ảnh hưởng.
- **Đề xuất:** Bỏ phần gợi ý món khỏi prompt (đỡ token, tránh client sau này dùng nhầm), hoặc truyền hồ sơ sức khỏe vào giống AI Snap.

### N8. Khóa và cấm của admin không lưu lý do, không có nhật ký — **Thấp** ✅
- **Bằng chứng:** `AdminBanUserRequestDto.Reason` chỉ dùng trong câu thông báo trả về (`AdminController.cs:1240`). Có hai endpoint trùng chức năng (`/status` và `/ban`). Cấp Pro thủ công (`/subscription`) không tạo bản ghi giao dịch hay nhật ký.
- **Đề xuất:** Gộp thành một hành động "Khóa tài khoản" có lý do và thời hạn. Lưu bảng nhật ký hành động admin (ai làm, lúc nào, lý do), vì doanh thu và quyền Pro cần đối soát được.

## 4. Tính năng cần bổ sung hoặc hoàn thiện

| # | Tính năng | Căn cứ | Hiện trạng | Ưu tiên |
|---|---|---|---|---|
| F1 | Đồng bộ vận động (Health Connect) hoặc nhập tay | README, Overview V2 §10, Dynamic Calorie Budget | Chưa có (N2) | Cao ❓ |
| F2 | Admin Web tự gia hạn phiên | Access token 60 phút (`JwtOptions.cs:27`) | Admin không lưu refresh token (`admin-web/src/services/api.js`), hết 60 phút bị đăng xuất giữa chừng, có thể mất dữ liệu form đang nhập | Trung bình |
| F3 | Nhật ký hành động admin | Đối soát doanh thu, BR-241/242 | Chưa có (N8) | Trung bình |
| F4 | "Mẹo nhỏ hôm nay" có nội dung thay đổi | Dashboard | Chuỗi cố định (`DashboardScreen.tsx:228-231`), ngày nào cũng giống nhau | Thấp 💡 |
| F5 | Đa ngôn ngữ (Việt/Anh) | Overview V2 §4 | Chưa có. ❓ Có còn trong phạm vi không | Thấp |

## 5. UI/UX cần cải thiện

**Đánh giá chung (impeccable, audit native):** Khả năng tiếp cận 3/4 · Hiệu năng 3/4 · Giao diện & theme 3/4 · Tuân thủ nền tảng 3/4 · Thích ứng màn hình 2/4. **Tổng 14/20 (Tốt).** Mobile tuân thủ design system tốt: chỉ 9 mã hex nằm ngoài theme (8 trong `PetAnimation.tsx`), loading/empty/error dùng component chung, nút icon có `accessibilityLabel` và vùng chạm ≥ 44. **Nên giữ** bộ `components/ui` + `components/common`, luồng xác nhận AI có nhãn "≈ ước tính", và màn Fridge cho sửa/xóa/thêm nguyên liệu trước khi gợi ý món.

### U1. Trang chủ quá nhiều điểm bấm, thiếu trọng tâm — **Trung bình** 💡
- **Hiện tại:** `DashboardScreen.tsx:154-381` có khoảng 12 lối bấm theo thứ tự: vòng calo → macro → mẹo → gợi ý món → nút "Ghi bữa ăn" → 4 lối tắt → bữa hôm nay → ô bữa trống → vận động → Pet. Hành động chính (ghi bữa) nằm dưới 4 khối thông tin; "Ghi bữa ăn" và 4 lối tắt trùng chức năng với nhau.
- **Hướng sửa:** Đưa cụm "Ghi bữa ăn" (nút chính + 4 lối tắt) lên ngay dưới vòng calo. Gộp "Mẹo nhỏ" vào khối gợi ý món hoặc bỏ. Khối vận động (luôn trống do N2) chỉ hiện khi có dữ liệu. Giữ nguyên các component đang có, chỉ đổi thứ tự.

### U2. Tab "Bữa ăn" dễ nhầm với "Nhật ký" — **Trung bình** 💡❓
- **Hiện tại:** Thanh tab: Trang chủ · **Bữa ăn** (thực đơn tuần) · Khám phá · Nhật ký · Cá nhân (`MainTabNavigator.tsx:110-145`). "Bữa ăn" thực chất là lập kế hoạch, còn bữa đã ăn lại nằm ở "Nhật ký". `CLAUDE.md` của mobile ghi tên tab là "Thực đơn".
- **Hướng sửa:** Đổi nhãn thành "Thực đơn" (khớp CLAUDE.md và chức năng). Cập nhật `design.md` cho đồng bộ.

### U3. Màn xác nhận kết quả AI thiếu chọn bữa và chọn ngày — **Cao** (đi cùng L3) ✅
- **Hướng sửa:** Thêm hàng chip Sáng/Trưa/Tối/Phụ (dùng `AppChip`, giống `QuickLogScreen.tsx:113`) ngay dưới tiêu đề "Tổng ước tính", mặc định theo giờ hiện tại.

### U4. Health Connect: nút không bao giờ hoạt động — **Trung bình** ✅
- **Hiện tại:** Màn có thẻ "Chưa kết nối", bấm kết nối thì nhận lỗi.
- **Hướng sửa:** Cho tới khi có F1, thay nút bằng `EmptyState` giải thích rõ ("Chưa hỗ trợ trên bản này") kèm hành động thay thế (nhập tay nếu chọn N2-b). Trên Trang chủ, ẩn mục Health Connect khỏi các lối tắt.

### U5. Chip và một số link nhỏ hơn 44pt — **Thấp** ✅
- `AppChip.tsx:24` cao 36px (dùng cho bộ lọc và chọn bữa). Link "Xem nhật ký" (`DashboardScreen.tsx:309-321`) không có `min-h`. Nên nâng chip lên 44 hoặc thêm `hitSlop`.

### U6. Chưa kiểm tra chữ phóng to và màn hình lớn — **Thấp** 💡
- `AppButton` dùng chiều cao cố định (`h-[48px]`, `h-[56px]`), chữ phóng to có thể bị cắt. Chưa có bố cục riêng cho tablet. Nên chụp thử ở cỡ chữ 130% và trên tablet Android.

### U7. Admin Web: phong cách "dashboard AI" chung chung, thiếu nhất quán — **Trung bình** 💡
- **Hiện tại:** Chỉ có giao diện tối. Dùng glass blur (`index.css:121,290,680,758`), gradient (15), glow/shadow, tím/indigo, emoji làm icon. 461 chỗ `style={{…}}` inline với mã hex rải trong component, dù `index.css` đã có biến màu. Font Outfit + Plus Jakarta, trong khi mobile dùng Inter. Thao tác nguy hiểm dùng `window.confirm` (7 chỗ), còn khóa/kiểm duyệt dùng modal tự làm. Gần như không có `aria-*` (chỉ 3 thuộc tính, đều ở `Pagination`).
- **Hướng sửa (không redesign toàn bộ):**
  1. Gom màu inline về biến CSS sẵn có, bỏ gradient/glass/glow, giữ một màu nhấn (xanh lá của thương hiệu).
  2. Một component `ConfirmDialog` dùng chung thay cho `window.confirm`.
  3. Thêm `aria-label` cho nút icon và `<caption>`/`scope` cho bảng.
  4. Dùng chung font Inter với mobile.
  5. Cân nhắc thêm giao diện sáng vì admin làm việc lâu.

### U8. Admin Web không có URL theo tab — **Thấp** 💡
- `App.jsx:18` lưu tab bằng `useState`: F5 quay về Dashboard, không chia sẻ được link tới trang Người dùng hay Giao dịch. Nên đồng bộ tab với `location.hash`.

## 6. Kỹ thuật cần cải thiện

| # | Vấn đề | Bằng chứng | Đề xuất | Ưu tiên |
|---|---|---|---|---|
| K1 | `AdminController` 1.823 dòng, gọi `DbContext` trực tiếp, lặp logic tạo/sửa công thức 3 lần | `AdminController.cs:642-1011` | Tách `AdminRecipeService`, `AdminUserService` | Trung bình |
| K2 | Giá gói (79.000/699.000) và quyền lợi viết cứng ở 2 chỗ trong admin, trùng với `SubscriptionCatalog` | `AdminController.cs:164,176,1114,1131` | Đọc từ `SubscriptionCatalog.Plans` | Trung bình |
| K3 | Nhập Excel bỏ qua `ValidateRecipe` (chuẩn hóa bữa, luật tag "Nhanh gọn ≤ 15 phút") | `AdminController.cs:730-921` | Gọi chung `ValidateRecipe` cho từng dòng, lỗi đưa vào `Messages` | Trung bình |
| K4 | Công thức tính BMR/TDEE ở mobile khác backend (Tăng cân +300 so với +400; giới tính "Other" lấy trung bình, backend dùng −161). File chỉ được test dùng, không có màn hình nào gọi | `healthCalculator.ts:20-24,52-57` so với `NutritionCalculator.cs:66-71` | Xóa code trùng (số liệu đã lấy từ BE), hoặc khớp hệ số. Test nên kiểm hành vi thật | Trung bình |
| K5 | Thư viện `xlsx@0.18.5` trên npm có lỗ hổng đã biết (prototype pollution, ReDoS), SheetJS không phát hành bản sửa lên npm nữa | `admin-web/package.json` | Đổi sang bản từ CDN SheetJS (≥ 0.20.2) hoặc thư viện khác. Chỉ admin upload nên rủi ro thấp | Trung bình |
| K6 | Kiểm quota AI rồi mới ghi lượt dùng (TOCTOU): gửi song song có thể vượt hạn mức | `AiController.cs` `RunWithQuotaAsync`, `AiQuotaService.cs` | Ghi lượt dùng trước (trạng thái pending) hoặc khóa theo user | Thấp |
| K7 | Ngày mặc định ở server dùng UTC, trong khi quota dùng UTC+7. Báo cáo doanh thu theo ngày gom theo `CreatedAt` UTC chứ không theo `PaidAt` giờ Việt Nam | `NutritionDiaryController.cs:81`, `AdminController.cs:1706` | Một hằng `AppTimeZone` (UTC+7) dùng chung. Doanh thu tính theo `PaidAt` | Thấp |
| K8 | Docker Compose cố định `ASPNETCORE_ENVIRONMENT: Development`: có tài khoản demo mật khẩu công khai, mật khẩu admin mặc định, Swagger mở, CORS mở | `docker-compose.yml` | Thêm file compose hoặc biến cho môi trường demo/production | Thấp (đồ án) |
| K9 | Token admin lưu trong `localStorage` | `admin-web/src/services/api.js:4` | Chấp nhận được cho đồ án. Nếu triển khai thật: cookie HttpOnly + CSRF | Thấp |
| K10 | Tài liệu lệch code: `CLAUDE.md` mobile §16 vẫn ghi "src/ rỗng, App.tsx template", §1 và Overview ghi .NET 8 (thực tế `net9.0`), §9 ghi chỉ chạy Expo Go (đã có `android/`). Comment compose còn nhắc Google Sign-In. `admin-web/README.md` vẫn là template Vite | các file đã nêu | Cập nhật một lần sau khi chốt Q1 và Q2 | Thấp |
| K11 | 56 cảnh báo oxlint ở Admin Web (biến không dùng, thiếu deps của effect) | kết quả `oxlint` | Dọn khi sửa U7 | Thấp |

## 7. Nên sửa trước (theo thứ tự)

1. **L1 + L2:** tách cột cấm khỏi `LockoutEnd` và chặn mọi đường vượt khóa (bảo mật, ảnh hưởng quyền admin).
2. **L3 + U3:** chọn đúng bữa cho AI Snap, giọng nói và tìm món (sai dữ liệu nhật ký hằng ngày).
3. **N1, N2, N3:** chốt quyết định nghiệp vụ (Google, Health Connect, công thức Pro), rồi sửa code hoặc tài liệu theo quyết định.
4. **L4:** chia nguyên liệu theo khẩu phần trong danh sách đi chợ.
5. **N4:** validate mục tiêu với cân nặng mục tiêu, cảnh báo BMI thấp.
6. **N5:** quyết định quota cho đọc nhãn.
7. **F2:** admin tự gia hạn phiên; **K3:** validate khi nhập Excel; **K2:** bỏ giá viết cứng.
8. **U1, U2, U4:** sắp lại Trang chủ, đổi nhãn tab, màn Health Connect trung thực.
9. **U7, K5:** làm sạch giao diện Admin Web, thay `xlsx`.
10. Các mục **Thấp** còn lại; cập nhật tài liệu (K10) sau cùng.

## 8. Cần anh/chị xác nhận về nghiệp vụ

| # | Câu hỏi | Liên quan |
|---|---|---|
| Q1 | Giữ hay bỏ đăng nhập Google? Tài liệu nói đã bỏ, code đang có | N1, L2 |
| Q2 | Health Connect: tích hợp thật (Dev Client), cho nhập tay, hay ẩn tính năng (và tắt thử thách bước chân)? | N2, F1, U4 |
| Q3 | Công thức gắn `IsPremium` có bị khóa với tài khoản Free không? Nếu có thì khóa ở mức nào (xem chi tiết, thêm vào thực đơn)? | N3 |
| Q4 | Thực đơn tuần và danh sách đi chợ tính cho 1 người hay cho số người tùy chỉnh? | L4 |
| Q5 | Đọc nhãn và kiểm tra an toàn bằng AI có tính vào 5 lượt AI/ngày của Free không? | N5 |
| Q6 | Dùng ngưỡng BMI của WHO quốc tế hay của châu Á? Mức calo tối thiểu 1.200 có áp dụng cho cả nam không? | L5, N4 |
| Q7 | Quét tủ lạnh: chỉ Pro, hay Free có số lượt giới hạn? | N6 |
| Q8 | Đa ngôn ngữ Việt/Anh có còn trong phạm vi môn học không? | F5 |
| Q9 | Cấp Pro thủ công từ admin có cần sinh bản ghi giao dịch (0đ) để đối soát không? | N8 |

## 9. Quyết định (27/10/2026)

| # | Quyết định | Hệ quả |
|---|---|---|
| Q1 | **Bỏ đăng nhập Google** — ✅ đã làm trên nhánh `chore/remove-google-healthconnect` | Gỡ `POST /api/auth/google`, `GoogleIdTokenValidator`, nút Google và package `@react-native-google-signin/google-signin` (cùng plugin trong `app.json`). Tài khoản cũ tạo bằng Google (không có mật khẩu) đăng nhập lại bằng "Quên mật khẩu". L2 hết hiệu lực. BR-010/BR-012 giữ nguyên như hiện tại |
| Q2 | **Bỏ Health Connect** — ✅ đã làm trên nhánh `chore/remove-google-healthconnect` (ngân sách calo = mục tiêu calo; màn "Ngân sách calo" bỏ, chạm thẻ calo mở Nhật ký; thử thách bước chân bị tắt, không xóa) | Gỡ màn Health Connect, thẻ vận động trên Trang chủ, calo vận động trong ngân sách calo, endpoint `/health-sync/*`, loại thử thách `Exercise` (bước chân) ở admin, số liệu "bước chân" ở báo cáo engagement. Sửa README và Overview V2 §10 (bỏ "đồng bộ thiết bị đeo", "ngân sách calo động") |
| Q3 | *Đã đồng ý, chưa làm:* Free xem được **tổng quan** công thức Pro (ảnh, calo, nguyên liệu) nhưng **khóa các bước nấu và nút "Thêm vào thực đơn"**. Backend trả 403 `pro_required` | Vẫn cho người dùng khám phá món, lại tạo lý do nâng cấp. Khớp BR-231 |
| Q4 | *Đã đồng ý, chưa làm:* Thực đơn và danh sách đi chợ tính **cho 1 người** (chia lượng nguyên liệu theo `Recipe.Servings`). Ô "Số người ăn" để giai đoạn sau | Sửa L4 với ít thay đổi nhất, không cần migration |
| Q5 | *Đã đồng ý, chưa làm:* **Chụp nhãn bằng AI** (`scan-label`, `check-safety` dạng văn bản) **tính 1 lượt AI**. **Quét mã vạch** (tra CSDL/Open Food Facts) **miễn phí**, cảnh báo dị ứng của sản phẩm mã vạch luôn hiện | Gemini chỉ dùng trong hạn mức (BR-233); tính năng an toàn không phụ thuộc AI vẫn dùng được |

## 10. UI/UX đã cải thiện (27/10/2026)

| Mục | Đã làm | Còn lại |
|---|---|---|
| L3 + U3 | Lối tắt Trang chủ (chụp AI, giọng nói, tìm món, mã vạch) lấy bữa theo giờ hiện tại. Màn xác nhận kết quả AI (ảnh và giọng nói) có hàng chip "Ghi vào bữa" để đổi bữa trước khi lưu. Component dùng chung `MealTypeChips` (cũng dùng ở Ghi bữa ăn và chi tiết món) | Chưa dùng bữa AI đoán từ câu nói (backend mặc định `Breakfast` khi AI không trả, dễ sai) |
| U1 | Trang chủ: vòng calo → Ghi bữa ăn + 4 lối tắt → Tổng quan dinh dưỡng → Bữa ăn hôm nay → Gợi ý → Bé Mầm. Bỏ thẻ "Mẹo nhỏ hôm nay" (nội dung cố định) | — |
| U2 | Tab "Bữa ăn" đổi thành "Thực đơn" (khớp `design.md`) | — |
| U5 | `AppChip` thêm `hitSlop` để vùng chạm đủ 44pt; link "Xem nhật ký" có `min-h-[44px]` | Chưa kiểm tra chữ phóng to (U6) |
| U7 (một phần) | Admin Web: hộp xác nhận dùng chung `ConfirmDialog`/`useConfirm` thay 7 chỗ `window.confirm`; bỏ chữ gradient, kính mờ và gradient trang trí (màu phẳng theo biến sẵn có); thêm `:focus-visible`, `::selection`, `aria-label` cho nút chỉ có icon, `aria-current` cho menu, `role=alert/status` cho toast | Màu viết thẳng trong `style={{…}}` của các màn (khoảng 460 chỗ), font chưa thống nhất với mobile, chưa có giao diện sáng |
| U8 | Admin Web: tab đang mở nằm trên URL (`#/users`…), F5 và Back/Forward giữ đúng trang, `document.title` theo trang | — |
