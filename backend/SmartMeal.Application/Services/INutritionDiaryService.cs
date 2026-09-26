using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Diary;

namespace SmartMeal.Application.Services;

public interface INutritionDiaryService
{
    Task<ApiResponse<DiaryItemDto>> LogMealAsync(Guid userId, LogMealRequestDto dto);
    Task<ApiResponse<DailyDiarySummaryDto>> GetDailySummaryAsync(Guid userId, DateOnly date);
    Task<ApiResponse<WeeklyProgressDto>> GetWeeklyProgressAsync(Guid userId, DateOnly startDate);
    Task<ApiResponse<bool>> DeleteDiaryItemAsync(Guid userId, Guid itemId);
    Task<ApiResponse<WaterSummaryDto>> LogWaterAsync(Guid userId, LogWaterRequestDto dto);
}
