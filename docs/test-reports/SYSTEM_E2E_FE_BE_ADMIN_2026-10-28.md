# Báo cáo kiểm thử toàn hệ thống SmartMeal — 2026-10-28

**Kết quả: FAIL** · Lần chạy: `20261028090248-7192` · Git: `2fdb5a9610531f974b92f424f2b5e9f66ee685e5`

Bắt đầu: 2026-10-28T02:02:48.462Z. Kết thúc: 2026-10-28T02:11:27.901Z. Ngày báo cáo theo Asia/Saigon.

## Phạm vi và môi trường

- Backend: SmartMeal.Tests gồm kiểm thử HTTP/integration với PostgreSQL QA; đây không phải thao tác trình duyệt.
- Frontend mobile: Jest gồm unit và live-service gọi API QA thật; các native adapters trong Jest vẫn có fixture/mock.
- Admin: Vitest gồm unit/component và live API; phân biệt với browser E2E bên dưới.
- Browser E2E: Admin Chromium; mobile web Chromium và WebKit ở kích thước điện thoại. **Không phải native iPhone E2E hay kiểm thử iPhone vật lý.**
- QA dùng API 5001, Admin 3001, mobile web 8082 và database dùng một lần; không dùng database demo.
- Không gọi dịch vụ bên ngoài thật: AI dùng demo/fixture, email không gửi qua SMTP, thanh toán dùng mock. Không xác nhận chất lượng AI, giao email hay giao dịch thật.
- Camera, microphone, push native và tải ảnh đại diện native cần kiểm thử thiết bị riêng; không suy ra PASS từ mobile web.

## Kết quả tổng hợp

| Tổng ca | Đạt | Lỗi | Bỏ qua |
| ---: | ---: | ---: | ---: |
| 1241 | 1231 | 10 | 0 |

Số lượng chỉ lấy từ kết quả máy đọc được. Bỏ qua không được tính là đạt; flaky được tính là lỗi. CLI lỗi, bước bị chặn, thiếu kết quả hoặc không thực thi ca nào đều làm lần chạy FAIL.

| Bước | Loại | Trạng thái | Exit | Thời gian (s) | Tổng/Đạt/Lỗi/Bỏ qua | Chứng cứ |
| --- | --- | --- | ---: | ---: | --- | --- |
| Exclusive system QA run | check | passed | 0 | 0.00 | — | — |
| Node &gt;=24.3 | check | passed | 0 | 0.00 | — | — |
| Runner report and failure-propagation tests | check | passed | 0 | 0.19 | — | [Log](<../../.e2e-results/20261028090248-7192/runner-unit.log>) |
| Docker daemon | check | passed | 0 | 0.54 | — | [Log](<../../.e2e-results/20261028090248-7192/docker-preflight.log>) |
| browser locked dependencies | check | passed | 0 | 0.93 | — | [Log](<../../.e2e-results/20261028090248-7192/browser-dependencies.log>) |
| admin locked dependencies | check | passed | 0 | 0.61 | — | [Log](<../../.e2e-results/20261028090248-7192/admin-dependencies.log>) |
| mobile locked dependencies | check | passed | 0 | 1.02 | — | [Log](<../../.e2e-results/20261028090248-7192/mobile-dependencies.log>) |
| Install Chromium and WebKit | check | passed | 0 | 0.67 | — | [Log](<../../.e2e-results/20261028090248-7192/browser-install.log>) |
| Reset disposable QA Compose project | check | passed | 0 | 1.94 | — | [Log](<../../.e2e-results/20261028090248-7192/qa-reset.log>) |
| Build and start isolated QA API | check | passed | 0 | 6.11 | — | [Log](<../../.e2e-results/20261028090248-7192/qa-up.log>) |
| QA Swagger HTTP 200 | check | passed | 0 | 6.47 | — | — |
| Backend PostgreSQL integration suite | trx | failed | 1 | 162.29 | 362/361/1/0 | [Log](<../../.e2e-results/20261028090248-7192/backend.log>) · [Kết quả](<../../.e2e-results/20261028090248-7192/backend/backend.trx>) |
| Mobile Jest including live API suites | jest | passed | 0 | 175.94 | 634/634/0/0 | [Log](<../../.e2e-results/20261028090248-7192/mobile.log>) · [Kết quả](<../../.e2e-results/20261028090248-7192/mobile.json>) |
| Admin Vitest including live API suites | vitest | passed | 0 | 15.13 | 217/217/0/0 | [Log](<../../.e2e-results/20261028090248-7192/admin.log>) · [Kết quả](<../../.e2e-results/20261028090248-7192/admin.json>) |
| Mobile TypeScript | check | passed | 0 | 8.18 | — | [Log](<../../.e2e-results/20261028090248-7192/mobile-types.log>) |
| Mobile lint | check | passed | 0 | 5.38 | — | [Log](<../../.e2e-results/20261028090248-7192/mobile-lint.log>) |
| Admin lint | check | passed | 0 | 2.26 | — | [Log](<../../.e2e-results/20261028090248-7192/admin-lint.log>) |
| Admin production build | check | passed | 0 | 1.31 | — | [Log](<../../.e2e-results/20261028090248-7192/admin-build.log>) |
| Export QA mobile web bundle | check | passed | 0 | 7.14 | — | [Log](<../../.e2e-results/20261028090248-7192/mobile-web-build.log>) |
| QA Admin on 3001 | check | passed | 0 | 1.56 | — | [Log](<../../.e2e-results/20261028090248-7192/admin-server.log>) |
| QA mobile web export on 8082 | check | passed | 0 | 1.53 | — | [Log](<../../.e2e-results/20261028090248-7192/mobile-server.log>) |
| Admin and mobile browser E2E | playwright | failed | 1 | 117.59 | 28/19/9/0 | [Log](<../../.e2e-results/20261028090248-7192/playwright.log>) · [Kết quả](<../../.e2e-results/20261028090248-7192/playwright.json>) |
| Capture QA backend logs | check | passed | 0 | 0.95 | — | [Log](<../../.e2e-results/20261028090248-7192/qa-logs.log>) |
| Remove disposable QA Compose project | check | passed | 0 | 1.09 | — | [Log](<../../.e2e-results/20261028090248-7192/qa-cleanup.log>) |

