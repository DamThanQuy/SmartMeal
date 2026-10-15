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

public class AuthService : IAuthService
{
    private const string InvalidCredentialsMessage = "Email hoặc mật khẩu không chính xác.";
    private const string InvalidSessionMessage = "Phiên đăng nhập không hợp lệ hoặc đã hết hạn, vui lòng đăng nhập lại.";

    // Băm của một chuỗi ngẫu nhiên: kiểm tra mật khẩu giả khi email không tồn tại để thời gian phản hồi
    // gần như giống nhau, tránh lộ email nào đã đăng ký.
    private static readonly string DummyPasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N"));

    private readonly ApplicationDbContext _db;
    private readonly IJwtTokenService _jwtService;
    private readonly ILoginAttemptTracker _attempts;
    private readonly JwtOptions _jwt;
    private readonly AuthOptions _auth;
    private readonly IGoogleIdTokenValidator _googleTokenValidator;

    public AuthService(
        ApplicationDbContext db,
        IJwtTokenService jwtService,
        ILoginAttemptTracker attempts,
        IGoogleIdTokenValidator googleTokenValidator,
        IOptions<JwtOptions> jwt,
        IOptions<AuthOptions> auth)
    {
        _db = db;
        _jwtService = jwtService;
        _attempts = attempts;
        _googleTokenValidator = googleTokenValidator;
        _jwt = jwt.Value;
        _auth = auth.Value;
    }

    // ───────────────────────────── Đăng ký / đăng nhập ─────────────────────────────

    public async Task<ApiResponse<AuthResponseDto>> RegisterAsync(RegisterRequestDto dto)
    {
        var email = NormalizeEmail(dto.Email);
        if (await _db.Users.AnyAsync(u => u.Email.ToLower() == email))
        {
            return ApiResponse<AuthResponseDto>.Fail("Email đã được sử dụng.");
        }

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

        return ApiResponse<AuthResponseDto>.Ok(await IssueTokensAsync(user, hasCompletedSurvey: false), "Đăng ký tài khoản thành công.");
    }

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

        var hasSurvey = await _db.HealthProfiles.AnyAsync(hp => hp.UserId == user.Id);
        return ApiResponse<AuthResponseDto>.Ok(await IssueTokensAsync(user, hasSurvey), "Đăng nhập thành công.");
    }

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

        var hasSurvey = await _db.HealthProfiles.AnyAsync(hp => hp.UserId == user.Id);
        var response = await IssueTokensAsync(user, hasSurvey, replaced: token);
        return ApiResponse<AuthResponseDto>.Ok(response, "Gia hạn phiên đăng nhập thành công.");
    }

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

    public async Task<ApiResponse<UserDto>> GetCurrentUserAsync(Guid userId)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return ApiResponse<UserDto>.Fail("Người dùng không tồn tại.", null, ApiErrorKind.NotFound);

        var hasSurvey = await _db.HealthProfiles.AnyAsync(hp => hp.UserId == userId);
        return ApiResponse<UserDto>.Ok(ToUserDto(user, hasSurvey));
    }

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

    private static string NormalizeEmail(string email) => (email ?? string.Empty).Trim().ToLowerInvariant();

    private static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };

    private static ApiResponse<AuthResponseDto> LockedResponse(TimeSpan remaining)
    {
        // (dùng chung cho đăng nhập và đổi mật khẩu)
        var minutes = Math.Max(1, (int)Math.Ceiling(remaining.TotalMinutes));
        return ApiResponse<AuthResponseDto>.Fail(
            $"Tài khoản tạm thời bị khóa do nhập sai mật khẩu quá nhiều lần. Vui lòng thử lại sau {minutes} phút hoặc dùng \"Quên mật khẩu\".",
            null,
            ApiErrorKind.Locked);
    }

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

    internal static string HashToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
