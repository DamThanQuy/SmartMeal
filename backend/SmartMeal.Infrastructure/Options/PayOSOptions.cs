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

    /// <summary>Scheme deep link của app mobile ("scheme" trong frontend/SmartMealMobile/app.json).</summary>
    public const string AppScheme = "smartmealmobile";

    /// <summary>
    /// Trang PayOS chuyển về sau khi thanh toán xong / khi người dùng hủy (deep link của app) — dùng khi app không gửi
    /// <c>returnUrl</c> riêng. PayOS tự gắn thêm <c>?status=...&amp;cancel=...</c> nên hai trường hợp dùng chung một đường dẫn.
    /// </summary>
    public string ReturnUrl { get; set; } = $"{AppScheme}://payment-result";
    public string CancelUrl { get; set; } = $"{AppScheme}://payment-result";

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(ClientId) && !string.IsNullOrWhiteSpace(ApiKey) && !string.IsNullOrWhiteSpace(ChecksumKey);
}
