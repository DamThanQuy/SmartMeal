using Microsoft.EntityFrameworkCore;
using SmartMeal.Application.Common;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Notifications;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.Infrastructure.Services;

/// <summary>
/// Thông báo trong ứng dụng. Thông báo được tạo tại nơi xảy ra sự kiện (lên cấp, huy hiệu, thử thách — GamificationService;
/// danh sách đi chợ — GroceryService; kích hoạt Pro — SubscriptionService). Khi đọc danh sách, server đánh giá lại tiến trình
/// Bé Mầm (lazy, idempotent) và hạn gói Pro để thông báo mới nhất luôn có mặt, rồi dọn thông báo quá cũ.
/// </summary>
public class NotificationService : INotificationService
{
    public const int DefaultLimit = 50;
    public const int MaxLimit = 100;

    /// <summary>Thông báo cũ hơn số ngày này bị xóa khi đọc danh sách.</summary>
    public const int RetentionDays = 90;

    /// <summary>Báo "Pro sắp hết hạn" khi còn ít hơn hoặc bằng số ngày này.</summary>
    public const int ExpiryWarningDays = 3;

    private readonly ApplicationDbContext _db;
    private readonly IGamificationService _gamification;
    private readonly NotificationWriter _notifications;

    public NotificationService(ApplicationDbContext db, IGamificationService gamification, NotificationWriter notifications)
    {
        _db = db;
        _gamification = gamification;
        _notifications = notifications;
    }

    public async Task<ApiResponse<NotificationListDto>> GetNotificationsAsync(Guid userId, int? limit, DateOnly? date)
    {
        if (limit is < 1 or > MaxLimit)
        {
            return ApiResponse<NotificationListDto>.Fail($"limit phải từ 1 đến {MaxLimit}.");
        }

        var now = DateTime.UtcNow;
        await _gamification.EvaluateAsync(userId, date);
        await NotifySubscriptionExpiringAsync(userId, now);

        var cutoff = now.AddDays(-RetentionDays);
        await _db.UserNotifications.Where(n => n.UserId == userId && n.CreatedAt < cutoff).ExecuteDeleteAsync();

        var items = await _db.UserNotifications.AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt).ThenBy(n => n.Id)
            .Take(limit ?? DefaultLimit)
            .ToListAsync();
        var unread = await _db.UserNotifications.CountAsync(n => n.UserId == userId && n.ReadAt == null);

        return ApiResponse<NotificationListDto>.Ok(
            new NotificationListDto { Items = items.Select(ToDto).ToList(), UnreadCount = unread },
            "Lấy danh sách thông báo thành công.");
    }

    public async Task<ApiResponse<NotificationDto>> MarkReadAsync(Guid userId, Guid notificationId)
    {
        var notification = await _db.UserNotifications.FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);
        if (notification is null)
        {
            return ApiResponse<NotificationDto>.Fail("Không tìm thấy thông báo.", null, ApiErrorKind.NotFound);
        }

        if (notification.ReadAt is null)
        {
            notification.ReadAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        return ApiResponse<NotificationDto>.Ok(ToDto(notification), "Đã đánh dấu đã đọc.");
    }

    public async Task<ApiResponse<MarkAllNotificationsReadResultDto>> MarkAllReadAsync(Guid userId)
    {
        var now = DateTime.UtcNow;
        var updated = await _db.UserNotifications
            .Where(n => n.UserId == userId && n.ReadAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.ReadAt, now));

        return ApiResponse<MarkAllNotificationsReadResultDto>.Ok(
            new MarkAllNotificationsReadResultDto { Updated = updated },
            "Đã đánh dấu đọc tất cả thông báo.");
    }

    /// <summary>Gói Pro còn hiệu lực nhưng sắp hết hạn: báo một lần cho mỗi ngày hết hạn (gia hạn thì ngày đổi → báo lại sau).</summary>
    private async Task NotifySubscriptionExpiringAsync(Guid userId, DateTime now)
    {
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null || !user.IsProActive(now) || user.ProExpiresAt is not { } expiresAt) return;

        var remaining = expiresAt - now;
        if (remaining > TimeSpan.FromDays(ExpiryWarningDays)) return;

        var days = Math.Max(1, (int)Math.Ceiling(remaining.TotalDays));
        var cancelled = user.EffectiveSubscriptionStatus(now) == SubscriptionStatuses.Cancelled;
        var body = cancelled
            ? $"Bạn đã hủy gia hạn. Tính năng Pro kết thúc sau {days} ngày nữa."
            : $"Gói Pro hết hạn sau {days} ngày nữa. Gia hạn để không bị gián đoạn tính năng Pro.";

        await _notifications.TryAddAsync(userId, NotificationCategories.Premium, "Gói Pro sắp hết hạn", body,
            $"subscription-expiring-{expiresAt:yyyyMMddHHmm}");
    }

    internal static NotificationDto ToDto(UserNotification n) => new()
    {
        Id = n.Id,
        Category = n.Category,
        Title = n.Title,
        Body = n.Body,
        CreatedAt = DateTime.SpecifyKind(n.CreatedAt, DateTimeKind.Utc),
        IsRead = n.ReadAt is not null
    };
}
