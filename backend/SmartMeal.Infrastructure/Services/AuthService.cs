using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Auth;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Infrastructure.Options;

namespace SmartMeal.Infrastructure.Services;

/// <summary>
/// Dịch vụ xử lý toàn bộ nghiệp vụ xác thực danh tính và quản trị phiên làm việc của người dùng:
/// - Đăng ký tài khoản mới bằng Email/Mật khẩu với mã hóa BCrypt an toàn.
/// - Đăng nhập tài khoản với cơ chế bảo vệ chống tấn công Brute-force (khóa tài khoản tạm thời khi sai nhiều lần).
/// - Đăng nhập hoặc tạo mới tài khoản qua Google Identity SSO (Google ID Token).
/// - Quản lý chu kỳ sống JWT Token: Cấp phát Access Token và Refresh Token Rotation (sử dụng 1 lần, phát hiện tái sử dụng trái phép).
/// - Đăng xuất và thu hồi phiên làm việc trên các thiết bị.
/// - Cập nhật thông tin hồ sơ và đổi mật khẩu kèm cơ chế thu hồi phiên cũ an toàn.
/// </summary>
public class AuthService : IAuthService
{
    private const string InvalidCredentialsMessage = "Email hoặc mật khẩu không chính xác.";
    private const string InvalidSessionMessage = "Phiên đăng nhập không hợp lệ hoặc đã hết hạn, vui lòng đăng nhập lại.";
    private const string EmailNotVerifiedMessage = "Email chưa được xác minh. Mã xác thực đã được gửi tới email của bạn.";
    private const string EmailNotVerifiedCode = "email_not_verified";

    // Băm của một chuỗi ngẫu nhiên: kiểm tra mật khẩu giả khi email không tồn tại để thời gian phản hồi
    // gần như giống nhau, tránh lộ email nào đã đăng ký.
    private static readonly string DummyPasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N"));

    private readonly ApplicationDbContext _db;
    private readonly IJwtTokenService _jwtService;
    private readonly ILoginAttemptTracker _attempts;
    private readonly JwtOptions _jwt;
    private readonly AuthOptions _auth;
    private readonly IGoogleIdTokenValidator _googleTokenValidator;
    private readonly IPasswordService _passwords;
    private readonly SmtpOptions _smtp;

    /// <summary>
    /// Khởi tạo instance mới của <see cref="AuthService"/>.
    /// </summary>
    /// <param name="db">Database context của ứng dụng.</param>
    /// <param name="jwtService">Dịch vụ cấp phát và ký số JWT Access Token.</param>
    /// <param name="attempts">Dịch vụ theo dõi và khóa tạm thời tài khoản khi đăng nhập thất bại liên tiếp.</param>
    /// <param name="googleTokenValidator">Dịch vụ xác thực tính hợp lệ của Google ID Token với máy chủ Google.</param>
    /// <param name="passwords">Dịch vụ quản lý mật khẩu và mã OTP qua email.</param>
    /// <param name="jwt">Cấu hình tham số JWT (thời hạn Access Token, Refresh Token).</param>
    /// <param name="auth">Cấu hình các quy tắc xác thực hệ thống.</param>
    /// <param name="smtp">Cấu hình máy chủ gửi email.</param>
    public AuthService(
        ApplicationDbContext db,
        IJwtTokenService jwtService,
        ILoginAttemptTracker attempts,
        IGoogleIdTokenValidator googleTokenValidator,
        IPasswordService passwords,
        IOptions<JwtOptions> jwt,
        IOptions<AuthOptions> auth,
        IOptions<SmtpOptions> smtp)
    {
        _db = db;
        _jwtService = jwtService;
        _attempts = attempts;
        _googleTokenValidator = googleTokenValidator;
        _passwords = passwords;
        _jwt = jwt.Value;
        _auth = auth.Value;
        _smtp = smtp.Value;
    }

    // ───────────────────────────── Đăng ký / đăng nhập ─────────────────────────────

    /// <summary>Có bắt xác minh email không — mặc định chỉ khi gửi được email thật (xem <see cref="AuthOptions.RequireEmailVerification"/>).</summary>
    private bool EmailVerificationRequired => _auth.RequireEmailVerification ?? _smtp.IsConfigured;

