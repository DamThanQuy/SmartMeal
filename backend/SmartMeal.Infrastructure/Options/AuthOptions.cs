using System.ComponentModel.DataAnnotations;

namespace SmartMeal.Infrastructure.Options;

/// <summary>Chính sách đăng nhập, khóa tài khoản và mã OTP (mục "Auth" trong cấu hình).</summary>
public sealed class AuthOptions
{
    public const string SectionName = "Auth";

    /// <summary>Số lần đăng nhập sai liên tiếp trước khi khóa tài khoản tạm thời.</summary>
    [Range(3, 50)]
    public int MaxFailedLoginAttempts { get; set; } = 5;

    /// <summary>Thời gian khóa (phút).</summary>
    [Range(1, 1440)]
    public int LockoutMinutes { get; set; } = 15;

    /// <summary>Refresh token vừa bị thu hồi trong khoảng này (giây) được coi là gọi trùng song song, không phải bị đánh cắp.</summary>
    [Range(0, 120)]
    public int RefreshReuseGraceSeconds { get; set; } = 10;

    /// <summary>Hiệu lực mã OTP (phút).</summary>
    [Range(1, 60)]
    public int OtpMinutes { get; set; } = 5;

    /// <summary>Số lần nhập sai mã OTP tối đa trước khi mã bị vô hiệu.</summary>
    [Range(1, 20)]
    public int OtpMaxAttempts { get; set; } = 5;

    /// <summary>Khoảng cách tối thiểu giữa hai lần gửi OTP cho cùng một email (giây).</summary>
    [Range(0, 3600)]
    public int OtpResendCooldownSeconds { get; set; } = 60;

    /// <summary>Hiệu lực của mã đặt lại mật khẩu sau khi xác minh OTP (phút).</summary>
    [Range(1, 120)]
    public int ResetTokenMinutes { get; set; } = 10;
}
