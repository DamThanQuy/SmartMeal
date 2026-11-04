# Báo cáo kiểm thử toàn hệ thống SmartMeal — 2026-11-04

**Kết quả: PASS** · Lần chạy: `20261104083110-22032` · Git: `27e6ba074079f0dbba2a846b18342a83b87ae733`

Bắt đầu: 2026-11-04T01:31:10.844Z. Kết thúc: 2026-11-04T01:39:56.044Z. Ngày báo cáo theo Asia/Saigon.

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
| 1241 | 1241 | 0 | 0 |

Số lượng chỉ lấy từ kết quả máy đọc được. Bỏ qua không được tính là đạt; flaky được tính là lỗi. CLI lỗi, bước bị chặn, thiếu kết quả hoặc không thực thi ca nào đều làm lần chạy FAIL.

| Bước | Loại | Trạng thái | Exit | Thời gian (s) | Tổng/Đạt/Lỗi/Bỏ qua | Chứng cứ |
| --- | --- | --- | ---: | ---: | --- | --- |
| Exclusive system QA run | check | passed | 0 | 0.00 | — | — |
| Node &gt;=24.3 | check | passed | 0 | 0.00 | — | — |
| Runner report and failure-propagation tests | check | passed | 0 | 0.15 | — | Log |
| Docker daemon | check | passed | 0 | 0.61 | — | Log |
| browser locked dependencies | check | passed | 0 | 2.36 | — | Log |
| admin locked dependencies | check | passed | 0 | 0.93 | — | Log |
| mobile locked dependencies | check | passed | 0 | 2.94 | — | Log |
| Install Chromium and WebKit | check | passed | 0 | 0.50 | — | Log |
| Reset disposable QA Compose project | check | passed | 0 | 0.15 | — | Log |
| Build and start isolated QA API | check | passed | 0 | 4.74 | — | Log |
| QA Swagger HTTP 200 | check | passed | 0 | 3.28 | — | — |
| Backend PostgreSQL integration suite | trx | passed | 0 | 87.99 | 362/362/0/0 | Log · Kết quả |
| Mobile Jest including live API suites | jest | passed | 0 | 111.89 | 634/634/0/0 | Log · Kết quả |
| Admin Vitest including live API suites | vitest | passed | 0 | 33.74 | 217/217/0/0 | Log · Kết quả |
| Mobile TypeScript | check | passed | 0 | 16.49 | — | Log |
| Mobile lint | check | passed | 0 | 32.18 | — | Log |
| Admin lint | check | passed | 0 | 0.42 | — | Log |
| Admin production build | check | passed | 0 | 5.10 | — | Log |
| Export QA mobile web bundle | check | passed | 0 | 31.13 | — | Log |
| QA Admin on 3001 | check | passed | 0 | 1.56 | — | Log |
| QA mobile web export on 8082 | check | passed | 0 | 1.54 | — | Log |
| Admin and mobile browser E2E | playwright | passed | 0 | 183.20 | 28/28/0/0 | Log · Kết quả |
| Capture QA backend logs | check | passed | 0 | 0.98 | — | Log |
| Remove disposable QA Compose project | check | passed | 0 | 1.82 | — | Log |

## Chi tiết ca lỗi và bỏ qua — Backend, Jest, Vitest

Tên ca và thông báo dưới đây được đọc từ TRX/JSON của chính lần chạy; thông báo dài được rút gọn, kết quả gốc giữ đầy đủ.

| Bộ kiểm thử | Ca | Trạng thái | Thông báo |
| --- | --- | --- | --- |
| — | Không có chi tiết ca lỗi/bỏ qua thu thập được | — | Đối chiếu trạng thái từng bước phía trên; đây không phải xác nhận toàn bộ bộ kiểm thử đạt. |

## Các ca browser E2E thực tế

