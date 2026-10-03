using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using SmartMeal.API.Infrastructure;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Auth;
using SmartMeal.Application.Services;
using SmartMeal.Infrastructure.Options;

namespace SmartMeal.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IPasswordService _passwordService;
    private readonly IAccountService _accountService;

    public AuthController(IAuthService authService, IPasswordService passwordService, IAccountService accountService)
    {
        _authService = authService;
        _passwordService = passwordService;
        _accountService = accountService;
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

    /// <summary>Tải ảnh đại diện (multipart, trường <c>file</c>; JPG/PNG/WebP, tối đa 2 MB). Trả người dùng với <c>avatarUrl</c> mới.</summary>
    [Authorize]
    [HttpPost("avatar")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(4 * 1024 * 1024)] // chặn cứng ở máy chủ; giới hạn nghiệp vụ (2 MB) kiểm ở service
    public async Task<ActionResult<ApiResponse<UserDto>>> UploadAvatar(IFormFile? file, [FromServices] IOptions<StorageOptions> storage)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<UserDto>();

        if (file is null || file.Length == 0)
        {
            return BadRequest(ApiResponse<UserDto>.Fail("Vui lòng chọn một ảnh (trường multipart tên \"file\")."));
        }

        var baseUrl = !string.IsNullOrWhiteSpace(storage.Value.PublicBaseUrl)
            ? storage.Value.PublicBaseUrl!
            : $"{Request.Scheme}://{Request.Host}";

        await using var stream = file.OpenReadStream();
        return this.ToActionResult(await _accountService.UploadAvatarAsync(userId, stream, file.Length, baseUrl));
    }

    /// <summary>Xóa vĩnh viễn tài khoản và dữ liệu (BR-271). Cần <c>password</c> (hoặc <c>confirmEmail</c> với tài khoản Google).</summary>
    [Authorize]
    [HttpDelete("account")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteAccount([FromBody] DeleteAccountRequestDto? dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<bool>();

        return this.ToActionResult(await _accountService.DeleteAccountAsync(userId, dto ?? new DeleteAccountRequestDto()));
    }
}