## Chi tiết ca lỗi và bỏ qua — Backend, Jest, Vitest

Tên ca và thông báo dưới đây được đọc từ TRX/JSON của chính lần chạy; thông báo dài được rút gọn, kết quả gốc giữ đầy đủ.

| Bộ kiểm thử | Ca | Trạng thái | Thông báo |
| --- | --- | --- | --- |
| Backend PostgreSQL integration suite | SmartMeal.Tests.AdminApiTests.The_default_admin_password_does_not_work_outside_development | failed | Assert.Equal() Failure: Values differ<br>Expected: Unauthorized<br>Actual:   OK<br>   at SmartMeal.Tests.AdminApiTests.The_default_admin_password_does_not_work_outside_development() in /work/backend/SmartMeal.Tests/AdminApiTests.cs:line 283<br>--- End of stack trace from previous location --- |

## Các ca browser E2E thực tế

| Project | Ca kiểm thử | Kết quả | Giây | Ảnh thực tế |
| --- | --- | --- | ---: | --- |
| admin | admin.spec.mjs › Admin rejects an incorrect password without storing a session | passed | 8.21 | [Ảnh 1](<assets/system-e2e-20261028090248-7192/admin-2fa7975a7b38.png>) |
| admin | admin.spec.mjs › Admin dashboard renders real API metrics, persists login, and logs out | passed | 3.31 | [Ảnh 1](<assets/system-e2e-20261028090248-7192/admin-670414896310.png>) · [Ảnh 2](<assets/system-e2e-20261028090248-7192/admin-35ba2ec57c5c.png>) |
| admin | admin.spec.mjs › Admin searches a new app user and opens their real profile | passed | 3.41 | [Ảnh 1](<assets/system-e2e-20261028090248-7192/admin-1efacd29734f.png>) |
| admin | admin.spec.mjs › Admin changes a disposable user role and cancels destructive deletion | passed | 3.84 | [Ảnh 1](<assets/system-e2e-20261028090248-7192/admin-d38dbd5c5027.png>) |
| admin | admin.spec.mjs › Admin bans and unbans a QA user, changing actual mobile login access | passed | 4.12 | [Ảnh 1](<assets/system-e2e-20261028090248-7192/admin-60cadaf9a2c3.png>) |
| admin | admin.spec.mjs › Admin creates a recipe in UI and the mobile recipe API sees persisted ingredients | passed | 4.58 | [Ảnh 1](<assets/system-e2e-20261028090248-7192/admin-b9e80374cb06.png>) |
| admin | admin.spec.mjs › Admin edits a recipe, cancels delete with Escape, then confirms deletion | passed | 4.70 | [Ảnh 1](<assets/system-e2e-20261028090248-7192/admin-48f1838ef7c9.png>) |
| admin | admin.spec.mjs › Admin creates, updates, and deletes a disposable reward challenge | passed | 4.51 | [Ảnh 1](<assets/system-e2e-20261028090248-7192/admin-4268b98cf804.png>) |
| admin | admin.spec.mjs › Subscription menu shows actual plans and transaction results | passed | 3.20 | [Ảnh 1](<assets/system-e2e-20261028090248-7192/admin-e42021276bcc.png>) |
| admin | admin.spec.mjs › Revenue menu renders API totals and applies a real date filter | passed | 3.07 | [Ảnh 1](<assets/system-e2e-20261028090248-7192/admin-37b627c8cbeb.png>) |
| admin | admin.spec.mjs › Engagement and system menus show real analytics and database health | passed | 3.35 | [Ảnh 1](<assets/system-e2e-20261028090248-7192/admin-90db19d9363a.png>) |
| admin | admin.spec.mjs › Admin navigation survives F5, Back and Forward at a tablet viewport | passed | 4.04 | [Ảnh 1](<assets/system-e2e-20261028090248-7192/admin-32be040a8f33.png>) |
| mobile-chromium | mobile.spec.mjs › Mobile web · real QA API › auth: invalid email and short password block login without a network request | passed | 6.13 | [Ảnh 1](<assets/system-e2e-20261028090248-7192/mobile-chromium-e387f904cbf5.png>) |
| mobile-chromium | mobile.spec.mjs › Mobile web · real QA API › auth: backend rejects a wrong password, then the same account can log in | passed | 3.69 | [Ảnh 1](<assets/system-e2e-20261028090248-7192/mobile-chromium-866b105249c9.png>) · [Ảnh 2](<assets/system-e2e-20261028090248-7192/mobile-chromium-f53fc37152d9.png>) |
| mobile-chromium | mobile.spec.mjs › Mobile web · real QA API › auth: session survives reload; logout removes it across another reload | passed | 4.18 | [Ảnh 1](<assets/system-e2e-20261028090248-7192/mobile-chromium-eec53db8ec7b.png>) |
| mobile-chromium | mobile.spec.mjs › Mobile web · real QA API › dashboard: real calorie target and all five main tabs render their own content | passed | 3.98 | [Ảnh 1](<assets/system-e2e-20261028090248-7192/mobile-chromium-facfe219acc9.png>) |
| mobile-chromium | mobile.spec.mjs › Mobile web · real QA API › diary: search a real food, change meal, double serving and persist exact nutrition | passed | 5.46 | [Ảnh 1](<assets/system-e2e-20261028090248-7192/mobile-chromium-cae560e2b384.png>) · [Ảnh 2](<assets/system-e2e-20261028090248-7192/mobile-chromium-dddbf13ae034.png>) |
| mobile-chromium | mobile.spec.mjs › Mobile web · real QA API › water: add a cup, verify server record, undo and verify the record is removed | passed | 4.13 | [Ảnh 1](<assets/system-e2e-20261028090248-7192/mobile-chromium-c496f723594a.png>) · [Ảnh 2](<assets/system-e2e-20261028090248-7192/mobile-chromium-62827ba7b1bb.png>) |
| mobile-chromium | mobile.spec.mjs › Mobile web · real QA API › recipes: open ingredients and instructions, favorite and find the saved recipe after reload | passed | 5.35 | [Ảnh 1](<assets/system-e2e-20261028090248-7192/mobile-chromium-aa602bc8a376.png>) · [Ảnh 2](<assets/system-e2e-20261028090248-7192/mobile-chromium-d8ec056fa47f.png>) |
| mobile-chromium | mobile.spec.mjs › Mobile web · real QA API › profile: edited name persists in API and after a browser reload | failed | 19.48 | [Ảnh 1](<assets/system-e2e-20261028090248-7192/mobile-chromium-1847b3c9f934.png>) · [Ảnh 2](<assets/system-e2e-20261028090248-7192/mobile-chromium-80a79627a424.png>) |
| mobile-webkit | mobile.spec.mjs › Mobile web · real QA API › auth: invalid email and short password block login without a network request | failed | 0.51 | [Ảnh 1](<assets/system-e2e-20261028090248-7192/mobile-webkit-5a4d11ffc4cd.png>) |
| mobile-webkit | mobile.spec.mjs › Mobile web · real QA API › auth: backend rejects a wrong password, then the same account can log in | failed | 0.44 | [Ảnh 1](<assets/system-e2e-20261028090248-7192/mobile-webkit-c1bb6df6b7f5.png>) |
| mobile-webkit | mobile.spec.mjs › Mobile web · real QA API › auth: session survives reload; logout removes it across another reload | failed | 0.43 | [Ảnh 1](<assets/system-e2e-20261028090248-7192/mobile-webkit-694ffe494003.png>) |
| mobile-webkit | mobile.spec.mjs › Mobile web · real QA API › dashboard: real calorie target and all five main tabs render their own content | failed | 0.44 | [Ảnh 1](<assets/system-e2e-20261028090248-7192/mobile-webkit-6848e07919b6.png>) |
| mobile-webkit | mobile.spec.mjs › Mobile web · real QA API › diary: search a real food, change meal, double serving and persist exact nutrition | failed | 0.41 | [Ảnh 1](<assets/system-e2e-20261028090248-7192/mobile-webkit-f36db0ed44e5.png>) |
| mobile-webkit | mobile.spec.mjs › Mobile web · real QA API › water: add a cup, verify server record, undo and verify the record is removed | failed | 0.50 | [Ảnh 1](<assets/system-e2e-20261028090248-7192/mobile-webkit-28dae148d4a9.png>) |
| mobile-webkit | mobile.spec.mjs › Mobile web · real QA API › recipes: open ingredients and instructions, favorite and find the saved recipe after reload | failed | 0.42 | [Ảnh 1](<assets/system-e2e-20261028090248-7192/mobile-webkit-63d1332f6926.png>) |
| mobile-webkit | mobile.spec.mjs › Mobile web · real QA API › profile: edited name persists in API and after a browser reload | failed | 0.45 | [Ảnh 1](<assets/system-e2e-20261028090248-7192/mobile-webkit-67b823afbcac.png>) |

