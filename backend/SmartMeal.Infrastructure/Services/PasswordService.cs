using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Auth;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Infrastructure.Options;

namespace SmartMeal.Infrastructure.Services;

public class PasswordService : IPasswordService
{
    private const string InvalidOtpMessage = "Mã xác thực không đúng hoặc đã hết hạn.";
    private const string InvalidResetTokenMessage = "Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu mã mới.";

    private readonly ApplicationDbContext _db;
    private readonly IEmailSender _email;
    private readonly ILogger<PasswordService> _logger;
    private readonly AuthOptions _auth;
    private readonly byte[] _hmacKey;

    public PasswordService(
        ApplicationDbContext db,
        IEmailSender email,
        ILogger<PasswordService> logger,
        IOptions<AuthOptions> auth,
        IOptions<JwtOptions> jwt)
    {
        _db = db;
        _email = email;
        _logger = logger;
        _auth = auth.Value;
        _hmacKey = Encoding.UTF8.GetBytes(jwt.Value.Key);
    }

    public Task<ApiResponse<bool>> ForgotPasswordAsync(ForgotPasswordRequestDto dto) =>
        SendOtpAsync(dto.Email, OtpPurposes.ResetPassword);

    public async Task<ApiResponse<bool>> ResendOtpAsync(ResendOtpRequestDto dto)
    {
        var purpose = OtpPurposes.Canonical(dto.Purpose);
        if (purpose is null)
        {
            return ApiResponse<bool>.Fail("purpose phải là reset-password hoặc verify-email.");
        }

        return await SendOtpAsync(dto.Email, purpose);
    }

    public async Task<ApiResponse<VerifyOtpResponseDto>> VerifyOtpAsync(VerifyOtpRequestDto dto)
    {
        var purpose = OtpPurposes.Canonical(dto.Purpose);
        if (purpose is null)
        {
            return ApiResponse<VerifyOtpResponseDto>.Fail("purpose phải là reset-password hoặc verify-email.");
        }

        var email = NormalizeEmail(dto.Email);
        var now = DateTime.UtcNow;

        var otp = await _db.OtpVerifications
            .Where(o => o.Email == email && o.Purpose == purpose && !o.IsUsed && o.ExpiredAt > now)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();

        // Email chưa đăng ký, mã sai, hết hạn hay đã dùng đều trả cùng một thông báo.
        if (otp is null)
        {
            return ApiResponse<VerifyOtpResponseDto>.Fail(InvalidOtpMessage);
        }

        if (!Matches(otp.CodeHash, HashCode(email, purpose, dto.Code)))
        {
            otp.Attempts++;
            if (otp.Attempts >= _auth.OtpMaxAttempts)
            {
                otp.IsUsed = true; // sai quá nhiều lần: vô hiệu mã, phải xin mã mới
            }

            await _db.SaveChangesAsync();
            return ApiResponse<VerifyOtpResponseDto>.Fail(InvalidOtpMessage);
        }

        otp.IsUsed = true;

        if (purpose == OtpPurposes.VerifyEmail)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email);
            if (user is not null)
            {
                user.IsEmailVerified = true;
            }

