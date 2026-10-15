using System.ComponentModel.DataAnnotations;
using SmartMeal.Application.Common.Validation;

namespace SmartMeal.Application.DTOs.Subscription;

/// <summary>Danh mục gói Pro (nguồn duy nhất cho giá, chu kỳ và thời hạn).</summary>
public static class SubscriptionCatalog
{
    public const string ProMonthly = "PRO_MONTHLY";
    public const string ProYearly = "PRO_YEARLY";

    /// <summary>PayOS: chuyển khoản VietQR qua cổng PayOS.</summary>
    public const string PayOS = "PAYOS";

    /// <summary>SePay: chuyển khoản VietQR thẳng vào tài khoản ngân hàng đã liên kết SePay; SePay báo tiền vào.</summary>
    public const string SePay = "SEPAY";

    public static readonly string[] PaymentMethods = { SePay, PayOS };

    public sealed record Plan(string Id, string Name, decimal PriceVnd, string BillingCycle, int DurationDays, bool IsPopular, string[] Features);

    // Quyền lợi chỉ ghi những gì Pro thật sự mở khóa (máy chủ kiểm tra): người dùng trả tiền theo danh sách này.
    public static readonly IReadOnlyList<Plan> Plans = new[]
    {
        new Plan(ProMonthly, "Gói Tháng (Pro Monthly)", 79000, "Monthly", 30, false, new[]
        {
            "Dùng AI không giới hạn: chụp ảnh món ăn, ghi bữa ăn bằng giọng nói (gói Free: 5 lượt/ngày)",
            "Quét tủ lạnh bằng AI và gợi ý món nấu được ngay",
            "Tự động tạo thực đơn cả tuần bằng AI theo mục tiêu calo của bạn"
        }),
        new Plan(ProYearly, "Gói Năm (Pro Yearly - Tiết kiệm 25%)", 699000, "Yearly", 365, true, new[]
        {
            "Toàn bộ quyền lợi của gói Tháng",
            "Tiết kiệm hơn 25% so với trả theo tháng (699.000đ thay vì 948.000đ)"
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

    [OneOfIgnoreCase("SEPAY", "PAYOS")]
    public string PaymentMethod { get; set; } = SubscriptionCatalog.SePay; // SEPAY, PAYOS
}

public class CheckoutSessionResponseDto
{
    public string SessionId { get; set; } = string.Empty;

    /// <summary>Mã đơn (PAYOS, SEPAY) — dùng cho <c>GET /subscription/check-status/{orderCode}</c>.</summary>
    public long? OrderCode { get; set; }

    public string PaymentUrl { get; set; } = string.Empty;

    /// <summary>Ảnh mã QR (URL) để hiển thị trong app.</summary>
    public string? QrCodeUrl { get; set; }

    /// <summary>Chuỗi VietQR gốc (chỉ có với PAYOS) — app có thể tự vẽ QR từ chuỗi này.</summary>
    public string? QrCode { get; set; }

    public decimal AmountVnd { get; set; }
    public string Message { get; set; } = string.Empty;

    /// <summary>SEPAY: ngân hàng, số tài khoản, tên chủ tài khoản nhận tiền — để người dùng chuyển tay nếu không quét được QR.</summary>
    public string? BankCode { get; set; }
    public string? AccountNumber { get; set; }
    public string? AccountName { get; set; }

    /// <summary>SEPAY: nội dung chuyển khoản bắt buộc (mã thanh toán) — sai nội dung thì máy chủ không khớp được đơn.</summary>
    public string? TransferContent { get; set; }

    /// <summary>SEPAY: hết thời gian hiển thị mã (UTC). Tiền tới sau hạn vẫn được ghi nhận.</summary>
    public DateTime? ExpiresAt { get; set; }
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
