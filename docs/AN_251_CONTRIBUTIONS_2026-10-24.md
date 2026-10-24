# Đóng góp của An-251 — Nguyễn Dương Ân

Ngày tổng hợp: **24/10/2026**, múi giờ Asia/Saigon. Repository: [DamThanQuy/SmartMeal](https://github.com/DamThanQuy/SmartMeal). Mốc đối chiếu: `main` tại `9743be8125e75bcc47be9ba0284a5aa09916e6af`.

## Phạm vi và cách xác định tác giả

Theo README, tài khoản **An-251** là **Nguyễn Dương Ân**. Lịch sử Git hiện có nhận diện tác giả này bằng tên `Nguyễn Dương Ân` và email `nguyenduongan64@gmail.com`. Báo cáo lọc theo trường **Author**, đối chiếu nội dung thay đổi và các file liên quan; không lấy người merge làm tác giả của toàn bộ thay đổi được merge.

Không gộp các commit của `An` / `annguyennhat11a221` (`annguyennhat11a221@gmail.com`) vào đóng góp của Ân: đây là danh tính khác, được README phân biệt là Nguyễn Nhật An. Tên tài khoản GitHub và trường Author là thông tin của repo, không phải xác minh danh tính bên ngoài.

Trong toàn bộ lịch sử đã fetch, **95 commit** khớp email của Ân và đều đã có trong `main`: **90 commit không phải merge** và **5 commit merge**. Khoảng ngày tác giả: **02/10–21/10/2026**. Không có commit mới của danh tính này trong khoảng vừa pull từ `bd738b6` đến `9743be8`; commit nội dung gần nhất là `8390c23` ngày 21/10, đã có trước lần cập nhật này.

Các commit không phải merge đã chạm tới **545 đường dẫn khác nhau**, gồm 344 đường dẫn trong Mobile và 191 trong backend; 96 đường dẫn là file dưới thư mục test Mobile/backend. Đây là thống kê đường dẫn từng thay đổi trong lịch sử, có thể gồm file đã xóa hoặc chuyển chỗ; không phải số tính năng, số test case hay tỷ lệ sở hữu mã nguồn.

## Tổng quan công việc

Đóng góp chính của Ân là nối ứng dụng Mobile với API thật, bổ sung các phần backend còn thiếu để các luồng nghiệp vụ chạy xuyên suốt, bổ sung kiểm thử và tài liệu tích hợp. Phạm vi trải từ xác thực, hồ sơ sức khỏe, nhật ký và nước uống đến công thức, thực đơn, danh sách đi chợ, AI/scanner, gamification, Pro, thông báo và hàng đợi offline.

Không nên mô tả Ân chỉ làm giao diện Mobile, cũng không nên quy toàn bộ SmartMeal cho một người. Phần dưới chỉ ghi những thay đổi có commit tác giả tương ứng.

## Các nhóm đóng góp có bằng chứng

### 1. Nền tảng gọi API và quản lý phiên

- Xây API client, endpoints, interceptor, quy chuẩn lỗi, lưu token và query client cho Mobile: `139c2eb`.
- Nối đăng ký/đăng nhập và vòng đời phiên với backend; bootstrap phiên, điều hướng và xử lý lỗi khôi phục phiên: `cde8228`.
- Bổ sung refresh token, tự gia hạn khi gặp 401 và đọc thống nhất error envelope: `717ca85`; phía backend thống nhất lỗi và kiểm tra đầu vào: `7b56e5b`.
- Bổ sung backend refresh token, khóa tạm đăng nhập và rate limit: `dee4565`. Commit này cũng từng thêm xác thực Google; xem diễn biến Google ở phần giới hạn để không nhầm với trạng thái hiện tại.

File tiêu biểu: `frontend/SmartMealMobile/src/services/api/`, `src/services/storage/`, `src/features/auth/services/sessionService.ts`, `backend/SmartMeal.Infrastructure/Services/AuthService.cs`.

### 2. Tài khoản, OTP, avatar và dữ liệu cá nhân

- Thực hiện quên mật khẩu, xác minh OTP, đặt lại và đổi mật khẩu qua email ở backend: `2f58c1f`; nối service Mobile: `3ba7121`.
- Upload avatar, xóa dữ liệu cá nhân và xóa tài khoản ở backend: `5c48d41`; hiển thị/thay avatar và xóa dữ liệu từ Mobile: `3c136a6`.
- Bổ sung `UserDto.hasPassword`: `1c460e3`; xây màn xóa tài khoản gọi `DELETE /auth/account`: `8cf63ac`.
- Bổ sung test API thật cho auth, thông báo, chia sẻ và xóa tài khoản: `fa4b573`, `81579b9`.

### 3. Hồ sơ sức khỏe, cân nặng và dữ liệu vận động

- Nối hồ sơ sức khỏe và danh mục meta với backend, mapping mã chế độ ăn/dị ứng/bệnh lý: `aadb1a5`.
- Lưu ngày sinh, chế độ ăn và cập nhật một phần hồ sơ ở backend: `67d5041`; cập nhật mapping và lưu dữ liệu thực từ Mobile: `25b1fbe`.
- Nối chỉnh sửa hồ sơ, cài đặt sức khỏe và lịch sử cân nặng với API: `8d07f91`; bổ sung lọc lịch sử cân nặng theo số ngày: `0952465`.
- Backend health-sync nhận tổng theo ngày/nguồn theo cách gửi lại không cộng trùng; Mobile chọn nguồn ưu tiên thay vì cộng tất cả nguồn: `9891b38`, `5cea3ed`; nối màn Health Connect với dịch vụ tổng hợp: `75b4270`.

**Giới hạn hiện tại:** có API và phần giao diện/dữ liệu health-sync không đồng nghĩa app đã đọc được cảm biến Apple Health/Health Connect. `healthConnectService.api.ts` hiện vẫn ghi rõ chưa tích hợp thư viện native đọc các nguồn này, cần Dev Client.

### 4. Nhật ký dinh dưỡng, thực phẩm, nước uống và Dashboard

- Nối nhật ký, tìm thực phẩm và biểu đồ tiến độ với backend: `c1dbb9d`; Dashboard tổng hợp từ nguồn thật: `ad2e84c`.
- Hoàn thiện API nhật ký và sửa trùng nhóm bữa ăn bằng thay đổi schema/migration: `70a927c`.
- Ghi cả bữa ăn trong một request, sửa bằng PUT, tìm theo scope, quản lý thực phẩm tự tạo/yêu thích: `5c27914`.
- Bổ sung món Việt, khẩu phần, thực phẩm tùy chỉnh, barcode, gần đây và yêu thích ở backend: `0678e74`.
- Đọc, ghi, hoàn tác và xóa nước uống trên server; lấy mục tiêu nước từ hồ sơ: `955fb59`.
- Thay gợi ý món tĩnh trên Dashboard bằng công thức thật: `deed5f9`; bỏ dữ liệu nước/thông báo mẫu tự chèn vào tài khoản thật: `1eb40da`.

### 5. Công thức, yêu thích và bộ sưu tập

- Backend lọc công thức theo dị ứng, hỗ trợ phân trang/bộ lọc và giới hạn quyền quản lý bộ sưu tập cho chủ sở hữu: `dc478d4`.
- Nối Mobile công thức, yêu thích và bộ sưu tập với API; bổ sung mapper, unit test và live test: `2ac7b37`, `fa17712`.
- Thêm dữ liệu và backend chia sẻ bộ sưu tập bằng token thu hồi được: `a2f4bb6`, `dadaebb`; nối liên kết chia sẻ trên Mobile: `f64ceb9`.

File tiêu biểu: `backend/SmartMeal.Infrastructure/Services/RecipeService.cs`, `frontend/SmartMealMobile/src/features/recipes/services/`.

### 6. Thực đơn tuần và danh sách đi chợ

- Backend bảo đảm một món cho mỗi ô bữa ăn, thêm `keepExisting` và đánh dấu đã nấu: `623d8e0`.
- Chặn món dị ứng khi xếp thực đơn, tạo tuần theo mục tiêu calo và bệnh lý: `1f584d5`.
- Nối Mobile thực đơn tuần với API: giữ `mealPlanId`, xóa món, đánh dấu đã nấu và tạo tuần: `64c9060`.
- Định giá nguyên liệu theo đơn vị, tổng hợp bữa và check hàng loạt: `a296362`; lưu kỳ danh sách, chi phí thực tế và hoàn tất mua sắm trong transaction: `4b38519`.
- Nối Mobile tạo danh sách từ thực đơn, nhắc tạo lại khi thay đổi và hoàn tất mua sắm: `13a1e07`; bổ sung mapper/live test: `a2e2d58`.

Đây là quản lý danh sách và chi phí đi chợ, không phải hệ thống đặt mua nguyên liệu hay giao hàng trực tuyến.

### 7. AI, barcode, OCR, giọng nói và quét tủ lạnh

- Backend yêu cầu đăng nhập cho AI, giới hạn quota ngày và xử lý thất bại rõ ràng: `908ff35`; Mobile đọc quota từ server, xử lý 429/lỗi và không giả kết quả thành công: `515eb19`.
- Backend tra barcode từ CSDL, nhận ảnh nhãn và file ghi âm: `67d8e01`.
- Mobile dùng camera/ảnh thật cho barcode, OCR và tủ lạnh, sửa các vấn đề review PR #9: `9f926f9`; gửi audio multipart lên `/ai/voice-log/audio`: `7a771ea`.
- Viết unit/service test và live multipart cho giọng nói, đọc nhãn, tủ lạnh: `2bdd244`, `7bcbaa5`.
- Sửa riêng màn quét tủ lạnh ngày 21/10: `8390c23`, chi tiết ở phần tiếp theo.

Những thay đổi này tích hợp và kiểm soát luồng AI; không có nghĩa Ân tự xây hoặc huấn luyện mô hình AI. Code hiện tại của các module này đã có thêm thay đổi của thành viên khác.

### 8. Gamification, Bé Mầm, thử thách, huy hiệu và trang phục

- Backend cộng XP/tăng cấp theo sự kiện thật, tiến độ thử thách, huy hiệu và trang phục; bổ sung migration và integration test: `bd4c24b`.
- Mobile nối Bé Mầm, thử thách, huy hiệu theo hợp đồng server và sửa nhóm lỗi G1–G5 trong review PR #9: `9916999`.
- Sửa cách cập nhật Reanimated shared value trong PetAnimation để phù hợp lint React Compiler: `0784014`; bổ sung unit/live test: `890b783`.

### 9. Gói Pro và trạng thái thanh toán

- Backend chỉ kích hoạt Pro từ thanh toán được xác minh; quản lý hạn dùng và lịch sử: `1789819`.
- Mobile đọc gói, giá, trạng thái, lịch sử và hủy gia hạn từ backend, coi server là nguồn xác nhận quyền Pro: `aebed92`.

Các tích hợp thanh toán trong mã hiện tại còn được phát triển tiếp bởi các tác giả khác; không quy toàn bộ PayOS/SePay hiện tại cho hai commit này.

### 10. Offline, nhắc nhở và thông báo

- Thêm middleware/schema `Idempotency-Key` cho request ghi dữ liệu: `e25f41f`.
- Mobile lưu bền vững hàng đợi nhật ký offline và gửi lại với idempotency key, tránh ghi trùng: `f22c22c`; bổ sung test offline và live replay: `c477a29`.
- Xây lịch nhắc cục bộ bằng `expo-notifications`, đồng bộ thiết lập và hủy lịch khi đăng xuất: `9915e80`, `1b87ae9`.
- Backend sinh thông báo từ sự kiện nghiệp vụ: `ce9f091`; Mobile đọc thông báo server và chấm chưa đọc ở chuông: `a58312b`.

**Giới hạn hiện tại:** `localNotificationService.ts` chủ động bỏ qua native notifications khi chạy Expo Go. Thông báo trong app vẫn là luồng riêng; không nên demo nhắc hệ thống trên Expo Go như chức năng đã hoạt động đầy đủ.

### 11. Kiểm thử, review, Docker và tài liệu

- Lập hướng dẫn nối API phần 1/2: `c571829`; ghi tiến độ và các thiếu hụt cần giải quyết: `ca4b007`, `05cf487`.
- Tạo dự án integration test backend chạy API thật trên PostgreSQL: `b348116`; bổ sung unit, migration và live test cùng các chức năng ở trên.
- Điều chỉnh cấu hình Jest cho ESM/gifted-charts, mock audio trong smoke test và lint test: `888c14b`, `b8f306a`, `eafc172`.
- Viết nhận xét PR #9 và cập nhật trạng thái xử lý: `bb24b6a`, `87a9f56`.
- Tạo/cập nhật API contract theo backend chạy thật và code sau sửa gap: `5479400`, `63717c7`; cập nhật README, tài liệu công nghệ và ui-progress: `6342ece`, `acde5be`.
- Giữ secret ngoài Git và kiểm tra cấu hình lúc khởi động: `173d948`; ưu tiên biến môi trường runtime hơn `.env`: `8567497`.
- Chuẩn hóa vị trí `.env.example` theo backend/Mobile, cấu hình một lệnh Docker chạy PostgreSQL + API và tài liệu hướng dẫn: `4b8ce80`, `2f75993`, `c9d37c0`.

Số test trong commit hoặc báo cáo cũ chỉ phản ánh thời điểm đó. Báo cáo này không coi số lượng test lịch sử là kết quả toàn bộ test suite hiện tại.

## Commit gần nhất: sửa màn quét tủ lạnh `8390c23`

Commit ngày **21/10/2026 08:08:42 +07:00**, thay đổi **4 file**, thêm 752 dòng và xóa 180 dòng theo `git show --stat` (bao gồm code test và định dạng).

1. **`AddIngredientRow.tsx`:** chuyển nhập liệu sang React Hook Form + Zod; trim, bắt tên rỗng, giới hạn 60 ký tự, xử lý trùng tên; hỗ trợ dùng chung cho thêm mới/chỉnh sửa. Bọc ô nhập bằng vùng `flex-1` và đặt chiều rộng để tránh ô nhập bị co; thêm nút hủy và xử lý bàn phím.
2. **`FridgeScreen.tsx`:** thêm sửa/xóa nguyên liệu; nguyên liệu thêm hoặc sửa thủ công được đánh dấu đã xác nhận; hỗ trợ xác nhận tất cả và đặt lại trạng thái gợi ý khi danh sách đổi. Chỉ gọi gợi ý khi có nguyên liệu xác nhận; hiển thị loading/error/retry và cuộn tới kết quả; cải thiện bố cục tương tác khi mở bàn phím.
3. **`FridgeScreen.test.tsx`:** thêm test hồi quy cho nhập tay, xác nhận, sửa/xóa, gợi ý và các trạng thái lỗi/tương tác.
4. **`docs/ui-progress.md`:** cập nhật trạng thái luồng quét tủ lạnh.

AI vẫn cần người dùng kiểm tra/xác nhận trước khi dùng nguyên liệu để gợi ý. Commit không biến nhận diện AI thành việc tự lưu mọi nguyên liệu chưa xác nhận.

## Diễn biến và những điều không nên quy nhầm

- **Google Sign-In:** Ân từng thêm luồng Google (`dee4565`, `de9fc1c`), sau đó tự gỡ ở backend/Mobile/tài liệu (`4778a35`, `4996f3e`, `3022daa`). Sau đó **DamThanQuy** khôi phục Google Sign-In ở `ef7b1cf` ngày 14/10. Code hiện tại có lại endpoint Google và giao diện có điều kiện; trên Expo Go nút được ẩn khi native Google Sign-In không sẵn sàng. Không ghi “hiện đã bỏ Google” và cũng không gán toàn bộ bản khôi phục hiện tại cho Ân.
- **Mock/API:** một số commit của Ân từng tạo cấu trúc chọn mock/API trong giai đoạn tích hợp. Code hiện tại đã được nhóm chỉnh sửa tiếp; không lấy kiến trúc tạm thời trong commit cũ làm mô tả trạng thái cuối.
- **Web Admin:** trong 26 commit vừa kéo về, cổng quản trị/API được thêm bởi **NguyenTheBao614** (`666ed0a`), sửa bảo mật/nghiệp vụ và bổ sung test bởi **@fsa_ThienPC**. Đây không phải đóng góp của Ân theo trường Author.
- **Dữ liệu món/ảnh và grocery mới:** `62d57a8`, `2694b64`, `bb1ab97`, `4667cfa` thuộc **annguyennhat11a221**, không phải An-251.
- **CD và kiến trúc:** workflow triển khai máy chủ `tkm2`, sơ đồ kiến trúc và các bản sửa CD vừa cập nhật thuộc **DamThanQuy**.
- Các chức năng trên thường qua nhiều tác giả. Báo cáo mô tả phần việc ở các commit của Ân, không khẳng định tác giả duy nhất của toàn bộ module.

## Cách tái kiểm tra

```powershell
git log main --author="nguyenduongan64@gmail.com" --no-merges --reverse --format="%h %aI %s"
git log main --author="nguyenduongan64@gmail.com" --merges --format="%h %aI %s"
git show --stat 8390c23
git show 8390c23 -- frontend/SmartMealMobile/src/features/scanner/screens/FridgeScreen.tsx
git log --all --author="nguyenduongan64@gmail.com" --not main --oneline
```

Lệnh cuối không có kết quả tại thời điểm tổng hợp: không có commit khớp tác giả này ở ref đã fetch mà nằm ngoài `main`. Không dùng thống kê thêm/xóa dòng để suy ra công sức hoặc chất lượng.

## Phụ lục: toàn bộ commit của tác giả trên main

Các liên kết trỏ tới commit cụ thể trên GitHub để mở diff. Thứ tự theo lịch sử topo đảo chiều của Git, cột ngày là AuthorDate (một số commit được tạo cùng ngày/giờ).

<!-- GENERATED_COMMIT_APPENDIX -->

### 90 commit nội dung

| STT | Ngày | Commit | Nội dung gốc |
|---:|---|---|---|
| 1 | 2026-10-02 | [c571829](https://github.com/DamThanQuy/SmartMeal/commit/c5718296a1b2c6787ee091fb4a81b7d19183fd86) | docs(fetch-api): add API integration guide (part 1 & part 2) |
| 2 | 2026-10-02 | [139c2eb](https://github.com/DamThanQuy/SmartMeal/commit/139c2eb1adb376aa62be9fcd9bd850ad8c2a80a2) | feat(api): add API foundation (client, interceptors, errors, token storage) |
| 3 | 2026-10-02 | [aadb1a5](https://github.com/DamThanQuy/SmartMeal/commit/aadb1a5fde2167ea72fbbf596ee3691645fde500) | feat(health): connect health profile & meta to backend |
| 4 | 2026-10-02 | [cde8228](https://github.com/DamThanQuy/SmartMeal/commit/cde82289769dfbb37fd46785398bca6d7b389457) | feat(auth): connect auth & session lifecycle to backend |
| 5 | 2026-10-02 | [888c14b](https://github.com/DamThanQuy/SmartMeal/commit/888c14bf2409f15726632c5a25086255120b60bf) | test: transform gifted-charts ESM so the App smoke test runs |
| 6 | 2026-10-03 | [c1dbb9d](https://github.com/DamThanQuy/SmartMeal/commit/c1dbb9d817a12c107f2f66b1e3f821786d6101fa) | feat(nutrition): connect diary, food search & progress to backend |
| 7 | 2026-10-03 | [ad2e84c](https://github.com/DamThanQuy/SmartMeal/commit/ad2e84c859343afd184d56c04f0b3cf08da64a18) | feat(dashboard): aggregate dashboard from real sources |
| 8 | 2026-10-03 | [8d07f91](https://github.com/DamThanQuy/SmartMeal/commit/8d07f910cbf604849a1bc2e53118fb3b50f0ac8b) | feat(profile): connect weight history, health settings & edit profile to backend |
| 9 | 2026-10-03 | [75b4270](https://github.com/DamThanQuy/SmartMeal/commit/75b427017a64b1c2f453de5a2ad939e605e7ba10) | feat(profile): connect Health Connect screen to health-sync |
| 10 | 2026-10-03 | [ca4b007](https://github.com/DamThanQuy/SmartMeal/commit/ca4b007dc2a374e2aaf47ad84bb11ad084ece961) | docs(fetch-api): record Part 1 implementation status and findings |
| 11 | 2026-10-03 | [eafc172](https://github.com/DamThanQuy/SmartMeal/commit/eafc172302e12dc147a37b05165c95154ad9c36a) | chore(lint): allow require() in Jest tests that reload modules |
| 12 | 2026-10-03 | [1eb40da](https://github.com/DamThanQuy/SmartMeal/commit/1eb40da8d214312d0b8811fbb07d8957729ebc65) | fix(mock): stop seeding fake water and notification data for real accounts |
| 13 | 2026-10-03 | [05cf487](https://github.com/DamThanQuy/SmartMeal/commit/05cf487642b43a6bf41c3cc5d65308b0ef4b93c4) | docs(fetch-api): list the follow-up commits and final test count |
| 14 | 2026-10-03 | [173d948](https://github.com/DamThanQuy/SmartMeal/commit/173d9480c3123f39aaf624f94e7d6459fa979466) | fix(be): keep secrets out of git and fail fast on missing configuration |
| 15 | 2026-10-03 | [b348116](https://github.com/DamThanQuy/SmartMeal/commit/b3481163271d00a85470a087407f6b89b801e236) | test(be): add integration test project that runs the real API on PostgreSQL |
| 16 | 2026-10-03 | [7b56e5b](https://github.com/DamThanQuy/SmartMeal/commit/7b56e5b2cf7c66dc05d96ad86ab2cdbbcc4ca26a) | feat(be): return one error envelope for every failure and validate auth input |
| 17 | 2026-10-03 | [70a927c](https://github.com/DamThanQuy/SmartMeal/commit/70a927cb730435975b521963b31080742838966e) | feat(be): fix duplicate diary groups and complete the nutrition diary API |
| 18 | 2026-10-03 | [67d5041](https://github.com/DamThanQuy/SmartMeal/commit/67d5041bf3d31d1654177ee18311f472e1937ee7) | feat(be): store date of birth and dietary preferences, add partial profile updates |
| 19 | 2026-10-03 | [9891b38](https://github.com/DamThanQuy/SmartMeal/commit/9891b3836aa8bde6f2a5427d24d4a7325ee8c9ff) | feat(be): make health-sync idempotent and report "not synced" honestly |
| 20 | 2026-10-03 | [dee4565](https://github.com/DamThanQuy/SmartMeal/commit/dee4565f789b8352ce1e905c7f0cfdc303a1b3ad) | feat(be): verify Google ID tokens and add refresh tokens, lockout and rate limiting |
| 21 | 2026-10-03 | [2f58c1f](https://github.com/DamThanQuy/SmartMeal/commit/2f58c1f143ded9564665a4ac7116c750fcf5c03a) | feat(be): add forgot, verify, reset and change password with email OTP |
| 22 | 2026-10-03 | [5c48d41](https://github.com/DamThanQuy/SmartMeal/commit/5c48d41b6a064bb214716a5503c21c5b80f64edd) | feat(be): add avatar upload and delete personal data / account |
| 23 | 2026-10-03 | [1789819](https://github.com/DamThanQuy/SmartMeal/commit/1789819ae554c95e2d7c8d2364f6728d0c19bb96) | feat(be): only activate Pro from a verified payment and track expiry and history |
| 24 | 2026-10-03 | [908ff35](https://github.com/DamThanQuy/SmartMeal/commit/908ff35d559582bc28eda60da770375a02bf13bd) | feat(be): require login for AI endpoints, enforce the daily quota and stop faking success |
| 25 | 2026-10-03 | [dc478d4](https://github.com/DamThanQuy/SmartMeal/commit/dc478d45974e4e4f3cd161ca0fe7a384729c7e88) | feat(be): filter recipes by allergens, add paging and filters, and let owners manage collections |
| 26 | 2026-10-03 | [623d8e0](https://github.com/DamThanQuy/SmartMeal/commit/623d8e0b2bc51f459347d4783101992b0ebd6068) | feat(be): keep one dish per meal slot, add keepExisting and mark-as-cooked to the planner |
| 27 | 2026-10-03 | [a296362](https://github.com/DamThanQuy/SmartMeal/commit/a296362d1741cb0fb51851a0569e6424d46b3d7b) | feat(be): price grocery items by unit, report merged meals and add bulk check |
| 28 | 2026-10-03 | [0678e74](https://github.com/DamThanQuy/SmartMeal/commit/0678e7466f8129f3f8f1cec10ed7ae39ddaa195a) | feat(be): add Vietnamese dishes with servings, custom foods, barcode lookup, recents and favorites |
| 29 | 2026-10-03 | [bd4c24b](https://github.com/DamThanQuy/SmartMeal/commit/bd4c24bbf87c3197f22ca6b248e7e5d0cc13b4f9) | feat(be): award XP and level up for real, track challenge progress and add badges and costumes |
| 30 | 2026-10-03 | [b8f306a](https://github.com/DamThanQuy/SmartMeal/commit/b8f306a207e312414509fb75b1893a3d55999028) | test(app): mock expo-av in the App smoke test |
| 31 | 2026-10-03 | [717ca85](https://github.com/DamThanQuy/SmartMeal/commit/717ca854079df63f95a42ac6ce92a9adacf9e1ac) | feat(api): refresh the session on 401, keep a refresh token and read the single error envelope |
| 32 | 2026-10-03 | [3ba7121](https://github.com/DamThanQuy/SmartMeal/commit/3ba71213b5e3b5af171514dab90d0c7a7a674c42) | feat(auth): reset the password with an email code and add the Google, avatar and delete-data service calls |
| 33 | 2026-10-03 | [3c136a6](https://github.com/DamThanQuy/SmartMeal/commit/3c136a68e1e4502ee85b761276185969ce768e77) | feat(profile): show and change the avatar, and delete personal data on the server |
| 34 | 2026-10-03 | [fa4b573](https://github.com/DamThanQuy/SmartMeal/commit/fa4b57340b48bc35e7943481529540bebd9fdd7b) | test(live): run the real auth services against a running backend |
| 35 | 2026-10-03 | [25b1fbe](https://github.com/DamThanQuy/SmartMeal/commit/25b1fbea275d2580add1fc9d18559f45017551cc) | feat(health): store the real birth date, diet and allergies on the server and map them by code |
| 36 | 2026-10-03 | [5c27914](https://github.com/DamThanQuy/SmartMeal/commit/5c27914ed33fe812a6921bff28bccafaddfa6c2d) | feat(nutrition): log a whole meal in one request, edit with PUT, search foods by scope, favorites and custom foods |
| 37 | 2026-10-03 | [955fb59](https://github.com/DamThanQuy/SmartMeal/commit/955fb597936b5b02a5aecd516c306e21159881d8) | feat(water): read, log, undo and delete water on the server and keep the daily goal in the health profile |
| 38 | 2026-10-03 | [5cea3ed](https://github.com/DamThanQuy/SmartMeal/commit/5cea3ed386191cc7dafec0e1e22105dc9b104535) | feat(health-sync): send the day's total per source, and use only the highest-priority source |
| 39 | 2026-10-03 | [b64311f](https://github.com/DamThanQuy/SmartMeal/commit/b64311fdf777b3e08df2d768412ce0d157ac4313) | test(water): follow the service split in the seed gating test |
| 40 | 2026-10-03 | [aebed92](https://github.com/DamThanQuy/SmartMeal/commit/aebed924faa3244dcf22c8049e30ca3034c0ca6c) | feat(premium): read the plan, prices, history and cancellation from the server and only trust the server for Pro |
| 41 | 2026-10-03 | [515eb19](https://github.com/DamThanQuy/SmartMeal/commit/515eb19c37b9d099b0481cc628b2951071aa1f36) | feat(ai): read the daily quota from the server, handle the 429 and errors, and stop returning fake AI results |
| 42 | 2026-10-04 | [5479400](https://github.com/DamThanQuy/SmartMeal/commit/5479400fd58541d28bf6f5008f24edfe3f29b89e) | docs(be): regenerate the API contract from the running backend |
| 43 | 2026-10-13 | [bb24b6a](https://github.com/DamThanQuy/SmartMeal/commit/bb24b6ad9ea2c06334e77aa03b0f6e169d1200da) | docs(review): danh sách lỗi PR #9 (gamification, Fridge Scanner, check-safety) gửi DamThanQuy |
| 44 | 2026-10-13 | [1f584d5](https://github.com/DamThanQuy/SmartMeal/commit/1f584d5f94545dbcfd68dfbafd5722925d7e5347) | feat(be/planner): chặn món dị ứng khi xếp thực đơn, tạo tuần theo mục tiêu calo và bệnh lý |
| 45 | 2026-10-13 | [67d8e01](https://github.com/DamThanQuy/SmartMeal/commit/67d8e017deb8d9e903031a822fb238eae29f54b2) | feat(be/scanner): tra mã vạch bằng CSDL, đọc nhãn từ ảnh, voice từ file ghi âm |
| 46 | 2026-10-13 | [4b38519](https://github.com/DamThanQuy/SmartMeal/commit/4b3851979d422d031756c4d1a9b36c3ba9942cf8) | feat(be/grocery): lưu kỳ của danh sách, chi phí thực tế và "Hoàn tất mua sắm" trong một transaction |
| 47 | 2026-10-13 | [0952465](https://github.com/DamThanQuy/SmartMeal/commit/095246562f20ff8f5b1a6b1955ae1d0b07a2c6f5) | feat(be/health): lọc lịch sử cân nặng theo số ngày gần nhất (?days=) |
| 48 | 2026-10-13 | [e25f41f](https://github.com/DamThanQuy/SmartMeal/commit/e25f41f3a8869ed3da0afbfa0c10099d11a7d03c) | feat(be/api): hỗ trợ Idempotency-Key cho request ghi dữ liệu |
| 49 | 2026-10-13 | [ce2e822](https://github.com/DamThanQuy/SmartMeal/commit/ce2e82202a7c7b20dcaab516160e724de031dad2) | fix(fe): bỏ fallback ghi nhật ký sai DTO, mã debug và kiểu dị ứng fail-open từ PR #9 |
| 50 | 2026-10-13 | [2ac7b37](https://github.com/DamThanQuy/SmartMeal/commit/2ac7b37b9e0106ad32e1994846bca3784883630e) | feat(fe/recipes): nối công thức, yêu thích, bộ sưu tập với API thật theo pattern mock/API |
| 51 | 2026-10-13 | [fa17712](https://github.com/DamThanQuy/SmartMeal/commit/fa1771280acce1ecb6357cbacc97be33937c2edd) | test(fe/recipes): mapper và test live công thức, yêu thích, bộ sưu tập |
| 52 | 2026-10-14 | [64c9060](https://github.com/DamThanQuy/SmartMeal/commit/64c90600a802d4f53b5b36cd55216c7a3adfd395) | feat(fe/planner): nối thực đơn tuần với API thật — giữ mealPlanId, xóa món, đã nấu, tạo tuần theo mục tiêu |
| 53 | 2026-10-14 | [13a1e07](https://github.com/DamThanQuy/SmartMeal/commit/13a1e07060346897cf8ccc508f49e6d3d3ea12f4) | feat(fe/grocery): nối danh sách đi chợ với API thật — tự tạo từ thực đơn, nhắc tạo lại, hoàn tất một bước |
| 54 | 2026-10-14 | [a2e2d58](https://github.com/DamThanQuy/SmartMeal/commit/a2e2d582ceeb80690be9e5d0e9292f66bb467ec2) | test(fe/planner-grocery): mapper đi chợ và test live thực đơn + đi chợ |
| 55 | 2026-10-14 | [deed5f9](https://github.com/DamThanQuy/SmartMeal/commit/deed5f9391829d306bf78d32154cc1061ac2d219) | feat(fe/dashboard): gợi ý món từ công thức thật thay cho dữ liệu tĩnh |
| 56 | 2026-10-14 | [0784014](https://github.com/DamThanQuy/SmartMeal/commit/07840142f401b3063dd95ec7a4af0052345701ee) | fix(fe/gamification): PetAnimation dùng shared value .set() thay vì gán .value (lỗi lint React Compiler) |
| 57 | 2026-10-14 | [9916999](https://github.com/DamThanQuy/SmartMeal/commit/99169999f3ab57dafea9014505c2fe7d7a324ce0) | feat(fe/gamification): Bé Mầm, thử thách, huy hiệu theo dữ liệu server (sửa lỗi review PR #9 G1–G5) |
| 58 | 2026-10-14 | [890b783](https://github.com/DamThanQuy/SmartMeal/commit/890b78343bcc6c78ff1dc00574cf49af7ac1e5a3) | test(fe/gamification): viết lại test PR #9 theo hợp đồng BE và thêm test live |
| 59 | 2026-10-14 | [9f926f9](https://github.com/DamThanQuy/SmartMeal/commit/9f926f90213ff7cd3f3dee9304c2e0580061b7a9) | feat(fe/scanner): quét mã vạch, nhãn, tủ lạnh bằng camera và ảnh thật (sửa lỗi review PR #9 S1–S3) |
| 60 | 2026-10-14 | [2bdd244](https://github.com/DamThanQuy/SmartMeal/commit/2bdd244a20510eb40e376275bbca03ea95bbb500) | test(fe/scanner): test service scanner theo hợp đồng BE mới và test live mã vạch |
| 61 | 2026-10-14 | [7a771ea](https://github.com/DamThanQuy/SmartMeal/commit/7a771ea2d684bab3a6945631aa33fb2eb0f48c57) | feat(fe/ai): gửi file ghi âm lên /ai/voice-log/audio thay vì báo "chưa hỗ trợ" |
| 62 | 2026-10-14 | [7bcbaa5](https://github.com/DamThanQuy/SmartMeal/commit/7bcbaa5ab0d3dfae23273ee2a8187f0dce49e43f) | test(fe): test live gửi multipart thật cho ghi âm, đọc nhãn, quét tủ lạnh |
| 63 | 2026-10-14 | [78c6223](https://github.com/DamThanQuy/SmartMeal/commit/78c6223481afb97603a4e8dd3eb85bbfdbc763c4) | test(fe/health): test live ghi cân nặng dùng ngày theo giờ máy như app |
| 64 | 2026-10-14 | [de9fc1c](https://github.com/DamThanQuy/SmartMeal/commit/de9fc1c111f701af35856f529f8f32b8a0fdd805) | feat(fe/auth): đăng nhập Google thật bằng expo-auth-session (F03) |
| 65 | 2026-10-14 | [9915e80](https://github.com/DamThanQuy/SmartMeal/commit/9915e80fe74592d847bccee40cfdc0fd88424c74) | feat(fe/profile): nhắc nhở cục bộ thật bằng expo-notifications (Reminders P2) |
| 66 | 2026-10-14 | [1b87ae9](https://github.com/DamThanQuy/SmartMeal/commit/1b87ae971ea5c740eb6e3e1184bae13a03ee6bab) | test(fe/profile): test lịch nhắc nhở, remindersService và huỷ nhắc khi đăng xuất |
| 67 | 2026-10-14 | [f22c22c](https://github.com/DamThanQuy/SmartMeal/commit/f22c22c74a48a6eb4e4a7e031c2128696c528a21) | feat(fe/nutrition): hàng đợi offline bền vững, gửi lại bằng Idempotency-Key (F12) |
| 68 | 2026-10-14 | [c477a29](https://github.com/DamThanQuy/SmartMeal/commit/c477a2921ca9b785fa9219ec5305026baaac5726) | test(fe/nutrition): test hàng đợi offline và test live gửi lại không ghi trùng |
| 69 | 2026-10-14 | [63717c7](https://github.com/DamThanQuy/SmartMeal/commit/63717c751fa9533d108e6323ba0b6c8ce89aa3dc) | docs(api): cập nhật hợp đồng API theo code sau đợt sửa gap |
| 70 | 2026-10-14 | [87a9f56](https://github.com/DamThanQuy/SmartMeal/commit/87a9f569f1e1891169433e2777f18afb31f4eb1a) | docs: ghi trạng thái xử lý vào báo cáo gap và review PR #9 |
| 71 | 2026-10-14 | [6342ece](https://github.com/DamThanQuy/SmartMeal/commit/6342ecea80e2d2ac6d70e11d13ac379b9a80acd0) | docs: sửa README/Overview còn ghi Flutter và .NET 8 |
| 72 | 2026-10-14 | [acde5be](https://github.com/DamThanQuy/SmartMeal/commit/acde5be226c483f39c96a22cb9f1dfed4b235791) | docs(fe): đánh dấu tài liệu nối API Phần 1/2 là bản cũ, cập nhật ui-progress |
| 73 | 2026-10-14 | [a2f4bb6](https://github.com/DamThanQuy/SmartMeal/commit/a2f4bb64e163bce76f48b406f64f12733c389b27) | feat(be/db): bảng thông báo và mã chia sẻ bộ sưu tập |
| 74 | 2026-10-14 | [ce9f091](https://github.com/DamThanQuy/SmartMeal/commit/ce9f091d3827456456bd40a1cc01c6c63a05311d) | feat(be/notifications): thông báo trong app tạo từ sự kiện thật |
| 75 | 2026-10-14 | [dadaebb](https://github.com/DamThanQuy/SmartMeal/commit/dadaebb1c5412caa1de31a170f1b300eaced8f9a) | feat(be/recipes): chia sẻ bộ sưu tập bằng liên kết thu hồi được |
| 76 | 2026-10-14 | [1c460e3](https://github.com/DamThanQuy/SmartMeal/commit/1c460e38be672bf6cf472659f1af32f86c44de66) | feat(be/auth): UserDto.hasPassword |
| 77 | 2026-10-14 | [cc98da0](https://github.com/DamThanQuy/SmartMeal/commit/cc98da0cc331c5bff75e762ddc6dac2c2532c192) | test(be): thông báo, chia sẻ bộ sưu tập và hasPassword |
| 78 | 2026-10-14 | [f64ceb9](https://github.com/DamThanQuy/SmartMeal/commit/f64ceb9bfba07e3b6d337da5c29b3748c65e0388) | feat(fe/recipes): chia sẻ bộ sưu tập bằng liên kết thu hồi được |
| 79 | 2026-10-14 | [a58312b](https://github.com/DamThanQuy/SmartMeal/commit/a58312be0ecd6d0bf2be7e368465bae5938a2794) | feat(fe/notifications): thông báo trong app từ server, chấm chưa đọc ở chuông |
| 80 | 2026-10-14 | [8cf63ac](https://github.com/DamThanQuy/SmartMeal/commit/8cf63acc2e8c84ce7c469ce3ca592a1c210b64fd) | feat(fe/account): màn Xoá tài khoản (DELETE /auth/account) |
| 81 | 2026-10-14 | [81579b9](https://github.com/DamThanQuy/SmartMeal/commit/81579b913a0338c8c5ad4f50632d2a4502539af7) | test(fe): thông báo, chia sẻ bộ sưu tập, xoá tài khoản (unit + live) |
| 82 | 2026-10-14 | [8567497](https://github.com/DamThanQuy/SmartMeal/commit/856749745b00a8e93df38af6e48d13fa9de8ef6a) | fix(be): biến môi trường khi chạy được ưu tiên hơn backend/.env |
| 83 | 2026-10-14 | [190f60f](https://github.com/DamThanQuy/SmartMeal/commit/190f60f13ed86d2bb4e7d0208ac7d69cc09de286) | docs: thông báo, chia sẻ bộ sưu tập, xoá tài khoản; hướng dẫn bật Google Sign-In |
| 84 | 2026-10-14 | [4778a35](https://github.com/DamThanQuy/SmartMeal/commit/4778a35b9f23feb2416b30467d48b5f9598060c0) | refactor(be/auth): bỏ đăng nhập Google, chỉ còn email + mật khẩu |
| 85 | 2026-10-14 | [4996f3e](https://github.com/DamThanQuy/SmartMeal/commit/4996f3e1e7f406941b9ef8e409b2dcce6d9fa0e6) | refactor(fe/auth): bỏ nút và luồng đăng nhập Google |
| 86 | 2026-10-14 | [3022daa](https://github.com/DamThanQuy/SmartMeal/commit/3022daa8e503ee9a0cb77c883e72e45c2994c8b8) | docs: bỏ đăng nhập Google khỏi hợp đồng API và tài liệu |
| 87 | 2026-10-14 | [4b8ce80](https://github.com/DamThanQuy/SmartMeal/commit/4b8ce80428416c1e6f07a3d7568c071656fe05ca) | chore(env): mỗi phần một file .env.example, bỏ file env ở thư mục gốc |
| 88 | 2026-10-14 | [2f75993](https://github.com/DamThanQuy/SmartMeal/commit/2f7599395ac823504b84ff392004615337a14480) | build(docker): một lệnh docker compose up -d --build chạy cả PostgreSQL và API |
| 89 | 2026-10-14 | [c9d37c0](https://github.com/DamThanQuy/SmartMeal/commit/c9d37c0bc3773d4da84c6237043a7e75c2d7c20b) | docs: hướng dẫn chạy bằng một lệnh Docker và vị trí file env mới |
| 90 | 2026-10-21 | [8390c23](https://github.com/DamThanQuy/SmartMeal/commit/8390c23779444d0ead666460d4905e68bdffd11f) | Fix chụp tủ lạnh |

### 5 commit merge

Các commit merge thể hiện tích hợp nhánh; không được cộng thêm như năm tính năng độc lập.

| Ngày | Commit | Nội dung gốc |
|---|---|---|
| 2026-10-03 | [c00b7c7](https://github.com/DamThanQuy/SmartMeal/commit/c00b7c712d64ba3c4a462c280bb9933527662cbe) | Merge pull request #6 from DamThanQuy/feat/fetch-api-part1 |
| 2026-10-03 | [c63b283](https://github.com/DamThanQuy/SmartMeal/commit/c63b28374550e8abe2ed58fe6964e150ad6c0abf) | Merge origin/main into feat/be-api-gaps and make the merged backend build and be safe |
| 2026-10-13 | [26956ec](https://github.com/DamThanQuy/SmartMeal/commit/26956ecc7971c6f9cae93bc5016f62e425b1eb8b) | Merge branch 'feat/be-api-gaps' into chore/merge-be-api-gaps |
| 2026-10-13 | [c899714](https://github.com/DamThanQuy/SmartMeal/commit/c899714cb01f5b8897e8977c0b7963a91f5b967c) | Merge branch 'chore/merge-be-api-gaps' into main |
| 2026-10-13 | [fc7b20f](https://github.com/DamThanQuy/SmartMeal/commit/fc7b20fa7a0722bc80d52f3e9b70afec312b28b9) | Merge branch 'docs/review-pr9-feedback' into main |
