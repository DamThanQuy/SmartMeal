using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Auth;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Infrastructure.Services;
using System.Security.Claims;

namespace SmartMeal.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IJwtTokenService _jwtService;

    public AuthController(ApplicationDbContext db, IJwtTokenService jwtService)
    {
        _db = db;
        _jwtService = jwtService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> Register([FromBody] RegisterRequestDto dto)
    {
        if (await _db.Users.AnyAsync(u => u.Email.ToLower() == dto.Email.ToLower()))
        {
            return BadRequest(ApiResponse<AuthResponseDto>.Fail("Email đã được sử dụng."));
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

        return Ok(ApiResponse<AuthResponseDto>.Ok(response, "Đăng ký tài khoản thành công."));
    }

    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> Login([FromBody] LoginRequestDto dto)
    {
        var user = await _db.Users
            .Include(u => u.HealthProfile)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == dto.Email.ToLower());

        if (user == null || string.IsNullOrEmpty(user.PasswordHash) || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            return Unauthorized(ApiResponse<AuthResponseDto>.Fail("Email hoặc mật khẩu không chính xác."));
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

        return Ok(ApiResponse<AuthResponseDto>.Ok(response, "Đăng nhập thành công."));
    }

    [HttpPost("google")]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> GoogleLogin([FromBody] GoogleAuthRequestDto dto)
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

        return Ok(ApiResponse<AuthResponseDto>.Ok(response, "Đăng nhập Google thành công."));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<ApiResponse<UserDto>>> GetCurrentUser()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
        {
            return Unauthorized(ApiResponse<UserDto>.Fail("Không tìm thấy thông tin phiên đăng nhập."));
        }

        var user = await _db.Users
            .Include(u => u.HealthProfile)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return NotFound(ApiResponse<UserDto>.Fail("Người dùng không tồn tại."));

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

        return Ok(ApiResponse<UserDto>.Ok(userDto));
    }
}
