namespace SmartMeal.Domain.Entities;

/// <summary>Trạng thái gói thành viên (BR-230/231).</summary>
public static class SubscriptionStatuses
{
    public const string Free = "Free";
    public const string Premium = "Premium";
    public const string Expired = "Expired";
    public const string Cancelled = "Cancelled";
}

public static class PaymentStatuses
{
    public const string Pending = "Pending";
    public const string Paid = "Paid";
    public const string Failed = "Failed";
}

/// <summary>
/// Giao dịch thanh toán. Khi người dùng xóa tài khoản, giao dịch được GIỮ LẠI và ẩn danh (UserId = null, chỉ còn
/// <see cref="UserRef"/> là bản băm không truy ngược được) theo BR-271.
/// </summary>
public class PaymentTransaction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? UserId { get; set; }
    public User? User { get; set; }

    /// <summary>Bản băm SHA-256 của id người dùng, giữ lại để đối soát sau khi tài khoản bị xóa.</summary>
    public string UserRef { get; set; } = string.Empty;

    public string PlanId { get; set; } = string.Empty;
    public decimal AmountVnd { get; set; }
    public string PaymentMethod { get; set; } = "VNPAY";
    public string Status { get; set; } = PaymentStatuses.Pending;

    /// <summary>Mã phiên thanh toán do hệ thống tạo; cổng thanh toán gửi lại mã này ở webhook.</summary>
    public string SessionId { get; set; } = string.Empty;

    public string? ProviderTransactionId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PaidAt { get; set; }
}

public static class UserSubscriptionExtensions
{
    /// <summary>Pro còn hiệu lực: đã kích hoạt và chưa hết hạn (không có hạn = vô thời hạn, dữ liệu cũ).</summary>
    public static bool IsProActive(this User user, DateTime now) =>
        user.IsPro && (user.ProExpiresAt is null || user.ProExpiresAt > now);

    /// <summary>Trạng thái hiệu lực tại thời điểm <paramref name="now"/> (tự chuyển sang Expired khi quá hạn).</summary>
    public static string EffectiveSubscriptionStatus(this User user, DateTime now)
    {
        if (user.IsProActive(now))
        {
            return user.SubscriptionStatus == SubscriptionStatuses.Cancelled ? SubscriptionStatuses.Cancelled : SubscriptionStatuses.Premium;
        }

        // Không còn hiệu lực: từng là Pro thì "Expired", chưa từng thì "Free".
        return user.IsPro || user.SubscriptionStatus != SubscriptionStatuses.Free
            ? SubscriptionStatuses.Expired
            : SubscriptionStatuses.Free;
    }
}
