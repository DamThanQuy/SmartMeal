using Microsoft.Extensions.Logging;
using SmartMeal.Application.Services;

namespace SmartMeal.Infrastructure.Services;

internal static class GamificationServiceExtensions
{
    /// <summary>
    /// Đánh giá lại gamification ngay sau một thao tác ghi (ghi món, uống nước, đồng bộ bước, đi chợ) để nhiệm vụ/thử thách vừa
    /// hoàn thành, huy hiệu vừa mở, lên cấp có thông báo ngay lúc đó (đẩy real-time) thay vì đợi lần mở màn kế tiếp.
    /// <paramref name="date"/> là ngày của dữ liệu vừa ghi (gamification tự giới hạn trong ±1 ngày so với UTC). Lỗi ở đây chỉ ghi
    /// log, không được làm hỏng thao tác chính.
    /// </summary>
    public static async Task EvaluateAfterChangeAsync(
        this IGamificationService gamification, ILogger logger, Guid userId, DateOnly? date, string change)
    {
        try
        {
            await gamification.EvaluateAsync(userId, date);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Gamification evaluation failed after a {Change} change for user {UserId}.", change, userId);
        }
    }
}
