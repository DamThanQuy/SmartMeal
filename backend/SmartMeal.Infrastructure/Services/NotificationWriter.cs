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

    /// <summary>
    /// Khởi tạo instance mới của <see cref="NotificationWriter"/>.
    /// </summary>
    /// <param name="db">DbContext kết nối cơ sở dữ liệu ứng dụng.</param>
    /// <param name="dispatcher">Dịch vụ phân phối thông báo đẩy real-time tới thiết bị người dùng.</param>
    public NotificationWriter(ApplicationDbContext db, NotificationDispatcher dispatcher)
    {
        _db = db;
        _dispatcher = dispatcher;
    }

    /// <summary>
    /// Thử ghi một thông báo mới cho người dùng với cơ chế loại bỏ trùng lặp (DedupKey).
    /// Áp dụng câu lệnh INSERT ... ON CONFLICT DO NOTHING trên cặp (UserId, DedupKey), đảm bảo dù có gọi nhiều lần đồng thời
    /// cũng chỉ sinh đúng một thông báo duy nhất, sau đó phát thông báo real-time qua dispatcher.
    /// </summary>
    /// <param name="userId">Định danh người dùng nhận thông báo.</param>
    /// <param name="category">Phân loại thông báo (Badge, Challenge, Grocery, Pet, Premium,...).</param>
    /// <param name="title">Tiêu đề thông báo (tối đa 200 ký tự).</param>
    /// <param name="body">Nội dung chi tiết thông báo (tối đa 500 ký tự).</param>
    /// <param name="dedupKey">Khóa chống trùng lặp sự kiện (tối đa 120 ký tự).</param>
    /// <returns>True nếu thông báo mới được thêm thành công; False nếu thông báo đã tồn tại từ trước.</returns>
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

    /// <summary>Cắt chuỗi ngắn lại nếu vượt quá độ dài tối đa cho phép của cột trong cơ sở dữ liệu.</summary>
    private static string Truncate(string value, int max) => value.Length <= max ? value : value[..max];
}