| Project | Ca kiểm thử | Kết quả | Giây | Ảnh thực tế |
| --- | --- | --- | ---: | --- |
| admin | admin.spec.mjs › Admin rejects an incorrect password without storing a session | passed | 1.13 | [Ảnh 1](<assets/system-e2e-20261104083110-22032/admin-2fa7975a7b38.png>) |
| admin | admin.spec.mjs › Admin dashboard renders real API metrics, persists login, and logs out | passed | 1.68 | [Ảnh 1](<assets/system-e2e-20261104083110-22032/admin-88619a0424c4.png>) · [Ảnh 2](<assets/system-e2e-20261104083110-22032/admin-35ba2ec57c5c.png>) |
| admin | admin.spec.mjs › Admin searches a new app user and opens their real profile | passed | 1.83 | [Ảnh 1](<assets/system-e2e-20261104083110-22032/admin-1efacd29734f.png>) |
| admin | admin.spec.mjs › Admin changes a disposable user role and cancels destructive deletion | passed | 2.57 | [Ảnh 1](<assets/system-e2e-20261104083110-22032/admin-d38dbd5c5027.png>) |
| admin | admin.spec.mjs › Admin bans and unbans a QA user, changing actual mobile login access | passed | 4.55 | [Ảnh 1](<assets/system-e2e-20261104083110-22032/admin-60cadaf9a2c3.png>) |
| admin | admin.spec.mjs › Admin creates a recipe in UI and the mobile recipe API sees persisted ingredients | passed | 5.51 | [Ảnh 1](<assets/system-e2e-20261104083110-22032/admin-b9e80374cb06.png>) |
| admin | admin.spec.mjs › Admin edits a recipe, cancels delete with Escape, then confirms deletion | passed | 4.70 | [Ảnh 1](<assets/system-e2e-20261104083110-22032/admin-48f1838ef7c9.png>) |
| admin | admin.spec.mjs › Admin creates, updates, and deletes a disposable reward challenge | passed | 4.81 | [Ảnh 1](<assets/system-e2e-20261104083110-22032/admin-4268b98cf804.png>) |
| admin | admin.spec.mjs › Subscription menu shows actual plans and transaction results | passed | 3.81 | [Ảnh 1](<assets/system-e2e-20261104083110-22032/admin-e42021276bcc.png>) |
| admin | admin.spec.mjs › Revenue menu renders API totals and applies a real date filter | passed | 2.85 | [Ảnh 1](<assets/system-e2e-20261104083110-22032/admin-37b627c8cbeb.png>) |
| admin | admin.spec.mjs › Engagement and system menus show real analytics and database health | passed | 3.23 | [Ảnh 1](<assets/system-e2e-20261104083110-22032/admin-90db19d9363a.png>) |
| admin | admin.spec.mjs › Admin navigation survives F5, Back and Forward at a tablet viewport | passed | 4.40 | [Ảnh 1](<assets/system-e2e-20261104083110-22032/admin-32be040a8f33.png>) |
| mobile-chromium | mobile.spec.mjs › Mobile web · real QA API › auth: invalid email and short password block login without a network request | passed | 3.17 | [Ảnh 1](<assets/system-e2e-20261104083110-22032/mobile-chromium-e387f904cbf5.png>) |
| mobile-chromium | mobile.spec.mjs › Mobile web · real QA API › auth: backend rejects a wrong password, then the same account can log in | passed | 5.04 | [Ảnh 1](<assets/system-e2e-20261104083110-22032/mobile-chromium-3f93054cb0ac.png>) · [Ảnh 2](<assets/system-e2e-20261104083110-22032/mobile-chromium-f53fc37152d9.png>) |
| mobile-chromium | mobile.spec.mjs › Mobile web · real QA API › auth: session survives reload; logout removes it across another reload | passed | 5.32 | [Ảnh 1](<assets/system-e2e-20261104083110-22032/mobile-chromium-eec53db8ec7b.png>) |
| mobile-chromium | mobile.spec.mjs › Mobile web · real QA API › dashboard: real calorie target and all five main tabs render their own content | passed | 5.05 | [Ảnh 1](<assets/system-e2e-20261104083110-22032/mobile-chromium-facfe219acc9.png>) |
| mobile-chromium | mobile.spec.mjs › Mobile web · real QA API › diary: search a real food, change meal, double serving and persist exact nutrition | passed | 6.41 | [Ảnh 1](<assets/system-e2e-20261104083110-22032/mobile-chromium-611ae8e35d35.png>) · [Ảnh 2](<assets/system-e2e-20261104083110-22032/mobile-chromium-dddbf13ae034.png>) |
| mobile-chromium | mobile.spec.mjs › Mobile web · real QA API › water: add a cup, verify server record, undo and verify the record is removed | passed | 4.61 | [Ảnh 1](<assets/system-e2e-20261104083110-22032/mobile-chromium-63407966be6e.png>) · [Ảnh 2](<assets/system-e2e-20261104083110-22032/mobile-chromium-62827ba7b1bb.png>) |
| mobile-chromium | mobile.spec.mjs › Mobile web · real QA API › recipes: open ingredients and instructions, favorite and find the saved recipe after reload | passed | 8.20 | [Ảnh 1](<assets/system-e2e-20261104083110-22032/mobile-chromium-573cc1fb2a47.png>) · [Ảnh 2](<assets/system-e2e-20261104083110-22032/mobile-chromium-d8ec056fa47f.png>) |
| mobile-chromium | mobile.spec.mjs › Mobile web · real QA API › profile: edited name persists in API and after a browser reload | passed | 5.30 | [Ảnh 1](<assets/system-e2e-20261104083110-22032/mobile-chromium-8fce474c9385.png>) · [Ảnh 2](<assets/system-e2e-20261104083110-22032/mobile-chromium-cfbc5bd1329a.png>) |
| mobile-webkit | mobile.spec.mjs › Mobile web · real QA API › auth: invalid email and short password block login without a network request | passed | 3.78 | [Ảnh 1](<assets/system-e2e-20261104083110-22032/mobile-webkit-2842edf8de87.png>) |
| mobile-webkit | mobile.spec.mjs › Mobile web · real QA API › auth: backend rejects a wrong password, then the same account can log in | passed | 6.05 | [Ảnh 1](<assets/system-e2e-20261104083110-22032/mobile-webkit-3ad3b417b920.png>) · [Ảnh 2](<assets/system-e2e-20261104083110-22032/mobile-webkit-3115fcc1e2fc.png>) |
| mobile-webkit | mobile.spec.mjs › Mobile web · real QA API › auth: session survives reload; logout removes it across another reload | passed | 9.33 | [Ảnh 1](<assets/system-e2e-20261104083110-22032/mobile-webkit-f615e1cbcbc9.png>) |
| mobile-webkit | mobile.spec.mjs › Mobile web · real QA API › dashboard: real calorie target and all five main tabs render their own content | passed | 14.92 | [Ảnh 1](<assets/system-e2e-20261104083110-22032/mobile-webkit-4760688532fe.png>) |
| mobile-webkit | mobile.spec.mjs › Mobile web · real QA API › diary: search a real food, change meal, double serving and persist exact nutrition | passed | 16.66 | [Ảnh 1](<assets/system-e2e-20261104083110-22032/mobile-webkit-fc53a9d9d68b.png>) · [Ảnh 2](<assets/system-e2e-20261104083110-22032/mobile-webkit-820fb19be8c2.png>) |
| mobile-webkit | mobile.spec.mjs › Mobile web · real QA API › water: add a cup, verify server record, undo and verify the record is removed | passed | 12.45 | [Ảnh 1](<assets/system-e2e-20261104083110-22032/mobile-webkit-6f74225da943.png>) · [Ảnh 2](<assets/system-e2e-20261104083110-22032/mobile-webkit-2cd3d3c37dd3.png>) |
| mobile-webkit | mobile.spec.mjs › Mobile web · real QA API › recipes: open ingredients and instructions, favorite and find the saved recipe after reload | passed | 16.18 | [Ảnh 1](<assets/system-e2e-20261104083110-22032/mobile-webkit-f4706d2742b1.png>) · [Ảnh 2](<assets/system-e2e-20261104083110-22032/mobile-webkit-19cbfd4e21c0.png>) |
| mobile-webkit | mobile.spec.mjs › Mobile web · real QA API › profile: edited name persists in API and after a browser reload | passed | 12.23 | [Ảnh 1](<assets/system-e2e-20261104083110-22032/mobile-webkit-ec506240be66.png>) · [Ảnh 2](<assets/system-e2e-20261104083110-22032/mobile-webkit-6768b05fb1d0.png>) |

