using System.Net;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.API.Infrastructure;
using SmartMeal.Application.Common;
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

    /// <summary>
    /// Trang app ngân hàng mở sau khi chuyển khoản (tham số <c>url</c> của link dl.vietqr.io — bắt buộc là http(s) thì ngân
    /// hàng mới điền sẵn thông tin). Chỉ có nút quay lại SmartMeal: <c>to</c> phải là deep link của app (Expo Go chỉ ở
    /// Development), sai thì dùng <c>smartmealmobile://payment-result</c>. Không xác nhận gì — Pro chỉ bật khi tiền vào.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("payment-return")]
    public ContentResult PaymentReturn([FromQuery] string? to, [FromServices] IHostEnvironment environment)
    {
        var target = AppDeepLink.IsAllowed(to, environment.IsDevelopment()) ? to!.Trim() : AppDeepLink.PaymentResult;
        var href = WebUtility.HtmlEncode(target);
        var html = $$"""
            <!doctype html>
            <html lang="vi">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <meta name="robots" content="noindex">
              <title>SmartMeal</title>
              <style>
                body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
                       font-family: system-ui, sans-serif; background: #f6f8f6; color: #1c2b22; }
                main { max-width: 360px; padding: 24px; text-align: center; }
                a { display: inline-block; margin-top: 16px; padding: 14px 24px; border-radius: 12px;
                    background: #2e9e5b; color: #fff; text-decoration: none; font-weight: 600; }
              </style>
            </head>
            <body>
              <main>
                <h1>Đã gửi lệnh chuyển khoản</h1>
                <p>Quay lại SmartMeal để xem kết quả — gói Pro tự kích hoạt ngay khi tiền vào tài khoản.</p>
                <a href="{{href}}">Quay lại SmartMeal</a>
              </main>
            </body>
            </html>
            """;
        return Content(html, "text/html; charset=utf-8");
    }

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
    /// Webhook của SePay (đăng ký URL này ở my.sepay.vn → WebHooks, kiểu xác thực "API Key"): SePay báo mỗi khoản tiền vào
    /// tài khoản. Sai API key → 401; mọi khoản đã xử lý (kể cả không khớp đơn nào) trả 200 <c>{"success": true}</c> để SePay
    /// không gửi lại.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("sepay-webhook")]
    [RequestSizeLimit(64 * 1024)]
    public async Task<ActionResult<ApiResponse<bool>>> SePayWebhook()
    {
        using var reader = new StreamReader(Request.Body, Encoding.UTF8);
        var body = await reader.ReadToEndAsync();
        var authorization = Request.Headers.Authorization.FirstOrDefault();

        return this.ToActionResult(await _subscriptionService.HandleSePayWebhookAsync(authorization, body));
    }

    /// <summary>
    /// Webhook của PayOS (đăng ký URL này ở my.payos.vn). Chữ ký trong body được xác minh bằng <c>PayOS:ChecksumKey</c>;
    /// sai chữ ký → 401. Webhook thử của PayOS (mã đơn không có trong hệ thống) trả 200.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("payos-webhook")]
    [RequestSizeLimit(64 * 1024)]
    public async Task<ActionResult<ApiResponse<bool>>> PayOSWebhook()
    {
        using var reader = new StreamReader(Request.Body, Encoding.UTF8);
        var body = await reader.ReadToEndAsync();

        return this.ToActionResult(await _subscriptionService.HandlePayOSWebhookAsync(body));
    }

    /// <summary>
    /// Trạng thái giao dịch PayOS/SePay của chính bạn. Đang chờ thì máy chủ hỏi thẳng cổng thanh toán và kích hoạt Pro nếu đã
    /// nhận đủ tiền — app gọi định kỳ khi đang hiện mã QR. Giao dịch của người khác → 404.
    /// </summary>
    [Authorize]
    [HttpGet("check-status/{orderCode:long}")]
    public async Task<ActionResult<ApiResponse<PaymentTransactionStatusDto>>> CheckPaymentStatus(long orderCode)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<PaymentTransactionStatusDto>();

        return this.ToActionResult(await _subscriptionService.CheckPaymentStatusAsync(userId, orderCode));
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
