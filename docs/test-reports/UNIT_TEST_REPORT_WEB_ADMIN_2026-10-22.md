# BÁO CÁO KẾT QUẢ UNIT TEST — WEB ADMIN

## 1. Thông tin chung (General Information)

| Mục | Nội dung |
|---|---|
| **Tên dự án / Repository** | SmartMeal — Admin Web Portal (`DamThanQuy/SmartMeal`, nhánh `main`, commit `f89b8ef` + bản sửa lỗi của đợt này) |
| **Module / Service / File** | **Frontend** `frontend/admin-web/src`: `services/api.js`, `App.jsx` và 12 component (`LoginView`, `Sidebar`, `Topbar`, `Pagination` (mới), `DashboardView`, `UsersView`, `RecipesView`, `RewardsView`, `SubscriptionsView`, `SystemActivityView`, `RevenueReportView`, `EngagementAnalyticsView`) · **Backend** `AdminController.cs` (28 endpoint `/api/admin/*`), `AdminDTOs.cs`, `AuthService.AdminLoginAsync`, `SubscriptionService.ApproveTransactionAsync`, `Program.cs` (`OnTokenValidated`), `JwtTokenService`, `User.TokenVersion` + migration `20261022012402_UserTokenVersion`, `DbInitializer.EnsureAdminAccountAsync`, `ChallengeCategories` |
| **Use case kiểm thử** | Đăng nhập Admin · Bảng điều khiển · Quản lý người dùng · **UC1** Ban user · **UC2** Moderate account · Quản lý món ăn · Gói hội viên & duyệt giao dịch · **UC3** Hệ thống phần thưởng · **UC4** Giám sát hệ thống · **UC5** Báo cáo doanh thu · **UC6** Phân tích tương tác |
| **Test Framework** | **Frontend:** Vitest 5.0.5 + @testing-library/react 16.3.3 + @testing-library/user-event 14.6.8 + jsdom 30.1.3, coverage `@vitest/coverage-v8` · **Backend:** xUnit 2.9.3 + `WebApplicationFactory` (API thật) + PostgreSQL 16 (Docker), coverage coverlet 6.0.2 · **Live:** Vitest chạy `services/api.js` thật với backend Docker |
| **Người thực hiện** | AI Assistant (Claude Code) |
| **Ngày thực hiện** | 22/10/2026 — lần 2, sau khi sửa toàn bộ lỗi tìm thấy ở lần 1 (cùng ngày) |
| **Môi trường** | Windows 11 Pro · Node.js 22.19.0 · React 19.3 + Vite 8.3 · Docker (`mcr.microsoft.com/dotnet/sdk:9.0`, `postgres:16-alpine`, image `smartmeal-backend-api` build lại từ mã đã sửa) |

## 2. Tổng quan kết quả (Test Run Summary)

| Chỉ số (Metric) | Backend API quản trị (xUnit) | Admin Web unit (Vitest) | Admin Web live (Vitest + BE thật) | **Tổng** |
|---|---|---|---|---|
| 📦 **Test Suites** | 1 Passed / 1 Total (100%) | 11 Passed / 11 Total (100%) | 1 Passed / 1 Total (100%) | 13 Passed / 13 Total (100%) |
| 🧪 **Test Cases (Specs)** | 79 | 177 | 24 | **280** |
| 🟢 **PASS** | 79 (100%) | 177 (100%) | 24 (100%) | **280 (100%)** |
| 🔴 **FAIL** | 0 (0%) | 0 (0%) | 0 (0%) | **0 (0%)** |
| 🟡 **SKIPPED** | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| ⏱️ **Thời gian chạy (Duration)** | 92.8s (1m33s) | 31.5s | 11.8s | 136.1s (2m16s) |

> Suite: backend = lớp `AdminApiTests`, frontend = 1 file `*.test.js(x)`. Thời gian backend = tổng thời gian các test của lớp (chạy tuần tự trong lớp, song song với các lớp khác của cùng lượt `dotnet test` 371 test / 4m05s).

**So với lần 1 (trước khi sửa):**

| Lần chạy | Backend | Admin Web unit | Admin Web live | Tổng |
|---|---|---|---|---|
| Lần 1 — trước khi sửa | 65 — 40 PASS / **25 FAIL** | 162 — 155 PASS / **7 FAIL** | 20 — 20 PASS | 247 — 215 PASS / **32 FAIL** |
| **Lần 2 — sau khi sửa** | **79 — 79 PASS / 0 FAIL** | **177 — 177 PASS / 0 FAIL** | **24 — 24 PASS** | **280 — 280 PASS / 0 FAIL** |

Cả 32 test FAIL ở lần 1 giữ nguyên kỳ vọng và nay đều PASS (riêng `Approving_the_same_transaction_twice…` được siết thêm: lần duyệt thứ hai phải trả 409). 33 test mới được thêm để khóa hành vi mới và phủ thêm nhánh: 14 backend, 15 giao diện, 4 live — xem mục 3 và mục 4.1.

### 📊 Độ bao phủ mã nguồn (Code Coverage Summary)

**Yêu cầu mức bao phủ tối thiểu (Target): ≥ 80%**

| Chỉ số | Admin Web — toàn bộ `src/` (trừ `main.jsx`) | Backend — `AdminController.cs` | Backend — phần admin (`AdminController.cs` + `AdminDTOs.cs`) |
|---|---|---|---|
| **Statements** | ✅ 93.4% (688/737) | — ¹ | — ¹ |
| **Branches** (Nhánh điều kiện) | ✅ 90.1% (526/584) | ✅ 85.9% (256/298) | ✅ 85.9% (256/298) |
| **Functions** (Hàm) | ✅ 87.2% (224/257) | ✅ 98.1% (53/54) | ✅ 97.9% (275/281) |
| **Lines** | ✅ 94.3% (665/705) | ✅ 99.8% (1198/1201) | ✅ 99.4% (1420/1428) |

¹ coverlet đo theo dòng (sequence point) nên không có số Statements riêng.

Coverage Admin Web theo file:

| File | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| `services/api.js` | 100% (95/95) | 100% (55/55) | 100% (37/37) | 100% (92/92) |
| `App.jsx` | 94.4% (51/54) | 95.0% (38/40) | 92.3% (12/13) | 96.2% (51/53) |
| `components/LoginView.jsx` | 100% (24/24) | 100% (14/14) | 100% (5/5) | 100% (24/24) |
| `components/Pagination.jsx` (mới) | 100% (8/8) | 85.7% (6/7) | 100% (3/3) | 100% (8/8) |
| `components/Sidebar.jsx` | 100% (6/6) | 100% (8/8) | 100% (3/3) | 100% (6/6) |
| `components/Topbar.jsx` | 100% (1/1) | 100% (4/4) | 100% (1/1) | 100% (1/1) |
| `components/DashboardView.jsx` | 95.2% (20/21) | 89.6% (43/48) | 100% (11/11) | 100% (20/20) |
| `components/UsersView.jsx` | 88.6% (140/158) | ❌ 77.8% (84/108) | 80.8% (42/52) | 90.0% (135/150) |
| `components/RecipesView.jsx` | 89.0% (121/136) | 86.0% (80/93) | ❌ 74.6% (44/59) | 88.3% (113/128) |
| `components/RewardsView.jsx` | 90.3% (93/103) | 95.3% (61/64) | ❌ 79.4% (27/34) | 92.0% (92/100) |
| `components/SubscriptionsView.jsx` | 97.8% (45/46) | 91.7% (33/36) | 100% (12/12) | 100% (43/43) |
| `components/SystemActivityView.jsx` | 96.2% (25/26) | 97.5% (39/40) | 100% (8/8) | 100% (24/24) |
| `components/RevenueReportView.jsx` | 100% (41/41) | 97.0% (32/33) | 100% (14/14) | 100% (39/39) |
| `components/EngagementAnalyticsView.jsx` | 100% (18/18) | 85.3% (29/34) | 100% (5/5) | 100% (17/17) |

**Nhận xét coverage:** Admin Web đạt mục tiêu ở cả 4 chỉ số, tăng so với lần 1 (Lines 92.5% → 94.3%, Branches 87.4% → 90.1%) — riêng `UsersView.jsx` tăng từ 68.5% lên 77.8% branches nhờ xóa hộp thoại khóa tài khoản là code chết. Phần còn dưới 80% ở cấp file là các `onChange` của ô nhập số (calo, protein, số ngày) và nhánh hiển thị phụ. Backend: `AdminController` đạt cả 3 chỉ số — Branches tăng từ 74.4% lên 85.9% nhờ các test mới cho bộ lọc Pro hết hạn, người dùng chưa có hồ sơ, 404 / dữ liệu sai khi sửa món và thử thách. Nhánh còn lại chủ yếu là toán tử `?:` trong projection LINQ (người dùng / giao dịch null).

## 3. Chi tiết các Test Case (Unit Test Cases)

Mục 3.1–3.3 trình bày **từng test case** theo form; Phụ lục A liệt kê lại toàn bộ 280 test case kèm thời gian chạy.

### 3.1 Backend — API quản trị (`backend/SmartMeal.Tests/AdminApiTests.cs`, 79 test case)

Mỗi lớp test chạy trên một database PostgreSQL riêng (migration + seed như môi trường thật), dùng tài khoản admin riêng của test (đăng ký thường rồi nâng quyền).

#### 3.1.1 Đăng nhập & phân quyền (`/api/admin/auth/login`, `[Authorize(Roles="Admin")]`)

