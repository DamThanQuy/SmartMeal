using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.MealPlanner;

namespace SmartMeal.Application.Services;

public interface IMealPlannerService
{
    Task<ApiResponse<WeeklyMealPlanDto>> GetWeeklyPlanAsync(Guid userId, DateOnly startDate);
    Task<ApiResponse<PlannedMealItemDto>> AssignMealAsync(Guid userId, AssignMealPlanRequestDto dto);
    Task<ApiResponse<bool>> DeleteMealPlanItemAsync(Guid userId, Guid mealPlanId);
    Task<ApiResponse<WeeklyMealPlanDto>> AutoGenerateWeeklyPlanAsync(Guid userId, AutoGeneratePlanRequestDto dto);
}