            await _db.SaveChangesAsync();
            return ApiResponse<VerifyOtpResponseDto>.Ok(new VerifyOtpResponseDto { Verified = true }, "Xác minh email thành công.");
        }

        // OTP đặt lại mật khẩu đúng → phát mã đặt lại (dùng một lần, hiệu lực ngắn).
        var rawToken = NewRawToken();
        var expiresAt = now.AddMinutes(_auth.ResetTokenMinutes);
        _db.OtpVerifications.Add(new OtpVerification
        {
            Email = email,
            Purpose = OtpPurposes.ResetToken,
            CodeHash = HashCode(email, OtpPurposes.ResetToken, rawToken),
            CreatedAt = now,
            ExpiredAt = expiresAt
        });
        await _db.SaveChangesAsync();

        return ApiResponse<VerifyOtpResponseDto>.Ok(
            new VerifyOtpResponseDto { Verified = true, ResetToken = rawToken, ResetTokenExpiresAt = expiresAt },
            "Xác minh thành công. Hãy đặt mật khẩu mới.");
    }

    public async Task<ApiResponse<bool>> ResetPasswordAsync(ResetPasswordRequestDto dto)
    {
        var email = NormalizeEmail(dto.Email);
        var now = DateTime.UtcNow;

        var candidates = await _db.OtpVerifications
            .Where(o => o.Email == email && o.Purpose == OtpPurposes.ResetToken && !o.IsUsed && o.ExpiredAt > now)
            .ToListAsync();
        var expected = HashCode(email, OtpPurposes.ResetToken, dto.ResetToken);
        var token = candidates.FirstOrDefault(c => Matches(c.CodeHash, expected));
        if (token is null)
        {
            return ApiResponse<bool>.Fail(InvalidResetTokenMessage);
        }

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email);
        if (user is null)
        {
            return ApiResponse<bool>.Fail(InvalidResetTokenMessage);
        }

        token.IsUsed = true;
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        user.IsEmailVerified = true;           // người dùng vừa chứng minh sở hữu email
        user.FailedLoginCount = 0;
        user.LockoutEnd = null;
        user.UpdatedAt = now;
        await _db.SaveChangesAsync();

        // Đổi mật khẩu → mọi phiên đăng nhập cũ phải đăng nhập lại.
        await _db.RefreshTokens
            .Where(t => t.UserId == user.Id && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, now));

        return ApiResponse<bool>.Ok(true, "Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.");
    }

    // ───────────────────────────── Nội bộ ─────────────────────────────

    /// <summary>
    /// Tạo và gửi OTP. Luôn trả cùng một thông báo thành công dù email có đăng ký hay không, hay đang trong thời gian
    /// chờ gửi lại, để không lộ thông tin tài khoản.
    /// </summary>
    private async Task<ApiResponse<bool>> SendOtpAsync(string rawEmail, string purpose)
    {
        var message = $"Nếu email đã đăng ký, mã xác thực đã được gửi. Mã có hiệu lực {_auth.OtpMinutes} phút.";
        var email = NormalizeEmail(rawEmail);
        var now = DateTime.UtcNow;

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email);
        if (user is null || (purpose == OtpPurposes.VerifyEmail && user.IsEmailVerified))
        {
            return ApiResponse<bool>.Ok(true, message);
        }

        var last = await _db.OtpVerifications
            .Where(o => o.Email == email && o.Purpose == purpose)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();
        if (last is not null && (now - last.CreatedAt).TotalSeconds < _auth.OtpResendCooldownSeconds)
        {
            return ApiResponse<bool>.Ok(true, message);
        }

        // Chỉ mã mới nhất có hiệu lực.
        await _db.OtpVerifications
            .Where(o => o.Email == email && o.Purpose == purpose && !o.IsUsed)
            .ExecuteUpdateAsync(s => s.SetProperty(o => o.IsUsed, true));

        var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        _db.OtpVerifications.Add(new OtpVerification
        {
            Email = email,
            Purpose = purpose,
            CodeHash = HashCode(email, purpose, code),
            CreatedAt = now,
            ExpiredAt = now.AddMinutes(_auth.OtpMinutes)
        });
        await _db.SaveChangesAsync();

        try
        {
            await _email.SendAsync(new EmailMessage(
                user.Email,
                purpose == OtpPurposes.ResetPassword ? "SmartMeal - Mã đặt lại mật khẩu" : "SmartMeal - Mã xác minh email",
                $"Mã xác thực SmartMeal của bạn là: {code}\n\nMã có hiệu lực trong {_auth.OtpMinutes} phút. " +
                "Không chia sẻ mã này với bất kỳ ai. Nếu bạn không yêu cầu, hãy bỏ qua email này."));
        }
        catch (Exception ex)
        {
            // Không báo lỗi gửi mail cho client (tránh lộ trạng thái tài khoản); quản trị viên thấy ở log.
            _logger.LogError(ex, "Không gửi được email OTP tới {Email}", email);
        }

        return ApiResponse<bool>.Ok(true, message);
    }

    private static string NormalizeEmail(string email) => (email ?? string.Empty).Trim().ToLowerInvariant();

    /// <summary>HMAC-SHA256(email|purpose|code) với khóa bí mật của máy chủ: DB bị lộ cũng không suy ra được mã 6 số.</summary>
    private string HashCode(string email, string purpose, string code) =>
        Convert.ToHexString(HMACSHA256.HashData(_hmacKey, Encoding.UTF8.GetBytes($"{email}|{purpose}|{code}")));

    private static bool Matches(string storedHex, string candidateHex) =>
        storedHex.Length == candidateHex.Length &&
        CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(storedHex), Encoding.ASCII.GetBytes(candidateHex));

    private static string NewRawToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
