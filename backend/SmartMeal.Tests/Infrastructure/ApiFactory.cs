using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Npgsql;
using SmartMeal.Application.Services;

namespace SmartMeal.Tests.Infrastructure;

/// <summary>
/// Chạy API thật trên một database PostgreSQL dùng một lần: mỗi factory tự có một database riêng
/// (migration + seed chạy lúc khởi động như môi trường thật) và xóa database khi dispose.
/// Cần biến môi trường <see cref="ServerEnvVar"/> trỏ tới server PostgreSQL (xem README.md cùng thư mục).
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    public const string ServerEnvVar = "SMARTMEAL_TEST_DB";
    public const string TestJwtKey = "integration-tests-only-key-0123456789-abcdefghijklmnop";

    private readonly string _databaseName = "smartmeal_test_" + Guid.NewGuid().ToString("N");
    private readonly Dictionary<string, string?> _overrides = new();
    private string? _adminConnectionString;

    /// <summary>Bộ xác minh Google giả: đăng ký token → danh tính để kiểm thử đăng nhập Google.</summary>
    public FakeGoogleTokenVerifier Google { get; } = new();

    /// <summary>Bộ gửi email giả: giữ các email đã "gửi" (OTP...) để test đọc mã.</summary>
    public FakeEmailSender Email { get; } = new();

    /// <summary>Thư mục tạm riêng của factory dùng làm Storage:Root (xóa khi dispose).</summary>
    public string UploadsRoot { get; } = Path.Combine(Path.GetTempPath(), "smartmeal-tests", Guid.NewGuid().ToString("N"));

    /// <summary>Ghi đè một giá trị cấu hình cho riêng factory này (gọi trước khi tạo client đầu tiên).</summary>
    public ApiFactory WithSetting(string key, string? value)
    {
        _overrides[key] = value;
        return this;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        _adminConnectionString = Environment.GetEnvironmentVariable(ServerEnvVar)
            ?? throw new InvalidOperationException(
                $"Đặt biến môi trường {ServerEnvVar} trỏ tới PostgreSQL, ví dụ: Host=127.0.0.1;Port=5432;Username=postgres;Password=...;Database=postgres");

        var appConnection = new NpgsqlConnectionStringBuilder(_adminConnectionString)
        {
            Database = _databaseName
        }.ConnectionString;

        builder.UseEnvironment("Testing");
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IGoogleTokenVerifier>();
            services.AddSingleton<IGoogleTokenVerifier>(Google);
            services.RemoveAll<IEmailSender>();
            services.AddSingleton<IEmailSender>(Email);
        });
        builder.ConfigureAppConfiguration((_, config) =>
        {
            var settings = new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = appConnection,
                ["Jwt:Key"] = TestJwtKey,
                ["Jwt:Issuer"] = "SmartMealTests",
                ["Jwt:Audience"] = "SmartMealTests",
                // Nhiều test đăng ký người dùng liên tiếp: nới giới hạn tần suất (test riêng sẽ ghi đè về số nhỏ).
                ["RateLimiting:AuthPermitsPerMinute"] = "100000",
                ["Storage:Root"] = UploadsRoot
            };

            foreach (var (key, value) in _overrides)
            {
                settings[key] = value;
            }

            config.AddInMemoryCollection(settings);
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);

        if (disposing)
        {
            try
            {
                if (Directory.Exists(UploadsRoot)) Directory.Delete(UploadsRoot, recursive: true);
            }
            catch (IOException)
            {
                // thư mục tạm, bỏ qua nếu còn bị khóa
            }
        }

        if (!disposing || _adminConnectionString is null)
        {
            return;
        }

        try
        {
            NpgsqlConnection.ClearAllPools();
            using var connection = new NpgsqlConnection(_adminConnectionString);
            connection.Open();
            using var command = connection.CreateCommand();
            command.CommandText = $"DROP DATABASE IF EXISTS \"{_databaseName}\" WITH (FORCE)";
            command.ExecuteNonQuery();
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[tests] Không xóa được database {_databaseName}: {ex.Message}");
        }
    }
}
