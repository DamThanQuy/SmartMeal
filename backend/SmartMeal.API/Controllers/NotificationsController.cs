using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.API.Infrastructure;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Notifications;
using SmartMeal.Application.Services;

namespace SmartMeal.API.Controllers;

/// <summary>
/// Controller quản lý thông báo nội bộ ứng dụng (In-app Notifications):
/// - Danh sách thông báo theo dòng sự kiện thời gian thực (Bé Mầm lên cấp, đạt thành tựu huy hiệu, hoàn thành thử thách, nhắc nhở uống nước, thông báo kích hoạt/gia hạn gói Pro).
/// - Đếm số lượng thông báo chưa đọc (Unread Count badge).
/// - Đánh dấu đã đọc một thông báo hoặc toàn bộ danh sách thông báo.
/// Yêu cầu xác thực tài khoản người dùng qua Bearer Token.
/// </summary>
[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;

    /// <summary>
    /// Khởi tạo instance mới của <see cref="NotificationsController"/>.
    /// </summary>
    /// <param name="notificationService">Dịch vụ quản trị thông báo người dùng và xử lý đánh dấu đã đọc.</param>
    public NotificationsController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    /// <summary>
    /// Lấy danh sách thông báo của người dùng hiện tại (sắp xếp theo thứ tự mới nhất lên đầu):
    /// - Bao gồm tổng số lượng thông báo và số lượng thông báo chưa đọc.
    /// - Khi gọi endpoint này kèm tham số ngày, hệ thống sẽ đồng thời kiểm tra và tạo thông báo nếu có thành tựu Pet/Nhiệm vụ mới hoàn thành.
    /// </summary>
    /// <param name="limit">Số lượng thông báo tối đa muốn lấy (từ 1 đến 100 bản ghi; mặc định là 50).</param>
    /// <param name="date">Ngày tham chiếu theo múi giờ client (yyyy-MM-dd) phục vụ đồng bộ sự kiện Gamification.</param>
    /// <returns>Đối tượng <see cref="NotificationListDto"/> chứa danh sách thông báo và số lượng chưa đọc.</returns>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<NotificationListDto>>> GetNotifications([FromQuery] int? limit, [FromQuery] DateOnly? date)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<NotificationListDto>();
        return this.ToActionResult(await _notificationService.GetNotificationsAsync(userId, limit, date));
    }

    /// <summary>
    /// Đánh dấu một thông báo cụ thể là đã đọc:
    /// - Thao tác mang tính idempotent: Gọi nhiều lần không làm thay đổi trạng thái.
    /// - Kiểm tra quyền sở hữu: Người dùng chỉ được phép đánh dấu thông báo của chính mình, trả về 404 Not Found nếu ID không tồn tại hoặc thuộc người khác.
    /// </summary>
    /// <param name="id">Mã định danh duy nhất (GUID) của thông báo cần cập nhật.</param>
    /// <returns>Đối tượng <see cref="NotificationDto"/> với trạng thái IsRead = true.</returns>
    [HttpPatch("{id:guid}/read")]
    public async Task<ActionResult<ApiResponse<NotificationDto>>> MarkRead(Guid id)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<NotificationDto>();
        return this.ToActionResult(await _notificationService.MarkReadAsync(userId, id));
    }

    /// <summary>
    /// Đánh dấu toàn bộ thông báo chưa đọc của người dùng thành đã đọc trong một thao tác duy nhất:
    /// Trả về số lượng bản ghi vừa được cập nhật trạng thái thành công.
    /// </summary>
    /// <returns>Đối tượng <see cref="MarkAllNotificationsReadResultDto"/> báo cáo số lượng thông báo đã đọc.</returns>
    [HttpPost("read-all")]
    public async Task<ActionResult<ApiResponse<MarkAllNotificationsReadResultDto>>> MarkAllRead()
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<MarkAllNotificationsReadResultDto>();
        return this.ToActionResult(await _notificationService.MarkAllReadAsync(userId));
    }
}
