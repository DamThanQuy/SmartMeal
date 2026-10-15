using System.Collections.Concurrent;
using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SmartMeal.Application.Services;
using SmartMeal.Tests.Infrastructure;
using Xunit;

namespace SmartMeal.Tests;

public sealed record PayOSCheckoutPayload(string SessionId, long? OrderCode, string PaymentUrl, string? QrCodeUrl, string? QrCode, decimal AmountVnd);
public sealed record PaymentStatusPayload(long OrderCode, string Status, bool IsPaid, string PlanId, decimal AmountVnd, DateTime? PaidAt);

/// <summary>Thay PayOS thật: link giả, trạng thái từng đơn đặt được, webhook "hợp lệ" khi chữ ký là "valid".</summary>
public sealed class FakePayOSGateway : IPayOSGateway
{
    public ConcurrentDictionary<long, PayOSPaymentInfo> Payments { get; } = new();

    public bool IsConfigured => true;

    public Task<PayOSPaymentLink> CreatePaymentLinkAsync(long orderCode, int amountVnd, string description, string itemName)
    {
        Payments[orderCode] = new PayOSPaymentInfo("PENDING", 0, null);
        return Task.FromResult(new PayOSPaymentLink($"https://pay.payos.vn/web/{orderCode}", $"VIETQR-{orderCode}-{amountVnd}"));
    }

    public Task<PayOSPaymentInfo> GetPaymentInfoAsync(long orderCode) =>
        Task.FromResult(Payments.TryGetValue(orderCode, out var info) ? info : new PayOSPaymentInfo("PENDING", 0, null));

    public PayOSWebhookPayment? VerifyWebhook(string rawBody)
    {
        using var json = JsonDocument.Parse(rawBody);
        var root = json.RootElement;
        if (root.GetProperty("signature").GetString() != "valid") return null;
        var data = root.GetProperty("data");
        return new PayOSWebhookPayment(
            data.GetProperty("orderCode").GetInt64(), data.GetProperty("amount").GetInt64(), root.GetProperty("code").GetString()!, "FT123");
    }
}

public sealed class PayOSFixture : IDisposable
{
    public FakePayOSGateway Gateway { get; } = new();
    public ApiFactory Factory { get; }

    public PayOSFixture()
    {
        Factory = new ApiFactory().WithServices(services =>
        {
            services.RemoveAll<IPayOSGateway>();
            services.AddSingleton<IPayOSGateway>(Gateway);
        });
    }

    public void Dispose() => Factory.Dispose();
}

/// <summary>Thanh toán PayOS (VietQR): Pro chỉ kích hoạt khi PayOS xác nhận — qua webhook có chữ ký hoặc máy chủ tự hỏi PayOS.</summary>
public class PayOSTests : IClassFixture<PayOSFixture>, IClassFixture<ApiFactory>
{
    private readonly PayOSFixture _payOS;
    private readonly ApiFactory _notConfigured;

    public PayOSTests(PayOSFixture payOS, ApiFactory notConfigured)
    {
        _payOS = payOS;
        _notConfigured = notConfigured;
    }

