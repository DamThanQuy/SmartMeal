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
    private readonly IGoogleTokenVerifier _google;
    private readonly JwtOptions _jwt;
    private readonly AuthOptions _auth;

    public AuthService(
        ApplicationDbContext db,
        IJwtTokenService jwtService,
        IGoogleTokenVerifier google,
        IOptions<JwtOptions> jwt,
        IOptions<AuthOptions> auth)
    {
        _db = db;
        _jwtService = jwtService;
        _google = google;
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
            IsEmailVerified = true
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
        if (user.LockoutEnd is { } lockoutEnd && lockoutEnd > now)
        {
            return LockedResponse(lockoutEnd - now);
        }

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            user.FailedLoginCount++;
            if (user.FailedLoginCount >= _auth.MaxFailedLoginAttempts)
            {
                var until = now.AddMinutes(_auth.LockoutMinutes);
                user.FailedLoginCount = 0;
                user.LockoutEnd = until;
                await _db.SaveChangesAsync();
                return LockedResponse(until - now);
            }

            await _db.SaveChangesAsync();
            return ApiResponse<AuthResponseDto>.Fail(InvalidCredentialsMessage, null, ApiErrorKind.Unauthorized);
        }

        if (user.FailedLoginCount != 0 || user.LockoutEnd is not null)
        {
            user.FailedLoginCount = 0;
            user.LockoutEnd = null;
            await _db.SaveChangesAsync();
        }

        var hasSurvey = await _db.HealthProfiles.AnyAsync(hp => hp.UserId == user.Id);
        return ApiResponse<AuthResponseDto>.Ok(await IssueTokensAsync(user, hasSurvey), "Đăng nhập thành công.");
    }

    public async Task<ApiResponse<AuthResponseDto>> GoogleLoginAsync(GoogleLoginRequestDto dto)
    {
        if (!_google.IsConfigured)
        {
            return ApiResponse<AuthResponseDto>.Fail("Đăng nhập Google chưa được cấu hình trên máy chủ.", null, ApiErrorKind.Unavailable);
        }

        // Chỉ tin danh tính do Google xác nhận trong ID token, không tin email/id do client tự gửi.
        var identity = await _google.VerifyAsync(dto.IdToken);
        if (identity is null)
        {
            return ApiResponse<AuthResponseDto>.Fail("Google ID token không hợp lệ hoặc đã hết hạn.", null, ApiErrorKind.Unauthorized);
        }

        var email = NormalizeEmail(identity.Email);
        var user = await _db.Users.FirstOrDefaultAsync(u => u.GoogleId == identity.Subject);

        if (user is null)
        {
            if (string.IsNullOrWhiteSpace(email) || !identity.EmailVerified)
            {
                return ApiResponse<AuthResponseDto>.Fail("Email của tài khoản Google chưa được xác minh.", null, ApiErrorKind.Unauthorized);
            }

            user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email);
            if (user is null)
            {
                user = new User
                {
                    Email = email,
                    FullName = string.IsNullOrWhiteSpace(identity.Name) ? email.Split('@')[0] : identity.Name.Trim(),
                    AvatarUrl = identity.PictureUrl,
                    GoogleId = identity.Subject,
                    IsEmailVerified = true,
                    Role = "User"
                };
                _db.Users.Add(user);
            }
            else if (!string.IsNullOrEmpty(user.GoogleId))
            {
                // BR-012: một tài khoản SmartMeal chỉ liên kết với một tài khoản Google.
                return ApiResponse<AuthResponseDto>.Fail("Email này đã liên kết với một tài khoản Google khác.", null, ApiErrorKind.Conflict);
            }
            else
            {
                // Email đã có (đăng ký bằng mật khẩu) và Google xác nhận cùng email → liên kết (BR-011).
                user.GoogleId = identity.Subject;
                user.IsEmailVerified = true;
                if (string.IsNullOrEmpty(user.AvatarUrl)) user.AvatarUrl = identity.PictureUrl;
            }

            try
            {
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (IsUniqueViolation(ex))
            {
                return ApiResponse<AuthResponseDto>.Fail("Không thể liên kết tài khoản Google, vui lòng thử lại.", null, ApiErrorKind.Conflict);
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

    // ───────────────────────────── Nội bộ ─────────────────────────────

    private static string NormalizeEmail(string email) => (email ?? string.Empty).Trim().ToLowerInvariant();

    private static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };

    private static ApiResponse<AuthResponseDto> LockedResponse(TimeSpan remaining)
    {
        var minutes = Math.Max(1, (int)Math.Ceiling(remaining.TotalMinutes));
        return ApiResponse<AuthResponseDto>.Fail(
            $"Tài khoản tạm thời bị khóa do nhập sai mật khẩu quá nhiều lần. Vui lòng thử lại sau {minutes} phút hoặc dùng \"Quên mật khẩu\".",
            null,
            ApiErrorKind.Locked);
    }

    private static UserDto ToUserDto(User user, bool hasCompletedSurvey) => new()
    {
        Id = user.Id,
        Email = user.Email,
        FullName = user.FullName,
        AvatarUrl = user.AvatarUrl,
        IsPro = user.IsPro,
        Role = user.Role,
        HasCompletedSurvey = hasCompletedSurvey
    };

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
