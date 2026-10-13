using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.API.Infrastructure;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Subscription;
using SmartMeal.Application.Services;

namespace SmartMeal.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SubscriptionController : ControllerBase
{
    private readonly ISubscriptionService _subscriptionService;

    public SubscriptionController(ISubscriptionService subscriptionService)
    {
        _subscriptionService = subscriptionService;
    }

    [HttpGet("plans")]
    public async Task<ActionResult<ApiResponse<List<SubscriptionPlanDto>>>> GetPlans() =>
        this.ToActionResult(await _subscriptionService.GetPlansAsync());

    /// <summary>Tạo phiên thanh toán. Gói Pro chỉ được kích hoạt khi cổng thanh toán xác nhận qua webhook (BR-241/242).</summary>
    [Authorize]
    [HttpPost("create-checkout-session")]
    public async Task<ActionResult<ApiResponse<CheckoutSessionResponseDto>>> CreateCheckoutSession([FromBody] CreateCheckoutSessionRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<CheckoutSessionResponseDto>();

        return this.ToActionResult(await _subscriptionService.CreateCheckoutSessionAsync(userId, dto));
    }

    /// <summary>Chỉ dùng khi phát triển: mô phỏng cổng thanh toán xác nhận. Môi trường thật trả 404.</summary>
    [Authorize]
    [HttpPost("activate-mock")]
    public async Task<ActionResult<ApiResponse<bool>>> ActivateMock([FromBody] CreateCheckoutSessionRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<bool>();

        return this.ToActionResult(await _subscriptionService.ActivateProPlanAsync(userId, dto.PlanId));
    }

    /// <summary>
    /// Webhook của cổng thanh toán (server-to-server). Body JSON <c>{ sessionId, status: "paid"|"failed", providerTransactionId, amountVnd }</c>,
    /// header <c>X-Signature</c> = HMAC-SHA256 (hex) của body với <c>Subscription:WebhookSecret</c>.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("webhook")]
    [RequestSizeLimit(64 * 1024)]
    public async Task<ActionResult<ApiResponse<bool>>> Webhook()
    {
        using var reader = new StreamReader(Request.Body, Encoding.UTF8);
        var body = await reader.ReadToEndAsync();
        var signature = Request.Headers["X-Signature"].FirstOrDefault();

        return this.ToActionResult(await _subscriptionService.HandleWebhookAsync(body, signature));
    }

    [Authorize]
    [HttpGet("status")]
    public async Task<ActionResult<ApiResponse<SubscriptionStatusDto>>> GetStatus()
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<SubscriptionStatusDto>();

        return this.ToActionResult(await _subscriptionService.GetStatusAsync(userId));
    }

    [Authorize]
    [HttpGet("transactions")]
    public async Task<ActionResult<ApiResponse<List<PaymentTransactionDto>>>> GetTransactions()
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<List<PaymentTransactionDto>>();

        return this.ToActionResult(await _subscriptionService.GetTransactionsAsync(userId));
    }

    /// <summary>Hủy gia hạn: vẫn dùng Pro tới hết hạn.</summary>
    [Authorize]
    [HttpPost("cancel")]
    public async Task<ActionResult<ApiResponse<SubscriptionStatusDto>>> Cancel()
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<SubscriptionStatusDto>();

        return this.ToActionResult(await _subscriptionService.CancelAsync(userId));
    }
}
