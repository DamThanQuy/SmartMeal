namespace SmartMeal.Infrastructure.Options;

/// <summary>
/// Cấu hình gửi email (mục "Smtp"). Để trống <see cref="Host"/> thì không gửi email thật: ứng dụng chỉ ghi log
/// (và ở Development in cả nội dung chứa mã OTP để dev đăng nhập thử). Mật khẩu chỉ đặt qua biến môi trường.
/// </summary>
public sealed class SmtpOptions
{
    public const string SectionName = "Smtp";

    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public bool EnableSsl { get; set; } = true;
    public string User { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;

    /// <summary>Địa chỉ người gửi, vd. no-reply@smartmeal.app.</summary>
    public string From { get; set; } = string.Empty;

    public string FromName { get; set; } = "SmartMeal";
}
