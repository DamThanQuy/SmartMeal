using SmartMeal.Application.DTOs.Auth;
using SmartMeal.Domain.Entities;

namespace SmartMeal.Infrastructure.Services;

/// <summary>Ánh xạ người dùng sang DTO; quyền Pro luôn tính theo hạn dùng tại thời điểm gọi.</summary>
internal static class UserMapper
{
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
            HasCompletedSurvey = hasCompletedSurvey
        };
    }
}
