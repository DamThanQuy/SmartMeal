using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Gamification;

namespace SmartMeal.Application.Services;

/// <summary>
/// Gamification: XP/cấp độ, nhiệm vụ ngày, thử thách, huy hiệu, trang phục. Các hàm nhận <c>date</c> là "hôm nay" theo
/// múi giờ của người dùng (client gửi ngày địa phương); mặc định là ngày UTC và luôn bị giới hạn trong ±1 ngày so với UTC
/// để không thể nhận XP của những ngày xa.
/// </summary>
public interface IGamificationService
{
    Task<ApiResponse<HealthPetStatusDto>> GetPetStatusAsync(Guid userId, DateOnly? date = null);
    Task<ApiResponse<StreakStatusDto>> GetStreakStatusAsync(Guid userId, DateOnly? date = null);
    Task<ApiResponse<List<ChallengeDto>>> GetChallengesAsync(Guid userId, DateOnly? date = null);
    Task<ApiResponse<ChallengeDto>> JoinChallengeAsync(Guid userId, Guid challengeId, DateOnly? date = null);
    Task<ApiResponse<BadgesSummaryDto>> GetBadgesAsync(Guid userId, DateOnly? date = null);

    /// <summary>Mặc trang phục đã mở; <paramref name="costumeId"/> = null để cởi.</summary>
    Task<ApiResponse<BadgesSummaryDto>> EquipCostumeAsync(Guid userId, string? costumeId, DateOnly? date = null);

    /// <summary>Cộng XP cho việc đã làm, cập nhật tiến độ thử thách và mở huy hiệu mới. Chạy lại bao nhiêu lần cũng không cộng trùng.</summary>
    Task EvaluateAsync(Guid userId, DateOnly? date = null);
}