## Ảnh chụp minh chứng

Ảnh bên dưới được chép từ attachment PNG thực tế của lần chạy. Bảng ca phía trên liên kết toàn bộ ảnh, bao gồm ảnh của ca lỗi.

### admin · passed

admin.spec.mjs › Admin dashboard renders real API metrics, persists login, and logs out

![admin passed](<assets/system-e2e-20261028090248-7192/admin-670414896310.png>)

### admin · passed

admin.spec.mjs › Admin searches a new app user and opens their real profile

![admin passed](<assets/system-e2e-20261028090248-7192/admin-1efacd29734f.png>)

### admin · passed

admin.spec.mjs › Admin creates a recipe in UI and the mobile recipe API sees persisted ingredients

![admin passed](<assets/system-e2e-20261028090248-7192/admin-b9e80374cb06.png>)

### mobile-chromium · passed

mobile.spec.mjs › Mobile web · real QA API › dashboard: real calorie target and all five main tabs render their own content

![mobile-chromium passed](<assets/system-e2e-20261028090248-7192/mobile-chromium-facfe219acc9.png>)

### mobile-chromium · passed

mobile.spec.mjs › Mobile web · real QA API › diary: search a real food, change meal, double serving and persist exact nutrition

![mobile-chromium passed](<assets/system-e2e-20261028090248-7192/mobile-chromium-cae560e2b384.png>)

