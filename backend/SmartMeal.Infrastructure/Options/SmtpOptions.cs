namespace SmartMeal.Infrastructure.Options;

/// <summary>
/// Cấu hình gửi email (mục "Smtp"). Chưa đủ <see cref="Host"/> và địa chỉ gửi thì không gửi email thật: ứng dụng chỉ
/// ghi log (và ở Development in cả nội dung chứa mã OTP để dev đăng nhập thử). Mật khẩu chỉ đặt qua biến môi trường.
/// Gmail: Host smtp.gmail.com, Port 587, User = địa chỉ Gmail, Password = App Password 16 ký tự (cần bật xác minh 2 bước).
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

    /// <summary>Địa chỉ gửi thực tế: <see cref="From"/>, để trống thì dùng <see cref="User"/> (Gmail chỉ cho gửi từ chính tài khoản).</summary>
    public string SenderAddress => string.IsNullOrWhiteSpace(From) ? User : From;

    /// <summary>Đủ thông tin để gửi email thật: có máy chủ và địa chỉ gửi.</summary>
    public bool IsConfigured => !string.IsNullOrWhiteSpace(Host) && !string.IsNullOrWhiteSpace(SenderAddress);
}
