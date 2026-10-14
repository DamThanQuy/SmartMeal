using Microsoft.EntityFrameworkCore;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.Infrastructure.Services;

/// <summary>
/// Ghi thông báo cho một sự kiện. Dùng INSERT … ON CONFLICT DO NOTHING trên (người dùng, khóa sự kiện) nên đánh giá lại hay
/// chạy đồng thời cũng chỉ ra một thông báo; câu lệnh chạy trong transaction hiện tại của DbContext (nếu có).
/// </summary>
internal static class NotificationWriter
{
    public static async Task<bool> TryAddAsync(ApplicationDbContext db, Guid userId, string category, string title, string body, string dedupKey)
    {
        var inserted = await db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO "UserNotifications" ("Id","UserId","Category","Title","Body","DedupKey","CreatedAt")
            VALUES ({Guid.NewGuid()},{userId},{category},{Truncate(title, 200)},{Truncate(body, 500)},{Truncate(dedupKey, 120)},{DateTime.UtcNow})
            ON CONFLICT ("UserId","DedupKey") DO NOTHING
            """);
        return inserted > 0;
    }

    private static string Truncate(string value, int max) => value.Length <= max ? value : value[..max];
}