    private static async Task<PayOSCheckoutPayload> CheckoutAsync(HttpClient client, string planId = "PRO_MONTHLY")
    {
        var response = await client.PostJsonAsync("/api/subscription/create-checkout-session", new { planId, paymentMethod = "PAYOS" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.ReadEnvelopeAsync<PayOSCheckoutPayload>()).Data!;
    }

    private static async Task<PaymentStatusPayload> CheckStatusAsync(HttpClient client, long orderCode)
    {
        var response = await client.GetAsync($"/api/subscription/check-status/{orderCode}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.ReadEnvelopeAsync<PaymentStatusPayload>()).Data!;
    }

    private static async Task<SubscriptionStatusPayload> StatusAsync(HttpClient client) =>
        (await (await client.GetAsync("/api/subscription/status")).ReadEnvelopeAsync<SubscriptionStatusPayload>()).Data!;

    private Task<HttpResponseMessage> PostWebhookAsync(long orderCode, long amount, string signature, string code = "00") =>
        _payOS.Factory.CreateClient().PostAsync("/api/subscription/payos-webhook", new StringContent(
            $$"""{"code":"{{code}}","desc":"success","success":true,"data":{"orderCode":{{orderCode}},"amount":{{amount}},"code":"{{code}}"},"signature":"{{signature}}"}""",
            Encoding.UTF8,
            "application/json"));

    [DbFact]
    public async Task Without_keys_payos_is_unavailable()
    {
        var user = await _notConfigured.RegisterUserAsync();

        var response = await user.Client.PostJsonAsync("/api/subscription/create-checkout-session", new { planId = "PRO_MONTHLY", paymentMethod = "PAYOS" });

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Contains("payos_not_configured", (await response.ReadEnvelopeAsync<object>()).Errors!);
    }

    [DbFact]
    public async Task Checkout_returns_the_payos_link_and_pro_activates_only_after_payos_reports_paid()
    {
        var user = await _payOS.Factory.RegisterUserAsync();

        var checkout = await CheckoutAsync(user.Client);

        Assert.NotNull(checkout.OrderCode);
        var orderCode = checkout.OrderCode!.Value;
        Assert.Equal($"https://pay.payos.vn/web/{orderCode}", checkout.PaymentUrl);
        Assert.Equal($"VIETQR-{orderCode}-79000", checkout.QrCode);
        Assert.Contains(Uri.EscapeDataString(checkout.QrCode!), checkout.QrCodeUrl);
        Assert.False((await CheckStatusAsync(user.Client, orderCode)).IsPaid);
        Assert.False((await StatusAsync(user.Client)).IsPro);

        // Chưa đủ tiền: không kích hoạt.
        _payOS.Gateway.Payments[orderCode] = new PayOSPaymentInfo("PAID", 1000, "FT1");
        Assert.False((await CheckStatusAsync(user.Client, orderCode)).IsPaid);

        _payOS.Gateway.Payments[orderCode] = new PayOSPaymentInfo("PAID", 79000, "FT1");
        var paid = await CheckStatusAsync(user.Client, orderCode);
        Assert.True(paid.IsPaid);
        Assert.Equal("Paid", paid.Status);

        var status = await StatusAsync(user.Client);
        Assert.True(status.IsPro);
        Assert.Equal("PRO_MONTHLY", status.PlanId);

        // Hỏi lại hoặc webhook về muộn: không cộng thêm thời hạn.
        Assert.True((await CheckStatusAsync(user.Client, orderCode)).IsPaid);
        Assert.Equal(HttpStatusCode.OK, (await PostWebhookAsync(orderCode, 79000, "valid")).StatusCode);
        Assert.Equal(status.ProExpiresAt, (await StatusAsync(user.Client)).ProExpiresAt);
    }

    [DbFact]
    public async Task Only_the_owner_can_check_an_order()
    {
        var owner = await _payOS.Factory.RegisterUserAsync();
        var other = await _payOS.Factory.RegisterUserAsync();
        var checkout = await CheckoutAsync(owner.Client);

        var response = await other.Client.GetAsync($"/api/subscription/check-status/{checkout.OrderCode}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _payOS.Factory.CreateClient().GetAsync($"/api/subscription/check-status/{checkout.OrderCode}")).StatusCode);
    }

    [DbFact]
    public async Task Signed_webhook_activates_pro_and_bad_signatures_or_amounts_do_not()
    {
        var user = await _payOS.Factory.RegisterUserAsync();
        var checkout = await CheckoutAsync(user.Client, "PRO_YEARLY");
        var orderCode = checkout.OrderCode!.Value;

        Assert.Equal(HttpStatusCode.Unauthorized, (await PostWebhookAsync(orderCode, 699000, "forged")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await PostWebhookAsync(orderCode, 1000, "valid")).StatusCode);
        Assert.False((await StatusAsync(user.Client)).IsPro);

        Assert.Equal(HttpStatusCode.OK, (await PostWebhookAsync(orderCode, 699000, "valid")).StatusCode);

        var status = await StatusAsync(user.Client);
        Assert.True(status.IsPro);
        Assert.Equal("PRO_YEARLY", status.PlanId);
        Assert.True((await CheckStatusAsync(user.Client, orderCode)).IsPaid);
    }

    [DbFact]
    public async Task Payos_test_webhook_for_an_unknown_order_is_acknowledged()
    {
        Assert.Equal(HttpStatusCode.OK, (await PostWebhookAsync(123, 10000, "valid")).StatusCode);
    }
}
