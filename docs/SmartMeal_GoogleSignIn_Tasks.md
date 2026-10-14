# SmartMeal Google Sign-In — Kế hoạch công việc

> **Cập nhật:** 2026-10-14  
> **Phạm vi:** Hoàn thiện đăng nhập Google Web (Expo Web) end-to-end. Chưa bao gồm Android/iOS native.

## Kết luận sau khi kiểm tra

- Frontend có GSI wrapper, hook, các nút Google và gọi `POST /auth/google`; `npx tsc --noEmit` đã chạy thành công.
- Backend đã có `POST /api/auth/google`, `GoogleLoginAsync` và `GoogleAuthRequestDto`, nhưng hiện nhận `GoogleId`, `Email`, `FullName`, `AvatarUrl` từ client.
- **Điểm chặn bảo mật:** backend chưa xác minh Google ID token. Frontend gửi `{ idToken }`, trong khi DTO backend hiện tại chưa khớp contract.

## P0 — Bảo mật thông tin OAuth

- [ ] **P0.1** Thu hồi/rotate OAuth client secret nếu giá trị trong handoff là secret thật. Không sao chép secret sang issue, log hoặc commit.
- [x] **P0.2** Đã làm sạch tài liệu bàn giao; chỉ giữ Client ID và hướng dẫn cấu hình. Đã loại bỏ client secret khỏi Markdown và bỏ tham chiếu tới nơi lưu credentials.
- [x] **P0.3** Đã xác nhận `frontend/SmartMealMobile/.env` bị Git ignore và không được Git track; `.env.example` chỉ chứa placeholder cho Google Client ID. Cần kiểm tra thêm lịch sử Git trước khi kết luận secret chưa từng bị commit.

## P1 — Chốt contract FE/BE

- [x] **P1.1** Đã chốt contract mục tiêu: `POST /api/auth/google` chỉ nhận `{ "idToken": "<Google ID token>" }`; không tin email, fullName hoặc googleId do client tự khai. Việc áp dụng DTO và xác minh token thuộc P2.
- [x] **P1.2** Đã xác nhận response envelope `ApiResponse<AuthResponseDto>` được FE unwrap thành `data`; backend hiện trả `token`, `expiresAt`, `user`, chưa cấp refresh token. FE đã khai báo refresh token là optional và `saveSessionTokens` chỉ lưu nếu có.
- [x] **P1.3** Đã cập nhật `docs/SmartMeal_API_Contract.md` để phân biệt contract mục tiêu với trạng thái backend hiện tại và nêu response/error contract.

## P2 — Xác minh Google ID token ở backend

- [ ] **P2.1** Cấu hình Google OAuth Web Client ID (audience) qua environment/config; không hard-code secret.
- [ ] **P2.2** Dùng thư viện xác minh token chuẩn (ví dụ `Google.Apis.Auth`) để kiểm tra chữ ký, issuer, audience và expiration; không chỉ decode JWT.
- [ ] **P2.3** Đổi DTO thành request chỉ có `IdToken`; kiểm tra token rỗng hoặc sai định dạng.
- [ ] **P2.4** Sửa `AuthService.GoogleLoginAsync` để lấy subject/email/name/avatar từ payload đã xác minh, không lấy từ request body.
- [ ] **P2.5** Tìm user theo Google subject trước; xử lý email đã thuộc tài khoản password bằng quy trình liên kết có xác thực hoặc trả `409 Conflict`; tránh tạo user trùng khi đăng nhập đồng thời.
- [ ] **P2.6** Trả `401` khi token thiếu/sai/hết hạn/audience sai; `409` khi xung đột tài khoản; lỗi cấu hình phải an toàn, không lộ stack trace/secret.
- [ ] **P2.7** Bổ sung dependency injection/configuration và xử lý lỗi xác minh có kiểm soát.

## P3 — Kiểm thử backend

- [ ] **P3.1** Unit test token sai/hết hạn/audience sai, email chưa xác minh (nếu chính sách yêu cầu), user mới, user Google hiện có và email xung đột.
- [ ] **P3.2** Integration test response envelope và HTTP status.
- [ ] **P3.3** Chạy build/test solution .NET; kiểm tra cấu hình khi thiếu Google Client ID.
- [ ] **P3.4** Kiểm tra unique constraint cho email/Google subject; không lộ exception database cho client.

## P4 — Kiểm thử frontend end-to-end

- [ ] **P4.1** Chạy backend và xác nhận API base URL.
- [ ] **P4.2** Chạy Expo Web tại `http://localhost:8082`; kiểm thử bằng Chrome/Edge desktop, tránh VS Code embedded browser nếu gặp giới hạn FedCM.
- [ ] **P4.3** Xác nhận origin trong Google Cloud OAuth khớp `http://localhost:8082`.
- [ ] **P4.4** Kiểm thử đăng nhập lần đầu, tạo tài khoản và điều hướng tới Health Profile khi chưa khảo sát.
- [ ] **P4.5** Kiểm thử đăng nhập lại, khôi phục session và vào app khi khảo sát đã hoàn thành.
- [ ] **P4.6** Kiểm thử hủy popup, lỗi mạng/backend, token sai và tài khoản xung đột; UI không được kẹt loading.
- [ ] **P4.7** Xác nhận JWT được lưu qua storage adapter phù hợp; `GET /api/auth/me` hoạt động sau đăng nhập và reload.
- [ ] **P4.8** Chạy lại `npx tsc --noEmit` và lint/test liên quan.

## P5 — Chốt tài liệu và Git

- [ ] **P5.1** Cập nhật handoff với trạng thái thực tế, lệnh chạy, kết quả test và giới hạn đã biết.
- [ ] **P5.2** Cập nhật API contract sau khi FE/BE thống nhất.
- [ ] **P5.3** Review `git diff` từng file; xác nhận không có secret hoặc file local ngoài ý muốn.
- [ ] **P5.4** Commit theo phạm vi rõ ràng; không commit secret.
- [ ] **P5.5** Chỉ chuyển OAuth consent screen sang Production khi đã quyết định phát hành và đáp ứng yêu cầu xác minh.

## Thứ tự thực hiện đề xuất

1. P0: xử lý secret trong handoff.
2. P1: thống nhất contract request/response.
3. P2: xác minh ID token ở backend và sửa logic liên kết tài khoản.
4. P3: kiểm thử backend.
5. P4: kiểm thử Chrome/Edge end-to-end.
6. P5: cập nhật tài liệu, review diff và commit.

## Ngoài phạm vi đợt này

- Google Sign-In native Android/iOS (cần luồng native/Dev Client riêng).
- Chuyển OAuth app sang Production nếu chưa sẵn sàng phát hành.
- Tái cấu trúc authentication ngoài phần cần thiết cho Google Sign-In.