### mobile-chromium · failed

mobile.spec.mjs › Mobile web · real QA API › profile: edited name persists in API and after a browser reload

![mobile-chromium failed](<assets/system-e2e-20261028090248-7192/mobile-chromium-1847b3c9f934.png>)

### mobile-webkit · failed

mobile.spec.mjs › Mobile web · real QA API › auth: invalid email and short password block login without a network request

![mobile-webkit failed](<assets/system-e2e-20261028090248-7192/mobile-webkit-5a4d11ffc4cd.png>)

### mobile-webkit · failed

mobile.spec.mjs › Mobile web · real QA API › auth: backend rejects a wrong password, then the same account can log in

![mobile-webkit failed](<assets/system-e2e-20261028090248-7192/mobile-webkit-c1bb6df6b7f5.png>)

### mobile-webkit · failed

mobile.spec.mjs › Mobile web · real QA API › auth: session survives reload; logout removes it across another reload

![mobile-webkit failed](<assets/system-e2e-20261028090248-7192/mobile-webkit-694ffe494003.png>)

### mobile-webkit · failed

mobile.spec.mjs › Mobile web · real QA API › dashboard: real calorie target and all five main tabs render their own content

![mobile-webkit failed](<assets/system-e2e-20261028090248-7192/mobile-webkit-6848e07919b6.png>)

