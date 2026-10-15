using System.Collections.Concurrent;
using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SmartMeal.Application.Services;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Tests.Infrastructure;
using Xunit;

namespace SmartMeal.Tests;

/// <summary>Đăng nhập Google: tạo tài khoản mới, và chỉ liên kết vào tài khoản có sẵn khi email của nó đã được xác minh.</summary>
public class GoogleLoginTests : IClassFixture<ApiFactory>
{
    /// <summary>Thay việc xác minh ID token với Google: token là khóa tra danh tính đã đăng ký sẵn.</summary>
    private sealed class FakeGoogleValidator : IGoogleIdTokenValidator
    {
        private readonly ConcurrentDictionary<string, GoogleIdentity> _identities = new();

        public string Issue(string email, string subject)
        {
            var token = $"google-token-{Guid.NewGuid():N}";
            _identities[token] = new GoogleIdentity(subject, email, "Google User", null, true);
            return token;
        }

        public Task<GoogleIdentity> ValidateAsync(string idToken, CancellationToken cancellationToken = default) =>
            _identities.TryGetValue(idToken, out var identity)
                ? Task.FromResult(identity)
                : throw new GoogleAuthException(401, "Google ID token không hợp lệ hoặc đã hết hạn.");
    }

    // Factory dùng chung cho cả lớp và chỉ dựng máy chủ một lần: mọi test phải dùng cùng một bộ xác minh giả.
    private static readonly FakeGoogleValidator Google = new();

    private readonly ApiFactory _factory;

    public GoogleLoginTests(ApiFactory factory)
    {
        _factory = factory.WithServices(services =>
        {
            services.RemoveAll<IGoogleIdTokenValidator>();
            services.AddSingleton<IGoogleIdTokenValidator>(Google);
        });
    }

    private Task<HttpResponseMessage> GoogleLoginAsync(string email, string subject) =>
        _factory.CreateClient().PostJsonAsync("/api/auth/google", new { idToken = Google.Issue(email, subject) });

    [DbFact]
    public async Task A_new_google_account_is_created_and_signs_in_again_as_the_same_user()
    {
        var email = $"g-{Guid.NewGuid():N}@example.com";
        var subject = Guid.NewGuid().ToString("N");

        var first = await GoogleLoginAsync(email, subject);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var created = (await first.ReadEnvelopeAsync<AuthPayload>()).Data!.User;
        Assert.False(created.HasPassword);

        var again = await GoogleLoginAsync(email, subject);
        Assert.Equal(created.Id, (await again.ReadEnvelopeAsync<AuthPayload>()).Data!.User.Id);
    }

    [DbFact]
    public async Task An_invalid_token_is_rejected()
    {
        var response = await _factory.CreateClient().PostJsonAsync("/api/auth/google", new { idToken = "not-a-real-google-id-token" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [DbFact]
    public async Task Google_does_not_take_over_a_password_account_whose_email_was_never_verified()
    {
        // Ai đó đăng ký trước bằng email này với mật khẩu của họ.
        var squatter = await _factory.RegisterUserAsync();
        var subject = Guid.NewGuid().ToString("N");

        var blocked = await GoogleLoginAsync(squatter.Email, subject);

        Assert.Equal(HttpStatusCode.Conflict, blocked.StatusCode);
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            Assert.Null((await db.Users.SingleAsync(u => u.Id == squatter.Id)).GoogleId);
        }

        // Chủ email chứng minh sở hữu bằng OTP thì Google được liên kết vào đúng tài khoản đó.
        (await _factory.CreateClient().PostJsonAsync("/api/auth/resend-otp", new { email = squatter.Email, purpose = "verify-email" })).EnsureSuccessStatusCode();
        var code = _factory.Email.LastCodeFor(squatter.Email)!;
        (await _factory.CreateClient().PostJsonAsync("/api/auth/verify-otp", new { email = squatter.Email, code, purpose = "verify-email" })).EnsureSuccessStatusCode();

        var linked = await GoogleLoginAsync(squatter.Email, subject);

        Assert.Equal(HttpStatusCode.OK, linked.StatusCode);
        Assert.Equal(squatter.Id, (await linked.ReadEnvelopeAsync<AuthPayload>()).Data!.User.Id);
    }
}
