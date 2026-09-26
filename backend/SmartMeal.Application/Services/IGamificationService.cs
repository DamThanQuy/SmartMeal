using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Gamification;

namespace SmartMeal.Application.Services;

public interface IGamificationService
{
    Task<ApiResponse<HealthPetStatusDto>> GetPetStatusAsync(Guid userId);
    Task<ApiResponse<StreakStatusDto>> GetStreakStatusAsync(Guid userId);
    Task<ApiResponse<List<ChallengeDto>>> GetChallengesAsync(Guid userId);
    Task<ApiResponse<ChallengeDto>> JoinChallengeAsync(Guid userId, Guid challengeId);
}
