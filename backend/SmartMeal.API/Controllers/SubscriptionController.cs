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

/// <summary>
/// Controller quản lý các nghiệp vụ gói thành viên (Subscription), tích hợp cổng thanh toán VietQR (PayOS, SePay),
/// kiểm tra trạng thái thanh toán và quản lý lịch sử giao dịch của người dùng.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class SubscriptionController : ControllerBase
{
    private readonly ISubscriptionService _subscriptionService;

    /// <summary>
    /// Khởi tạo controller với service xử lý subscription.
    /// </summary>
    /// <param name="subscriptionService">Dịch vụ xử lý đăng ký gói, thanh toán và kích hoạt Pro.</param>
    public SubscriptionController(ISubscriptionService subscriptionService)
    {
        _subscriptionService = subscriptionService;
    }

    /// <summary>
    /// Lấy danh sách các gói dịch vụ Premium/Pro khả dụng (tháng, năm) kèm giá niêm yết và đặc quyền.
    /// </summary>
    /// <returns>Danh sách thông tin các gói đăng ký kèm danh sách tính năng.</returns>
    /// <response code="200">Lấy danh sách gói thành công.</response>
    [HttpGet("plans")]
    public async Task<ActionResult<ApiResponse<List<SubscriptionPlanDto>>>> GetPlans() =>
        this.ToActionResult(await _subscriptionService.GetPlansAsync());

    /// <summary>
    /// Tạo phiên thanh toán mới cho gói Pro thông qua phương thức đã chọn (PAYOS hoặc SEPAY).
    /// Sinh mã đơn hàng duy nhất (orderCode) và liên kết thanh toán VietQR.
    /// Gói Pro chỉ được kích hoạt chính thức khi cổng thanh toán xác nhận qua webhook hoặc polling (BR-241/242).
    /// </summary>
    /// <param name="dto">Dữ liệu yêu cầu gồm mã gói đăng ký (PlanId) và phương thức thanh toán (PaymentMethod).</param>
    /// <returns>Thông tin phiên thanh toán gồm URL thanh toán, mã đơn, và chuỗi mã QR.</returns>
    /// <response code="200">Tạo phiên thanh toán thành công.</response>
    /// <response code="401">Người dùng chưa đăng nhập hoặc token không hợp lệ.</response>
    /// <response code="503">Cổng thanh toán được chọn chưa được cấu hình khóa trên máy chủ.</response>
    [Authorize]
    [HttpPost("create-checkout-session")]
    public async Task<ActionResult<ApiResponse<CheckoutSessionResponseDto>>> CreateCheckoutSession([FromBody] CreateCheckoutSessionRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<CheckoutSessionResponseDto>();

        return this.ToActionResult(await _subscriptionService.CreateCheckoutSessionAsync(userId, dto));
    }

    /// <summary>
    /// Chỉ dùng trong môi trường phát triển (Development): Giả lập cổng thanh toán đã nhận tiền và kích hoạt ngay gói Pro.
    /// Môi trường Production sẽ tự động từ chối (404/503).
    /// </summary>
    /// <param name="dto">Thông tin gói muốn kích hoạt thử nghiệm.</param>
    /// <returns>True nếu kích hoạt thành công.</returns>
    /// <response code="200">Kích hoạt thử nghiệm thành công.</response>
    /// <response code="401">Người dùng chưa xác thực.</response>
    [Authorize]
    [HttpPost("activate-mock")]
    public async Task<ActionResult<ApiResponse<bool>>> ActivateMock([FromBody] CreateCheckoutSessionRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<bool>();

        return this.ToActionResult(await _subscriptionService.ActivateProPlanAsync(userId, dto.PlanId));
    }

    /// <summary>
    /// Webhook nhận thông báo chuyển khoản tự động từ cổng SePay (my.sepay.vn).
    /// SePay gửi thông tin mỗi khi có tiền vào tài khoản ngân hàng liên kết.
    /// Máy chủ kiểm tra API Key xác thực, tìm giao dịch khớp mã thanh toán và kích hoạt tài khoản Pro idempotent.
    /// </summary>
    /// <returns>True nếu xử lý webhook thành công (kể cả giao dịch không liên quan để tránh SePay retry vô hạn).</returns>
    /// <response code="200">Xác nhận đã xử lý webhook thành công.</response>
    /// <response code="401">API Key từ header Authorization của SePay không hợp lệ.</response>
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
    /// Webhook nhận thông báo thanh toán thành công từ cổng PayOS (my.payos.vn).
    /// Dữ liệu body được xác thực chữ ký số bằng PayOS Checksum Key để ngăn chặn giả mạo request.
    /// Khi đơn hợp lệ và đủ tiền, hệ thống tự động kích hoạt tài khoản Pro và cập nhật lịch sử giao dịch.
    /// </summary>
    /// <returns>True nếu xác thực chữ ký và ghi nhận thanh toán thành công.</returns>
    /// <response code="200">Ghi nhận webhook PayOS thành công.</response>
    /// <response code="401">Chữ ký webhook PayOS không hợp lệ.</response>
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
    /// Kiểm tra trạng thái thanh toán của một đơn hàng (OrderCode) theo cơ chế Polling từ ứng dụng Mobile.
    /// Nếu giao dịch đang ở trạng thái Pending, máy chủ chủ động truy vấn trực tiếp cổng thanh toán (Server-to-Server)
    /// và kích hoạt tài khoản Pro ngay khi người dùng đã chuyển khoản thành công.
    /// </summary>
    /// <param name="orderCode">Mã định danh đơn hàng 13 chữ số cần kiểm tra.</param>
    /// <returns>Trạng thái chi tiết của giao dịch (Pending, Paid, Cancelled, Expired) và thời điểm thanh toán.</returns>
    /// <response code="200">Truy vấn trạng thái thành công.</response>
    /// <response code="401">Phiên đăng nhập không hợp lệ.</response>
    /// <response code="404">Không tìm thấy đơn hàng hoặc đơn hàng không thuộc về người dùng này.</response>
    [Authorize]
    [HttpGet("check-status/{orderCode:long}")]
    public async Task<ActionResult<ApiResponse<PaymentTransactionStatusDto>>> CheckPaymentStatus(long orderCode)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<PaymentTransactionStatusDto>();

        return this.ToActionResult(await _subscriptionService.CheckPaymentStatusAsync(userId, orderCode));
    }

    /// <summary>
    /// Lấy thông tin trạng thái gói đăng ký hiện tại của người dùng đang đăng nhập (Free hoặc Premium).
    /// </summary>
    /// <returns>Thông tin trạng thái gói Pro, mã gói và ngày hết hạn.</returns>
    /// <response code="200">Lấy trạng thái thành công.</response>
    /// <response code="401">Chưa xác thực người dùng.</response>
    [Authorize]
    [HttpGet("status")]
    public async Task<ActionResult<ApiResponse<SubscriptionStatusDto>>> GetStatus()
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<SubscriptionStatusDto>();

        return this.ToActionResult(await _subscriptionService.GetStatusAsync(userId));
    }

    /// <summary>
    /// Lấy toàn bộ lịch sử các giao dịch nạp tiền, nâng cấp gói Pro của người dùng hiện tại (xếp từ mới nhất đến cũ nhất).
    /// </summary>
    /// <returns>Danh sách các giao dịch thanh toán kèm trạng thái, số tiền và phương thức.</returns>
    /// <response code="200">Lấy danh sách giao dịch thành công.</response>
    /// <response code="401">Phiên đăng nhập không hợp lệ.</response>
    [Authorize]
    [HttpGet("transactions")]
    public async Task<ActionResult<ApiResponse<List<PaymentTransactionDto>>>> GetTransactions()
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<List<PaymentTransactionDto>>();

        return this.ToActionResult(await _subscriptionService.GetTransactionsAsync(userId));
    }

    /// <summary>
    /// Hủy chế độ tự động gia hạn gói Pro: Quyền lợi Pro vẫn được bảo lưu và tiếp tục sử dụng bình thường cho đến khi hết hạn.
    /// </summary>
    /// <returns>Thông tin trạng thái gói sau khi hủy gia hạn.</returns>
    /// <response code="200">Hủy gia hạn thành công.</response>
    /// <response code="401">Chưa xác thực người dùng.</response>
    [Authorize]
    [HttpPost("cancel")]
    public async Task<ActionResult<ApiResponse<SubscriptionStatusDto>>> Cancel()
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<SubscriptionStatusDto>();

        return this.ToActionResult(await _subscriptionService.CancelAsync(userId));
    }
}
