using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.API.Infrastructure;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Notifications;
using SmartMeal.Application.Services;

namespace SmartMeal.API.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;

    public NotificationsController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    /// <summary>
    /// Thông báo của người dùng (mới → cũ) kèm số chưa đọc. Server tạo thông báo từ sự kiện thật: Bé Mầm lên cấp, mở huy hiệu,
    /// hoàn thành thử thách, danh sách đi chợ đã tạo, gói Pro kích hoạt/sắp hết hạn. <c>date</c> (yyyy-MM-dd, ngày theo máy
    /// người dùng) dùng khi đánh giá lại tiến trình Bé Mầm như các endpoint gamification; <c>limit</c> 1–100, mặc định 50.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<NotificationListDto>>> GetNotifications([FromQuery] int? limit, [FromQuery] DateOnly? date)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<NotificationListDto>();
        return this.ToActionResult(await _notificationService.GetNotificationsAsync(userId, limit, date));
    }

    /// <summary>Đánh dấu một thông báo đã đọc (idempotent); thông báo của người khác trả 404.</summary>
    [HttpPatch("{id:guid}/read")]
    public async Task<ActionResult<ApiResponse<NotificationDto>>> MarkRead(Guid id)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<NotificationDto>();
        return this.ToActionResult(await _notificationService.MarkReadAsync(userId, id));
    }

    /// <summary>Đánh dấu đã đọc tất cả thông báo; trả số thông báo vừa được đánh dấu.</summary>
    [HttpPost("read-all")]
    public async Task<ActionResult<ApiResponse<MarkAllNotificationsReadResultDto>>> MarkAllRead()
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<MarkAllNotificationsReadResultDto>();
        return this.ToActionResult(await _notificationService.MarkAllReadAsync(userId));
    }
}