| # | Function / Endpoint | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 1 | `POST /api/admin/auth/login` | Đăng nhập cổng Admin thành công<br><sub>`Admin_login_returns_a_token_and_the_admin_profile`</sub> | Tài khoản Role=Admin, email viết HOA | 200, có JWT, user.role = Admin, đúng Id, hạn token > hiện tại | Đúng như mong đợi | 🟢 PASS |
| 2 | `POST /api/admin/auth/login` | Sai mật khẩu<br><sub>`Admin_login_with_a_wrong_password_is_rejected_with_401`</sub> | Admin + mật khẩu sai | 401, success = false | Đúng như mong đợi | 🟢 PASS |
| 3 | `POST /api/admin/auth/login` | Người dùng thường đăng nhập cổng Admin<br><sub>`Admin_login_refuses_a_regular_user_with_403`</sub> | Tài khoản Role=User, mật khẩu đúng | 403 Forbidden | Đúng như mong đợi | 🟢 PASS |
| 4 | `POST /api/admin/auth/login` | Email sai định dạng<br><sub>`Admin_login_validates_the_email_format`</sub> | email = "not-an-email" | 400 (model validation) | Đúng như mong đợi | 🟢 PASS |
| 5 | `POST /api/admin/auth/login` | Chống dò mật khẩu cổng Admin<br><sub>`Admin_login_locks_the_account_after_five_wrong_passwords_like_the_app_login`</sub> | 5 lần sai mật khẩu rồi nhập đúng | 423 Locked (như login của app: khóa 15 phút sau 5 lần sai) | Đúng như mong đợi | 🟢 PASS |
| 6 | `POST /api/auth/refresh` | Refresh token do cổng Admin cấp dùng được<br><sub>`The_refresh_token_returned_by_admin_login_can_renew_the_session`</sub> | refreshToken từ admin login | 200, cấp cặp token mới | Đúng như mong đợi | 🟢 PASS |
| 7 | `DbInitializer.EnsureAdminAccountAsync` | Tài khoản admin mặc định không tồn tại ngoài Development<br><sub>`The_default_admin_password_does_not_work_outside_development`</sub> | Môi trường Testing; admin@smartmeal.com / Admin@123456 | 401 (không có tài khoản mặc định) | Đúng như mong đợi | 🟢 PASS |
| 8 | `Program.cs → DbInitializer.SeedAsync` | Tạo admin theo cấu hình Seed:AdminPassword<br><sub>`The_admin_account_is_created_with_the_configured_password`</sub> | Factory Testing + Seed:AdminPassword = "Configured-Adm1n!" | Đăng nhập bằng mật khẩu cấu hình 200; mật khẩu mẫu Admin@123456 → 401 | Đúng như mong đợi | 🟢 PASS |
| 9 | `DbInitializer.EnsureAdminAccountAsync` | Email admin trùng tài khoản thường đã đăng ký trước<br><sub>`Seeding_the_admin_over_an_existing_regular_account_takes_it_away_from_its_registrant`</sub> | User thường đăng ký trước bằng email admin; seed với mật khẩu cấu hình | Mật khẩu cũ 401; token cũ 401; mật khẩu seed đăng nhập Admin 200 | Đúng như mong đợi | 🟢 PASS |
| 10 | `[Authorize(Roles="Admin")]` | 11 endpoint GET /api/admin/* khi chưa đăng nhập<br><sub>`Every_admin_endpoint_requires_a_token`</sub> | Không có Authorization header | Mọi endpoint trả 401 | Đúng như mong đợi | 🟢 PASS |
| 11 | `[Authorize(Roles="Admin")]` | 11 endpoint GET + 1 PUT với token người dùng thường<br><sub>`Every_admin_endpoint_refuses_a_regular_user_token`</sub> | Bearer token Role=User | Mọi endpoint trả 403 | Đúng như mong đợi | 🟢 PASS |

#### 3.1.2 Thống kê tổng quan (`/api/admin/stats`)

| # | Function / Endpoint | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 12 | `GET /api/admin/stats` | Số liệu tổng quan thay đổi đúng theo dữ liệu<br><sub>`Dashboard_stats_count_users_pro_locked_recipes_and_paid_revenue`</sub> | +3 user (1 Pro, 1 bị cấm), +1 giao dịch Paid 100.000đ, +1 Pending | Tổng user +3, Pro +1, khóa +1, active = tổng − khóa, giao dịch +2, doanh thu (tổng/tháng) +100.000, user mới nhất đứng đầu, đủ 4 bữa, 2 gói | Đúng như mong đợi | 🟢 PASS |

#### 3.1.3 Quản lý người dùng (`/api/admin/users`)

| # | Function / Endpoint | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 13 | `GET /api/admin/users` | Lọc theo search / role / status / subscription<br><sub>`User_list_filters_by_search_role_status_and_subscription`</sub> | 3 user cùng mã tìm kiếm: Pro, bị cấm, Free | search (không phân biệt hoa thường) = 3; premium = [Pro]; free = [cấm, Free]; locked = [cấm]; role=Admin chỉ gồm Admin | Đúng như mong đợi | 🟢 PASS |
| 14 | `GET /api/admin/users` | Phân trang + header tổng số<br><sub>`User_list_is_paginated_newest_first_and_exposes_the_total_count`</sub> | 3 user, pageSize = 2 | X-Total-Count = 3; trang 1 có 2 (mới nhất trước), trang 2 có 1 | Đúng như mong đợi | 🟢 PASS |
| 15 | `GET /api/admin/users/{id}` | Chi tiết người dùng<br><sub>`User_detail_includes_the_health_profile_and_activity_counts`</sub> | User đã khảo sát sức khỏe, ghi 1 bữa, thích 1 món | Có healthProfile (Female, 160 cm, calo mục tiêu > 0); diaries = 1, favorites = 1, mealPlans = 0 | Đúng như mong đợi | 🟢 PASS |
| 16 | `users/{id}: GET, role, ban, moderate, subscription, status, DELETE` | Id không tồn tại<br><sub>`Unknown_users_return_404_on_every_user_action`</sub> | Guid ngẫu nhiên | Mọi thao tác trả 404 | Đúng như mong đợi | 🟢 PASS |
| 17 | `GET /api/admin/users, /users/{id}` | Lọc Pro hết hạn; chi tiết user chưa có hồ sơ<br><sub>`Expired_pro_users_are_listed_separately_and_users_without_a_profile_have_an_empty_detail`</sub> | User Pro hết hạn 3 ngày, chưa khảo sát sức khỏe | subscription=expired = [user] (isPro false); premium = []; healthProfile null; 0/0/0 hoạt động | Đúng như mong đợi | 🟢 PASS |
| 18 | `PUT /api/admin/users/{id}/role` | Nâng / hạ quyền<br><sub>`Promoting_a_user_to_admin_opens_the_admin_portal_and_demoting_closes_it`</sub> | role = "admin" rồi "User" | Sau nâng: đăng nhập Admin 200; sau hạ: 403 | Đúng như mong đợi | 🟢 PASS |
| 19 | `PUT /api/admin/users/{id}/role` | Thu hồi quyền Admin có hiệu lực ngay<br><sub>`A_demoted_admin_loses_admin_access_with_the_token_already_issued`</sub> | Admin B đang có token; Admin A hạ B về User | Token cũ của B gọi /api/admin/users → 403 | Đúng như mong đợi | 🟢 PASS |
| 20 | `OnTokenValidated (vai trò từ DB)` | Nâng quyền có hiệu lực ngay với token đang dùng<br><sub>`A_promoted_user_gets_admin_access_with_the_token_already_issued`</sub> | User thường (token cũ) được nâng lên Admin | Trước: /api/admin/stats 403; sau: 200 (không cần đăng nhập lại) | Đúng như mong đợi | 🟢 PASS |
| 21 | `PUT /api/admin/users/{id}/role` | Vai trò không hợp lệ<br><sub>`An_unknown_role_is_rejected_instead_of_silently_demoting`</sub> | role = "SuperAdmin" cho một admin khác | 400; admin kia vẫn giữ quyền (stats 200) | Đúng như mong đợi | 🟢 PASS |
| 22 | `PUT /api/admin/users/{id}/role` | Tự hạ quyền chính mình<br><sub>`An_admin_cannot_demote_their_own_account`</sub> | id = admin đang đăng nhập, role = User | 400 (như đã chặn tự xóa / tự cấm) | Đúng như mong đợi | 🟢 PASS |
| 23 | `PUT /api/admin/users/{id}/moderate` | Tự hạ quyền qua form kiểm duyệt<br><sub>`An_admin_cannot_demote_their_own_account_through_moderation`</sub> | id = admin đang đăng nhập, role = User | 400 | Đúng như mong đợi | 🟢 PASS |
| 24 | `PUT /api/admin/users/{id}/status` | Tự khóa chính mình<br><sub>`An_admin_cannot_lock_their_own_account_through_the_status_endpoint`</sub> | id = admin đang đăng nhập, isLocked = true | 400 | Đúng như mong đợi | 🟢 PASS |
| 25 | `PUT /api/admin/users/{id}/status` | Khóa rồi mở khóa<br><sub>`Status_endpoint_locks_and_unlocks_an_account`</sub> | isLocked = true → false | Khi khóa: login app 423; mở khóa: login 200 | Đúng như mong đợi | 🟢 PASS |
| 26 | `PUT /api/admin/users/{id}/status` | Khóa tài khoản đăng xuất mọi thiết bị<br><sub>`Locking_an_account_signs_it_out_everywhere`</sub> | User đang đăng nhập; isLocked = true | Token cũ → 401; refresh token cũ → 401 | Đúng như mong đợi | 🟢 PASS |
| 27 | `PUT /api/admin/users/{id}/subscription` | Cấp gói Năm rồi hủy<br><sub>`Granting_and_revoking_pro_is_reflected_in_the_users_subscription_status`</sub> | isPro=true, PRO_YEARLY, 365 ngày → isPro=false | App: isPro, planId PRO_YEARLY, hạn ≈ +365 ngày; sau hủy: Free | Đúng như mong đợi | 🟢 PASS |
| 28 | `PUT /api/admin/users/{id}/subscription` | Số ngày Pro không hợp lệ — `(days: -30)`<br><sub>`Granting_pro_rejects_a_non_positive_duration`</sub> | durationDays = 0 / −30 | 400 | Đúng như mong đợi | 🟢 PASS |
| 29 | `PUT /api/admin/users/{id}/subscription` | Số ngày Pro không hợp lệ — `(days: 0)`<br><sub>`Granting_pro_rejects_a_non_positive_duration`</sub> | durationDays = 0 / −30 | 400 | Đúng như mong đợi | 🟢 PASS |
| 30 | `PUT /api/admin/users/{id}/subscription` | Gói Pro không tồn tại<br><sub>`Granting_pro_rejects_an_unknown_plan`</sub> | planId = "PRO_LIFETIME" | 400; user vẫn Free | Đúng như mong đợi | 🟢 PASS |
| 31 | `DELETE /api/admin/users/{id}` | Xóa tài khoản có giao dịch<br><sub>`Deleting_a_user_removes_the_account_but_keeps_their_payment_history`</sub> | User có 1 giao dịch Paid | 200; chi tiết 404; token cũ 401; giao dịch còn, UserId = null, email "Đã xóa tài khoản" | Đúng như mong đợi | 🟢 PASS |
| 32 | `DELETE users/{id}, PUT users/{id}/ban` | Tự xóa / tự cấm<br><sub>`An_admin_cannot_delete_or_ban_their_own_account`</sub> | id = admin đang đăng nhập | Cả hai 400; admin vẫn dùng được API | Đúng như mong đợi | 🟢 PASS |

#### 3.1.4 UC1 — Ban user (`PUT /api/admin/users/{id}/ban`)

| # | Function / Endpoint | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 33 | `PUT /api/admin/users/{id}/ban` | Cấm rồi gỡ cấm<br><sub>`A_banned_user_cannot_log_in_until_unbanned`</sub> | isBanned = true (30 ngày) → false | Khi cấm: login app 423; sau gỡ: 200 | Đúng như mong đợi | 🟢 PASS |
| 34 | `PUT /api/admin/users/{id}/ban` | Thời hạn cấm — `(days: null)`<br><sub>`Ban_duration_sets_the_lockout_end`</sub> | durationDays = 1 / 30 / null (vĩnh viễn) | isLocked; lockoutEnd ≈ now + 1 / 30 / 18.250 ngày (±5 phút) | Đúng như mong đợi | 🟢 PASS |
| 35 | `PUT /api/admin/users/{id}/ban` | Thời hạn cấm — `(days: 1)`<br><sub>`Ban_duration_sets_the_lockout_end`</sub> | durationDays = 1 / 30 / null (vĩnh viễn) | isLocked; lockoutEnd ≈ now + 1 / 30 / 18.250 ngày (±5 phút) | Đúng như mong đợi | 🟢 PASS |
| 36 | `PUT /api/admin/users/{id}/ban` | Thời hạn cấm — `(days: 30)`<br><sub>`Ban_duration_sets_the_lockout_end`</sub> | durationDays = 1 / 30 / null (vĩnh viễn) | isLocked; lockoutEnd ≈ now + 1 / 30 / 18.250 ngày (±5 phút) | Đúng như mong đợi | 🟢 PASS |
| 37 | `PUT /api/admin/users/{id}/ban` | Cấm phải thu hồi token đang dùng<br><sub>`Banning_a_user_revokes_their_current_access_token`</sub> | User đang đăng nhập (token hợp lệ) bị cấm 30 ngày | GET /api/auth/me bằng token cũ ≠ 200 (UI hứa "thu hồi token ngay lập tức") | Đúng như mong đợi | 🟢 PASS |
| 38 | `PUT /api/admin/users/{id}/ban` | Cấm phải chặn gia hạn phiên<br><sub>`Banning_a_user_revokes_their_refresh_token`</sub> | Refresh token của user bị cấm | POST /api/auth/refresh ≠ 200 | Đúng như mong đợi | 🟢 PASS |

#### 3.1.5 UC2 — Moderate account (`PUT /api/admin/users/{id}/moderate`)

| # | Function / Endpoint | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 39 | `PUT /api/admin/users/{id}/moderate` | Đổi tên (trim), xác minh email, đặt lại mật khẩu<br><sub>`Moderation_renames_verifies_and_resets_the_password`</sub> | fullName " Tên Hợp Lệ ", resetPassword "NewPassw0rd!" | Mật khẩu cũ 401, mới 200; tên = "Tên Hợp Lệ"; role User | Đúng như mong đợi | 🟢 PASS |
| 40 | `PUT /api/admin/users/{id}/moderate` | Gỡ khóa do nhập sai 5 lần<br><sub>`Moderation_clears_a_brute_force_lockout`</sub> | User đang 423, clearLockout = true | Đăng nhập lại 200 | Đúng như mong đợi | 🟢 PASS |
| 41 | `PUT /api/admin/users/{id}/moderate` | Mật khẩu mới phải theo chính sách 8–128 ký tự<br><sub>`Moderation_password_reset_follows_the_password_policy`</sub> | resetPassword = "123" | 400 | Đúng như mong đợi | 🟢 PASS |
| 42 | `PUT /api/admin/users/{id}/moderate` | Đặt lại mật khẩu phải đăng xuất phiên cũ<br><sub>`Moderation_password_reset_signs_out_existing_sessions`</sub> | resetPassword hợp lệ; refresh token cũ | Refresh → 401 (như khi người dùng tự đổi mật khẩu) | Đúng như mong đợi | 🟢 PASS |

#### 3.1.6 Quản lý món ăn (`/api/admin/recipes`)

| # | Function / Endpoint | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 43 | `POST /api/admin/recipes` | Tạo món, app thấy ngay<br><sub>`A_recipe_created_by_the_admin_appears_in_the_app_catalog_with_tags_and_ingredients`</sub> | Món Lunch,Dinner, tag eatClean+highProtein, 1 nguyên liệu có sẵn + 1 mới | Chi tiết đủ tag/2 nguyên liệu, tổng 15 phút; không tạo trùng nguyên liệu; GET /api/recipes/{id} trả đúng tên, bữa, tag | Đúng như mong đợi | 🟢 PASS |
| 44 | `POST /api/admin/recipes` | Trùng tên (khác hoa thường, có khoảng trắng)<br><sub>`Creating_a_recipe_with_an_existing_title_is_rejected`</sub> | Tên món đã có, viết HOA + khoảng trắng | 400 | Đúng như mong đợi | 🟢 PASS |
| 45 | `POST /api/admin/recipes` | Giá trị app không hiểu — `(field: "mealTypes")`<br><sub>`Creating_a_recipe_rejects_values_the_app_cannot_handle`</sub> | difficulty "Impossible" / calo −250 / mealTypes "Brunch" | 400 cho từng trường hợp | Đúng như mong đợi | 🟢 PASS |
| 46 | `POST /api/admin/recipes` | Giá trị app không hiểu — `(field: "calories")`<br><sub>`Creating_a_recipe_rejects_values_the_app_cannot_handle`</sub> | difficulty "Impossible" / calo −250 / mealTypes "Brunch" | 400 cho từng trường hợp | Đúng như mong đợi | 🟢 PASS |
| 47 | `POST /api/admin/recipes` | Giá trị app không hiểu — `(field: "difficulty")`<br><sub>`Creating_a_recipe_rejects_values_the_app_cannot_handle`</sub> | difficulty "Impossible" / calo −250 / mealTypes "Brunch" | 400 cho từng trường hợp | Đúng như mong đợi | 🟢 PASS |
| 48 | `POST /api/admin/recipes` | Tag "Nhanh Gọn (< 15 phút)" chỉ cho món ≤ 15 phút<br><sub>`The_quick_tag_is_only_accepted_for_recipes_of_at_most_15_minutes`</sub> | Món 5 + 20 phút có tag quick; món 5 + 10 phút có tag quick | Món 25 phút → 400 (thông báo nêu 15 phút); món 15 phút tạo được, có tag quick | Đúng như mong đợi | 🟢 PASS |
| 49 | `GET /api/admin/recipes` | Lọc theo tìm kiếm / bữa / độ khó / Pro<br><sub>`Recipe_list_filters_by_search_meal_type_difficulty_and_premium`</sub> | 2 món: Tối-Hard, Sáng-Easy | search = 2 (X-Total-Count = 2); Dinner = [Tối]; easy = [Sáng]; isPremium = [] | Đúng như mong đợi | 🟢 PASS |
| 50 | `PUT /api/admin/recipes/{id}` | Sửa toàn bộ món<br><sub>`Updating_a_recipe_replaces_its_fields_tags_and_ingredients`</sub> | Hard, 510 kcal, Breakfast, tag keto, nguyên liệu Trứng gà (quả) | Trả về đúng các giá trị mới; chỉ còn 1 nguyên liệu | Đúng như mong đợi | 🟢 PASS |
| 51 | `PUT /api/admin/recipes/{id}` | Sửa thành tên của món khác<br><sub>`Updating_a_recipe_to_another_recipes_title_is_rejected`</sub> | Món B đổi tên = tên món A | 400 (như khi tạo) | Đúng như mong đợi | 🟢 PASS |
| 52 | `PUT /api/admin/recipes/{id}` | Sửa món: thêm nguyên liệu mới, đổi ảnh, chuẩn hóa bữa<br><sub>`Updating_a_recipe_can_add_a_new_ingredient_and_change_its_image`</sub> | Ảnh mới, mealTypes "dinner, Dinner, snack", nguyên liệu mới (category/unit trống, amount 0) | Ảnh mới; mealTypes "Dinner,Snack"; Pro; nguyên liệu mới: Other, g, 100 | Đúng như mong đợi | 🟢 PASS |
| 53 | `PUT recipes/{id}, PUT/DELETE rewards/challenges/{id}` | Id không tồn tại; sửa món với bữa không hợp lệ<br><sub>`Unknown_recipes_and_challenges_return_404_and_invalid_recipe_updates_are_rejected`</sub> | Guid ngẫu nhiên; mealTypes "Lunch,Brunch" | Sửa món 404; bữa sai 400; sửa / xóa thử thách 404 | Đúng như mong đợi | 🟢 PASS |
| 54 | `DELETE /api/admin/recipes/{id}` | Xóa món đã được yêu thích<br><sub>`Deleting_a_recipe_removes_it_from_the_admin_list_and_the_app`</sub> | Món có 1 lượt yêu thích | 200; admin 404; app 404; xóa lần 2 → 404 | Đúng như mong đợi | 🟢 PASS |
| 55 | `DELETE /api/admin/recipes/{id}` | Xóa món đã có trong nhật ký ăn uống<br><sub>`Deleting_a_recipe_that_a_user_logged_in_the_diary_keeps_the_diary_entry`</sub> | User ghi 1 bữa có recipeId = món; 1 dòng đi chợ trỏ tới món | 200; dòng nhật ký còn (tên, 420 kcal), RecipeId = null; dòng đi chợ còn, RecipeId = null | Đúng như mong đợi | 🟢 PASS |

#### 3.1.7 Gói hội viên & giao dịch (`/api/admin/plans`, `/api/admin/transactions`)

| # | Function / Endpoint | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 56 | `GET /api/admin/plans` | Giá gói khớp gói app bán<br><sub>`Plans_match_the_public_subscription_catalog`</sub> | — | (id, giá, chu kỳ) trùng /api/subscription/plans | Đúng như mong đợi | 🟢 PASS |
| 57 | `GET /api/admin/transactions` | Lọc trạng thái + tìm theo email<br><sub>`Transactions_filter_by_status_and_search`</sub> | 1 Pending + 1 Paid (Yearly) cùng user | pending = [Pending]; all = 2 giao dịch; tên gói "Gói Năm (Pro Yearly)" | Đúng như mong đợi | 🟢 PASS |
| 58 | `PUT /api/admin/transactions/{id}/approve` | Duyệt đơn chờ gói Năm<br><sub>`Approving_a_pending_transaction_activates_pro_for_the_plan_duration`</sub> | Giao dịch Pending PRO_YEARLY 699.000đ | User Pro, PRO_YEARLY, hạn ≈ +365 ngày; giao dịch Paid, có PaidAt | Đúng như mong đợi | 🟢 PASS |
| 59 | `PUT /api/admin/transactions/{id}/approve` | Duyệt lại đơn đã Paid<br><sub>`Approving_the_same_transaction_twice_does_not_extend_pro_twice`</sub> | Duyệt cùng 1 giao dịch 79.000đ hai lần | Lần 2 trả 409 Conflict; hạn Pro không đổi | Đúng như mong đợi | 🟢 PASS |
| 60 | `PUT /api/admin/transactions/{id}/approve` | Duyệt tay đi qua luồng xác nhận của cổng thanh toán<br><sub>`Approving_a_transaction_notifies_the_user_like_a_gateway_payment`</sub> | Giao dịch Pending của user | User nhận thông báo loại premium "Đã kích hoạt SmartMeal Pro" | Đúng như mong đợi | 🟢 PASS |
| 61 | `PUT /api/admin/transactions/{id}/approve` | Giao dịch không tồn tại<br><sub>`Approving_an_unknown_transaction_returns_404`</sub> | Guid ngẫu nhiên | 404 | Đúng như mong đợi | 🟢 PASS |

#### 3.1.8 UC3 — Hệ thống phần thưởng (`/api/admin/rewards/*`)

| # | Function / Endpoint | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 62 | `POST/PUT/DELETE /api/admin/rewards/challenges` | Vòng đời thử thách<br><sub>`A_challenge_created_updated_and_deleted_by_the_admin_is_mirrored_in_the_app`</sub> | DrinkWater 1.500 ml × 5 ngày; sửa rewardExp = 5, rewardBadge rỗng | App thấy thử thách; sau sửa: tên mới, XP tối thiểu 10, giữ huy hiệu cũ; sau xóa: app không còn | Đúng như mong đợi | 🟢 PASS |
| 63 | `POST /api/admin/rewards/challenges` | Loại thử thách không chấm được — `(category: "Sleep")`<br><sub>`A_challenge_category_the_app_cannot_score_is_rejected`</sub> | category = "NoSugar" (có trên form web) / "Sleep" | 400 (GamificationService chỉ chấm DrinkWater/EatClean/Exercise) | Đúng như mong đợi | 🟢 PASS |
| 64 | `POST /api/admin/rewards/challenges` | Loại thử thách không chấm được — `(category: "NoSugar")`<br><sub>`A_challenge_category_the_app_cannot_score_is_rejected`</sub> | category = "NoSugar" (có trên form web) / "Sleep" | 400 (GamificationService chỉ chấm DrinkWater/EatClean/Exercise) | Đúng như mong đợi | 🟢 PASS |
| 65 | `POST/PUT /api/admin/rewards/challenges` | Chuẩn hóa loại, từ chối loại không hỗ trợ khi sửa, giữ trường để trống<br><sub>`Updating_a_challenge_validates_its_category_and_keeps_omitted_fields`</sub> | Tạo "exercise"; sửa "NoSugar"; sửa với category/rewardBadge trống + ảnh mới | Loại "Exercise"; NoSugar → 400; giữ Exercise và huy hiệu Walker, nhận ảnh mới, isActive false | Đúng như mong đợi | 🟢 PASS |
| 66 | `GET /api/admin/rewards/badges` | Danh sách huy hiệu khớp app và đếm lượt mở khóa<br><sub>`Badge_list_uses_the_app_badge_catalog_and_counts_real_unlocks`</sub> | User ghi bữa đầu → mở "first-log" trong app | Mọi BadgeId thuộc GamificationCatalog; first-log có unlockedCount ≥ 1 | Đúng như mong đợi | 🟢 PASS |
| 67 | `POST /api/admin/rewards/grant-xp` | Tặng 600 XP<br><sub>`Granting_xp_levels_up_the_pet_and_is_logged_as_an_admin_reward`</sub> | xp = 600 cho user mới | Pet: totalXp 600, level 2, 100 XP vào cấp; nhật ký có AdminReward +600 | Đúng như mong đợi | 🟢 PASS |
| 68 | `POST /api/admin/rewards/grant-xp` | XP ngoài khoảng [1, 10.000] — `(xp: 0)`<br><sub>`Granting_xp_outside_1_to_10000_is_rejected`</sub> | xp = 0 / −50 / 10.001 | 400 | Đúng như mong đợi | 🟢 PASS |
| 69 | `POST /api/admin/rewards/grant-xp` | XP ngoài khoảng [1, 10.000] — `(xp: -50)`<br><sub>`Granting_xp_outside_1_to_10000_is_rejected`</sub> | xp = 0 / −50 / 10.001 | 400 | Đúng như mong đợi | 🟢 PASS |
| 70 | `POST /api/admin/rewards/grant-xp` | XP ngoài khoảng [1, 10.000] — `(xp: 10001)`<br><sub>`Granting_xp_outside_1_to_10000_is_rejected`</sub> | xp = 0 / −50 / 10.001 | 400 | Đúng như mong đợi | 🟢 PASS |
| 71 | `POST /api/admin/rewards/grant-xp` | User không tồn tại<br><sub>`Granting_xp_to_an_unknown_user_returns_404`</sub> | userId ngẫu nhiên | 404 | Đúng như mong đợi | 🟢 PASS |

#### 3.1.9 UC4 — Giám sát hệ thống (`/api/admin/system/activity`)

| # | Function / Endpoint | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 72 | `GET /api/admin/system/activity` | Nhật ký bữa ăn + sự kiện an ninh<br><sub>`System_activity_shows_the_latest_meal_logs_and_locked_accounts`</sub> | User ghi "Bún bò" 480 kcal; 1 user bị cấm | Có dòng nhật ký 480 kcal (Lunch); có sự kiện AccountLocked của user bị cấm | Đúng như mong đợi | 🟢 PASS |
| 73 | `GET /api/admin/system/activity` | Uptime là thời gian chạy thật<br><sub>`System_activity_reports_the_real_server_uptime`</sub> | API test vừa khởi động vài phút | serverUptimeHours ∈ [0, 1]; databaseStatus = Healthy; databaseLatencyMs ≥ 0 | Đúng như mong đợi | 🟢 PASS |

#### 3.1.10 UC5 — Báo cáo doanh thu (`/api/admin/reports/revenue`)

| # | Function / Endpoint | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 74 | `GET /api/admin/reports/revenue` | Tổng doanh thu, theo cổng, theo gói, theo ngày<br><sub>`Revenue_report_totals_paid_transactions_by_method_and_plan`</sub> | +Paid 79.000 SEPAY Monthly, +Paid 699.000 PAYOS Yearly, +1 Pending, +1 Failed | Tổng/tháng +778.000; giao dịch +4 (2 thành công, 1 chờ, 1 lỗi); SEPAY +79.000, PAYOS +699.000; 7 mốc, hôm nay +778.000 | Đúng như mong đợi | 🟢 PASS |
| 75 | `GET /api/admin/reports/revenue?startDate&endDate` | Lọc theo khoảng ngày<br><sub>`Revenue_report_honours_the_date_range_chosen_on_the_web`</sub> | Paid 123.000 ngày 15/01/2025 + Paid hôm nay; lọc 01–31/01/2025 | totalRevenue = 123.000; 1 giao dịch thành công; biểu đồ 31 ngày, mốc 15/01 = 123.000 | Đúng như mong đợi | 🟢 PASS |
| 76 | `GET /api/admin/reports/revenue?startDate&endDate` | Khoảng dài và khoảng ngược<br><sub>`Revenue_report_groups_long_ranges_by_month_and_rejects_reversed_ranges`</sub> | 01/01–31/12/2025; 01/02 → 01/01/2025 | Cả năm: 12 mốc theo tháng, mốc đầu "01/2025"; khoảng ngược → 400 | Đúng như mong đợi | 🟢 PASS |

#### 3.1.11 UC6 — Phân tích tương tác (`/api/admin/reports/engagement`)

| # | Function / Endpoint | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 77 | `GET /api/admin/reports/engagement` | DAU/WAU/MAU và tổng nhật ký<br><sub>`Engagement_counts_users_who_logged_meals_today`</sub> | 2 user mới mỗi người ghi 1 bữa | DAU ≥ 2, WAU ≥ DAU, MAU ≥ WAU; tổng nhật ký +2 | Đúng như mong đợi | 🟢 PASS |
| 78 | `GET /api/admin/reports/engagement` | Không ai hoạt động<br><sub>`Engagement_reports_zero_active_users_when_nobody_was_active`</sub> | Database mới, chưa có nhật ký / AI | DAU = WAU = MAU = 0 | Đúng như mong đợi | 🟢 PASS |
| 79 | `GET /api/admin/reports/engagement` | Bảng xếp hạng theo XP trên toàn bộ người dùng<br><sub>`Top_engaged_users_are_ranked_by_xp_across_all_users`</sub> | 12 user mới, user cuối được tặng 10.000 XP | Danh sách giảm dần theo XP; người 10.000 XP đứng hạng 1 | Đúng như mong đợi | 🟢 PASS |



### 3.2 Admin Web — giao diện & lớp API (`frontend/admin-web/src/__tests__/`, 177 test case)

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
| 13 | api.login | không gửi token cũ khi đăng nhập | Còn token cũ trong localStorage; api.login | Request đăng nhập không có header Authorization | Đúng như mong đợi | 🟢 PASS |
| 14 | api.login | sai mật khẩu (401) chỉ ném lỗi đăng nhập, không phát sự kiện hết phiên | POST /admin/auth/login trả 401 | Ném lỗi "Email hoặc mật khẩu không chính xác."; không phát smartmeal_admin_unauthorized | Đúng như mong đợi | 🟢 PASS |
| 15 | danh sách phân trang (getUsers / getRecipes / getTransactions) | getUsers trả { items, total } với total từ header X-Total-Count | data 2 bản ghi + header X-Total-Count = 56 | { items: 2 bản ghi, total: 56 } | Đúng như mong đợi | 🟢 PASS |
| 16 | danh sách phân trang (getUsers / getRecipes / getTransactions) | getRecipes trả { items, total } với total từ header X-Total-Count | data 2 bản ghi + header X-Total-Count = 56 | { items: 2 bản ghi, total: 56 } | Đúng như mong đợi | 🟢 PASS |
| 17 | danh sách phân trang (getUsers / getRecipes / getTransactions) | getTransactions trả { items, total } với total từ header X-Total-Count | data 2 bản ghi + header X-Total-Count = 56 | { items: 2 bản ghi, total: 56 } | Đúng như mong đợi | 🟢 PASS |
| 18 | danh sách phân trang (getUsers / getRecipes / getTransactions) | thiếu header tổng số thì total = số bản ghi đã nhận; không có data thì danh sách rỗng | Không có header; data null + header 0 | { items: [a], total: 1 }; { items: [], total: 0 } | Đúng như mong đợi | 🟢 PASS |
| 19 | api — URL, phương thức và payload của từng chức năng | getStats gọi GET /api/admin/stats | api.getStats() | fetch GET /api/admin/stats | Đúng như mong đợi | 🟢 PASS |
| 20 | api — URL, phương thức và payload của từng chức năng | getUserDetail gọi GET /api/admin/users/u1 | api.getUserDetail('u1') | fetch GET /api/admin/users/u1 | Đúng như mong đợi | 🟢 PASS |
| 21 | api — URL, phương thức và payload của từng chức năng | deleteUser gọi DELETE /api/admin/users/u1 | api.deleteUser('u1') | fetch DELETE /api/admin/users/u1 | Đúng như mong đợi | 🟢 PASS |
| 22 | api — URL, phương thức và payload của từng chức năng | getRecipeDetail gọi GET /api/admin/recipes/r1 | api.getRecipeDetail('r1') | fetch GET /api/admin/recipes/r1 | Đúng như mong đợi | 🟢 PASS |
| 23 | api — URL, phương thức và payload của từng chức năng | deleteRecipe gọi DELETE /api/admin/recipes/r1 | api.deleteRecipe('r1') | fetch DELETE /api/admin/recipes/r1 | Đúng như mong đợi | 🟢 PASS |
| 24 | api — URL, phương thức và payload của từng chức năng | getPlans gọi GET /api/admin/plans | api.getPlans() | fetch GET /api/admin/plans | Đúng như mong đợi | 🟢 PASS |
| 25 | api — URL, phương thức và payload của từng chức năng | approveTransaction gọi PUT /api/admin/transactions/t1/approve | api.approveTransaction('t1') | fetch PUT /api/admin/transactions/t1/approve | Đúng như mong đợi | 🟢 PASS |
| 26 | api — URL, phương thức và payload của từng chức năng | getChallenges gọi GET /api/admin/rewards/challenges | api.getChallenges() | fetch GET /api/admin/rewards/challenges | Đúng như mong đợi | 🟢 PASS |
| 27 | api — URL, phương thức và payload của từng chức năng | deleteChallenge gọi DELETE /api/admin/rewards/challenges/c1 | api.deleteChallenge('c1') | fetch DELETE /api/admin/rewards/challenges/c1 | Đúng như mong đợi | 🟢 PASS |
| 28 | api — URL, phương thức và payload của từng chức năng | getBadges gọi GET /api/admin/rewards/badges | api.getBadges() | fetch GET /api/admin/rewards/badges | Đúng như mong đợi | 🟢 PASS |
| 29 | api — URL, phương thức và payload của từng chức năng | getXpEvents gọi GET /api/admin/rewards/xp-events | api.getXpEvents() | fetch GET /api/admin/rewards/xp-events | Đúng như mong đợi | 🟢 PASS |
| 30 | api — URL, phương thức và payload của từng chức năng | getSystemActivity gọi GET /api/admin/system/activity | api.getSystemActivity() | fetch GET /api/admin/system/activity | Đúng như mong đợi | 🟢 PASS |
| 31 | api — URL, phương thức và payload của từng chức năng | getEngagementAnalytics gọi GET /api/admin/reports/engagement | api.getEngagementAnalytics() | fetch GET /api/admin/reports/engagement | Đúng như mong đợi | 🟢 PASS |
| 32 | api — URL, phương thức và payload của từng chức năng | getUsers / getRecipes / getTransactions chuyển params thành query string | Các object params | Query string đúng thứ tự, giữ tham số rỗng | Đúng như mong đợi | 🟢 PASS |
| 33 | api — URL, phương thức và payload của từng chức năng | các hàm danh sách trả mảng rỗng khi backend không có data | data = null | getPlans / getChallenges / getBadges / getXpEvents trả [] | Đúng như mong đợi | 🟢 PASS |
| 34 | api — URL, phương thức và payload của từng chức năng | updateUserStatus / updateUserRole gửi đúng body | (u1, true, "Spam"); (u1, "Admin") | PUT …/status {isLocked, reason}; …/role {role} | Đúng như mong đợi | 🟢 PASS |
| 35 | api — URL, phương thức và payload của từng chức năng | updateUserSubscription: cấp Pro (mặc định gói tháng 30 ngày) và hủy Pro | 3 lần gọi | {PRO_MONTHLY, 30, Premium}; {PRO_YEARLY, 365}; {isPro false, Free} | Đúng như mong đợi | 🟢 PASS |
| 36 | api — URL, phương thức và payload của từng chức năng | banUser: cấm vĩnh viễn gửi durationDays = null, gỡ cấm gửi isBanned = false | 3 lần gọi | {true, lý do, null}; {…, 7}; {false, "", null} | Đúng như mong đợi | 🟢 PASS |
| 37 | api — URL, phương thức và payload của từng chức năng | moderateAccount gửi nguyên payload kiểm duyệt | payload mẫu | PUT …/moderate với đúng payload | Đúng như mong đợi | 🟢 PASS |
| 38 | api — URL, phương thức và payload của từng chức năng | createRecipe / updateRecipe trả data của món | Backend trả {id, title} | POST /api/admin/recipes trả data; PUT /api/admin/recipes/r9 đúng body | Đúng như mong đợi | 🟢 PASS |
| 39 | api — URL, phương thức và payload của từng chức năng | createChallenge / updateChallenge / grantXp gửi đúng endpoint | 3 lần gọi | POST/PUT …/challenges; grant-xp {userId, xp, lý do mặc định} | Đúng như mong đợi | 🟢 PASS |
| 40 | api — URL, phương thức và payload của từng chức năng | getRevenueReport chỉ thêm query khi có chọn ngày | (), (start), (start, end) | Không query / ?startDate= / ?startDate=&endDate= | Đúng như mong đợi | 🟢 PASS |

#### 3.2.2 `App.jsx` — đăng nhập / đăng xuất, điều hướng, toast

_File: `frontend/admin-web/src/__tests__/App.test.jsx`_

| # | Function / Component | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 41 | App — đăng nhập / đăng xuất | chưa đăng nhập thì chỉ hiện trang đăng nhập, không gọi API thống kê | localStorage trống | Hiện nút "Đăng Nhập Quản Trị", không có menu, không gọi getStats | Đúng như mong đợi | 🟢 PASS |
| 42 | App — đăng nhập / đăng xuất | đăng nhập thành công → vào Bảng điều khiển, chào admin và nạp thống kê | api.login trả admin; nhập email + mật khẩu rồi bấm Đăng nhập | Toast "Chào mừng Quản trị viên …", tiêu đề Bảng điều khiển, getStats được gọi, hiện "38 đang hoạt động" | Đúng như mong đợi | 🟢 PASS |
| 43 | App — đăng nhập / đăng xuất | đã có phiên trong localStorage → vào thẳng Bảng điều khiển với tên admin | Token + user trong localStorage | Vào thẳng dashboard, sidebar có tên admin, số liệu hiển thị | Đúng như mong đợi | 🟢 PASS |
| 44 | App — đăng nhập / đăng xuất | đăng xuất xóa phiên, quay về trang đăng nhập và báo đã đăng xuất | Đang đăng nhập; bấm Đăng xuất | Về trang đăng nhập, toast "Đã đăng xuất…", token = null | Đúng như mong đợi | 🟢 PASS |
| 45 | App — đăng nhập / đăng xuất | phiên hết hạn (sự kiện 401 từ api) → quay về trang đăng nhập kèm thông báo | Phát sự kiện smartmeal_admin_unauthorized | Về trang đăng nhập + toast "Phiên làm việc đã hết hạn…" | Đúng như mong đợi | 🟢 PASS |
| 46 | App — đăng nhập / đăng xuất | nhập sai mật khẩu chỉ báo lỗi đăng nhập, không báo "Phiên làm việc đã hết hạn" | api.login thật; nhập tài khoản rồi đăng nhập, backend trả 401 "Email hoặc mật khẩu không chính xác." | Chỉ hiện lỗi đăng nhập; KHÔNG có toast "Phiên làm việc đã hết hạn" | Đúng như mong đợi | 🟢 PASS |
| 47 | App — điều hướng & thông báo | menu "Quản Lý Người Dùng" mở trang "Quản Lý Người Dùng & Kiểm Duyệt Tài Khoản" và nạp dữ liệu | Đang đăng nhập; bấm mục menu | Tiêu đề trang đổi đúng và API của màn hình được gọi | Đúng như mong đợi | 🟢 PASS |
| 48 | App — điều hướng & thông báo | menu "Quản Lý Món Ăn" mở trang "Quản Lý Thực Đơn & Món Ăn" và nạp dữ liệu | Đang đăng nhập; bấm mục menu | Tiêu đề trang đổi đúng và API của màn hình được gọi | Đúng như mong đợi | 🟢 PASS |
| 49 | App — điều hướng & thông báo | menu "Hệ Thống Phần Thưởng" mở trang "Quản Lý Hệ Thống Phần Thưởng (Rewards)" và nạp dữ liệu | Đang đăng nhập; bấm mục menu | Tiêu đề trang đổi đúng và API của màn hình được gọi | Đúng như mong đợi | 🟢 PASS |
| 50 | App — điều hướng & thông báo | menu "Giám Sát Hệ Thống" mở trang "Giám Sát Hoạt Động Hệ Thống (System Activity)" và nạp dữ liệu | Đang đăng nhập; bấm mục menu | Tiêu đề trang đổi đúng và API của màn hình được gọi | Đúng như mong đợi | 🟢 PASS |
| 51 | App — điều hướng & thông báo | menu "Báo Cáo Doanh Thu" mở trang "Báo Cáo Doanh Thu Tài Chính (Revenue Report)" và nạp dữ liệu | Đang đăng nhập; bấm mục menu | Tiêu đề trang đổi đúng và API của màn hình được gọi | Đúng như mong đợi | 🟢 PASS |
| 52 | App — điều hướng & thông báo | menu "Phân Tích Tương Tác" mở trang "Phân Tích Mức Độ Tương Tác (Engagement Analytics)" và nạp dữ liệu | Đang đăng nhập; bấm mục menu | Tiêu đề trang đổi đúng và API của màn hình được gọi | Đúng như mong đợi | 🟢 PASS |
| 53 | App — điều hướng & thông báo | menu "Gói Member & Giao Dịch" mở trang "Quản Lý Gói Hội Viên & Giao Dịch" và nạp dữ liệu | Đang đăng nhập; bấm mục menu | Tiêu đề trang đổi đúng và API của màn hình được gọi | Đúng như mong đợi | 🟢 PASS |
| 54 | App — điều hướng & thông báo | nút "Thêm Món Ăn" trên thanh trên mở tab Món ăn với form thêm món | Bấm "Thêm Món Ăn" ở Topbar | Chuyển tab Món ăn, mở form "Thêm Món Ăn Mới…" | Đúng như mong đợi | 🟢 PASS |
| 55 | App — điều hướng & thông báo | nút "Làm mới" nạp lại thống kê | Bấm "Làm mới" | getStats được gọi lần 2 | Đúng như mong đợi | 🟢 PASS |
| 56 | App — điều hướng & thông báo | lỗi nạp thống kê hiện toast lỗi | getStats reject "Mất kết nối" | Toast lỗi (class toast-error) "Lỗi nạp thống kê: Mất kết nối" | Đúng như mong đợi | 🟢 PASS |
| 57 | App — điều hướng & thông báo | toast tự ẩn sau 4 giây | Fake timers, có toast | Sau 4,1 s toast biến mất | Đúng như mong đợi | 🟢 PASS |

#### 3.2.3 `LoginView.jsx` — trang đăng nhập

_File: `frontend/admin-web/src/__tests__/components/LoginView.test.jsx`_

| # | Function / Component | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 58 | LoginView | đăng nhập bằng email/mật khẩu đã nhập và báo user cho App | Nhập boss@smartmeal.vn / S3cret-Pass! | api.login(email, mật khẩu); onLoginSuccess(user) | Đúng như mong đợi | 🟢 PASS |
| 59 | LoginView | khóa nút và hiện "Đang xác thực..." trong lúc chờ backend | api.login treo (Promise chưa resolve) | Nút disabled + "Đang xác thực..."; xong thì mở lại | Đúng như mong đợi | 🟢 PASS |
| 60 | LoginView | hiện thông báo lỗi của backend và không chuyển trang khi sai mật khẩu | api.login reject "Email hoặc mật khẩu không chính xác." | Hiện lỗi; không gọi onLoginSuccess; nút bật lại | Đúng như mong đợi | 🟢 PASS |
| 61 | LoginView | dùng thông báo mặc định khi lỗi không có nội dung | api.login reject Error("") | "Đăng nhập không thành công." | Đúng như mong đợi | 🟢 PASS |
| 62 | LoginView | báo thiếu thông tin và không gọi API khi để trống email hoặc mật khẩu | Xóa trống 2 ô, submit form | "Vui lòng nhập đầy đủ Email và Mật khẩu."; không gọi API | Đúng như mong đợi | 🟢 PASS |
| 63 | LoginView | nút "Điền Tài Khoản Admin Mặc Định" điền lại form và xóa lỗi cũ | Bản dev (import.meta.env.DEV); đang có lỗi; bấm nút điền mặc định | Email = admin@smartmeal.com, mật khẩu được điền, lỗi biến mất | Đúng như mong đợi | 🟢 PASS |
| 64 | LoginView | [Bảo mật] trang đăng nhập không điền sẵn / không in ra mật khẩu của tài khoản admin | Render trang đăng nhập | Ô mật khẩu trống; trang không chứa "Admin@123456" | Đúng như mong đợi | 🟢 PASS |
| 65 | LoginView | [Bảo mật] bản build production không có nút điền tài khoản admin mẫu | import.meta.env.DEV = false (như vite build), nạp lại LoginView | Không có nút điền tài khoản mẫu; ô email trống | Đúng như mong đợi | 🟢 PASS |

#### 3.2.4 `Sidebar.jsx`, `Topbar.jsx` — khung giao diện

_File: `frontend/admin-web/src/__tests__/components/ShellComponents.test.jsx`_

| # | Function / Component | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 66 | Sidebar | hiển thị đủ 8 mục menu và đánh dấu mục đang mở | activeTab = rewards | 8 mục đúng thứ tự; mục Phần thưởng có class active | Đúng như mong đợi | 🟢 PASS |
| 67 | Sidebar | bấm mục dashboard gọi setActiveTab với đúng id | Bấm mục menu | setActiveTab(id tương ứng) | Đúng như mong đợi | 🟢 PASS |
| 68 | Sidebar | bấm mục users gọi setActiveTab với đúng id | Bấm mục menu | setActiveTab(id tương ứng) | Đúng như mong đợi | 🟢 PASS |
| 69 | Sidebar | bấm mục recipes gọi setActiveTab với đúng id | Bấm mục menu | setActiveTab(id tương ứng) | Đúng như mong đợi | 🟢 PASS |
| 70 | Sidebar | bấm mục rewards gọi setActiveTab với đúng id | Bấm mục menu | setActiveTab(id tương ứng) | Đúng như mong đợi | 🟢 PASS |
| 71 | Sidebar | bấm mục system gọi setActiveTab với đúng id | Bấm mục menu | setActiveTab(id tương ứng) | Đúng như mong đợi | 🟢 PASS |
| 72 | Sidebar | bấm mục revenue gọi setActiveTab với đúng id | Bấm mục menu | setActiveTab(id tương ứng) | Đúng như mong đợi | 🟢 PASS |
| 73 | Sidebar | bấm mục engagement gọi setActiveTab với đúng id | Bấm mục menu | setActiveTab(id tương ứng) | Đúng như mong đợi | 🟢 PASS |
| 74 | Sidebar | bấm mục subscriptions gọi setActiveTab với đúng id | Bấm mục menu | setActiveTab(id tương ứng) | Đúng như mong đợi | 🟢 PASS |
| 75 | Sidebar | hiển thị chữ cái đầu, tên và vai trò của admin; nút đăng xuất gọi onLogout | user = Bảo Nguyễn / Admin | Avatar "B", tên; bấm đăng xuất gọi onLogout | Đúng như mong đợi | 🟢 PASS |
| 76 | Sidebar | dùng tên/vai trò mặc định khi thiếu thông tin user | user = {} | Avatar "A", "Administrator", "Admin" | Đúng như mong đợi | 🟢 PASS |
| 77 | Topbar | hiển thị tiêu đề trang và gọi onRefresh khi bấm "Làm mới" | title + onRefresh | Heading đúng; onRefresh gọi 1 lần | Đúng như mong đợi | 🟢 PASS |
| 78 | Topbar | khóa nút "Làm mới" và quay icon khi đang tải | isRefreshing = true | Nút disabled; icon có class animate-spin | Đúng như mong đợi | 🟢 PASS |
| 79 | Topbar | chỉ hiện nút "Thêm Món Ăn" khi có handler | Có / không có onOpenAddRecipe | Có handler: hiện + gọi được; không: ẩn | Đúng như mong đợi | 🟢 PASS |

#### 3.2.5 `Pagination.jsx` — thanh phân trang dùng chung (MỚI)

_File: `frontend/admin-web/src/__tests__/components/Pagination.test.jsx`_

| # | Function / Component | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 80 | Pagination | ẩn khi mọi bản ghi nằm gọn trong trang đầu | page 1, pageSize 15, total 15 | Không render gì | Đúng như mong đợi | 🟢 PASS |
| 81 | Pagination | trang đầu: hiển thị khoảng bản ghi, tổng số trang và khóa nút "Trang trước" | page 1, pageSize 16, total 56 | "Hiển thị 1–16 / 56 món ăn", "Trang 1 / 4"; Trang trước bị khóa | Đúng như mong đợi | 🟢 PASS |
| 82 | Pagination | bấm "Trang sau" / "Trang trước" báo trang kế tiếp / trước đó | page 2 / 4 | onPageChange(3) rồi onPageChange(1) | Đúng như mong đợi | 🟢 PASS |
| 83 | Pagination | trang cuối: khoảng bản ghi kết thúc ở tổng số và khóa nút "Trang sau" | page 4, total 56 | "Hiển thị 49–56 / 56 món ăn"; Trang sau bị khóa | Đúng như mong đợi | 🟢 PASS |
| 84 | Pagination | vẫn hiện để quay lại khi đang ở trang lớn hơn số trang (vd. vừa xóa bản ghi cuối) | page 2, total 15 (1 trang) | Hiện "Trang 2 / 1", Trang trước bấm được | Đúng như mong đợi | 🟢 PASS |

#### 3.2.6 `DashboardView.jsx` — Bảng điều khiển

_File: `frontend/admin-web/src/__tests__/components/DashboardView.test.jsx`_

| # | Function / Component | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 85 | DashboardView | hiện trạng thái đang tải khi chưa có thống kê | stats = null | "Đang tải dữ liệu tổng quan..." | Đúng như mong đợi | 🟢 PASS |
| 86 | DashboardView | 4 thẻ số liệu: người dùng (hoạt động / bị khóa), Pro + tỉ lệ chuyển đổi, số món, doanh thu VND | fixtures.stats (40 user, 2 khóa, 10 Pro, 1.250.000đ) | 40 / 38 đang hoạt động / 2 bị khóa; tỉ lệ 25%; "1.250.000 ₫", tháng này 158.000 ₫ | Đúng như mong đợi | 🟢 PASS |
| 87 | DashboardView | không hiện "bị khóa" khi không có tài khoản bị khóa và tỉ lệ 0% khi chưa có người dùng | totalUsers = 0, lockedUsers = 0 | Không có chữ "bị khóa"; "Tỉ lệ chuyển đổi: 0%" (không NaN) | Đúng như mong đợi | 🟢 PASS |
| 88 | DashboardView | phân bổ thực đơn theo bữa: số món và phần trăm trên tổng số món | recipesByMealType 10/20/8/2 trên 40 món | "10 món (25%)", "20 món (50%)", "2 món (5%)", nhãn tiếng Việt | Đúng như mong đợi | 🟢 PASS |
| 89 | DashboardView | gói thành viên: tên, giá / chu kỳ, nhãn phổ biến và số người dùng | 2 gói (Tháng, Năm phổ biến) | "79.000 ₫ / 30 ngày", nhãn "Phổ biến", "3 người" | Đúng như mong đợi | 🟢 PASS |
| 90 | DashboardView | giao dịch gần đây hiển thị đúng nhãn trạng thái Paid / Pending / Failed | 3 giao dịch Paid/Pending/Failed | Đã thanh toán / Đang chờ / Thất bại; số tiền VND | Đúng như mong đợi | 🟢 PASS |
| 91 | DashboardView | người dùng mới: vai trò, gói và tên mặc định khi thiếu họ tên | 2 user (Pro; Admin không tên) | "Pro VIP"; "Người dùng"; badge Admin badge-info; "Free" | Đúng như mong đợi | 🟢 PASS |
| 92 | DashboardView | hiện thông báo trống khi chưa có giao dịch / người dùng | recentTransactions = [], recentUsers = [] | "Chưa có giao dịch nào", "Chưa có người dùng" | Đúng như mong đợi | 🟢 PASS |
| 93 | DashboardView | các nút "Xem tất cả / Chi tiết / Quản lý" điều hướng sang đúng tab | Bấm 4 nút | onNavigate: recipes, subscriptions, subscriptions, users | Đúng như mong đợi | 🟢 PASS |

#### 3.2.7 `UsersView.jsx` — Quản lý người dùng, UC1 Ban user, UC2 Moderate account

_File: `frontend/admin-web/src/__tests__/components/UsersView.test.jsx`_

| # | Function / Component | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 94 | UsersView — danh sách & bộ lọc | nạp trang 1 (15 người/trang, không lọc) và hiển thị vai trò, gói Pro, trạng thái | fixtures.users (Pro, Admin, bị khóa) | getUsers({page 1, pageSize 15, …""}); Pro VIP, Hoạt động, "★ Quản trị (Admin)", "Đang bị khóa" | Đúng như mong đợi | 🟢 PASS |
| 95 | UsersView — danh sách & bộ lọc | đang tải → hiện thông báo tải; không có kết quả → hiện thông báo trống | getUsers [] | "Đang tải…" rồi "Không tìm thấy người dùng nào…" | Đúng như mong đợi | 🟢 PASS |
| 96 | UsersView — danh sách & bộ lọc | đổi bộ lọc vai trò / gói / trạng thái và ô tìm kiếm thì nạp lại với tham số tương ứng | Admin, expired, locked, "bot" | getUsers cuối = {search bot, role Admin, status locked, subscription expired} | Đúng như mong đợi | 🟢 PASS |
| 97 | UsersView — danh sách & bộ lọc | lỗi tải danh sách gọi onNotify kiểu error | getUsers reject "500" | onNotify("Lỗi tải danh sách người dùng: 500", error) | Đúng như mong đợi | 🟢 PASS |
| 98 | UsersView — danh sách & bộ lọc | có hơn 15 người dùng thì admin chuyển được sang trang 2 | Trang 1 trả 15 người, total = 16 | "Hiển thị 1–15 / 16 người dùng"; bấm "Trang sau" gọi getUsers({page: 2}) và hiện người thứ 16 | Đúng như mong đợi | 🟢 PASS |
| 99 | UsersView — danh sách & bộ lọc | đổi bộ lọc khi đang ở trang 2 thì quay về trang 1 | 40 người (3 trang); sang trang 2 rồi chọn vai trò Admin | Lần gọi cuối getUsers({page: 1, role: Admin}) | Đúng như mong đợi | 🟢 PASS |
| 100 | UsersView — xem chi tiết & phân quyền | xem chi tiết: nạp hồ sơ đầy đủ, hiển thị sức khỏe và số liệu sử dụng | Bấm xem chi tiết u1 | getUserDetail(u1); "Nữ / 28 tuổi", "160 cm / 58 kg", "1650 kcal", 12 nhật ký; đóng được | Đúng như mong đợi | 🟢 PASS |
| 101 | UsersView — xem chi tiết & phân quyền | người dùng chưa khai báo sức khỏe → hiện ghi chú chưa hoàn thiện hồ sơ | healthProfile = null | "Người dùng chưa hoàn thiện hồ sơ sức khỏe." | Đúng như mong đợi | 🟢 PASS |
| 102 | UsersView — xem chi tiết & phân quyền | đổi vai trò User ↔ Admin sau khi xác nhận, rồi nạp lại danh sách | Bấm badge vai trò của u1 (User) và u2 (Admin) | updateUserRole(u1, Admin), (u2, User); toast; nạp lại | Đúng như mong đợi | 🟢 PASS |
| 103 | UsersView — xem chi tiết & phân quyền | hủy hộp thoại xác nhận thì không đổi vai trò | confirm = false | Không gọi updateUserRole | Đúng như mong đợi | 🟢 PASS |
| 104 | UsersView — xem chi tiết & phân quyền | xóa người dùng sau khi xác nhận; lỗi thì báo thất bại | Xóa u3; rồi xóa u2 bị reject (tự xóa) | deleteUser(u3) + toast; lỗi → onNotify("Xóa người dùng thất bại: …") | Đúng như mong đợi | 🟢 PASS |
| 105 | UsersView — cấp / hủy gói Pro | chọn gói Năm tự đặt 365 ngày và gửi cấp Pro | Cấp Pro cho u2, chọn PRO_YEARLY | Số ngày tự = 365; updateUserSubscription(u2, true, PRO_YEARLY, 365); đóng hộp thoại | Đúng như mong đợi | 🟢 PASS |
| 106 | UsersView — cấp / hủy gói Pro | nhập số ngày tùy chỉnh được gửi dưới dạng số | Nhập 45 ngày | updateUserSubscription(u2, true, PRO_MONTHLY, 45) | Đúng như mong đợi | 🟢 PASS |
| 107 | UsersView — cấp / hủy gói Pro | người dùng đang Pro: nút "Hủy Gói Pro Ngay Lập Tức" hạ về gói miễn phí | u1 đang Pro | updateUserSubscription(u1, false); toast | Đúng như mong đợi | 🟢 PASS |
| 108 | UsersView — cấp / hủy gói Pro | cấp Pro lỗi thì báo lỗi và giữ hộp thoại | API reject | onNotify lỗi; hộp thoại vẫn mở | Đúng như mong đợi | 🟢 PASS |
| 109 | UsersView — UC1 Ban user | cấm 7 ngày với lý do tùy chỉnh | Ban u1, 7 ngày, "Spam bình luận" | banUser(u1, true, "Spam bình luận", 7); toast | Đúng như mong đợi | 🟢 PASS |
| 110 | UsersView — UC1 Ban user | cấm vĩnh viễn gửi durationDays = null; mặc định 30 ngày với lý do vi phạm cộng đồng | Mở ban, chọn "Vĩnh Viễn" | Mặc định 30 + lý do mẫu; banUser(u1, true, lý do, null) | Đúng như mong đợi | 🟢 PASS |
| 111 | UsersView — UC1 Ban user | tài khoản đang bị cấm: hộp thoại đề nghị gỡ cấm và gửi isBanned = false | u3 đang bị khóa | Hiện "Tài khoản này hiện đang bị cấm!"; banUser(u3, false, …); toast gỡ cấm | Đúng như mong đợi | 🟢 PASS |
| 112 | UsersView — UC1 Ban user | lỗi khi cấm thì báo thất bại | banUser reject (tự cấm) | onNotify("Thao tác cấm người dùng thất bại: …", error) | Đúng như mong đợi | 🟢 PASS |
| 113 | UsersView — UC2 Moderate account | tài khoản đang bị cấm: không mặc định gỡ khóa khi kiểm duyệt (giữ lệnh cấm) | Mở kiểm duyệt cho u3 (đang bị khóa), lưu ngay | Ô "Xóa số lần đăng nhập sai" không được chọn; moderateAccount(u3, {clearLockout: false}) | Đúng như mong đợi | 🟢 PASS |
| 114 | UsersView — UC2 Moderate account | mở form với dữ liệu hiện tại, gửi tên đã trim, vai trò và mật khẩu mới | Tên " Lan Anh Nguyễn ", Admin, mật khẩu " NewPass@2026 " | moderateAccount(u1, {fullName đã trim, verified, clearLockout, Admin, resetPassword đã trim}) | Đúng như mong đợi | 🟢 PASS |
| 115 | UsersView — UC2 Moderate account | để trống mật khẩu → resetPassword = null; xóa trống tên → giữ tên cũ; bỏ chọn checkbox | Tên trống, bỏ 2 checkbox | moderateAccount(u2, {fullName "Minh Trần", false, false, Admin, null}) | Đúng như mong đợi | 🟢 PASS |
| 116 | UsersView — UC2 Moderate account | lỗi kiểm duyệt thì báo thất bại, đóng bằng nút Hủy | moderateAccount reject | onNotify lỗi; bấm Hủy đóng hộp thoại | Đúng như mong đợi | 🟢 PASS |

#### 3.2.8 `RecipesView.jsx` — Quản lý món ăn

_File: `frontend/admin-web/src/__tests__/components/RecipesView.test.jsx`_

| # | Function / Component | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 117 | RecipesView — lưới món ăn & bộ lọc | nạp trang 1 (16 món/trang) và hiển thị kcal làm tròn, thời gian, protein, độ khó, nhãn Pro, tối đa 3 tag | fixtures.recipes (Salad Pro 349,6 kcal 4 tag; Bò kho Hard) | getRecipes({page 1, pageSize 16…}); "350 kcal", "15 phút", "32g P", "Dễ", Pro; 3 tag; Bò kho "Khó" badge-danger, mô tả mặc định | Đúng như mong đợi | 🟢 PASS |
| 118 | RecipesView — lưới món ăn & bộ lọc | ảnh lỗi được thay bằng ảnh mặc định | Phát sự kiện error trên ảnh | src chuyển sang ảnh Unsplash mặc định | Đúng như mong đợi | 🟢 PASS |
| 119 | RecipesView — lưới món ăn & bộ lọc | đổi bộ lọc bữa ăn, độ khó và ô tìm kiếm thì nạp lại | Chọn Dinner, Hard, gõ "bò" | getRecipes cuối = {search "bò", mealType Dinner, difficulty Hard} | Đúng như mong đợi | 🟢 PASS |
| 120 | RecipesView — lưới món ăn & bộ lọc | không có món → hiện thông báo trống; lỗi tải → onNotify error | getRecipes [] rồi reject "timeout" | "Không tìm thấy món ăn nào"; onNotify("Lỗi tải danh sách món ăn: timeout", error) | Đúng như mong đợi | 🟢 PASS |
| 121 | RecipesView — lưới món ăn & bộ lọc | có hơn 16 món thì admin chuyển được sang trang 2 | Trang 1 trả 16 món, total = 17 | "Hiển thị 1–16 / 17 món ăn"; bấm "Trang sau" gọi getRecipes({page: 2}) | Đúng như mong đợi | 🟢 PASS |
| 122 | RecipesView — thêm món | form mặc định: bữa Trưa, tag Eat Clean, 1 nguyên liệu ức gà | Bấm "Thêm Món Ăn Mới" | Chip Bữa Trưa + Eat Clean được chọn; có "Ức gà phi lê" | Đúng như mong đợi | 🟢 PASS |
| 123 | RecipesView — thêm món | gửi payload đầy đủ: mealTypes nối bằng dấu phẩy, tag đã chọn, nguyên liệu đã nhập | Tên, +Bữa Tối, tag Vegan (bỏ Eat Clean), Medium, Pro, +nguyên liệu "Đậu hũ" | createRecipe: mealTypes "Lunch,Dinner", tagCodes [vegan], isPremium, 2 nguyên liệu; toast thành công, đóng form, nạp lại | Đúng như mong đợi | 🟢 PASS |
| 124 | RecipesView — thêm món | tên món chỉ có khoảng trắng → báo lỗi, không gọi API | Tên = " " | onNotify("Vui lòng nhập tên món ăn.", error); không gọi createRecipe | Đúng như mong đợi | 🟢 PASS |
| 125 | RecipesView — thêm món | không bỏ chọn được bữa ăn cuối cùng; không xóa được nguyên liệu cuối cùng | Bỏ chọn Bữa Trưa; xóa nguyên liệu | Bữa Trưa vẫn chọn; nút xóa nguyên liệu cuối bị disable; thêm rồi xóa được | Đúng như mong đợi | 🟢 PASS |
| 126 | RecipesView — thêm món | xem trước ảnh khi nhập link ảnh | Nhập URL ảnh | Ảnh xem trước có src = URL | Đúng như mong đợi | 🟢 PASS |
| 127 | RecipesView — thêm món | lỗi khi lưu (vd. trùng tên) → báo lỗi, giữ form mở | createRecipe reject "Tên món ăn này đã tồn tại…" | Toast lỗi; form vẫn mở; nút lưu bật lại | Đúng như mong đợi | 🟢 PASS |
| 128 | RecipesView — thêm món | initialOpenAdd mở sẵn form và báo App reset cờ | initialOpenAdd = true | Form mở sẵn; onResetAddTrigger gọi 1 lần | Đúng như mong đợi | 🟢 PASS |
| 129 | RecipesView — thêm món | đóng form bằng nút Hủy hoặc bấm ra ngoài | Bấm Hủy; bấm overlay | Form đóng cả hai cách | Đúng như mong đợi | 🟢 PASS |
| 130 | RecipesView — thêm món | nhãn tag "quick" khớp định nghĩa của backend (Nhanh Gọn < 15 phút) | Mở form thêm món | Chip tag quick ghi "Nhanh Gọn (< 15 phút)" như backend | Đúng như mong đợi | 🟢 PASS |
| 131 | RecipesView — sửa & xóa món | sửa: nạp chi tiết, tách mealTypes "Breakfast, Lunch" và gửi updateRecipe | Bấm Sửa món r1; đổi tên | getRecipeDetail(r1); chip Sáng + Trưa; updateRecipe(r1, {mealTypes "Breakfast,Lunch", tag eatClean, isPremium}) | Đúng như mong đợi | 🟢 PASS |
| 132 | RecipesView — sửa & xóa món | sửa món chưa có nguyên liệu → dùng nguyên liệu mặc định; thiếu mealTypes → bữa Trưa | detail.mealTypes = "", ingredients = [] | Chip Bữa Trưa; nguyên liệu mặc định "Ức gà phi lê" | Đúng như mong đợi | 🟢 PASS |
| 133 | RecipesView — sửa & xóa món | lỗi tải chi tiết → báo lỗi, không mở form | getRecipeDetail reject | onNotify lỗi; không mở form | Đúng như mong đợi | 🟢 PASS |
| 134 | RecipesView — sửa & xóa món | xóa sau khi xác nhận thì gọi deleteRecipe và nạp lại; hủy thì không xóa | confirm false rồi true | Lần 1 không gọi; lần 2 deleteRecipe(r2) + toast thành công | Đúng như mong đợi | 🟢 PASS |
| 135 | RecipesView — sửa & xóa món | xóa lỗi (vd. món đã có trong nhật ký người dùng) → báo thất bại | deleteRecipe reject "Đã xảy ra lỗi hệ thống." | onNotify("Xóa món ăn thất bại: …", error) | Đúng như mong đợi | 🟢 PASS |

#### 3.2.9 `RewardsView.jsx` — UC3 Hệ thống phần thưởng

_File: `frontend/admin-web/src/__tests__/components/RewardsView.test.jsx`_

| # | Function / Component | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 136 | RewardsView — thử thách | nạp song song thử thách, huy hiệu, lịch sử XP, người dùng và đếm số trên tab | fixtures (2 thử thách, 2 huy hiệu) | Gọi 4 API (getUsers pageSize 50); tab "(2)" | Đúng như mong đợi | 🟢 PASS |
| 137 | RewardsView — thử thách | bảng thử thách: danh mục, thời hạn, mục tiêu, thưởng, tham gia và trạng thái | 2 thử thách (mở / đóng) | DrinkWater, 7 ngày, 2000 lần/ngày, +150 XP, Water Champion, 12 người, Đang mở; dòng 2 Đã đóng, "Không có mô tả" | Đúng như mong đợi | 🟢 PASS |
| 138 | RewardsView — thử thách | chưa có thử thách → hiện lời mời tạo thử thách đầu tiên | getChallenges [] | "Chưa có thử thách nào. Hãy tạo thử thách đầu tiên!" | Đúng như mong đợi | 🟢 PASS |
| 139 | RewardsView — thử thách | tạo thử thách mới với dữ liệu nhập và nạp lại danh sách | "10.000 bước", Exercise, 14 ngày, 10.000/ngày | createChallenge đúng payload; toast; nạp lại; đóng form | Đúng như mong đợi | 🟢 PASS |
| 140 | RewardsView — thử thách | tiêu đề trống → báo lỗi, không gọi API | Tiêu đề = " " | onNotify("Vui lòng nhập tiêu đề thử thách.", error) | Đúng như mong đợi | 🟢 PASS |
| 141 | RewardsView — thử thách | sửa thử thách: điền sẵn dữ liệu cũ, bỏ chọn "mở" và gửi updateChallenge | Sửa c1, bỏ chọn "mở" | Form điền sẵn; updateChallenge(c1, {…, isActive false}); toast | Đúng như mong đợi | 🟢 PASS |
| 142 | RewardsView — thử thách | lưu thất bại → báo lỗi | updateChallenge reject | onNotify("Lưu thử thách thất bại: …", error) | Đúng như mong đợi | 🟢 PASS |
| 143 | RewardsView — thử thách | xóa thử thách sau khi xác nhận thì bỏ khỏi bảng | confirm = true; xóa c2 | deleteChallenge(c2); dòng biến mất; toast | Đúng như mong đợi | 🟢 PASS |
| 144 | RewardsView — thử thách | lỗi tải dữ liệu → onNotify error | getBadges reject "503" | onNotify("Lỗi tải dữ liệu phần thưởng: 503", "error") | Đúng như mong đợi | 🟢 PASS |
| 145 | RewardsView — huy hiệu & tặng XP | tab Huy hiệu hiển thị tên, mô tả, danh mục (mặc định "Thành Tích") và số người mở khóa | Bấm tab Huy hiệu | "Khởi đầu", "25 người dùng", danh mục mặc định "Thành Tích"; ẩn nút thêm thử thách | Đúng như mong đợi | 🟢 PASS |
| 146 | RewardsView — huy hiệu & tặng XP | tab XP: chọn sẵn người dùng đầu tiên, tặng XP và nạp lại lịch sử | Chọn u2, 250 XP | Mặc định chọn u1; grantXp(u2, 250, lý do mặc định); toast; "2 sự kiện" | Đúng như mong đợi | 🟢 PASS |
| 147 | RewardsView — huy hiệu & tặng XP | không có người dùng → báo phải chọn người nhận | getUsers []; submit form | onNotify("Vui lòng chọn người dùng nhận XP.", error); không gọi grantXp | Đúng như mong đợi | 🟢 PASS |
| 148 | RewardsView — huy hiệu & tặng XP | tặng XP lỗi → báo thất bại; lịch sử trống → hiện thông báo | getXpEvents []; grantXp reject | "Chưa có lịch sử nhận XP nào."; toast lỗi; nút bật lại | Đúng như mong đợi | 🟢 PASS |
| 149 | RewardsView — huy hiệu & tặng XP | danh sách thử thách mẫu không bị ảnh hưởng khi chuyển tab qua lại | Chuyển tab Huy hiệu → Thử thách | Bảng vẫn đủ 2 thử thách | Đúng như mong đợi | 🟢 PASS |

#### 3.2.10 `SubscriptionsView.jsx` — Gói hội viên & giao dịch

_File: `frontend/admin-web/src/__tests__/components/SubscriptionsView.test.jsx`_

| # | Function / Component | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 150 | SubscriptionsView — gói hội viên | hiển thị giá, chu kỳ, nhãn phổ biến, số thành viên, doanh thu và đặc quyền | fixtures.plans | Tháng: "30 ngày (Hàng tháng)", 79.000 ₫, 7 thành viên, đặc quyền; Năm: "Hàng năm" + "Gói Phổ Biến Nhất" | Đúng như mong đợi | 🟢 PASS |
| 151 | SubscriptionsView — giao dịch | nạp trang 1 (20 giao dịch/trang) và hiển thị mã đơn, cổng, thời gian khớp, trạng thái | fixtures.transactions | getTransactions({page 1, pageSize 20}); #123456 Đã thanh toán + "Khớp:" + "Đã hoàn tất"; Pending SEPAY; #777 Thất bại | Đúng như mong đợi | 🟢 PASS |
| 152 | SubscriptionsView — giao dịch | chỉ giao dịch chưa thanh toán mới có nút "Duyệt Đơn" | 1 Paid, 1 Pending, 1 Failed | 2 nút "Duyệt Đơn"; dòng Paid không có | Đúng như mong đợi | 🟢 PASS |
| 153 | SubscriptionsView — giao dịch | duyệt đơn sau khi xác nhận → kích hoạt Pro và nạp lại | Duyệt t2 (Pending, không có orderCode) | Confirm nêu sessionId; approveTransaction(t2); toast; nạp lại | Đúng như mong đợi | 🟢 PASS |
| 154 | SubscriptionsView — giao dịch | đang duyệt thì nút bị khóa và đổi chữ "Đang duyệt..." | approveTransaction treo | Nút disabled "Đang duyệt..." tới khi xong | Đúng như mong đợi | 🟢 PASS |
| 155 | SubscriptionsView — giao dịch | hủy xác nhận thì không duyệt; duyệt lỗi thì báo thất bại | confirm false; rồi API reject | Không gọi; rồi onNotify lỗi | Đúng như mong đợi | 🟢 PASS |
| 156 | SubscriptionsView — giao dịch | lọc theo trạng thái và tìm kiếm thì nạp lại | Chọn Pending, gõ "minh" | getTransactions({status Pending, search "minh"}) | Đúng như mong đợi | 🟢 PASS |
| 157 | SubscriptionsView — giao dịch | không có giao dịch → thông báo trống; lỗi tải → onNotify error | getTransactions []; getPlans reject | "Không tìm thấy giao dịch nào."; onNotify lỗi | Đúng như mong đợi | 🟢 PASS |
| 158 | SubscriptionsView — giao dịch | có hơn 20 giao dịch thì admin chuyển được sang trang 2 | Trang 1 trả 20 giao dịch, total = 21 | "Hiển thị 1–20 / 21 giao dịch"; bấm "Trang sau" gọi getTransactions({page: 2}) | Đúng như mong đợi | 🟢 PASS |

#### 3.2.11 `SystemActivityView.jsx` (UC4), `RevenueReportView.jsx` (UC5), `EngagementAnalyticsView.jsx` (UC6)

_File: `frontend/admin-web/src/__tests__/components/ReportViews.test.jsx`_

| # | Function / Component | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 159 | SystemActivityView | hiển thị trạng thái DB, uptime, số yêu cầu AI hôm nay và số cảnh báo an ninh | fixtures.activity | Healthy; "31.5 giờ"; 17; 2 cảnh báo; "Kiểm tra kết nối: 3.2 ms" | Đúng như mong đợi | 🟢 PASS |
| 160 | SystemActivityView | DB không kết nối được / thiếu số đo → báo đúng, không hiện số giả | databaseStatus Unavailable, latency null, uptime null | Hiện "Unavailable", "Chưa đo được kết nối", uptime "—"; không có "24 giờ" | Đúng như mong đợi | 🟢 PASS |
| 161 | SystemActivityView | nhật ký AI, bữa ăn (kcal làm tròn) và sự kiện an ninh phân loại khóa / dò mật khẩu | 1 log AI, 1 bữa 512,7 kcal, 2 sự kiện | "snap"; "513 kcal"; dòng 1 "Tài khoản bị khóa", dòng 2 "Cảnh báo brute-force" | Đúng như mong đợi | 🟢 PASS |
| 162 | SystemActivityView | không có dữ liệu → các bảng hiện thông báo trống, hệ thống an toàn | Các danh sách rỗng | 3 thông báo trống; "Hệ thống an toàn"; 0 cảnh báo | Đúng như mong đợi | 🟢 PASS |
| 163 | SystemActivityView | nút "Làm mới dữ liệu" gọi lại API | Bấm "Làm mới dữ liệu" | getSystemActivity gọi lần 2 | Đúng như mong đợi | 🟢 PASS |
| 164 | SystemActivityView | tự làm mới mỗi 30 giây và dừng khi rời màn hình | Fake timers +30 s; unmount; +60 s | Gọi lần 2 sau 30 s; không gọi thêm sau unmount | Đúng như mong đợi | 🟢 PASS |
| 165 | SystemActivityView | lỗi tải → onNotify error | API reject | onNotify("Lỗi tải …: <lỗi>", "error") | Đúng như mong đợi | 🟢 PASS |
| 166 | RevenueReportView | hiển thị tổng doanh thu, tháng/năm, ARPPU và tỷ lệ thanh toán thành công | fixtures.revenue | 1.250.000 ₫; 158.000 ₫; năm 1.250.000 ₫; ARPPU 312.500 ₫; 75%; "6 thành công / 8 tổng đơn"; gọi getRevenueReport("", "") | Đúng như mong đợi | 🟢 PASS |
| 167 | RevenueReportView | biểu đồ theo ngày: thanh dài nhất 100%, ngày 0đ vẫn hiện tối thiểu 5% | 3 mốc 0 / 79.000 / 158.000 | Độ rộng 5% / 50% / 100% | Đúng như mong đợi | 🟢 PASS |
| 168 | RevenueReportView | cơ cấu theo cổng thanh toán và theo gói | revenueByMethod, revenueByPlan | PAYOS 778.000 ₫; có "Gói Năm (Pro Yearly)" | Đúng như mong đợi | 🟢 PASS |
| 169 | RevenueReportView | chưa có giao dịch → thông báo trống ở biểu đồ và hai bảng cơ cấu | Các danh sách rỗng | 3 thông báo trống | Đúng như mong đợi | 🟢 PASS |
| 170 | RevenueReportView | chọn khoảng ngày rồi "Lọc Báo Cáo" gửi startDate / endDate | Chọn 01/10–15/10/2026, bấm Lọc | getRevenueReport("2026-10-01", "2026-10-15") | Đúng như mong đợi | 🟢 PASS |
| 171 | RevenueReportView | "Đặt lại" xóa ngày đã chọn và nạp lại báo cáo KHÔNG lọc | Đã lọc 01–15/10; bấm "Đặt lại" | Ô ngày trống và lần gọi cuối getRevenueReport("", "") | Đúng như mong đợi | 🟢 PASS |
| 172 | RevenueReportView | xuất CSV: tạo link tải có tên file theo ngày, nội dung đủ các mốc và báo thành công | Bấm "Xuất Báo Cáo CSV" | Link download SmartMeal_BaoCaoDoanhThu_<ngày>.csv; có header + "22/10",158000,2; toast thành công; link được gỡ khỏi DOM | Đúng như mong đợi | 🟢 PASS |
| 173 | RevenueReportView | xuất CSV khi chưa có báo cáo thì không làm gì; lỗi tải → onNotify error | getRevenueReport reject; bấm xuất CSV | Báo lỗi tải; không tạo link | Đúng như mong đợi | 🟢 PASS |
| 174 | EngagementAnalyticsView | hiển thị DAU / WAU / MAU, tỷ lệ hoàn thành thử thách và các tổng hoạt động | fixtures.engagement | 12 / 30 / 41; 33.3%; tổng nhật ký, bước chân; "Lv. 3.4" | Đúng như mong đợi | 🟢 PASS |
| 175 | EngagementAnalyticsView | bảng xếp hạng: thứ hạng, tên (mặc định "Người dùng"), số bữa, cấp pet, XP và ngày hoạt động | 2 người dùng top | Hạng 1, 80 bữa, "🐾 Lv. 6", "+2,600 XP"; dòng 2 "Người dùng", ngày "—" | Đúng như mong đợi | 🟢 PASS |
| 176 | EngagementAnalyticsView | chưa có dữ liệu → giá trị 0 / Lv. 1 và thông báo bảng trống | API trả {} | DAU 0; "Lv. 1"; "Chưa có dữ liệu người dùng tích cực." | Đúng như mong đợi | 🟢 PASS |
| 177 | EngagementAnalyticsView | lỗi tải → onNotify error | API reject | onNotify("Lỗi tải …: <lỗi>", "error") | Đúng như mong đợi | 🟢 PASS |



### 3.3 Admin Web — live test với backend thật (`frontend/admin-web/src/__tests__/live/adminApi.live.test.js`, 24 test case)

Chạy `services/api.js` thật (không mock) tới backend Docker (build từ mã đã sửa) ở chế độ live-test (tắt rate limit / SMTP, không bắt xác minh email); dữ liệu tạo ra được dọn sau khi chạy.

| # | Function | Scenario / Test Case Name | Input / Mock Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| 1 | `api.login` | đăng nhập bằng tài khoản admin lưu token + hồ sơ quyền Admin | admin@smartmeal.com / Admin@123456 (form mặc định) | Có token, role Admin, lưu vào localStorage | Đúng như mong đợi | 🟢 PASS |
| 2 | `api.login` | sai mật khẩu → lỗi tiếng Việt từ backend | Mật khẩu sai | Ném lỗi "Email hoặc mật khẩu không chính xác." | Đúng như mong đợi | 🟢 PASS |
| 3 | `api.login` | tài khoản người dùng thường bị từ chối ở cổng Admin | Tài khoản app vừa đăng ký | Ném lỗi "Tài khoản của bạn không có quyền Quản trị viên (Admin)." | Đúng như mong đợi | 🟢 PASS |
| 4 | `request() / api.getStats` | token không hợp lệ → 401, api.js xóa phiên và phát sự kiện hết phiên | Token giả | Ném lỗi; phát smartmeal_admin_unauthorized 1 lần; xóa token | Đúng như mong đợi | 🟢 PASS |
| 5 | `api.getStats` | thống kê tổng quan nhất quán (hoạt động + bị khóa = tổng; đủ 4 bữa; 2 gói) | DB dev hiện tại | active + locked = total; pro + free = total; 4 bữa; 2 gói; có món | Đúng như mong đợi | 🟢 PASS |
| 6 | `api.getUsers / getUserDetail` | tìm người dùng vừa đăng ký trên app và xem chi tiết | Đăng ký user qua /auth/register rồi tìm theo email | Tìm thấy đúng 1 (total = 1); chi tiết đúng email, chưa có hồ sơ sức khỏe, 0 nhật ký | Đúng như mong đợi | 🟢 PASS |
| 7 | `api.banUser` | UC1: cấm 7 ngày chặn đăng nhập app (423), gỡ cấm thì đăng nhập lại được | Cấm 7 ngày → gỡ cấm | Login app 423; lọc locked thấy user; sau gỡ login 200 | Đúng như mong đợi | 🟢 PASS |
| 8 | `api.banUser` | UC1: người đang đăng nhập bị cấm thì token và refresh token mất hiệu lực ngay | User đăng nhập app (có token) rồi bị cấm 1 ngày | /auth/me bằng token cũ 401; /auth/refresh 401 | Đúng như mong đợi | 🟢 PASS |
| 9 | `api.moderateAccount` | UC2: kiểm duyệt đổi tên + đặt lại mật khẩu, người dùng đăng nhập bằng mật khẩu mới | Đổi tên + resetPassword | Chi tiết có tên mới; login bằng mật khẩu mới 200 | Đúng như mong đợi | 🟢 PASS |
| 10 | `api.updateUserSubscription` | cấp gói Pro năm rồi hủy — app thấy đúng trạng thái gói | PRO_YEARLY 365 ngày → hủy | App: isPro + PRO_YEARLY; sau hủy: Free | Đúng như mong đợi | 🟢 PASS |
| 11 | `api.deleteUser` | xóa người dùng → tài khoản biến mất, token cũ bị từ chối | Xóa user vừa tạo | Chi tiết báo "Không tìm thấy người dùng."; /auth/me 401 | Đúng như mong đợi | 🟢 PASS |
| 12 | `api.createRecipe / updateRecipe / deleteRecipe` | vòng đời món ăn từ form Admin: tạo → app thấy → sửa → xóa | Payload = form mặc định RecipesView | mealTypes "Lunch,Dinner", tag eatClean, 25 phút; app trả 200; sửa Hard/Dinner; xóa → 404 | Đúng như mong đợi | 🟢 PASS |
| 13 | `api.createRecipe` | mọi tag trên form Admin đều tồn tại ở backend | 8 tag của AVAILABLE_TAGS, món 15 phút | Món tạo ra có đủ 8 tagCodes | Đúng như mong đợi | 🟢 PASS |
| 14 | `api.createRecipe` | gắn tag "Nhanh Gọn" cho món nấu quá 15 phút → backend từ chối kèm lý do | Form mặc định (25 phút) + tag quick | Ném lỗi nêu "Nhanh Gọn … 15 phút" | Đúng như mong đợi | 🟢 PASS |
| 15 | `api.createRecipe` | trùng tên món → thông báo lỗi của backend hiển thị nguyên văn | Tạo lại món cùng tên | Ném lỗi "Tên món ăn này đã tồn tại trong hệ thống." | Đúng như mong đợi | 🟢 PASS |
| 16 | `api.getRecipes` | bộ lọc của lưới món ăn (bữa / độ khó / tìm kiếm) trả đúng món | Món Snack/Medium mới | Lọc Snack+Medium thấy món; lọc Breakfast trả { items: [], total: 0 } | Đúng như mong đợi | 🟢 PASS |
| 17 | `api.getPlans` | gói hội viên trên web trùng giá với gói app bán | — | (id, giá) trùng /subscription/plans | Đúng như mong đợi | 🟢 PASS |
| 18 | `api.getTransactions / approveTransaction` | duyệt đơn chuyển khoản SePay đang chờ → người dùng thành Pro | User tạo checkout SEPAY gói Tháng | Có 1 đơn Pending; sau duyệt user Pro PRO_MONTHLY, đơn chuyển Paid; duyệt lại → lỗi "đã được thanh toán" | Đúng như mong đợi | 🟢 PASS |
| 19 | `api.createChallenge / updateChallenge / deleteChallenge` | thử thách: tạo từ form mặc định → sửa → xóa, app thấy thử thách khi đang mở | DrinkWater 2.000 × 7 ngày | App thấy; sau sửa tên v2, đóng; sau xóa không còn | Đúng như mong đợi | 🟢 PASS |
| 20 | `api.grantXp / getXpEvents` | tặng 600 XP → pet của người dùng lên cấp 2 và có trong nhật ký XP | 600 XP cho user mới | Pet totalXp 600, level 2; nhật ký có AdminReward +600 | Đúng như mong đợi | 🟢 PASS |
| 21 | `api.getSystemActivity / getEngagementAnalytics` | giám sát hệ thống & tương tác thấy bữa ăn người dùng vừa ghi | User ghi "Cá kho" 333 kcal | Nhật ký có dòng 333 kcal; DAU ≥ 1, MAU ≥ DAU | Đúng như mong đợi | 🟢 PASS |
| 22 | `api.getRevenueReport` | báo cáo doanh thu có 7 mốc ngày và tỷ lệ thành công trong 0–100% | — | 7 mốc; 0 ≤ tỷ lệ ≤ 100; thành công ≤ tổng | Đúng như mong đợi | 🟢 PASS |
| 23 | `api.getRevenueReport` | lọc doanh thu theo khoảng ngày trước khi có dữ liệu → 0đ, biểu đồ đủ từng ngày | 01/01–31/01/2020 | Doanh thu 0, 0 giao dịch, 31 mốc ngày | Đúng như mong đợi | 🟢 PASS |
| 24 | `api.getSystemActivity` | giám sát hệ thống báo trạng thái DB thật và uptime của tiến trình API | Backend Docker đang chạy | databaseStatus Healthy, latency ≥ 0, uptime hợp lý (< 1 năm) | Đúng như mong đợi | 🟢 PASS |


### 3.4 Tổng hợp theo module

| Tầng | Module | Suites | Test cases | 🟢 PASS | 🔴 FAIL | 🟡 SKIPPED |
|---|---|---|---|---|---|---|
| Backend | API quản trị Admin Web (MỚI) (`AdminApiTests`) | 1 | 79 | 79 | 0 | 0 |
| Admin Web (unit) | `App.test.jsx` | 1 | 17 | 17 | 0 | 0 |
| Admin Web (unit) | `components/DashboardView.test.jsx` | 1 | 9 | 9 | 0 | 0 |
| Admin Web (unit) | `components/LoginView.test.jsx` | 1 | 8 | 8 | 0 | 0 |
| Admin Web (unit) | `components/Pagination.test.jsx` | 1 | 5 | 5 | 0 | 0 |
| Admin Web (unit) | `components/RecipesView.test.jsx` | 1 | 19 | 19 | 0 | 0 |
| Admin Web (unit) | `components/ReportViews.test.jsx` | 1 | 19 | 19 | 0 | 0 |
| Admin Web (unit) | `components/RewardsView.test.jsx` | 1 | 14 | 14 | 0 | 0 |
| Admin Web (unit) | `components/ShellComponents.test.jsx` | 1 | 14 | 14 | 0 | 0 |
| Admin Web (unit) | `components/SubscriptionsView.test.jsx` | 1 | 9 | 9 | 0 | 0 |
| Admin Web (unit) | `components/UsersView.test.jsx` | 1 | 23 | 23 | 0 | 0 |
| Admin Web (unit) | `services/api.test.js` | 1 | 40 | 40 | 0 | 0 |
| Admin Web (live) | `live/adminApi.live.test.js` | 1 | 24 | 24 | 0 | 0 |


## 4. Chi tiết các Test Case bị lỗi (Failed Test Cases Log)

✅ **Lần chạy này không còn test case nào FAIL.**

### 4.1 Đối chiếu 32 test FAIL của lần 1 với bản sửa

| Fail (lần 1) | Lỗi | Bản sửa | Test xác nhận (nay PASS) |
|---|---|---|---|
| 01–02 🟥 | Tài khoản admin `admin@smartmeal.com / Admin@123456` được seed ở mọi môi trường và in sẵn trên trang đăng nhập | `Program.cs` + `DbInitializer.SeedAsync(adminPassword, adminEmail)`: chỉ tạo admin khi khai báo `Seed:AdminPassword`, Development mới dùng mật khẩu mẫu; email trùng tài khoản thường thì nâng quyền nhưng đặt lại mật khẩu + thu hồi phiên. `LoginView.jsx`: bỏ giá trị điền sẵn và dòng "Tài khoản mẫu"; nút điền tài khoản mẫu chỉ có khi `import.meta.env.DEV` (đã kiểm tra bundle `vite build` không còn chuỗi mật khẩu). `.env.example` thêm `Seed__AdminPassword` / `Seed__AdminEmail` | `The_default_admin_password_does_not_work_outside_development`, `LoginView › [Bảo mật] …` + mới: `The_admin_account_is_created_with_the_configured_password`, `Seeding_the_admin_over_an_existing_regular_account…`, `LoginView › bản build production không có nút điền…` |
| 03 🟥 | Cổng Admin không chống dò mật khẩu | `AuthService.AdminLoginAsync` dùng chung `VerifyCredentialsAsync` với đăng nhập app (đếm sai, khóa 423); `AdminController.AdminLogin` thêm `[EnableRateLimiting(RateLimitPolicies.Auth)]` | `Admin_login_locks_the_account_after_five_wrong_passwords_like_the_app_login` |
| 04–05 🟥 | Ban không thu hồi phiên đang đăng nhập | Thêm cột `User.TokenVersion` (migration) + claim `token_version` trong JWT; `OnTokenValidated` từ chối token lệch phiên bản. Ban / khóa tài khoản → tăng `TokenVersion` và thu hồi mọi refresh token | `Banning_a_user_revokes_their_current_access_token`, `…_refresh_token` + mới: `Locking_an_account_signs_it_out_everywhere`, live `UC1: người đang đăng nhập bị cấm…` |
| 06 🟧 | Hạ quyền Admin không có hiệu lực ngay | `OnTokenValidated` thay claim Role bằng vai trò đọc từ DB ở mỗi request | `A_demoted_admin_loses_admin_access_with_the_token_already_issued` + mới: `A_promoted_user_gets_admin_access_with_the_token_already_issued` |
| 07–08 🟧 | Admin tự hạ quyền / tự khóa mình | `IsCurrentAdmin` chặn ở `UpdateUserRole`, `UpdateUserStatus`, `ModerateAccount` (cùng kiểu với xóa / cấm); vai trò không phải Admin/User → 400 thay vì âm thầm hạ quyền | `An_admin_cannot_demote_their_own_account`, `An_admin_cannot_lock_their_own_account…` + mới: `…through_moderation`, `An_unknown_role_is_rejected…` |
| 09–10 🟧 | Đặt lại mật khẩu khi kiểm duyệt bỏ qua chính sách, không đăng xuất phiên cũ | `ModerateAccount`: mật khẩu mới 8–128 ký tự; đặt lại → tăng `TokenVersion` + thu hồi refresh token | `Moderation_password_reset_follows_the_password_policy`, `…_signs_out_existing_sessions` |
| 11 🟧 | Xóa món đã có trong nhật ký → 500 | `DeleteRecipe` đặt `RecipeId = null` cho `DiaryItems` / `GroceryItems` trong cùng `SaveChanges` (giữ tên món, calo của người dùng) | `Deleting_a_recipe_that_a_user_logged_in_the_diary_keeps_the_diary_entry` (siết thêm: kiểm cả dòng đi chợ) |
| 12–14 🟧 | Users / Recipes / Transactions không phân trang | `api.js`: `getUsers` / `getRecipes` / `getTransactions` trả `{ items, total }` (đọc `X-Total-Count`); component `Pagination.jsx` dùng chung; đổi bộ lọc quay về trang 1 | 3 test phân trang + mới: `Pagination.test.jsx` (5), `đổi bộ lọc khi đang ở trang 2…`, 4 test `api.test.js` |
| 15–16 🟧 | Lọc doanh thu theo ngày không có tác dụng | `GetRevenueReport(startDate, endDate)`: lọc tổng, số giao dịch, ARPPU, cơ cấu theo khoảng; biểu đồ theo ngày (≤ 62 ngày) hoặc theo tháng; khoảng ngược → 400. `RevenueReportView`: `loadReport(from, to)`, "Đặt lại" gọi `loadReport('', '')` | `Revenue_report_honours_the_date_range_chosen_on_the_web`, `RevenueReportView › "Đặt lại" …` + mới: `Revenue_report_groups_long_ranges_by_month…`, live `lọc doanh thu theo khoảng ngày…` |
| 17 🟨 | Duyệt lại giao dịch đã thanh toán cộng thêm ngày Pro | `SubscriptionService.ApproveTransactionAsync` — dùng chung `ConfirmPaidAsync` (idempotent) với webhook SePay/PayOS, gửi thông báo kích hoạt; đơn đã Paid → 409 | `Approving_the_same_transaction_twice…` + mới: `Approving_a_transaction_notifies_the_user…` |
| 18 🟨 | Danh sách huy hiệu không khớp app | `GetBadges` dựng từ `GamificationCatalog.Badges` (9 huy hiệu thật) | `Badge_list_uses_the_app_badge_catalog_and_counts_real_unlocks` |
| 19–20 🟨 | Tạo được thử thách loại không chấm được | `ChallengeCategories` (DrinkWater / EatClean / Exercise) dùng chung cho `GamificationService` và `Create/UpdateChallenge` (400 với loại khác, chuẩn hóa hoa thường); bỏ "No Sugar" khỏi form | `A_challenge_category_the_app_cannot_score_is_rejected` (2) + mới: `Updating_a_challenge_validates_its_category…` |
| 21 🟨 | Bảng xếp hạng không lấy người có XP cao nhất | Sắp xếp theo XP (rồi số nhật ký) trước khi `Take(8)` | `Top_engaged_users_are_ranked_by_xp_across_all_users` |
| 22–23 🟨 | Chỉ số hệ thống là số giả | Bỏ `Math.Max(1, …)`; uptime = thời gian chạy của tiến trình API; trạng thái DB + độ trễ đo bằng `CanConnectAsync`. `SystemActivityView` bỏ giá trị dự phòng giả ("24 giờ", "< 5ms"), sửa giờ UTC | `Engagement_reports_zero_active_users…`, `System_activity_reports_the_real_server_uptime` + mới: `SystemActivityView › DB không kết nối được…`, live `giám sát hệ thống…` |
| 24–27 🟨 | Thiếu kiểm tra dữ liệu món ăn | `AdminCreateRecipeDto`: độ khó Easy/Medium/Hard, khoảng hợp lệ cho thời gian / khẩu phần / dinh dưỡng / nguyên liệu; `ValidateRecipe`: bữa ăn thuộc 4 loại (chuẩn hóa, bỏ trùng); sửa món kiểm tra trùng tên | 4 test lần 1 + mới: `Updating_a_recipe_can_add_a_new_ingredient…`, `Unknown_recipes_and_challenges_return_404…` |
| 28 🟨 | Sai mật khẩu hiện thêm "Phiên làm việc đã hết hạn" | `api.js`: request đăng nhập gửi ẩn danh; chỉ coi 401 là hết phiên khi request có gửi token | `App › nhập sai mật khẩu…` + mới: 2 test `api.login` |
| 29–30 🟩 | Cấp Pro với số ngày ≤ 0 | `[Range(1, 3650)]` cho `DurationDays`; gói phải có trong `SubscriptionCatalog`; trạng thái luôn Premium | `Granting_pro_rejects_a_non_positive_duration` (2) + mới: `Granting_pro_rejects_an_unknown_plan` |
| 31 🟩 | Refresh token của cổng Admin là giá trị giả | Phiên Admin cấp qua `IssueTokensAsync` (refresh token lưu DB) | `The_refresh_token_returned_by_admin_login_can_renew_the_session` |
| 32 🟩 | Nhãn tag "quick" lệch backend | Nhãn 8 tag trên form khớp đúng tên tag ở backend; backend từ chối tag "Nhanh Gọn" cho món > 15 phút | `RecipesView › nhãn tag "quick"…` + mới: `The_quick_tag_is_only_accepted_for_recipes_of_at_most_15_minutes`, live `gắn tag "Nhanh Gọn"…` |

Sửa thêm các quan sát không có test FAIL ở lần 1: xóa hộp thoại "Khóa / Mở khóa" là code chết trong `UsersView`; Topbar bỏ chữ "(Port 5000)" cố định; form kiểm duyệt **không còn mặc định gỡ khóa** với tài khoản đang bị cấm (trước đây chỉ đổi tên cũng vô tình gỡ lệnh cấm — có test mới).

### 4.2 Thay đổi cần lưu ý khi deploy

| Thay đổi | Ảnh hưởng |
|---|---|
| Migration `20261022012402_UserTokenVersion` (cột `Users.TokenVersion int not null default 0`) | Tự áp khi API khởi động. Token cũ (không có claim) được coi là phiên bản 0 nên **không ai bị đăng xuất** khi nâng cấp |
| Môi trường thật không còn tự tạo admin mặc định | Đặt `Seed__AdminPassword` (tùy chọn `Seed__AdminEmail`) trước khi deploy. **Môi trường đã deploy trước đây vẫn còn tài khoản `admin@smartmeal.com / Admin@123456` → cần đổi mật khẩu ngay** (seed không ghi đè mật khẩu của admin đã có) |
| Đăng nhập Admin dùng rate limit `auth` và khóa 15 phút sau 5 lần sai | Như đăng nhập app; chạy live test cần override rate limit như bộ live mobile |
| Mỗi request có token đọc thêm `Role`, `TokenVersion` từ DB | Thay cho truy vấn kiểm tra tồn tại đã có sẵn — không thêm truy vấn |
| API danh sách của Admin Web trả `{ items, total }` | Chỉ ảnh hưởng mã trong `frontend/admin-web` (đã cập nhật) |

### 4.3 Quan sát còn lại (chưa sửa trong đợt này)

| Quan sát | Vị trí | Ghi chú |
|---|---|---|
| Xóa món làm mất bữa tương ứng trong thực đơn của người dùng mà không báo | `MealPlans.RecipeId` cascade | Cần quyết định nghiệp vụ (giữ bữa với tên món hay xóa mềm món) |
| Admin cấp Pro không tạo giao dịch nên không vào báo cáo doanh thu | `UpdateUserSubscription` | Có thể ghi giao dịch 0đ phương thức "ADMIN" để đối soát |
| Cấm (ban) và khóa do nhập sai mật khẩu dùng chung `LockoutEnd` | `User.LockoutEnd` | "Đặt lại mật khẩu" / "Xóa số lần sai" vẫn gỡ luôn lệnh cấm nếu admin chủ động chọn; muốn tách cần thêm cột riêng cho lệnh cấm |
| Người dùng tự đổi mật khẩu chỉ thu hồi refresh token, access token ở thiết bị khác còn dùng tới khi hết hạn | `AuthService.ChangePasswordAsync` | Có thể tăng `TokenVersion` như admin đặt lại mật khẩu |
| Cảnh báo oxlint ở mã nguồn sẵn có (import thừa, `exhaustive-deps`, `setState` trong effect) | `npx oxlint` | Không lỗi; nên dọn trước khi bật lint trên CI |

### 4.4 Thay đổi hạ tầng test

| Thay đổi | Lý do |
|---|---|
| Admin Web: Vitest + Testing Library (`npm test`, `npm run test:coverage`), `vitest.config.js`, `src/test/{setup,fixtures,mockApi}.js` | Đã có từ lần 1 (commit `de9acce`); lần này cập nhật fixture theo dạng `{ items, total }` |
| `backend/SmartMeal.Tests/Infrastructure/DbTheoryAttribute.cs` | `[Theory]` tự bỏ qua khi không có database |
| Build lại image `smartmeal-backend-api` từ mã đã sửa (migration áp lên DB dev), override live-test trong thư mục tạm; không sửa `backend/.env` | Live test chạy đúng mã mới |

## 5. Kết luận & Đánh giá (Conclusion)

**Trạng thái Code Base:** ✅ **Sẵn sàng merge** phần Admin Web và API quản trị — toàn bộ 280 test PASS, gồm 24 live test với backend thật.

- **Bảo mật:** không còn mật khẩu admin mặc định ở môi trường thật hay trên trang đăng nhập; đăng nhập Admin bị khóa khi dò mật khẩu; ban / khóa / đặt lại mật khẩu đăng xuất người dùng ngay; nâng / hạ quyền có hiệu lực ngay.
- **Nghiệp vụ:** xóa món không còn lỗi 500, có phân trang, lọc doanh thu theo ngày, duyệt giao dịch idempotent, huy hiệu và loại thử thách khớp app, số liệu giám sát / tương tác là số thật, dữ liệu món ăn được kiểm tra trước khi lưu.
- **Không hồi quy phía app:** cùng lượt chạy backend, 292 test phục vụ mobile cho kết quả y hệt trước khi sửa (269 PASS / 23 FAIL do dữ liệu seed, đã báo ở báo cáo mobile); live test đăng nhập / phiên của app mobile 12/12 PASS sau khi thêm `TokenVersion`.
- **Coverage:** Admin Web ≥ 80% cả 4 chỉ số (Lines 94.3%, Branches 90.1%); `AdminController` Lines 99.8% / Methods 98.1% / Branches 85.9% — đạt cả 3 chỉ số (lần 1 Branches 74.4% chưa đạt).

**Kế hoạch tiếp theo:**

1. **[Ngay khi deploy]** Đặt `Seed__AdminPassword` cho môi trường thật và **đổi mật khẩu tài khoản `admin@smartmeal.com` trên mọi môi trường đã deploy trước bản sửa này**.
2. Commit + push bản sửa (backend, migration, admin-web, test); đưa `npm test` của Admin Web vào CI (hiện CI chỉ chạy backend và mobile).
3. Quyết định nghiệp vụ cho các quan sát ở mục 4.3 (bữa trong thực đơn khi xóa món, ghi giao dịch khi admin cấp Pro, tách lệnh cấm khỏi khóa do nhập sai).
4. Dọn cảnh báo oxlint của Admin Web; nâng function coverage của `RecipesView` / `RewardsView` (các `onChange` ô số).

---

## Phụ lục A: Danh sách đầy đủ test case

Mỗi bảng có thể mở/đóng. "Đúng như mong đợi" = mọi assertion của test case đều đạt.

<!-- APPENDIX:START -->

### A.1 Backend — xUnit `AdminApiTests` (API quản trị)

<details><summary><b>AdminApiTests</b> — API quản trị Admin Web (MỚI) · 79/79 PASS</summary>

| # | Function / Class | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 1 | `AdminApiTests` | A banned user cannot log in until unbanned | Đúng như mong đợi | 🟢 PASS | 1.10s |
| 2 | `AdminApiTests` | A challenge category the app cannot score is rejected (category: "NoSugar") | Đúng như mong đợi | 🟢 PASS | 0.81s |
| 3 | `AdminApiTests` | A challenge category the app cannot score is rejected (category: "Sleep") | Đúng như mong đợi | 🟢 PASS | 0.72s |
| 4 | `AdminApiTests` | A challenge created updated and deleted by the admin is mirrored in the app | Đúng như mong đợi | 🟢 PASS | 0.88s |
| 5 | `AdminApiTests` | A demoted admin loses admin access with the token already issued | Đúng như mong đợi | 🟢 PASS | 1.47s |
| 6 | `AdminApiTests` | A promoted user gets admin access with the token already issued | Đúng như mong đợi | 🟢 PASS | 0.70s |
| 7 | `AdminApiTests` | A recipe created by the admin appears in the app catalog with tags and ingredients | Đúng như mong đợi | 🟢 PASS | 0.81s |
| 8 | `AdminApiTests` | Admin login locks the account after five wrong passwords like the app login | Đúng như mong đợi | 🟢 PASS | 2.24s |
| 9 | `AdminApiTests` | Admin login refuses a regular user with 403 | Đúng như mong đợi | 🟢 PASS | 0.45s |
| 10 | `AdminApiTests` | Admin login returns a token and the admin profile | Đúng như mong đợi | 🟢 PASS | 0.54s |
| 11 | `AdminApiTests` | Admin login validates the email format | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 12 | `AdminApiTests` | Admin login with a wrong password is rejected with 401 | Đúng như mong đợi | 🟢 PASS | 0.65s |
| 13 | `AdminApiTests` | An admin cannot delete or ban their own account | Đúng như mong đợi | 🟢 PASS | 0.49s |
| 14 | `AdminApiTests` | An admin cannot demote their own account | Đúng như mong đợi | 🟢 PASS | 0.46s |
| 15 | `AdminApiTests` | An admin cannot demote their own account through moderation | Đúng như mong đợi | 🟢 PASS | 0.68s |
| 16 | `AdminApiTests` | An admin cannot lock their own account through the status endpoint | Đúng như mong đợi | 🟢 PASS | 0.49s |
| 17 | `AdminApiTests` | An unknown role is rejected instead of silently demoting | Đúng như mong đợi | 🟢 PASS | 0.90s |
| 18 | `AdminApiTests` | Approving a pending transaction activates pro for the plan duration | Đúng như mong đợi | 🟢 PASS | 0.88s |
| 19 | `AdminApiTests` | Approving a transaction notifies the user like a gateway payment | Đúng như mong đợi | 🟢 PASS | 0.91s |
| 20 | `AdminApiTests` | Approving an unknown transaction returns 404 | Đúng như mong đợi | 🟢 PASS | 0.73s |
| 21 | `AdminApiTests` | Approving the same transaction twice does not extend pro twice | Đúng như mong đợi | 🟢 PASS | 0.72s |
| 22 | `AdminApiTests` | Badge list uses the app badge catalog and counts real unlocks | Đúng như mong đợi | 🟢 PASS | 0.92s |
| 23 | `AdminApiTests` | Ban duration sets the lockout end (days: 1) | Đúng như mong đợi | 🟢 PASS | 2.07s |
| 24 | `AdminApiTests` | Ban duration sets the lockout end (days: 30) | Đúng như mong đợi | 🟢 PASS | 1.44s |
| 25 | `AdminApiTests` | Ban duration sets the lockout end (days: null) | Đúng như mong đợi | 🟢 PASS | 1.00s |
| 26 | `AdminApiTests` | Banning a user revokes their current access token | Đúng như mong đợi | 🟢 PASS | 0.76s |
| 27 | `AdminApiTests` | Banning a user revokes their refresh token | Đúng như mong đợi | 🟢 PASS | 0.69s |
| 28 | `AdminApiTests` | Creating a recipe rejects values the app cannot handle (field: "calories") | Đúng như mong đợi | 🟢 PASS | 0.66s |
| 29 | `AdminApiTests` | Creating a recipe rejects values the app cannot handle (field: "difficulty") | Đúng như mong đợi | 🟢 PASS | 0.75s |
| 30 | `AdminApiTests` | Creating a recipe rejects values the app cannot handle (field: "mealTypes") | Đúng như mong đợi | 🟢 PASS | 0.71s |
| 31 | `AdminApiTests` | Creating a recipe with an existing title is rejected | Đúng như mong đợi | 🟢 PASS | 0.59s |
| 32 | `AdminApiTests` | Dashboard stats count users pro locked recipes and paid revenue | Đúng như mong đợi | 🟢 PASS | 2.30s |
| 33 | `AdminApiTests` | Deleting a recipe removes it from the admin list and the app | Đúng như mong đợi | 🟢 PASS | 0.76s |
| 34 | `AdminApiTests` | Deleting a recipe that a user logged in the diary keeps the diary entry | Đúng như mong đợi | 🟢 PASS | 0.84s |
| 35 | `AdminApiTests` | Deleting a user removes the account but keeps their payment history | Đúng như mong đợi | 🟢 PASS | 0.72s |
| 36 | `AdminApiTests` | Engagement counts users who logged meals today | Đúng như mong đợi | 🟢 PASS | 1.09s |
| 37 | `AdminApiTests` | Engagement reports zero active users when nobody was active | Đúng như mong đợi | 🟢 PASS | 2.46s |
| 38 | `AdminApiTests` | Every admin endpoint refuses a regular user token | Đúng như mong đợi | 🟢 PASS | 0.79s |
| 39 | `AdminApiTests` | Every admin endpoint requires a token | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 40 | `AdminApiTests` | Expired pro users are listed separately and users without a profile have an empty detail | Đúng như mong đợi | 🟢 PASS | 1.06s |
| 41 | `AdminApiTests` | Granting and revoking pro is reflected in the users subscription status | Đúng như mong đợi | 🟢 PASS | 0.74s |
| 42 | `AdminApiTests` | Granting pro rejects a non positive duration (days: -30) | Đúng như mong đợi | 🟢 PASS | 1.28s |
| 43 | `AdminApiTests` | Granting pro rejects a non positive duration (days: 0) | Đúng như mong đợi | 🟢 PASS | 1.06s |
| 44 | `AdminApiTests` | Granting pro rejects an unknown plan | Đúng như mong đợi | 🟢 PASS | 0.70s |
| 45 | `AdminApiTests` | Granting xp levels up the pet and is logged as an admin reward | Đúng như mong đợi | 🟢 PASS | 0.74s |
| 46 | `AdminApiTests` | Granting xp outside 1 to 10000 is rejected (xp: -50) | Đúng như mong đợi | 🟢 PASS | 1.06s |
| 47 | `AdminApiTests` | Granting xp outside 1 to 10000 is rejected (xp: 0) | Đúng như mong đợi | 🟢 PASS | 1.45s |
| 48 | `AdminApiTests` | Granting xp outside 1 to 10000 is rejected (xp: 10001) | Đúng như mong đợi | 🟢 PASS | 0.93s |
| 49 | `AdminApiTests` | Granting xp to an unknown user returns 404 | Đúng như mong đợi | 🟢 PASS | 0.45s |
| 50 | `AdminApiTests` | Locking an account signs it out everywhere | Đúng như mong đợi | 🟢 PASS | 1.09s |
| 51 | `AdminApiTests` | Moderation clears a brute force lockout | Đúng như mong đợi | 🟢 PASS | 15.67s |
| 52 | `AdminApiTests` | Moderation password reset follows the password policy | Đúng như mong đợi | 🟢 PASS | 0.81s |
| 53 | `AdminApiTests` | Moderation password reset signs out existing sessions | Đúng như mong đợi | 🟢 PASS | 0.89s |
| 54 | `AdminApiTests` | Moderation renames verifies and resets the password | Đúng như mong đợi | 🟢 PASS | 1.75s |
| 55 | `AdminApiTests` | Plans match the public subscription catalog | Đúng như mong đợi | 🟢 PASS | 0.52s |
| 56 | `AdminApiTests` | Promoting a user to admin opens the admin portal and demoting closes it | Đúng như mong đợi | 🟢 PASS | 1.32s |
| 57 | `AdminApiTests` | Recipe list filters by search meal type difficulty and premium | Đúng như mong đợi | 🟢 PASS | 0.93s |
| 58 | `AdminApiTests` | Revenue report groups long ranges by month and rejects reversed ranges | Đúng như mong đợi | 🟢 PASS | 0.75s |
| 59 | `AdminApiTests` | Revenue report honours the date range chosen on the web | Đúng như mong đợi | 🟢 PASS | 0.69s |
| 60 | `AdminApiTests` | Revenue report totals paid transactions by method and plan | Đúng như mong đợi | 🟢 PASS | 1.18s |
| 61 | `AdminApiTests` | Seeding the admin over an existing regular account takes it away from its registrant | Đúng như mong đợi | 🟢 PASS | 1.31s |
| 62 | `AdminApiTests` | Status endpoint locks and unlocks an account | Đúng như mong đợi | 🟢 PASS | 0.94s |
| 63 | `AdminApiTests` | System activity reports the real server uptime | Đúng như mong đợi | 🟢 PASS | 0.58s |
| 64 | `AdminApiTests` | System activity shows the latest meal logs and locked accounts | Đúng như mong đợi | 🟢 PASS | 1.71s |
| 65 | `AdminApiTests` | The admin account is created with the configured password | Đúng như mong đợi | 🟢 PASS | 2.78s |
| 66 | `AdminApiTests` | The default admin password does not work outside development | Đúng như mong đợi | 🟢 PASS | 0.23s |
| 67 | `AdminApiTests` | The quick tag is only accepted for recipes of at most 15 minutes | Đúng như mong đợi | 🟢 PASS | 0.83s |
| 68 | `AdminApiTests` | The refresh token returned by admin login can renew the session | Đúng như mong đợi | 🟢 PASS | 0.50s |
| 69 | `AdminApiTests` | Top engaged users are ranked by xp across all users | Đúng như mong đợi | 🟢 PASS | 3.20s |
| 70 | `AdminApiTests` | Transactions filter by status and search | Đúng như mong đợi | 🟢 PASS | 2.48s |
| 71 | `AdminApiTests` | Unknown recipes and challenges return 404 and invalid recipe updates are rejected | Đúng như mong đợi | 🟢 PASS | 0.95s |
| 72 | `AdminApiTests` | Unknown users return 404 on every user action | Đúng như mong đợi | 🟢 PASS | 0.74s |
| 73 | `AdminApiTests` | Updating a challenge validates its category and keeps omitted fields | Đúng như mong đợi | 🟢 PASS | 0.54s |
| 74 | `AdminApiTests` | Updating a recipe can add a new ingredient and change its image | Đúng như mong đợi | 🟢 PASS | 0.80s |
| 75 | `AdminApiTests` | Updating a recipe replaces its fields tags and ingredients | Đúng như mong đợi | 🟢 PASS | 0.52s |
| 76 | `AdminApiTests` | Updating a recipe to another recipes title is rejected | Đúng như mong đợi | 🟢 PASS | 0.50s |
| 77 | `AdminApiTests` | User detail includes the health profile and activity counts | Đúng như mong đợi | 🟢 PASS | 0.91s |
| 78 | `AdminApiTests` | User list filters by search role status and subscription | Đúng như mong đợi | 🟢 PASS | 1.95s |
| 79 | `AdminApiTests` | User list is paginated newest first and exposes the total count | Đúng như mong đợi | 🟢 PASS | 1.09s |

</details>

### A.2 Admin Web — Vitest unit test (`frontend/admin-web/src/__tests__/`, trừ `live/`)

<details><summary><b>src/__tests__/App.test.jsx</b> · 17/17 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 80 | App — đăng nhập / đăng xuất | chưa đăng nhập thì chỉ hiện trang đăng nhập, không gọi API thống kê | Đúng như mong đợi | 🟢 PASS | 1.88s |
| 81 | App — đăng nhập / đăng xuất | đăng nhập thành công → vào Bảng điều khiển, chào admin và nạp thống kê | Đúng như mong đợi | 🟢 PASS | 3.24s |
| 82 | App — đăng nhập / đăng xuất | đã có phiên trong localStorage → vào thẳng Bảng điều khiển với tên admin | Đúng như mong đợi | 🟢 PASS | 0.68s |
| 83 | App — đăng nhập / đăng xuất | đăng xuất xóa phiên, quay về trang đăng nhập và báo đã đăng xuất | Đúng như mong đợi | 🟢 PASS | 0.72s |
| 84 | App — đăng nhập / đăng xuất | phiên hết hạn (sự kiện 401 từ api) → quay về trang đăng nhập kèm thông báo | Đúng như mong đợi | 🟢 PASS | 0.84s |
| 85 | App — đăng nhập / đăng xuất | nhập sai mật khẩu chỉ báo lỗi đăng nhập, không báo "Phiên làm việc đã hết hạn" | Đúng như mong đợi | 🟢 PASS | 1.98s |
| 86 | App — điều hướng & thông báo | menu "Quản Lý Người Dùng" mở trang "Quản Lý Người Dùng & Kiểm Duyệt Tài Khoản" và nạp dữ liệu | Đúng như mong đợi | 🟢 PASS | 1.12s |
| 87 | App — điều hướng & thông báo | menu "Quản Lý Món Ăn" mở trang "Quản Lý Thực Đơn & Món Ăn" và nạp dữ liệu | Đúng như mong đợi | 🟢 PASS | 0.94s |
| 88 | App — điều hướng & thông báo | menu "Hệ Thống Phần Thưởng" mở trang "Quản Lý Hệ Thống Phần Thưởng (Rewards)" và nạp dữ liệu | Đúng như mong đợi | 🟢 PASS | 1.28s |
| 89 | App — điều hướng & thông báo | menu "Giám Sát Hệ Thống" mở trang "Giám Sát Hoạt Động Hệ Thống (System Activity)" và nạp dữ liệu | Đúng như mong đợi | 🟢 PASS | 1.32s |
| 90 | App — điều hướng & thông báo | menu "Báo Cáo Doanh Thu" mở trang "Báo Cáo Doanh Thu Tài Chính (Revenue Report)" và nạp dữ liệu | Đúng như mong đợi | 🟢 PASS | 1.15s |
| 91 | App — điều hướng & thông báo | menu "Phân Tích Tương Tác" mở trang "Phân Tích Mức Độ Tương Tác (Engagement Analytics)" và nạp dữ liệu | Đúng như mong đợi | 🟢 PASS | 0.89s |
| 92 | App — điều hướng & thông báo | menu "Gói Member & Giao Dịch" mở trang "Quản Lý Gói Hội Viên & Giao Dịch" và nạp dữ liệu | Đúng như mong đợi | 🟢 PASS | 1.10s |
| 93 | App — điều hướng & thông báo | nút "Thêm Món Ăn" trên thanh trên mở tab Món ăn với form thêm món | Đúng như mong đợi | 🟢 PASS | 1.03s |
| 94 | App — điều hướng & thông báo | nút "Làm mới" nạp lại thống kê | Đúng như mong đợi | 🟢 PASS | 0.84s |
| 95 | App — điều hướng & thông báo | lỗi nạp thống kê hiện toast lỗi | Đúng như mong đợi | 🟢 PASS | 0.26s |
| 96 | App — điều hướng & thông báo | toast tự ẩn sau 4 giây | Đúng như mong đợi | 🟢 PASS | 0.22s |

</details>

<details><summary><b>src/__tests__/components/DashboardView.test.jsx</b> · 9/9 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 97 | DashboardView | hiện trạng thái đang tải khi chưa có thống kê | Đúng như mong đợi | 🟢 PASS | 0.42s |
| 98 | DashboardView | 4 thẻ số liệu: người dùng (hoạt động / bị khóa), Pro + tỉ lệ chuyển đổi, số món, doanh thu VND | Đúng như mong đợi | 🟢 PASS | 1.35s |
| 99 | DashboardView | không hiện "bị khóa" khi không có tài khoản bị khóa và tỉ lệ 0% khi chưa có người dùng | Đúng như mong đợi | 🟢 PASS | 0.26s |
| 100 | DashboardView | phân bổ thực đơn theo bữa: số món và phần trăm trên tổng số món | Đúng như mong đợi | 🟢 PASS | 0.85s |
| 101 | DashboardView | gói thành viên: tên, giá / chu kỳ, nhãn phổ biến và số người dùng | Đúng như mong đợi | 🟢 PASS | 0.29s |
| 102 | DashboardView | giao dịch gần đây hiển thị đúng nhãn trạng thái Paid / Pending / Failed | Đúng như mong đợi | 🟢 PASS | 0.26s |
| 103 | DashboardView | người dùng mới: vai trò, gói và tên mặc định khi thiếu họ tên | Đúng như mong đợi | 🟢 PASS | 0.32s |
| 104 | DashboardView | hiện thông báo trống khi chưa có giao dịch / người dùng | Đúng như mong đợi | 🟢 PASS | 0.17s |
| 105 | DashboardView | các nút "Xem tất cả / Chi tiết / Quản lý" điều hướng sang đúng tab | Đúng như mong đợi | 🟢 PASS | 0.80s |

</details>

<details><summary><b>src/__tests__/components/LoginView.test.jsx</b> · 8/8 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 106 | LoginView | đăng nhập bằng email/mật khẩu đã nhập và báo user cho App | Đúng như mong đợi | 🟢 PASS | 4.29s |
| 107 | LoginView | khóa nút và hiện "Đang xác thực..." trong lúc chờ backend | Đúng như mong đợi | 🟢 PASS | 2.07s |
| 108 | LoginView | hiện thông báo lỗi của backend và không chuyển trang khi sai mật khẩu | Đúng như mong đợi | 🟢 PASS | 1.96s |
| 109 | LoginView | dùng thông báo mặc định khi lỗi không có nội dung | Đúng như mong đợi | 🟢 PASS | 1.73s |
| 110 | LoginView | báo thiếu thông tin và không gọi API khi để trống email hoặc mật khẩu | Đúng như mong đợi | 🟢 PASS | 0.21s |
| 111 | LoginView | nút "Điền Tài Khoản Admin Mặc Định" điền lại form và xóa lỗi cũ | Đúng như mong đợi | 🟢 PASS | 1.25s |
| 112 | LoginView | [Bảo mật] trang đăng nhập không điền sẵn / không in ra mật khẩu của tài khoản admin | Đúng như mong đợi | 🟢 PASS | 0.06s |
| 113 | LoginView | [Bảo mật] bản build production không có nút điền tài khoản admin mẫu | Đúng như mong đợi | 🟢 PASS | 0.07s |

</details>

<details><summary><b>src/__tests__/components/Pagination.test.jsx</b> · 5/5 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 114 | Pagination | ẩn khi mọi bản ghi nằm gọn trong trang đầu | Đúng như mong đợi | 🟢 PASS | 0.09s |
| 115 | Pagination | trang đầu: hiển thị khoảng bản ghi, tổng số trang và khóa nút "Trang trước" | Đúng như mong đợi | 🟢 PASS | 0.80s |
| 116 | Pagination | bấm "Trang sau" / "Trang trước" báo trang kế tiếp / trước đó | Đúng như mong đợi | 🟢 PASS | 0.37s |
| 117 | Pagination | trang cuối: khoảng bản ghi kết thúc ở tổng số và khóa nút "Trang sau" | Đúng như mong đợi | 🟢 PASS | 0.06s |
| 118 | Pagination | vẫn hiện để quay lại khi đang ở trang lớn hơn số trang (vd. vừa xóa bản ghi cuối) | Đúng như mong đợi | 🟢 PASS | 0.05s |

</details>

<details><summary><b>src/__tests__/components/RecipesView.test.jsx</b> · 19/19 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 119 | RecipesView — lưới món ăn & bộ lọc | nạp trang 1 (16 món/trang) và hiển thị kcal làm tròn, thời gian, protein, độ khó, nhãn Pro, tối đa 3 tag | Đúng như mong đợi | 🟢 PASS | 2.65s |
| 120 | RecipesView — lưới món ăn & bộ lọc | ảnh lỗi được thay bằng ảnh mặc định | Đúng như mong đợi | 🟢 PASS | 0.34s |
| 121 | RecipesView — lưới món ăn & bộ lọc | đổi bộ lọc bữa ăn, độ khó và ô tìm kiếm thì nạp lại | Đúng như mong đợi | 🟢 PASS | 1.79s |
| 122 | RecipesView — lưới món ăn & bộ lọc | không có món → hiện thông báo trống; lỗi tải → onNotify error | Đúng như mong đợi | 🟢 PASS | 0.33s |
| 123 | RecipesView — lưới món ăn & bộ lọc | có hơn 16 món thì admin chuyển được sang trang 2 | Đúng như mong đợi | 🟢 PASS | 2.07s |
| 124 | RecipesView — thêm món | form mặc định: bữa Trưa, tag Eat Clean, 1 nguyên liệu ức gà | Đúng như mong đợi | 🟢 PASS | 0.73s |
| 125 | RecipesView — thêm món | gửi payload đầy đủ: mealTypes nối bằng dấu phẩy, tag đã chọn, nguyên liệu đã nhập | Đúng như mong đợi | 🟢 PASS | 4.92s |
| 126 | RecipesView — thêm món | tên món chỉ có khoảng trắng → báo lỗi, không gọi API | Đúng như mong đợi | 🟢 PASS | 1.18s |
| 127 | RecipesView — thêm món | không bỏ chọn được bữa ăn cuối cùng; không xóa được nguyên liệu cuối cùng | Đúng như mong đợi | 🟢 PASS | 1.65s |
| 128 | RecipesView — thêm món | xem trước ảnh khi nhập link ảnh | Đúng như mong đợi | 🟢 PASS | 3.62s |
| 129 | RecipesView — thêm món | lỗi khi lưu (vd. trùng tên) → báo lỗi, giữ form mở | Đúng như mong đợi | 🟢 PASS | 1.75s |
| 130 | RecipesView — thêm món | initialOpenAdd mở sẵn form và báo App reset cờ | Đúng như mong đợi | 🟢 PASS | 0.24s |
| 131 | RecipesView — thêm món | đóng form bằng nút Hủy hoặc bấm ra ngoài | Đúng như mong đợi | 🟢 PASS | 0.81s |
| 132 | RecipesView — thêm món | nhãn tag "quick" khớp định nghĩa của backend (Nhanh Gọn < 15 phút) | Đúng như mong đợi | 🟢 PASS | 0.37s |
| 133 | RecipesView — sửa & xóa món | sửa: nạp chi tiết, tách mealTypes "Breakfast, Lunch" và gửi updateRecipe | Đúng như mong đợi | 🟢 PASS | 1.59s |
| 134 | RecipesView — sửa & xóa món | sửa món chưa có nguyên liệu → dùng nguyên liệu mặc định; thiếu mealTypes → bữa Trưa | Đúng như mong đợi | 🟢 PASS | 0.28s |
| 135 | RecipesView — sửa & xóa món | lỗi tải chi tiết → báo lỗi, không mở form | Đúng như mong đợi | 🟢 PASS | 0.19s |
| 136 | RecipesView — sửa & xóa món | xóa sau khi xác nhận thì gọi deleteRecipe và nạp lại; hủy thì không xóa | Đúng như mong đợi | 🟢 PASS | 0.25s |
| 137 | RecipesView — sửa & xóa món | xóa lỗi (vd. món đã có trong nhật ký người dùng) → báo thất bại | Đúng như mong đợi | 🟢 PASS | 0.22s |

</details>

<details><summary><b>src/__tests__/components/ReportViews.test.jsx</b> · 19/19 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 138 | SystemActivityView | hiển thị trạng thái DB, uptime, số yêu cầu AI hôm nay và số cảnh báo an ninh | Đúng như mong đợi | 🟢 PASS | 2.16s |
| 139 | SystemActivityView | DB không kết nối được / thiếu số đo → báo đúng, không hiện số giả | Đúng như mong đợi | 🟢 PASS | 0.61s |
| 140 | SystemActivityView | nhật ký AI, bữa ăn (kcal làm tròn) và sự kiện an ninh phân loại khóa / dò mật khẩu | Đúng như mong đợi | 🟢 PASS | 1.73s |
| 141 | SystemActivityView | không có dữ liệu → các bảng hiện thông báo trống, hệ thống an toàn | Đúng như mong đợi | 🟢 PASS | 0.33s |
| 142 | SystemActivityView | nút "Làm mới dữ liệu" gọi lại API | Đúng như mong đợi | 🟢 PASS | 0.76s |
| 143 | SystemActivityView | tự làm mới mỗi 30 giây và dừng khi rời màn hình | Đúng như mong đợi | 🟢 PASS | 0.36s |
| 144 | SystemActivityView | lỗi tải → onNotify error | Đúng như mong đợi | 🟢 PASS | 0.22s |
| 145 | RevenueReportView | hiển thị tổng doanh thu, tháng/năm, ARPPU và tỷ lệ thanh toán thành công | Đúng như mong đợi | 🟢 PASS | 0.69s |
| 146 | RevenueReportView | biểu đồ theo ngày: thanh dài nhất 100%, ngày 0đ vẫn hiện tối thiểu 5% | Đúng như mong đợi | 🟢 PASS | 0.43s |
| 147 | RevenueReportView | cơ cấu theo cổng thanh toán và theo gói | Đúng như mong đợi | 🟢 PASS | 0.33s |
| 148 | RevenueReportView | chưa có giao dịch → thông báo trống ở biểu đồ và hai bảng cơ cấu | Đúng như mong đợi | 🟢 PASS | 0.27s |
| 149 | RevenueReportView | chọn khoảng ngày rồi "Lọc Báo Cáo" gửi startDate / endDate | Đúng như mong đợi | 🟢 PASS | 1.67s |
| 150 | RevenueReportView | "Đặt lại" xóa ngày đã chọn và nạp lại báo cáo KHÔNG lọc | Đúng như mong đợi | 🟢 PASS | 1.33s |
| 151 | RevenueReportView | xuất CSV: tạo link tải có tên file theo ngày, nội dung đủ các mốc và báo thành công | Đúng như mong đợi | 🟢 PASS | 0.61s |
| 152 | RevenueReportView | xuất CSV khi chưa có báo cáo thì không làm gì; lỗi tải → onNotify error | Đúng như mong đợi | 🟢 PASS | 0.35s |
| 153 | EngagementAnalyticsView | hiển thị DAU / WAU / MAU, tỷ lệ hoàn thành thử thách và các tổng hoạt động | Đúng như mong đợi | 🟢 PASS | 0.43s |
| 154 | EngagementAnalyticsView | bảng xếp hạng: thứ hạng, tên (mặc định "Người dùng"), số bữa, cấp pet, XP và ngày hoạt động | Đúng như mong đợi | 🟢 PASS | 0.46s |
| 155 | EngagementAnalyticsView | chưa có dữ liệu → giá trị 0 / Lv. 1 và thông báo bảng trống | Đúng như mong đợi | 🟢 PASS | 0.20s |
| 156 | EngagementAnalyticsView | lỗi tải → onNotify error | Đúng như mong đợi | 🟢 PASS | 0.20s |

</details>

<details><summary><b>src/__tests__/components/RewardsView.test.jsx</b> · 14/14 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 157 | RewardsView — thử thách | nạp song song thử thách, huy hiệu, lịch sử XP, người dùng và đếm số trên tab | Đúng như mong đợi | 🟢 PASS | 2.41s |
| 158 | RewardsView — thử thách | bảng thử thách: danh mục, thời hạn, mục tiêu, thưởng, tham gia và trạng thái | Đúng như mong đợi | 🟢 PASS | 0.60s |
| 159 | RewardsView — thử thách | chưa có thử thách → hiện lời mời tạo thử thách đầu tiên | Đúng như mong đợi | 🟢 PASS | 0.23s |
| 160 | RewardsView — thử thách | tạo thử thách mới với dữ liệu nhập và nạp lại danh sách | Đúng như mong đợi | 🟢 PASS | 3.84s |
| 161 | RewardsView — thử thách | tiêu đề trống → báo lỗi, không gọi API | Đúng như mong đợi | 🟢 PASS | 1.15s |
| 162 | RewardsView — thử thách | sửa thử thách: điền sẵn dữ liệu cũ, bỏ chọn "mở" và gửi updateChallenge | Đúng như mong đợi | 🟢 PASS | 1.07s |
| 163 | RewardsView — thử thách | lưu thất bại → báo lỗi | Đúng như mong đợi | 🟢 PASS | 0.62s |
| 164 | RewardsView — thử thách | xóa thử thách sau khi xác nhận thì bỏ khỏi bảng | Đúng như mong đợi | 🟢 PASS | 0.41s |
| 165 | RewardsView — thử thách | lỗi tải dữ liệu → onNotify error | Đúng như mong đợi | 🟢 PASS | 0.13s |
| 166 | RewardsView — huy hiệu & tặng XP | tab Huy hiệu hiển thị tên, mô tả, danh mục (mặc định "Thành Tích") và số người mở khóa | Đúng như mong đợi | 🟢 PASS | 0.92s |
| 167 | RewardsView — huy hiệu & tặng XP | tab XP: chọn sẵn người dùng đầu tiên, tặng XP và nạp lại lịch sử | Đúng như mong đợi | 🟢 PASS | 1.75s |
| 168 | RewardsView — huy hiệu & tặng XP | không có người dùng → báo phải chọn người nhận | Đúng như mong đợi | 🟢 PASS | 0.71s |
| 169 | RewardsView — huy hiệu & tặng XP | tặng XP lỗi → báo thất bại; lịch sử trống → hiện thông báo | Đúng như mong đợi | 🟢 PASS | 0.96s |
| 170 | RewardsView — huy hiệu & tặng XP | danh sách thử thách mẫu không bị ảnh hưởng khi chuyển tab qua lại | Đúng như mong đợi | 🟢 PASS | 0.90s |

</details>

<details><summary><b>src/__tests__/components/ShellComponents.test.jsx</b> · 14/14 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 171 | Sidebar | hiển thị đủ 8 mục menu và đánh dấu mục đang mở | Đúng như mong đợi | 🟢 PASS | 1.23s |
| 172 | Sidebar | bấm mục dashboard gọi setActiveTab với đúng id | Đúng như mong đợi | 🟢 PASS | 0.31s |
| 173 | Sidebar | bấm mục users gọi setActiveTab với đúng id | Đúng như mong đợi | 🟢 PASS | 0.30s |
| 174 | Sidebar | bấm mục recipes gọi setActiveTab với đúng id | Đúng như mong đợi | 🟢 PASS | 0.20s |
| 175 | Sidebar | bấm mục rewards gọi setActiveTab với đúng id | Đúng như mong đợi | 🟢 PASS | 0.27s |
| 176 | Sidebar | bấm mục system gọi setActiveTab với đúng id | Đúng như mong đợi | 🟢 PASS | 0.17s |
| 177 | Sidebar | bấm mục revenue gọi setActiveTab với đúng id | Đúng như mong đợi | 🟢 PASS | 0.19s |
| 178 | Sidebar | bấm mục engagement gọi setActiveTab với đúng id | Đúng như mong đợi | 🟢 PASS | 0.20s |
| 179 | Sidebar | bấm mục subscriptions gọi setActiveTab với đúng id | Đúng như mong đợi | 🟢 PASS | 0.16s |
| 180 | Sidebar | hiển thị chữ cái đầu, tên và vai trò của admin; nút đăng xuất gọi onLogout | Đúng như mong đợi | 🟢 PASS | 0.16s |
| 181 | Sidebar | dùng tên/vai trò mặc định khi thiếu thông tin user | Đúng như mong đợi | 🟢 PASS | 0.08s |
| 182 | Topbar | hiển thị tiêu đề trang và gọi onRefresh khi bấm "Làm mới" | Đúng như mong đợi | 🟢 PASS | 0.10s |
| 183 | Topbar | khóa nút "Làm mới" và quay icon khi đang tải | Đúng như mong đợi | 🟢 PASS | 0.05s |
| 184 | Topbar | chỉ hiện nút "Thêm Món Ăn" khi có handler | Đúng như mong đợi | 🟢 PASS | 0.09s |

</details>

<details><summary><b>src/__tests__/components/SubscriptionsView.test.jsx</b> · 9/9 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 185 | SubscriptionsView — gói hội viên | hiển thị giá, chu kỳ, nhãn phổ biến, số thành viên, doanh thu và đặc quyền | Đúng như mong đợi | 🟢 PASS | 2.77s |
| 186 | SubscriptionsView — giao dịch | nạp trang 1 (20 giao dịch/trang) và hiển thị mã đơn, cổng, thời gian khớp, trạng thái | Đúng như mong đợi | 🟢 PASS | 0.62s |
| 187 | SubscriptionsView — giao dịch | chỉ giao dịch chưa thanh toán mới có nút "Duyệt Đơn" | Đúng như mong đợi | 🟢 PASS | 0.78s |
| 188 | SubscriptionsView — giao dịch | duyệt đơn sau khi xác nhận → kích hoạt Pro và nạp lại | Đúng như mong đợi | 🟢 PASS | 0.67s |
| 189 | SubscriptionsView — giao dịch | đang duyệt thì nút bị khóa và đổi chữ "Đang duyệt..." | Đúng như mong đợi | 🟢 PASS | 0.66s |
| 190 | SubscriptionsView — giao dịch | hủy xác nhận thì không duyệt; duyệt lỗi thì báo thất bại | Đúng như mong đợi | 🟢 PASS | 0.65s |
| 191 | SubscriptionsView — giao dịch | lọc theo trạng thái và tìm kiếm thì nạp lại | Đúng như mong đợi | 🟢 PASS | 1.75s |
| 192 | SubscriptionsView — giao dịch | không có giao dịch → thông báo trống; lỗi tải → onNotify error | Đúng như mong đợi | 🟢 PASS | 0.46s |
| 193 | SubscriptionsView — giao dịch | có hơn 20 giao dịch thì admin chuyển được sang trang 2 | Đúng như mong đợi | 🟢 PASS | 1.35s |

</details>

<details><summary><b>src/__tests__/components/UsersView.test.jsx</b> · 23/23 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 194 | UsersView — danh sách & bộ lọc | nạp trang 1 (15 người/trang, không lọc) và hiển thị vai trò, gói Pro, trạng thái | Đúng như mong đợi | 🟢 PASS | 2.33s |
| 195 | UsersView — danh sách & bộ lọc | đang tải → hiện thông báo tải; không có kết quả → hiện thông báo trống | Đúng như mong đợi | 🟢 PASS | 0.11s |
| 196 | UsersView — danh sách & bộ lọc | đổi bộ lọc vai trò / gói / trạng thái và ô tìm kiếm thì nạp lại với tham số tương ứng | Đúng như mong đợi | 🟢 PASS | 3.26s |
| 197 | UsersView — danh sách & bộ lọc | lỗi tải danh sách gọi onNotify kiểu error | Đúng như mong đợi | 🟢 PASS | 0.12s |
| 198 | UsersView — danh sách & bộ lọc | có hơn 15 người dùng thì admin chuyển được sang trang 2 | Đúng như mong đợi | 🟢 PASS | 2.99s |
| 199 | UsersView — danh sách & bộ lọc | đổi bộ lọc khi đang ở trang 2 thì quay về trang 1 | Đúng như mong đợi | 🟢 PASS | 4.40s |
| 200 | UsersView — xem chi tiết & phân quyền | xem chi tiết: nạp hồ sơ đầy đủ, hiển thị sức khỏe và số liệu sử dụng | Đúng như mong đợi | 🟢 PASS | 0.97s |
| 201 | UsersView — xem chi tiết & phân quyền | người dùng chưa khai báo sức khỏe → hiện ghi chú chưa hoàn thiện hồ sơ | Đúng như mong đợi | 🟢 PASS | 0.78s |
| 202 | UsersView — xem chi tiết & phân quyền | đổi vai trò User ↔ Admin sau khi xác nhận, rồi nạp lại danh sách | Đúng như mong đợi | 🟢 PASS | 0.59s |
| 203 | UsersView — xem chi tiết & phân quyền | hủy hộp thoại xác nhận thì không đổi vai trò | Đúng như mong đợi | 🟢 PASS | 0.33s |
| 204 | UsersView — xem chi tiết & phân quyền | xóa người dùng sau khi xác nhận; lỗi thì báo thất bại | Đúng như mong đợi | 🟢 PASS | 0.68s |
| 205 | UsersView — cấp / hủy gói Pro | chọn gói Năm tự đặt 365 ngày và gửi cấp Pro | Đúng như mong đợi | 🟢 PASS | 1.57s |
| 206 | UsersView — cấp / hủy gói Pro | nhập số ngày tùy chỉnh được gửi dưới dạng số | Đúng như mong đợi | 🟢 PASS | 1.52s |
| 207 | UsersView — cấp / hủy gói Pro | người dùng đang Pro: nút "Hủy Gói Pro Ngay Lập Tức" hạ về gói miễn phí | Đúng như mong đợi | 🟢 PASS | 0.72s |
| 208 | UsersView — cấp / hủy gói Pro | cấp Pro lỗi thì báo lỗi và giữ hộp thoại | Đúng như mong đợi | 🟢 PASS | 0.65s |
| 209 | UsersView — UC1 Ban user | cấm 7 ngày với lý do tùy chỉnh | Đúng như mong đợi | 🟢 PASS | 2.00s |
| 210 | UsersView — UC1 Ban user | cấm vĩnh viễn gửi durationDays = null; mặc định 30 ngày với lý do vi phạm cộng đồng | Đúng như mong đợi | 🟢 PASS | 0.72s |
| 211 | UsersView — UC1 Ban user | tài khoản đang bị cấm: hộp thoại đề nghị gỡ cấm và gửi isBanned = false | Đúng như mong đợi | 🟢 PASS | 0.50s |
| 212 | UsersView — UC1 Ban user | lỗi khi cấm thì báo thất bại | Đúng như mong đợi | 🟢 PASS | 0.42s |
| 213 | UsersView — UC2 Moderate account | tài khoản đang bị cấm: không mặc định gỡ khóa khi kiểm duyệt (giữ lệnh cấm) | Đúng như mong đợi | 🟢 PASS | 0.40s |
| 214 | UsersView — UC2 Moderate account | mở form với dữ liệu hiện tại, gửi tên đã trim, vai trò và mật khẩu mới | Đúng như mong đợi | 🟢 PASS | 1.74s |
| 215 | UsersView — UC2 Moderate account | để trống mật khẩu → resetPassword = null; xóa trống tên → giữ tên cũ; bỏ chọn checkbox | Đúng như mong đợi | 🟢 PASS | 0.53s |
| 216 | UsersView — UC2 Moderate account | lỗi kiểm duyệt thì báo thất bại, đóng bằng nút Hủy | Đúng như mong đợi | 🟢 PASS | 0.33s |

</details>

<details><summary><b>src/__tests__/services/api.test.js</b> · 40/40 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 217 | authStorage | lưu và đọc token, thông tin admin | Đúng như mong đợi | 🟢 PASS | 0.02s |
| 218 | authStorage | trả null khi chưa đăng nhập hoặc dữ liệu user bị hỏng | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 219 | authStorage | clear() xóa cả token lẫn user | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 220 | request — header, lỗi và phiên hết hạn | gửi JSON và gắn Bearer token khi đã đăng nhập | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 221 | request — header, lỗi và phiên hết hạn | không gửi header Authorization khi chưa có token | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 222 | request — header, lỗi và phiên hết hạn | ném lỗi với message của backend | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 223 | request — header, lỗi và phiên hết hạn | ghép danh sách errors khi backend không có message | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 224 | request — header, lỗi và phiên hết hạn | dùng thông báo mặc định kèm mã HTTP khi body không phải JSON | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 225 | request — header, lỗi và phiên hết hạn | 401: xóa phiên đăng nhập và phát sự kiện smartmeal_admin_unauthorized | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 226 | request — header, lỗi và phiên hết hạn | 403 không xóa phiên đăng nhập | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 227 | api.login | lưu token + user khi đăng nhập thành công và trả data | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 228 | api.login | không lưu gì khi backend không trả token | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 229 | api.login | không gửi token cũ khi đăng nhập | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 230 | api.login | sai mật khẩu (401) chỉ ném lỗi đăng nhập, không phát sự kiện hết phiên | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 231 | danh sách phân trang (getUsers / getRecipes / getTransactions) | getUsers trả { items, total } với total từ header X-Total-Count | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 232 | danh sách phân trang (getUsers / getRecipes / getTransactions) | getRecipes trả { items, total } với total từ header X-Total-Count | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 233 | danh sách phân trang (getUsers / getRecipes / getTransactions) | getTransactions trả { items, total } với total từ header X-Total-Count | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 234 | danh sách phân trang (getUsers / getRecipes / getTransactions) | thiếu header tổng số thì total = số bản ghi đã nhận; không có data thì danh sách rỗng | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 235 | api — URL, phương thức và payload của từng chức năng | getStats gọi GET /api/admin/stats | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 236 | api — URL, phương thức và payload của từng chức năng | getUserDetail gọi GET /api/admin/users/u1 | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 237 | api — URL, phương thức và payload của từng chức năng | deleteUser gọi DELETE /api/admin/users/u1 | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 238 | api — URL, phương thức và payload của từng chức năng | getRecipeDetail gọi GET /api/admin/recipes/r1 | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 239 | api — URL, phương thức và payload của từng chức năng | deleteRecipe gọi DELETE /api/admin/recipes/r1 | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 240 | api — URL, phương thức và payload của từng chức năng | getPlans gọi GET /api/admin/plans | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 241 | api — URL, phương thức và payload của từng chức năng | approveTransaction gọi PUT /api/admin/transactions/t1/approve | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 242 | api — URL, phương thức và payload của từng chức năng | getChallenges gọi GET /api/admin/rewards/challenges | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 243 | api — URL, phương thức và payload của từng chức năng | deleteChallenge gọi DELETE /api/admin/rewards/challenges/c1 | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 244 | api — URL, phương thức và payload của từng chức năng | getBadges gọi GET /api/admin/rewards/badges | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 245 | api — URL, phương thức và payload của từng chức năng | getXpEvents gọi GET /api/admin/rewards/xp-events | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 246 | api — URL, phương thức và payload của từng chức năng | getSystemActivity gọi GET /api/admin/system/activity | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 247 | api — URL, phương thức và payload của từng chức năng | getEngagementAnalytics gọi GET /api/admin/reports/engagement | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 248 | api — URL, phương thức và payload của từng chức năng | getUsers / getRecipes / getTransactions chuyển params thành query string | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 249 | api — URL, phương thức và payload của từng chức năng | các hàm danh sách trả mảng rỗng khi backend không có data | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 250 | api — URL, phương thức và payload của từng chức năng | updateUserStatus / updateUserRole gửi đúng body | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 251 | api — URL, phương thức và payload của từng chức năng | updateUserSubscription: cấp Pro (mặc định gói tháng 30 ngày) và hủy Pro | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 252 | api — URL, phương thức và payload của từng chức năng | banUser: cấm vĩnh viễn gửi durationDays = null, gỡ cấm gửi isBanned = false | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 253 | api — URL, phương thức và payload của từng chức năng | moderateAccount gửi nguyên payload kiểm duyệt | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 254 | api — URL, phương thức và payload của từng chức năng | createRecipe / updateRecipe trả data của món | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 255 | api — URL, phương thức và payload của từng chức năng | createChallenge / updateChallenge / grantXp gửi đúng endpoint | Đúng như mong đợi | 🟢 PASS | 0.00s |
| 256 | api — URL, phương thức và payload của từng chức năng | getRevenueReport chỉ thêm query khi có chọn ngày | Đúng như mong đợi | 🟢 PASS | 0.00s |

</details>

### A.3 Admin Web — live test (`src/__tests__/live/`, gọi backend Docker thật)

<details><summary><b>src/__tests__/live/adminApi.live.test.js</b> · 24/24 PASS</summary>

| # | Function / Component | Scenario / Test Case | Actual Result | Status | Time |
|---|---|---|---|---|---|
| 257 | Admin Web ↔ backend thật (services/api.js) › Đăng nhập | đăng nhập bằng tài khoản admin lưu token + hồ sơ quyền Admin | Đúng như mong đợi | 🟢 PASS | 0.16s |
| 258 | Admin Web ↔ backend thật (services/api.js) › Đăng nhập | sai mật khẩu → lỗi tiếng Việt từ backend | Đúng như mong đợi | 🟢 PASS | 0.16s |
| 259 | Admin Web ↔ backend thật (services/api.js) › Đăng nhập | tài khoản người dùng thường bị từ chối ở cổng Admin | Đúng như mong đợi | 🟢 PASS | 0.32s |
| 260 | Admin Web ↔ backend thật (services/api.js) › Đăng nhập | token không hợp lệ → 401, api.js xóa phiên và phát sự kiện hết phiên | Đúng như mong đợi | 🟢 PASS | 0.01s |
| 261 | Admin Web ↔ backend thật (services/api.js) › Bảng điều khiển & người dùng | thống kê tổng quan nhất quán (hoạt động + bị khóa = tổng; đủ 4 bữa; 2 gói) | Đúng như mong đợi | 🟢 PASS | 0.19s |
| 262 | Admin Web ↔ backend thật (services/api.js) › Bảng điều khiển & người dùng | tìm người dùng vừa đăng ký trên app và xem chi tiết | Đúng như mong đợi | 🟢 PASS | 0.34s |
| 263 | Admin Web ↔ backend thật (services/api.js) › Bảng điều khiển & người dùng | UC1: cấm 7 ngày chặn đăng nhập app (423), gỡ cấm thì đăng nhập lại được | Đúng như mong đợi | 🟢 PASS | 0.57s |
| 264 | Admin Web ↔ backend thật (services/api.js) › Bảng điều khiển & người dùng | UC1: người đang đăng nhập bị cấm thì token và refresh token mất hiệu lực ngay | Đúng như mong đợi | 🟢 PASS | 0.49s |
| 265 | Admin Web ↔ backend thật (services/api.js) › Bảng điều khiển & người dùng | UC2: kiểm duyệt đổi tên + đặt lại mật khẩu, người dùng đăng nhập bằng mật khẩu mới | Đúng như mong đợi | 🟢 PASS | 0.77s |
| 266 | Admin Web ↔ backend thật (services/api.js) › Bảng điều khiển & người dùng | cấp gói Pro năm rồi hủy — app thấy đúng trạng thái gói | Đúng như mong đợi | 🟢 PASS | 0.48s |
| 267 | Admin Web ↔ backend thật (services/api.js) › Bảng điều khiển & người dùng | xóa người dùng → tài khoản biến mất, token cũ bị từ chối | Đúng như mong đợi | 🟢 PASS | 0.50s |
| 268 | Admin Web ↔ backend thật (services/api.js) › Món ăn | vòng đời món ăn từ form Admin: tạo → app thấy → sửa → xóa | Đúng như mong đợi | 🟢 PASS | 0.66s |
| 269 | Admin Web ↔ backend thật (services/api.js) › Món ăn | mọi tag trên form Admin đều tồn tại ở backend | Đúng như mong đợi | 🟢 PASS | 0.33s |
| 270 | Admin Web ↔ backend thật (services/api.js) › Món ăn | gắn tag "Nhanh Gọn" cho món nấu quá 15 phút → backend từ chối kèm lý do | Đúng như mong đợi | 🟢 PASS | 0.28s |
| 271 | Admin Web ↔ backend thật (services/api.js) › Món ăn | trùng tên món → thông báo lỗi của backend hiển thị nguyên văn | Đúng như mong đợi | 🟢 PASS | 0.37s |
| 272 | Admin Web ↔ backend thật (services/api.js) › Món ăn | bộ lọc của lưới món ăn (bữa / độ khó / tìm kiếm) trả đúng món | Đúng như mong đợi | 🟢 PASS | 0.35s |
| 273 | Admin Web ↔ backend thật (services/api.js) › Gói, giao dịch, phần thưởng, báo cáo | gói hội viên trên web trùng giá với gói app bán | Đúng như mong đợi | 🟢 PASS | 0.30s |
| 274 | Admin Web ↔ backend thật (services/api.js) › Gói, giao dịch, phần thưởng, báo cáo | duyệt đơn chuyển khoản SePay đang chờ → người dùng thành Pro | Đúng như mong đợi | 🟢 PASS | 1.13s |
| 275 | Admin Web ↔ backend thật (services/api.js) › Gói, giao dịch, phần thưởng, báo cáo | thử thách: tạo từ form mặc định → sửa → xóa, app thấy thử thách khi đang mở | Đúng như mong đợi | 🟢 PASS | 0.84s |
| 276 | Admin Web ↔ backend thật (services/api.js) › Gói, giao dịch, phần thưởng, báo cáo | tặng 600 XP → pet của người dùng lên cấp 2 và có trong nhật ký XP | Đúng như mong đợi | 🟢 PASS | 0.64s |
| 277 | Admin Web ↔ backend thật (services/api.js) › Gói, giao dịch, phần thưởng, báo cáo | giám sát hệ thống & tương tác thấy bữa ăn người dùng vừa ghi | Đúng như mong đợi | 🟢 PASS | 0.60s |
| 278 | Admin Web ↔ backend thật (services/api.js) › Gói, giao dịch, phần thưởng, báo cáo | báo cáo doanh thu có 7 mốc ngày và tỷ lệ thành công trong 0–100% | Đúng như mong đợi | 🟢 PASS | 0.29s |
| 279 | Admin Web ↔ backend thật (services/api.js) › Gói, giao dịch, phần thưởng, báo cáo | lọc doanh thu theo khoảng ngày trước khi có dữ liệu → 0đ, biểu đồ đủ từng ngày | Đúng như mong đợi | 🟢 PASS | 0.34s |
| 280 | Admin Web ↔ backend thật (services/api.js) › Gói, giao dịch, phần thưởng, báo cáo | giám sát hệ thống báo trạng thái DB thật và uptime của tiến trình API | Đúng như mong đợi | 🟢 PASS | 0.30s |

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

# 3) Admin Web — live test (backend chạy ở :5000 ở chế độ live-test: tắt rate limit/SMTP, không bắt xác minh email;
#    Development tự tạo admin@smartmeal.com / Admin@123456)
LIVE_API_URL=http://127.0.0.1:5000/api npx vitest run src/__tests__/live
```

Tệp test thêm / sửa trong lần 2:

- `backend/SmartMeal.Tests/AdminApiTests.cs` (+14 test; siết thêm kiểm tra ở 5 test cũ: duyệt lại giao dịch → 409, xóa món kiểm cả dòng đi chợ, biểu đồ theo khoảng ngày, trạng thái DB, 404 khi khóa / mở khóa user không tồn tại)
- `frontend/admin-web/src/__tests__/components/Pagination.test.jsx` (mới)
- `frontend/admin-web/src/__tests__/services/api.test.js`, `App.test.jsx`, `components/{LoginView,UsersView,RecipesView,SubscriptionsView,RewardsView,ReportViews}.test.jsx`, `live/adminApi.live.test.js`
