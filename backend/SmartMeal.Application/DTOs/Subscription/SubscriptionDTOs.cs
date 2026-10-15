using System.ComponentModel.DataAnnotations;
using SmartMeal.Application.Common.Validation;

namespace SmartMeal.Application.DTOs.Subscription;

/// <summary>Danh mục gói Pro (nguồn duy nhất cho giá, chu kỳ và thời hạn).</summary>
public static class SubscriptionCatalog
{
    public const string ProMonthly = "PRO_MONTHLY";
    public const string ProYearly = "PRO_YEARLY";

    /// <summary>PayOS: chuyển khoản VietQR qua cổng PayOS (thật). VNPAY/MOMO/STRIPE: chưa tích hợp cổng thật.</summary>
    public const string PayOS = "PAYOS";

    public static readonly string[] PaymentMethods = { "VNPAY", "MOMO", "STRIPE", PayOS };

    public sealed record Plan(string Id, string Name, decimal PriceVnd, string BillingCycle, int DurationDays, bool IsPopular, string[] Features);

    public static readonly IReadOnlyList<Plan> Plans = new[]
    {
        new Plan(ProMonthly, "Gói Tháng (Pro Monthly)", 79000, "Monthly", 30, false, new[]
        {
            "Quét tủ lạnh & gợi ý món ăn không giới hạn với Gemini AI",
            "Ghi chép bữa ăn bằng giọng nói & chụp ảnh AI Vision",
            "Tự động tạo thực đơn tuần cá nhân hóa theo TDEE",
            "Truy cập toàn bộ công thức Premium & Video hướng dẫn",
            "Tạo danh sách đi chợ thông minh tự động",
            "Đồng bộ Apple Health / Google Fit nâng cao"
        }),
        new Plan(ProYearly, "Gói Năm (Pro Yearly - Tiết kiệm 25%)", 699000, "Yearly", 365, true, new[]
        {
            "Toàn bộ đặc quyền của gói Pro Monthly",
            "Tiết kiệm 25% chi phí so với trả hàng tháng",
            "Mở khóa pet độc quyền & huy hiệu Pro VIP",
            "Hỗ trợ ưu tiên 24/7 từ chuyên gia dinh dưỡng"
        })
    };

    public static Plan? Find(string? planId) =>
        Plans.FirstOrDefault(p => string.Equals(p.Id, planId?.Trim(), StringComparison.OrdinalIgnoreCase));
}

public class SubscriptionPlanDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal PriceVnd { get; set; }
    public string BillingCycle { get; set; } = "Monthly"; // Monthly, Yearly
    public List<string> Features { get; set; } = new();
    public bool IsPopular { get; set; }
}

public class CreateCheckoutSessionRequestDto
{
    [Required(ErrorMessage = "planId là bắt buộc.")]
    public string PlanId { get; set; } = SubscriptionCatalog.ProMonthly;

    [OneOfIgnoreCase("VNPAY", "MOMO", "STRIPE", "PAYOS")]
    public string PaymentMethod { get; set; } = "VNPAY"; // VNPAY, MOMO, STRIPE, PAYOS
}

public class CheckoutSessionResponseDto
{
    public string SessionId { get; set; } = string.Empty;

    /// <summary>Mã đơn PayOS (chỉ có với PAYOS) — dùng cho <c>GET /subscription/check-status/{orderCode}</c>.</summary>
    public long? OrderCode { get; set; }

    public string PaymentUrl { get; set; } = string.Empty;

    /// <summary>Ảnh mã QR (URL) để hiển thị trong app.</summary>
    public string? QrCodeUrl { get; set; }

    /// <summary>Chuỗi VietQR gốc (chỉ có với PAYOS) — app có thể tự vẽ QR từ chuỗi này.</summary>
    public string? QrCode { get; set; }

    public decimal AmountVnd { get; set; }
    public string Message { get; set; } = string.Empty;
}

/// <summary>Trạng thái một giao dịch của chính người dùng (<c>GET /subscription/check-status/{orderCode}</c>).</summary>
public class PaymentTransactionStatusDto
{
    public long OrderCode { get; set; }

    /// <summary>Pending | Paid | Failed.</summary>
    public string Status { get; set; } = string.Empty;

    public bool IsPaid { get; set; }
    public string PlanId { get; set; } = string.Empty;
    public decimal AmountVnd { get; set; }
    public DateTime? PaidAt { get; set; }
}

/// <summary>Thông báo kết quả thanh toán từ cổng thanh toán (webhook, có chữ ký HMAC).</summary>
public class PaymentWebhookDto
{
    [Required]
    public string SessionId { get; set; } = string.Empty;

    /// <summary>"paid" hoặc "failed".</summary>
    [Required]
    [OneOfIgnoreCase("paid", "failed")]
    public string Status { get; set; } = string.Empty;

    public string? ProviderTransactionId { get; set; }

    /// <summary>Số tiền cổng thanh toán đã thu; phải khớp số tiền của phiên.</summary>
    public decimal AmountVnd { get; set; }
}

public class SubscriptionStatusDto
{
    /// <summary>Free | Premium | Expired | Cancelled.</summary>
    public string Status { get; set; } = "Free";

    /// <summary>Quyền Pro còn hiệu lực (Premium hoặc Cancelled-nhưng-chưa-hết-hạn).</summary>
    public bool IsPro { get; set; }

    public string? PlanId { get; set; }
    public DateTime? ProExpiresAt { get; set; }
}

public class PaymentTransactionDto
{
    public Guid Id { get; set; }
    public string SessionId { get; set; } = string.Empty;
    public string PlanId { get; set; } = string.Empty;
    public decimal AmountVnd { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? PaidAt { get; set; }
}
