namespace SmartMeal.Application.Services;

/// <summary>Link thanh toán PayOS vừa tạo: trang thanh toán và chuỗi VietQR để hiển thị mã QR.</summary>
public sealed record PayOSPaymentLink(string CheckoutUrl, string? QrCode);

/// <summary>Trạng thái link thanh toán do PayOS trả (PENDING, PAID, CANCELLED, EXPIRED...) và số tiền đã nhận.</summary>
public sealed record PayOSPaymentInfo(string Status, long AmountPaid, string? Reference);

/// <summary>Webhook PayOS đã xác minh chữ ký: <c>Code = "00"</c> là thanh toán thành công.</summary>
public sealed record PayOSWebhookPayment(long OrderCode, long Amount, string Code, string? Reference);

/// <summary>
/// Cổng thanh toán PayOS (chuyển khoản VietQR). Tách khỏi SDK để dịch vụ thanh toán test được không cần mạng.
/// Khóa (ClientId/ApiKey/ChecksumKey) chỉ đặt qua biến môi trường — xem <c>PayOS__*</c> trong backend/.env.example.
/// </summary>
public interface IPayOSGateway
{
    /// <summary>false khi chưa đặt đủ ba khóa: chọn PayOS sẽ trả 503 thay vì gọi ra ngoài.</summary>
    bool IsConfigured { get; }

    Task<PayOSPaymentLink> CreatePaymentLinkAsync(long orderCode, int amountVnd, string description, string itemName);

    Task<PayOSPaymentInfo> GetPaymentInfoAsync(long orderCode);

    /// <summary>Xác minh chữ ký webhook (HMAC-SHA256 bằng ChecksumKey). null nếu body sai định dạng hoặc chữ ký không hợp lệ.</summary>
    PayOSWebhookPayment? VerifyWebhook(string rawBody);
}
