# BÁO CÁO KẾT QUẢ UNIT TEST — WEB ADMIN

## 1. Thông tin chung (General Information)

| Mục | Nội dung |
|---|---|
| **Tên dự án / Repository** | SmartMeal — Admin Web Portal (`DamThanQuy/SmartMeal`, nhánh `main`, commit `0a69156`) |
| **Module / Service / File** | **Frontend** `frontend/admin-web/src`: `services/api.js`, `App.jsx` và 11 component (`LoginView`, `Sidebar`, `Topbar`, `DashboardView`, `UsersView`, `RecipesView`, `RewardsView`, `SubscriptionsView`, `SystemActivityView`, `RevenueReportView`, `EngagementAnalyticsView`) · **Backend** `SmartMeal.API/Controllers/AdminController.cs` (28 endpoint `/api/admin/*`), `SmartMeal.Application/DTOs/Admin/AdminDTOs.cs`, `DbInitializer.EnsureAdminAccountAsync` — toàn bộ thêm ở commit `666ed0a` "Add admin portal and management API" |
| **Use case kiểm thử** | Đăng nhập Admin · Bảng điều khiển · Quản lý người dùng · **UC1** Ban user · **UC2** Moderate account · Quản lý món ăn · Gói hội viên & duyệt giao dịch · **UC3** Hệ thống phần thưởng · **UC4** Giám sát hệ thống · **UC5** Báo cáo doanh thu · **UC6** Phân tích tương tác |
| **Test Framework** | **Frontend:** Vitest 5.0.5 + @testing-library/react 16.3.3 + @testing-library/user-event 14.6.8 + jsdom 30.1.3, coverage `@vitest/coverage-v8` · **Backend:** xUnit 2.9.3 + `WebApplicationFactory` (API thật) + PostgreSQL 16 (Docker), coverage coverlet 6.0.2 · **Live:** Vitest chạy `services/api.js` thật với backend Docker |
| **Người thực hiện** | AI Assistant (Claude Code) |
| **Ngày thực hiện** | 22/10/2026 |
| **Môi trường** | Windows 11 Pro · Node.js 22.19.0 · React 19.3 + Vite 8.3 · Docker (`mcr.microsoft.com/dotnet/sdk:9.0`, `postgres:16-alpine`, image `smartmeal-backend-api` build lại từ commit `0a69156`) |

> Trước đợt này Admin Web **chưa có test nào** (không có test runner, không có test backend cho `AdminController`). Toàn bộ 247 test case dưới đây được viết mới trong đợt này.

## 2. Tổng quan kết quả (Test Run Summary)

| Chỉ số (Metric) | Backend API quản trị (xUnit) | Admin Web unit (Vitest) | Admin Web live (Vitest + BE thật) | **Tổng** |
|---|---|---|---|---|
| 📦 **Test Suites** | 0 Passed / 1 Total (0%) | 4 Passed / 10 Total (40.0%) | 1 Passed / 1 Total (100%) | 5 Passed / 12 Total (41.7%) |
| 🧪 **Test Cases (Specs)** | 65 | 162 | 20 | **247** |
| 🟢 **PASS** | 40 (61.5%) | 155 (95.7%) | 20 (100%) | **215 (87.0%)** |
| 🔴 **FAIL** | 25 (38.5%) | 7 (4.3%) | 0 (0%) | **32 (13.0%)** |
| 🟡 **SKIPPED** | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| ⏱️ **Thời gian chạy (Duration)** | 85.4s | 11.4s | 7.7s | 104.5s (1m45s) |

> Suite: backend = lớp `AdminApiTests`, frontend = 1 file `*.test.js(x)`; suite chỉ tính "Passed" khi mọi test trong đó PASS. Thời gian backend = tổng thời gian 65 test (chạy tuần tự trong lớp, song song với các lớp test khác của cùng lượt `dotnet test` 357 test / 2m02s). 32 test FAIL đều là **lỗi thật của code** (đã kiểm tra từng test fail đúng lý do mong đợi), không có FAIL do môi trường — xem mục 4.

### 📊 Độ bao phủ mã nguồn (Code Coverage Summary)

**Yêu cầu mức bao phủ tối thiểu (Target): ≥ 80%**

| Chỉ số | Admin Web — toàn bộ `src/` (trừ `main.jsx`) | Backend — `AdminController.cs` | Backend — phần admin (`AdminController.cs` + `AdminDTOs.cs`) |
|---|---|---|---|
| **Statements** | ✅ 91.4% (657/719) | — ¹ | — ¹ |
| **Branches** (Nhánh điều kiện) | ✅ 87.4% (500/572) | ❌ 74.4% (183/246) | ❌ 74.4% (183/246) |
| **Functions** (Hàm) | ✅ 85.2% (218/256) | ✅ 100% (48/48) | ✅ 98.2% (269/274) |
| **Lines** | ✅ 92.5% (643/695) | ✅ 97.4% (1095/1124) | ✅ 97.5% (1316/1350) |

¹ coverlet đo theo dòng (sequence point) nên không có số Statements riêng.

Coverage Admin Web theo file:

| File | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| `services/api.js` | 100% (92/92) | 100% (47/47) | 100% (35/35) | 100% (89/89) |
| `App.jsx` | 94.4% (51/54) | 95.0% (38/40) | 92.3% (12/13) | 96.2% (51/53) |
| `components/LoginView.jsx` | 100% (23/23) | 100% (10/10) | 100% (5/5) | 100% (23/23) |
| `components/Sidebar.jsx` | 100% (6/6) | 100% (8/8) | 100% (3/3) | 100% (6/6) |
| `components/Topbar.jsx` | 100% (1/1) | 100% (4/4) | 100% (1/1) | 100% (1/1) |
| `components/DashboardView.jsx` | 95.2% (20/21) | 89.6% (43/48) | 100% (11/11) | 100% (20/20) |
| `components/UsersView.jsx` | 81.3% (135/166) | ❌ 68.5% (85/124) | ❌ 73.7% (42/57) | 83.2% (134/161) |
| `components/RecipesView.jsx` | 88.5% (115/130) | 85.7% (78/91) | ❌ 74.6% (44/59) | 88.0% (110/125) |
| `components/RewardsView.jsx` | 90.2% (92/102) | 95.4% (62/65) | ❌ 79.4% (27/34) | 91.9% (91/99) |
| `components/SubscriptionsView.jsx` | 97.6% (40/41) | 91.7% (33/36) | 100% (12/12) | 100% (40/40) |
| `components/SystemActivityView.jsx` | 96.0% (24/25) | 97.1% (33/34) | 100% (8/8) | 100% (23/23) |
| `components/RevenueReportView.jsx` | 100% (40/40) | 96.8% (30/31) | 100% (13/13) | 100% (38/38) |
| `components/EngagementAnalyticsView.jsx` | 100% (18/18) | 85.3% (29/34) | 100% (5/5) | 100% (17/17) |

**Nhận xét coverage:** Admin Web đạt mục tiêu ở cả 4 chỉ số. `UsersView.jsx` có branch thấp nhất (68.5%) chủ yếu vì **hộp thoại "Khóa / Mở khóa tài khoản" là code chết**: state `lockTarget` không bao giờ được gán (không có nút nào gọi `setLockTarget(user)`), nên không test nào chạy tới được. Các hàm chưa phủ ở `RecipesView`/`RewardsView` là các `onChange` của ô nhập số (calo, protein, số ngày…) không ảnh hưởng nghiệp vụ. Backend: Lines/Methods đạt; Branches 74.4% chưa đạt — nhánh chưa phủ là các toán tử `?:` trong projection LINQ (người dùng / giao dịch null) và nhánh lọc `status`/`subscription` không hợp lệ.

## 3. Chi tiết các Test Case (Unit Test Cases)

Mọi test case trong đợt này đều mới; mục 3.1–3.3 trình bày **từng test case** theo form. Phụ lục A liệt kê lại toàn bộ 247 test case kèm thời gian chạy.

### 3.1 Backend — API quản trị (`backend/SmartMeal.Tests/AdminApiTests.cs`, 65 test case)

Mỗi lớp test chạy trên một database PostgreSQL riêng (migration + seed như môi trường thật), dùng tài khoản admin riêng của test (đăng ký thường rồi nâng quyền) để không phụ thuộc tài khoản mặc định.

#### 3.1.1 Đăng nhập & phân quyền (`/api/admin/auth/login`, `[Authorize(Roles="Admin")]`)

