using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.MealPlanner;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.Infrastructure.Services;

public class MealPlannerService : IMealPlannerService
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<MealPlannerService> _logger;

    public MealPlannerService(ApplicationDbContext db, ILogger<MealPlannerService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<ApiResponse<WeeklyMealPlanDto>> GetWeeklyPlanAsync(Guid userId, DateOnly startDate)
    {
        var endDate = startDate.AddDays(6);

        // 1. Get user health profile for target calories
        var profile = await _db.HealthProfiles.FirstOrDefaultAsync(hp => hp.UserId == userId);
        double targetCalories = profile?.DailyCaloriesTarget ?? 2000.0;

        // 2. Fetch all meal plans in the 7-day range
        var mealPlans = await _db.MealPlans
            .Include(mp => mp.Recipe)
            .Where(mp => mp.UserId == userId && mp.PlanDate >= startDate && mp.PlanDate <= endDate)
            .ToListAsync();

        var weeklyDto = new WeeklyMealPlanDto
        {
            StartDate = startDate,
            EndDate = endDate,
            TargetDailyCalories = targetCalories,
            Days = new List<DailyPlanDto>()
        };

        for (int i = 0; i < 7; i++)
        {
            var currentDate = startDate.AddDays(i);
            var dayPlans = mealPlans.Where(mp => mp.PlanDate == currentDate).ToList();

            var dayDto = new DailyPlanDto
            {
                Date = currentDate,
                DayOfWeek = GetVietnameseDayOfWeek(currentDate.DayOfWeek),
                TotalCalories = Math.Round(dayPlans.Sum(p => p.Recipe.CaloriesPerServing), 1),
                TotalCarbs = Math.Round(dayPlans.Sum(p => p.Recipe.CarbsPerServing), 1),
                TotalProtein = Math.Round(dayPlans.Sum(p => p.Recipe.ProteinPerServing), 1),
                TotalFat = Math.Round(dayPlans.Sum(p => p.Recipe.FatPerServing), 1),
                Meals = dayPlans.Select(p => new PlannedMealItemDto
                {
                    MealPlanId = p.Id,
                    MealType = p.MealType,
                    RecipeId = p.RecipeId,
                    RecipeTitle = p.Recipe.Title,
                    RecipeImageUrl = p.Recipe.ImageUrl,
                    Calories = p.Recipe.CaloriesPerServing,
                    Carbs = p.Recipe.CarbsPerServing,
                    Protein = p.Recipe.ProteinPerServing,
                    Fat = p.Recipe.FatPerServing,
                    CookingTimeMinutes = p.Recipe.PrepTimeMinutes + p.Recipe.CookTimeMinutes,
                    IsCompleted = p.IsCompleted
                }).ToList()
            };

            weeklyDto.Days.Add(dayDto);
        }

        return ApiResponse<WeeklyMealPlanDto>.Ok(weeklyDto, "Lấy thực đơn tuần thành công.");
    }

    public async Task<ApiResponse<PlannedMealItemDto>> AssignMealAsync(Guid userId, AssignMealPlanRequestDto dto)
    {
        var recipe = await _db.Recipes.FirstOrDefaultAsync(r => r.Id == dto.RecipeId);
        if (recipe == null)
        {
            return ApiResponse<PlannedMealItemDto>.Fail("Không tìm thấy công thức món ăn yêu cầu.");
        }

        var existingPlan = await _db.MealPlans
            .FirstOrDefaultAsync(mp => mp.UserId == userId && mp.PlanDate == dto.PlanDate && mp.MealType == dto.MealType);

        if (existingPlan != null)
        {
            existingPlan.RecipeId = dto.RecipeId;
            existingPlan.IsCompleted = false;
        }
        else
        {
            existingPlan = new MealPlan
            {
                UserId = userId,
                PlanDate = dto.PlanDate,
                MealType = dto.MealType,
                RecipeId = dto.RecipeId,
                IsCompleted = false
            };
            await _db.MealPlans.AddAsync(existingPlan);
        }

        await _db.SaveChangesAsync();

        var resultDto = new PlannedMealItemDto
        {
            MealPlanId = existingPlan.Id,
            MealType = existingPlan.MealType,
            RecipeId = recipe.Id,
            RecipeTitle = recipe.Title,
            RecipeImageUrl = recipe.ImageUrl,
            Calories = recipe.CaloriesPerServing,
            Carbs = recipe.CarbsPerServing,
            Protein = recipe.ProteinPerServing,
            Fat = recipe.FatPerServing,
            CookingTimeMinutes = recipe.PrepTimeMinutes + recipe.CookTimeMinutes,
            IsCompleted = existingPlan.IsCompleted
        };

        return ApiResponse<PlannedMealItemDto>.Ok(resultDto, $"Đã xếp món '{recipe.Title}' vào bữa {dto.MealType} ngày {dto.PlanDate:yyyy-MM-dd}.");
    }

    public async Task<ApiResponse<bool>> DeleteMealPlanItemAsync(Guid userId, Guid mealPlanId)
    {
        var plan = await _db.MealPlans.FirstOrDefaultAsync(mp => mp.Id == mealPlanId && mp.UserId == userId);
        if (plan == null)
        {
            return ApiResponse<bool>.Fail("Không tìm thấy món ăn trong thực đơn đã chọn.");
        }

        _db.MealPlans.Remove(plan);
        await _db.SaveChangesAsync();

        return ApiResponse<bool>.Ok(true, "Đã xóa món ăn khỏi thực đơn.");
    }

    public async Task<ApiResponse<WeeklyMealPlanDto>> AutoGenerateWeeklyPlanAsync(Guid userId, AutoGeneratePlanRequestDto dto)
    {
        var startDate = dto.StartDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var endDate = startDate.AddDays(6);

        // 1. Get user health profile
        var profile = await _db.HealthProfiles
            .Include(hp => hp.UserAllergies).ThenInclude(ua => ua.Allergy)
            .Include(hp => hp.UserConditions).ThenInclude(uc => uc.MedicalCondition)
            .FirstOrDefaultAsync(hp => hp.UserId == userId);

        var userAllergyIds = profile?.UserAllergies.Select(ua => ua.AllergyId).ToHashSet() ?? new HashSet<int>();

        // 2. Query all recipes
        var allRecipes = await _db.Recipes
            .Include(r => r.RecipeIngredients).ThenInclude(ri => ri.Ingredient)
            .Include(r => r.RecipeTags).ThenInclude(rt => rt.Tag)
            .ToListAsync();

        if (!allRecipes.Any())
        {
            return ApiResponse<WeeklyMealPlanDto>.Fail("Hệ thống chưa có đủ công thức để tự động tạo thực đơn tuần.");
        }

        // Filter out allergens
        var safeRecipes = allRecipes.Where(r =>
            !r.RecipeIngredients.Any(ri => ri.Ingredient.AllergyId.HasValue && userAllergyIds.Contains(ri.Ingredient.AllergyId.Value))
        ).ToList();

        if (!safeRecipes.Any())
        {
            safeRecipes = allRecipes; // Fallback
        }

        // Filter by diet tag if requested
        if (!string.IsNullOrWhiteSpace(dto.DietTag))
        {
            var taggedRecipes = safeRecipes.Where(r => r.RecipeTags.Any(t => t.Tag.Name.Contains(dto.DietTag, StringComparison.OrdinalIgnoreCase))).ToList();
            if (taggedRecipes.Count >= 3)
            {
                safeRecipes = taggedRecipes;
            }
        }

        // 3. Clear existing plans for this week
        var existingPlans = await _db.MealPlans
            .Where(mp => mp.UserId == userId && mp.PlanDate >= startDate && mp.PlanDate <= endDate)
            .ToListAsync();

        if (existingPlans.Any())
        {
            _db.MealPlans.RemoveRange(existingPlans);
        }

        // 4. Generate plans for 7 days
        var random = new Random();
        var newPlans = new List<MealPlan>();

        for (int i = 0; i < 7; i++)
        {
            var planDate = startDate.AddDays(i);

            // Pick distinct recipes for Breakfast, Lunch, Dinner
            var shuffled = safeRecipes.OrderBy(_ => random.Next()).ToList();

            var breakfastRecipe = shuffled.FirstOrDefault() ?? allRecipes.First();
            var lunchRecipe = shuffled.Skip(1).FirstOrDefault() ?? breakfastRecipe;
            var dinnerRecipe = shuffled.Skip(2).FirstOrDefault() ?? lunchRecipe;

            newPlans.Add(new MealPlan
            {
                UserId = userId,
                PlanDate = planDate,
                MealType = "Breakfast",
                RecipeId = breakfastRecipe.Id
            });

            newPlans.Add(new MealPlan
            {
                UserId = userId,
                PlanDate = planDate,
                MealType = "Lunch",
                RecipeId = lunchRecipe.Id
            });

            newPlans.Add(new MealPlan
            {
                UserId = userId,
                PlanDate = planDate,
                MealType = "Dinner",
                RecipeId = dinnerRecipe.Id
            });

            if (dto.IncludeSnack && shuffled.Count > 3)
            {
                newPlans.Add(new MealPlan
                {
                    UserId = userId,
                    PlanDate = planDate,
                    MealType = "Snack",
                    RecipeId = shuffled[3].Id
                });
            }
        }

        await _db.MealPlans.AddRangeAsync(newPlans);
        await _db.SaveChangesAsync();

        return await GetWeeklyPlanAsync(userId, startDate);
    }

    private static string GetVietnameseDayOfWeek(DayOfWeek dow) => dow switch
    {
        DayOfWeek.Monday => "Thứ Hai",
        DayOfWeek.Tuesday => "Thứ Ba",
        DayOfWeek.Wednesday => "Thứ Tư",
        DayOfWeek.Thursday => "Thứ Năm",
        DayOfWeek.Friday => "Thứ Sáu",
        DayOfWeek.Saturday => "Thứ Bảy",
        DayOfWeek.Sunday => "Chủ Nhật",
        _ => dow.ToString()
    };
}
