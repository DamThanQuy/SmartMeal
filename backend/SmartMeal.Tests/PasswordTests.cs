using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SmartMeal.Application.Services;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Tests.Infrastructure;
using Xunit;

namespace SmartMeal.Tests;

public sealed record VerifyOtpPayload(bool Verified, string? ResetToken, DateTime? ResetTokenExpiresAt);

/// <summary>P1-BE-02: quên / xác minh OTP / đặt lại / đổi mật khẩu.</summary>
public class PasswordTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public PasswordTests(ApiFactory factory) => _factory = factory;

    private static Task<HttpResponseMessage> ForgotAsync(HttpClient client, string email) =>
        client.PostJsonAsync("/api/auth/forgot-password", new { email });

    private static Task<HttpResponseMessage> VerifyAsync(HttpClient client, string email, string code, string purpose = "reset-password") =>
        client.PostJsonAsync("/api/auth/verify-otp", new { email, code, purpose });

    private static Task<HttpResponseMessage> ResetAsync(HttpClient client, string email, string resetToken, string newPassword) =>
        client.PostJsonAsync("/api/auth/reset-password", new { email, resetToken, newPassword });

    private static async Task<string> VerifiedResetTokenAsync(ApiFactory factory, string email)
    {
        (await ForgotAsync(factory.CreateClient(), email)).EnsureSuccessStatusCode();
        var code = factory.Email.LastCodeFor(email)!;
        var verify = await VerifyAsync(factory.CreateClient(), email, code);
        verify.EnsureSuccessStatusCode();
        return (await verify.ReadEnvelopeAsync<VerifyOtpPayload>()).Data!.ResetToken!;
    }

    private static async Task WithDbAsync(ApiFactory factory, Func<ApplicationDbContext, Task> action)
    {
        using var scope = factory.Services.CreateScope();
        await action(scope.ServiceProvider.GetRequiredService<ApplicationDbContext>());
    }

    // ───────────────────────────── Quên mật khẩu → OTP → đặt lại ─────────────────────────────

    [DbFact]
    public async Task Forgot_password_emails_a_six_digit_code_and_never_reveals_whether_the_email_exists()
    {
        var user = await _factory.RegisterUserAsync();

        var known = await ForgotAsync(_factory.CreateClient(), user.Email);
        var unknown = await ForgotAsync(_factory.CreateClient(), "ghost-nobody@example.com");

        Assert.Equal(HttpStatusCode.OK, known.StatusCode);
        Assert.Equal(HttpStatusCode.OK, unknown.StatusCode);
        Assert.Equal((await known.ReadEnvelopeAsync<bool>()).Message, (await unknown.ReadEnvelopeAsync<bool>()).Message);

        Assert.Single(_factory.Email.To(user.Email));
        Assert.Empty(_factory.Email.To("ghost-nobody@example.com"));
        Assert.Matches(@"^\d{6}$", _factory.Email.LastCodeFor(user.Email));
    }

    [DbFact]
    public async Task The_full_flow_sets_a_new_password_and_signs_every_old_session_out()
    {
        var user = await _factory.RegisterUserAsync();
        // Khóa tài khoản bằng cách nhập sai nhiều lần: đặt lại mật khẩu phải mở khóa.
        for (var i = 0; i < 5; i++)
        {
            await _factory.CreateClient().PostJsonAsync("/api/auth/login", new { email = user.Email, password = $"wrong-{i}-pass" });
        }

        var resetToken = await VerifiedResetTokenAsync(_factory, user.Email);
        var reset = await ResetAsync(_factory.CreateClient(), user.Email, resetToken, "Brand-new-pass1");

        Assert.Equal(HttpStatusCode.OK, reset.StatusCode);
        var oldPassword = await _factory.CreateClient().PostJsonAsync("/api/auth/login", new { email = user.Email, password = user.Password });
        var newPassword = await _factory.CreateClient().PostJsonAsync("/api/auth/login", new { email = user.Email, password = "Brand-new-pass1" });
        Assert.Equal(HttpStatusCode.Unauthorized, oldPassword.StatusCode);
        Assert.Equal(HttpStatusCode.OK, newPassword.StatusCode);

        // Phiên cũ (refresh token đã phát trước đó) bị thu hồi.
        var oldSession = await _factory.CreateClient().PostJsonAsync("/api/auth/refresh", new { refreshToken = user.RefreshToken });
        Assert.Equal(HttpStatusCode.Unauthorized, oldSession.StatusCode);
    }

    [DbFact]
    public async Task A_wrong_code_is_rejected_and_five_wrong_attempts_invalidate_the_code()
    {
        var user = await _factory.RegisterUserAsync();
        (await ForgotAsync(_factory.CreateClient(), user.Email)).EnsureSuccessStatusCode();
        var correct = _factory.Email.LastCodeFor(user.Email)!;
        var wrong = correct == "000000" ? "111111" : "000000";

        for (var i = 0; i < 5; i++)
        {
            var response = await VerifyAsync(_factory.CreateClient(), user.Email, wrong);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        // Sau 5 lần sai, ngay cả mã đúng cũng không còn dùng được.
        Assert.Equal(HttpStatusCode.BadRequest, (await VerifyAsync(_factory.CreateClient(), user.Email, correct)).StatusCode);
    }

    [DbFact]
    public async Task A_code_is_single_use_and_expires()
    {
        var user = await _factory.RegisterUserAsync();
        (await ForgotAsync(_factory.CreateClient(), user.Email)).EnsureSuccessStatusCode();
        var code = _factory.Email.LastCodeFor(user.Email)!;

        Assert.Equal(HttpStatusCode.OK, (await VerifyAsync(_factory.CreateClient(), user.Email, code)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await VerifyAsync(_factory.CreateClient(), user.Email, code)).StatusCode);

        // Mã hết hạn.
        var other = await _factory.RegisterUserAsync();
        (await ForgotAsync(_factory.CreateClient(), other.Email)).EnsureSuccessStatusCode();
        var expiredCode = _factory.Email.LastCodeFor(other.Email)!;
        await WithDbAsync(_factory, db => db.OtpVerifications.Where(o => o.Email == other.Email)
            .ExecuteUpdateAsync(s => s.SetProperty(o => o.ExpiredAt, DateTime.UtcNow.AddMinutes(-1))));

        Assert.Equal(HttpStatusCode.BadRequest, (await VerifyAsync(_factory.CreateClient(), other.Email, expiredCode)).StatusCode);
    }

    [DbFact]
    public async Task A_code_for_one_email_cannot_be_used_for_another()
    {
        var alice = await _factory.RegisterUserAsync();
        var bob = await _factory.RegisterUserAsync();
        (await ForgotAsync(_factory.CreateClient(), alice.Email)).EnsureSuccessStatusCode();
        var aliceCode = _factory.Email.LastCodeFor(alice.Email)!;

        var response = await VerifyAsync(_factory.CreateClient(), bob.Email, aliceCode);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [DbFact]
    public async Task Codes_are_stored_as_hashes_never_as_plain_text()
    {
        var user = await _factory.RegisterUserAsync();
        (await ForgotAsync(_factory.CreateClient(), user.Email)).EnsureSuccessStatusCode();
        var code = _factory.Email.LastCodeFor(user.Email)!;

        await WithDbAsync(_factory, async db =>
        {
            var stored = await db.OtpVerifications.Where(o => o.Email == user.Email).SingleAsync();
            Assert.NotEqual(code, stored.CodeHash);
            Assert.Equal(64, stored.CodeHash.Length);          // HMAC-SHA256 dạng hex
            Assert.Equal("reset-password", stored.Purpose);
        });
    }

    [DbFact]
    public async Task Resending_within_the_cooldown_sends_nothing_new_and_after_it_replaces_the_old_code()
    {
        var user = await _factory.RegisterUserAsync();
        (await ForgotAsync(_factory.CreateClient(), user.Email)).EnsureSuccessStatusCode();
        var resend = await _factory.CreateClient().PostJsonAsync("/api/auth/resend-otp", new { email = user.Email, purpose = "reset-password" });
        Assert.Equal(HttpStatusCode.OK, resend.StatusCode);              // vẫn 200, không lộ trạng thái chờ
        Assert.Single(_factory.Email.To(user.Email));                    // nhưng không gửi thêm email

        using var factory = new ApiFactory().WithSetting("Auth:OtpResendCooldownSeconds", "0");
        var second = await factory.RegisterUserAsync();
        (await ForgotAsync(factory.CreateClient(), second.Email)).EnsureSuccessStatusCode();
        var first = factory.Email.LastCodeFor(second.Email)!;
        (await factory.CreateClient().PostJsonAsync("/api/auth/resend-otp", new { email = second.Email, purpose = "reset-password" })).EnsureSuccessStatusCode();
        var latest = factory.Email.LastCodeFor(second.Email)!;

        Assert.Equal(2, factory.Email.To(second.Email).Count);
        if (first != latest)
        {
            Assert.Equal(HttpStatusCode.BadRequest, (await VerifyAsync(factory.CreateClient(), second.Email, first)).StatusCode);
        }

        Assert.Equal(HttpStatusCode.OK, (await VerifyAsync(factory.CreateClient(), second.Email, latest)).StatusCode);
    }

    [DbFact]
    public async Task The_reset_token_is_single_use_tied_to_the_email_and_the_new_password_is_validated()
    {
        var user = await _factory.RegisterUserAsync();
        var other = await _factory.RegisterUserAsync();
        var resetToken = await VerifiedResetTokenAsync(_factory, user.Email);

        var tooShort = await ResetAsync(_factory.CreateClient(), user.Email, resetToken, "short");
        var wrongEmail = await ResetAsync(_factory.CreateClient(), other.Email, resetToken, "Another-pass-1");
        var wrongToken = await ResetAsync(_factory.CreateClient(), user.Email, "not-the-token", "Another-pass-1");
        var ok = await ResetAsync(_factory.CreateClient(), user.Email, resetToken, "Another-pass-1");
        var reuse = await ResetAsync(_factory.CreateClient(), user.Email, resetToken, "Yet-another-pass-2");

        Assert.Equal(HttpStatusCode.BadRequest, tooShort.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, wrongEmail.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, wrongToken.StatusCode);
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, reuse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _factory.CreateClient().PostJsonAsync("/api/auth/login", new { email = user.Email, password = "Another-pass-1" })).StatusCode);
    }

    [DbFact]
    public async Task Email_matching_ignores_case_and_the_code_format_is_validated()
    {
        var user = await _factory.RegisterUserAsync();

        (await ForgotAsync(_factory.CreateClient(), user.Email.ToUpperInvariant())).EnsureSuccessStatusCode();
        var code = _factory.Email.LastCodeFor(user.Email)!;

        var badFormat = await VerifyAsync(_factory.CreateClient(), user.Email, "12ab");
        var good = await VerifyAsync(_factory.CreateClient(), user.Email.ToUpperInvariant(), code);

        Assert.Equal(HttpStatusCode.BadRequest, badFormat.StatusCode);
        Assert.Equal(HttpStatusCode.OK, good.StatusCode);
    }

    [DbFact]
    public async Task Verify_email_purpose_marks_the_email_verified_and_is_a_no_op_when_already_verified()
    {
        var user = await _factory.RegisterUserAsync();   // đăng ký hiện chưa bắt xác minh OTP nên email đã được coi là xác minh

        var resend = await _factory.CreateClient().PostJsonAsync("/api/auth/resend-otp", new { email = user.Email, purpose = "verify-email" });
        Assert.Equal(HttpStatusCode.OK, resend.StatusCode);
        Assert.Empty(_factory.Email.To(user.Email));

        // Đặt lại cờ chưa xác minh để kiểm đường xác minh thật.
        await WithDbAsync(_factory, db => db.Users.Where(u => u.Id == user.Id).ExecuteUpdateAsync(s => s.SetProperty(u => u.IsEmailVerified, false)));
        (await _factory.CreateClient().PostJsonAsync("/api/auth/resend-otp", new { email = user.Email, purpose = "verify-email" })).EnsureSuccessStatusCode();
        var code = _factory.Email.LastCodeFor(user.Email)!;

        var verify = await VerifyAsync(_factory.CreateClient(), user.Email, code, "verify-email");

        Assert.Equal(HttpStatusCode.OK, verify.StatusCode);
        Assert.Null((await verify.ReadEnvelopeAsync<VerifyOtpPayload>()).Data!.ResetToken);
        await WithDbAsync(_factory, async db => Assert.True((await db.Users.SingleAsync(u => u.Id == user.Id)).IsEmailVerified));
    }

    // ───────────────────────────── Đổi mật khẩu ─────────────────────────────

    [DbFact]
    public async Task Change_password_requires_the_current_password_and_signs_other_sessions_out()
    {
        var user = await _factory.RegisterUserAsync();

        var wrong = await user.Client.PostJsonAsync("/api/auth/change-password", new { currentPassword = "not-my-password", newPassword = "Fresh-pass-123" });
        var same = await user.Client.PostJsonAsync("/api/auth/change-password", new { currentPassword = user.Password, newPassword = user.Password });
        var weak = await user.Client.PostJsonAsync("/api/auth/change-password", new { currentPassword = user.Password, newPassword = "short" });
        var ok = await user.Client.PostJsonAsync("/api/auth/change-password", new { currentPassword = user.Password, newPassword = "Fresh-pass-123" });

        // 400 (không phải 401): app không được coi đây là phiên hết hạn.
        Assert.Equal(HttpStatusCode.BadRequest, wrong.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, same.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, weak.StatusCode);
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);

        var fresh = (await ok.ReadEnvelopeAsync<AuthPayload>()).Data!;
        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().PostJsonAsync("/api/auth/refresh", new { refreshToken = user.RefreshToken })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _factory.CreateClient().PostJsonAsync("/api/auth/refresh", new { refreshToken = fresh.RefreshToken })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().PostJsonAsync("/api/auth/login", new { email = user.Email, password = user.Password })).StatusCode);
    }

    [DbFact]
    public async Task Guessing_the_current_password_through_change_password_locks_the_account()
    {
        var user = await _factory.RegisterUserAsync();

        for (var i = 0; i < 4; i++)
        {
            Assert.Equal(HttpStatusCode.BadRequest,
                (await user.Client.PostJsonAsync("/api/auth/change-password", new { currentPassword = $"guess-{i}-pass", newPassword = "Fresh-pass-123" })).StatusCode);
        }

        var locking = await user.Client.PostJsonAsync("/api/auth/change-password", new { currentPassword = "guess-4-pass", newPassword = "Fresh-pass-123" });
        Assert.Equal((HttpStatusCode)423, locking.StatusCode);
    }

    [DbFact]
    public async Task Google_only_accounts_must_use_forgot_password_to_create_a_password()
    {
        var email = $"g-{Guid.NewGuid():N}@example.com";
        _factory.Google.Add("token-pw", new GoogleIdentity($"sub-{Guid.NewGuid():N}", email, true, "Only", null));
        var login = await _factory.CreateClient().PostJsonAsync("/api/auth/google", new { idToken = "token-pw" });
        var auth = (await login.ReadEnvelopeAsync<AuthPayload>()).Data!;
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", auth.Token);

        var change = await client.PostJsonAsync("/api/auth/change-password", new { currentPassword = "anything-1", newPassword = "Fresh-pass-123" });
        Assert.Equal(HttpStatusCode.BadRequest, change.StatusCode);
        Assert.Contains("Quên mật khẩu", (await change.ReadEnvelopeAsync<object>()).Message);

        // Luồng quên mật khẩu qua email cho phép đặt mật khẩu lần đầu.
        var resetToken = await VerifiedResetTokenAsync(_factory, email);
        Assert.Equal(HttpStatusCode.OK, (await ResetAsync(_factory.CreateClient(), email, resetToken, "First-password-1")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _factory.CreateClient().PostJsonAsync("/api/auth/login", new { email, password = "First-password-1" })).StatusCode);
    }
}