    /// <summary>Gửi (lại) mã xác minh email — tôn trọng thời gian chờ gửi lại; lỗi gửi mail chỉ ghi log.</summary>
    private Task SendEmailVerificationCodeAsync(string email) =>
        _passwords.ResendOtpAsync(new ResendOtpRequestDto { Email = email, Purpose = OtpPurposes.VerifyEmail });

    /// <summary>
    /// Đăng ký tài khoản người dùng mới bằng Email và Mật khẩu:
    /// - Kiểm tra tính duy nhất của địa chỉ Email (chống trùng lặp).
    /// - Mã hóa mật khẩu người dùng bằng giải thuật BCrypt.
    /// - Tự động phát hành bộ JWT tokens để người dùng tiếp tục luồng khảo sát sức khỏe.
    /// - Gửi mã OTP xác minh địa chỉ email nếu hệ thống yêu cầu xác thực email.
    /// </summary>
    /// <param name="dto">Thông tin đăng ký của người dùng.</param>
    /// <returns>Đối tượng <see cref="AuthResponseDto"/> chứa Access Token, Refresh Token và thông tin User.</returns>
    public async Task<ApiResponse<AuthResponseDto>> RegisterAsync(RegisterRequestDto dto)
    {
        var email = NormalizeEmail(dto.Email);
        if (await _db.Users.AnyAsync(u => u.Email.ToLower() == email))
        {
            return ApiResponse<AuthResponseDto>.Fail("Email đã được sử dụng.");
        }

        var requiresVerification = EmailVerificationRequired;
        var user = new User
        {
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            FullName = dto.FullName.Trim(),
            Role = "User",
            // Chỉ đăng ký bằng mật khẩu chưa chứng minh được người đăng ký sở hữu email này. Cờ được bật khi xác minh OTP
            // (verify-email/reset-password); đăng nhập Google chỉ liên kết vào tài khoản đã xác minh để không ai "đăng ký
            // trước" bằng email của người khác rồi chiếm tài khoản khi chủ thật đăng nhập Google.
            IsEmailVerified = false
        };

        _db.Users.Add(user);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            return ApiResponse<AuthResponseDto>.Fail("Email đã được sử dụng.");
        }

        // Vẫn cấp phiên để app đi tiếp sang màn nhập mã (rồi Health Profile); chưa xác minh thì lần đăng nhập/gia hạn
        // phiên sau bị từ chối nên không thể bỏ qua bước này.
        var response = await IssueTokensAsync(user, hasCompletedSurvey: false);
        if (!requiresVerification)
        {
            return ApiResponse<AuthResponseDto>.Ok(response, "Đăng ký tài khoản thành công.");
        }

