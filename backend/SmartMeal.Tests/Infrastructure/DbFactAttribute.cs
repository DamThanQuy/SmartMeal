using Xunit;

namespace SmartMeal.Tests.Infrastructure;

/// <summary>
/// Test cần PostgreSQL thật. Tự bỏ qua (skip) khi chưa đặt biến môi trường <see cref="ApiFactory.ServerEnvVar"/>,
/// để <c>dotnet test</c> vẫn chạy được trên máy không có database.
/// </summary>
public sealed class DbFactAttribute : FactAttribute
{
    public DbFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(ApiFactory.ServerEnvVar)))
        {
            Skip = $"Bỏ qua: đặt biến môi trường {ApiFactory.ServerEnvVar} trỏ tới PostgreSQL để chạy test tích hợp.";
        }
    }
}
