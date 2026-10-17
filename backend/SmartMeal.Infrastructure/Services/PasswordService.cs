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

/// <summary>
/// Dịch vụ quản lý chu kỳ sống của mật khẩu và quy trình xác thực mã OTP qua Email:
/// - Xử lý luồng Quên mật khẩu (Forgot Password): Gửi mã OTP 6 chữ số qua Email.
/// - Gửi lại mã OTP (Resend OTP) có kiểm soát khoảng thời gian chờ (cooldown) để chống spam gửi thư.
/// - Xác minh OTP: Áp dụng cơ chế băm HMAC-SHA256 kết hợp email + purpose + code, kiểm soát số lần thử sai tối đa.
/// - Cấp phát 'ResetToken' sử dụng một lần (One-Time Token) để đặt lại mật khẩu mới.
/// - Cập nhật mật khẩu mới, kích hoạt cờ xác minh email và thu hồi toàn bộ các phiên đăng nhập cũ để bảo vệ tài khoản.
/// </summary>
public class PasswordService : IPasswordService
{
    private const string InvalidOtpMessage = "Mã xác thực không đúng hoặc đã hết hạn.";
    private const string InvalidResetTokenMessage = "Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu mã mới.";

    private readonly ApplicationDbContext _db;
    private readonly IEmailSender _email;
    private readonly ILogger<PasswordService> _logger;
    private readonly AuthOptions _auth;
    private readonly byte[] _hmacKey;

    /// <summary>
    /// Khởi tạo instance mới của <see cref="PasswordService"/>.
    /// </summary>
    /// <param name="db">Database context của ứng dụng.</param>
    /// <param name="email">Dịch vụ gửi email thông báo mã OTP.</param>
    /// <param name="logger">Logger phục vụ ghi log theo dõi và bắt lỗi gửi thư.</param>
    /// <param name="auth">Cấu hình thời hạn OTP, thời gian chờ gửi lại và số lần thử sai tối đa.</param>
    /// <param name="jwt">Cấu hình JWT chứa khóa bí mật dùng làm HMAC key mã hóa OTP.</param>
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

    /// <summary>
    /// Tiếp nhận yêu cầu quên mật khẩu từ người dùng:
    /// Tự động sinh mã OTP 6 chữ số và gửi về hòm thư Email với mục đích 'reset-password'.
    /// Luôn trả về thông báo thành công chung để bảo vệ quyền riêng tư, tránh làm lộ thông tin email nào đã đăng ký.
    /// </summary>
    /// <param name="dto">Dữ liệu chứa địa chỉ email yêu cầu đặt lại mật khẩu.</param>
    /// <returns>True kèm thông báo hướng dẫn người dùng kiểm tra hòm thư.</returns>
    public Task<ApiResponse<bool>> ForgotPasswordAsync(ForgotPasswordRequestDto dto) =>
        SendOtpAsync(dto.Email, OtpPurposes.ResetPassword);

    /// <summary>
    /// Yêu cầu gửi lại mã xác thực OTP (dùng cho 'reset-password' hoặc 'verify-email'):
    /// Kiểm tra khoảng thời gian chờ (cooldown) tính từ lần gửi trước đó để ngăn chặn việc lạm dụng gửi thư liên tục.
    /// Vô hiệu hóa các mã OTP cũ chưa dùng của cùng email và mục đích đó.
    /// </summary>
    /// <param name="dto">Dữ liệu gồm email và mục đích nhận mã OTP.</param>
    /// <returns>True nếu yêu cầu được tiếp nhận.</returns>
    public async Task<ApiResponse<bool>> ResendOtpAsync(ResendOtpRequestDto dto)
    {
        var purpose = OtpPurposes.Canonical(dto.Purpose);
        if (purpose is null)
        {
            return ApiResponse<bool>.Fail("purpose phải là reset-password hoặc verify-email.");
        }

        return await SendOtpAsync(dto.Email, purpose);
    }

    /// <summary>
    /// Xác thực mã OTP người dùng nhập vào:
    /// - Kiểm tra mã có đúng, còn hạn và chưa từng được sử dụng.
    /// - Nếu nhập sai: Tăng số lần thử sai (Attempts); nếu vượt ngưỡng cho phép thì vô hiệu hóa mã OTP ngay lập tức.
    /// - Nếu là luồng xác minh email ('verify-email'): Cập nhật cờ 'IsEmailVerified = true' cho tài khoản.
    /// - Nếu là luồng đặt lại mật khẩu ('reset-password'): Sinh mã 'ResetToken' ngẫu nhiên dùng một lần có thời hạn ngắn để cấp quyền đặt mật khẩu mới.
    /// </summary>
    /// <param name="dto">Dữ liệu xác minh gồm email, mục đích và mã OTP 6 số.</param>
    /// <returns>Đối tượng <see cref="VerifyOtpResponseDto"/> chứa kết quả xác minh và resetToken (nếu có).</returns>
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

    /// <summary>
    /// Đặt lại mật khẩu mới cho tài khoản dựa trên 'ResetToken' hợp lệ:
    /// - Kiểm tra mã ResetToken khớp trong CSDL, còn hạn sử dụng và đánh dấu token là đã dùng (chống tấn công Replay).
    /// - Mã hóa mật khẩu mới bằng BCrypt và lưu vào tài khoản.
    /// - Tự động kích hoạt cờ IsEmailVerified = true vì người dùng vừa chứng minh quyền sở hữu hòm thư.
    /// - Đặt lại bộ đếm đăng nhập sai về 0 và thu hồi toàn bộ các phiên đăng nhập cũ trên mọi thiết bị.
    /// </summary>
    /// <param name="dto">Dữ liệu gồm Email, ResetToken và Mật khẩu mới.</param>
    /// <returns>True nếu đặt lại mật khẩu thành công.</returns>
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
    /// Tạo và gửi mã OTP ngẫu nhiên 6 chữ số qua Email:
    /// - Kiểm tra tài khoản tồn tại và thời gian chờ giữa 2 lần gửi liên tiếp.
    /// - Lưu mã băm HMAC-SHA256 của OTP vào bảng OtpVerifications kèm mốc hết hạn.
    /// - Gửi nội dung thư qua dịch vụ IEmailSender.
    /// - Luôn trả về phản hồi thành công chung để không làm lộ sự tồn tại của email.
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

    /// <summary>Chuẩn hóa địa chỉ email về chữ thường và xóa khoảng trắng.</summary>
    private static string NormalizeEmail(string email) => (email ?? string.Empty).Trim().ToLowerInvariant();

    /// <summary>
    /// Tính toán mã băm HMAC-SHA256(email|purpose|code) kết hợp với khóa bảo mật bí mật của hệ thống:
    /// Đảm bảo ngay cả khi cơ sở dữ liệu bị lộ, kẻ tấn công cũng không thể suy ngược lại mã OTP 6 số.
    /// </summary>
    private string HashCode(string email, string purpose, string code) =>
        Convert.ToHexString(HMACSHA256.HashData(_hmacKey, Encoding.UTF8.GetBytes($"{email}|{purpose}|{code}")));

    /// <summary>So sánh an toàn thời gian cố định hai chuỗi mã băm Hex.</summary>
    private static bool Matches(string storedHex, string candidateHex) =>
        storedHex.Length == candidateHex.Length &&
        CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(storedHex), Encoding.ASCII.GetBytes(candidateHex));

    /// <summary>Sinh chuỗi token ngẫu nhiên 32 byte được mã hóa base64url an toàn.</summary>
    private static string NewRawToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
