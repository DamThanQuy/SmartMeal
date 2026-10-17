using SmartMeal.Application.DTOs.Auth;
using SmartMeal.Domain.Entities;

namespace SmartMeal.Infrastructure.Services;

/// <summary>
/// Lớp hỗ trợ ánh xạ thực thể người dùng <see cref="User"/> sang <see cref="UserDto"/>.
/// Quyền gói Pro và trạng thái đăng ký hội viên luôn được tính toán động theo thời điểm hiện tại.
/// </summary>
internal static class UserMapper
{
    /// <summary>
    /// Chuyển đổi thực thể người dùng <see cref="User"/> thành đối tượng truyền tải dữ liệu <see cref="UserDto"/>.
    /// </summary>
    /// <param name="user">Thực thể người dùng trong cơ sở dữ liệu.</param>
    /// <param name="hasCompletedSurvey">Cờ đánh dấu người dùng đã hoàn thành khảo sát sức khỏe ban đầu hay chưa.</param>
    /// <param name="now">Thời điểm hiện tại dùng để đối chiếu thời hạn gói Pro (mặc định lấy thời điểm UTC hiện tại).</param>
    /// <returns>Đối tượng <see cref="UserDto"/> chứa thông tin hồ sơ và quyền hạn của người dùng.</returns>
    public static UserDto ToDto(User user, bool hasCompletedSurvey, DateTime? now = null)
    {
        var at = now ?? DateTime.UtcNow;
        return new UserDto
        {
            Id = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            AvatarUrl = user.AvatarUrl,
            IsPro = user.IsProActive(at),
            SubscriptionStatus = user.EffectiveSubscriptionStatus(at),
            ProExpiresAt = user.ProExpiresAt,
            Role = user.Role,
            HasCompletedSurvey = hasCompletedSurvey,
            HasPassword = !string.IsNullOrEmpty(user.PasswordHash)
        };
    }
}
