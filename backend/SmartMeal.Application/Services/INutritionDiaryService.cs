using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Diary;

namespace SmartMeal.Application.Services;

public interface INutritionDiaryService
{
    Task<ApiResponse<DiaryItemDto>> LogMealAsync(Guid userId, LogMealRequestDto dto);
    Task<ApiResponse<List<DiaryItemDto>>> LogMealBatchAsync(Guid userId, LogMealBatchRequestDto dto);
    Task<ApiResponse<DiaryItemDto>> UpdateDiaryItemAsync(Guid userId, Guid itemId, UpdateDiaryItemRequestDto dto);
    Task<ApiResponse<DailyDiarySummaryDto>> GetDailySummaryAsync(Guid userId, DateOnly date);
    Task<ApiResponse<WeeklyProgressDto>> GetWeeklyProgressAsync(Guid userId, DateOnly startDate);
    Task<ApiResponse<bool>> DeleteDiaryItemAsync(Guid userId, Guid itemId);
    Task<ApiResponse<WaterSummaryDto>> LogWaterAsync(Guid userId, LogWaterRequestDto dto);
    Task<ApiResponse<WaterHistoryDto>> GetWaterHistoryAsync(Guid userId, DateOnly endDate, int days);
    Task<ApiResponse<WaterSummaryDto>> DeleteWaterEntryAsync(Guid userId, Guid entryId);
}