### mobile-webkit · failed

mobile.spec.mjs › Mobile web · real QA API › diary: search a real food, change meal, double serving and persist exact nutrition

![mobile-webkit failed](<assets/system-e2e-20261028090248-7192/mobile-webkit-f36db0ed44e5.png>)

### mobile-webkit · failed

mobile.spec.mjs › Mobile web · real QA API › water: add a cup, verify server record, undo and verify the record is removed

![mobile-webkit failed](<assets/system-e2e-20261028090248-7192/mobile-webkit-28dae148d4a9.png>)

### mobile-webkit · failed

mobile.spec.mjs › Mobile web · real QA API › recipes: open ingredients and instructions, favorite and find the saved recipe after reload

![mobile-webkit failed](<assets/system-e2e-20261028090248-7192/mobile-webkit-63d1332f6926.png>)

### mobile-webkit · failed

mobile.spec.mjs › Mobile web · real QA API › profile: edited name persists in API and after a browser reload

![mobile-webkit failed](<assets/system-e2e-20261028090248-7192/mobile-webkit-67b823afbcac.png>)

## Lỗi, bước bị chặn và ca bỏ qua

- **Backend PostgreSQL integration suite**: failed, exit 1. Xem log và kết quả của bước trong bảng; số ca bỏ qua không tính PASS.

- **Admin and mobile browser E2E**: failed, exit 1. Xem log và kết quả của bước trong bảng; số ca bỏ qua không tính PASS.

- **mobile-chromium · mobile.spec.mjs › Mobile web · real QA API › profile: edited name persists in API and after a browser reload**: failed. Error: expect(locator).toBeVisible() failed<br><br>Locator: getByRole('button', { name: 'Ghi bữa ăn', exact: true })<br>Expected: visible<br>Timeout: 15000ms<br>Error: element(s) not found<br><br>Call log:<br>  - Expect "toBeVisible" getByRole('button', { name: 'Ghi bữa ăn', exact: true }) with timeout 15000ms<br>  - waiting for getByRole('button', { name: 'Ghi bữa ăn', exact: true })<br><br><br>  159 \|     await evidence(page, testInfo, 'profile-name-saved');<br>  160 \|     await page.reload();<br>&gt; 161 \|     await expect(page.getByRole('button', { name: 'Ghi bữa ăn', exact: true })).toBeVisible();<br>      \|                                                                                 ^<br>  162 \|     await selectTab(page, 'Cá nhân');<br>  163 \|     await expect(page.getByText(updatedName, { exact: true })).toBeVisible();<br>  164 \|   });<br>    at D:\kỳ 8\SmartMeal\tests\system\specs\mobile.spec.mjs:161:81<br>Error: expect(locator).toBeVisible() failed<br><br>Locator: getByRole('button', { name: 'Ghi bữa ăn', exact: true })<br>Expected: visible<br>Timeout: 15000ms<br>Error: element(s) not found<br><br>Call log:<br>  - Expect "toBeVisible" getByRole('button', { name: 'Ghi bữa ăn', exact: true }) with timeout 15000ms<br>  - waiting for getByRole('button', { name: 'Ghi bữa ăn', exact: true })<br>

- **mobile-webkit · mobile.spec.mjs › Mobile web · real QA API › auth: invalid email and short password block login without a network request**: failed. Error: apiRequestContext.fetch: connect ECONNREFUSED 127.0.0.1:5001<br>Call log:<br>  - → POST http://127.0.0.1:5001/api/auth/register<br>    - user-agent: Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148 Safari/604.1<br>    - accept: */*<br>    - accept-encoding: gzip,deflate,br<br>    - content-type: application/json<br>    - content-length: 115<br><br><br>   at mobile.helpers.mjs:14<br><br>  12 \|     throw new Error('Mobile E2E fixtures require the isolated HTTP loopback QA API on port 5001.');<br>  13 \|   }<br>&gt; 14 \|   const response = await request.fetch(`${apiUrl}${path}`, {<br>     \|                                  ^<br>  15 \|     method,<br>  16 \|     headers: token ? { Authorization: `Bearer ${token}` } : {},<br>  17 \|     ...(data === undefined ? {} : { data }),<br>    at api (D:\kỳ 8\SmartMeal\tests\system\specs\mobile.helpers.mjs:14:34)<br>    at Object.account (D:\kỳ 8\SmartMeal\tests\system\specs\mobile.helpers.mjs:30:24)<br>Error: apiRequestContext.fetch: connect ECONNREFUSED 127.0.0.1:5001<br>Call log:<br>  - → POST http://127.0.0.1:5001/api/auth/register<br>    - user-agent: Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148 Safari/604.1<br>    - accept: */*<br>    - accept-encoding: gzip,deflate,br<br>    - content-type: application/json<br>    - content-length: 115<br>

