using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartMeal.API.Infrastructure;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Auth;
using SmartMeal.Application.Services;

namespace SmartMeal.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IPasswordService _passwordService;

    public AuthController(IAuthService authService, IPasswordService passwordService)
    {
        _authService = authService;
        _passwordService = passwordService;
    }

    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [HttpPost("register")]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> Register([FromBody] RegisterRequestDto dto) =>
        this.ToActionResult(await _authService.RegisterAsync(dto));

    /// <summary>Đăng nhập. Sai quá nhiều lần → 423 (khóa tạm thời); sai thông tin → 401.</summary>
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> Login([FromBody] LoginRequestDto dto) =>
        this.ToActionResult(await _authService.LoginAsync(dto));

    /// <summary>Đăng nhập Google bằng Google ID token (server tự xác minh chữ ký và audience).</summary>
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [HttpPost("google")]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> GoogleLogin([FromBody] GoogleLoginRequestDto dto) =>
        this.ToActionResult(await _authService.GoogleLoginAsync(dto));

    /// <summary>Đổi refresh token (dùng một lần) lấy cặp access + refresh token mới. 401 nếu token sai/đã dùng/hết hạn.</summary>
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [HttpPost("refresh")]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> Refresh([FromBody] RefreshTokenRequestDto dto) =>
        this.ToActionResult(await _authService.RefreshAsync(dto));

    /// <summary>Đăng xuất: thu hồi refresh token. Không cần access token (có thể đã hết hạn); luôn trả 200.</summary>
    [HttpPost("logout")]
    public async Task<ActionResult<ApiResponse<bool>>> Logout([FromBody] LogoutRequestDto? dto) =>
        this.ToActionResult(await _authService.LogoutAsync(dto?.RefreshToken));

    // ───────────── Quên / đặt lại / đổi mật khẩu (OTP qua email) ─────────────

    /// <summary>Gửi OTP đặt lại mật khẩu tới email. Luôn trả 200 (không lộ email nào đã đăng ký).</summary>
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [HttpPost("forgot-password")]
    public async Task<ActionResult<ApiResponse<bool>>> ForgotPassword([FromBody] ForgotPasswordRequestDto dto) =>
        this.ToActionResult(await _passwordService.ForgotPasswordAsync(dto));

    /// <summary>Gửi lại OTP (<c>reset-password</c> hoặc <c>verify-email</c>); có thời gian chờ giữa hai lần gửi.</summary>
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [HttpPost("resend-otp")]
    public async Task<ActionResult<ApiResponse<bool>>> ResendOtp([FromBody] ResendOtpRequestDto dto) =>
        this.ToActionResult(await _passwordService.ResendOtpAsync(dto));

    /// <summary>Xác minh OTP 6 số. Với <c>reset-password</c> trả <c>resetToken</c> dùng một lần cho bước đặt lại.</summary>
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [HttpPost("verify-otp")]
    public async Task<ActionResult<ApiResponse<VerifyOtpResponseDto>>> VerifyOtp([FromBody] VerifyOtpRequestDto dto) =>
        this.ToActionResult(await _passwordService.VerifyOtpAsync(dto));

    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [HttpPost("reset-password")]
    public async Task<ActionResult<ApiResponse<bool>>> ResetPassword([FromBody] ResetPasswordRequestDto dto) =>
        this.ToActionResult(await _passwordService.ResetPasswordAsync(dto));

    /// <summary>Đổi mật khẩu khi đã đăng nhập: thu hồi mọi phiên cũ và trả cặp token mới cho phiên hiện tại.</summary>
    [Authorize]
    [HttpPost("change-password")]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> ChangePassword([FromBody] ChangePasswordRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<AuthResponseDto>();

        return this.ToActionResult(await _authService.ChangePasswordAsync(userId, dto));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<ApiResponse<UserDto>>> GetCurrentUser()
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<UserDto>();

        return this.ToActionResult(await _authService.GetCurrentUserAsync(userId));
    }

    [Authorize]
    [HttpPut("profile")]
    public async Task<ActionResult<ApiResponse<UserDto>>> UpdateProfile([FromBody] UpdateProfileRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<UserDto>();

        return this.ToActionResult(await _authService.UpdateProfileAsync(userId, dto));
    }
}
