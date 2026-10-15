using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Net.payOS;
using Net.payOS.Types;
using SmartMeal.Application.Services;
using SmartMeal.Infrastructure.Options;

namespace SmartMeal.Infrastructure.Services;

/// <summary>Cài đặt <see cref="IPayOSGateway"/> bằng SDK chính thức của PayOS (gói NuGet <c>payOS</c>).</summary>
public sealed class PayOSGateway : IPayOSGateway
{
    private readonly PayOSOptions _options;
    private readonly ILogger<PayOSGateway> _logger;

    public PayOSGateway(IOptions<PayOSOptions> options, ILogger<PayOSGateway> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public bool IsConfigured => _options.IsConfigured;

    private PayOS Client()
    {
        if (!IsConfigured)
        {
            throw new InvalidOperationException("PayOS chưa được cấu hình (thiếu PayOS:ClientId/ApiKey/ChecksumKey).");
        }

        return new PayOS(_options.ClientId, _options.ApiKey, _options.ChecksumKey);
    }

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

    public async Task<PayOSPaymentInfo> GetPaymentInfoAsync(long orderCode)
    {
        var info = await Client().getPaymentLinkInformation(orderCode);
        var reference = info.transactions?.LastOrDefault()?.reference;
        return new PayOSPaymentInfo(info.status ?? string.Empty, info.amountPaid, reference);
    }

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
