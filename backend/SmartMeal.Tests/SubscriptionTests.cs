using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Tests.Infrastructure;
using Xunit;

namespace SmartMeal.Tests;

public sealed record PlanPayload(string Id, string Name, decimal PriceVnd, string BillingCycle, List<string> Features, bool IsPopular);
public sealed record CheckoutPayload(string SessionId, string PaymentUrl, string? QrCodeUrl, decimal AmountVnd, string Message);
public sealed record SubscriptionStatusPayload(string Status, bool IsPro, string? PlanId, DateTime? ProExpiresAt);
public sealed record TransactionPayload(Guid Id, string SessionId, string PlanId, decimal AmountVnd, string PaymentMethod, string Status, DateTime CreatedAt, DateTime? PaidAt);

/// <summary>Môi trường như "production" cho thanh toán: SePay đã cấu hình (chỉ webhook), KHÔNG cho activate-mock.</summary>
public sealed class PaymentsFixture : IDisposable
{
    public ApiFactory Factory { get; } = new ApiFactory()
        .WithSetting("SePay:BankCode", "MBBank")
        .WithSetting("SePay:AccountNumber", "0123456789")
        .WithSetting("SePay:WebhookApiKey", "test-sepay-webhook-key");
    public void Dispose() => Factory.Dispose();
}

/// <summary>Môi trường phát triển: cho phép activate-mock.</summary>
public sealed class MockPaymentsFixture : IDisposable
{
    public ApiFactory Factory { get; } = new ApiFactory().WithSetting("Subscription:AllowMockActivation", "true");
    public void Dispose() => Factory.Dispose();
}

/// <summary>P2-BE-08 / BR-241, BR-242: Pro chỉ được kích hoạt khi cổng thanh toán xác nhận (xem thêm SePayTests, PayOSTests).</summary>
public class SubscriptionTests : IClassFixture<PaymentsFixture>, IClassFixture<MockPaymentsFixture>
{
    private readonly ApiFactory _strict;     // SePay đã cấu hình, không activate-mock
    private readonly ApiFactory _dev;        // cho phép activate-mock

    public SubscriptionTests(PaymentsFixture strict, MockPaymentsFixture dev)
    {
        _strict = strict.Factory;
        _dev = dev.Factory;
    }

    private static async Task<CheckoutPayload> CheckoutAsync(HttpClient client, string planId = "PRO_MONTHLY", string method = "SEPAY")
    {
        var response = await client.PostJsonAsync("/api/subscription/create-checkout-session", new { planId, paymentMethod = method });
        response.EnsureSuccessStatusCode();
        return (await response.ReadEnvelopeAsync<CheckoutPayload>()).Data!;
    }

    private static async Task<UserPayload> MeAsync(HttpClient client) =>
        (await (await client.GetAsync("/api/auth/me")).ReadEnvelopeAsync<UserPayload>()).Data!;

    private static async Task<SubscriptionStatusPayload> StatusAsync(HttpClient client) =>
        (await (await client.GetAsync("/api/subscription/status")).ReadEnvelopeAsync<SubscriptionStatusPayload>()).Data!;

    [DbFact]
    public async Task Plans_are_public_and_come_from_the_catalog()
    {
        var plans = (await (await _strict.CreateClient().GetAsync("/api/subscription/plans")).ReadEnvelopeAsync<List<PlanPayload>>()).Data!;

        Assert.Equal(new[] { "PRO_MONTHLY", "PRO_YEARLY" }, plans.Select(p => p.Id));
        Assert.Equal(79000, plans[0].PriceVnd);
        Assert.Equal(699000, plans[1].PriceVnd);
    }

    [DbFact]
    public async Task Creating_a_checkout_session_does_not_grant_pro_and_records_a_pending_transaction()
    {
        var user = await _strict.RegisterUserAsync();

        var checkout = await CheckoutAsync(user.Client, "PRO_YEARLY", "sepay");

        Assert.Equal(699000, checkout.AmountVnd);
        Assert.False((await MeAsync(user.Client)).IsPro);
        var status = await StatusAsync(user.Client);
        Assert.Equal("Free", status.Status);
        Assert.False(status.IsPro);

        var transactions = (await (await user.Client.GetAsync("/api/subscription/transactions")).ReadEnvelopeAsync<List<TransactionPayload>>()).Data!;
        var pending = Assert.Single(transactions);
        Assert.Equal("Pending", pending.Status);
        Assert.Equal("SEPAY", pending.PaymentMethod);
        Assert.Equal(checkout.SessionId, pending.SessionId);
    }

