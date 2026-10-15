using System.Collections.Concurrent;
using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using SmartMeal.Application.Services;
using SmartMeal.Infrastructure.Services;
using SmartMeal.Tests.Infrastructure;
using Xunit;

namespace SmartMeal.Tests;

public sealed record SePayCheckoutPayload(
    string SessionId, long? OrderCode, string PaymentUrl, string? QrCodeUrl, decimal AmountVnd,
    string? BankCode, string? AccountNumber, string? AccountName, string? TransferContent, DateTime? ExpiresAt);

/// <summary>Thay API giao dịch thật của SePay: trả các giao dịch đặt sẵn và ghi lại request để kiểm tra cách gọi.</summary>
public sealed class StubSePayApiHandler : HttpMessageHandler
{
    public sealed record Call(Uri Url, string? Authorization);

    private readonly ConcurrentQueue<Call> _calls = new();

    /// <summary>Giao dịch trả về, đúng dạng phần tử "transactions" của <c>GET /userapi/transactions/list</c>.</summary>
    public ConcurrentQueue<object> Transactions { get; } = new();

    public IReadOnlyList<Call> Calls => _calls.ToArray();

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        _calls.Enqueue(new Call(request.RequestUri!, request.Headers.Authorization?.ToString()));
        var body = JsonSerializer.Serialize(new
        {
            status = 200,
            error = (string?)null,
            messages = new { success = true },
            transactions = Transactions.ToArray()
        });
        return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(body, Encoding.UTF8, "application/json") });
    }
}

/// <summary>SePay đã cấu hình đủ (tài khoản, API key webhook, API token); API giao dịch là bản giả.</summary>
public sealed class SePayFixture : IDisposable
{
    public const string WebhookKey = "test-sepay-webhook-key";
    public const string ApiToken = "test-sepay-api-token";

    public StubSePayApiHandler Api { get; } = new();
    public ApiFactory Factory { get; }

    public SePayFixture()
    {
        Factory = new ApiFactory()
            .WithSetting("SePay:BankCode", "MBBank")
            .WithSetting("SePay:AccountNumber", "0123456789")
            .WithSetting("SePay:AccountName", "NGUYEN VAN A")
            .WithSetting("SePay:WebhookApiKey", WebhookKey)
            .WithSetting("SePay:ApiToken", ApiToken)
            .WithSetting("SePay:StatusCheckIntervalSeconds", "0")
            .WithServices(services =>
                services.AddHttpClient<ISePayGateway, SePayGateway>().ConfigurePrimaryHttpMessageHandler(() => Api));
    }

    public void Dispose() => Factory.Dispose();
}

/// <summary>
/// Thanh toán chuyển khoản qua SePay: người dùng quét VietQR chuyển thẳng vào tài khoản đã liên kết; Pro chỉ kích hoạt khi
/// SePay báo tiền vào đúng mã (webhook có API key) hoặc máy chủ tự thấy giao dịch qua API của SePay.
/// </summary>
public class SePayTests : IClassFixture<SePayFixture>, IClassFixture<ApiFactory>
{
    private readonly SePayFixture _sePay;
    private readonly ApiFactory _factory;
    private readonly ApiFactory _notConfigured;

    public SePayTests(SePayFixture sePay, ApiFactory notConfigured)
    {
        _sePay = sePay;
        _factory = sePay.Factory;
        _notConfigured = notConfigured;
    }

    private static async Task<SePayCheckoutPayload> CheckoutAsync(HttpClient client, string planId = "PRO_MONTHLY")
    {
        var response = await client.PostJsonAsync("/api/subscription/create-checkout-session", new { planId, paymentMethod = "SEPAY" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.ReadEnvelopeAsync<SePayCheckoutPayload>()).Data!;
    }

    private Task<HttpResponseMessage> WebhookAsync(object body, string? authorization = "Apikey " + SePayFixture.WebhookKey) =>
        WebhookRawAsync(JsonSerializer.Serialize(body), authorization);

    private async Task<HttpResponseMessage> WebhookRawAsync(string body, string? authorization)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/subscription/sepay-webhook")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        };
        if (authorization is not null) request.Headers.TryAddWithoutValidation("Authorization", authorization);
        return await _factory.CreateClient().SendAsync(request);
    }

