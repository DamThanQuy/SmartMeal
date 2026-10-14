using Microsoft.EntityFrameworkCore;
using Npgsql;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Auth;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _db;
    private readonly IJwtTokenService _jwtService;
    private readonly IGoogleIdTokenValidator _googleTokenValidator;

    public AuthService(ApplicationDbContext db, IJwtTokenService jwtService, IGoogleIdTokenValidator googleTokenValidator)
    {
        _db = db;
        _jwtService = jwtService;
        _googleTokenValidator = googleTokenValidator;
    }

    public async Task<ApiResponse<AuthResponseDto>> RegisterAsync(RegisterRequestDto dto)
    {
        if (await _db.Users.AnyAsync(u => u.Email.ToLower() == dto.Email.ToLower()))
        {
            return ApiResponse<AuthResponseDto>.Fail("Email đã được sử dụng.");
        }

        var user = new User
        {
            Email = dto.Email.Trim().ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            FullName = dto.FullName.Trim(),
            Role = "User",
            IsEmailVerified = true
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var token = _jwtService.GenerateToken(user);

        var response = new AuthResponseDto
        {
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                AvatarUrl = user.AvatarUrl,
                IsPro = user.IsPro,
                Role = user.Role,
                HasCompletedSurvey = false
            }
        };

        return ApiResponse<AuthResponseDto>.Ok(response, "Đăng ký tài khoản thành công.");
    }

    public async Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginRequestDto dto)
    {
        var user = await _db.Users
            .Include(u => u.HealthProfile)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == dto.Email.ToLower());

        if (user == null || string.IsNullOrEmpty(user.PasswordHash) || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            return ApiResponse<AuthResponseDto>.Fail("Email hoặc mật khẩu không chính xác.");
        }

        var token = _jwtService.GenerateToken(user);

        var response = new AuthResponseDto
        {
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                AvatarUrl = user.AvatarUrl,
                IsPro = user.IsPro,
                Role = user.Role,
                HasCompletedSurvey = user.HealthProfile != null
            }
        };

        return ApiResponse<AuthResponseDto>.Ok(response, "Đăng nhập thành công.");
    }

    public async Task<ApiResponse<AuthResponseDto>> GoogleLoginAsync(GoogleAuthRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.IdToken))
            throw new GoogleAuthException(400, "Google ID token là bắt buộc.");

        var identity = await _googleTokenValidator.ValidateAsync(dto.IdToken);
        if (!identity.EmailVerified)
            throw new GoogleAuthException(401, "Google email chưa được xác minh.");

        var normalizedEmail = identity.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.Include(u => u.HealthProfile)
            .FirstOrDefaultAsync(u => u.GoogleId == identity.Subject);

        if (user is not null)
        {
            // Never silently transfer an existing account to a different email owner.
            var emailOwner = await _db.Users.AnyAsync(u => u.Email == normalizedEmail && u.Id != user.Id);
            if (emailOwner)
                throw new GoogleAuthException(409, "Email Google đã được sử dụng bởi một tài khoản khác.");

            user.Email = normalizedEmail;
            if (!string.IsNullOrWhiteSpace(identity.FullName)) user.FullName = identity.FullName.Trim();
            if (!string.IsNullOrWhiteSpace(identity.AvatarUrl)) user.AvatarUrl = identity.AvatarUrl;
            user.IsEmailVerified = true;
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }
        else
        {
            // An existing password account must use an explicit authenticated linking flow.
            var emailOwner = await _db.Users.AnyAsync(u => u.Email == normalizedEmail);
            if (emailOwner)
                throw new GoogleAuthException(409, "Email đã có tài khoản. Hãy đăng nhập bằng phương thức hiện tại trước khi liên kết Google.");

            user = new User
            {
                Email = normalizedEmail,
                FullName = string.IsNullOrWhiteSpace(identity.FullName) ? normalizedEmail : identity.FullName.Trim(),
                AvatarUrl = identity.AvatarUrl,
                GoogleId = identity.Subject,
                IsEmailVerified = true,
                Role = "User"
            };
            _db.Users.Add(user);
            try
            {
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
            {
                // Covers simultaneous first sign-ins for the same Google subject/email.
                throw new GoogleAuthException(409, "Tài khoản Google vừa được tạo ở một yêu cầu khác. Vui lòng thử lại.", ex);
            }
        }

        await _db.Entry(user).Reference(u => u.HealthProfile).LoadAsync();

        var token = _jwtService.GenerateToken(user);

        var response = new AuthResponseDto
        {
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                AvatarUrl = user.AvatarUrl,
                IsPro = user.IsPro,
                Role = user.Role,
                HasCompletedSurvey = user.HealthProfile != null
            }
        };

        return ApiResponse<AuthResponseDto>.Ok(response, "Đăng nhập Google thành công.");
    }

    public async Task<ApiResponse<UserDto>> GetCurrentUserAsync(Guid userId)
    {
        var user = await _db.Users
            .Include(u => u.HealthProfile)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return ApiResponse<UserDto>.Fail("Người dùng không tồn tại.");

        var userDto = new UserDto
        {
            Id = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            AvatarUrl = user.AvatarUrl,
            IsPro = user.IsPro,
            Role = user.Role,
            HasCompletedSurvey = user.HealthProfile != null
        };

        return ApiResponse<UserDto>.Ok(userDto);
    }

    public async Task<ApiResponse<UserDto>> UpdateProfileAsync(Guid userId, UpdateProfileRequestDto dto)
    {
        var user = await _db.Users
            .Include(u => u.HealthProfile)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return ApiResponse<UserDto>.Fail("Người dùng không tồn tại.");

        if (!string.IsNullOrWhiteSpace(dto.FullName))
        {
            user.FullName = dto.FullName.Trim();
        }

        if (dto.AvatarUrl != null)
        {
            user.AvatarUrl = dto.AvatarUrl;
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var userDto = new UserDto
        {
            Id = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            AvatarUrl = user.AvatarUrl,
            IsPro = user.IsPro,
            Role = user.Role,
            HasCompletedSurvey = user.HealthProfile != null
        };

        return ApiResponse<UserDto>.Ok(userDto, "Cập nhật thông tin tài khoản thành công.");
    }
}