        await SendEmailVerificationCodeAsync(email);
        response.RequiresEmailVerification = true;
        return ApiResponse<AuthResponseDto>.Ok(response, $"Đăng ký thành công. Mã xác thực đã được gửi tới {email}.");
    }

    /// <summary>
    /// Đăng nhập hệ thống bằng Email và Mật khẩu:
    /// - Bảo vệ chống rò rỉ thời gian (Timing Attack): Chạy hàm kiểm tra mật khẩu giả lập Dummy hash khi email không tồn tại.
    /// - Kiểm tra trạng thái khóa tạm thời (Lockout) nếu tài khoản đã nhập sai quá số lần cho phép.
    /// - Xác thực tính chính xác của mật khẩu bằng BCrypt Verify.
    /// - Kiểm tra trạng thái xác thực email (nếu hệ thống yêu cầu).
    /// - Cấp mới bộ JWT tokens và xóa bỏ các lần thử sai trước đó khi đăng nhập thành công.
    /// </summary>
    /// <param name="dto">Dữ liệu đăng nhập gồm Email và Mật khẩu.</param>
    /// <returns>Đối tượng <see cref="AuthResponseDto"/> chứa Access Token và thông tin User.</returns>
    public async Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginRequestDto dto)
    {
        var email = NormalizeEmail(dto.Email);
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email);
        var now = DateTime.UtcNow;

        if (user is null || string.IsNullOrEmpty(user.PasswordHash))
        {
            BCrypt.Net.BCrypt.Verify(dto.Password, DummyPasswordHash);
            return ApiResponse<AuthResponseDto>.Fail(InvalidCredentialsMessage, null, ApiErrorKind.Unauthorized);
        }

        // Đang bị khóa: không kiểm mật khẩu (kể cả đúng) để không giúp kẻ dò mật khẩu.
        if (_attempts.RemainingLockout(user, now) is { } remaining)
        {
            return LockedResponse(remaining);
        }

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            if (await _attempts.RegisterFailureAsync(user, now) is { } lockedUntil)
            {
                return LockedResponse(lockedUntil - now);
            }

            return ApiResponse<AuthResponseDto>.Fail(InvalidCredentialsMessage, null, ApiErrorKind.Unauthorized);
        }

        await _attempts.ResetAsync(user);

        // Chỉ báo sau khi mật khẩu đúng (không giúp dò tài khoản); gửi mã mới để người dùng xác minh rồi đăng nhập lại.
        if (EmailVerificationRequired && !user.IsEmailVerified)
        {
            await SendEmailVerificationCodeAsync(user.Email);
            return ApiResponse<AuthResponseDto>.Fail(EmailNotVerifiedMessage, new List<string> { EmailNotVerifiedCode }, ApiErrorKind.Forbidden);
        }

        var hasSurvey = await _db.HealthProfiles.AnyAsync(hp => hp.UserId == user.Id);
        return ApiResponse<AuthResponseDto>.Ok(await IssueTokensAsync(user, hasSurvey), "Đăng nhập thành công.");
    }

    /// <summary>
    /// Đăng nhập hoặc tự động tạo tài khoản thông qua Google SSO:
    /// - Gọi dịch vụ Google Token Validator để kiểm tra chữ ký và tính hợp lệ của IdToken từ Google.
    /// - Tự động liên kết tài khoản nếu email đã tồn tại và đã xác minh, hoặc tạo tài khoản mới nếu chưa có.
    /// - Cấp phát bộ JWT tokens đăng nhập ngay lập tức.
    /// </summary>
    /// <param name="dto">Dữ liệu chứa chuỗi Google IdToken nhận từ client SDK.</param>
    /// <returns>Đối tượng <see cref="AuthResponseDto"/> chứa Access Token và thông tin tài khoản.</returns>
    public async Task<ApiResponse<AuthResponseDto>> GoogleLoginAsync(GoogleAuthRequestDto dto)
    {
        GoogleIdentity identity;
        try
        {
            identity = await _googleTokenValidator.ValidateAsync(dto.IdToken);
        }
        catch (GoogleAuthException ex)
        {
            var kind = ex.StatusCode switch
            {
                401 => ApiErrorKind.Unauthorized,
                503 => ApiErrorKind.Unavailable,
                _ => ApiErrorKind.BadRequest
            };
            return ApiResponse<AuthResponseDto>.Fail(ex.Message, null, kind);
        }

        var email = NormalizeEmail(identity.Email);
        var user = await _db.Users.FirstOrDefaultAsync(u => u.GoogleId == identity.Subject);
        if (user is null)
        {
            user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email);
            if (user is not null && !user.IsEmailVerified)
            {
                return ApiResponse<AuthResponseDto>.Fail(
                    "Email này đã được đăng ký bằng mật khẩu nhưng chưa được xác minh. Hãy đăng nhập bằng email và mật khẩu.",
                    null,
                    ApiErrorKind.Conflict);
            }

            if (user is null)
            {
                user = new User
                {
                    Email = email,
                    FullName = identity.FullName.Trim(),
                    AvatarUrl = identity.AvatarUrl,
                    GoogleId = identity.Subject,
                    IsEmailVerified = true,
                    PasswordHash = null,
                    Role = "User"
                };
                _db.Users.Add(user);
            }
            else
            {
                // Liên kết tài khoản theo email đã được Google xác minh.
                user.GoogleId = identity.Subject;
                if (string.IsNullOrWhiteSpace(user.AvatarUrl) && !string.IsNullOrWhiteSpace(identity.AvatarUrl))
                    user.AvatarUrl = identity.AvatarUrl;
                user.UpdatedAt = DateTime.UtcNow;
            }

            try
            {
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (IsUniqueViolation(ex))
            {
                return ApiResponse<AuthResponseDto>.Fail("Tài khoản Google hoặc email đã được liên kết với tài khoản khác.", null, ApiErrorKind.Conflict);
            }
        }

        var hasSurvey = await _db.HealthProfiles.AnyAsync(hp => hp.UserId == user.Id);
        return ApiResponse<AuthResponseDto>.Ok(await IssueTokensAsync(user, hasSurvey), "Đăng nhập Google thành công.");
    }

    // ───────────────────────────── Phiên: refresh / đăng xuất ─────────────────────────────

    /// <summary>
    /// Làm mới phiên đăng nhập (Refresh Token):
    /// - Tìm và xác thực Refresh Token trong cơ sở dữ liệu bằng mã băm SHA-256.
    /// - Áp dụng cơ chế Refresh Token Rotation: Thu hồi token hiện tại ngay khi sử dụng.
    /// - Phát hiện tái sử dụng trái phép (Token Reuse Detection): Nếu token đã bị thu hồi từ trước bị gửi lại sau khoảng ân hạn,
    ///   hệ thống lập tức thu hồi toàn bộ các Refresh Token của người dùng để bảo vệ tài khoản khỏi bị chiếm đoạt.
    /// - Cấp mới cặp Access Token và Refresh Token cho phiên tiếp theo.
    /// </summary>
    /// <param name="dto">Dữ liệu chứa chuỗi Refresh Token hiện tại.</param>
    /// <returns>Cặp Access Token và Refresh Token mới.</returns>
    public async Task<ApiResponse<AuthResponseDto>> RefreshAsync(RefreshTokenRequestDto dto)
    {
        var now = DateTime.UtcNow;
        var hash = HashToken(dto.RefreshToken);
        var token = await _db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash);

        if (token is null)
        {
            return ApiResponse<AuthResponseDto>.Fail(InvalidSessionMessage, null, ApiErrorKind.Unauthorized);
        }

        if (token.RevokedAt is { } revokedAt)
        {
            // Token đã dùng rồi bị dùng lại. Nếu vừa mới bị thu hồi (hai request gọi trùng song song) thì chỉ từ chối;
            // nếu đã lâu thì coi như bị đánh cắp và thu hồi mọi phiên của người dùng.
            if ((now - revokedAt).TotalSeconds > _auth.RefreshReuseGraceSeconds)
            {
                await _db.RefreshTokens
                    .Where(t => t.UserId == token.UserId && t.RevokedAt == null)
                    .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, now));
            }

            return ApiResponse<AuthResponseDto>.Fail(InvalidSessionMessage, null, ApiErrorKind.Unauthorized);
        }

        if (token.ExpiresAt <= now)
        {
            return ApiResponse<AuthResponseDto>.Fail("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.", null, ApiErrorKind.Unauthorized);
        }

        // Thu hồi nguyên tử: trong các request gọi trùng cùng một token, chỉ một request thành công.
        var revoked = await _db.RefreshTokens
            .Where(t => t.Id == token.Id && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, now));
        if (revoked == 0)
        {
            return ApiResponse<AuthResponseDto>.Fail(InvalidSessionMessage, null, ApiErrorKind.Unauthorized);
        }

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == token.UserId);
        if (user is null)
        {
            return ApiResponse<AuthResponseDto>.Fail(InvalidSessionMessage, null, ApiErrorKind.Unauthorized);
        }

        // Phiên cấp lúc đăng ký mà chưa nhập mã xác minh: không gia hạn, người dùng phải đăng nhập lại để nhận mã.
        if (EmailVerificationRequired && !user.IsEmailVerified)
        {
            return ApiResponse<AuthResponseDto>.Fail(
                "Email chưa được xác minh, vui lòng đăng nhập lại để nhận mã xác thực.",
                new List<string> { EmailNotVerifiedCode },
                ApiErrorKind.Unauthorized);
        }

        var hasSurvey = await _db.HealthProfiles.AnyAsync(hp => hp.UserId == user.Id);
        var response = await IssueTokensAsync(user, hasSurvey, replaced: token);
        return ApiResponse<AuthResponseDto>.Ok(response, "Gia hạn phiên đăng nhập thành công.");
    }

    /// <summary>
    /// Đăng xuất tài khoản người dùng:
    /// Thu hồi Refresh Token tương ứng để vô hiệu hóa phiên làm việc của thiết bị hiện tại. Thao tác mang tính idempotent.
    /// </summary>
    /// <param name="refreshToken">Chuỗi Refresh Token cần thu hồi.</param>
    /// <returns>True nếu đăng xuất thành công.</returns>
    public async Task<ApiResponse<bool>> LogoutAsync(string? refreshToken)
    {
        // Idempotent: token không có hoặc không tồn tại vẫn coi như đã đăng xuất.
        if (!string.IsNullOrWhiteSpace(refreshToken))
        {
            var hash = HashToken(refreshToken);
            var now = DateTime.UtcNow;
            await _db.RefreshTokens
                .Where(t => t.TokenHash == hash && t.RevokedAt == null)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, now));
        }

        return ApiResponse<bool>.Ok(true, "Đã đăng xuất.");
    }

    // ───────────────────────────── Hồ sơ tài khoản ─────────────────────────────

    /// <summary>
    /// Lấy thông tin tài khoản chi tiết của người dùng theo UserId:
    /// Bao gồm họ tên, email, avatar, trạng thái gói cước Pro và cờ kiểm tra đã hoàn thành khảo sát sức khỏe chưa.
    /// </summary>
    /// <param name="userId">Mã định danh duy nhất của người dùng.</param>
    /// <returns>Đối tượng <see cref="UserDto"/> chứa thông tin tài khoản.</returns>
    public async Task<ApiResponse<UserDto>> GetCurrentUserAsync(Guid userId)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return ApiResponse<UserDto>.Fail("Người dùng không tồn tại.", null, ApiErrorKind.NotFound);

        var hasSurvey = await _db.HealthProfiles.AnyAsync(hp => hp.UserId == userId);
        return ApiResponse<UserDto>.Ok(ToUserDto(user, hasSurvey));
    }

    /// <summary>
    /// Cập nhật thông tin hồ sơ người dùng (Họ tên, đường dẫn URL ảnh đại diện):
    /// Kiểm tra tính hợp lệ của định dạng URL ảnh đại diện trước khi lưu vào cơ sở dữ liệu.
    /// </summary>
    /// <param name="userId">Mã định danh duy nhất của người dùng.</param>
    /// <param name="dto">Dữ liệu cập nhật hồ sơ.</param>
    /// <returns>Hồ sơ người dùng sau khi đã cập nhật.</returns>
    public async Task<ApiResponse<UserDto>> UpdateProfileAsync(Guid userId, UpdateProfileRequestDto dto)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return ApiResponse<UserDto>.Fail("Người dùng không tồn tại.", null, ApiErrorKind.NotFound);

        if (!string.IsNullOrWhiteSpace(dto.FullName))
        {
            user.FullName = dto.FullName.Trim();
        }

        if (dto.AvatarUrl != null)
        {
            var avatar = dto.AvatarUrl.Trim();
            if (avatar.Length == 0)
            {
                user.AvatarUrl = null;
            }
            else if (Uri.TryCreate(avatar, UriKind.Absolute, out var uri) && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
            {
                user.AvatarUrl = avatar;
            }
            else
            {
                return ApiResponse<UserDto>.Fail("avatarUrl phải là đường dẫn http/https hợp lệ.");
            }
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var hasSurvey = await _db.HealthProfiles.AnyAsync(hp => hp.UserId == userId);
        return ApiResponse<UserDto>.Ok(ToUserDto(user, hasSurvey), "Cập nhật thông tin tài khoản thành công.");
    }

    /// <summary>
    /// Đổi mật khẩu tài khoản khi người dùng đã đăng nhập:
    /// - Kiểm tra tính chính xác của mật khẩu hiện tại bằng BCrypt.
    /// - Tích hợp bộ đếm thử sai mật khẩu: khóa tạm thời nếu nhập sai mật khẩu cũ liên tiếp quá số lần quy định.
    /// - Đặt lại mật khẩu mới, thu hồi toàn bộ phiên đăng nhập cũ trên mọi thiết bị và cấp mới token cho phiên hiện tại.
    /// </summary>
    /// <param name="userId">Mã định danh duy nhất của người dùng.</param>
    /// <param name="dto">Dữ liệu mật khẩu hiện tại và mật khẩu mới.</param>
    /// <returns>Bộ JWT tokens mới cập nhật cho phiên làm việc hiện tại.</returns>
    public async Task<ApiResponse<AuthResponseDto>> ChangePasswordAsync(Guid userId, ChangePasswordRequestDto dto)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null)
        {
            return ApiResponse<AuthResponseDto>.Fail("Người dùng không tồn tại.", null, ApiErrorKind.NotFound);
        }

        if (string.IsNullOrEmpty(user.PasswordHash))
        {
            return ApiResponse<AuthResponseDto>.Fail("Tài khoản chưa có mật khẩu. Hãy dùng \"Quên mật khẩu\" để tạo mật khẩu.");
        }

        var now = DateTime.UtcNow;
        if (_attempts.RemainingLockout(user, now) is { } remaining)
        {
            return LockedResponse(remaining);
        }

        // Dùng chung bộ đếm sai mật khẩu: kẻ cầm access token bị đánh cắp không thể dò mật khẩu hiện tại.
        // Trả 400 (không phải 401) vì đây là lỗi nhập liệu, không phải phiên hết hạn.
        if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
        {
            if (await _attempts.RegisterFailureAsync(user, now) is { } lockedUntil)
            {
                return LockedResponse(lockedUntil - now);
            }

            return ApiResponse<AuthResponseDto>.Fail("Mật khẩu hiện tại không đúng.");
        }

        if (dto.NewPassword == dto.CurrentPassword)
        {
            return ApiResponse<AuthResponseDto>.Fail("Mật khẩu mới phải khác mật khẩu hiện tại.");
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        user.FailedLoginCount = 0;
        user.LockoutEnd = null;
        user.UpdatedAt = now;
        await _db.SaveChangesAsync();

        // Đổi mật khẩu → mọi phiên cũ (kể cả của thiết bị khác) bị đăng xuất; phiên hiện tại nhận token mới.
        await _db.RefreshTokens
            .Where(t => t.UserId == user.Id && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, now));

        var hasSurvey = await _db.HealthProfiles.AnyAsync(hp => hp.UserId == user.Id);
        return ApiResponse<AuthResponseDto>.Ok(await IssueTokensAsync(user, hasSurvey), "Đổi mật khẩu thành công.");
    }

    // ───────────────────────────── Nội bộ ─────────────────────────────

    /// <summary>Chuẩn hóa địa chỉ email về chữ thường và xóa khoảng trắng thừa.</summary>
    private static string NormalizeEmail(string email) => (email ?? string.Empty).Trim().ToLowerInvariant();

    /// <summary>Kiểm tra xem ngoại lệ DbUpdateException có phải do trùng khóa duy nhất (Unique Violation) trong Postgres hay không.</summary>
    private static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };

    /// <summary>Sinh phản hồi thông báo tài khoản bị khóa tạm thời kèm thời gian chờ mở khóa.</summary>
    private static ApiResponse<AuthResponseDto> LockedResponse(TimeSpan remaining)
    {
        // (dùng chung cho đăng nhập và đổi mật khẩu)
        var minutes = Math.Max(1, (int)Math.Ceiling(remaining.TotalMinutes));
        return ApiResponse<AuthResponseDto>.Fail(
            $"Tài khoản tạm thời bị khóa do nhập sai mật khẩu quá nhiều lần. Vui lòng thử lại sau {minutes} phút hoặc dùng \"Quên mật khẩu\".",
            null,
            ApiErrorKind.Locked);
    }

    /// <summary>Chuyển đổi thực thể User sang DTO UserDto.</summary>
    private static UserDto ToUserDto(User user, bool hasCompletedSurvey) => UserMapper.ToDto(user, hasCompletedSurvey);

    /// <summary>Phát hành cặp access + refresh token mới; nếu thay thế một refresh token cũ thì ghi nhận liên kết xoay vòng.</summary>
    private async Task<AuthResponseDto> IssueTokensAsync(User user, bool hasCompletedSurvey, RefreshToken? replaced = null)
    {
        var access = _jwtService.CreateAccessToken(user);

        var rawRefresh = NewRawToken();
        var refresh = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = HashToken(rawRefresh),
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(_jwt.RefreshTokenDays)
        };

        _db.RefreshTokens.Add(refresh);
        if (replaced is not null)
        {
            replaced.ReplacedByTokenId = refresh.Id;
        }

        await _db.SaveChangesAsync();

        return new AuthResponseDto
        {
            Token = access.Value,
            ExpiresAt = access.ExpiresAtUtc,
            RefreshToken = rawRefresh,
            RefreshTokenExpiresAt = refresh.ExpiresAt,
            User = ToUserDto(user, hasCompletedSurvey)
        };
    }

    /// <summary>Chuỗi ngẫu nhiên 48 byte, mã hóa base64url (an toàn khi đặt trong JSON/URL).</summary>
    private static string NewRawToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(48)).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    /// <summary>Băm chuỗi token ngẫu nhiên bằng thuật toán SHA-256 trước khi lưu vào CSDL.</summary>
    internal static string HashToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
