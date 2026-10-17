using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Net.payOS;
using Net.payOS.Types;
using SmartMeal.Application.Services;
using SmartMeal.Infrastructure.Options;

namespace SmartMeal.Infrastructure.Services;

/// <summary>
/// Cổng kết nối tích hợp dịch vụ thanh toán PayOS thông qua SDK chính thức (gói NuGet <c>payOS</c>):
/// - Khởi tạo liên kết thanh toán (Payment Link) trực tuyến kèm mã QR chuẩn VietQR/Napas 24/7.
/// - Tra cứu thông tin trạng thái đơn hàng trực tiếp từ hệ thống máy chủ PayOS.
/// - Xác minh tính toàn vẹn và chữ ký điện tử HMAC-SHA256 của Webhook gửi từ PayOS.
/// </summary>
public sealed class PayOSGateway : IPayOSGateway
{
    private readonly PayOSOptions _options;
    private readonly ILogger<PayOSGateway> _logger;

    /// <summary>
    /// Khởi tạo instance mới của <see cref="PayOSGateway"/>.
    /// </summary>
    /// <param name="options">Tùy chọn cấu hình khóa tích hợp PayOS (ClientId, ApiKey, ChecksumKey).</param>
    /// <param name="logger">Logger phục vụ ghi log gỡ lỗi và cảnh báo sự cố thanh toán.</param>
    public PayOSGateway(IOptions<PayOSOptions> options, ILogger<PayOSGateway> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    /// <summary>
    /// Cờ kiểm tra xem hệ thống đã được nạp đầy đủ 3 khóa bí mật của PayOS (ClientId, ApiKey, ChecksumKey) hay chưa.
    /// </summary>
    public bool IsConfigured => _options.IsConfigured;

    /// <summary>
    /// Khởi tạo client kết nối SDK PayOS từ các khóa cấu hình:
    /// Ném ngoại lệ InvalidOperationException nếu hệ thống chưa được nạp đủ khóa bí mật.
    /// </summary>
    /// <returns>Đối tượng client <see cref="PayOS"/> của SDK chính thức.</returns>
    private PayOS Client()
    {
        if (!IsConfigured)
        {
            throw new InvalidOperationException("PayOS chưa được cấu hình (thiếu PayOS:ClientId/ApiKey/ChecksumKey).");
        }

        return new PayOS(_options.ClientId, _options.ApiKey, _options.ChecksumKey);
    }

    /// <summary>
    /// Tạo liên kết thanh toán đơn hàng trực tuyến trên cổng PayOS:
    /// - Tiếp nhận mã đơn hàng duy nhất, số tiền thanh toán, nội dung mô tả và tên gói cước.
    /// - Gọi API PayOS SDK tạo phiên thanh toán với ReturnUrl và CancelUrl được cấu hình sẵn.
    /// </summary>
    /// <param name="orderCode">Mã đơn hàng định dạng số nguyên dương duy nhất.</param>
    /// <param name="amountVnd">Số tiền cần thanh toán tính bằng VNĐ.</param>
    /// <param name="description">Nội dung tóm tắt chuyển khoản (tối đa 25 ký tự).</param>
    /// <param name="itemName">Tên sản phẩm/gói dịch vụ hiển thị trên hóa đơn PayOS.</param>
    /// <returns>Đối tượng <see cref="PayOSPaymentLink"/> chứa URL cổng thanh toán và chuỗi dữ liệu mã QR.</returns>
    public async Task<PayOSPaymentLink> CreatePaymentLinkAsync(long orderCode, int amountVnd, string description, string itemName)
    {
        var data = new PaymentData(
            orderCode,
            amountVnd,
            description,
            new List<ItemData> { new(itemName, 1, amountVnd) },
            _options.CancelUrl,
            _options.ReturnUrl);

        var result = await Client().createPaymentLink(data);
        return new PayOSPaymentLink(result.checkoutUrl, result.qrCode);
    }

    /// <summary>
    /// Tra cứu thông tin trạng thái thanh toán của một đơn hàng từ hệ thống PayOS:
    /// Trả về trạng thái đơn ('PAID', 'PENDING', 'CANCELLED', 'EXPIRED'), số tiền thực nhận và mã tham chiếu giao dịch.
    /// </summary>
    /// <param name="orderCode">Mã đơn hàng cần kiểm tra.</param>
    /// <returns>Đối tượng <see cref="PayOSPaymentInfo"/> chứa trạng thái thanh toán hiện thời.</returns>
    public async Task<PayOSPaymentInfo> GetPaymentInfoAsync(long orderCode)
    {
        var info = await Client().getPaymentLinkInformation(orderCode);
        var reference = info.transactions?.LastOrDefault()?.reference;
        return new PayOSPaymentInfo(info.status ?? string.Empty, info.amountPaid, reference);
    }

    /// <summary>
    /// Xác thực tính hợp lệ và chữ ký số HMAC của Webhook nhận được từ PayOS:
    /// - Giải mã chuỗi JSON thô thành đối tượng <see cref="WebhookType"/>.
    /// - Dùng ChecksumKey kiểm tra chữ ký điện tử 'signature' khớp chính xác với dữ liệu 'data'.
    /// - Trả về null nếu chữ ký không khớp, dữ liệu bị can thiệp hoặc cấu hình chưa hoàn thiện.
    /// </summary>
    /// <param name="rawBody">Toàn bộ nội dung chuỗi JSON thô của Webhook.</param>
    /// <returns>Đối tượng <see cref="PayOSWebhookPayment"/> chứa thông tin chuyển khoản nếu chữ ký hợp lệ, ngược lại trả null.</returns>
    public PayOSWebhookPayment? VerifyWebhook(string rawBody)
    {
        if (!IsConfigured)
        {
            return null;
        }

        try
        {
            var body = JsonSerializer.Deserialize<WebhookType>(rawBody, JsonSerializerOptions.Web);
            if (body?.data is null || string.IsNullOrWhiteSpace(body.signature))
            {
                return null;
            }

            // SDK tính lại chữ ký từ "data" bằng ChecksumKey và ném lỗi nếu không khớp.
            var data = Client().verifyPaymentWebhookData(body);
            return new PayOSWebhookPayment(data.orderCode, data.amount, data.code ?? string.Empty, data.reference);
        }
        catch (Exception ex)
        {
            // SDK ném Exception thường khi chữ ký không khớp; mọi lỗi ở đây đều nghĩa là không tin được webhook này.
            _logger.LogWarning(ex, "Webhook PayOS không hợp lệ.");
            return null;
        }
    }
}
