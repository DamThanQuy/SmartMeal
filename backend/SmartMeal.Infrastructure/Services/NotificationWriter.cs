using Microsoft.EntityFrameworkCore;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.Infrastructure.Services;

/// <summary>
/// Ghi thông báo cho một sự kiện. Dùng INSERT … ON CONFLICT DO NOTHING trên (người dùng, khóa sự kiện) nên đánh giá lại hay
/// chạy đồng thời cũng chỉ ra một thông báo; câu lệnh chạy trong transaction hiện tại của DbContext (nếu có). Thông báo mới được
/// đẩy real-time tới app qua <see cref="NotificationDispatcher"/> (trong transaction thì đợi commit).
/// </summary>
public sealed class NotificationWriter
{
    private readonly ApplicationDbContext _db;
    private readonly NotificationDispatcher _dispatcher;

    public NotificationWriter(ApplicationDbContext db, NotificationDispatcher dispatcher)
    {
        _db = db;
        _dispatcher = dispatcher;
    }

    public async Task<bool> TryAddAsync(Guid userId, string category, string title, string body, string dedupKey)
    {
        var now = DateTime.UtcNow;
        var notification = new UserNotification
        {
            UserId = userId,
            Category = category,
            Title = Truncate(title, 200),
            Body = Truncate(body, 500),
            DedupKey = Truncate(dedupKey, 120),
            // PostgreSQL lưu tới microsecond: cắt trước để bản đẩy real-time trùng khớp bản trong database.
            CreatedAt = new DateTime(now.Ticks - now.Ticks % 10, DateTimeKind.Utc)
        };

        var inserted = await _db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO "UserNotifications" ("Id","UserId","Category","Title","Body","DedupKey","CreatedAt")
            VALUES ({notification.Id},{notification.UserId},{notification.Category},{notification.Title},{notification.Body},{notification.DedupKey},{notification.CreatedAt})
            ON CONFLICT ("UserId","DedupKey") DO NOTHING
            """);
        if (inserted == 0) return false;

        await _dispatcher.DispatchAsync(_db.Database, userId, NotificationService.ToDto(notification));
        return true;
    }

    private static string Truncate(string value, int max) => value.Length <= max ? value : value[..max];
}
