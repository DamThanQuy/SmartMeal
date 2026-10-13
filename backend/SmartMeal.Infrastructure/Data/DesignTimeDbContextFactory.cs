using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SmartMeal.Infrastructure.Data;

/// <summary>
/// Dùng cho công cụ <c>dotnet ef</c> (tạo migration) mà không cần chạy cả host API. Chuỗi kết nối lấy từ
/// biến môi trường <c>ConnectionStrings__DefaultConnection</c>; khi tạo migration không cần kết nối thật nên
/// có giá trị dự phòng không chứa mật khẩu.
/// </summary>
public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            connectionString = "Host=localhost;Port=5432;Database=SmartMealDb;Username=postgres";
        }

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        return new ApplicationDbContext(options);
    }
}
