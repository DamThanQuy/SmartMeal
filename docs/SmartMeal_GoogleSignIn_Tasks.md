# SmartMeal Google Sign-In — Kế hoạch công việc

> **Cập nhật:** 2026-10-14  
> **Phạm vi:** Hoàn thiện đăng nhập Google Web (Expo Web) end-to-end. Chưa bao gồm Android/iOS native.

## Kết luận sau khi kiểm tra

- Frontend có GSI wrapper, hook, các nút Google và gọi `POST /auth/google`; `npx tsc --noEmit` đã chạy thành công.
- Backend `POST /api/auth/google` hiện nhận `{ idToken }` và xác minh bằng `Google.Apis.Auth`; danh tính lấy từ payload đã xác minh, không lấy từ body client.
- Google Client ID cần cấu hình ở backend bằng `Google:ClientId` hoặc biến môi trường `GOOGLE_CLIENT_ID`; frontend tiếp tục dùng `EXPO_PUBLIC_GOOGLE_CLIENT_ID`.

## P0 — Bảo mật thông tin OAuth

- [ ] **P0.1** Thu hồi/rotate OAuth client secret nếu giá trị trong handoff là secret thật. Không sao chép secret sang issue, log hoặc commit.
- [x] **P0.2** Đã làm sạch tài liệu bàn giao; chỉ giữ Client ID và hướng dẫn cấu hình. Đã loại bỏ client secret khỏi Markdown và bỏ tham chiếu tới nơi lưu credentials.
- [x] **P0.3** Đã xác nhận `frontend/SmartMealMobile/.env` bị Git ignore và không được Git track; `.env.example` chỉ chứa placeholder cho Google Client ID. Cần kiểm tra thêm lịch sử Git trước khi kết luận secret chưa từng bị commit.

## P1 — Chốt contract FE/BE

- [x] **P1.1** Đã chốt contract mục tiêu: `POST /api/auth/google` chỉ nhận `{ "idToken": "<Google ID token>" }`; không tin email, fullName hoặc googleId do client tự khai. Việc áp dụng DTO và xác minh token thuộc P2.
- [x] **P1.2** Đã xác nhận response envelope `ApiResponse<AuthResponseDto>` được FE unwrap thành `data`; backend hiện trả `token`, `expiresAt`, `user`, chưa cấp refresh token. FE đã khai báo refresh token là optional và `saveSessionTokens` chỉ lưu nếu có.
- [x] **P1.3** Đã cập nhật `docs/SmartMeal_API_Contract.md` để phân biệt contract mục tiêu với trạng thái backend hiện tại và nêu response/error contract.

## P2 — Xác minh Google ID token ở backend

- [x] **P2.1** Cấu hình audience qua `Google:ClientId` hoặc `GOOGLE_CLIENT_ID`; không hard-code client secret.
- [x] **P2.2** Dùng `Google.Apis.Auth` để xác minh chữ ký, issuer, audience và expiration.
- [x] **P2.3** DTO chỉ nhận `IdToken`; token rỗng trả lỗi có kiểm soát.
- [x] **P2.4** Lấy subject/email/name/avatar từ payload đã xác minh.
- [x] **P2.5** Tìm theo Google subject trước; không tự liên kết tài khoản password theo email; unique index + migration chống subject trùng khi đăng nhập đồng thời.
- [x] **P2.6** Ánh xạ lỗi token/email chưa xác minh thành `401`, request rỗng `400`, xung đột `409`, thiếu cấu hình/dịch vụ xác minh `503`; response không lộ exception nội bộ.
- [x] **P2.7** Đã đăng ký validator qua DI và bổ sung xử lý lỗi có kiểm soát.

## P3 — Kiểm thử backend

- [ ] **P3.1 (một phần)** Có test token malformed, thiếu Client ID, email chưa xác minh, tạo user mới và email xung đột. Test token Google hết hạn/sai audience cần fixture token Google thật hoặc kiểm thử tích hợp có cấu hình OAuth hợp lệ.
- [x] **P3.2** Đã test response envelope và mapping controller cho HTTP `409`; cần thêm HTTP integration test host thực tế trong P4.
- [x] **P3.3** Đã test thiếu Google Client ID (`503`) và `dotnet test SmartMeal.sln`.
- [x] **P3.4** Model và migration `AddUniqueGoogleSubject` đã thêm unique index có filter cho Google subject không null.

