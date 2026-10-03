using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace SmartMeal.Tests.Infrastructure;

public sealed record ApiEnvelope<T>(bool Success, string? Message, T? Data, List<string>? Errors);

public sealed record UserPayload(Guid Id, string Email, string FullName, string? AvatarUrl, bool IsPro, string Role, bool HasCompletedSurvey);

public sealed record AuthPayload(string Token, DateTime ExpiresAt, UserPayload User);

/// <summary>Người dùng thử đã đăng ký + client có sẵn Bearer token.</summary>
public sealed class TestUser
{
    public required HttpClient Client { get; init; }
    public required Guid Id { get; init; }
    public required string Email { get; init; }
    public required string Password { get; init; }
    public required string Token { get; init; }
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
            Token = auth.Token
        };
    }
}
