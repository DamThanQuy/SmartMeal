using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Health;

namespace SmartMeal.Application.Services;

public interface IHealthProfileService
{
    Task<ApiResponse<HealthProfileDto>> SubmitSurveyAsync(Guid userId, HealthSurveyRequestDto dto);
    Task<ApiResponse<HealthProfileDto>> GetProfileAsync(Guid userId);
    Task<ApiResponse<WeightPointDto>> LogWeightAsync(Guid userId, WeightLogRequestDto dto);
    Task<ApiResponse<WeightHistoryResponseDto>> GetWeightHistoryAsync(Guid userId);
}
