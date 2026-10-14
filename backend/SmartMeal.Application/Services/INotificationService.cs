using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Notifications;

namespace SmartMeal.Application.Services;

public interface INotificationService
{
    Task<ApiResponse<NotificationListDto>> GetNotificationsAsync(Guid userId, int? limit, DateOnly? date);
    Task<ApiResponse<NotificationDto>> MarkReadAsync(Guid userId, Guid notificationId);
    Task<ApiResponse<MarkAllNotificationsReadResultDto>> MarkAllReadAsync(Guid userId);
}
