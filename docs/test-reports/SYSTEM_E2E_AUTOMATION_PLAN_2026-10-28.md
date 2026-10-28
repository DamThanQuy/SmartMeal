# SmartMeal system E2E — Implementation Plan

**Goal:** Một lệnh `npm run test:e2e` từ thư mục gốc tự dựng môi trường QA, chạy các bộ kiểm thử FE/BE/Admin sẵn có và các luồng trình duyệt thật, chụp ảnh, xuất báo cáo Markdown trong `docs/test-reports`, trả mã lỗi khác 0 khi có bước thất bại.

**Architecture:** Node.js điều phối các CLI hiện có. PostgreSQL và ASP.NET chạy bằng Docker Compose với project `smartmeal-e2e` độc lập. Backend dùng toàn bộ `SmartMeal.Tests` trên PostgreSQL QA. Mobile Jest và Admin Vitest bật `LIVE_API_URL` trỏ API QA. Playwright chạy Admin Chromium và mobile web trên Chromium/WebKit, lưu JSON, HTML, ảnh và trace. Báo cáo chỉ tổng hợp kết quả đã thực thi.

**Tech Stack:** Node.js 24+, Docker Compose v2, .NET SDK 9 container, PostgreSQL 16, Jest, Vitest, Playwright 1.64.1.

**Spec:** Yêu cầu trong chat ngày 28/10/2026: kiểm thử E2E toàn FE/BE/Admin, dùng `SmartMeal.Tests` có sẵn, chụp ảnh và viết file docs; chạy lại tự động bằng một lệnh.

## Global Constraints

- Không dùng database demo `SmartMealDb` hoặc các cổng đang chạy 3000/5000/8081 cho dữ liệu kiểm thử.
- QA API: `http://127.0.0.1:5001`; QA Admin: `http://127.0.0.1:3001`; QA mobile web: `http://127.0.0.1:8082`.
- Không dùng SMTP, Gemini hoặc cổng thanh toán thật. Dữ liệu QA và mật khẩu mẫu chỉ dành cho môi trường dùng một lần.
- Cài dependencies theo lockfile; nếu thiếu Docker/Node hoặc một bước không chạy được phải báo rõ, không ghi nhận PASS.
- Giữ nguyên các bộ test hiện tại. Không bỏ test hoặc đổi kỳ vọng để làm xanh kết quả.
- Ảnh chụp phải do trình duyệt thật sinh ra trong lần chạy; mobile web không được gọi là native iPhone E2E.
- Chỉ dọn tiến trình và Compose project do bộ QA này tạo; luôn giữ báo cáo và log, kể cả khi test lỗi.

## Review Focus

1. Một test hoặc CLI lỗi phải làm cả lệnh trả exit code khác 0 và hiện lỗi trong báo cáo.
2. Database QA phải tách riêng, không kế thừa secrets từ `.env` của người dùng.
3. Trên máy mới, lệnh tự cài công cụ test/browser; không đòi .NET SDK trên Windows.
4. Chạy lần hai không bị sót service/port hoặc dùng ảnh và JSON của lần trước.
5. Chứng cứ phải phân biệt unit/integration/live-service/browser E2E và liệt kê test bỏ qua.

## Task 1 — Môi trường QA và bộ SmartMeal.Tests

**Files:** `tests/system/docker-compose.e2e.yml`, các điều chỉnh test harness được chứng minh cần thiết.

**Interfaces:** Compose project `smartmeal-e2e`, services `db`, `api`, `backend-tests`; bind thư mục kết quả qua `SMARTMEAL_E2E_OUTPUT`; backend xuất `/results/backend/backend.trx`. API QA dùng tài khoản admin mẫu `admin@smartmeal.com` / `Admin@123456` vì live tests hiện tại dùng cặp này.

- [ ] Dựng PostgreSQL/API QA với cấu hình mẫu, rate limit đủ cho test, AI demo được gắn cờ.
- [ ] Chạy toàn bộ `backend/SmartMeal.Tests/SmartMeal.Tests.csproj` trong SDK container, có `SMARTMEAL_TEST_DB` nên không bỏ qua test DB.
- [ ] Xác minh TRX có test thực thi; ghi nhận đúng failures.

## Task 2 — Browser E2E và ảnh chụp

**Files:** `tests/system/package.json`, `tests/system/playwright.config.mjs`, `tests/system/specs/admin.spec.mjs`, `tests/system/specs/mobile.spec.mjs`, proxy QA tùy chỉnh trong `frontend/admin-web/vite.config.js`.

**Interfaces:** `SMARTMEAL_E2E_API_URL=http://127.0.0.1:5001/api`, `SMARTMEAL_E2E_ADMIN_URL=http://127.0.0.1:3001`, `SMARTMEAL_E2E_MOBILE_URL=http://127.0.0.1:8082`. Specs dùng `@playwright/test`, chỉ truy cập API QA thật; Playwright JSON ở `$SMARTMEAL_E2E_OUTPUT/playwright.json`.

- [ ] Admin: đăng nhập, menu/báo cáo, tạo/sửa món, kiểm tra dữ liệu qua API mobile, quản trị user QA, kiểm tra xác nhận/hủy.
- [ ] Mobile web: đăng nhập/onboarding tùy dữ liệu fixture, Dashboard, nhật ký, tìm và ghi món, nước, công thức và hồ sơ.
- [ ] Chụp ảnh kết quả mỗi test, giữ trace/video khi lỗi; chạy Chromium và WebKit cho mobile.
- [ ] Các luồng ghi dữ liệu phải kiểm tra lại qua API hoặc tải lại trang để chứng minh đã lưu.

## Task 3 — Một lệnh chạy và báo cáo

**Files:** root `package.json`, `tests/system/run.mjs`, `tests/system/report.mjs`, `tests/system/report.test.mjs`, `tests/system/README.md`, `.gitignore`, báo cáo `docs/test-reports/SYSTEM_E2E_FE_BE_ADMIN_<date>.md`.

**Interfaces:** root `npm run test:e2e`; test báo cáo bằng `node --test tests/system/report.test.mjs`; thư mục raw `.e2e-results/<run-id>`; ảnh liên kết trong `docs/test-reports/assets/system-e2e-<run-id>`.

- [ ] Viết test failing cho đọc kết quả và tổng hợp lỗi trước khi viết bộ báo cáo.
- [ ] Điều phối cài đặt, QA backend, toàn bộ mobile Jest + live, Admin Vitest + live, TypeScript/lint/build và Playwright.
- [ ] Luôn ghi báo cáo cuối, raw logs/JSON/TRX; không dừng các bước độc lập chỉ vì một bước lỗi.
- [ ] Dọn QA trong finally và trả exit code chính xác.
- [ ] Chạy chính `npm run test:e2e`, kiểm tra ảnh và báo cáo đã sinh, rồi rà soát độc lập bộ chạy.
