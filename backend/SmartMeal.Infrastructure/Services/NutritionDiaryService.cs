using Microsoft.EntityFrameworkCore;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Diary;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.Infrastructure.Services;

public class NutritionDiaryService : INutritionDiaryService
{
    private readonly ApplicationDbContext _db;

    public NutritionDiaryService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<ApiResponse<DiaryItemDto>> LogMealAsync(Guid userId, LogMealRequestDto dto)
    {
        var diary = await _db.NutritionDiaries
            .Include(nd => nd.Items)
            .FirstOrDefaultAsync(nd => nd.UserId == userId && nd.LogDate == dto.LogDate && nd.MealType == dto.MealType);

        if (diary == null)
        {
            diary = new NutritionDiary
            {
                UserId = userId,
                LogDate = dto.LogDate,
                MealType = dto.MealType
            };
            _db.NutritionDiaries.Add(diary);
        }

        var item = new DiaryItem
        {
            NutritionDiary = diary,
            FoodName = dto.FoodName.Trim(),
            RecipeId = dto.RecipeId,
            IngredientId = dto.IngredientId,
            ServingSize = dto.ServingSize,
            Unit = dto.Unit,
            Calories = dto.Calories,
            CarbsGrams = dto.CarbsGrams,
            FatGrams = dto.FatGrams,
            ProteinGrams = dto.ProteinGrams,
            LogMethod = dto.LogMethod,
            ImageUrl = dto.ImageUrl
        };

        _db.DiaryItems.Add(item);
        await _db.SaveChangesAsync();

        var resultDto = new DiaryItemDto
        {
            Id = item.Id,
            FoodName = item.FoodName,
            ServingSize = item.ServingSize,
            Unit = item.Unit,
            Calories = item.Calories,
            CarbsGrams = item.CarbsGrams,
            FatGrams = item.FatGrams,
            ProteinGrams = item.ProteinGrams,
            LogMethod = item.LogMethod
        };

        return ApiResponse<DiaryItemDto>.Ok(resultDto, "Ghi nhận bữa ăn thành công.");
    }

    public async Task<ApiResponse<DailyDiarySummaryDto>> GetDailySummaryAsync(Guid userId, DateOnly date)
    {
        var profile = await _db.HealthProfiles.AsNoTracking().FirstOrDefaultAsync(hp => hp.UserId == userId);

        var diaries = await _db.NutritionDiaries
            .Include(nd => nd.Items)
            .Where(nd => nd.UserId == userId && nd.LogDate == date)
            .AsNoTracking()
            .ToListAsync();

        var allItems = diaries.SelectMany(d => d.Items).ToList();

        var summary = new DailyDiarySummaryDto
        {
            Date = date,
            TotalCalories = allItems.Sum(i => i.Calories),
            TotalCarbs = allItems.Sum(i => i.CarbsGrams),
            TotalFat = allItems.Sum(i => i.FatGrams),
            TotalProtein = allItems.Sum(i => i.ProteinGrams),
            TargetCalories = profile?.DailyCaloriesTarget ?? 2000,
            TargetCarbs = profile?.DailyCarbsTargetGrams ?? 250,
            TargetFat = profile?.DailyFatTargetGrams ?? 55,
            TargetProtein = profile?.DailyProteinTargetGrams ?? 125,
            Meals = new List<string> { "Breakfast", "Lunch", "Dinner", "Snack" }
                .Select(mealType =>
                {
                    var matching = diaries.FirstOrDefault(d => d.MealType.Equals(mealType, StringComparison.OrdinalIgnoreCase));
                    var items = matching?.Items.Select(i => new DiaryItemDto
                    {
                        Id = i.Id,
                        FoodName = i.FoodName,
                        ServingSize = i.ServingSize,
                        Unit = i.Unit,
                        Calories = i.Calories,
                        CarbsGrams = i.CarbsGrams,
                        FatGrams = i.FatGrams,
                        ProteinGrams = i.ProteinGrams,
                        LogMethod = i.LogMethod
                    }).ToList() ?? new List<DiaryItemDto>();

                    return new MealGroupDto
                    {
                        MealType = mealType,
                        SubtotalCalories = items.Sum(i => i.Calories),
                        Items = items
                    };
                }).ToList()
        };

        return ApiResponse<DailyDiarySummaryDto>.Ok(summary);
    }

    public async Task<ApiResponse<WeeklyProgressDto>> GetWeeklyProgressAsync(Guid userId, DateOnly startDate)
    {
        var endDate = startDate.AddDays(6);
        var profile = await _db.HealthProfiles.AsNoTracking().FirstOrDefaultAsync(hp => hp.UserId == userId);

        var diaries = await _db.NutritionDiaries
            .Include(nd => nd.Items)
            .Where(nd => nd.UserId == userId && nd.LogDate >= startDate && nd.LogDate <= endDate)
            .AsNoTracking()
            .ToListAsync();

        var days = new List<DailyProgressPointDto>();
        for (int i = 0; i < 7; i++)
        {
            var curDate = startDate.AddDays(i);
            var dayDiaries = diaries.Where(d => d.LogDate == curDate).ToList();
            var dayCalories = dayDiaries.SelectMany(d => d.Items).Sum(item => item.Calories);

            days.Add(new DailyProgressPointDto
            {
                Date = curDate,
                DayOfWeek = curDate.DayOfWeek.ToString(),
                Calories = dayCalories,
                TargetCalories = profile?.DailyCaloriesTarget ?? 2000
            });
        }

        return ApiResponse<WeeklyProgressDto>.Ok(new WeeklyProgressDto { Days = days });
    }

    public async Task<ApiResponse<bool>> DeleteDiaryItemAsync(Guid userId, Guid itemId)
    {
        var item = await _db.DiaryItems
            .Include(i => i.NutritionDiary)
            .FirstOrDefaultAsync(i => i.Id == itemId && i.NutritionDiary.UserId == userId);

        if (item == null) return ApiResponse<bool>.Fail("Không tìm thấy mục nhật ký dinh dưỡng cần xóa.");

        _db.DiaryItems.Remove(item);
        await _db.SaveChangesAsync();

        return ApiResponse<bool>.Ok(true, "Xóa thành công.");
    }
}
