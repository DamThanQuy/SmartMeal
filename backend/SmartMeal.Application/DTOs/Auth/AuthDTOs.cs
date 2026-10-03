using System.ComponentModel.DataAnnotations;

namespace SmartMeal.Application.DTOs.Auth;

public class RegisterRequestDto
{
    [Required(ErrorMessage = "Email là bắt buộc.")]
    [EmailAddress(ErrorMessage = "Email không đúng định dạng.")]
    [StringLength(254, ErrorMessage = "Email tối đa 254 ký tự.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Mật khẩu là bắt buộc.")]
    [StringLength(128, MinimumLength = 8, ErrorMessage = "Mật khẩu phải từ 8 đến 128 ký tự.")]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = "Họ tên là bắt buộc.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Họ tên phải từ 2 đến 100 ký tự.")]
    public string FullName { get; set; } = string.Empty;
}

public class LoginRequestDto
{
    [Required(ErrorMessage = "Email là bắt buộc.")]
    [EmailAddress(ErrorMessage = "Email không đúng định dạng.")]
    public string Email { get; set; } = string.Empty;

    // Không kiểm độ dài: mật khẩu sai/ngắn vẫn phải trả 401 "sai thông tin" thay vì 400.
    [Required(ErrorMessage = "Mật khẩu là bắt buộc.")]
    public string Password { get; set; } = string.Empty;
}

/// <summary>Đăng nhập Google: gửi Google ID token để server tự xác minh (không tin email/id do client gửi).</summary>
public class GoogleLoginRequestDto
{
    [Required(ErrorMessage = "idToken là bắt buộc.")]
    [StringLength(8192, ErrorMessage = "idToken quá dài.")]
    public string IdToken { get; set; } = string.Empty;
}

public class RefreshTokenRequestDto
{
    [Required(ErrorMessage = "refreshToken là bắt buộc.")]
    [StringLength(512, ErrorMessage = "refreshToken không hợp lệ.")]
    public string RefreshToken { get; set; } = string.Empty;
}

public class LogoutRequestDto
{
    [StringLength(512, ErrorMessage = "refreshToken không hợp lệ.")]
    public string? RefreshToken { get; set; }
}

public class AuthResponseDto
{
    /// <summary>Access token (JWT) — gửi trong header Authorization: Bearer.</summary>
    public string Token { get; set; } = string.Empty;

    /// <summary>Thời điểm access token hết hạn (UTC).</summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>Refresh token dùng một lần để lấy cặp token mới ở POST /auth/refresh.</summary>
    public string RefreshToken { get; set; } = string.Empty;

    public DateTime RefreshTokenExpiresAt { get; set; }

    public UserDto User { get; set; } = null!;
}

public class UserDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public bool IsPro { get; set; }
    public string Role { get; set; } = "User";
    public bool HasCompletedSurvey { get; set; }
}
