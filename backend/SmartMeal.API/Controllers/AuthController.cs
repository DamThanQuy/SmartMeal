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

/// <summary>
/// Controller xử lý toàn bộ các tác vụ xác thực, phân quyền và quản lý tài khoản người dùng:
/// Đăng ký, đăng nhập email/mật khẩu, làm mới token, quên/đặt lại/đổi mật khẩu qua OTP,
/// lấy và cập nhật hồ sơ cá nhân, tải ảnh đại diện đại diện và xóa tài khoản vĩnh viễn.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IPasswordService _passwordService;
    private readonly IAccountService _accountService;

    /// <summary>
    /// Khởi tạo instance mới của <see cref="AuthController"/>.
    /// </summary>
    /// <param name="authService">Dịch vụ xác thực danh tính người dùng và cấp phát JWT token.</param>
    /// <param name="passwordService">Dịch vụ quản lý chu kỳ sống mật khẩu, xác thực OTP và đặt lại mật khẩu.</param>
    /// <param name="accountService">Dịch vụ quản trị hồ sơ người dùng, lưu trữ ảnh đại diện và xóa tài khoản.</param>
    public AuthController(IAuthService authService, IPasswordService passwordService, IAccountService accountService)
    {
        _authService = authService;
        _passwordService = passwordService;
        _accountService = accountService;
    }

    /// <summary>
    /// Đăng ký tài khoản người dùng mới bằng Email và Mật khẩu.
    /// Kiểm tra định dạng email, độ an toàn mật khẩu và tính duy nhất của email trong hệ thống.
    /// Sau khi đăng ký thành công, hệ thống tự động cấp phát cặp Access Token &amp; Refresh Token.
    /// Áp dụng Rate Limiting để ngăn chặn spam tạo tài khoản.
    /// </summary>
    /// <param name="dto">Thông tin đăng ký gồm Họ tên, Email, Mật khẩu và Xác nhận mật khẩu.</param>
    /// <returns>Đối tượng <see cref="AuthResponseDto"/> chứa Access Token, Refresh Token và thông tin cơ bản của User.</returns>
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [HttpPost("register")]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> Register([FromBody] RegisterRequestDto dto) =>
        this.ToActionResult(await _authService.RegisterAsync(dto));

    /// <summary>
    /// Đăng nhập tài khoản bằng Email và Mật khẩu.
    /// Tích hợp cơ chế bảo vệ brute-force (LoginAttemptTracker):
    /// - Nhập sai mật khẩu liên tiếp quá số lần quy định sẽ bị khóa tài khoản tạm thời (HTTP 423 Locked).
    /// - Sai thông tin xác thực trả về lỗi 401 Unauthorized.
    /// - Đăng nhập thành công sẽ thu hồi lần thử sai cũ và cấp cặp JWT tokens mới.
    /// </summary>
    /// <param name="dto">Thông tin đăng nhập gồm Email và Mật khẩu.</param>
    /// <returns>Đối tượng <see cref="AuthResponseDto"/> chứa thông tin token và hồ sơ người dùng nếu thành công.</returns>
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> Login([FromBody] LoginRequestDto dto) =>
        this.ToActionResult(await _authService.LoginAsync(dto));

    /// <summary>
    /// Cấp mới cặp Access Token và Refresh Token khi Access Token hiện tại đã hết hạn.
    /// Áp dụng cơ chế Refresh Token Rotation (sử dụng 1 lần):
    /// Khi đổi token thành công, Refresh Token cũ sẽ bị vô hiệu hóa ngay lập tức.
    /// Trả về 401 Unauthorized nếu token không hợp lệ, đã bị thu hồi hoặc hết hạn.
    /// </summary>
    /// <param name="dto">Dữ liệu chứa Refresh Token hiện tại.</param>
    /// <returns>Cặp Access Token và Refresh Token mới.</returns>
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [HttpPost("refresh")]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> Refresh([FromBody] RefreshTokenRequestDto dto) =>
        this.ToActionResult(await _authService.RefreshAsync(dto));

    /// <summary>
    /// Đăng xuất khỏi hệ thống: Thu hồi (revoke) Refresh Token tương ứng để vô hiệu hóa phiên làm việc.
    /// Endpoint này không yêu cầu Access Token còn hạn để người dùng luôn có thể đăng xuất bất kỳ lúc nào.
    /// Luôn trả về HTTP 200 OK để đảm bảo trải nghiệm an toàn phía client.
    /// </summary>
    /// <param name="dto">Đối tượng chứa Refresh Token cần thu hồi (tùy chọn).</param>
    /// <returns>Giá trị boolean cho biết kết quả thu hồi phiên đăng nhập.</returns>
    [HttpPost("logout")]
    public async Task<ActionResult<ApiResponse<bool>>> Logout([FromBody] LogoutRequestDto? dto) =>
        this.ToActionResult(await _authService.LogoutAsync(dto?.RefreshToken));

    // ───────────── Quên / đặt lại / đổi mật khẩu (OTP qua email) ─────────────

    /// <summary>
    /// Yêu cầu gửi mã OTP đặt lại mật khẩu về hòm thư Email của người dùng.
    /// Nhằm bảo vệ quyền riêng tư và tránh lộ thông tin email đã tồn tại hay chưa,
    /// endpoint luôn trả về HTTP 200 OK ngay cả khi email không tồn tại trong hệ thống.
    /// </summary>
    /// <param name="dto">Địa chỉ Email của tài khoản cần đặt lại mật khẩu.</param>
    /// <returns>Kết quả phản hồi tiêu chuẩn cho biết yêu cầu đã được tiếp nhận.</returns>
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [HttpPost("forgot-password")]
    public async Task<ActionResult<ApiResponse<bool>>> ForgotPassword([FromBody] ForgotPasswordRequestDto dto) =>
        this.ToActionResult(await _passwordService.ForgotPasswordAsync(dto));

    /// <summary>
    /// Gửi lại mã xác minh OTP (hỗ trợ các mục đích: 'reset-password' hoặc 'verify-email').
    /// Kiểm soát khoảng thời gian chờ (cooldown) giữa 2 lần yêu cầu liên tiếp để chống lạm dụng gửi thư hàng loạt.
    /// </summary>
    /// <param name="dto">Thông tin gồm Email và mục đích yêu cầu cấp OTP.</param>
    /// <returns>True nếu gửi lại OTP thành công, ngược lại trả mã lỗi kèm thời gian cần chờ.</returns>
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [HttpPost("resend-otp")]
    public async Task<ActionResult<ApiResponse<bool>>> ResendOtp([FromBody] ResendOtpRequestDto dto) =>
        this.ToActionResult(await _passwordService.ResendOtpAsync(dto));

    /// <summary>
    /// Xác thực mã OTP 6 chữ số người dùng nhập vào.
    /// Nếu mã hợp lệ và dùng cho luồng đặt lại mật khẩu, hệ thống sinh ra một 'resetToken' sử dụng một lần
    /// để cấp quyền thực hiện bước đổi mật khẩu tiếp theo mà không cần mật khẩu cũ.
    /// </summary>
    /// <param name="dto">Dữ liệu gồm Email, mục đích và mã OTP 6 số.</param>
    /// <returns>Đối tượng <see cref="VerifyOtpResponseDto"/> chứa resetToken (nếu là luồng quên mật khẩu).</returns>
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [HttpPost("verify-otp")]
    public async Task<ActionResult<ApiResponse<VerifyOtpResponseDto>>> VerifyOtp([FromBody] VerifyOtpRequestDto dto) =>
        this.ToActionResult(await _passwordService.VerifyOtpAsync(dto));

    /// <summary>
    /// Đặt lại mật khẩu mới cho tài khoản dựa trên 'resetToken' đã được cấp từ bước xác minh OTP thành công.
    /// Sau khi đặt lại mật khẩu thành công, toàn bộ phiên đăng nhập cũ và resetToken đều bị thu hồi.
    /// </summary>
    /// <param name="dto">Dữ liệu gồm Email, resetToken hợp lệ và mật khẩu mới.</param>
    /// <returns>True nếu cập nhật mật khẩu thành công.</returns>
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [HttpPost("reset-password")]
    public async Task<ActionResult<ApiResponse<bool>>> ResetPassword([FromBody] ResetPasswordRequestDto dto) =>
        this.ToActionResult(await _passwordService.ResetPasswordAsync(dto));

    /// <summary>
    /// Thay đổi mật khẩu khi người dùng đã đăng nhập (cần Bearer Token).
    /// Kiểm tra tính chính xác của mật khẩu cũ trước khi áp dụng mật khẩu mới.
    /// Thu hồi tất cả các Refresh Token cũ trên các thiết bị khác và cấp mới bộ token cho phiên hiện tại.
    /// </summary>
    /// <param name="dto">Dữ liệu gồm Mật khẩu hiện tại, Mật khẩu mới và Xác nhận mật khẩu mới.</param>
    /// <returns>Bộ JWT tokens mới cập nhật cho phiên làm việc hiện tại.</returns>
    [Authorize]
    [HttpPost("change-password")]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> ChangePassword([FromBody] ChangePasswordRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<AuthResponseDto>();

        return this.ToActionResult(await _authService.ChangePasswordAsync(userId, dto));
    }

    /// <summary>
    /// Lấy thông tin chi tiết của người dùng hiện tại đang đăng nhập theo Bearer Token.
    /// Bao gồm thông tin tài khoản, trạng thái gói đăng ký (Free/Premium), vai trò (Role),
    /// và thông tin hồ sơ sức khỏe cơ bản.
    /// </summary>
    /// <returns>Đối tượng <see cref="UserDto"/> chứa thông tin chi tiết của người dùng.</returns>
    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<ApiResponse<UserDto>>> GetCurrentUser()
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<UserDto>();

        return this.ToActionResult(await _authService.GetCurrentUserAsync(userId));
    }

    /// <summary>
    /// Cập nhật thông tin hồ sơ cá nhân của người dùng hiện tại (Họ tên, Số điện thoại, Ngày sinh, Giới tính).
    /// Yêu cầu xác thực tài khoản qua Bearer Token.
    /// </summary>
    /// <param name="dto">Dữ liệu cập nhật hồ sơ người dùng.</param>
    /// <returns>Thông tin người dùng sau khi đã cập nhật thành công.</returns>
    [Authorize]
    [HttpPut("profile")]
    public async Task<ActionResult<ApiResponse<UserDto>>> UpdateProfile([FromBody] UpdateProfileRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<UserDto>();

        return this.ToActionResult(await _authService.UpdateProfileAsync(userId, dto));
    }

    /// <summary>
    /// Tải lên ảnh đại diện cá nhân của người dùng (hỗ trợ multipart/form-data với field 'file').
    /// Định dạng hỗ trợ: JPG, JPEG, PNG, WEBP với dung lượng tối đa 2MB.
    /// Máy chủ giới hạn kích thước request tối đa 4MB để ngăn chặn tấn công từ chối dịch vụ.
    /// Trả về đối tượng người dùng kèm theo đường dẫn URL công khai ảnh đại diện mới.
    /// </summary>
    /// <param name="file">Tệp ảnh tải lên từ thiết bị.</param>
    /// <param name="storage">Cấu hình lưu trữ tệp tin (StorageOptions) để lấy URL gốc của hệ thống.</param>
    /// <returns>Hồ sơ người dùng với trường avatarUrl đã được cập nhật đường dẫn mới.</returns>
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

        await using var stream = file.OpenReadStream();
        return this.ToActionResult(await _accountService.UploadAvatarAsync(userId, stream, file.Length, this.PublicBaseUrl(storage.Value)));
    }

    /// <summary>Xóa ảnh đại diện (app hiện chữ cái đầu của tên). Trả người dùng với <c>avatarUrl = null</c>.</summary>
    [Authorize]
    [HttpDelete("avatar")]
    public async Task<ActionResult<ApiResponse<UserDto>>> RemoveAvatar()
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<UserDto>();

        return this.ToActionResult(await _accountService.RemoveAvatarAsync(userId));
    }

    /// <summary>
    /// Xóa vĩnh viễn tài khoản người dùng và toàn bộ dữ liệu liên quan (Tuân thủ BR-271).
    /// Quy tắc xác nhận bảo mật:
    /// - Tài khoản thông thường: Bắt buộc cung cấp trường 'password' để xác thực quyền chủ sở hữu.
    /// - Tài khoản không có mật khẩu (tạo bằng đăng nhập Google trước đây): Bắt buộc cung cấp trường 'confirmEmail' khớp với email tài khoản.
    /// Sau khi xóa, toàn bộ dữ liệu nhật ký, thực đơn và phiên đăng nhập sẽ bị dọn dẹp triệt để.
    /// </summary>
    /// <param name="dto">Dữ liệu xác thực xóa tài khoản gồm mật khẩu hoặc email xác nhận.</param>
    /// <returns>True nếu xóa tài khoản thành công.</returns>
    [Authorize]
    [HttpDelete("account")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteAccount([FromBody] DeleteAccountRequestDto? dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<bool>();

        return this.ToActionResult(await _accountService.DeleteAccountAsync(userId, dto ?? new DeleteAccountRequestDto()));
    }
}
