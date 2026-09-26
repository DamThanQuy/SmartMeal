using Microsoft.EntityFrameworkCore;
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

    public AuthService(ApplicationDbContext db, IJwtTokenService jwtService)
    {
        _db = db;
        _jwtService = jwtService;
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
        var user = await _db.Users
            .Include(u => u.HealthProfile)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == dto.Email.ToLower());

        if (user == null)
        {
            user = new User
            {
                Email = dto.Email.Trim().ToLower(),
                FullName = dto.FullName.Trim(),
                AvatarUrl = dto.AvatarUrl,
                GoogleId = dto.GoogleId,
                IsEmailVerified = true,
                Role = "User"
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync();
        }
        else if (string.IsNullOrEmpty(user.GoogleId))
        {
            user.GoogleId = dto.GoogleId;
            if (string.IsNullOrEmpty(user.AvatarUrl)) user.AvatarUrl = dto.AvatarUrl;
            await _db.SaveChangesAsync();
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