    [DbFact]
    public async Task Checkout_validates_the_plan_and_the_payment_method()
    {
        var user = await _strict.RegisterUserAsync();

        var badPlan = await user.Client.PostJsonAsync("/api/subscription/create-checkout-session", new { planId = "PRO_FOREVER", paymentMethod = "SEPAY" });
        var badMethod = await user.Client.PostJsonAsync("/api/subscription/create-checkout-session", new { planId = "PRO_MONTHLY", paymentMethod = "BITCOIN" });
        // Các cổng chỉ là giả lập trước đây (URL VNPAY tự dựng, MoMo/Stripe) không còn được nhận.
        var fakeGateway = await user.Client.PostJsonAsync("/api/subscription/create-checkout-session", new { planId = "PRO_MONTHLY", paymentMethod = "VNPAY" });
        var anonymous = await _strict.CreateClient().PostJsonAsync("/api/subscription/create-checkout-session", new { planId = "PRO_MONTHLY" });

        Assert.Equal(HttpStatusCode.BadRequest, badPlan.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, badMethod.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, fakeGateway.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
    }

    // ───────────────────────────── activate-mock chỉ ở môi trường phát triển ─────────────────────────────

    [DbFact]
    public async Task Activate_mock_does_not_exist_outside_development_so_nobody_can_self_upgrade()
    {
        var user = await _strict.RegisterUserAsync();

        var response = await user.Client.PostJsonAsync("/api/subscription/activate-mock", new { planId = "PRO_MONTHLY" });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.False((await MeAsync(user.Client)).IsPro);
    }

    [DbFact]
    public async Task Activate_mock_grants_pro_with_an_expiry_in_development_and_stacks_periods()
    {
        var user = await _dev.RegisterUserAsync();

        Assert.Equal(HttpStatusCode.OK, (await user.Client.PostJsonAsync("/api/subscription/activate-mock", new { planId = "PRO_MONTHLY" })).StatusCode);

        var me = await MeAsync(user.Client);
        Assert.True(me.IsPro);
        Assert.Equal("Premium", me.SubscriptionStatus);
        Assert.InRange(me.ProExpiresAt!.Value, DateTime.UtcNow.AddDays(29), DateTime.UtcNow.AddDays(31));

        // Mua tiếp trong lúc còn hạn → cộng dồn vào cuối kỳ hiện tại.
        (await user.Client.PostJsonAsync("/api/subscription/activate-mock", new { planId = "PRO_YEARLY" })).EnsureSuccessStatusCode();
        var extended = await StatusAsync(user.Client);
        Assert.InRange(extended.ProExpiresAt!.Value, DateTime.UtcNow.AddDays(30 + 364), DateTime.UtcNow.AddDays(30 + 366));
        Assert.Equal("PRO_YEARLY", extended.PlanId);

        var transactions = (await (await user.Client.GetAsync("/api/subscription/transactions")).ReadEnvelopeAsync<List<TransactionPayload>>()).Data!;
        Assert.Equal(2, transactions.Count);
        Assert.All(transactions, t => Assert.Equal("Paid", t.Status));
    }

    // ───────────────────────────── Hủy, hết hạn, xóa tài khoản ─────────────────────────────

    [DbFact]
    public async Task Cancelling_keeps_pro_until_the_expiry_date()
    {
        var user = await _dev.RegisterUserAsync();
        Assert.Equal(HttpStatusCode.BadRequest, (await user.Client.PostAsync("/api/subscription/cancel", null)).StatusCode);   // chưa có Pro
        (await user.Client.PostJsonAsync("/api/subscription/activate-mock", new { planId = "PRO_MONTHLY" })).EnsureSuccessStatusCode();

        var cancel = await user.Client.PostAsync("/api/subscription/cancel", null);

        Assert.Equal(HttpStatusCode.OK, cancel.StatusCode);
        var status = (await cancel.ReadEnvelopeAsync<SubscriptionStatusPayload>()).Data!;
        Assert.Equal("Cancelled", status.Status);
        Assert.True(status.IsPro);
        Assert.True((await MeAsync(user.Client)).IsPro);

        // Mua lại thì về Premium.
        (await user.Client.PostJsonAsync("/api/subscription/activate-mock", new { planId = "PRO_MONTHLY" })).EnsureSuccessStatusCode();
        Assert.Equal("Premium", (await StatusAsync(user.Client)).Status);
    }

    [DbFact]
    public async Task An_expired_subscription_is_no_longer_pro_and_reports_expired()
    {
        var user = await _dev.RegisterUserAsync();
        (await user.Client.PostJsonAsync("/api/subscription/activate-mock", new { planId = "PRO_MONTHLY" })).EnsureSuccessStatusCode();
        using (var scope = _dev.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            await db.Users.Where(u => u.Id == user.Id).ExecuteUpdateAsync(s => s.SetProperty(u => u.ProExpiresAt, DateTime.UtcNow.AddDays(-1)));
        }

        var me = await MeAsync(user.Client);
        var status = await StatusAsync(user.Client);

        Assert.False(me.IsPro);
        Assert.Equal("Expired", me.SubscriptionStatus);
        Assert.Equal("Expired", status.Status);
        Assert.False(status.IsPro);
    }

    [DbFact]
    public async Task Deleting_the_account_keeps_the_payment_history_anonymised()
    {
        var user = await _dev.RegisterUserAsync();
        (await user.Client.PostJsonAsync("/api/subscription/activate-mock", new { planId = "PRO_MONTHLY" })).EnsureSuccessStatusCode();

        var delete = await user.Client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, "/api/auth/account")
        {
            Content = System.Net.Http.Json.JsonContent.Create(new { password = user.Password }, options: ApiTestHelpers.Json)
        });
        Assert.Equal(HttpStatusCode.OK, delete.StatusCode);

        using var scope = _dev.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var kept = await db.PaymentTransactions.AsNoTracking().Where(t => t.UserRef != "").ToListAsync();
        var transaction = Assert.Single(kept, t => t.PlanId == "PRO_MONTHLY" && t.Status == "Paid" && t.UserId == null);
        Assert.Equal(64, transaction.UserRef.Length);
        Assert.DoesNotContain(user.Id.ToString("N"), transaction.UserRef, StringComparison.OrdinalIgnoreCase);
    }
}