- **mobile-webkit · mobile.spec.mjs › Mobile web · real QA API › auth: backend rejects a wrong password, then the same account can log in**: failed. Error: apiRequestContext.fetch: connect ECONNREFUSED 127.0.0.1:5001<br>Call log:<br>  - → POST http://127.0.0.1:5001/api/auth/register<br>    - user-agent: Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148 Safari/604.1<br>    - accept: */*<br>    - accept-encoding: gzip,deflate,br<br>    - content-type: application/json<br>    - content-length: 115<br><br><br>   at mobile.helpers.mjs:14<br><br>  12 \|     throw new Error('Mobile E2E fixtures require the isolated HTTP loopback QA API on port 5001.');<br>  13 \|   }<br>&gt; 14 \|   const response = await request.fetch(`${apiUrl}${path}`, {<br>     \|                                  ^<br>  15 \|     method,<br>  16 \|     headers: token ? { Authorization: `Bearer ${token}` } : {},<br>  17 \|     ...(data === undefined ? {} : { data }),<br>    at api (D:\kỳ 8\SmartMeal\tests\system\specs\mobile.helpers.mjs:14:34)<br>    at Object.account (D:\kỳ 8\SmartMeal\tests\system\specs\mobile.helpers.mjs:30:24)<br>Error: apiRequestContext.fetch: connect ECONNREFUSED 127.0.0.1:5001<br>Call log:<br>  - → POST http://127.0.0.1:5001/api/auth/register<br>    - user-agent: Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148 Safari/604.1<br>    - accept: */*<br>    - accept-encoding: gzip,deflate,br<br>    - content-type: application/json<br>    - content-length: 115<br>

- **mobile-webkit · mobile.spec.mjs › Mobile web · real QA API › auth: session survives reload; logout removes it across another reload**: failed. Error: apiRequestContext.fetch: connect ECONNREFUSED 127.0.0.1:5001<br>Call log:<br>  - → POST http://127.0.0.1:5001/api/auth/register<br>    - user-agent: Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148 Safari/604.1<br>    - accept: */*<br>    - accept-encoding: gzip,deflate,br<br>    - content-type: application/json<br>    - content-length: 115<br><br><br>   at mobile.helpers.mjs:14<br><br>  12 \|     throw new Error('Mobile E2E fixtures require the isolated HTTP loopback QA API on port 5001.');<br>  13 \|   }<br>&gt; 14 \|   const response = await request.fetch(`${apiUrl}${path}`, {<br>     \|                                  ^<br>  15 \|     method,<br>  16 \|     headers: token ? { Authorization: `Bearer ${token}` } : {},<br>  17 \|     ...(data === undefined ? {} : { data }),<br>    at api (D:\kỳ 8\SmartMeal\tests\system\specs\mobile.helpers.mjs:14:34)<br>    at Object.account (D:\kỳ 8\SmartMeal\tests\system\specs\mobile.helpers.mjs:30:24)<br>Error: apiRequestContext.fetch: connect ECONNREFUSED 127.0.0.1:5001<br>Call log:<br>  - → POST http://127.0.0.1:5001/api/auth/register<br>    - user-agent: Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148 Safari/604.1<br>    - accept: */*<br>    - accept-encoding: gzip,deflate,br<br>    - content-type: application/json<br>    - content-length: 115<br>

