namespace SmartMeal.Infrastructure.Options;

/// <summary>
/// Cổng thanh toán PayOS (mục "PayOS"). Ba khóa lấy ở https://my.payos.vn (Kênh thanh toán → Thông tin tích hợp) và
/// chỉ đặt qua biến môi trường <c>PayOS__ClientId</c>, <c>PayOS__ApiKey</c>, <c>PayOS__ChecksumKey</c> — không commit.
/// Thiếu khóa nào thì phương thức PAYOS bị tắt (503).
/// </summary>
public sealed class PayOSOptions
{
    public const string SectionName = "PayOS";

    public string ClientId { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string ChecksumKey { get; set; } = string.Empty;

    /// <summary>Trang PayOS chuyển về sau khi thanh toán xong / khi người dùng hủy (deep link của app).</summary>
    public string ReturnUrl { get; set; } = "smartmeal://payment-success";
    public string CancelUrl { get; set; } = "smartmeal://payment-cancel";

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(ClientId) && !string.IsNullOrWhiteSpace(ApiKey) && !string.IsNullOrWhiteSpace(ChecksumKey);
}
