using Microsoft.Extensions.Logging;
using SmartMeal.Application.Services;

namespace SmartMeal.Infrastructure.Services;

internal static class GamificationServiceExtensions
{
    /// <summary>
    /// Đánh giá lại gamification ngay sau một thao tác ghi (ghi món, uống nước, đồng bộ bước, đi chợ) để nhiệm vụ/thử thách vừa
    /// hoàn thành, huy hiệu vừa mở, lên cấp có thông báo ngay lúc đó (đẩy real-time) thay vì đợi lần mở màn kế tiếp.
    /// Lỗi phát sinh trong quá trình đánh giá chỉ ghi log cảnh báo và không làm gián đoạn thao tác nghiệp vụ chính.
    /// </summary>
    /// <param name="gamification">Dịch vụ gamification được mở rộng.</param>
    /// <param name="logger">Logger ghi nhận cảnh báo nếu xảy ra ngoại lệ.</param>
    /// <param name="userId">Định danh người dùng vừa phát sinh thay đổi dữ liệu.</param>
    /// <param name="date">Ngày của dữ liệu vừa ghi (gamification tự giới hạn trong ±1 ngày so với UTC).</param>
    /// <param name="change">Tên loại thao tác vừa ghi (vd: "water", "diary", "step", "grocery").</param>
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
