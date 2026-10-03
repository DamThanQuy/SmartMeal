using System.ComponentModel.DataAnnotations;

namespace SmartMeal.Infrastructure.Options;

/// <summary>
/// Cấu hình JWT — nguồn duy nhất cho khóa ký, issuer, audience và thời hạn token.
/// Giá trị bí mật (<see cref="Key"/>) chỉ được nạp từ biến môi trường / file .env / User Secrets,
/// KHÔNG đặt trong appsettings.json.
/// </summary>
public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    /// <summary>Khóa ký HMAC-SHA256, tối thiểu 32 ký tự (đặt qua biến môi trường <c>Jwt__Key</c>).</summary>
    [Required(ErrorMessage = "Thiếu cấu hình Jwt:Key — đặt biến môi trường Jwt__Key (hoặc file .env, xem .env.example).")]
    [MinLength(32, ErrorMessage = "Jwt:Key phải dài tối thiểu 32 ký tự.")]
    public string Key { get; set; } = string.Empty;

    [Required]
    public string Issuer { get; set; } = "SmartMealBackend";

    [Required]
    public string Audience { get; set; } = "SmartMealMobile";

    /// <summary>Thời hạn access token (phút). App dùng refresh token để gia hạn phiên.</summary>
    [Range(5, 60 * 24 * 30)]
    public int AccessTokenMinutes { get; set; } = 60;

    /// <summary>Thời hạn refresh token (ngày).</summary>
    [Range(1, 365)]
    public int RefreshTokenDays { get; set; } = 30;

    /// <summary>
    /// Giá trị mẫu từng được công khai trong README / docker-compose / .env.example. Từ chối khi chạy
    /// ngoài môi trường phát triển để không ai ký được token bằng khóa đã lộ.
    /// </summary>
    public bool LooksLikePublishedSampleKey() =>
        Key.StartsWith("SmartMeal_SuperSecret_Jwt", StringComparison.Ordinal) ||
        Key.StartsWith("CHANGE_ME", StringComparison.OrdinalIgnoreCase);
}