- **mobile-webkit · mobile.spec.mjs › Mobile web · real QA API › dashboard: real calorie target and all five main tabs render their own content**: failed. Error: apiRequestContext.fetch: connect ECONNREFUSED 127.0.0.1:5001<br>Call log:<br>  - → POST http://127.0.0.1:5001/api/auth/register<br>    - user-agent: Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148 Safari/604.1<br>    - accept: */*<br>    - accept-encoding: gzip,deflate,br<br>    - content-type: application/json<br>    - content-length: 115<br><br><br>   at mobile.helpers.mjs:14<br><br>  12 \|     throw new Error('Mobile E2E fixtures require the isolated HTTP loopback QA API on port 5001.');<br>  13 \|   }<br>&gt; 14 \|   const response = await request.fetch(`${apiUrl}${path}`, {<br>     \|                                  ^<br>  15 \|     method,<br>  16 \|     headers: token ? { Authorization: `Bearer ${token}` } : {},<br>  17 \|     ...(data === undefined ? {} : { data }),<br>    at api (D:\kỳ 8\SmartMeal\tests\system\specs\mobile.helpers.mjs:14:34)<br>    at Object.account (D:\kỳ 8\SmartMeal\tests\system\specs\mobile.helpers.mjs:30:24)<br>Error: apiRequestContext.fetch: connect ECONNREFUSED 127.0.0.1:5001<br>Call log:<br>  - → POST http://127.0.0.1:5001/api/auth/register<br>    - user-agent: Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148 Safari/604.1<br>    - accept: */*<br>    - accept-encoding: gzip,deflate,br<br>    - content-type: application/json<br>    - content-length: 115<br>

- **mobile-webkit · mobile.spec.mjs › Mobile web · real QA API › diary: search a real food, change meal, double serving and persist exact nutrition**: failed. Error: apiRequestContext.fetch: connect ECONNREFUSED 127.0.0.1:5001<br>Call log:<br>  - → POST http://127.0.0.1:5001/api/auth/register<br>    - user-agent: Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148 Safari/604.1<br>    - accept: */*<br>    - accept-encoding: gzip,deflate,br<br>    - content-type: application/json<br>    - content-length: 115<br><br><br>   at mobile.helpers.mjs:14<br><br>  12 \|     throw new Error('Mobile E2E fixtures require the isolated HTTP loopback QA API on port 5001.');<br>  13 \|   }<br>&gt; 14 \|   const response = await request.fetch(`${apiUrl}${path}`, {<br>     \|                                  ^<br>  15 \|     method,<br>  16 \|     headers: token ? { Authorization: `Bearer ${token}` } : {},<br>  17 \|     ...(data === undefined ? {} : { data }),<br>    at api (D:\kỳ 8\SmartMeal\tests\system\specs\mobile.helpers.mjs:14:34)<br>    at Object.account (D:\kỳ 8\SmartMeal\tests\system\specs\mobile.helpers.mjs:30:24)<br>Error: apiRequestContext.fetch: connect ECONNREFUSED 127.0.0.1:5001<br>Call log:<br>  - → POST http://127.0.0.1:5001/api/auth/register<br>    - user-agent: Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148 Safari/604.1<br>    - accept: */*<br>    - accept-encoding: gzip,deflate,br<br>    - content-type: application/json<br>    - content-length: 115<br>

- **mobile-webkit · mobile.spec.mjs › Mobile web · real QA API › water: add a cup, verify server record, undo and verify the record is removed**: failed. Error: apiRequestContext.fetch: connect ECONNREFUSED 127.0.0.1:5001<br>Call log:<br>  - → POST http://127.0.0.1:5001/api/auth/register<br>    - user-agent: Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148 Safari/604.1<br>    - accept: */*<br>    - accept-encoding: gzip,deflate,br<br>    - content-type: application/json<br>    - content-length: 115<br><br><br>   at mobile.helpers.mjs:14<br><br>  12 \|     throw new Error('Mobile E2E fixtures require the isolated HTTP loopback QA API on port 5001.');<br>  13 \|   }<br>&gt; 14 \|   const response = await request.fetch(`${apiUrl}${path}`, {<br>     \|                                  ^<br>  15 \|     method,<br>  16 \|     headers: token ? { Authorization: `Bearer ${token}` } : {},<br>  17 \|     ...(data === undefined ? {} : { data }),<br>    at api (D:\kỳ 8\SmartMeal\tests\system\specs\mobile.helpers.mjs:14:34)<br>    at Object.account (D:\kỳ 8\SmartMeal\tests\system\specs\mobile.helpers.mjs:30:24)<br>Error: apiRequestContext.fetch: connect ECONNREFUSED 127.0.0.1:5001<br>Call log:<br>  - → POST http://127.0.0.1:5001/api/auth/register<br>    - user-agent: Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148 Safari/604.1<br>    - accept: */*<br>    - accept-encoding: gzip,deflate,br<br>    - content-type: application/json<br>    - content-length: 115<br>

