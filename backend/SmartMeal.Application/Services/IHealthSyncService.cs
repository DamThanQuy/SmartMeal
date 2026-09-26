using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.HealthSync;

namespace SmartMeal.Application.Services;

public interface IHealthSyncService
{
    Task<ApiResponse<SyncHealthMetricsResponseDto>> SyncStepsAndCaloriesAsync(Guid userId, SyncHealthMetricsRequestDto dto);
    Task<ApiResponse<DailyHealthSyncSummaryDto>> GetDailySummaryAsync(Guid userId, DateOnly date);
}
