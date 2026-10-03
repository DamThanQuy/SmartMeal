namespace SmartMeal.Infrastructure.Options;

/// <summary>Cấu hình thanh toán gói Pro (mục "Subscription").</summary>
public sealed class SubscriptionOptions
{
    public const string SectionName = "Subscription";

    /// <summary>
    /// Cho phép endpoint <c>activate-mock</c> tự nâng cấp Pro không cần thanh toán. Để trống = chỉ bật ở môi trường
    /// Development; môi trường thật phải để tắt (BR-241/242: chỉ tin xác nhận từ cổng thanh toán qua webhook).
    /// </summary>
    public bool? AllowMockActivation { get; set; }

    /// <summary>
    /// Khóa bí mật dùng chung với cổng thanh toán để ký webhook (HMAC-SHA256 hex của body, header X-Signature).
    /// Để trống thì webhook bị tắt. Chỉ đặt qua biến môi trường Subscription__WebhookSecret.
    /// </summary>
    public string? WebhookSecret { get; set; }
}