- **mobile-webkit · mobile.spec.mjs › Mobile web · real QA API › recipes: open ingredients and instructions, favorite and find the saved recipe after reload**: failed. Error: apiRequestContext.fetch: connect ECONNREFUSED 127.0.0.1:5001<br>Call log:<br>  - → POST http://127.0.0.1:5001/api/auth/register<br>    - user-agent: Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148 Safari/604.1<br>    - accept: */*<br>    - accept-encoding: gzip,deflate,br<br>    - content-type: application/json<br>    - content-length: 115<br><br><br>   at mobile.helpers.mjs:14<br><br>  12 \|     throw new Error('Mobile E2E fixtures require the isolated HTTP loopback QA API on port 5001.');<br>  13 \|   }<br>&gt; 14 \|   const response = await request.fetch(`${apiUrl}${path}`, {<br>     \|                                  ^<br>  15 \|     method,<br>  16 \|     headers: token ? { Authorization: `Bearer ${token}` } : {},<br>  17 \|     ...(data === undefined ? {} : { data }),<br>    at api (D:\kỳ 8\SmartMeal\tests\system\specs\mobile.helpers.mjs:14:34)<br>    at Object.account (D:\kỳ 8\SmartMeal\tests\system\specs\mobile.helpers.mjs:30:24)<br>Error: apiRequestContext.fetch: connect ECONNREFUSED 127.0.0.1:5001<br>Call log:<br>  - → POST http://127.0.0.1:5001/api/auth/register<br>    - user-agent: Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148 Safari/604.1<br>    - accept: */*<br>    - accept-encoding: gzip,deflate,br<br>    - content-type: application/json<br>    - content-length: 115<br>

- **mobile-webkit · mobile.spec.mjs › Mobile web · real QA API › profile: edited name persists in API and after a browser reload**: failed. Error: apiRequestContext.fetch: connect ECONNREFUSED 127.0.0.1:5001<br>Call log:<br>  - → POST http://127.0.0.1:5001/api/auth/register<br>    - user-agent: Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148 Safari/604.1<br>    - accept: */*<br>    - accept-encoding: gzip,deflate,br<br>    - content-type: application/json<br>    - content-length: 115<br><br><br>   at mobile.helpers.mjs:14<br><br>  12 \|     throw new Error('Mobile E2E fixtures require the isolated HTTP loopback QA API on port 5001.');<br>  13 \|   }<br>&gt; 14 \|   const response = await request.fetch(`${apiUrl}${path}`, {<br>     \|                                  ^<br>  15 \|     method,<br>  16 \|     headers: token ? { Authorization: `Bearer ${token}` } : {},<br>  17 \|     ...(data === undefined ? {} : { data }),<br>    at api (D:\kỳ 8\SmartMeal\tests\system\specs\mobile.helpers.mjs:14:34)<br>    at Object.account (D:\kỳ 8\SmartMeal\tests\system\specs\mobile.helpers.mjs:30:24)<br>Error: apiRequestContext.fetch: connect ECONNREFUSED 127.0.0.1:5001<br>Call log:<br>  - → POST http://127.0.0.1:5001/api/auth/register<br>    - user-agent: Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148 Safari/604.1<br>    - accept: */*<br>    - accept-encoding: gzip,deflate,br<br>    - content-type: application/json<br>    - content-length: 115<br>

## Ghi chú lần chạy

- Browser mobile coverage uses Chromium/WebKit, not a physical iPhone.

- Mobile browser tests serve an Expo web export through Vite preview, without an Expo development server.

- QA uses disposable PostgreSQL, demo AI, fake checkout credentials and no real SMTP/payment keys.

## Cách chạy lại

Từ thư mục gốc dự án:

```sh
npm run test:e2e
```

Cần Node.js 24.3+ và Docker Desktop đang hoạt động. Lệnh tự chuẩn bị QA, cài browser/dependencies khi cần, chạy các bộ kiểm thử, chụp ảnh và sinh báo cáo sau mỗi lần chạy. Lỗi trả exit code khác 0; logs và kết quả vẫn được giữ lại.

- [Toàn bộ artifacts của lần chạy (logs, JSON, TRX, traces và video nếu có)](<../../.e2e-results/20261028090248-7192>)
- [Báo cáo Playwright tương tác](<../../.e2e-results/20261028090248-7192/playwright-report/index.html>)

Tên báo cáo theo ngày; lần chạy tiếp theo trong cùng ngày cập nhật báo cáo này. Artifacts và ảnh được phân biệt bằng run ID; báo cáo không cộng dồn kết quả từ lần chạy trước.