    /// <summary>Webhook đúng dạng SePay gửi khi có tiền vào (code = null: SePay chưa cấu hình nhận diện mã).</summary>
    private static object IncomingTransfer(long id, decimal amount, string content, string transferType = "in") => new
    {
        id,
        gateway = "MBBank",
        transactionDate = "2026-10-15 10:30:00",
        accountNumber = "0123456789",
        code = (string?)null,
        content,
        transferType,
        transferAmount = amount,
        accumulated = 5_000_000,
        subAccount = (string?)null,
        referenceCode = $"FT{id}",
        description = content
    };

    private static async Task<UserPayload> MeAsync(HttpClient client) =>
        (await (await client.GetAsync("/api/auth/me")).ReadEnvelopeAsync<UserPayload>()).Data!;

    private static async Task<PaymentStatusPayload> CheckStatusAsync(HttpClient client, long orderCode)
    {
        var response = await client.GetAsync($"/api/subscription/check-status/{orderCode}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.ReadEnvelopeAsync<PaymentStatusPayload>()).Data!;
    }

    [DbFact]
    public async Task Checkout_shows_a_vietqr_to_the_linked_account_with_a_unique_transfer_code_and_grants_nothing_yet()
    {
        var user = await _factory.RegisterUserAsync();

        var checkout = await CheckoutAsync(user.Client);
        var another = await CheckoutAsync(user.Client, "PRO_YEARLY");

        Assert.Matches("^SM[A-HJ-NP-Z2-9]{8}$", checkout.TransferContent!);
        Assert.Equal(checkout.TransferContent, checkout.SessionId);
        Assert.NotEqual(checkout.TransferContent, another.TransferContent);
        Assert.NotNull(checkout.OrderCode);
        Assert.Equal(79000, checkout.AmountVnd);
        Assert.Equal(699000, another.AmountVnd);
        Assert.Equal(("MBBank", "0123456789", "NGUYEN VAN A"), (checkout.BankCode, checkout.AccountNumber, checkout.AccountName));
        Assert.StartsWith("https://qr.sepay.vn/img?", checkout.QrCodeUrl);
        Assert.Contains("acc=0123456789", checkout.QrCodeUrl);
        Assert.Contains("bank=MBBank", checkout.QrCodeUrl);
        Assert.Contains("amount=79000", checkout.QrCodeUrl);
        Assert.Contains($"des={checkout.TransferContent}", checkout.QrCodeUrl);
        Assert.InRange(checkout.ExpiresAt!.Value, DateTime.UtcNow.AddMinutes(14), DateTime.UtcNow.AddMinutes(16));

        Assert.False((await MeAsync(user.Client)).IsPro);
        Assert.Equal("Pending", (await CheckStatusAsync(user.Client, checkout.OrderCode!.Value)).Status);
    }

    [DbFact]
    public async Task A_webhook_with_the_right_api_key_and_transfer_code_activates_pro_once()
    {
        var user = await _factory.RegisterUserAsync();
        var checkout = await CheckoutAsync(user.Client);
        // Ngân hàng hay chèn thêm chữ/dấu chấm và đổi hoa thường quanh nội dung người dùng nhập.
        var transfer = IncomingTransfer(9001, 79000, $"MBVCB.12345678.{checkout.TransferContent!.ToLowerInvariant()}.CT tu 0987654321");

        var first = await WebhookAsync(transfer);
        var firstExpiry = (await MeAsync(user.Client)).ProExpiresAt;
        var replay = await WebhookAsync(transfer);

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.True((await first.ReadEnvelopeAsync<bool>()).Success);          // SePay cần {"success": true}
        Assert.Equal(HttpStatusCode.OK, replay.StatusCode);
        var me = await MeAsync(user.Client);
        Assert.True(me.IsPro);
        Assert.Equal(firstExpiry, me.ProExpiresAt);                             // gửi lại không gia hạn thêm
        var status = await CheckStatusAsync(user.Client, checkout.OrderCode!.Value);
        Assert.True(status.IsPaid);
        Assert.NotNull(status.PaidAt);
    }

    [DbFact]
    public async Task Wrong_api_keys_are_rejected_and_underpaid_outgoing_or_unrelated_transfers_never_grant_pro()
    {
        var user = await _factory.RegisterUserAsync();
        var checkout = await CheckoutAsync(user.Client);
        var paid = IncomingTransfer(9101, 79000, checkout.TransferContent!);

        Assert.Equal(HttpStatusCode.Unauthorized, (await WebhookAsync(paid, authorization: null)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await WebhookAsync(paid, "Apikey wrong-key")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await WebhookAsync(paid, "Bearer " + SePayFixture.WebhookKey)).StatusCode);

        // Đã xử lý (trả 200 để SePay không gửi lại) nhưng không kích hoạt Pro.
        Assert.Equal(HttpStatusCode.OK, (await WebhookAsync(IncomingTransfer(9102, 50000, checkout.TransferContent!))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await WebhookAsync(IncomingTransfer(9103, 79000, checkout.TransferContent!, "out"))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await WebhookAsync(IncomingTransfer(9104, 79000, "SMZZZZZZZZ tien an trua"))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await WebhookRawAsync("not json", "Apikey " + SePayFixture.WebhookKey)).StatusCode);

        Assert.False((await MeAsync(user.Client)).IsPro);
        Assert.Equal("Pending", (await CheckStatusAsync(user.Client, checkout.OrderCode!.Value)).Status);
    }

    [DbFact]
    public async Task Without_a_webhook_check_status_finds_the_transfer_through_the_sepay_api()
    {
        var user = await _factory.RegisterUserAsync();
        var checkout = await CheckoutAsync(user.Client);
        var orderCode = checkout.OrderCode!.Value;

        Assert.False((await CheckStatusAsync(user.Client, orderCode)).IsPaid);   // chưa có tiền vào

        // Như API giao dịch của SePay: số tiền dạng chuỗi, nội dung có thêm chữ của ngân hàng.
        _sePay.Api.Transactions.Enqueue(new
        {
            id = "77001", bank_brand_name = "MBBank", account_number = "0123456789", transaction_date = "2026-10-15 10:31:00",
            amount_out = "0.00", amount_in = "79000.00", accumulated = "5079000.00",
            transaction_content = $"{checkout.TransferContent} chuyen tien", reference_number = "FT77001", code = (string?)null
        });

        var status = await CheckStatusAsync(user.Client, orderCode);

        Assert.True(status.IsPaid);
        Assert.True((await MeAsync(user.Client)).IsPro);
        var call = _sePay.Api.Calls.Last();
        Assert.Equal("Bearer " + SePayFixture.ApiToken, call.Authorization);
        Assert.Equal("/userapi/transactions/list", call.Url.AbsolutePath);
        Assert.Contains("account_number=0123456789", call.Url.Query);
    }

    [DbFact]
    public async Task SePay_is_disabled_until_it_is_configured()
    {
        var user = await _notConfigured.RegisterUserAsync();

        var checkout = await user.Client.PostJsonAsync("/api/subscription/create-checkout-session", new { planId = "PRO_MONTHLY", paymentMethod = "SEPAY" });
        var webhook = await _notConfigured.CreateClient().PostAsync("/api/subscription/sepay-webhook",
            new StringContent("{}", Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.ServiceUnavailable, checkout.StatusCode);
        Assert.Contains("sepay_not_configured", (await checkout.ReadEnvelopeAsync<object>()).Errors!);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, webhook.StatusCode);
    }
}
