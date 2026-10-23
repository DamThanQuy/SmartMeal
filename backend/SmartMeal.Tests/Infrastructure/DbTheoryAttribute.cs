using Xunit;

namespace SmartMeal.Tests.Infrastructure;

/// <summary>Bản <see cref="TheoryAttribute"/> của <see cref="DbFactAttribute"/>: tự bỏ qua khi chưa đặt biến môi trường database.</summary>
public sealed class DbTheoryAttribute : TheoryAttribute
{
    public DbTheoryAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(ApiFactory.ServerEnvVar)))
        {
            Skip = $"Bỏ qua: đặt biến môi trường {ApiFactory.ServerEnvVar} trỏ tới PostgreSQL để chạy test tích hợp.";
        }
    }
}