## Ảnh chụp minh chứng

Ảnh bên dưới được chép từ attachment PNG thực tế của lần chạy. Bảng ca phía trên liên kết toàn bộ ảnh, bao gồm ảnh của ca lỗi.

### admin · passed

admin.spec.mjs › Admin dashboard renders real API metrics, persists login, and logs out

![admin passed](<assets/system-e2e-20261104083110-22032/admin-88619a0424c4.png>)

### admin · passed

admin.spec.mjs › Admin searches a new app user and opens their real profile

![admin passed](<assets/system-e2e-20261104083110-22032/admin-1efacd29734f.png>)

### admin · passed

admin.spec.mjs › Admin creates a recipe in UI and the mobile recipe API sees persisted ingredients

![admin passed](<assets/system-e2e-20261104083110-22032/admin-b9e80374cb06.png>)

### mobile-chromium · passed

mobile.spec.mjs › Mobile web · real QA API › dashboard: real calorie target and all five main tabs render their own content

![mobile-chromium passed](<assets/system-e2e-20261104083110-22032/mobile-chromium-facfe219acc9.png>)

### mobile-chromium · passed

mobile.spec.mjs › Mobile web · real QA API › diary: search a real food, change meal, double serving and persist exact nutrition

![mobile-chromium passed](<assets/system-e2e-20261104083110-22032/mobile-chromium-611ae8e35d35.png>)

