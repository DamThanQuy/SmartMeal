using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Health;

namespace SmartMeal.Application.Services;

public interface IHealthProfileService
{
    Task<ApiResponse<HealthProfileDto>> SubmitSurveyAsync(Guid userId, HealthSurveyRequestDto dto);
    Task<ApiResponse<HealthProfileDto>> UpdateProfileAsync(Guid userId, UpdateHealthProfileRequestDto dto);
    Task<ApiResponse<HealthProfileDto>> GetProfileAsync(Guid userId);
    Task<ApiResponse<WeightPointDto>> LogWeightAsync(Guid userId, WeightLogRequestDto dto);
    /// <summary><paramref name="days"/>: chỉ lấy các lần ghi trong N ngày gần nhất (null = tất cả). Cân nặng ban đầu vẫn tính trên toàn bộ lịch sử.</summary>
    Task<ApiResponse<WeightHistoryResponseDto>> GetWeightHistoryAsync(Guid userId, int? days = null);
}
