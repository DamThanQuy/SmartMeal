using SmartMeal.Application.DTOs.Notifications;

namespace SmartMeal.Application.Services;

/// <summary>
/// Đẩy thông báo vừa tạo tới mọi thiết bị đang mở app của người dùng (real-time). Người dùng không kết nối thì không nhận gì —
/// thông báo vẫn nằm trong database và app đọc lại qua GET /api/notifications.
/// </summary>
public interface INotificationPublisher
{
    Task PublishAsync(Guid userId, NotificationDto notification, CancellationToken cancellationToken = default);
}
