using System.ComponentModel.DataAnnotations;
using SmartMeal.Application.Common.Validation;

namespace SmartMeal.Application.DTOs.Auth;

/// <summary>Mục đích của mã OTP.</summary>
public static class OtpPurposes
{
    public const string ResetPassword = "reset-password";
    public const string VerifyEmail = "verify-email";

    /// <summary>Nội bộ: mã đặt lại mật khẩu phát hành sau khi OTP "reset-password" đúng.</summary>
    public const string ResetToken = "reset-token";

    public static readonly string[] Public = { ResetPassword, VerifyEmail };

    public static string? Canonical(string? value)
    {
        var trimmed = value?.Trim();
        return Public.FirstOrDefault(p => string.Equals(p, trimmed, StringComparison.OrdinalIgnoreCase));
    }
}

public class ForgotPasswordRequestDto
{
    [Required(ErrorMessage = "Email là bắt buộc.")]
    [EmailAddress(ErrorMessage = "Email không đúng định dạng.")]
    public string Email { get; set; } = string.Empty;
}

public class ResendOtpRequestDto
{
    [Required(ErrorMessage = "Email là bắt buộc.")]
    [EmailAddress(ErrorMessage = "Email không đúng định dạng.")]
    public string Email { get; set; } = string.Empty;

    [OneOfIgnoreCase(OtpPurposes.ResetPassword, OtpPurposes.VerifyEmail)]
    public string Purpose { get; set; } = OtpPurposes.ResetPassword;
}

public class VerifyOtpRequestDto
{
    [Required(ErrorMessage = "Email là bắt buộc.")]
    [EmailAddress(ErrorMessage = "Email không đúng định dạng.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Mã xác thực là bắt buộc.")]
    [RegularExpression(@"^\d{6}$", ErrorMessage = "Mã xác thực gồm đúng 6 chữ số.")]
    public string Code { get; set; } = string.Empty;

    [OneOfIgnoreCase(OtpPurposes.ResetPassword, OtpPurposes.VerifyEmail)]
    public string Purpose { get; set; } = OtpPurposes.ResetPassword;
}

public class VerifyOtpResponseDto
{
    public bool Verified { get; set; }

    /// <summary>Chỉ có với purpose "reset-password": dùng một lần ở POST /auth/reset-password (hiệu lực ngắn).</summary>
    public string? ResetToken { get; set; }

    public DateTime? ResetTokenExpiresAt { get; set; }
}

public class ResetPasswordRequestDto
{
    [Required(ErrorMessage = "Email là bắt buộc.")]
    [EmailAddress(ErrorMessage = "Email không đúng định dạng.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "resetToken là bắt buộc.")]
    [StringLength(512, ErrorMessage = "resetToken không hợp lệ.")]
    public string ResetToken { get; set; } = string.Empty;

    [Required(ErrorMessage = "Mật khẩu mới là bắt buộc.")]
    [StringLength(128, MinimumLength = 8, ErrorMessage = "Mật khẩu phải từ 8 đến 128 ký tự.")]
    public string NewPassword { get; set; } = string.Empty;
}

public class ChangePasswordRequestDto
{
    [Required(ErrorMessage = "Mật khẩu hiện tại là bắt buộc.")]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = "Mật khẩu mới là bắt buộc.")]
    [StringLength(128, MinimumLength = 8, ErrorMessage = "Mật khẩu phải từ 8 đến 128 ký tự.")]
    public string NewPassword { get; set; } = string.Empty;
}