## P4 — Kiểm thử frontend end-to-end

- [x] **P4.1** Frontend dùng `http://localhost:5000/api`; Swagger trả `200`, `/api/auth/me` trả `401` khi chưa có JWT. Đã phát hiện và thay container `smartmeal_api` dùng image cũ bằng image build từ source hiện tại; sau khi cập nhật, request token rỗng trả `400`, token sai trả `401` với envelope an toàn.
- [x] **P4.2** Expo Web được mở tại `http://localhost:8082` và trang Welcome render trên Chrome desktop; đã kiểm tra DOM/trạng thái nút qua Chrome DevTools Protocol. Không kiểm thử Edge trong lượt này.
- [ ] **P4.3** File `.env` có Google Client ID và source ghi origin dự kiến `http://localhost:8082`; vẫn cần xác nhận Authorized JavaScript origins trực tiếp trong Google Cloud Console.
- [ ] **P4.4** Chờ kiểm thử thủ công với tài khoản Google hợp lệ: đăng nhập lần đầu, tạo tài khoản và điều hướng tới Health Profile khi chưa khảo sát.
- [ ] **P4.5** Chờ kiểm thử thủ công với tài khoản đã hoàn tất khảo sát: đăng nhập lại, reload và khôi phục session.
- [x] **P4.6 (một phần)** Chrome DevTools ghi nhận FedCM `NetworkError`; UI hiển thị lỗi “Bạn đã bỏ qua đăng nhập Google” và nút trở lại trạng thái enabled, không kẹt loading. Đã thêm xử lý notification dismiss/skip/not displayed và timeout. API thật đã xác nhận token rỗng `400`, token sai `401`; kiểm thử tài khoản Google thật và xung đột qua browser vẫn cần hoàn tất.
- [ ] **P4.7 (một phần)** Đã review code: web dùng storage adapter `storageService`, bootstrap gọi `GET /api/auth/me` khi tìm thấy token. Cần xác nhận bằng session Google thật rằng JWT được ghi/đọc sau reload và `/api/auth/me` trả user hợp lệ.
- [x] **P4.8 (một phần)** `npx tsc --noEmit` thành công sau thay đổi. `npm run lint -- --no-cache` vẫn báo 10 lỗi hiện có ở `AnimatedPressable.tsx`, `PetAnimation.tsx`, `PetScreen.tsx` (React Compiler/Reanimated); không còn lỗi lint trong `useGoogleLogin.ts`.

## P5 — Chốt tài liệu và Git

- [ ] **P5.1** Cập nhật handoff với trạng thái thực tế, lệnh chạy, kết quả test và giới hạn đã biết.
- [ ] **P5.2** Cập nhật API contract sau khi FE/BE thống nhất.
- [ ] **P5.3** Review `git diff` từng file; xác nhận không có secret hoặc file local ngoài ý muốn.
- [ ] **P5.4** Commit theo phạm vi rõ ràng; không commit secret.
- [ ] **P5.5** Chỉ chuyển OAuth consent screen sang Production khi đã quyết định phát hành và đáp ứng yêu cầu xác minh.

## Thứ tự thực hiện đề xuất

1. P0: xử lý secret trong handoff.
2. P1: thống nhất contract request/response.
3. P2: xác minh ID token ở backend và sửa logic liên kết tài khoản. **Đã triển khai; cần cấu hình Client ID trước khi chạy thực tế.**
4. P3: kiểm thử backend. **Đã có bộ test cơ bản; token hết hạn/sai audience và tích hợp DB thật còn cần kiểm thử bổ sung.**
5. P4: kiểm thử Chrome/Edge end-to-end và sửa lỗi phát sinh.
6. P5: cập nhật tài liệu, review diff và commit.

## Ngoài phạm vi đợt này

- Google Sign-In native Android/iOS (cần luồng native/Dev Client riêng).
- Chuyển OAuth app sang Production nếu chưa sẵn sàng phát hành.
- Tái cấu trúc authentication ngoài phần cần thiết cho Google Sign-In.
