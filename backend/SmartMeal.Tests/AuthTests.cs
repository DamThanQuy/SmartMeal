using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using SmartMeal.Application.Services;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Tests.Infrastructure;
using Xunit;

namespace SmartMeal.Tests;

/// <summary>SEC-02 (khóa khi dò mật khẩu), P1-BE-03 (refresh token); đăng nhập Google đã bỏ (chỉ còn email + mật khẩu).</summary>
public class AuthTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public AuthTests(ApiFactory factory) => _factory = factory;

    private static async Task<AuthPayload> LoginAsync(HttpClient client, string email, string password)
    {
        var response = await client.PostJsonAsync("/api/auth/login", new { email, password });
        response.EnsureSuccessStatusCode();
        return (await response.ReadEnvelopeAsync<AuthPayload>()).Data!;
    }

    private static Task<HttpResponseMessage> RefreshAsync(HttpClient client, string refreshToken) =>
        client.PostJsonAsync("/api/auth/refresh", new { refreshToken });

    private static async Task SetAsync(ApiFactory factory, Func<ApplicationDbContext, Task> action)
    {
        using var scope = factory.Services.CreateScope();
        await action(scope.ServiceProvider.GetRequiredService<ApplicationDbContext>());
    }

    // ───────────────────────────── Token / refresh ─────────────────────────────

    [DbFact]
    public async Task Register_and_login_issue_an_access_token_and_a_refresh_token()
    {
        var user = await _factory.RegisterUserAsync();

        var login = await LoginAsync(_factory.CreateClient(), user.Email, user.Password);

        Assert.False(string.IsNullOrWhiteSpace(login.RefreshToken));
        Assert.NotEqual(user.RefreshToken, login.RefreshToken);                  // mỗi lần đăng nhập một phiên mới
        Assert.InRange(login.ExpiresAt, DateTime.UtcNow.AddMinutes(55), DateTime.UtcNow.AddMinutes(65));   // access token ngắn hạn (mặc định 60 phút)
        Assert.InRange(login.RefreshTokenExpiresAt, DateTime.UtcNow.AddDays(29), DateTime.UtcNow.AddDays(31));
    }

    [DbFact]
    public async Task Refresh_rotates_the_token_and_the_old_one_no_longer_works()
    {
        var user = await _factory.RegisterUserAsync();
        var client = _factory.CreateClient();

        var refreshed = await RefreshAsync(client, user.RefreshToken);

        Assert.Equal(HttpStatusCode.OK, refreshed.StatusCode);
        var next = (await refreshed.ReadEnvelopeAsync<AuthPayload>()).Data!;
        Assert.NotEqual(user.RefreshToken, next.RefreshToken);
        Assert.Equal(user.Id, next.User.Id);

        // Access token mới dùng được.
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", next.Token);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me")).StatusCode);

        // Refresh token cũ đã bị thu hồi; token mới vẫn dùng được (trong thời gian ân hạn không thu hồi cả phiên).
        Assert.Equal(HttpStatusCode.Unauthorized, (await RefreshAsync(_factory.CreateClient(), user.RefreshToken)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await RefreshAsync(_factory.CreateClient(), next.RefreshToken)).StatusCode);
    }

    [DbFact]
    public async Task Reusing_a_rotated_token_after_the_grace_period_revokes_every_session_of_the_user()
    {
        using var factory = new ApiFactory().WithSetting("Auth:RefreshReuseGraceSeconds", "0");
        var user = await factory.RegisterUserAsync();
        var other = await LoginAsync(factory.CreateClient(), user.Email, user.Password);   // phiên thứ hai
        var client = factory.CreateClient();

        var rotated = (await (await RefreshAsync(client, user.RefreshToken)).ReadEnvelopeAsync<AuthPayload>()).Data!;
        await Task.Delay(50);

        // Kẻ cầm token cũ dùng lại → bị từ chối và mọi phiên của người dùng bị thu hồi.
        Assert.Equal(HttpStatusCode.Unauthorized, (await RefreshAsync(client, user.RefreshToken)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await RefreshAsync(client, rotated.RefreshToken)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await RefreshAsync(client, other.RefreshToken)).StatusCode);
    }

    [DbFact]
    public async Task Logout_revokes_the_refresh_token_and_is_idempotent()
    {
        var user = await _factory.RegisterUserAsync();
        var client = _factory.CreateClient();   // không cần access token để đăng xuất

        var first = await client.PostJsonAsync("/api/auth/logout", new { refreshToken = user.RefreshToken });
        var again = await client.PostJsonAsync("/api/auth/logout", new { refreshToken = user.RefreshToken });
        var unknown = await client.PostJsonAsync("/api/auth/logout", new { refreshToken = "never-issued" });
        var empty = await client.PostJsonAsync("/api/auth/logout", new { });

        Assert.All(new[] { first, again, unknown, empty }, r => Assert.Equal(HttpStatusCode.OK, r.StatusCode));
        Assert.Equal(HttpStatusCode.Unauthorized, (await RefreshAsync(client, user.RefreshToken)).StatusCode);
    }

    [DbFact]
    public async Task Expired_and_unknown_refresh_tokens_are_rejected()
    {
        var user = await _factory.RegisterUserAsync();
        await SetAsync(_factory, db => db.RefreshTokens.Where(t => t.UserId == user.Id)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.ExpiresAt, DateTime.UtcNow.AddMinutes(-1))));

        var expired = await RefreshAsync(_factory.CreateClient(), user.RefreshToken);
        var unknown = await RefreshAsync(_factory.CreateClient(), "x".PadRight(60, 'y'));
        var missing = await _factory.CreateClient().PostJsonAsync("/api/auth/refresh", new { });

        Assert.Equal(HttpStatusCode.Unauthorized, expired.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, unknown.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, missing.StatusCode);
    }

    [DbFact]
    public async Task An_expired_access_token_is_reported_as_token_expired()
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(ApiFactory.TestJwtKey));
        var jwt = new JwtSecurityToken(
            "SmartMealTests", "SmartMealTests",
            new[] { new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()) },
            notBefore: DateTime.UtcNow.AddHours(-2),
            expires: DateTime.UtcNow.AddHours(-1),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", new JwtSecurityTokenHandler().WriteToken(jwt));

        var response = await client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Contains("token_expired", (await response.ReadEnvelopeAsync<object>()).Errors!);
    }

    // ───────────────────────────── Đăng ký / đăng nhập ─────────────────────────────

    [DbFact]
    public async Task Duplicate_email_is_rejected_regardless_of_case()
    {
        var user = await _factory.RegisterUserAsync(email: $"dup-{Guid.NewGuid():N}@example.com");

        var response = await _factory.CreateClient().PostJsonAsync("/api/auth/register",
            new { email = user.Email.ToUpperInvariant(), password = "Passw0rd!", fullName = "Other" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("đã được sử dụng", (await response.ReadEnvelopeAsync<object>()).Message);
    }

    [DbFact]
    public async Task Unknown_email_and_wrong_password_are_indistinguishable()
    {
        var user = await _factory.RegisterUserAsync();

        var wrongPassword = await _factory.CreateClient().PostJsonAsync("/api/auth/login", new { email = user.Email, password = "nope-nope" });
        var unknownEmail = await _factory.CreateClient().PostJsonAsync("/api/auth/login", new { email = "ghost@example.com", password = "nope-nope" });

        Assert.Equal(HttpStatusCode.Unauthorized, wrongPassword.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, unknownEmail.StatusCode);
        Assert.Equal(
            (await wrongPassword.ReadEnvelopeAsync<object>()).Message,
            (await unknownEmail.ReadEnvelopeAsync<object>()).Message);
    }

    // ───────────────────────────── Khóa tài khoản (SEC-02) ─────────────────────────────

    [DbFact]
    public async Task Too_many_wrong_passwords_lock_the_account_even_for_the_correct_password()
    {
        var user = await _factory.RegisterUserAsync();
        var client = _factory.CreateClient();

        for (var i = 0; i < 4; i++)
        {
            var wrong = await client.PostJsonAsync("/api/auth/login", new { email = user.Email, password = $"wrong-{i}-pass" });
            Assert.Equal(HttpStatusCode.Unauthorized, wrong.StatusCode);
        }

        // Lần sai thứ 5 kích hoạt khóa.
        var locking = await client.PostJsonAsync("/api/auth/login", new { email = user.Email, password = "wrong-4-pass" });
        Assert.Equal((HttpStatusCode)423, locking.StatusCode);
        Assert.Contains("khóa", (await locking.ReadEnvelopeAsync<object>()).Message);

        // Đang khóa: mật khẩu đúng cũng bị từ chối.
        var correct = await client.PostJsonAsync("/api/auth/login", new { email = user.Email, password = user.Password });
        Assert.Equal((HttpStatusCode)423, correct.StatusCode);

        // Hết thời gian khóa → đăng nhập lại được và bộ đếm được reset.
        await SetAsync(_factory, db => db.Users.Where(u => u.Id == user.Id)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.LockoutEnd, DateTime.UtcNow.AddMinutes(-1))));
        Assert.Equal(HttpStatusCode.OK, (await client.PostJsonAsync("/api/auth/login", new { email = user.Email, password = user.Password })).StatusCode);

        for (var i = 0; i < 4; i++)
        {
            Assert.Equal(HttpStatusCode.Unauthorized,
                (await client.PostJsonAsync("/api/auth/login", new { email = user.Email, password = $"again-{i}-pass" })).StatusCode);
        }
    }

    [DbFact]
    public async Task A_successful_login_resets_the_failed_attempt_counter()
    {
        var user = await _factory.RegisterUserAsync();
        var client = _factory.CreateClient();

        for (var round = 0; round < 3; round++)
        {
            for (var i = 0; i < 4; i++)
            {
                Assert.Equal(HttpStatusCode.Unauthorized,
                    (await client.PostJsonAsync("/api/auth/login", new { email = user.Email, password = $"bad-{round}-{i}!!" })).StatusCode);
            }

            Assert.Equal(HttpStatusCode.OK, (await client.PostJsonAsync("/api/auth/login", new { email = user.Email, password = user.Password })).StatusCode);
        }
    }

    [DbFact]
    public async Task Auth_endpoints_are_rate_limited_per_client()
    {
        using var factory = new ApiFactory().WithSetting("RateLimiting:AuthPermitsPerMinute", "3");
        var client = factory.CreateClient();

        var statuses = new List<HttpStatusCode>();
        for (var i = 0; i < 5; i++)
        {
            statuses.Add((await client.PostJsonAsync("/api/auth/login", new { email = "ghost@example.com", password = "whatever1" })).StatusCode);
        }

        Assert.Equal(3, statuses.Count(s => s == HttpStatusCode.Unauthorized));
        Assert.Equal(2, statuses.Count(s => s == HttpStatusCode.TooManyRequests));

        var limited = await client.PostJsonAsync("/api/auth/login", new { email = "ghost@example.com", password = "whatever1" });
        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        Assert.Equal("application/json", limited.Content.Headers.ContentType?.MediaType);
        Assert.False((await limited.ReadEnvelopeAsync<object>()).Success);
    }

    // ───────────────────────────── Mật khẩu của tài khoản ─────────────────────────────

    [DbFact]
    public async Task Accounts_registered_with_email_report_that_they_have_a_password()
    {
        var user = await _factory.RegisterUserAsync();

        var me = (await (await user.Client.GetAsync("/api/auth/me")).ReadEnvelopeAsync<UserPayload>()).Data!;

        Assert.True(me.HasPassword);
    }

    [DbFact]
    public async Task Accounts_without_a_password_report_it_and_cannot_sign_in_with_a_password()
    {
        // Như tài khoản tạo bằng đăng nhập Google trước khi app bỏ tính năng này.
        var user = await _factory.RegisterPasswordlessUserAsync();

        var me = (await (await user.Client.GetAsync("/api/auth/me")).ReadEnvelopeAsync<UserPayload>()).Data!;
        var login = await _factory.CreateClient().PostJsonAsync("/api/auth/login", new { email = user.Email, password = user.Password });

        Assert.False(me.HasPassword);
        Assert.Equal(HttpStatusCode.Unauthorized, login.StatusCode);
    }

    [DbFact]
    public async Task Google_login_endpoint_has_been_removed()
    {
        var response = await _factory.CreateClient().PostJsonAsync("/api/auth/google", new { idToken = "anything" });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ───────────────────────────── Hồ sơ tài khoản ─────────────────────────────

    [DbFact]
    public async Task Profile_update_validates_the_avatar_url_and_can_clear_it()
    {
        var user = await _factory.RegisterUserAsync();

        var script = await user.Client.PutJsonAsync("/api/auth/profile", new { avatarUrl = "javascript:alert(1)" });
        var ok = await user.Client.PutJsonAsync("/api/auth/profile", new { fullName = "Tên Mới", avatarUrl = "https://cdn.example.com/a.png" });
        var cleared = await user.Client.PutJsonAsync("/api/auth/profile", new { avatarUrl = "" });

        Assert.Equal(HttpStatusCode.BadRequest, script.StatusCode);
        var updated = (await ok.ReadEnvelopeAsync<UserPayload>()).Data!;
        Assert.Equal("Tên Mới", updated.FullName);
        Assert.Equal("https://cdn.example.com/a.png", updated.AvatarUrl);
        Assert.Null((await cleared.ReadEnvelopeAsync<UserPayload>()).Data!.AvatarUrl);
    }
}