### mobile-chromium · passed

mobile.spec.mjs › Mobile web · real QA API › profile: edited name persists in API and after a browser reload

![mobile-chromium passed](<assets/system-e2e-20261104083110-22032/mobile-chromium-8fce474c9385.png>)

### mobile-webkit · passed

mobile.spec.mjs › Mobile web · real QA API › dashboard: real calorie target and all five main tabs render their own content

![mobile-webkit passed](<assets/system-e2e-20261104083110-22032/mobile-webkit-4760688532fe.png>)

### mobile-webkit · passed

mobile.spec.mjs › Mobile web · real QA API › diary: search a real food, change meal, double serving and persist exact nutrition

![mobile-webkit passed](<assets/system-e2e-20261104083110-22032/mobile-webkit-fc53a9d9d68b.png>)

### mobile-webkit · passed

mobile.spec.mjs › Mobile web · real QA API › profile: edited name persists in API and after a browser reload

![mobile-webkit passed](<assets/system-e2e-20261104083110-22032/mobile-webkit-ec506240be66.png>)

## Lỗi, bước bị chặn và ca bỏ qua

Không có lỗi hoặc ca bỏ qua trong các kết quả đã thu thập. Phạm vi giới hạn nêu trên vẫn áp dụng.

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

- Toàn bộ artifacts của lần chạy (logs, JSON, TRX, traces và video nếu có)
- Báo cáo Playwright tương tác

Tên báo cáo theo ngày; lần chạy tiếp theo trong cùng ngày cập nhật báo cáo này. Artifacts và ảnh được phân biệt bằng run ID; báo cáo không cộng dồn kết quả từ lần chạy trước.
