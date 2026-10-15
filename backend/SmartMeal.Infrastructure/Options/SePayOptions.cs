using System.ComponentModel.DataAnnotations;

namespace SmartMeal.Infrastructure.Options;

/// <summary>
/// Thanh toán chuyển khoản ngân hàng qua SePay (mục "SePay", https://my.sepay.vn). Người dùng quét VietQR chuyển tiền thẳng
/// vào tài khoản ngân hàng đã liên kết với SePay; SePay báo tiền vào bằng webhook (<c>Authorization: Apikey ...</c>) và
/// máy chủ còn tự hỏi API giao dịch của SePay (<c>Authorization: Bearer ...</c>) khi webhook không tới được (máy dev).
/// Khóa chỉ đặt qua biến môi trường <c>SePay__*</c>. Thiếu thông tin tài khoản hoặc không có cách xác nhận nào thì phương
/// thức SEPAY bị tắt (503).
/// </summary>
public sealed class SePayOptions
{
    public const string SectionName = "SePay";

    /// <summary>Mã ngân hàng cho VietQR (code/short name trong danh sách ngân hàng của SePay), vd. MBBank, VCB, TPBank.</summary>
    public string BankCode { get; set; } = string.Empty;

    /// <summary>Số tài khoản nhận tiền (đã liên kết với SePay).</summary>
    public string AccountNumber { get; set; } = string.Empty;

    /// <summary>Tên chủ tài khoản — chỉ để hiển thị cho người dùng đối chiếu trước khi chuyển.</summary>
    public string AccountName { get; set; } = string.Empty;

    /// <summary>API Key cấu hình cho webhook ở my.sepay.vn (SePay gửi header <c>Authorization: Apikey {key}</c>). Bí mật.</summary>
    public string WebhookApiKey { get; set; } = string.Empty;

    /// <summary>API Token (my.sepay.vn → API Access) để máy chủ tự hỏi giao dịch khi chưa nhận webhook. Bí mật.</summary>
    public string ApiToken { get; set; } = string.Empty;

    /// <summary>Tiền tố mã thanh toán trong nội dung chuyển khoản — đặt trùng "cấu trúc mã thanh toán" trên SePay.</summary>
    [RegularExpression("^[A-Za-z]{2,5}$", ErrorMessage = "SePay:PaymentCodePrefix chỉ gồm 2–5 chữ cái.")]
    public string PaymentCodePrefix { get; set; } = "SM";

    /// <summary>Thời gian hiển thị mã QR (phút). Tiền tới sau hạn vẫn được ghi nhận vì đã vào tài khoản.</summary>
    [Range(5, 1440)]
    public int ExpiryMinutes { get; set; } = 15;

    /// <summary>Khoảng cách tối thiểu giữa hai lần hỏi API giao dịch cho cùng một đơn (giây) — app hỏi trạng thái mỗi 3 giây.</summary>
    [Range(0, 300)]
    public int StatusCheckIntervalSeconds { get; set; } = 10;

    public string ApiBaseUrl { get; set; } = "https://my.sepay.vn";
    public string QrImageBaseUrl { get; set; } = "https://qr.sepay.vn/img";

    public bool HasBankAccount => !string.IsNullOrWhiteSpace(BankCode) && !string.IsNullOrWhiteSpace(AccountNumber);
    public bool CanVerifyWebhook => !string.IsNullOrWhiteSpace(WebhookApiKey);
    public bool CanQueryTransactions => !string.IsNullOrWhiteSpace(ApiToken);

    /// <summary>Đủ để nhận tiền: có tài khoản để tạo QR và ít nhất một cách xác nhận (webhook hoặc API giao dịch).</summary>
    public bool IsConfigured => HasBankAccount && (CanVerifyWebhook || CanQueryTransactions);
}