| # | Function / Endpoint | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 1 | `POST /api/admin/auth/login` | Đăng nhập cổng Admin thành công<br><sub>`Admin_login_returns_a_token_and_the_admin_profile`</sub> | Tài khoản Role=Admin, email viết HOA | 200, có JWT, user.role = Admin, đúng Id, hạn token > hiện tại | Đúng như mong đợi | 🟢 PASS |
| 2 | `POST /api/admin/auth/login` | Sai mật khẩu<br><sub>`Admin_login_with_a_wrong_password_is_rejected_with_401`</sub> | Admin + mật khẩu sai | 401, success = false | Đúng như mong đợi | 🟢 PASS |
| 3 | `POST /api/admin/auth/login` | Người dùng thường đăng nhập cổng Admin<br><sub>`Admin_login_refuses_a_regular_user_with_403`</sub> | Tài khoản Role=User, mật khẩu đúng | 403 Forbidden | Đúng như mong đợi | 🟢 PASS |
| 4 | `POST /api/admin/auth/login` | Email sai định dạng<br><sub>`Admin_login_validates_the_email_format`</sub> | email = "not-an-email" | 400 (model validation) | Đúng như mong đợi | 🟢 PASS |
| 5 | `POST /api/admin/auth/login` | Chống dò mật khẩu cổng Admin<br><sub>`Admin_login_locks_the_account_after_five_wrong_passwords_like_the_app_login`</sub> | 5 lần sai mật khẩu rồi nhập đúng | 423 Locked (như login của app: khóa 15 phút sau 5 lần sai) | Assert.Equal() Failure: Values differ Expected: Locked Actual: OK | 🔴 FAIL |
| 6 | `POST /api/auth/refresh` | Refresh token do cổng Admin cấp dùng được<br><sub>`The_refresh_token_returned_by_admin_login_can_renew_the_session`</sub> | refreshToken từ admin login | 200, cấp cặp token mới | Assert.Equal() Failure: Values differ Expected: OK Actual: Unauthorized | 🔴 FAIL |
| 7 | `DbInitializer.EnsureAdminAccountAsync` | Tài khoản admin mặc định không tồn tại ngoài Development<br><sub>`The_default_admin_password_does_not_work_outside_development`</sub> | Môi trường Testing; admin@smartmeal.com / Admin@123456 | 401 (không có tài khoản mặc định) | Assert.Equal() Failure: Values differ Expected: Unauthorized Actual: OK | 🔴 FAIL |
| 8 | `[Authorize(Roles="Admin")]` | 11 endpoint GET /api/admin/* khi chưa đăng nhập<br><sub>`Every_admin_endpoint_requires_a_token`</sub> | Không có Authorization header | Mọi endpoint trả 401 | Đúng như mong đợi | 🟢 PASS |
| 9 | `[Authorize(Roles="Admin")]` | 11 endpoint GET + 1 PUT với token người dùng thường<br><sub>`Every_admin_endpoint_refuses_a_regular_user_token`</sub> | Bearer token Role=User | Mọi endpoint trả 403 | Đúng như mong đợi | 🟢 PASS |

#### 3.1.2 Thống kê tổng quan (`/api/admin/stats`)

| # | Function / Endpoint | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 10 | `GET /api/admin/stats` | Số liệu tổng quan thay đổi đúng theo dữ liệu<br><sub>`Dashboard_stats_count_users_pro_locked_recipes_and_paid_revenue`</sub> | +3 user (1 Pro, 1 bị cấm), +1 giao dịch Paid 100.000đ, +1 Pending | Tổng user +3, Pro +1, khóa +1, active = tổng − khóa, giao dịch +2, doanh thu (tổng/tháng) +100.000, user mới nhất đứng đầu, đủ 4 bữa, 2 gói | Đúng như mong đợi | 🟢 PASS |

#### 3.1.3 Quản lý người dùng (`/api/admin/users`)

| # | Function / Endpoint | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 11 | `GET /api/admin/users` | Lọc theo search / role / status / subscription<br><sub>`User_list_filters_by_search_role_status_and_subscription`</sub> | 3 user cùng mã tìm kiếm: Pro, bị cấm, Free | search (không phân biệt hoa thường) = 3; premium = [Pro]; free = [cấm, Free]; locked = [cấm]; role=Admin chỉ gồm Admin | Đúng như mong đợi | 🟢 PASS |
| 12 | `GET /api/admin/users` | Phân trang + header tổng số<br><sub>`User_list_is_paginated_newest_first_and_exposes_the_total_count`</sub> | 3 user, pageSize = 2 | X-Total-Count = 3; trang 1 có 2 (mới nhất trước), trang 2 có 1 | Đúng như mong đợi | 🟢 PASS |
| 13 | `GET /api/admin/users/{id}` | Chi tiết người dùng<br><sub>`User_detail_includes_the_health_profile_and_activity_counts`</sub> | User đã khảo sát sức khỏe, ghi 1 bữa, thích 1 món | Có healthProfile (Female, 160 cm, calo mục tiêu > 0); diaries = 1, favorites = 1, mealPlans = 0 | Đúng như mong đợi | 🟢 PASS |
| 14 | `users/{id}: GET, role, ban, moderate, subscription, DELETE` | Id không tồn tại<br><sub>`Unknown_users_return_404_on_every_user_action`</sub> | Guid ngẫu nhiên | Mọi thao tác trả 404 | Đúng như mong đợi | 🟢 PASS |
| 15 | `PUT /api/admin/users/{id}/role` | Nâng / hạ quyền<br><sub>`Promoting_a_user_to_admin_opens_the_admin_portal_and_demoting_closes_it`</sub> | role = "admin" rồi "User" | Sau nâng: đăng nhập Admin 200; sau hạ: 403 | Đúng như mong đợi | 🟢 PASS |
| 16 | `PUT /api/admin/users/{id}/role` | Thu hồi quyền Admin có hiệu lực ngay<br><sub>`A_demoted_admin_loses_admin_access_with_the_token_already_issued`</sub> | Admin B đang có token; Admin A hạ B về User | Token cũ của B gọi /api/admin/users → 403 | Assert.Equal() Failure: Values differ Expected: Forbidden Actual: OK | 🔴 FAIL |
| 17 | `PUT /api/admin/users/{id}/role` | Tự hạ quyền chính mình<br><sub>`An_admin_cannot_demote_their_own_account`</sub> | id = admin đang đăng nhập, role = User | 400 (như đã chặn tự xóa / tự cấm) | Assert.Equal() Failure: Values differ Expected: BadRequest Actual: OK | 🔴 FAIL |
| 18 | `PUT /api/admin/users/{id}/status` | Tự khóa chính mình<br><sub>`An_admin_cannot_lock_their_own_account_through_the_status_endpoint`</sub> | id = admin đang đăng nhập, isLocked = true | 400 | Assert.Equal() Failure: Values differ Expected: BadRequest Actual: OK | 🔴 FAIL |
| 19 | `PUT /api/admin/users/{id}/status` | Khóa rồi mở khóa<br><sub>`Status_endpoint_locks_and_unlocks_an_account`</sub> | isLocked = true → false | Khi khóa: login app 423; mở khóa: login 200 | Đúng như mong đợi | 🟢 PASS |
| 20 | `PUT /api/admin/users/{id}/subscription` | Cấp gói Năm rồi hủy<br><sub>`Granting_and_revoking_pro_is_reflected_in_the_users_subscription_status`</sub> | isPro=true, PRO_YEARLY, 365 ngày → isPro=false | App: isPro, planId PRO_YEARLY, hạn ≈ +365 ngày; sau hủy: Free | Đúng như mong đợi | 🟢 PASS |
| 21 | `PUT /api/admin/users/{id}/subscription` | Số ngày Pro không hợp lệ — `(days: -30)`<br><sub>`Granting_pro_rejects_a_non_positive_duration`</sub> | durationDays = 0 / −30 | 400 | Assert.Equal() Failure: Values differ Expected: BadRequest Actual: OK | 🔴 FAIL |
| 22 | `PUT /api/admin/users/{id}/subscription` | Số ngày Pro không hợp lệ — `(days: 0)`<br><sub>`Granting_pro_rejects_a_non_positive_duration`</sub> | durationDays = 0 / −30 | 400 | Assert.Equal() Failure: Values differ Expected: BadRequest Actual: OK | 🔴 FAIL |
| 23 | `DELETE /api/admin/users/{id}` | Xóa tài khoản có giao dịch<br><sub>`Deleting_a_user_removes_the_account_but_keeps_their_payment_history`</sub> | User có 1 giao dịch Paid | 200; chi tiết 404; token cũ 401; giao dịch còn, UserId = null, email "Đã xóa tài khoản" | Đúng như mong đợi | 🟢 PASS |
| 24 | `DELETE users/{id}, PUT users/{id}/ban` | Tự xóa / tự cấm<br><sub>`An_admin_cannot_delete_or_ban_their_own_account`</sub> | id = admin đang đăng nhập | Cả hai 400; admin vẫn dùng được API | Đúng như mong đợi | 🟢 PASS |

#### 3.1.4 UC1 — Ban user (`PUT /api/admin/users/{id}/ban`)

| # | Function / Endpoint | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 25 | `PUT /api/admin/users/{id}/ban` | Cấm rồi gỡ cấm<br><sub>`A_banned_user_cannot_log_in_until_unbanned`</sub> | isBanned = true (30 ngày) → false | Khi cấm: login app 423; sau gỡ: 200 | Đúng như mong đợi | 🟢 PASS |
| 26 | `PUT /api/admin/users/{id}/ban` | Thời hạn cấm — `(days: 1)`<br><sub>`Ban_duration_sets_the_lockout_end`</sub> | durationDays = 1 / 30 / null (vĩnh viễn) | isLocked; lockoutEnd ≈ now + 1 / 30 / 18.250 ngày (±5 phút) | Đúng như mong đợi | 🟢 PASS |
| 27 | `PUT /api/admin/users/{id}/ban` | Thời hạn cấm — `(days: 30)`<br><sub>`Ban_duration_sets_the_lockout_end`</sub> | durationDays = 1 / 30 / null (vĩnh viễn) | isLocked; lockoutEnd ≈ now + 1 / 30 / 18.250 ngày (±5 phút) | Đúng như mong đợi | 🟢 PASS |
| 28 | `PUT /api/admin/users/{id}/ban` | Thời hạn cấm — `(days: null)`<br><sub>`Ban_duration_sets_the_lockout_end`</sub> | durationDays = 1 / 30 / null (vĩnh viễn) | isLocked; lockoutEnd ≈ now + 1 / 30 / 18.250 ngày (±5 phút) | Đúng như mong đợi | 🟢 PASS |
| 29 | `PUT /api/admin/users/{id}/ban` | Cấm phải thu hồi token đang dùng<br><sub>`Banning_a_user_revokes_their_current_access_token`</sub> | User đang đăng nhập (token hợp lệ) bị cấm 30 ngày | GET /api/auth/me bằng token cũ ≠ 200 (UI hứa "thu hồi token ngay lập tức") | Assert.NotEqual() Failure: Values are equal Expected: Not OK Actual: OK | 🔴 FAIL |
| 30 | `PUT /api/admin/users/{id}/ban` | Cấm phải chặn gia hạn phiên<br><sub>`Banning_a_user_revokes_their_refresh_token`</sub> | Refresh token của user bị cấm | POST /api/auth/refresh ≠ 200 | Assert.NotEqual() Failure: Values are equal Expected: Not OK Actual: OK | 🔴 FAIL |

#### 3.1.5 UC2 — Moderate account (`PUT /api/admin/users/{id}/moderate`)

| # | Function / Endpoint | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 31 | `PUT /api/admin/users/{id}/moderate` | Đổi tên (trim), xác minh email, đặt lại mật khẩu<br><sub>`Moderation_renames_verifies_and_resets_the_password`</sub> | fullName " Tên Hợp Lệ ", resetPassword "NewPassw0rd!" | Mật khẩu cũ 401, mới 200; tên = "Tên Hợp Lệ"; role User | Đúng như mong đợi | 🟢 PASS |
| 32 | `PUT /api/admin/users/{id}/moderate` | Gỡ khóa do nhập sai 5 lần<br><sub>`Moderation_clears_a_brute_force_lockout`</sub> | User đang 423, clearLockout = true | Đăng nhập lại 200 | Đúng như mong đợi | 🟢 PASS |
| 33 | `PUT /api/admin/users/{id}/moderate` | Mật khẩu mới phải theo chính sách 8–128 ký tự<br><sub>`Moderation_password_reset_follows_the_password_policy`</sub> | resetPassword = "123" | 400 | Assert.Equal() Failure: Values differ Expected: BadRequest Actual: OK | 🔴 FAIL |
| 34 | `PUT /api/admin/users/{id}/moderate` | Đặt lại mật khẩu phải đăng xuất phiên cũ<br><sub>`Moderation_password_reset_signs_out_existing_sessions`</sub> | resetPassword hợp lệ; refresh token cũ | Refresh → 401 (như khi người dùng tự đổi mật khẩu) | Assert.Equal() Failure: Values differ Expected: Unauthorized Actual: OK | 🔴 FAIL |

#### 3.1.6 Quản lý món ăn (`/api/admin/recipes`)

| # | Function / Endpoint | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 35 | `POST /api/admin/recipes` | Tạo món, app thấy ngay<br><sub>`A_recipe_created_by_the_admin_appears_in_the_app_catalog_with_tags_and_ingredients`</sub> | Món Lunch,Dinner, tag eatClean+highProtein, 1 nguyên liệu có sẵn + 1 mới | Chi tiết đủ tag/2 nguyên liệu, tổng 15 phút; không tạo trùng nguyên liệu; GET /api/recipes/{id} trả đúng tên, bữa, tag | Đúng như mong đợi | 🟢 PASS |
| 36 | `POST /api/admin/recipes` | Trùng tên (khác hoa thường, có khoảng trắng)<br><sub>`Creating_a_recipe_with_an_existing_title_is_rejected`</sub> | Tên món đã có, viết HOA + khoảng trắng | 400 | Đúng như mong đợi | 🟢 PASS |
| 37 | `POST /api/admin/recipes` | Giá trị app không hiểu — `(field: "difficulty")`<br><sub>`Creating_a_recipe_rejects_values_the_app_cannot_handle`</sub> | difficulty "Impossible" / calo −250 / mealTypes "Brunch" | 400 cho từng trường hợp | Assert.Equal() Failure: Values differ Expected: BadRequest Actual: OK | 🔴 FAIL |
| 38 | `POST /api/admin/recipes` | Giá trị app không hiểu — `(field: "calories")`<br><sub>`Creating_a_recipe_rejects_values_the_app_cannot_handle`</sub> | difficulty "Impossible" / calo −250 / mealTypes "Brunch" | 400 cho từng trường hợp | Assert.Equal() Failure: Values differ Expected: BadRequest Actual: OK | 🔴 FAIL |
| 39 | `POST /api/admin/recipes` | Giá trị app không hiểu — `(field: "mealTypes")`<br><sub>`Creating_a_recipe_rejects_values_the_app_cannot_handle`</sub> | difficulty "Impossible" / calo −250 / mealTypes "Brunch" | 400 cho từng trường hợp | Assert.Equal() Failure: Values differ Expected: BadRequest Actual: OK | 🔴 FAIL |
| 40 | `GET /api/admin/recipes` | Lọc theo tìm kiếm / bữa / độ khó / Pro<br><sub>`Recipe_list_filters_by_search_meal_type_difficulty_and_premium`</sub> | 2 món: Tối-Hard, Sáng-Easy | search = 2 (X-Total-Count = 2); Dinner = [Tối]; easy = [Sáng]; isPremium = [] | Đúng như mong đợi | 🟢 PASS |
| 41 | `PUT /api/admin/recipes/{id}` | Sửa toàn bộ món<br><sub>`Updating_a_recipe_replaces_its_fields_tags_and_ingredients`</sub> | Hard, 510 kcal, Breakfast, tag keto, nguyên liệu Trứng gà (quả) | Trả về đúng các giá trị mới; chỉ còn 1 nguyên liệu | Đúng như mong đợi | 🟢 PASS |
| 42 | `PUT /api/admin/recipes/{id}` | Sửa thành tên của món khác<br><sub>`Updating_a_recipe_to_another_recipes_title_is_rejected`</sub> | Món B đổi tên = tên món A | 400 (như khi tạo) | Assert.Equal() Failure: Values differ Expected: BadRequest Actual: OK | 🔴 FAIL |
| 43 | `DELETE /api/admin/recipes/{id}` | Xóa món đã được yêu thích<br><sub>`Deleting_a_recipe_removes_it_from_the_admin_list_and_the_app`</sub> | Món có 1 lượt yêu thích | 200; admin 404; app 404; xóa lần 2 → 404 | Đúng như mong đợi | 🟢 PASS |
| 44 | `DELETE /api/admin/recipes/{id}` | Xóa món đã có trong nhật ký ăn uống<br><sub>`Deleting_a_recipe_that_a_user_logged_in_the_diary_keeps_the_diary_entry`</sub> | User ghi 1 bữa có recipeId = món | 200; dòng nhật ký vẫn còn | Assert.Equal() Failure: Values differ Expected: OK Actual: InternalServerError | 🔴 FAIL |

#### 3.1.7 Gói hội viên & giao dịch (`/api/admin/plans`, `/api/admin/transactions`)

| # | Function / Endpoint | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 45 | `GET /api/admin/plans` | Giá gói khớp gói app bán<br><sub>`Plans_match_the_public_subscription_catalog`</sub> | — | (id, giá, chu kỳ) trùng /api/subscription/plans | Đúng như mong đợi | 🟢 PASS |
| 46 | `GET /api/admin/transactions` | Lọc trạng thái + tìm theo email<br><sub>`Transactions_filter_by_status_and_search`</sub> | 1 Pending + 1 Paid (Yearly) cùng user | pending = [Pending]; all = 2 giao dịch; tên gói "Gói Năm (Pro Yearly)" | Đúng như mong đợi | 🟢 PASS |
| 47 | `PUT /api/admin/transactions/{id}/approve` | Duyệt đơn chờ gói Năm<br><sub>`Approving_a_pending_transaction_activates_pro_for_the_plan_duration`</sub> | Giao dịch Pending PRO_YEARLY 699.000đ | User Pro, PRO_YEARLY, hạn ≈ +365 ngày; giao dịch Paid, có PaidAt | Đúng như mong đợi | 🟢 PASS |
| 48 | `PUT /api/admin/transactions/{id}/approve` | Duyệt lại đơn đã Paid<br><sub>`Approving_the_same_transaction_twice_does_not_extend_pro_twice`</sub> | Duyệt cùng 1 giao dịch 79.000đ hai lần | Hạn Pro không đổi sau lần duyệt thứ 2 | Assert.InRange() Failure: Value not in range Range: (2026-11-21T00:31:05.3795400Z - 2026-11-21T00:33:05.3795400Z) Actual: 2026-12-21T00:32:05.3795400Z | 🔴 FAIL |
| 49 | `PUT /api/admin/transactions/{id}/approve` | Giao dịch không tồn tại<br><sub>`Approving_an_unknown_transaction_returns_404`</sub> | Guid ngẫu nhiên | 404 | Đúng như mong đợi | 🟢 PASS |

#### 3.1.8 UC3 — Hệ thống phần thưởng (`/api/admin/rewards/*`)

| # | Function / Endpoint | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 50 | `POST/PUT/DELETE /api/admin/rewards/challenges` | Vòng đời thử thách<br><sub>`A_challenge_created_updated_and_deleted_by_the_admin_is_mirrored_in_the_app`</sub> | DrinkWater 1.500 ml × 5 ngày; sửa rewardExp = 5, rewardBadge rỗng | App thấy thử thách; sau sửa: tên mới, XP tối thiểu 10, giữ huy hiệu cũ; sau xóa: app không còn | Đúng như mong đợi | 🟢 PASS |
| 51 | `POST /api/admin/rewards/challenges` | Loại thử thách không chấm được — `(category: "NoSugar")`<br><sub>`A_challenge_category_the_app_cannot_score_is_rejected`</sub> | category = "NoSugar" (có trên form web) / "Sleep" | 400 (GamificationService chỉ chấm DrinkWater/EatClean/Exercise) | Assert.Equal() Failure: Values differ Expected: BadRequest Actual: OK | 🔴 FAIL |
| 52 | `POST /api/admin/rewards/challenges` | Loại thử thách không chấm được — `(category: "Sleep")`<br><sub>`A_challenge_category_the_app_cannot_score_is_rejected`</sub> | category = "NoSugar" (có trên form web) / "Sleep" | 400 (GamificationService chỉ chấm DrinkWater/EatClean/Exercise) | Assert.Equal() Failure: Values differ Expected: BadRequest Actual: OK | 🔴 FAIL |
| 53 | `GET /api/admin/rewards/badges` | Danh sách huy hiệu khớp app và đếm lượt mở khóa<br><sub>`Badge_list_uses_the_app_badge_catalog_and_counts_real_unlocks`</sub> | User ghi bữa đầu → mở "first-log" trong app | Mọi BadgeId thuộc GamificationCatalog; first-log có unlockedCount ≥ 1 | Huy hiệu không có trong app: clean_eater_7, water_master_2l, ai_chef_explorer, walker_10k_steps, pet_lover_level5 | 🔴 FAIL |
| 54 | `POST /api/admin/rewards/grant-xp` | Tặng 600 XP<br><sub>`Granting_xp_levels_up_the_pet_and_is_logged_as_an_admin_reward`</sub> | xp = 600 cho user mới | Pet: totalXp 600, level 2, 100 XP vào cấp; nhật ký có AdminReward +600 | Đúng như mong đợi | 🟢 PASS |
| 55 | `POST /api/admin/rewards/grant-xp` | XP ngoài khoảng [1, 10.000] — `(xp: 10001)`<br><sub>`Granting_xp_outside_1_to_10000_is_rejected`</sub> | xp = 0 / −50 / 10.001 | 400 | Đúng như mong đợi | 🟢 PASS |
| 56 | `POST /api/admin/rewards/grant-xp` | XP ngoài khoảng [1, 10.000] — `(xp: -50)`<br><sub>`Granting_xp_outside_1_to_10000_is_rejected`</sub> | xp = 0 / −50 / 10.001 | 400 | Đúng như mong đợi | 🟢 PASS |
| 57 | `POST /api/admin/rewards/grant-xp` | XP ngoài khoảng [1, 10.000] — `(xp: 0)`<br><sub>`Granting_xp_outside_1_to_10000_is_rejected`</sub> | xp = 0 / −50 / 10.001 | 400 | Đúng như mong đợi | 🟢 PASS |
| 58 | `POST /api/admin/rewards/grant-xp` | User không tồn tại<br><sub>`Granting_xp_to_an_unknown_user_returns_404`</sub> | userId ngẫu nhiên | 404 | Đúng như mong đợi | 🟢 PASS |

#### 3.1.9 UC4 — Giám sát hệ thống (`/api/admin/system/activity`)

| # | Function / Endpoint | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 59 | `GET /api/admin/system/activity` | Nhật ký bữa ăn + sự kiện an ninh<br><sub>`System_activity_shows_the_latest_meal_logs_and_locked_accounts`</sub> | User ghi "Bún bò" 480 kcal; 1 user bị cấm | Có dòng nhật ký 480 kcal (Lunch); có sự kiện AccountLocked của user bị cấm | Đúng như mong đợi | 🟢 PASS |
| 60 | `GET /api/admin/system/activity` | Uptime là thời gian chạy thật<br><sub>`System_activity_reports_the_real_server_uptime`</sub> | API test vừa khởi động vài phút | serverUptimeHours ∈ [0, 1] | Assert.InRange() Failure: Value not in range Range: (0 - 1) Actual: 24.5 | 🔴 FAIL |

#### 3.1.10 UC5 — Báo cáo doanh thu (`/api/admin/reports/revenue`)

| # | Function / Endpoint | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 61 | `GET /api/admin/reports/revenue` | Tổng doanh thu, theo cổng, theo gói, theo ngày<br><sub>`Revenue_report_totals_paid_transactions_by_method_and_plan`</sub> | +Paid 79.000 SEPAY Monthly, +Paid 699.000 PAYOS Yearly, +1 Pending, +1 Failed | Tổng/tháng +778.000; giao dịch +4 (2 thành công, 1 chờ, 1 lỗi); SEPAY +79.000, PAYOS +699.000; 7 mốc, hôm nay +778.000 | Đúng như mong đợi | 🟢 PASS |
| 62 | `GET /api/admin/reports/revenue?startDate&endDate` | Lọc theo khoảng ngày<br><sub>`Revenue_report_honours_the_date_range_chosen_on_the_web`</sub> | Paid 123.000 ngày 15/01/2025 + Paid hôm nay; lọc 01–31/01/2025 | totalRevenue = 123.000; 1 giao dịch thành công | Assert.Equal() Failure: Values differ Expected: 123000 Actual: 1779000 | 🔴 FAIL |

#### 3.1.11 UC6 — Phân tích tương tác (`/api/admin/reports/engagement`)

| # | Function / Endpoint | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 63 | `GET /api/admin/reports/engagement` | DAU/WAU/MAU và tổng nhật ký<br><sub>`Engagement_counts_users_who_logged_meals_today`</sub> | 2 user mới mỗi người ghi 1 bữa | DAU ≥ 2, WAU ≥ DAU, MAU ≥ WAU; tổng nhật ký +2 | Đúng như mong đợi | 🟢 PASS |
| 64 | `GET /api/admin/reports/engagement` | Không ai hoạt động<br><sub>`Engagement_reports_zero_active_users_when_nobody_was_active`</sub> | Database mới, chưa có nhật ký / AI | DAU = WAU = MAU = 0 | Assert.Equal() Failure: Values differ Expected: Tuple (0, 0, 0) Actual: Tuple (1, 1, 1) | 🔴 FAIL |
| 65 | `GET /api/admin/reports/engagement` | Bảng xếp hạng theo XP trên toàn bộ người dùng<br><sub>`Top_engaged_users_are_ranked_by_xp_across_all_users`</sub> | 12 user mới, user cuối được tặng 10.000 XP | Danh sách giảm dần theo XP; người 10.000 XP đứng hạng 1 | Assert.Equal() Failure: Values differ Expected: e8640aeb-0b52-4725-bb11-6c48aabe2ee7 Actual: 215d5141-14be-4e17-9953-c49d18715b95 | 🔴 FAIL |



### 3.2 Admin Web — giao diện & lớp API (`frontend/admin-web/src/__tests__/`, 162 test case)

Component được render bằng Testing Library trên jsdom; `services/api.js` được mock (dữ liệu mẫu đúng hình dạng JSON của `/api/admin/*` ở `src/test/fixtures.js`), riêng `api.test.js` mock `fetch` để kiểm tra chính lớp gọi API.

#### 3.2.1 `services/api.js` — lớp gọi API (fetch, token, lỗi, phiên)

_File: `frontend/admin-web/src/__tests__/services/api.test.js`_

| # | Function / Component | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 1 | authStorage | lưu và đọc token, thông tin admin | setToken / setUser | getToken, getUser trả lại đúng | Đúng như mong đợi | 🟢 PASS |
| 2 | authStorage | trả null khi chưa đăng nhập hoặc dữ liệu user bị hỏng | localStorage trống / JSON hỏng | getUser() = null (không ném lỗi) | Đúng như mong đợi | 🟢 PASS |
| 3 | authStorage | clear() xóa cả token lẫn user | Có token + user | Cả hai = null | Đúng như mong đợi | 🟢 PASS |
| 4 | request — header, lỗi và phiên hết hạn | gửi JSON và gắn Bearer token khi đã đăng nhập | token "abc"; getStats | URL /api/admin/stats; Content-Type JSON; Authorization "Bearer abc" | Đúng như mong đợi | 🟢 PASS |
| 5 | request — header, lỗi và phiên hết hạn | không gửi header Authorization khi chưa có token | Không có token | Không có header Authorization | Đúng như mong đợi | 🟢 PASS |
| 6 | request — header, lỗi và phiên hết hạn | ném lỗi với message của backend | 400 {message} | Error(message) | Đúng như mong đợi | 🟢 PASS |
| 7 | request — header, lỗi và phiên hết hạn | ghép danh sách errors khi backend không có message | 400 {errors: [a, b]} | Error("a, b") | Đúng như mong đợi | 🟢 PASS |
| 8 | request — header, lỗi và phiên hết hạn | dùng thông báo mặc định kèm mã HTTP khi body không phải JSON | 502, body HTML | Error("Lỗi yêu cầu (502)") | Đúng như mong đợi | 🟢 PASS |
| 9 | request — header, lỗi và phiên hết hạn | 401: xóa phiên đăng nhập và phát sự kiện smartmeal_admin_unauthorized | 401 | Ném lỗi; xóa token + user; phát sự kiện 1 lần | Đúng như mong đợi | 🟢 PASS |
| 10 | request — header, lỗi và phiên hết hạn | 403 không xóa phiên đăng nhập | 403 | Ném lỗi; token giữ nguyên | Đúng như mong đợi | 🟢 PASS |
| 11 | api.login | lưu token + user khi đăng nhập thành công và trả data | 200 {token, user} | POST /api/admin/auth/login {email, password}; lưu token/user; trả data | Đúng như mong đợi | 🟢 PASS |
| 12 | api.login | không lưu gì khi backend không trả token | 200 {data: null} | Không lưu token | Đúng như mong đợi | 🟢 PASS |
| 13 | api — URL, phương thức và payload của từng chức năng | getStats gọi GET /api/admin/stats | api.getStats() | fetch GET /api/admin/stats | Đúng như mong đợi | 🟢 PASS |
| 14 | api — URL, phương thức và payload của từng chức năng | getUserDetail gọi GET /api/admin/users/u1 | api.getUserDetail('u1') | fetch GET /api/admin/users/u1 | Đúng như mong đợi | 🟢 PASS |
| 15 | api — URL, phương thức và payload của từng chức năng | deleteUser gọi DELETE /api/admin/users/u1 | api.deleteUser('u1') | fetch DELETE /api/admin/users/u1 | Đúng như mong đợi | 🟢 PASS |
| 16 | api — URL, phương thức và payload của từng chức năng | getRecipeDetail gọi GET /api/admin/recipes/r1 | api.getRecipeDetail('r1') | fetch GET /api/admin/recipes/r1 | Đúng như mong đợi | 🟢 PASS |
| 17 | api — URL, phương thức và payload của từng chức năng | deleteRecipe gọi DELETE /api/admin/recipes/r1 | api.deleteRecipe('r1') | fetch DELETE /api/admin/recipes/r1 | Đúng như mong đợi | 🟢 PASS |
| 18 | api — URL, phương thức và payload của từng chức năng | getPlans gọi GET /api/admin/plans | api.getPlans() | fetch GET /api/admin/plans | Đúng như mong đợi | 🟢 PASS |
| 19 | api — URL, phương thức và payload của từng chức năng | approveTransaction gọi PUT /api/admin/transactions/t1/approve | api.approveTransaction('t1') | fetch PUT /api/admin/transactions/t1/approve | Đúng như mong đợi | 🟢 PASS |
| 20 | api — URL, phương thức và payload của từng chức năng | getChallenges gọi GET /api/admin/rewards/challenges | api.getChallenges() | fetch GET /api/admin/rewards/challenges | Đúng như mong đợi | 🟢 PASS |
| 21 | api — URL, phương thức và payload của từng chức năng | deleteChallenge gọi DELETE /api/admin/rewards/challenges/c1 | api.deleteChallenge('c1') | fetch DELETE /api/admin/rewards/challenges/c1 | Đúng như mong đợi | 🟢 PASS |
| 22 | api — URL, phương thức và payload của từng chức năng | getBadges gọi GET /api/admin/rewards/badges | api.getBadges() | fetch GET /api/admin/rewards/badges | Đúng như mong đợi | 🟢 PASS |
| 23 | api — URL, phương thức và payload của từng chức năng | getXpEvents gọi GET /api/admin/rewards/xp-events | api.getXpEvents() | fetch GET /api/admin/rewards/xp-events | Đúng như mong đợi | 🟢 PASS |
| 24 | api — URL, phương thức và payload của từng chức năng | getSystemActivity gọi GET /api/admin/system/activity | api.getSystemActivity() | fetch GET /api/admin/system/activity | Đúng như mong đợi | 🟢 PASS |
| 25 | api — URL, phương thức và payload của từng chức năng | getEngagementAnalytics gọi GET /api/admin/reports/engagement | api.getEngagementAnalytics() | fetch GET /api/admin/reports/engagement | Đúng như mong đợi | 🟢 PASS |
| 26 | api — URL, phương thức và payload của từng chức năng | getUsers / getRecipes / getTransactions chuyển params thành query string | Các object params | Query string đúng thứ tự, giữ tham số rỗng | Đúng như mong đợi | 🟢 PASS |
| 27 | api — URL, phương thức và payload của từng chức năng | các hàm danh sách trả mảng rỗng khi backend không có data | data = null | 7 hàm danh sách trả [] | Đúng như mong đợi | 🟢 PASS |
| 28 | api — URL, phương thức và payload của từng chức năng | updateUserStatus / updateUserRole gửi đúng body | (u1, true, "Spam"); (u1, "Admin") | PUT …/status {isLocked, reason}; …/role {role} | Đúng như mong đợi | 🟢 PASS |
| 29 | api — URL, phương thức và payload của từng chức năng | updateUserSubscription: cấp Pro (mặc định gói tháng 30 ngày) và hủy Pro | 3 lần gọi | {PRO_MONTHLY, 30, Premium}; {PRO_YEARLY, 365}; {isPro false, Free} | Đúng như mong đợi | 🟢 PASS |
| 30 | api — URL, phương thức và payload của từng chức năng | banUser: cấm vĩnh viễn gửi durationDays = null, gỡ cấm gửi isBanned = false | 3 lần gọi | {true, lý do, null}; {…, 7}; {false, "", null} | Đúng như mong đợi | 🟢 PASS |
| 31 | api — URL, phương thức và payload của từng chức năng | moderateAccount gửi nguyên payload kiểm duyệt | payload mẫu | PUT …/moderate với đúng payload | Đúng như mong đợi | 🟢 PASS |
| 32 | api — URL, phương thức và payload của từng chức năng | createRecipe / updateRecipe trả data của món | Backend trả {id, title} | POST /api/admin/recipes trả data; PUT /api/admin/recipes/r9 đúng body | Đúng như mong đợi | 🟢 PASS |
| 33 | api — URL, phương thức và payload của từng chức năng | createChallenge / updateChallenge / grantXp gửi đúng endpoint | 3 lần gọi | POST/PUT …/challenges; grant-xp {userId, xp, lý do mặc định} | Đúng như mong đợi | 🟢 PASS |
| 34 | api — URL, phương thức và payload của từng chức năng | getRevenueReport chỉ thêm query khi có chọn ngày | (), (start), (start, end) | Không query / ?startDate= / ?startDate=&endDate= | Đúng như mong đợi | 🟢 PASS |

#### 3.2.2 `App.jsx` — đăng nhập / đăng xuất, điều hướng, toast

_File: `frontend/admin-web/src/__tests__/App.test.jsx`_

| # | Function / Component | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 35 | App — đăng nhập / đăng xuất | chưa đăng nhập thì chỉ hiện trang đăng nhập, không gọi API thống kê | localStorage trống | Hiện nút "Đăng Nhập Quản Trị", không có menu, không gọi getStats | Đúng như mong đợi | 🟢 PASS |
| 36 | App — đăng nhập / đăng xuất | đăng nhập thành công → vào Bảng điều khiển, chào admin và nạp thống kê | api.login trả admin; bấm Đăng nhập | Toast "Chào mừng Quản trị viên …", tiêu đề Bảng điều khiển, getStats được gọi, hiện "38 đang hoạt động" | Đúng như mong đợi | 🟢 PASS |
| 37 | App — đăng nhập / đăng xuất | đã có phiên trong localStorage → vào thẳng Bảng điều khiển với tên admin | Token + user trong localStorage | Vào thẳng dashboard, sidebar có tên admin, số liệu hiển thị | Đúng như mong đợi | 🟢 PASS |
| 38 | App — đăng nhập / đăng xuất | đăng xuất xóa phiên, quay về trang đăng nhập và báo đã đăng xuất | Đang đăng nhập; bấm Đăng xuất | Về trang đăng nhập, toast "Đã đăng xuất…", token = null | Đúng như mong đợi | 🟢 PASS |
| 39 | App — đăng nhập / đăng xuất | phiên hết hạn (sự kiện 401 từ api) → quay về trang đăng nhập kèm thông báo | Phát sự kiện smartmeal_admin_unauthorized | Về trang đăng nhập + toast "Phiên làm việc đã hết hạn…" | Đúng như mong đợi | 🟢 PASS |
| 40 | App — đăng nhập / đăng xuất | nhập sai mật khẩu chỉ báo lỗi đăng nhập, không báo "Phiên làm việc đã hết hạn" | api.login thật; backend trả 401 "Email hoặc mật khẩu không chính xác." | Chỉ hiện lỗi đăng nhập; KHÔNG có toast "Phiên làm việc đã hết hạn" | Error: expect(element).not.toBeInTheDocument() expected document not to contain element, found <span> Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại. </span> instead at Proxy… | 🔴 FAIL |
| 41 | App — điều hướng & thông báo | menu "Quản Lý Người Dùng" mở trang "Quản Lý Người Dùng & Kiểm Duyệt Tài Khoản" và nạp dữ liệu | Đang đăng nhập; bấm mục menu | Tiêu đề trang đổi đúng và API của màn hình được gọi | Đúng như mong đợi | 🟢 PASS |
| 42 | App — điều hướng & thông báo | menu "Quản Lý Món Ăn" mở trang "Quản Lý Thực Đơn & Món Ăn" và nạp dữ liệu | Đang đăng nhập; bấm mục menu | Tiêu đề trang đổi đúng và API của màn hình được gọi | Đúng như mong đợi | 🟢 PASS |
| 43 | App — điều hướng & thông báo | menu "Hệ Thống Phần Thưởng" mở trang "Quản Lý Hệ Thống Phần Thưởng (Rewards)" và nạp dữ liệu | Đang đăng nhập; bấm mục menu | Tiêu đề trang đổi đúng và API của màn hình được gọi | Đúng như mong đợi | 🟢 PASS |
| 44 | App — điều hướng & thông báo | menu "Giám Sát Hệ Thống" mở trang "Giám Sát Hoạt Động Hệ Thống (System Activity)" và nạp dữ liệu | Đang đăng nhập; bấm mục menu | Tiêu đề trang đổi đúng và API của màn hình được gọi | Đúng như mong đợi | 🟢 PASS |
| 45 | App — điều hướng & thông báo | menu "Báo Cáo Doanh Thu" mở trang "Báo Cáo Doanh Thu Tài Chính (Revenue Report)" và nạp dữ liệu | Đang đăng nhập; bấm mục menu | Tiêu đề trang đổi đúng và API của màn hình được gọi | Đúng như mong đợi | 🟢 PASS |
| 46 | App — điều hướng & thông báo | menu "Phân Tích Tương Tác" mở trang "Phân Tích Mức Độ Tương Tác (Engagement Analytics)" và nạp dữ liệu | Đang đăng nhập; bấm mục menu | Tiêu đề trang đổi đúng và API của màn hình được gọi | Đúng như mong đợi | 🟢 PASS |
| 47 | App — điều hướng & thông báo | menu "Gói Member & Giao Dịch" mở trang "Quản Lý Gói Hội Viên & Giao Dịch" và nạp dữ liệu | Đang đăng nhập; bấm mục menu | Tiêu đề trang đổi đúng và API của màn hình được gọi | Đúng như mong đợi | 🟢 PASS |
| 48 | App — điều hướng & thông báo | nút "Thêm Món Ăn" trên thanh trên mở tab Món ăn với form thêm món | Bấm "Thêm Món Ăn" ở Topbar | Chuyển tab Món ăn, mở form "Thêm Món Ăn Mới…" | Đúng như mong đợi | 🟢 PASS |
| 49 | App — điều hướng & thông báo | nút "Làm mới" nạp lại thống kê | Bấm "Làm mới" | getStats được gọi lần 2 | Đúng như mong đợi | 🟢 PASS |
| 50 | App — điều hướng & thông báo | lỗi nạp thống kê hiện toast lỗi | getStats reject "Mất kết nối" | Toast lỗi (class toast-error) "Lỗi nạp thống kê: Mất kết nối" | Đúng như mong đợi | 🟢 PASS |
| 51 | App — điều hướng & thông báo | toast tự ẩn sau 4 giây | Fake timers, có toast | Sau 4,1 s toast biến mất | Đúng như mong đợi | 🟢 PASS |

#### 3.2.3 `LoginView.jsx` — trang đăng nhập

_File: `frontend/admin-web/src/__tests__/components/LoginView.test.jsx`_

| # | Function / Component | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 52 | LoginView | đăng nhập bằng email/mật khẩu đã nhập và báo user cho App | Nhập boss@smartmeal.vn / S3cret-Pass! | api.login(email, mật khẩu); onLoginSuccess(user) | Đúng như mong đợi | 🟢 PASS |
| 53 | LoginView | khóa nút và hiện "Đang xác thực..." trong lúc chờ backend | api.login treo (Promise chưa resolve) | Nút disabled + "Đang xác thực..."; xong thì mở lại | Đúng như mong đợi | 🟢 PASS |
| 54 | LoginView | hiện thông báo lỗi của backend và không chuyển trang khi sai mật khẩu | api.login reject "Email hoặc mật khẩu không chính xác." | Hiện lỗi; không gọi onLoginSuccess; nút bật lại | Đúng như mong đợi | 🟢 PASS |
| 55 | LoginView | dùng thông báo mặc định khi lỗi không có nội dung | api.login reject Error("") | "Đăng nhập không thành công." | Đúng như mong đợi | 🟢 PASS |
| 56 | LoginView | báo thiếu thông tin và không gọi API khi để trống email hoặc mật khẩu | Xóa trống 2 ô, submit form | "Vui lòng nhập đầy đủ Email và Mật khẩu."; không gọi API | Đúng như mong đợi | 🟢 PASS |
| 57 | LoginView | nút "Điền Tài Khoản Admin Mặc Định" điền lại form và xóa lỗi cũ | Đang có lỗi; bấm nút điền mặc định | Email = admin@smartmeal.com, mật khẩu được điền, lỗi biến mất | Đúng như mong đợi | 🟢 PASS |
| 58 | LoginView | [Bảo mật] trang đăng nhập không điền sẵn / không in ra mật khẩu của tài khoản admin | Render trang đăng nhập | Ô mật khẩu trống; trang không chứa "Admin@123456" | Error: expect(element).toHaveValue() Expected the element to have value:  Received:  Admin@123456 at Proxy.__VITEST_EXTEND_ASSERTION__ (file:///D:/Sem8/PRM393/SmartMeal/frontend… | 🔴 FAIL |

#### 3.2.4 `Sidebar.jsx`, `Topbar.jsx` — khung giao diện

_File: `frontend/admin-web/src/__tests__/components/ShellComponents.test.jsx`_

| # | Function / Component | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 59 | Sidebar | hiển thị đủ 8 mục menu và đánh dấu mục đang mở | activeTab = rewards | 8 mục đúng thứ tự; mục Phần thưởng có class active | Đúng như mong đợi | 🟢 PASS |
| 60 | Sidebar | bấm mục dashboard gọi setActiveTab với đúng id | Bấm mục menu | setActiveTab(id tương ứng) | Đúng như mong đợi | 🟢 PASS |
| 61 | Sidebar | bấm mục users gọi setActiveTab với đúng id | Bấm mục menu | setActiveTab(id tương ứng) | Đúng như mong đợi | 🟢 PASS |
| 62 | Sidebar | bấm mục recipes gọi setActiveTab với đúng id | Bấm mục menu | setActiveTab(id tương ứng) | Đúng như mong đợi | 🟢 PASS |
| 63 | Sidebar | bấm mục rewards gọi setActiveTab với đúng id | Bấm mục menu | setActiveTab(id tương ứng) | Đúng như mong đợi | 🟢 PASS |
| 64 | Sidebar | bấm mục system gọi setActiveTab với đúng id | Bấm mục menu | setActiveTab(id tương ứng) | Đúng như mong đợi | 🟢 PASS |
| 65 | Sidebar | bấm mục revenue gọi setActiveTab với đúng id | Bấm mục menu | setActiveTab(id tương ứng) | Đúng như mong đợi | 🟢 PASS |
| 66 | Sidebar | bấm mục engagement gọi setActiveTab với đúng id | Bấm mục menu | setActiveTab(id tương ứng) | Đúng như mong đợi | 🟢 PASS |
| 67 | Sidebar | bấm mục subscriptions gọi setActiveTab với đúng id | Bấm mục menu | setActiveTab(id tương ứng) | Đúng như mong đợi | 🟢 PASS |
| 68 | Sidebar | hiển thị chữ cái đầu, tên và vai trò của admin; nút đăng xuất gọi onLogout | user = Bảo Nguyễn / Admin | Avatar "B", tên; bấm đăng xuất gọi onLogout | Đúng như mong đợi | 🟢 PASS |
| 69 | Sidebar | dùng tên/vai trò mặc định khi thiếu thông tin user | user = {} | Avatar "A", "Administrator", "Admin" | Đúng như mong đợi | 🟢 PASS |
| 70 | Topbar | hiển thị tiêu đề trang và gọi onRefresh khi bấm "Làm mới" | title + onRefresh | Heading đúng; onRefresh gọi 1 lần | Đúng như mong đợi | 🟢 PASS |
| 71 | Topbar | khóa nút "Làm mới" và quay icon khi đang tải | isRefreshing = true | Nút disabled; icon có class animate-spin | Đúng như mong đợi | 🟢 PASS |
| 72 | Topbar | chỉ hiện nút "Thêm Món Ăn" khi có handler | Có / không có onOpenAddRecipe | Có handler: hiện + gọi được; không: ẩn | Đúng như mong đợi | 🟢 PASS |

#### 3.2.5 `DashboardView.jsx` — Bảng điều khiển

_File: `frontend/admin-web/src/__tests__/components/DashboardView.test.jsx`_

| # | Function / Component | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 73 | DashboardView | hiện trạng thái đang tải khi chưa có thống kê | stats = null | "Đang tải dữ liệu tổng quan..." | Đúng như mong đợi | 🟢 PASS |
| 74 | DashboardView | 4 thẻ số liệu: người dùng (hoạt động / bị khóa), Pro + tỉ lệ chuyển đổi, số món, doanh thu VND | fixtures.stats (40 user, 2 khóa, 10 Pro, 1.250.000đ) | 40 / 38 đang hoạt động / 2 bị khóa; tỉ lệ 25%; "1.250.000 ₫", tháng này 158.000 ₫ | Đúng như mong đợi | 🟢 PASS |
| 75 | DashboardView | không hiện "bị khóa" khi không có tài khoản bị khóa và tỉ lệ 0% khi chưa có người dùng | totalUsers = 0, lockedUsers = 0 | Không có chữ "bị khóa"; "Tỉ lệ chuyển đổi: 0%" (không NaN) | Đúng như mong đợi | 🟢 PASS |
| 76 | DashboardView | phân bổ thực đơn theo bữa: số món và phần trăm trên tổng số món | recipesByMealType 10/20/8/2 trên 40 món | "10 món (25%)", "20 món (50%)", "2 món (5%)", nhãn tiếng Việt | Đúng như mong đợi | 🟢 PASS |
| 77 | DashboardView | gói thành viên: tên, giá / chu kỳ, nhãn phổ biến và số người dùng | 2 gói (Tháng, Năm phổ biến) | "79.000 ₫ / 30 ngày", nhãn "Phổ biến", "3 người" | Đúng như mong đợi | 🟢 PASS |
| 78 | DashboardView | giao dịch gần đây hiển thị đúng nhãn trạng thái Paid / Pending / Failed | 3 giao dịch Paid/Pending/Failed | Đã thanh toán / Đang chờ / Thất bại; số tiền VND | Đúng như mong đợi | 🟢 PASS |
| 79 | DashboardView | người dùng mới: vai trò, gói và tên mặc định khi thiếu họ tên | 2 user (Pro; Admin không tên) | "Pro VIP"; "Người dùng"; badge Admin badge-info; "Free" | Đúng như mong đợi | 🟢 PASS |
| 80 | DashboardView | hiện thông báo trống khi chưa có giao dịch / người dùng | recentTransactions = [], recentUsers = [] | "Chưa có giao dịch nào", "Chưa có người dùng" | Đúng như mong đợi | 🟢 PASS |
| 81 | DashboardView | các nút "Xem tất cả / Chi tiết / Quản lý" điều hướng sang đúng tab | Bấm 4 nút | onNavigate: recipes, subscriptions, subscriptions, users | Đúng như mong đợi | 🟢 PASS |

#### 3.2.6 `UsersView.jsx` — Quản lý người dùng, UC1 Ban user, UC2 Moderate account

_File: `frontend/admin-web/src/__tests__/components/UsersView.test.jsx`_

| # | Function / Component | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 82 | UsersView — danh sách & bộ lọc | nạp trang 1 (15 người/trang, không lọc) và hiển thị vai trò, gói Pro, trạng thái | fixtures.users (Pro, Admin, bị khóa) | getUsers({page 1, pageSize 15, …""}); Pro VIP, Hoạt động, "★ Quản trị (Admin)", "Đang bị khóa" | Đúng như mong đợi | 🟢 PASS |
| 83 | UsersView — danh sách & bộ lọc | đang tải → hiện thông báo tải; không có kết quả → hiện thông báo trống | getUsers [] | "Đang tải…" rồi "Không tìm thấy người dùng nào…" | Đúng như mong đợi | 🟢 PASS |
| 84 | UsersView — danh sách & bộ lọc | đổi bộ lọc vai trò / gói / trạng thái và ô tìm kiếm thì nạp lại với tham số tương ứng | Admin, expired, locked, "bot" | getUsers cuối = {search bot, role Admin, status locked, subscription expired} | Đúng như mong đợi | 🟢 PASS |
| 85 | UsersView — danh sách & bộ lọc | lỗi tải danh sách gọi onNotify kiểu error | getUsers reject "500" | onNotify("Lỗi tải danh sách người dùng: 500", error) | Đúng như mong đợi | 🟢 PASS |
| 86 | UsersView — danh sách & bộ lọc | có hơn 15 người dùng thì admin chuyển được sang trang 2 | Trang 1 trả đủ 15 người | Có nút sang trang 2 và gọi getUsers({page: 2}) | AssertionError: expected null not to be null at D:/Sem8/PRM393/SmartMeal/frontend/admin-web/src/__tests__/components/UsersView.test.jsx:77:22 at async file:///D:/Sem8/PRM393/Sma… | 🔴 FAIL |
| 87 | UsersView — xem chi tiết & phân quyền | xem chi tiết: nạp hồ sơ đầy đủ, hiển thị sức khỏe và số liệu sử dụng | Bấm xem chi tiết u1 | getUserDetail(u1); "Nữ / 28 tuổi", "160 cm / 58 kg", "1650 kcal", 12 nhật ký; đóng được | Đúng như mong đợi | 🟢 PASS |
| 88 | UsersView — xem chi tiết & phân quyền | người dùng chưa khai báo sức khỏe → hiện ghi chú chưa hoàn thiện hồ sơ | healthProfile = null | "Người dùng chưa hoàn thiện hồ sơ sức khỏe." | Đúng như mong đợi | 🟢 PASS |
| 89 | UsersView — xem chi tiết & phân quyền | đổi vai trò User ↔ Admin sau khi xác nhận, rồi nạp lại danh sách | Bấm badge vai trò của u1 (User) và u2 (Admin) | updateUserRole(u1, Admin), (u2, User); toast; nạp lại | Đúng như mong đợi | 🟢 PASS |
| 90 | UsersView — xem chi tiết & phân quyền | hủy hộp thoại xác nhận thì không đổi vai trò | confirm = false | Không gọi updateUserRole | Đúng như mong đợi | 🟢 PASS |
| 91 | UsersView — xem chi tiết & phân quyền | xóa người dùng sau khi xác nhận; lỗi thì báo thất bại | Xóa u3; rồi xóa u2 bị reject (tự xóa) | deleteUser(u3) + toast; lỗi → onNotify("Xóa người dùng thất bại: …") | Đúng như mong đợi | 🟢 PASS |
| 92 | UsersView — cấp / hủy gói Pro | chọn gói Năm tự đặt 365 ngày và gửi cấp Pro | Cấp Pro cho u2, chọn PRO_YEARLY | Số ngày tự = 365; updateUserSubscription(u2, true, PRO_YEARLY, 365); đóng hộp thoại | Đúng như mong đợi | 🟢 PASS |
| 93 | UsersView — cấp / hủy gói Pro | nhập số ngày tùy chỉnh được gửi dưới dạng số | Nhập 45 ngày | updateUserSubscription(u2, true, PRO_MONTHLY, 45) | Đúng như mong đợi | 🟢 PASS |
| 94 | UsersView — cấp / hủy gói Pro | người dùng đang Pro: nút "Hủy Gói Pro Ngay Lập Tức" hạ về gói miễn phí | u1 đang Pro | updateUserSubscription(u1, false); toast | Đúng như mong đợi | 🟢 PASS |
| 95 | UsersView — cấp / hủy gói Pro | cấp Pro lỗi thì báo lỗi và giữ hộp thoại | API reject | onNotify lỗi; hộp thoại vẫn mở | Đúng như mong đợi | 🟢 PASS |
| 96 | UsersView — UC1 Ban user | cấm 7 ngày với lý do tùy chỉnh | Ban u1, 7 ngày, "Spam bình luận" | banUser(u1, true, "Spam bình luận", 7); toast | Đúng như mong đợi | 🟢 PASS |
| 97 | UsersView — UC1 Ban user | cấm vĩnh viễn gửi durationDays = null; mặc định 30 ngày với lý do vi phạm cộng đồng | Mở ban, chọn "Vĩnh Viễn" | Mặc định 30 + lý do mẫu; banUser(u1, true, lý do, null) | Đúng như mong đợi | 🟢 PASS |
| 98 | UsersView — UC1 Ban user | tài khoản đang bị cấm: hộp thoại đề nghị gỡ cấm và gửi isBanned = false | u3 đang bị khóa | Hiện "Tài khoản này hiện đang bị cấm!"; banUser(u3, false, …); toast gỡ cấm | Đúng như mong đợi | 🟢 PASS |
| 99 | UsersView — UC1 Ban user | lỗi khi cấm thì báo thất bại | banUser reject (tự cấm) | onNotify("Thao tác cấm người dùng thất bại: …", error) | Đúng như mong đợi | 🟢 PASS |
| 100 | UsersView — UC2 Moderate account | mở form với dữ liệu hiện tại, gửi tên đã trim, vai trò và mật khẩu mới | Tên " Lan Anh Nguyễn ", Admin, mật khẩu " NewPass@2026 " | moderateAccount(u1, {fullName đã trim, verified, clearLockout, Admin, resetPassword đã trim}) | Đúng như mong đợi | 🟢 PASS |
| 101 | UsersView — UC2 Moderate account | để trống mật khẩu → resetPassword = null; xóa trống tên → giữ tên cũ; bỏ chọn checkbox | Tên trống, bỏ 2 checkbox | moderateAccount(u2, {fullName "Minh Trần", false, false, Admin, null}) | Đúng như mong đợi | 🟢 PASS |
| 102 | UsersView — UC2 Moderate account | lỗi kiểm duyệt thì báo thất bại, đóng bằng nút Hủy | moderateAccount reject | onNotify lỗi; bấm Hủy đóng hộp thoại | Đúng như mong đợi | 🟢 PASS |

#### 3.2.7 `RecipesView.jsx` — Quản lý món ăn

_File: `frontend/admin-web/src/__tests__/components/RecipesView.test.jsx`_

| # | Function / Component | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 103 | RecipesView — lưới món ăn & bộ lọc | nạp trang 1 (16 món/trang) và hiển thị kcal làm tròn, thời gian, protein, độ khó, nhãn Pro, tối đa 3 tag | fixtures.recipes (Salad Pro 349,6 kcal 4 tag; Bò kho Hard) | getRecipes({page 1, pageSize 16…}); "350 kcal", "15 phút", "32g P", "Dễ", Pro; 3 tag; Bò kho "Khó" badge-danger, mô tả mặc định | Đúng như mong đợi | 🟢 PASS |
| 104 | RecipesView — lưới món ăn & bộ lọc | ảnh lỗi được thay bằng ảnh mặc định | Phát sự kiện error trên ảnh | src chuyển sang ảnh Unsplash mặc định | Đúng như mong đợi | 🟢 PASS |
| 105 | RecipesView — lưới món ăn & bộ lọc | đổi bộ lọc bữa ăn, độ khó và ô tìm kiếm thì nạp lại | Chọn Dinner, Hard, gõ "bò" | getRecipes cuối = {search "bò", mealType Dinner, difficulty Hard} | Đúng như mong đợi | 🟢 PASS |
| 106 | RecipesView — lưới món ăn & bộ lọc | không có món → hiện thông báo trống; lỗi tải → onNotify error | getRecipes [] rồi reject "timeout" | "Không tìm thấy món ăn nào"; onNotify("Lỗi tải danh sách món ăn: timeout", error) | Đúng như mong đợi | 🟢 PASS |
| 107 | RecipesView — lưới món ăn & bộ lọc | có hơn 16 món thì admin chuyển được sang trang 2 | Trang 1 trả đủ 16 món | Có nút sang trang 2 và gọi getRecipes({page: 2}) | AssertionError: expected null not to be null at D:/Sem8/PRM393/SmartMeal/frontend/admin-web/src/__tests__/components/RecipesView.test.jsx:94:22 at async file:///D:/Sem8/PRM393/S… | 🔴 FAIL |
| 108 | RecipesView — thêm món | form mặc định: bữa Trưa, tag Eat Clean, 1 nguyên liệu ức gà | Bấm "Thêm Món Ăn Mới" | Chip Bữa Trưa + Eat Clean được chọn; có "Ức gà phi lê" | Đúng như mong đợi | 🟢 PASS |
| 109 | RecipesView — thêm món | gửi payload đầy đủ: mealTypes nối bằng dấu phẩy, tag đã chọn, nguyên liệu đã nhập | Tên, +Bữa Tối, tag Vegan (bỏ Eat Clean), Medium, Pro, +nguyên liệu "Đậu hũ" | createRecipe: mealTypes "Lunch,Dinner", tagCodes [vegan], isPremium, 2 nguyên liệu; toast thành công, đóng form, nạp lại | Đúng như mong đợi | 🟢 PASS |
| 110 | RecipesView — thêm món | tên món chỉ có khoảng trắng → báo lỗi, không gọi API | Tên = " " | onNotify("Vui lòng nhập tên món ăn.", error); không gọi createRecipe | Đúng như mong đợi | 🟢 PASS |
| 111 | RecipesView — thêm món | không bỏ chọn được bữa ăn cuối cùng; không xóa được nguyên liệu cuối cùng | Bỏ chọn Bữa Trưa; xóa nguyên liệu | Bữa Trưa vẫn chọn; nút xóa nguyên liệu cuối bị disable; thêm rồi xóa được | Đúng như mong đợi | 🟢 PASS |
| 112 | RecipesView — thêm món | xem trước ảnh khi nhập link ảnh | Nhập URL ảnh | Ảnh xem trước có src = URL | Đúng như mong đợi | 🟢 PASS |
| 113 | RecipesView — thêm món | lỗi khi lưu (vd. trùng tên) → báo lỗi, giữ form mở | createRecipe reject "Tên món ăn này đã tồn tại…" | Toast lỗi; form vẫn mở; nút lưu bật lại | Đúng như mong đợi | 🟢 PASS |
| 114 | RecipesView — thêm món | initialOpenAdd mở sẵn form và báo App reset cờ | initialOpenAdd = true | Form mở sẵn; onResetAddTrigger gọi 1 lần | Đúng như mong đợi | 🟢 PASS |
| 115 | RecipesView — thêm món | đóng form bằng nút Hủy hoặc bấm ra ngoài | Bấm Hủy; bấm overlay | Form đóng cả hai cách | Đúng như mong đợi | 🟢 PASS |
| 116 | RecipesView — thêm món | nhãn tag "quick" khớp định nghĩa của backend (Nhanh Gọn < 15 phút) | Mở form thêm món | Chip tag quick ghi mốc 15 phút (backend: "Nhanh Gọn (< 15 phút)") | AssertionError: expected '+ Nhanh Dưới 20p' to match /15/ at D:/Sem8/PRM393/SmartMeal/frontend/admin-web/src/__tests__/components/RecipesView.test.jsx:210:60 at async file:///D:… | 🔴 FAIL |
| 117 | RecipesView — sửa & xóa món | sửa: nạp chi tiết, tách mealTypes "Breakfast, Lunch" và gửi updateRecipe | Bấm Sửa món r1; đổi tên | getRecipeDetail(r1); chip Sáng + Trưa; updateRecipe(r1, {mealTypes "Breakfast,Lunch", tag eatClean, isPremium}) | Đúng như mong đợi | 🟢 PASS |
| 118 | RecipesView — sửa & xóa món | sửa món chưa có nguyên liệu → dùng nguyên liệu mặc định; thiếu mealTypes → bữa Trưa | detail.mealTypes = "", ingredients = [] | Chip Bữa Trưa; nguyên liệu mặc định "Ức gà phi lê" | Đúng như mong đợi | 🟢 PASS |
| 119 | RecipesView — sửa & xóa món | lỗi tải chi tiết → báo lỗi, không mở form | getRecipeDetail reject | onNotify lỗi; không mở form | Đúng như mong đợi | 🟢 PASS |
| 120 | RecipesView — sửa & xóa món | xóa sau khi xác nhận thì gọi deleteRecipe và nạp lại; hủy thì không xóa | confirm false rồi true | Lần 1 không gọi; lần 2 deleteRecipe(r2) + toast thành công | Đúng như mong đợi | 🟢 PASS |
| 121 | RecipesView — sửa & xóa món | xóa lỗi (vd. món đã có trong nhật ký người dùng) → báo thất bại | deleteRecipe reject "Đã xảy ra lỗi hệ thống." | onNotify("Xóa món ăn thất bại: …", error) | Đúng như mong đợi | 🟢 PASS |

#### 3.2.8 `RewardsView.jsx` — UC3 Hệ thống phần thưởng

_File: `frontend/admin-web/src/__tests__/components/RewardsView.test.jsx`_

| # | Function / Component | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 122 | RewardsView — thử thách | nạp song song thử thách, huy hiệu, lịch sử XP, người dùng và đếm số trên tab | fixtures (2 thử thách, 2 huy hiệu) | Gọi 4 API (getUsers pageSize 50); tab "(2)" | Đúng như mong đợi | 🟢 PASS |
| 123 | RewardsView — thử thách | bảng thử thách: danh mục, thời hạn, mục tiêu, thưởng, tham gia và trạng thái | 2 thử thách (mở / đóng) | DrinkWater, 7 ngày, 2000 lần/ngày, +150 XP, Water Champion, 12 người, Đang mở; dòng 2 Đã đóng, "Không có mô tả" | Đúng như mong đợi | 🟢 PASS |
| 124 | RewardsView — thử thách | chưa có thử thách → hiện lời mời tạo thử thách đầu tiên | getChallenges [] | "Chưa có thử thách nào. Hãy tạo thử thách đầu tiên!" | Đúng như mong đợi | 🟢 PASS |
| 125 | RewardsView — thử thách | tạo thử thách mới với dữ liệu nhập và nạp lại danh sách | "10.000 bước", Exercise, 14 ngày, 10.000/ngày | createChallenge đúng payload; toast; nạp lại; đóng form | Đúng như mong đợi | 🟢 PASS |
| 126 | RewardsView — thử thách | tiêu đề trống → báo lỗi, không gọi API | Tiêu đề = " " | onNotify("Vui lòng nhập tiêu đề thử thách.", error) | Đúng như mong đợi | 🟢 PASS |
| 127 | RewardsView — thử thách | sửa thử thách: điền sẵn dữ liệu cũ, bỏ chọn "mở" và gửi updateChallenge | Sửa c1, bỏ chọn "mở" | Form điền sẵn; updateChallenge(c1, {…, isActive false}); toast | Đúng như mong đợi | 🟢 PASS |
| 128 | RewardsView — thử thách | lưu thất bại → báo lỗi | updateChallenge reject | onNotify("Lưu thử thách thất bại: …", error) | Đúng như mong đợi | 🟢 PASS |
| 129 | RewardsView — thử thách | xóa thử thách sau khi xác nhận thì bỏ khỏi bảng | confirm = true; xóa c2 | deleteChallenge(c2); dòng biến mất; toast | Đúng như mong đợi | 🟢 PASS |
| 130 | RewardsView — thử thách | lỗi tải dữ liệu → onNotify error | getBadges reject "503" | onNotify("Lỗi tải dữ liệu phần thưởng: 503", "error") | Đúng như mong đợi | 🟢 PASS |
| 131 | RewardsView — huy hiệu & tặng XP | tab Huy hiệu hiển thị tên, mô tả, danh mục (mặc định "Thành Tích") và số người mở khóa | Bấm tab Huy hiệu | "Khởi đầu", "25 người dùng", danh mục mặc định "Thành Tích"; ẩn nút thêm thử thách | Đúng như mong đợi | 🟢 PASS |
| 132 | RewardsView — huy hiệu & tặng XP | tab XP: chọn sẵn người dùng đầu tiên, tặng XP và nạp lại lịch sử | Chọn u2, 250 XP | Mặc định chọn u1; grantXp(u2, 250, lý do mặc định); toast; "2 sự kiện" | Đúng như mong đợi | 🟢 PASS |
| 133 | RewardsView — huy hiệu & tặng XP | không có người dùng → báo phải chọn người nhận | getUsers []; submit form | onNotify("Vui lòng chọn người dùng nhận XP.", error); không gọi grantXp | Đúng như mong đợi | 🟢 PASS |
| 134 | RewardsView — huy hiệu & tặng XP | tặng XP lỗi → báo thất bại; lịch sử trống → hiện thông báo | getXpEvents []; grantXp reject | "Chưa có lịch sử nhận XP nào."; toast lỗi; nút bật lại | Đúng như mong đợi | 🟢 PASS |
| 135 | RewardsView — huy hiệu & tặng XP | danh sách thử thách mẫu không bị ảnh hưởng khi chuyển tab qua lại | Chuyển tab Huy hiệu → Thử thách | Bảng vẫn đủ 2 thử thách | Đúng như mong đợi | 🟢 PASS |

#### 3.2.9 `SubscriptionsView.jsx` — Gói hội viên & giao dịch

_File: `frontend/admin-web/src/__tests__/components/SubscriptionsView.test.jsx`_

| # | Function / Component | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 136 | SubscriptionsView — gói hội viên | hiển thị giá, chu kỳ, nhãn phổ biến, số thành viên, doanh thu và đặc quyền | fixtures.plans | Tháng: "30 ngày (Hàng tháng)", 79.000 ₫, 7 thành viên, đặc quyền; Năm: "Hàng năm" + "Gói Phổ Biến Nhất" | Đúng như mong đợi | 🟢 PASS |
| 137 | SubscriptionsView — giao dịch | nạp trang 1 (20 giao dịch/trang) và hiển thị mã đơn, cổng, thời gian khớp, trạng thái | fixtures.transactions | getTransactions({page 1, pageSize 20}); #123456 Đã thanh toán + "Khớp:" + "Đã hoàn tất"; Pending SEPAY; #777 Thất bại | Đúng như mong đợi | 🟢 PASS |
| 138 | SubscriptionsView — giao dịch | chỉ giao dịch chưa thanh toán mới có nút "Duyệt Đơn" | 1 Paid, 1 Pending, 1 Failed | 2 nút "Duyệt Đơn"; dòng Paid không có | Đúng như mong đợi | 🟢 PASS |
| 139 | SubscriptionsView — giao dịch | duyệt đơn sau khi xác nhận → kích hoạt Pro và nạp lại | Duyệt t2 (Pending, không có orderCode) | Confirm nêu sessionId; approveTransaction(t2); toast; nạp lại | Đúng như mong đợi | 🟢 PASS |
| 140 | SubscriptionsView — giao dịch | đang duyệt thì nút bị khóa và đổi chữ "Đang duyệt..." | approveTransaction treo | Nút disabled "Đang duyệt..." tới khi xong | Đúng như mong đợi | 🟢 PASS |
| 141 | SubscriptionsView — giao dịch | hủy xác nhận thì không duyệt; duyệt lỗi thì báo thất bại | confirm false; rồi API reject | Không gọi; rồi onNotify lỗi | Đúng như mong đợi | 🟢 PASS |
| 142 | SubscriptionsView — giao dịch | lọc theo trạng thái và tìm kiếm thì nạp lại | Chọn Pending, gõ "minh" | getTransactions({status Pending, search "minh"}) | Đúng như mong đợi | 🟢 PASS |
| 143 | SubscriptionsView — giao dịch | không có giao dịch → thông báo trống; lỗi tải → onNotify error | getTransactions []; getPlans reject | "Không tìm thấy giao dịch nào."; onNotify lỗi | Đúng như mong đợi | 🟢 PASS |
| 144 | SubscriptionsView — giao dịch | có hơn 20 giao dịch thì admin chuyển được sang trang 2 | Trang 1 trả đủ 20 giao dịch | Có nút sang trang 2 và gọi getTransactions({page: 2}) | AssertionError: expected null not to be null at D:/Sem8/PRM393/SmartMeal/frontend/admin-web/src/__tests__/components/SubscriptionsView.test.jsx:129:22 at async file:///D:/Sem8/P… | 🔴 FAIL |

#### 3.2.10 `SystemActivityView.jsx` (UC4), `RevenueReportView.jsx` (UC5), `EngagementAnalyticsView.jsx` (UC6)

_File: `frontend/admin-web/src/__tests__/components/ReportViews.test.jsx`_

| # | Function / Component | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 145 | SystemActivityView | hiển thị trạng thái DB, uptime, số yêu cầu AI hôm nay và số cảnh báo an ninh | fixtures.activity | Healthy; "31.5 giờ"; 17; 2 cảnh báo | Đúng như mong đợi | 🟢 PASS |
| 146 | SystemActivityView | nhật ký AI, bữa ăn (kcal làm tròn) và sự kiện an ninh phân loại khóa / dò mật khẩu | 1 log AI, 1 bữa 512,7 kcal, 2 sự kiện | "snap"; "513 kcal"; dòng 1 "Tài khoản bị khóa", dòng 2 "Cảnh báo brute-force" | Đúng như mong đợi | 🟢 PASS |
| 147 | SystemActivityView | không có dữ liệu → các bảng hiện thông báo trống, hệ thống an toàn | Các danh sách rỗng | 3 thông báo trống; "Hệ thống an toàn"; 0 cảnh báo | Đúng như mong đợi | 🟢 PASS |
| 148 | SystemActivityView | nút "Làm mới dữ liệu" gọi lại API | Bấm "Làm mới dữ liệu" | getSystemActivity gọi lần 2 | Đúng như mong đợi | 🟢 PASS |
| 149 | SystemActivityView | tự làm mới mỗi 30 giây và dừng khi rời màn hình | Fake timers +30 s; unmount; +60 s | Gọi lần 2 sau 30 s; không gọi thêm sau unmount | Đúng như mong đợi | 🟢 PASS |
| 150 | SystemActivityView | lỗi tải → onNotify error | API reject | onNotify("Lỗi tải …: <lỗi>", "error") | Đúng như mong đợi | 🟢 PASS |
| 151 | RevenueReportView | hiển thị tổng doanh thu, tháng/năm, ARPPU và tỷ lệ thanh toán thành công | fixtures.revenue | 1.250.000 ₫; 158.000 ₫; năm 1.250.000 ₫; ARPPU 312.500 ₫; 75%; "6 thành công / 8 tổng đơn"; gọi getRevenueReport("", "") | Đúng như mong đợi | 🟢 PASS |
| 152 | RevenueReportView | biểu đồ theo ngày: thanh dài nhất 100%, ngày 0đ vẫn hiện tối thiểu 5% | 3 mốc 0 / 79.000 / 158.000 | Độ rộng 5% / 50% / 100% | Đúng như mong đợi | 🟢 PASS |
| 153 | RevenueReportView | cơ cấu theo cổng thanh toán và theo gói | revenueByMethod, revenueByPlan | PAYOS 778.000 ₫; có "Gói Năm (Pro Yearly)" | Đúng như mong đợi | 🟢 PASS |
| 154 | RevenueReportView | chưa có giao dịch → thông báo trống ở biểu đồ và hai bảng cơ cấu | Các danh sách rỗng | 3 thông báo trống | Đúng như mong đợi | 🟢 PASS |
| 155 | RevenueReportView | chọn khoảng ngày rồi "Lọc Báo Cáo" gửi startDate / endDate | Chọn 01/10–15/10/2026, bấm Lọc | getRevenueReport("2026-10-01", "2026-10-15") | Đúng như mong đợi | 🟢 PASS |
| 156 | RevenueReportView | "Đặt lại" xóa ngày đã chọn và nạp lại báo cáo KHÔNG lọc | Đã lọc 01–15/10; bấm "Đặt lại" | Ô ngày trống và lần gọi cuối getRevenueReport("", "") | AssertionError: expected last "vi.fn()" call to have been called with [ '', '' ] at D:/Sem8/PRM393/SmartMeal/frontend/admin-web/src/__tests__/components/ReportViews.test.jsx:156… | 🔴 FAIL |
| 157 | RevenueReportView | xuất CSV: tạo link tải có tên file theo ngày, nội dung đủ các mốc và báo thành công | Bấm "Xuất Báo Cáo CSV" | Link download SmartMeal_BaoCaoDoanhThu_<ngày>.csv; có header + "22/10",158000,2; toast thành công; link được gỡ khỏi DOM | Đúng như mong đợi | 🟢 PASS |
| 158 | RevenueReportView | xuất CSV khi chưa có báo cáo thì không làm gì; lỗi tải → onNotify error | getRevenueReport reject; bấm xuất CSV | Báo lỗi tải; không tạo link | Đúng như mong đợi | 🟢 PASS |
| 159 | EngagementAnalyticsView | hiển thị DAU / WAU / MAU, tỷ lệ hoàn thành thử thách và các tổng hoạt động | fixtures.engagement | 12 / 30 / 41; 33.3%; tổng nhật ký, bước chân; "Lv. 3.4" | Đúng như mong đợi | 🟢 PASS |
| 160 | EngagementAnalyticsView | bảng xếp hạng: thứ hạng, tên (mặc định "Người dùng"), số bữa, cấp pet, XP và ngày hoạt động | 2 người dùng top | Hạng 1, 80 bữa, "🐾 Lv. 6", "+2,600 XP"; dòng 2 "Người dùng", ngày "—" | Đúng như mong đợi | 🟢 PASS |
| 161 | EngagementAnalyticsView | chưa có dữ liệu → giá trị 0 / Lv. 1 và thông báo bảng trống | API trả {} | DAU 0; "Lv. 1"; "Chưa có dữ liệu người dùng tích cực." | Đúng như mong đợi | 🟢 PASS |
| 162 | EngagementAnalyticsView | lỗi tải → onNotify error | API reject | onNotify("Lỗi tải …: <lỗi>", "error") | Đúng như mong đợi | 🟢 PASS |



### 3.3 Admin Web — live test với backend thật (`frontend/admin-web/src/__tests__/live/adminApi.live.test.js`, 20 test case)

Chạy `services/api.js` thật (không mock) tới backend Docker ở chế độ live-test (tắt rate limit / SMTP, không bắt xác minh email); đăng nhập bằng đúng tài khoản mà trang đăng nhập điền sẵn; dữ liệu tạo ra (người dùng, món, thử thách) được dọn sau khi chạy.

| # | Function | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 1 | `api.login` | đăng nhập bằng tài khoản admin lưu token + hồ sơ quyền Admin | admin@smartmeal.com / Admin@123456 (form mặc định) | Có token, role Admin, lưu vào localStorage | Đúng như mong đợi | 🟢 PASS |
| 2 | `api.login` | sai mật khẩu → lỗi tiếng Việt từ backend | Mật khẩu sai | Ném lỗi "Email hoặc mật khẩu không chính xác." | Đúng như mong đợi | 🟢 PASS |
| 3 | `api.login` | tài khoản người dùng thường bị từ chối ở cổng Admin | Tài khoản app vừa đăng ký | Ném lỗi "Tài khoản của bạn không có quyền Quản trị viên (Admin)." | Đúng như mong đợi | 🟢 PASS |
| 4 | `request() / api.getStats` | token không hợp lệ → 401, api.js xóa phiên và phát sự kiện hết phiên | Token giả | Ném lỗi; phát smartmeal_admin_unauthorized 1 lần; xóa token | Đúng như mong đợi | 🟢 PASS |
| 5 | `api.getStats` | thống kê tổng quan nhất quán (hoạt động + bị khóa = tổng; đủ 4 bữa; 2 gói) | DB dev hiện tại | active + locked = total; pro + free = total; 4 bữa; 2 gói; có món | Đúng như mong đợi | 🟢 PASS |
| 6 | `api.getUsers / getUserDetail` | tìm người dùng vừa đăng ký trên app và xem chi tiết | Đăng ký user qua /auth/register rồi tìm theo email | Tìm thấy đúng 1; chi tiết đúng email, chưa có hồ sơ sức khỏe, 0 nhật ký | Đúng như mong đợi | 🟢 PASS |
| 7 | `api.banUser` | UC1: cấm 7 ngày chặn đăng nhập app (423), gỡ cấm thì đăng nhập lại được | Cấm 7 ngày → gỡ cấm | Login app 423; lọc locked thấy user; sau gỡ login 200 | Đúng như mong đợi | 🟢 PASS |
| 8 | `api.moderateAccount` | UC2: kiểm duyệt đổi tên + đặt lại mật khẩu, người dùng đăng nhập bằng mật khẩu mới | Đổi tên + resetPassword | Chi tiết có tên mới; login bằng mật khẩu mới 200 | Đúng như mong đợi | 🟢 PASS |
| 9 | `api.updateUserSubscription` | cấp gói Pro năm rồi hủy — app thấy đúng trạng thái gói | PRO_YEARLY 365 ngày → hủy | App: isPro + PRO_YEARLY; sau hủy: Free | Đúng như mong đợi | 🟢 PASS |
| 10 | `api.deleteUser` | xóa người dùng → tài khoản biến mất, token cũ bị từ chối | Xóa user vừa tạo | Chi tiết báo "Không tìm thấy người dùng."; /auth/me 401 | Đúng như mong đợi | 🟢 PASS |
| 11 | `api.createRecipe / updateRecipe / deleteRecipe` | vòng đời món ăn từ form Admin: tạo → app thấy → sửa → xóa | Payload = form mặc định RecipesView | mealTypes "Lunch,Dinner", tag eatClean, 25 phút; app trả 200; sửa Hard/Dinner; xóa → 404 | Đúng như mong đợi | 🟢 PASS |
| 12 | `api.createRecipe` | mọi tag trên form Admin đều tồn tại ở backend | 8 tag của AVAILABLE_TAGS | Món tạo ra có đủ 8 tagCodes | Đúng như mong đợi | 🟢 PASS |
| 13 | `api.createRecipe` | trùng tên món → thông báo lỗi của backend hiển thị nguyên văn | Tạo lại món cùng tên | Ném lỗi "Tên món ăn này đã tồn tại trong hệ thống." | Đúng như mong đợi | 🟢 PASS |
| 14 | `api.getRecipes` | bộ lọc của lưới món ăn (bữa / độ khó / tìm kiếm) trả đúng món | Món Snack/Medium mới | Lọc Snack+Medium thấy món; lọc Breakfast trả [] | Đúng như mong đợi | 🟢 PASS |
| 15 | `api.getPlans` | gói hội viên trên web trùng giá với gói app bán | — | (id, giá) trùng /subscription/plans | Đúng như mong đợi | 🟢 PASS |
| 16 | `api.getTransactions / approveTransaction` | duyệt đơn chuyển khoản SePay đang chờ → người dùng thành Pro | User tạo checkout SEPAY gói Tháng | Có 1 đơn Pending; sau duyệt user Pro PRO_MONTHLY, đơn chuyển Paid | Đúng như mong đợi | 🟢 PASS |
| 17 | `api.createChallenge / updateChallenge / deleteChallenge` | thử thách: tạo từ form mặc định → sửa → xóa, app thấy thử thách khi đang mở | DrinkWater 2.000 × 7 ngày | App thấy; sau sửa tên v2, đóng; sau xóa không còn | Đúng như mong đợi | 🟢 PASS |
| 18 | `api.grantXp / getXpEvents` | tặng 600 XP → pet của người dùng lên cấp 2 và có trong nhật ký XP | 600 XP cho user mới | Pet totalXp 600, level 2; nhật ký có AdminReward +600 | Đúng như mong đợi | 🟢 PASS |
| 19 | `api.getSystemActivity / getEngagementAnalytics` | giám sát hệ thống & tương tác thấy bữa ăn người dùng vừa ghi | User ghi "Cá kho" 333 kcal | Nhật ký có dòng 333 kcal; DAU ≥ 1, MAU ≥ DAU | Đúng như mong đợi | 🟢 PASS |
| 20 | `api.getRevenueReport` | báo cáo doanh thu có 7 mốc ngày và tỷ lệ thành công trong 0–100% | — | 7 mốc; 0 ≤ tỷ lệ ≤ 100; thành công ≤ tổng | Đúng như mong đợi | 🟢 PASS |


### 3.4 Tổng hợp theo module

| Tầng | Module | Suites | Test cases | 🟢 PASS | 🔴 FAIL | 🟡 SKIPPED |
|---|---|---|---|---|---|---|
| Backend | API quản trị Admin Web (MỚI) (`AdminApiTests`) | 1 | 65 | 40 | 25 | 0 |
| Admin Web (unit) | `App.test.jsx` | 1 | 17 | 16 | 1 | 0 |
| Admin Web (unit) | `components/DashboardView.test.jsx` | 1 | 9 | 9 | 0 | 0 |
| Admin Web (unit) | `components/LoginView.test.jsx` | 1 | 7 | 6 | 1 | 0 |
| Admin Web (unit) | `components/RecipesView.test.jsx` | 1 | 19 | 17 | 2 | 0 |
| Admin Web (unit) | `components/ReportViews.test.jsx` | 1 | 18 | 17 | 1 | 0 |
| Admin Web (unit) | `components/RewardsView.test.jsx` | 1 | 14 | 14 | 0 | 0 |
| Admin Web (unit) | `components/ShellComponents.test.jsx` | 1 | 14 | 14 | 0 | 0 |
| Admin Web (unit) | `components/SubscriptionsView.test.jsx` | 1 | 9 | 8 | 1 | 0 |
| Admin Web (unit) | `components/UsersView.test.jsx` | 1 | 21 | 20 | 1 | 0 |
| Admin Web (unit) | `services/api.test.js` | 1 | 34 | 34 | 0 | 0 |
| Admin Web (live) | `live/adminApi.live.test.js` | 1 | 20 | 20 | 0 | 0 |


## 4. Chi tiết các Test Case bị lỗi (Failed Test Cases Log)

32 test FAIL quy về **19 lỗi**. Mức độ: 🟥 Nghiêm trọng · 🟧 Cao · 🟨 Trung bình · 🟩 Thấp.

### 🔴 Fail 01–02 · 🟥 Tài khoản admin mặc định `admin@smartmeal.com / Admin@123456` tồn tại ở mọi môi trường và được in sẵn trên trang đăng nhập

| Test | File |
|---|---|
| Fail 01 — `The_default_admin_password_does_not_work_outside_development` | `backend/SmartMeal.Tests/AdminApiTests.cs:283` |
| Fail 02 — `LoginView › [Bảo mật] trang đăng nhập không điền sẵn / không in ra mật khẩu của tài khoản admin` | `frontend/admin-web/src/__tests__/components/LoginView.test.jsx:110` |

**Lỗi nhận được (Error Output):**
```
Fail 01: Assert.Equal() Failure: Values differ
         Expected: Unauthorized
         Actual:   OK
Fail 02: expect(element).toHaveValue()
         Expected the element to have value: ""
         Received: Admin@123456
```

**Nguyên nhân nghi vấn:** `DbInitializer.SeedAsync` gọi `EnsureAdminAccountAsync(db, DefaultAdminPassword)` **ngoài** khối `if (seedDevAccount)` (`DbInitializer.cs:249`, khối dev ở dòng 244) nên tài khoản Admin mật khẩu cố định được tạo cả ở Production; đồng thời `LoginView.jsx:6-7` điền sẵn email/mật khẩu và dòng 120 in "Tài khoản mẫu: admin@smartmeal.com / Admin@123456". Ai mở cổng Admin cũng đăng nhập được với toàn quyền (xóa người dùng, duyệt thanh toán…). `EnsureAdminAccountAsync` còn **tự nâng quyền Admin** cho bất kỳ tài khoản nào đã đăng ký bằng email `admin@smartmeal.com`. **Đề xuất:** chỉ seed admin khi `seedDevAccount` (hoặc đọc mật khẩu từ cấu hình bắt buộc, không có giá trị mặc định); bỏ giá trị điền sẵn và dòng "Tài khoản mẫu" (chỉ hiện khi `import.meta.env.DEV`).

### 🔴 Fail 03 · 🟥 Cổng Admin không chống dò mật khẩu

**File:** `backend/SmartMeal.Tests/AdminApiTests.cs:263` — `Admin_login_locks_the_account_after_five_wrong_passwords_like_the_app_login`

**Lỗi nhận được (Error Output):**
```
Assert.Equal() Failure: Values differ
Expected: Locked (423)
Actual:   OK
```

**Nguyên nhân nghi vấn:** `AdminController.AdminLogin` (`AdminController.cs:47`) so mật khẩu bằng BCrypt rồi trả 401 ngay, không gọi `ILoginAttemptTracker` như `AuthService.LoginAsync` (tăng `FailedLoginCount`, khóa 15 phút sau 5 lần sai). Cùng với Fail 01 (mật khẩu mặc định công khai) và rate limit chỉ áp cho `/api/auth/*`, endpoint quyền cao nhất lại dễ dò nhất. **Đề xuất:** dùng chung `ILoginAttemptTracker` (hoặc gọi `AuthService.LoginAsync` rồi kiểm tra role) và gắn rate limiter `auth` cho `POST /api/admin/auth/login`.

### 🔴 Fail 04–05 · 🟥 UC1 — Cấm (ban) người dùng không thu hồi phiên đang đăng nhập

| Test | File |
|---|---|
| Fail 04 — `Banning_a_user_revokes_their_current_access_token` | `AdminApiTests.cs:604` |
| Fail 05 — `Banning_a_user_revokes_their_refresh_token` | `AdminApiTests.cs:616` |

**Lỗi nhận được (Error Output):**
```
Assert.NotEqual() Failure: Values are equal
Expected: Not OK
Actual:   OK          (GET /api/auth/me bằng token cũ / POST /api/auth/refresh bằng refresh token cũ)
```

**Nguyên nhân nghi vấn:** `BanUser` (`AdminController.cs:980`) chỉ đặt `LockoutEnd`. `LockoutEnd` chỉ được kiểm tra lúc **đăng nhập**; `OnTokenValidated` (`Program.cs:180`) chỉ kiểm tra người dùng còn tồn tại, `AuthService.RefreshAsync` (`AuthService.cs:276–315`) không kiểm tra khóa. Người dùng bị cấm vẫn dùng app bình thường và tự gia hạn phiên vô thời hạn — trong khi hộp thoại Ban trên Admin Web ghi "Người dùng sẽ bị thu hồi token ngay lập tức". **Đề xuất:** khi ban → thu hồi mọi `RefreshTokens` của user; `RefreshAsync` và `OnTokenValidated` từ chối user có `LockoutEnd > now` (hoặc thêm `SecurityStamp`/`TokenVersion` vào JWT).

### 🔴 Fail 06 · 🟧 Hạ quyền Admin không có hiệu lực ngay

**File:** `AdminApiTests.cs:459` — `A_demoted_admin_loses_admin_access_with_the_token_already_issued`

**Lỗi nhận được (Error Output):**
```
Assert.Equal() Failure: Values differ
Expected: Forbidden
Actual:   OK          (token cũ của admin đã bị hạ quyền vẫn gọi được GET /api/admin/users)
```

**Nguyên nhân nghi vấn:** `[Authorize(Roles = "Admin")]` đọc claim Role trong JWT; `UpdateUserRole` / `ModerateAccount` đổi `User.Role` trong DB nhưng token cũ vẫn mang `Role=Admin` tới khi hết hạn. Cùng gốc với Fail 04–05 (`OnTokenValidated` không đối chiếu DB). **Đề xuất:** trong `OnTokenValidated` so role của token với DB (hoặc dùng `TokenVersion`), thu hồi refresh token khi đổi quyền.

### 🔴 Fail 07–08 · 🟧 Admin tự hạ quyền / tự khóa tài khoản của chính mình

| Test | File |
|---|---|
| Fail 07 — `An_admin_cannot_demote_their_own_account` | `AdminApiTests.cs:470` |
| Fail 08 — `An_admin_cannot_lock_their_own_account_through_the_status_endpoint` | `AdminApiTests.cs:480` |

**Lỗi nhận được (Error Output):**
```
Assert.Equal() Failure: Values differ
Expected: BadRequest
Actual:   OK
```

**Nguyên nhân nghi vấn:** `DeleteUser` và `BanUser` đã chặn thao tác lên chính mình (`TryGetUserId(...) && currentAdminId == id → 400`), nhưng `UpdateUserRole` (`AdminController.cs:418`), `UpdateUserStatus` (dòng 391) và `ModerateAccount` (dòng 1016, trường `role`) thì không. Admin cuối cùng có thể tự hạ quyền → hệ thống không còn ai quản trị (chỉ khôi phục được bằng cách sửa DB). **Đề xuất:** áp cùng kiểm tra cho 3 endpoint trên; chặn hạ quyền admin cuối cùng.

### 🔴 Fail 09–10 · 🟧 UC2 — Đặt lại mật khẩu khi kiểm duyệt bỏ qua chính sách mật khẩu và không đăng xuất phiên cũ

| Test | File |
|---|---|
| Fail 09 — `Moderation_password_reset_follows_the_password_policy` | `AdminApiTests.cs:664` |
| Fail 10 — `Moderation_password_reset_signs_out_existing_sessions` | `AdminApiTests.cs:677` |

**Lỗi nhận được (Error Output):**
```
Fail 09: Assert.Equal() Failure: Values differ — Expected: BadRequest, Actual: OK   (resetPassword = "123")
Fail 10: Assert.Equal() Failure: Values differ — Expected: Unauthorized, Actual: OK (refresh token cũ vẫn dùng được)
```

**Nguyên nhân nghi vấn:** `ModerateAccount` (`AdminController.cs:1036`) băm thẳng `dto.ResetPassword` — không áp `[StringLength(128, MinimumLength = 8)]` như đăng ký/đổi mật khẩu, và không thu hồi `RefreshTokens` (trong khi `AuthService.ChangePasswordAsync` thu hồi mọi phiên). Trường hợp dùng chính là "tài khoản bị xâm phạm" → kẻ chiếm tài khoản vẫn giữ phiên. **Đề xuất:** validate độ dài/độ mạnh; thu hồi refresh token sau khi đặt lại.

### 🔴 Fail 11 · 🟧 Xóa món đã có trong nhật ký ăn uống → lỗi 500

**File:** `AdminApiTests.cs:825` — `Deleting_a_recipe_that_a_user_logged_in_the_diary_keeps_the_diary_entry`

**Lỗi nhận được (Error Output):**
```
Assert.Equal() Failure: Values differ
Expected: OK
Actual:   InternalServerError
Microsoft.EntityFrameworkCore.DbUpdateException: An error occurred while saving the entity changes.
```

**Nguyên nhân nghi vấn:** khóa ngoại `FK_DiaryItems_Recipes_RecipeId` (`Migrations/20260925094305_InitialCreate.cs:408`) và `FK_GroceryItems_Recipes_RecipeId` (`20260926145430_AddModule6MealPlannerAndGrocery.cs:33`) là `NO ACTION`; `DeleteRecipe` (`AdminController.cs:798–819`) chỉ dọn tag, nguyên liệu, yêu thích, bộ sưu tập. Món nào đã từng được người dùng ghi nhật ký hoặc đưa vào danh sách đi chợ thì **không xóa được** (Admin Web chỉ hiện "Xóa món ăn thất bại: Đã xảy ra lỗi hệ thống."). Ngược lại `MealPlans` cascade nên xóa món sẽ **âm thầm xóa bữa trong thực đơn** của người dùng. **Đề xuất:** đặt `RecipeId = null` cho `DiaryItems`/`GroceryItems` (giữ `FoodName`) — migration `OnDelete(SetNull)` — hoặc chuyển sang xóa mềm (`IsArchived`).

### 🔴 Fail 12–14 · 🟧 Danh sách Người dùng / Món ăn / Giao dịch không có phân trang

| Test | File |
|---|---|
| Fail 12 — `UsersView › có hơn 15 người dùng thì admin chuyển được sang trang 2` | `frontend/admin-web/src/__tests__/components/UsersView.test.jsx:77` |
| Fail 13 — `RecipesView › có hơn 16 món thì admin chuyển được sang trang 2` | `RecipesView.test.jsx:94` |
| Fail 14 — `SubscriptionsView › có hơn 20 giao dịch thì admin chuyển được sang trang 2` | `SubscriptionsView.test.jsx:129` |

**Lỗi nhận được (Error Output):**
```
AssertionError: expected null not to be null      (không tìm thấy nút chuyển trang)
```

**Nguyên nhân nghi vấn:** 3 màn hình gửi `page` + `pageSize` (15 / 16 / 20) nhưng `setPage` không bao giờ được gọi (oxlint: `Variable 'setPage' is declared but never used` tại `UsersView.jsx:31`, `RecipesView.jsx:36`, `SubscriptionsView.jsx:23`) và không đọc header `X-Total-Count` mà backend đã trả. DB hiện có **56 món** → 40 món không thể xem / sửa / xóa từ lưới (chỉ tìm được khi gõ đúng tên). **Đề xuất:** thêm điều khiển phân trang đọc `X-Total-Count`; reset `page = 1` khi đổi bộ lọc.

### 🔴 Fail 15–16 · 🟧 UC5 — Lọc báo cáo doanh thu theo ngày không có tác dụng

| Test | File |
|---|---|
| Fail 15 — `Revenue_report_honours_the_date_range_chosen_on_the_web` | `AdminApiTests.cs:1081` |
| Fail 16 — `RevenueReportView › "Đặt lại" xóa ngày đã chọn và nạp lại báo cáo KHÔNG lọc` | `ReportViews.test.jsx:156` |

**Lỗi nhận được (Error Output):**
```
Fail 15: Assert.Equal() Failure: Values differ
         Expected: 123000          (chỉ giao dịch 15/01/2025 trong khoảng 01–31/01/2025)
         Actual:   1779000         (toàn bộ doanh thu)
Fail 16: expected last "vi.fn()" call to have been called with [ '', '' ]
         Received: [ "2026-10-01", "2026-10-15" ]
```

**Nguyên nhân nghi vấn:** (1) `GetRevenueReport()` (`AdminController.cs:1337`) **không có tham số** `startDate`/`endDate` → nút "Lọc Báo Cáo" luôn trả số liệu toàn thời gian; biểu đồ luôn là 7 ngày gần nhất. (2) Nút "Đặt lại" (`RevenueReportView.jsx:121–123`) gọi `setTimeout(loadReport, 50)` — `loadReport` là closure của lần render cũ nên vẫn gửi ngày cũ. **Đề xuất:** nhận `[FromQuery] DateOnly? startDate, endDate` và lọc `totalPaidTx`; ở FE truyền ngày trực tiếp `loadReport('', '')` thay vì dựa vào state.

### 🔴 Fail 17 · 🟨 Duyệt lại giao dịch đã thanh toán cộng thêm ngày Pro

**File:** `AdminApiTests.cs:890` — `Approving_the_same_transaction_twice_does_not_extend_pro_twice`

**Lỗi nhận được (Error Output):**
```
Assert.InRange() Failure: Value not in range
Range:  (2026-11-21T00:31:05Z - 2026-11-21T00:33:05Z)
Actual: 2026-12-21T00:32:05Z        (thêm 30 ngày lần thứ hai)
```

**Nguyên nhân nghi vấn:** `ApproveTransaction` (`AdminController.cs:945–956`) không kiểm tra `tx.Status` trước khi đặt `Paid` và cộng `ProExpiresAt`. Web chỉ ẩn nút với đơn Paid, nhưng bấm 2 lần nhanh, hai admin cùng duyệt, hoặc webhook SePay/PayOS đã xác nhận rồi admin duyệt tiếp đều cộng thêm 30/365 ngày. **Đề xuất:** đơn đã `Paid` → 409 Conflict, không đổi gói.

### 🔴 Fail 18 · 🟨 UC3 — Danh sách huy hiệu trên Admin không khớp huy hiệu của app

**File:** `AdminApiTests.cs:965` — `Badge_list_uses_the_app_badge_catalog_and_counts_real_unlocks`

**Lỗi nhận được (Error Output):**
```
Huy hiệu không có trong app: clean_eater_7, water_master_2l, ai_chef_explorer, walker_10k_steps, pet_lover_level5
```

**Nguyên nhân nghi vấn:** `GetBadges` (`AdminController.cs:1176–1185`) hard-code 5 huy hiệu với Id tự đặt, trong khi app dùng 9 huy hiệu của `GamificationCatalog.Badges` (`first-log`, `streak-3`, `hydrated`, `streak-7`, `eat-clean-7`, `grocery-shopper`, `ai-snap-10`, `protein-goal`, `resilient-30`). Kết quả: tab "Huy hiệu" luôn hiện 0 người mở khóa và không hiện huy hiệu thật. **Đề xuất:** dựng danh sách từ `GamificationCatalog.Badges`.

### 🔴 Fail 19–20 · 🟨 UC3 — Tạo được thử thách thuộc loại không bao giờ hoàn thành được

**File:** `AdminApiTests.cs:949` — `A_challenge_category_the_app_cannot_score_is_rejected(category: "NoSugar")`, `(category: "Sleep")`

**Lỗi nhận được (Error Output):**
```
Assert.Equal() Failure: Values differ
Expected: BadRequest
Actual:   OK
```

**Nguyên nhân nghi vấn:** form Admin Web có lựa chọn "Kiêng Đường (No Sugar)" và `CreateChallenge` (`AdminController.cs:1101`) nhận chuỗi `Category` bất kỳ, nhưng `GamificationService.IsDaySatisfied` chỉ chấm `DrinkWater`/`EatClean`/`Exercise` (`_ => false`, `GamificationService.cs:353`). Người dùng tham gia thử thách NoSugar sẽ không bao giờ có ngày đạt → không nhận XP/huy hiệu. **Đề xuất:** validate `Category` theo danh sách hỗ trợ (dùng chung hằng số với GamificationService) và bỏ "No Sugar" khỏi form cho tới khi có dữ liệu chấm.

### 🔴 Fail 21 · 🟨 UC6 — Bảng xếp hạng "người dùng tích cực" không lấy người có XP cao nhất

**File:** `AdminApiTests.cs:1128` — `Top_engaged_users_are_ranked_by_xp_across_all_users`

**Lỗi nhận được (Error Output):**
```
Assert.Equal() Failure: Values differ
Expected: e8640aeb-0b52-4725-bb11-6c48aabe2ee7     (người dùng 10.000 XP)
Actual:   215d5141-14be-4e17-9953-c49d18715b95
```

**Nguyên nhân nghi vấn:** `GetEngagementAnalytics` (`AdminController.cs:1452`) gọi `.Take(8)` **trước** `.OrderByDescending(u => u.TotalXp)` → lấy 8 người bất kỳ rồi mới sắp xếp. **Đề xuất:** sắp xếp theo XP rồi mới `Take(8)`.

### 🔴 Fail 22–23 · 🟨 UC4/UC6 — Chỉ số hệ thống là số giả

| Test | File |
|---|---|
| Fail 22 — `Engagement_reports_zero_active_users_when_nobody_was_active` | `AdminApiTests.cs:1114` |
| Fail 23 — `System_activity_reports_the_real_server_uptime` | `AdminApiTests.cs:1037` |

**Lỗi nhận được (Error Output):**
```
Fail 22: Assert.Equal() Failure: Values differ — Expected: (0, 0, 0), Actual: (1, 1, 1)   (DAU, WAU, MAU)
Fail 23: Assert.InRange() Failure: Value not in range — Range: (0 - 1), Actual: 24.5          (giờ uptime)
```

**Nguyên nhân nghi vấn:** `EstimatedDau/Wau/Mau = Math.Max(1, …)` (`AdminController.cs:1468–1470`) — không ai hoạt động vẫn báo 1. `ServerUptimeHours = (giờ hiện tại trong ngày) + 24` (dòng 1319) và `DatabaseStatus = "Healthy"` cố định (dòng 1321), `SystemActivityView` còn in cứng "tốc độ phản hồi < 5ms". Màn "Giám sát hệ thống" vì vậy không phản ánh sự cố thật. **Đề xuất:** trả đúng số đếm; uptime = `DateTime.UtcNow - Process.GetCurrentProcess().StartTime`; trạng thái DB lấy từ health check (`db.Database.CanConnectAsync`).

### 🔴 Fail 24–27 · 🟨 Quản lý món ăn thiếu kiểm tra dữ liệu

| Test | File |
|---|---|
| Fail 24–26 — `Creating_a_recipe_rejects_values_the_app_cannot_handle(field: "difficulty" / "calories" / "mealTypes")` | `AdminApiTests.cs:741` |
| Fail 27 — `Updating_a_recipe_to_another_recipes_title_is_rejected` | `AdminApiTests.cs:797` |

**Lỗi nhận được (Error Output):**
```
Assert.Equal() Failure: Values differ
Expected: BadRequest
Actual:   OK           (difficulty "Impossible", caloriesPerServing −250, mealTypes "Brunch", trùng tên khi sửa)
```

**Nguyên nhân nghi vấn:** `AdminCreateRecipeDto` chỉ validate `Title`; `CreateRecipe`/`UpdateRecipe` (`AdminController.cs:637`, `719`) lưu nguyên `Difficulty`, `MealTypes`, dinh dưỡng âm. App mobile chỉ hiểu Easy/Medium/Hard và 4 bữa → món "Brunch" không bao giờ xuất hiện khi lọc theo bữa, calo âm làm sai tổng calo nhật ký. `CreateRecipe` chặn trùng tên (dòng 639) nhưng `UpdateRecipe` thì không. **Đề xuất:** `[RegularExpression]`/`[Range]` trên DTO (hoặc `MealTypes.Normalize` dùng chung), kiểm tra trùng tên khi sửa (loại trừ chính món đó).

### 🔴 Fail 28 · 🟨 Nhập sai mật khẩu ở trang đăng nhập hiện thêm "Phiên làm việc đã hết hạn"

**File:** `frontend/admin-web/src/__tests__/App.test.jsx:88` — `App › nhập sai mật khẩu chỉ báo lỗi đăng nhập, không báo "Phiên làm việc đã hết hạn"`

**Lỗi nhận được (Error Output):**
```
expect(element).not.toBeInTheDocument()
expected document not to contain element, found <span>Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.</span> instead
```

**Nguyên nhân nghi vấn:** `request()` (`services/api.js:37–39`) coi **mọi** 401 là hết phiên và phát `smartmeal_admin_unauthorized`, kể cả 401 của `POST /admin/auth/login` khi sai mật khẩu → App hiện toast "Phiên làm việc đã hết hạn" bên cạnh lỗi "Email hoặc mật khẩu không chính xác." **Đề xuất:** chỉ phát sự kiện khi request có gửi token (hoặc bỏ qua endpoint đăng nhập).

### 🔴 Fail 29–30 · 🟩 Cấp gói Pro với số ngày ≤ 0 vẫn thành công

**File:** `AdminApiTests.cs:526` — `Granting_pro_rejects_a_non_positive_duration(days: 0)`, `(days: -30)`

**Lỗi nhận được (Error Output):**
```
Assert.Equal() Failure: Values differ
Expected: BadRequest
Actual:   OK
```

**Nguyên nhân nghi vấn:** `UpdateUserSubscription` (`AdminController.cs:449`) dùng `dto.DurationDays ?? 30` không kiểm tra dấu → `IsPro = true` nhưng `ProExpiresAt` ở quá khứ, người dùng thành "Expired" trong khi Admin báo "Đã kích hoạt gói Pro". Form web có `min="1"` nhưng API không chặn. **Đề xuất:** `[Range(1, 3650)]` cho `DurationDays`.

### 🔴 Fail 31 · 🟩 Refresh token do cổng Admin trả về là giá trị giả

**File:** `AdminApiTests.cs:273` — `The_refresh_token_returned_by_admin_login_can_renew_the_session`

**Lỗi nhận được (Error Output):**
```
Assert.Equal() Failure: Values differ
Expected: OK
Actual:   Unauthorized
```

**Nguyên nhân nghi vấn:** `AdminLogin` trả `RefreshToken = Guid.NewGuid()` (`AdminController.cs:71`) không lưu vào bảng `RefreshTokens` → `/api/auth/refresh` luôn 401; Admin Web hiện không dùng refresh nên hết hạn access token là bị đẩy ra trang đăng nhập. **Đề xuất:** cấp token qua `IssueTokensAsync` của `AuthService` (hoặc không trả trường này).

### 🔴 Fail 32 · 🟩 Nhãn tag "quick" trên form món ăn lệch định nghĩa backend

**File:** `frontend/admin-web/src/__tests__/components/RecipesView.test.jsx:210` — `RecipesView › nhãn tag "quick" khớp định nghĩa của backend (Nhanh Gọn < 15 phút)`

**Lỗi nhận được (Error Output):**
```
AssertionError: expected '+ Nhanh Dưới 20p' to match /15/
```

**Nguyên nhân nghi vấn:** `AVAILABLE_TAGS` (`RecipesView.jsx:24`) ghi "Nhanh Dưới 20p" trong khi tag `quick` ở backend là "Nhanh Gọn (< 15 phút)" và app lọc ≤ 15 phút — admin sẽ gắn nhầm món 16–19 phút (đúng loại lỗi dữ liệu seed `Recipes_tagged_quick_take_at_most_15_minutes` đang FAIL ở báo cáo mobile). **Đề xuất:** lấy nhãn tag từ backend (`/api/meta`) thay vì hard-code.

### ⚠️ Quan sát khác (không có test FAIL riêng)

| Quan sát | Vị trí | Ảnh hưởng |
|---|---|---|
| Hộp thoại "Khóa / Mở khóa tài khoản" không bao giờ mở được (code chết) | `UsersView.jsx:36`, `520–553` — `setLockTarget(user)` không được gọi ở đâu | Gây hiểu nhầm khi bảo trì; kéo branch coverage của file xuống 68.5% |
| Topbar luôn hiện "Hệ thống trực tuyến (Port 5000)" | `Topbar.jsx:11` | Không phản ánh trạng thái thật; sai khi chạy qua nginx (cổng 3000 → `backend-api:8080`) |
| Xóa món làm mất bữa trong thực đơn người dùng mà không báo | `MealPlans.RecipeId` cascade | Người dùng thấy bữa đã lên kế hoạch biến mất |
| Admin cấp Pro không tạo giao dịch / không vào báo cáo doanh thu | `UpdateUserSubscription` | Đối soát doanh thu thiếu dấu vết các lần cấp tay |
| 57 cảnh báo oxlint ở mã nguồn sẵn có (import thừa, `react-hooks/exhaustive-deps`, `setState` trong effect) | `npx oxlint` | Không lỗi; nên dọn trước khi bật lint trên CI |

### ⚠️ Thay đổi hạ tầng test trong đợt này (không phải lỗi code)

| Thay đổi | Lý do |
|---|---|
| `frontend/admin-web/package.json`: thêm devDependencies `vitest`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`; script `test`, `test:coverage` (kèm `package-lock.json`) | Admin Web chưa có test runner |
| Thêm `vitest.config.js`, `src/test/setup.js`, `src/test/fixtures.js`, `src/test/mockApi.js`; `.gitignore` bỏ qua `coverage/` | Cấu hình jsdom, dữ liệu mẫu và mock dùng chung |
| Thêm `backend/SmartMeal.Tests/Infrastructure/DbTheoryAttribute.cs` | Bản `[Theory]` của `[DbFact]` (tự bỏ qua khi không có database) |
| Build lại image `smartmeal-backend-api` (image cũ 21 giờ) với override live-test trong thư mục tạm; không sửa `backend/.env` | Live test cần API đúng commit hiện tại |

## 5. Kết luận & Đánh giá (Conclusion)

**Trạng thái Code Base:** ⛔ **Chưa sẵn sàng deploy Admin Web ra môi trường thật.**

- **Bảo mật (chặn deploy):** tài khoản admin mật khẩu cố định được seed ở mọi môi trường và in ngay trên trang đăng nhập, cổng Admin không khóa khi dò mật khẩu, ban / hạ quyền không thu hồi phiên (Fail 01–08).
- **Nghiệp vụ:** luồng chính chạy đúng với backend thật — 20/20 live test PASS (đăng nhập, ban/gỡ ban, kiểm duyệt, cấp/hủy Pro, CRUD món & thử thách, duyệt đơn SePay, tặng XP, giám sát, báo cáo). Lỗi còn lại tập trung ở: xóa món đã dùng (500), không phân trang, lọc doanh thu theo ngày không chạy, số liệu giả ở màn Giám sát/Tương tác, thiếu validate dữ liệu đầu vào.
- **Coverage:** Admin Web đạt ≥ 80% cả 4 chỉ số (Lines 92.5%); `AdminController` Lines 97.4% / Methods 100%, Branches 74.4% chưa đạt.

**Kế hoạch tiếp theo:**

1. **[Nghiêm trọng]** Chỉ seed admin ở Development (hoặc mật khẩu từ cấu hình bắt buộc), bỏ mật khẩu điền sẵn trên `LoginView`; đổi mật khẩu tài khoản admin trên các môi trường đã deploy (Fail 01–02).
2. **[Nghiêm trọng]** Khóa tài khoản sau 5 lần sai + rate limit cho `/api/admin/auth/login` (Fail 03).
3. **[Nghiêm trọng]** Ban / hạ quyền / đặt lại mật khẩu phải thu hồi refresh token và token đang dùng (kiểm tra `LockoutEnd`, role trong `OnTokenValidated` + `RefreshAsync`) (Fail 04–06, 10).
4. **[Cao]** Chặn tự hạ quyền / tự khóa; validate mật khẩu khi đặt lại (Fail 07–09).
5. **[Cao]** Migration `OnDelete(SetNull)` cho `DiaryItems`/`GroceryItems → Recipes` hoặc xóa mềm món (Fail 11).
6. **[Cao]** Phân trang cho Users / Recipes / Transactions dùng `X-Total-Count` (Fail 12–14); lọc doanh thu theo ngày ở cả API và nút "Đặt lại" (Fail 15–16).
7. **[Trung bình]** Duyệt giao dịch idempotent; huy hiệu lấy từ `GamificationCatalog`; validate loại thử thách; sửa `Take`/`OrderBy`; bỏ số liệu giả; validate món ăn; không coi 401 đăng nhập là hết phiên (Fail 17–28).
8. **[Thấp]** `[Range]` cho số ngày Pro, refresh token thật cho Admin, nhãn tag lấy từ backend; xóa hộp thoại khóa chết hoặc nối nút vào (Fail 29–32, mục "Quan sát khác").
9. Đưa `npm test` (Admin Web) và `AdminApiTests` vào CI; nâng branch coverage `AdminController` lên ≥ 80% (nhánh null trong projection, bộ lọc không hợp lệ).

---

## Phụ lục A: Danh sách đầy đủ test case

Mỗi bảng có thể mở/đóng. "Đúng như mong đợi" = mọi assertion của test case đều đạt; với test FAIL, cột Actual Result là thông báo lỗi rút gọn (chi tiết ở mục 4).

<!-- APPENDIX:START -->

### A.1 Backend — xUnit `AdminApiTests` (API quản trị)

<details><summary><b>AdminApiTests</b> — API quản trị Admin Web (MỚI) · 40/65 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 1 | `AdminApiTests` | A banned user cannot log in until unbanned | Đúng như mong đợi | 🟢 PASS | 0.87s |
| 2 | `AdminApiTests` | A challenge category the app cannot score is rejected (category: "NoSugar") | Assert.Equal() Failure: Values differ Expected: BadRequest Actual: OK | 🔴 FAIL | 0.78s |
| 3 | `AdminApiTests` | A challenge category the app cannot score is rejected (category: "Sleep") | Assert.Equal() Failure: Values differ Expected: BadRequest Actual: OK | 🔴 FAIL | 0.75s |
| 4 | `AdminApiTests` | A challenge created updated and deleted by the admin is mirrored in the app | Đúng như mong đợi | 🟢 PASS | 0.87s |
| 5 | `AdminApiTests` | A demoted admin loses admin access with the token already issued | Assert.Equal() Failure: Values differ Expected: Forbidden Actual: OK | 🔴 FAIL | 0.93s |
| 6 | `AdminApiTests` | A recipe created by the admin appears in the app catalog with tags and ingredients | Đúng như mong đợi | 🟢 PASS | 1.20s |
| 7 | `AdminApiTests` | Admin login locks the account after five wrong passwords like the app login | Assert.Equal() Failure: Values differ Expected: Locked Actual: OK | 🔴 FAIL | 3.91s |
| 8 | `AdminApiTests` | Admin login refuses a regular user with 403 | Đúng như mong đợi | 🟢 PASS | 0.34s |
| 9 | `AdminApiTests` | Admin login returns a token and the admin profile | Đúng như mong đợi | 🟢 PASS | 0.51s |
| 10 | `AdminApiTests` | Admin login validates the email format | Đúng như mong đợi | 🟢 PASS | 0.02s |
| 11 | `AdminApiTests` | Admin login with a wrong password is rejected with 401 | Đúng như mong đợi | 🟢 PASS | 0.52s |
| 12 | `AdminApiTests` | An admin cannot delete or ban their own account | Đúng như mong đợi | 🟢 PASS | 0.66s |
| 13 | `AdminApiTests` | An admin cannot demote their own account | Assert.Equal() Failure: Values differ Expected: BadRequest Actual: OK | 🔴 FAIL | 0.47s |
| 14 | `AdminApiTests` | An admin cannot lock their own account through the status endpoint | Assert.Equal() Failure: Values differ Expected: BadRequest Actual: OK | 🔴 FAIL | 0.45s |
| 15 | `AdminApiTests` | Approving a pending transaction activates pro for the plan duration | Đúng như mong đợi | 🟢 PASS | 0.76s |
| 16 | `AdminApiTests` | Approving an unknown transaction returns 404 | Đúng như mong đợi | 🟢 PASS | 1.06s |
| 17 | `AdminApiTests` | Approving the same transaction twice does not extend pro twice | Assert.InRange() Failure: Value not in range Range: (2026-11-21T00:31:05.3795400Z - 2026-11-21T00:33:05.3795400Z) Actual: 2026-12-21T00:32:05.3795400Z | 🔴 FAIL | 0.53s |
| 18 | `AdminApiTests` | Badge list uses the app badge catalog and counts real unlocks | Huy hiệu không có trong app: clean_eater_7, water_master_2l, ai_chef_explorer, walker_10k_steps, pet_lover_level5 | 🔴 FAIL | 1.05s |
| 19 | `AdminApiTests` | Ban duration sets the lockout end (days: 1) | Đúng như mong đợi | 🟢 PASS | 1.87s |
| 20 | `AdminApiTests` | Ban duration sets the lockout end (days: 30) | Đúng như mong đợi | 🟢 PASS | 1.53s |
| 21 | `AdminApiTests` | Ban duration sets the lockout end (days: null) | Đúng như mong đợi | 🟢 PASS | 1.97s |
| 22 | `AdminApiTests` | Banning a user revokes their current access token | Assert.NotEqual() Failure: Values are equal Expected: Not OK Actual: OK | 🔴 FAIL | 0.67s |
| 23 | `AdminApiTests` | Banning a user revokes their refresh token | Assert.NotEqual() Failure: Values are equal Expected: Not OK Actual: OK | 🔴 FAIL | 0.90s |
| 24 | `AdminApiTests` | Creating a recipe rejects values the app cannot handle (field: "calories") | Assert.Equal() Failure: Values differ Expected: BadRequest Actual: OK | 🔴 FAIL | 1.00s |
| 25 | `AdminApiTests` | Creating a recipe rejects values the app cannot handle (field: "difficulty") | Assert.Equal() Failure: Values differ Expected: BadRequest Actual: OK | 🔴 FAIL | 1.23s |
| 26 | `AdminApiTests` | Creating a recipe rejects values the app cannot handle (field: "mealTypes") | Assert.Equal() Failure: Values differ Expected: BadRequest Actual: OK | 🔴 FAIL | 1.20s |
| 27 | `AdminApiTests` | Creating a recipe with an existing title is rejected | Đúng như mong đợi | 🟢 PASS | 0.51s |
| 28 | `AdminApiTests` | Dashboard stats count users pro locked recipes and paid revenue | Đúng như mong đợi | 🟢 PASS | 1.97s |
| 29 | `AdminApiTests` | Deleting a recipe removes it from the admin list and the app | Đúng như mong đợi | 🟢 PASS | 0.78s |
| 30 | `AdminApiTests` | Deleting a recipe that a user logged in the diary keeps the diary entry | Assert.Equal() Failure: Values differ Expected: OK Actual: InternalServerError | 🔴 FAIL | 0.58s |
| 31 | `AdminApiTests` | Deleting a user removes the account but keeps their payment history | Đúng như mong đợi | 🟢 PASS | 0.76s |
| 32 | `AdminApiTests` | Engagement counts users who logged meals today | Đúng như mong đợi | 🟢 PASS | 0.91s |
| 33 | `AdminApiTests` | Engagement reports zero active users when nobody was active | Assert.Equal() Failure: Values differ Expected: Tuple (0, 0, 0) Actual: Tuple (1, 1, 1) | 🔴 FAIL | 2.24s |
| 34 | `AdminApiTests` | Every admin endpoint refuses a regular user token | Đúng như mong đợi | 🟢 PASS | 0.72s |
| 35 | `AdminApiTests` | Every admin endpoint requires a token | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 36 | `AdminApiTests` | Granting and revoking pro is reflected in the users subscription status | Đúng như mong đợi | 🟢 PASS | 0.67s |
| 37 | `AdminApiTests` | Granting pro rejects a non positive duration (days: -30) | Assert.Equal() Failure: Values differ Expected: BadRequest Actual: OK | 🔴 FAIL | 1.30s |
| 38 | `AdminApiTests` | Granting pro rejects a non positive duration (days: 0) | Assert.Equal() Failure: Values differ Expected: BadRequest Actual: OK | 🔴 FAIL | 1.38s |
| 39 | `AdminApiTests` | Granting xp levels up the pet and is logged as an admin reward | Đúng như mong đợi | 🟢 PASS | 1.30s |
| 40 | `AdminApiTests` | Granting xp outside 1 to 10000 is rejected (xp: -50) | Đúng như mong đợi | 🟢 PASS | 1.34s |
| 41 | `AdminApiTests` | Granting xp outside 1 to 10000 is rejected (xp: 0) | Đúng như mong đợi | 🟢 PASS | 1.65s |
| 42 | `AdminApiTests` | Granting xp outside 1 to 10000 is rejected (xp: 10001) | Đúng như mong đợi | 🟢 PASS | 1.34s |
| 43 | `AdminApiTests` | Granting xp to an unknown user returns 404 | Đúng như mong đợi | 🟢 PASS | 0.47s |
| 44 | `AdminApiTests` | Moderation clears a brute force lockout | Đúng như mong đợi | 🟢 PASS | 16.48s |
| 45 | `AdminApiTests` | Moderation password reset follows the password policy | Assert.Equal() Failure: Values differ Expected: BadRequest Actual: OK | 🔴 FAIL | 0.91s |
| 46 | `AdminApiTests` | Moderation password reset signs out existing sessions | Assert.Equal() Failure: Values differ Expected: Unauthorized Actual: OK | 🔴 FAIL | 0.90s |
| 47 | `AdminApiTests` | Moderation renames verifies and resets the password | Đúng như mong đợi | 🟢 PASS | 1.34s |
| 48 | `AdminApiTests` | Plans match the public subscription catalog | Đúng như mong đợi | 🟢 PASS | 0.49s |
| 49 | `AdminApiTests` | Promoting a user to admin opens the admin portal and demoting closes it | Đúng như mong đợi | 🟢 PASS | 1.17s |
| 50 | `AdminApiTests` | Recipe list filters by search meal type difficulty and premium | Đúng như mong đợi | 🟢 PASS | 0.88s |
| 51 | `AdminApiTests` | Revenue report honours the date range chosen on the web | Assert.Equal() Failure: Values differ Expected: 123000 Actual: 1779000 | 🔴 FAIL | 0.67s |
| 52 | `AdminApiTests` | Revenue report totals paid transactions by method and plan | Đúng như mong đợi | 🟢 PASS | 1.59s |
| 53 | `AdminApiTests` | Status endpoint locks and unlocks an account | Đúng như mong đợi | 🟢 PASS | 1.38s |
| 54 | `AdminApiTests` | System activity reports the real server uptime | Assert.InRange() Failure: Value not in range Range: (0 - 1) Actual: 24.5 | 🔴 FAIL | 0.60s |
| 55 | `AdminApiTests` | System activity shows the latest meal logs and locked accounts | Đúng như mong đợi | 🟢 PASS | 2.22s |
| 56 | `AdminApiTests` | The default admin password does not work outside development | Assert.Equal() Failure: Values differ Expected: Unauthorized Actual: OK | 🔴 FAIL | 0.25s |
| 57 | `AdminApiTests` | The refresh token returned by admin login can renew the session | Assert.Equal() Failure: Values differ Expected: OK Actual: Unauthorized | 🔴 FAIL | 0.58s |
| 58 | `AdminApiTests` | Top engaged users are ranked by xp across all users | Assert.Equal() Failure: Values differ Expected: e8640aeb-0b52-4725-bb11-6c48aabe2ee7 Actual: 215d5141-14be-4e17-9953-c49d18715b95 | 🔴 FAIL | 2.27s |
| 59 | `AdminApiTests` | Transactions filter by status and search | Đúng như mong đợi | 🟢 PASS | 1.72s |
| 60 | `AdminApiTests` | Unknown users return 404 on every user action | Đúng như mong đợi | 🟢 PASS | 1.18s |
| 61 | `AdminApiTests` | Updating a recipe replaces its fields tags and ingredients | Đúng như mong đợi | 🟢 PASS | 0.48s |
| 62 | `AdminApiTests` | Updating a recipe to another recipes title is rejected | Assert.Equal() Failure: Values differ Expected: BadRequest Actual: OK | 🔴 FAIL | 0.93s |
| 63 | `AdminApiTests` | User detail includes the health profile and activity counts | Đúng như mong đợi | 🟢 PASS | 0.97s |
| 64 | `AdminApiTests` | User list filters by search role status and subscription | Đúng như mong đợi | 🟢 PASS | 2.72s |
| 65 | `AdminApiTests` | User list is paginated newest first and exposes the total count | Đúng như mong đợi | 🟢 PASS | 1.66s |

</details>

### A.2 Admin Web — Vitest unit test (`frontend/admin-web/src/__tests__/`, trừ `live/`)

<details><summary><b>src/__tests__/App.test.jsx</b> · 16/17 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 66 | App — đăng nhập / đăng xuất | chưa đăng nhập thì chỉ hiện trang đăng nhập, không gọi API thống kê | Đúng như mong đợi | 🟢 PASS | 0.41s |
| 67 | App — đăng nhập / đăng xuất | đăng nhập thành công → vào Bảng điều khiển, chào admin và nạp thống kê | Đúng như mong đợi | 🟢 PASS | 0.49s |
| 68 | App — đăng nhập / đăng xuất | đã có phiên trong localStorage → vào thẳng Bảng điều khiển với tên admin | Đúng như mong đợi | 🟢 PASS | 0.20s |
| 69 | App — đăng nhập / đăng xuất | đăng xuất xóa phiên, quay về trang đăng nhập và báo đã đăng xuất | Đúng như mong đợi | 🟢 PASS | 0.21s |
| 70 | App — đăng nhập / đăng xuất | phiên hết hạn (sự kiện 401 từ api) → quay về trang đăng nhập kèm thông báo | Đúng như mong đợi | 🟢 PASS | 0.21s |
| 71 | App — đăng nhập / đăng xuất | nhập sai mật khẩu chỉ báo lỗi đăng nhập, không báo "Phiên làm việc đã hết hạn" | Error: expect(element).not.toBeInTheDocument() expected document not to contain element, found <span> Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại. </span> instead at Proxy… | 🔴 FAIL | 0.12s |
| 72 | App — điều hướng & thông báo | menu "Quản Lý Người Dùng" mở trang "Quản Lý Người Dùng & Kiểm Duyệt Tài Khoản" và nạp dữ liệu | Đúng như mong đợi | 🟢 PASS | 0.39s |
| 73 | App — điều hướng & thông báo | menu "Quản Lý Món Ăn" mở trang "Quản Lý Thực Đơn & Món Ăn" và nạp dữ liệu | Đúng như mong đợi | 🟢 PASS | 0.27s |
| 74 | App — điều hướng & thông báo | menu "Hệ Thống Phần Thưởng" mở trang "Quản Lý Hệ Thống Phần Thưởng (Rewards)" và nạp dữ liệu | Đúng như mong đợi | 🟢 PASS | 0.25s |
| 75 | App — điều hướng & thông báo | menu "Giám Sát Hệ Thống" mở trang "Giám Sát Hoạt Động Hệ Thống (System Activity)" và nạp dữ liệu | Đúng như mong đợi | 🟢 PASS | 0.26s |
| 76 | App — điều hướng & thông báo | menu "Báo Cáo Doanh Thu" mở trang "Báo Cáo Doanh Thu Tài Chính (Revenue Report)" và nạp dữ liệu | Đúng như mong đợi | 🟢 PASS | 0.25s |
| 77 | App — điều hướng & thông báo | menu "Phân Tích Tương Tác" mở trang "Phân Tích Mức Độ Tương Tác (Engagement Analytics)" và nạp dữ liệu | Đúng như mong đợi | 🟢 PASS | 0.26s |
| 78 | App — điều hướng & thông báo | menu "Gói Member & Giao Dịch" mở trang "Quản Lý Gói Hội Viên & Giao Dịch" và nạp dữ liệu | Đúng như mong đợi | 🟢 PASS | 0.23s |
| 79 | App — điều hướng & thông báo | nút "Thêm Món Ăn" trên thanh trên mở tab Món ăn với form thêm món | Đúng như mong đợi | 🟢 PASS | 0.24s |
| 80 | App — điều hướng & thông báo | nút "Làm mới" nạp lại thống kê | Đúng như mong đợi | 🟢 PASS | 0.20s |
| 81 | App — điều hướng & thông báo | lỗi nạp thống kê hiện toast lỗi | Đúng như mong đợi | 🟢 PASS | 0.09s |
| 82 | App — điều hướng & thông báo | toast tự ẩn sau 4 giây | Đúng như mong đợi | 🟢 PASS | 0.05s |

</details>

<details><summary><b>src/__tests__/components/DashboardView.test.jsx</b> · 9/9 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 83 | DashboardView | hiện trạng thái đang tải khi chưa có thống kê | Đúng như mong đợi | 🟢 PASS | 0.05s |
| 84 | DashboardView | 4 thẻ số liệu: người dùng (hoạt động / bị khóa), Pro + tỉ lệ chuyển đổi, số món, doanh thu VND | Đúng như mong đợi | 🟢 PASS | 0.24s |
| 85 | DashboardView | không hiện "bị khóa" khi không có tài khoản bị khóa và tỉ lệ 0% khi chưa có người dùng | Đúng như mong đợi | 🟢 PASS | 0.05s |
| 86 | DashboardView | phân bổ thực đơn theo bữa: số món và phần trăm trên tổng số món | Đúng như mong đợi | 🟢 PASS | 0.17s |
| 87 | DashboardView | gói thành viên: tên, giá / chu kỳ, nhãn phổ biến và số người dùng | Đúng như mong đợi | 🟢 PASS | 0.05s |
| 88 | DashboardView | giao dịch gần đây hiển thị đúng nhãn trạng thái Paid / Pending / Failed | Đúng như mong đợi | 🟢 PASS | 0.06s |
| 89 | DashboardView | người dùng mới: vai trò, gói và tên mặc định khi thiếu họ tên | Đúng như mong đợi | 🟢 PASS | 0.05s |
| 90 | DashboardView | hiện thông báo trống khi chưa có giao dịch / người dùng | Đúng như mong đợi | 🟢 PASS | 0.04s |
| 91 | DashboardView | các nút "Xem tất cả / Chi tiết / Quản lý" điều hướng sang đúng tab | Đúng như mong đợi | 🟢 PASS | 0.29s |

</details>

<details><summary><b>src/__tests__/components/LoginView.test.jsx</b> · 6/7 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 92 | LoginView | đăng nhập bằng email/mật khẩu đã nhập và báo user cho App | Đúng như mong đợi | 🟢 PASS | 1.35s |
| 93 | LoginView | khóa nút và hiện "Đang xác thực..." trong lúc chờ backend | Đúng như mong đợi | 🟢 PASS | 0.99s |
| 94 | LoginView | hiện thông báo lỗi của backend và không chuyển trang khi sai mật khẩu | Đúng như mong đợi | 🟢 PASS | 0.79s |
| 95 | LoginView | dùng thông báo mặc định khi lỗi không có nội dung | Đúng như mong đợi | 🟢 PASS | 0.74s |
| 96 | LoginView | báo thiếu thông tin và không gọi API khi để trống email hoặc mật khẩu | Đúng như mong đợi | 🟢 PASS | 0.09s |
| 97 | LoginView | nút "Điền Tài Khoản Admin Mặc Định" điền lại form và xóa lỗi cũ | Đúng như mong đợi | 🟢 PASS | 0.51s |
| 98 | LoginView | [Bảo mật] trang đăng nhập không điền sẵn / không in ra mật khẩu của tài khoản admin | Error: expect(element).toHaveValue() Expected the element to have value:  Received:  Admin@123456 at Proxy.__VITEST_EXTEND_ASSERTION__ (file:///D:/Sem8/PRM393/SmartMeal/frontend… | 🔴 FAIL | 0.03s |

</details>

<details><summary><b>src/__tests__/components/RecipesView.test.jsx</b> · 17/19 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 99 | RecipesView — lưới món ăn & bộ lọc | nạp trang 1 (16 món/trang) và hiển thị kcal làm tròn, thời gian, protein, độ khó, nhãn Pro, tối đa 3 tag | Đúng như mong đợi | 🟢 PASS | 0.62s |
| 100 | RecipesView — lưới món ăn & bộ lọc | ảnh lỗi được thay bằng ảnh mặc định | Đúng như mong đợi | 🟢 PASS | 0.12s |
| 101 | RecipesView — lưới món ăn & bộ lọc | đổi bộ lọc bữa ăn, độ khó và ô tìm kiếm thì nạp lại | Đúng như mong đợi | 🟢 PASS | 0.61s |
| 102 | RecipesView — lưới món ăn & bộ lọc | không có món → hiện thông báo trống; lỗi tải → onNotify error | Đúng như mong đợi | 🟢 PASS | 0.11s |
| 103 | RecipesView — lưới món ăn & bộ lọc | có hơn 16 món thì admin chuyển được sang trang 2 | AssertionError: expected null not to be null at D:/Sem8/PRM393/SmartMeal/frontend/admin-web/src/__tests__/components/RecipesView.test.jsx:94:22 at async file:///D:/Sem8/PRM393/S… | 🔴 FAIL | 0.43s |
| 104 | RecipesView — thêm món | form mặc định: bữa Trưa, tag Eat Clean, 1 nguyên liệu ức gà | Đúng như mong đợi | 🟢 PASS | 0.24s |
| 105 | RecipesView — thêm món | gửi payload đầy đủ: mealTypes nối bằng dấu phẩy, tag đã chọn, nguyên liệu đã nhập | Đúng như mong đợi | 🟢 PASS | 1.66s |
| 106 | RecipesView — thêm món | tên món chỉ có khoảng trắng → báo lỗi, không gọi API | Đúng như mong đợi | 🟢 PASS | 0.38s |
| 107 | RecipesView — thêm món | không bỏ chọn được bữa ăn cuối cùng; không xóa được nguyên liệu cuối cùng | Đúng như mong đợi | 🟢 PASS | 0.58s |
| 108 | RecipesView — thêm món | xem trước ảnh khi nhập link ảnh | Đúng như mong đợi | 🟢 PASS | 1.06s |
| 109 | RecipesView — thêm món | lỗi khi lưu (vd. trùng tên) → báo lỗi, giữ form mở | Đúng như mong đợi | 🟢 PASS | 0.58s |
| 110 | RecipesView — thêm món | initialOpenAdd mở sẵn form và báo App reset cờ | Đúng như mong đợi | 🟢 PASS | 0.06s |
| 111 | RecipesView — thêm món | đóng form bằng nút Hủy hoặc bấm ra ngoài | Đúng như mong đợi | 🟢 PASS | 0.36s |
| 112 | RecipesView — thêm món | nhãn tag "quick" khớp định nghĩa của backend (Nhanh Gọn < 15 phút) | AssertionError: expected '+ Nhanh Dưới 20p' to match /15/ at D:/Sem8/PRM393/SmartMeal/frontend/admin-web/src/__tests__/components/RecipesView.test.jsx:210:60 at async file:///D:… | 🔴 FAIL | 0.13s |
| 113 | RecipesView — sửa & xóa món | sửa: nạp chi tiết, tách mealTypes "Breakfast, Lunch" và gửi updateRecipe | Đúng như mong đợi | 🟢 PASS | 0.68s |
| 114 | RecipesView — sửa & xóa món | sửa món chưa có nguyên liệu → dùng nguyên liệu mặc định; thiếu mealTypes → bữa Trưa | Đúng như mong đợi | 🟢 PASS | 0.17s |
| 115 | RecipesView — sửa & xóa món | lỗi tải chi tiết → báo lỗi, không mở form | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 116 | RecipesView — sửa & xóa món | xóa sau khi xác nhận thì gọi deleteRecipe và nạp lại; hủy thì không xóa | Đúng như mong đợi | 🟢 PASS | 0.18s |
| 117 | RecipesView — sửa & xóa món | xóa lỗi (vd. món đã có trong nhật ký người dùng) → báo thất bại | Đúng như mong đợi | 🟢 PASS | 0.13s |

</details>

<details><summary><b>src/__tests__/components/ReportViews.test.jsx</b> · 17/18 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 118 | SystemActivityView | hiển thị trạng thái DB, uptime, số yêu cầu AI hôm nay và số cảnh báo an ninh | Đúng như mong đợi | 🟢 PASS | 0.45s |
| 119 | SystemActivityView | nhật ký AI, bữa ăn (kcal làm tròn) và sự kiện an ninh phân loại khóa / dò mật khẩu | Đúng như mong đợi | 🟢 PASS | 0.46s |
| 120 | SystemActivityView | không có dữ liệu → các bảng hiện thông báo trống, hệ thống an toàn | Đúng như mong đợi | 🟢 PASS | 0.10s |
| 121 | SystemActivityView | nút "Làm mới dữ liệu" gọi lại API | Đúng như mong đợi | 🟢 PASS | 0.26s |
| 122 | SystemActivityView | tự làm mới mỗi 30 giây và dừng khi rời màn hình | Đúng như mong đợi | 🟢 PASS | 0.10s |
| 123 | SystemActivityView | lỗi tải → onNotify error | Đúng như mong đợi | 🟢 PASS | 0.11s |
| 124 | RevenueReportView | hiển thị tổng doanh thu, tháng/năm, ARPPU và tỷ lệ thanh toán thành công | Đúng như mong đợi | 🟢 PASS | 0.21s |
| 125 | RevenueReportView | biểu đồ theo ngày: thanh dài nhất 100%, ngày 0đ vẫn hiện tối thiểu 5% | Đúng như mong đợi | 🟢 PASS | 0.16s |
| 126 | RevenueReportView | cơ cấu theo cổng thanh toán và theo gói | Đúng như mong đợi | 🟢 PASS | 0.11s |
| 127 | RevenueReportView | chưa có giao dịch → thông báo trống ở biểu đồ và hai bảng cơ cấu | Đúng như mong đợi | 🟢 PASS | 0.09s |
| 128 | RevenueReportView | chọn khoảng ngày rồi "Lọc Báo Cáo" gửi startDate / endDate | Đúng như mong đợi | 🟢 PASS | 0.65s |
| 129 | RevenueReportView | "Đặt lại" xóa ngày đã chọn và nạp lại báo cáo KHÔNG lọc | AssertionError: expected last "vi.fn()" call to have been called with [ '', '' ] at D:/Sem8/PRM393/SmartMeal/frontend/admin-web/src/__tests__/components/ReportViews.test.jsx:156… | 🔴 FAIL | 0.89s |
| 130 | RevenueReportView | xuất CSV: tạo link tải có tên file theo ngày, nội dung đủ các mốc và báo thành công | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 131 | RevenueReportView | xuất CSV khi chưa có báo cáo thì không làm gì; lỗi tải → onNotify error | Đúng như mong đợi | 🟢 PASS | 0.12s |
| 132 | EngagementAnalyticsView | hiển thị DAU / WAU / MAU, tỷ lệ hoàn thành thử thách và các tổng hoạt động | Đúng như mong đợi | 🟢 PASS | 0.12s |
| 133 | EngagementAnalyticsView | bảng xếp hạng: thứ hạng, tên (mặc định "Người dùng"), số bữa, cấp pet, XP và ngày hoạt động | Đúng như mong đợi | 🟢 PASS | 0.08s |
| 134 | EngagementAnalyticsView | chưa có dữ liệu → giá trị 0 / Lv. 1 và thông báo bảng trống | Đúng như mong đợi | 🟢 PASS | 0.11s |
| 135 | EngagementAnalyticsView | lỗi tải → onNotify error | Đúng như mong đợi | 🟢 PASS | 0.10s |

</details>

<details><summary><b>src/__tests__/components/RewardsView.test.jsx</b> · 14/14 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 136 | RewardsView — thử thách | nạp song song thử thách, huy hiệu, lịch sử XP, người dùng và đếm số trên tab | Đúng như mong đợi | 🟢 PASS | 0.51s |
| 137 | RewardsView — thử thách | bảng thử thách: danh mục, thời hạn, mục tiêu, thưởng, tham gia và trạng thái | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 138 | RewardsView — thử thách | chưa có thử thách → hiện lời mời tạo thử thách đầu tiên | Đúng như mong đợi | 🟢 PASS | 0.04s |
| 139 | RewardsView — thử thách | tạo thử thách mới với dữ liệu nhập và nạp lại danh sách | Đúng như mong đợi | 🟢 PASS | 1.58s |
| 140 | RewardsView — thử thách | tiêu đề trống → báo lỗi, không gọi API | Đúng như mong đợi | 🟢 PASS | 0.36s |
| 141 | RewardsView — thử thách | sửa thử thách: điền sẵn dữ liệu cũ, bỏ chọn "mở" và gửi updateChallenge | Đúng như mong đợi | 🟢 PASS | 0.40s |
| 142 | RewardsView — thử thách | lưu thất bại → báo lỗi | Đúng như mong đợi | 🟢 PASS | 0.27s |
| 143 | RewardsView — thử thách | xóa thử thách sau khi xác nhận thì bỏ khỏi bảng | Đúng như mong đợi | 🟢 PASS | 0.14s |
| 144 | RewardsView — thử thách | lỗi tải dữ liệu → onNotify error | Đúng như mong đợi | 🟢 PASS | 0.03s |
| 145 | RewardsView — huy hiệu & tặng XP | tab Huy hiệu hiển thị tên, mô tả, danh mục (mặc định "Thành Tích") và số người mở khóa | Đúng như mong đợi | 🟢 PASS | 0.20s |
| 146 | RewardsView — huy hiệu & tặng XP | tab XP: chọn sẵn người dùng đầu tiên, tặng XP và nạp lại lịch sử | Đúng như mong đợi | 🟢 PASS | 0.65s |
| 147 | RewardsView — huy hiệu & tặng XP | không có người dùng → báo phải chọn người nhận | Đúng như mong đợi | 🟢 PASS | 0.20s |
| 148 | RewardsView — huy hiệu & tặng XP | tặng XP lỗi → báo thất bại; lịch sử trống → hiện thông báo | Đúng như mong đợi | 🟢 PASS | 0.23s |
| 149 | RewardsView — huy hiệu & tặng XP | danh sách thử thách mẫu không bị ảnh hưởng khi chuyển tab qua lại | Đúng như mong đợi | 🟢 PASS | 0.30s |

</details>

<details><summary><b>src/__tests__/components/ShellComponents.test.jsx</b> · 14/14 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 150 | Sidebar | hiển thị đủ 8 mục menu và đánh dấu mục đang mở | Đúng như mong đợi | 🟢 PASS | 0.39s |
| 151 | Sidebar | bấm mục dashboard gọi setActiveTab với đúng id | Đúng như mong đợi | 🟢 PASS | 0.12s |
| 152 | Sidebar | bấm mục users gọi setActiveTab với đúng id | Đúng như mong đợi | 🟢 PASS | 0.09s |
| 153 | Sidebar | bấm mục recipes gọi setActiveTab với đúng id | Đúng như mong đợi | 🟢 PASS | 0.08s |
| 154 | Sidebar | bấm mục rewards gọi setActiveTab với đúng id | Đúng như mong đợi | 🟢 PASS | 0.11s |
| 155 | Sidebar | bấm mục system gọi setActiveTab với đúng id | Đúng như mong đợi | 🟢 PASS | 0.11s |
| 156 | Sidebar | bấm mục revenue gọi setActiveTab với đúng id | Đúng như mong đợi | 🟢 PASS | 0.09s |
| 157 | Sidebar | bấm mục engagement gọi setActiveTab với đúng id | Đúng như mong đợi | 🟢 PASS | 0.12s |
| 158 | Sidebar | bấm mục subscriptions gọi setActiveTab với đúng id | Đúng như mong đợi | 🟢 PASS | 0.09s |
| 159 | Sidebar | hiển thị chữ cái đầu, tên và vai trò của admin; nút đăng xuất gọi onLogout | Đúng như mong đợi | 🟢 PASS | 0.06s |
| 160 | Sidebar | dùng tên/vai trò mặc định khi thiếu thông tin user | Đúng như mong đợi | 🟢 PASS | 0.03s |
| 161 | Topbar | hiển thị tiêu đề trang và gọi onRefresh khi bấm "Làm mới" | Đúng như mong đợi | 🟢 PASS | 0.06s |
| 162 | Topbar | khóa nút "Làm mới" và quay icon khi đang tải | Đúng như mong đợi | 🟢 PASS | 0.02s |
| 163 | Topbar | chỉ hiện nút "Thêm Món Ăn" khi có handler | Đúng như mong đợi | 🟢 PASS | 0.09s |

</details>

<details><summary><b>src/__tests__/components/SubscriptionsView.test.jsx</b> · 8/9 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 164 | SubscriptionsView — gói hội viên | hiển thị giá, chu kỳ, nhãn phổ biến, số thành viên, doanh thu và đặc quyền | Đúng như mong đợi | 🟢 PASS | 0.64s |
| 165 | SubscriptionsView — giao dịch | nạp trang 1 (20 giao dịch/trang) và hiển thị mã đơn, cổng, thời gian khớp, trạng thái | Đúng như mong đợi | 🟢 PASS | 0.21s |
| 166 | SubscriptionsView — giao dịch | chỉ giao dịch chưa thanh toán mới có nút "Duyệt Đơn" | Đúng như mong đợi | 🟢 PASS | 0.17s |
| 167 | SubscriptionsView — giao dịch | duyệt đơn sau khi xác nhận → kích hoạt Pro và nạp lại | Đúng như mong đợi | 🟢 PASS | 0.24s |
| 168 | SubscriptionsView — giao dịch | đang duyệt thì nút bị khóa và đổi chữ "Đang duyệt..." | Đúng như mong đợi | 🟢 PASS | 0.23s |
| 169 | SubscriptionsView — giao dịch | hủy xác nhận thì không duyệt; duyệt lỗi thì báo thất bại | Đúng như mong đợi | 🟢 PASS | 0.36s |
| 170 | SubscriptionsView — giao dịch | lọc theo trạng thái và tìm kiếm thì nạp lại | Đúng như mong đợi | 🟢 PASS | 0.49s |
| 171 | SubscriptionsView — giao dịch | không có giao dịch → thông báo trống; lỗi tải → onNotify error | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 172 | SubscriptionsView — giao dịch | có hơn 20 giao dịch thì admin chuyển được sang trang 2 | AssertionError: expected null not to be null at D:/Sem8/PRM393/SmartMeal/frontend/admin-web/src/__tests__/components/SubscriptionsView.test.jsx:129:22 at async file:///D:/Sem8/P… | 🔴 FAIL | 0.18s |

</details>

<details><summary><b>src/__tests__/components/UsersView.test.jsx</b> · 20/21 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 173 | UsersView — danh sách & bộ lọc | nạp trang 1 (15 người/trang, không lọc) và hiển thị vai trò, gói Pro, trạng thái | Đúng như mong đợi | 🟢 PASS | 0.49s |
| 174 | UsersView — danh sách & bộ lọc | đang tải → hiện thông báo tải; không có kết quả → hiện thông báo trống | Đúng như mong đợi | 🟢 PASS | 0.06s |
| 175 | UsersView — danh sách & bộ lọc | đổi bộ lọc vai trò / gói / trạng thái và ô tìm kiếm thì nạp lại với tham số tương ứng | Đúng như mong đợi | 🟢 PASS | 1.04s |
| 176 | UsersView — danh sách & bộ lọc | lỗi tải danh sách gọi onNotify kiểu error | Đúng như mong đợi | 🟢 PASS | 0.03s |
| 177 | UsersView — danh sách & bộ lọc | có hơn 15 người dùng thì admin chuyển được sang trang 2 | AssertionError: expected null not to be null at D:/Sem8/PRM393/SmartMeal/frontend/admin-web/src/__tests__/components/UsersView.test.jsx:77:22 at async file:///D:/Sem8/PRM393/Sma… | 🔴 FAIL | 0.66s |
| 178 | UsersView — xem chi tiết & phân quyền | xem chi tiết: nạp hồ sơ đầy đủ, hiển thị sức khỏe và số liệu sử dụng | Đúng như mong đợi | 🟢 PASS | 0.34s |
| 179 | UsersView — xem chi tiết & phân quyền | người dùng chưa khai báo sức khỏe → hiện ghi chú chưa hoàn thiện hồ sơ | Đúng như mong đợi | 🟢 PASS | 0.19s |
| 180 | UsersView — xem chi tiết & phân quyền | đổi vai trò User ↔ Admin sau khi xác nhận, rồi nạp lại danh sách | Đúng như mong đợi | 🟢 PASS | 0.22s |
| 181 | UsersView — xem chi tiết & phân quyền | hủy hộp thoại xác nhận thì không đổi vai trò | Đúng như mong đợi | 🟢 PASS | 0.12s |
| 182 | UsersView — xem chi tiết & phân quyền | xóa người dùng sau khi xác nhận; lỗi thì báo thất bại | Đúng như mong đợi | 🟢 PASS | 0.28s |
| 183 | UsersView — cấp / hủy gói Pro | chọn gói Năm tự đặt 365 ngày và gửi cấp Pro | Đúng như mong đợi | 🟢 PASS | 0.35s |
| 184 | UsersView — cấp / hủy gói Pro | nhập số ngày tùy chỉnh được gửi dưới dạng số | Đúng như mong đợi | 🟢 PASS | 0.47s |
| 185 | UsersView — cấp / hủy gói Pro | người dùng đang Pro: nút "Hủy Gói Pro Ngay Lập Tức" hạ về gói miễn phí | Đúng như mong đợi | 🟢 PASS | 0.27s |
| 186 | UsersView — cấp / hủy gói Pro | cấp Pro lỗi thì báo lỗi và giữ hộp thoại | Đúng như mong đợi | 🟢 PASS | 0.26s |
| 187 | UsersView — UC1 Ban user | cấm 7 ngày với lý do tùy chỉnh | Đúng như mong đợi | 🟢 PASS | 0.99s |
| 188 | UsersView — UC1 Ban user | cấm vĩnh viễn gửi durationDays = null; mặc định 30 ngày với lý do vi phạm cộng đồng | Đúng như mong đợi | 🟢 PASS | 0.37s |
| 189 | UsersView — UC1 Ban user | tài khoản đang bị cấm: hộp thoại đề nghị gỡ cấm và gửi isBanned = false | Đúng như mong đợi | 🟢 PASS | 0.27s |
| 190 | UsersView — UC1 Ban user | lỗi khi cấm thì báo thất bại | Đúng như mong đợi | 🟢 PASS | 0.22s |
| 191 | UsersView — UC2 Moderate account | mở form với dữ liệu hiện tại, gửi tên đã trim, vai trò và mật khẩu mới | Đúng như mong đợi | 🟢 PASS | 1.30s |
| 192 | UsersView — UC2 Moderate account | để trống mật khẩu → resetPassword = null; xóa trống tên → giữ tên cũ; bỏ chọn checkbox | Đúng như mong đợi | 🟢 PASS | 0.39s |
| 193 | UsersView — UC2 Moderate account | lỗi kiểm duyệt thì báo thất bại, đóng bằng nút Hủy | Đúng như mong đợi | 🟢 PASS | 0.30s |

</details>

<details><summary><b>src/__tests__/services/api.test.js</b> · 34/34 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 194 | authStorage | lưu và đọc token, thông tin admin | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 195 | authStorage | trả null khi chưa đăng nhập hoặc dữ liệu user bị hỏng | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 196 | authStorage | clear() xóa cả token lẫn user | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 197 | request — header, lỗi và phiên hết hạn | gửi JSON và gắn Bearer token khi đã đăng nhập | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 198 | request — header, lỗi và phiên hết hạn | không gửi header Authorization khi chưa có token | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 199 | request — header, lỗi và phiên hết hạn | ném lỗi với message của backend | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 200 | request — header, lỗi và phiên hết hạn | ghép danh sách errors khi backend không có message | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 201 | request — header, lỗi và phiên hết hạn | dùng thông báo mặc định kèm mã HTTP khi body không phải JSON | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 202 | request — header, lỗi và phiên hết hạn | 401: xóa phiên đăng nhập và phát sự kiện smartmeal_admin_unauthorized | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 203 | request — header, lỗi và phiên hết hạn | 403 không xóa phiên đăng nhập | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 204 | api.login | lưu token + user khi đăng nhập thành công và trả data | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 205 | api.login | không lưu gì khi backend không trả token | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 206 | api — URL, phương thức và payload của từng chức năng | getStats gọi GET /api/admin/stats | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 207 | api — URL, phương thức và payload của từng chức năng | getUserDetail gọi GET /api/admin/users/u1 | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 208 | api — URL, phương thức và payload của từng chức năng | deleteUser gọi DELETE /api/admin/users/u1 | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 209 | api — URL, phương thức và payload của từng chức năng | getRecipeDetail gọi GET /api/admin/recipes/r1 | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 210 | api — URL, phương thức và payload của từng chức năng | deleteRecipe gọi DELETE /api/admin/recipes/r1 | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 211 | api — URL, phương thức và payload của từng chức năng | getPlans gọi GET /api/admin/plans | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 212 | api — URL, phương thức và payload của từng chức năng | approveTransaction gọi PUT /api/admin/transactions/t1/approve | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 213 | api — URL, phương thức và payload của từng chức năng | getChallenges gọi GET /api/admin/rewards/challenges | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 214 | api — URL, phương thức và payload của từng chức năng | deleteChallenge gọi DELETE /api/admin/rewards/challenges/c1 | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 215 | api — URL, phương thức và payload của từng chức năng | getBadges gọi GET /api/admin/rewards/badges | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 216 | api — URL, phương thức và payload của từng chức năng | getXpEvents gọi GET /api/admin/rewards/xp-events | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 217 | api — URL, phương thức và payload của từng chức năng | getSystemActivity gọi GET /api/admin/system/activity | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 218 | api — URL, phương thức và payload của từng chức năng | getEngagementAnalytics gọi GET /api/admin/reports/engagement | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 219 | api — URL, phương thức và payload của từng chức năng | getUsers / getRecipes / getTransactions chuyển params thành query string | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 220 | api — URL, phương thức và payload của từng chức năng | các hàm danh sách trả mảng rỗng khi backend không có data | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 221 | api — URL, phương thức và payload của từng chức năng | updateUserStatus / updateUserRole gửi đúng body | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 222 | api — URL, phương thức và payload của từng chức năng | updateUserSubscription: cấp Pro (mặc định gói tháng 30 ngày) và hủy Pro | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 223 | api — URL, phương thức và payload của từng chức năng | banUser: cấm vĩnh viễn gửi durationDays = null, gỡ cấm gửi isBanned = false | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 224 | api — URL, phương thức và payload của từng chức năng | moderateAccount gửi nguyên payload kiểm duyệt | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 225 | api — URL, phương thức và payload của từng chức năng | createRecipe / updateRecipe trả data của món | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 226 | api — URL, phương thức và payload của từng chức năng | createChallenge / updateChallenge / grantXp gửi đúng endpoint | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 227 | api — URL, phương thức và payload của từng chức năng | getRevenueReport chỉ thêm query khi có chọn ngày | Đúng như mong đợi | 🟢 PASS | 0.00s |

</details>

### A.3 Admin Web — live test (`src/__tests__/live/`, gọi backend Docker thật)

<details><summary><b>src/__tests__/live/adminApi.live.test.js</b> · 20/20 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 228 | Admin Web ↔ backend thật (services/api.js) › Đăng nhập | đăng nhập bằng tài khoản admin lưu token + hồ sơ quyền Admin | Đúng như mong đợi | 🟢 PASS | 0.17s |
| 229 | Admin Web ↔ backend thật (services/api.js) › Đăng nhập | sai mật khẩu → lỗi tiếng Việt từ backend | Đúng như mong đợi | 🟢 PASS | 0.17s |
| 230 | Admin Web ↔ backend thật (services/api.js) › Đăng nhập | tài khoản người dùng thường bị từ chối ở cổng Admin | Đúng như mong đợi | 🟢 PASS | 0.33s |
| 231 | Admin Web ↔ backend thật (services/api.js) › Đăng nhập | token không hợp lệ → 401, api.js xóa phiên và phát sự kiện hết phiên | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 232 | Admin Web ↔ backend thật (services/api.js) › Bảng điều khiển & người dùng | thống kê tổng quan nhất quán (hoạt động + bị khóa = tổng; đủ 4 bữa; 2 gói) | Đúng như mong đợi | 🟢 PASS | 0.17s |
| 233 | Admin Web ↔ backend thật (services/api.js) › Bảng điều khiển & người dùng | tìm người dùng vừa đăng ký trên app và xem chi tiết | Đúng như mong đợi | 🟢 PASS | 0.34s |
| 234 | Admin Web ↔ backend thật (services/api.js) › Bảng điều khiển & người dùng | UC1: cấm 7 ngày chặn đăng nhập app (423), gỡ cấm thì đăng nhập lại được | Đúng như mong đợi | 🟢 PASS | 0.52s |
| 235 | Admin Web ↔ backend thật (services/api.js) › Bảng điều khiển & người dùng | UC2: kiểm duyệt đổi tên + đặt lại mật khẩu, người dùng đăng nhập bằng mật khẩu mới | Đúng như mong đợi | 🟢 PASS | 0.66s |
| 236 | Admin Web ↔ backend thật (services/api.js) › Bảng điều khiển & người dùng | cấp gói Pro năm rồi hủy — app thấy đúng trạng thái gói | Đúng như mong đợi | 🟢 PASS | 0.41s |
| 237 | Admin Web ↔ backend thật (services/api.js) › Bảng điều khiển & người dùng | xóa người dùng → tài khoản biến mất, token cũ bị từ chối | Đúng như mong đợi | 🟢 PASS | 0.40s |
| 238 | Admin Web ↔ backend thật (services/api.js) › Món ăn | vòng đời món ăn từ form Admin: tạo → app thấy → sửa → xóa | Đúng như mong đợi | 🟢 PASS | 0.46s |
| 239 | Admin Web ↔ backend thật (services/api.js) › Món ăn | mọi tag trên form Admin đều tồn tại ở backend | Đúng như mong đợi | 🟢 PASS | 0.19s |
| 240 | Admin Web ↔ backend thật (services/api.js) › Món ăn | trùng tên món → thông báo lỗi của backend hiển thị nguyên văn | Đúng như mong đợi | 🟢 PASS | 0.21s |
| 241 | Admin Web ↔ backend thật (services/api.js) › Món ăn | bộ lọc của lưới món ăn (bữa / độ khó / tìm kiếm) trả đúng món | Đúng như mong đợi | 🟢 PASS | 0.22s |
| 242 | Admin Web ↔ backend thật (services/api.js) › Gói, giao dịch, phần thưởng, báo cáo | gói hội viên trên web trùng giá với gói app bán | Đúng như mong đợi | 🟢 PASS | 0.19s |
| 243 | Admin Web ↔ backend thật (services/api.js) › Gói, giao dịch, phần thưởng, báo cáo | duyệt đơn chuyển khoản SePay đang chờ → người dùng thành Pro | Đúng như mong đợi | 🟢 PASS | 0.39s |
| 244 | Admin Web ↔ backend thật (services/api.js) › Gói, giao dịch, phần thưởng, báo cáo | thử thách: tạo từ form mặc định → sửa → xóa, app thấy thử thách khi đang mở | Đúng như mong đợi | 🟢 PASS | 0.40s |
| 245 | Admin Web ↔ backend thật (services/api.js) › Gói, giao dịch, phần thưởng, báo cáo | tặng 600 XP → pet của người dùng lên cấp 2 và có trong nhật ký XP | Đúng như mong đợi | 🟢 PASS | 0.38s |
| 246 | Admin Web ↔ backend thật (services/api.js) › Gói, giao dịch, phần thưởng, báo cáo | giám sát hệ thống & tương tác thấy bữa ăn người dùng vừa ghi | Đúng như mong đợi | 🟢 PASS | 0.38s |
| 247 | Admin Web ↔ backend thật (services/api.js) › Gói, giao dịch, phần thưởng, báo cáo | báo cáo doanh thu có 7 mốc ngày và tỷ lệ thành công trong 0–100% | Đúng như mong đợi | 🟢 PASS | 0.18s |

</details>


<!-- APPENDIX:END -->

## Phụ lục B: Cách chạy lại

```bash
# 1) Admin Web — unit test + coverage (tại frontend/admin-web)
npm ci
npm test                     # = vitest run
npm run test:coverage        # coverage v8 (thêm --coverage.reportOnFailure để vẫn in coverage khi có test FAIL)

# 2) Backend — AdminApiTests (Git Bash, tại thư mục gốc repo; PostgreSQL của docker compose đang chạy)
docker compose up -d postgres
MSYS_NO_PATHCONV=1 docker run --rm --network smartmeal_default \
  -v "$PWD/backend:/src" -w /src \
  -e SMARTMEAL_TEST_DB="Host=postgres;Port=5432;Username=postgres;Password=postgrespassword;Database=postgres" \
  mcr.microsoft.com/dotnet/sdk:9.0 dotnet test SmartMeal.sln --filter "FullyQualifiedName~AdminApiTests"

# 3) Admin Web — live test (backend chạy ở :5000 ở chế độ live-test: tắt rate limit/SMTP, không bắt xác minh email)
LIVE_API_URL=http://127.0.0.1:5000/api npx vitest run src/__tests__/live
```

Test mới thêm trong đợt này:

- `backend/SmartMeal.Tests/AdminApiTests.cs`, `backend/SmartMeal.Tests/Infrastructure/DbTheoryAttribute.cs`
- `frontend/admin-web/vitest.config.js`, `frontend/admin-web/src/test/{setup,fixtures,mockApi}.js`
- `frontend/admin-web/src/__tests__/services/api.test.js`
- `frontend/admin-web/src/__tests__/App.test.jsx`
- `frontend/admin-web/src/__tests__/components/{LoginView,ShellComponents,DashboardView,UsersView,RecipesView,RewardsView,SubscriptionsView,ReportViews}.test.jsx`
- `frontend/admin-web/src/__tests__/live/adminApi.live.test.js`
