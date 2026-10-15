using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.Tests.Infrastructure;

public sealed record ApiEnvelope<T>(bool Success, string? Message, T? Data, List<string>? Errors);

public sealed record UserPayload(
    Guid Id, string Email, string FullName, string? AvatarUrl, bool IsPro, string SubscriptionStatus, DateTime? ProExpiresAt,
    string Role, bool HasCompletedSurvey, bool HasPassword = false);

public sealed record AuthPayload(string Token, DateTime ExpiresAt, string RefreshToken, DateTime RefreshTokenExpiresAt, UserPayload User);

/// <summary>Người dùng thử đã đăng ký + client có sẵn Bearer token.</summary>
public sealed class TestUser
{
    public required HttpClient Client { get; init; }
    public required Guid Id { get; init; }
    public required string Email { get; init; }
    public required string Password { get; init; }
    public required string Token { get; init; }
    public required string RefreshToken { get; init; }
}

public static class ApiTestHelpers
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static async Task<ApiEnvelope<T>> ReadEnvelopeAsync<T>(this HttpResponseMessage response)
    {
        var text = await response.Content.ReadAsStringAsync();
        var envelope = JsonSerializer.Deserialize<ApiEnvelope<T>>(text, Json);
        return envelope ?? throw new InvalidOperationException($"Body không phải envelope: {text}");
    }

    public static Task<HttpResponseMessage> PostJsonAsync(this HttpClient client, string url, object? body) =>
        client.PostAsJsonAsync(url, body, Json);

    public static Task<HttpResponseMessage> PutJsonAsync(this HttpClient client, string url, object? body) =>
        client.PutAsJsonAsync(url, body, Json);

    /// <summary>
    /// Cho tài khoản thử gói Pro 30 ngày (ghi thẳng DB, không qua thanh toán) — để test các tính năng chỉ dành cho Pro
    /// (quét tủ lạnh, tự tạo thực đơn tuần).
    /// </summary>
    public static async Task GrantProAsync(this ApiFactory factory, TestUser user)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await db.Users.Where(u => u.Id == user.Id).ExecuteUpdateAsync(s => s
            .SetProperty(u => u.IsPro, true)
            .SetProperty(u => u.ProPlanId, "PRO_MONTHLY")
            .SetProperty(u => u.ProExpiresAt, DateTime.UtcNow.AddDays(30))
            .SetProperty(u => u.SubscriptionStatus, "Premium"));
    }

    /// <summary>
    /// Tài khoản không có mật khẩu — như tài khoản tạo bằng đăng nhập Google trước khi app bỏ tính năng này. Đăng ký bình
    /// thường rồi xóa mật khẩu trong DB; token đã cấp vẫn dùng được.
    /// </summary>
    public static async Task<TestUser> RegisterPasswordlessUserAsync(this ApiFactory factory)
    {
        var user = await factory.RegisterUserAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await db.Users.Where(u => u.Id == user.Id).ExecuteUpdateAsync(s => s.SetProperty(u => u.PasswordHash, (string?)null));
        return user;
    }

    /// <summary>Đăng ký tài khoản mới và trả client đã gắn Bearer token.</summary>
    public static async Task<TestUser> RegisterUserAsync(
        this ApiFactory factory,
        string? email = null,
        string password = "Passw0rd!",
        string fullName = "Tester")
    {
        email ??= $"user-{Guid.NewGuid():N}@example.com";
        var client = factory.CreateClient();

        var response = await client.PostJsonAsync("/api/auth/register", new { email, password, fullName });
        response.EnsureSuccessStatusCode();
        var auth = (await response.ReadEnvelopeAsync<AuthPayload>()).Data
                   ?? throw new InvalidOperationException("Đăng ký không trả dữ liệu.");

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);
        return new TestUser
        {
            Client = client,
            Id = auth.User.Id,
            Email = auth.User.Email,
            Password = password,
            Token = auth.Token,
            RefreshToken = auth.RefreshToken
        };
    }
}
