# SmartMeal.Tests

Test tích hợp: khởi động **API thật** (`WebApplicationFactory<Program>`) trên một database **PostgreSQL thật**.
Mỗi factory tự tạo một database riêng (`smartmeal_test_<guid>`), chạy migration + seed như lúc khởi động bình thường
và xóa database khi xong, nên các test không ảnh hưởng nhau hay dữ liệu dev.

## Chạy

1. Bật PostgreSQL (ví dụ `docker compose up -d postgres` ở thư mục gốc repo).
2. Đặt biến môi trường trỏ tới **server** (database `postgres` dùng để tạo/xóa database test):

   ```bash
   # bash
   export SMARTMEAL_TEST_DB="Host=localhost;Port=5432;Username=postgres;Password=postgrespassword;Database=postgres"
   ```

   ```powershell
   # PowerShell
   $env:SMARTMEAL_TEST_DB = "Host=localhost;Port=5432;Username=postgres;Password=postgrespassword;Database=postgres"
   ```

3. Từ thư mục `backend/`:

   ```bash
   dotnet test SmartMeal.sln
   ```

Không đặt `SMARTMEAL_TEST_DB` thì các test dùng `[DbFact]` tự bỏ qua (skip) thay vì lỗi.

## Viết test mới

- Dùng `IClassFixture<ApiFactory>`; `factory.RegisterUserAsync()` trả client đã đăng nhập.
- Ghi đè cấu hình cho riêng một lớp test: `new ApiFactory().WithSetting("Key:Name", "value")`.
- Mọi test dữ liệu thật dùng `[DbFact]` thay cho `[Fact]`.
