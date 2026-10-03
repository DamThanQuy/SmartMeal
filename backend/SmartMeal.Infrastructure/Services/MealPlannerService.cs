using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using SmartMeal.Application.Common;
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
            var dayPlans = mealPlans
                .Where(mp => mp.PlanDate == currentDate)
                .OrderBy(mp => MealOrder(mp.MealType))
                .ToList();

            weeklyDto.Days.Add(new DailyPlanDto
            {
                Date = currentDate,
                DayOfWeek = GetVietnameseDayOfWeek(currentDate.DayOfWeek),
                TotalCalories = Math.Round(dayPlans.Sum(p => p.Recipe.CaloriesPerServing), 1),
                TotalCarbs = Math.Round(dayPlans.Sum(p => p.Recipe.CarbsPerServing), 1),
                TotalProtein = Math.Round(dayPlans.Sum(p => p.Recipe.ProteinPerServing), 1),
                TotalFat = Math.Round(dayPlans.Sum(p => p.Recipe.FatPerServing), 1),
                Meals = dayPlans.Select(p => ToItemDto(p, p.Recipe)).ToList()
            });
        }

        return ApiResponse<WeeklyMealPlanDto>.Ok(weeklyDto, "Lấy thực đơn tuần thành công.");
    }

    public async Task<ApiResponse<PlannedMealItemDto>> AssignMealAsync(Guid userId, AssignMealPlanRequestDto dto)
    {
        var mealType = MealTypes.Normalize(dto.MealType);
        if (mealType is null)
        {
            return ApiResponse<PlannedMealItemDto>.Fail("Loại bữa ăn phải là Breakfast, Lunch, Dinner hoặc Snack.");
        }

        if (dto.PlanDate == default)
        {
            return ApiResponse<PlannedMealItemDto>.Fail("Vui lòng chọn ngày cho bữa ăn.");
        }

        var recipe = await _db.Recipes.AsNoTracking().FirstOrDefaultAsync(r => r.Id == dto.RecipeId);
        if (recipe == null)
        {
            return ApiResponse<PlannedMealItemDto>.Fail("Không tìm thấy công thức món ăn yêu cầu.", null, ApiErrorKind.NotFound);
        }

        // Mỗi (ngày, bữa) chỉ có một món: gán lại thì thay món. Hai request đồng thời cùng ô → bản thứ hai dính unique index,
        // nạp lại bản ghi vừa được tạo rồi cập nhật thay vì báo lỗi.
        for (var attempt = 0; attempt < 2; attempt++)
        {
            var plan = await _db.MealPlans.FirstOrDefaultAsync(mp => mp.UserId == userId && mp.PlanDate == dto.PlanDate && mp.MealType == mealType);
            if (plan != null)
            {
                plan.RecipeId = recipe.Id;
                plan.IsCompleted = false;
            }
            else
            {
                plan = new MealPlan { UserId = userId, PlanDate = dto.PlanDate, MealType = mealType, RecipeId = recipe.Id };
                _db.MealPlans.Add(plan);
            }

            try
            {
                await _db.SaveChangesAsync();
                return ApiResponse<PlannedMealItemDto>.Ok(
                    ToItemDto(plan, recipe),
                    $"Đã xếp món '{recipe.Title}' vào bữa {mealType} ngày {dto.PlanDate:yyyy-MM-dd}.");
            }
            catch (DbUpdateException ex) when (attempt == 0 && IsUniqueViolation(ex))
            {
                _db.ChangeTracker.Clear();
            }
        }

        return ApiResponse<PlannedMealItemDto>.Fail("Thực đơn đang được cập nhật, vui lòng thử lại.", null, ApiErrorKind.Conflict);
    }

    public async Task<ApiResponse<PlannedMealItemDto>> SetCompletedAsync(Guid userId, Guid mealPlanId, bool isCompleted)
    {
        var plan = await _db.MealPlans.Include(mp => mp.Recipe).FirstOrDefaultAsync(mp => mp.Id == mealPlanId && mp.UserId == userId);
        if (plan == null)
        {
            return ApiResponse<PlannedMealItemDto>.Fail("Không tìm thấy món ăn trong thực đơn đã chọn.", null, ApiErrorKind.NotFound);
        }

        plan.IsCompleted = isCompleted;
        await _db.SaveChangesAsync();

        return ApiResponse<PlannedMealItemDto>.Ok(
            ToItemDto(plan, plan.Recipe),
            isCompleted ? "Đã đánh dấu đã nấu." : "Đã bỏ đánh dấu đã nấu.");
    }

    public async Task<ApiResponse<bool>> DeleteMealPlanItemAsync(Guid userId, Guid mealPlanId)
    {
        var plan = await _db.MealPlans.FirstOrDefaultAsync(mp => mp.Id == mealPlanId && mp.UserId == userId);
        if (plan == null)
        {
            return ApiResponse<bool>.Fail("Không tìm thấy món ăn trong thực đơn đã chọn.", null, ApiErrorKind.NotFound);
        }

        _db.MealPlans.Remove(plan);
        await _db.SaveChangesAsync();

        return ApiResponse<bool>.Ok(true, "Đã xóa món ăn khỏi thực đơn.");
    }

    public async Task<ApiResponse<WeeklyMealPlanDto>> AutoGenerateWeeklyPlanAsync(Guid userId, AutoGeneratePlanRequestDto dto)
    {
        var startDate = dto.StartDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var endDate = startDate.AddDays(6);

        // 1. Chất gây dị ứng của người dùng
        var userAllergyIds = (await _db.UserAllergies
            .Where(ua => ua.HealthProfile.UserId == userId)
            .Select(ua => ua.AllergyId)
            .ToListAsync()).ToHashSet();

        // 2. Công thức an toàn
        var allRecipes = await _db.Recipes
            .AsNoTracking()
            .Include(r => r.RecipeIngredients).ThenInclude(ri => ri.Ingredient).ThenInclude(i => i.IngredientAllergies)
            .Include(r => r.RecipeTags).ThenInclude(rt => rt.Tag)
            .AsSplitQuery()
            .ToListAsync();

        if (!allRecipes.Any())
        {
            return ApiResponse<WeeklyMealPlanDto>.Fail("Hệ thống chưa có đủ công thức để tự động tạo thực đơn tuần.");
        }

        // BR-102: loại hẳn công thức chứa chất gây dị ứng của người dùng, không bao giờ "tạm chấp nhận".
        var safeRecipes = allRecipes.Where(r =>
            !r.RecipeIngredients.Any(ri => ri.Ingredient.IngredientAllergies.Any(a => userAllergyIds.Contains(a.AllergyId)))
        ).ToList();

        if (!safeRecipes.Any())
        {
            // Không tạo gì cả (và không đụng vào thực đơn đang có) thay vì xếp món chứa chất gây dị ứng.
            var current = await GetWeeklyPlanAsync(userId, startDate);
            current.Message = "Không có công thức nào phù hợp với danh sách dị ứng của bạn nên chưa tạo được thực đơn.";
            return current;
        }

        if (!string.IsNullOrWhiteSpace(dto.DietTag))
        {
            var taggedRecipes = safeRecipes.Where(r => r.RecipeTags.Any(t => t.Tag.Name.Contains(dto.DietTag, StringComparison.OrdinalIgnoreCase) || t.Tag.Code.Equals(dto.DietTag, StringComparison.OrdinalIgnoreCase))).ToList();
            if (taggedRecipes.Count >= 3)
            {
                safeRecipes = taggedRecipes;
            }
        }

        // 3. Thực đơn hiện có trong tuần: ghi đè (mặc định) hoặc giữ nguyên các ô người dùng đã chọn (BR-163).
        var existingPlans = await _db.MealPlans
            .Where(mp => mp.UserId == userId && mp.PlanDate >= startDate && mp.PlanDate <= endDate)
            .ToListAsync();

        var occupied = new HashSet<(DateOnly Date, string MealType)>();
        var usedByDay = new Dictionary<DateOnly, HashSet<Guid>>();
        if (dto.KeepExisting)
        {
            foreach (var plan in existingPlans)
            {
                occupied.Add((plan.PlanDate, plan.MealType));
                if (!usedByDay.TryGetValue(plan.PlanDate, out var used))
                {
                    usedByDay[plan.PlanDate] = used = new HashSet<Guid>();
                }

                used.Add(plan.RecipeId);
            }
        }
        else if (existingPlans.Any())
        {
            _db.MealPlans.RemoveRange(existingPlans);
        }

        // 4. Điền các ô còn trống: ưu tiên món hợp loại bữa và chưa dùng trong ngày.
        var random = new Random();
        var slots = new List<string> { MealTypes.Breakfast, MealTypes.Lunch, MealTypes.Dinner };
        if (dto.IncludeSnack)
        {
            slots.Add(MealTypes.Snack);
        }

        var newPlans = new List<MealPlan>();
        for (var i = 0; i < 7; i++)
        {
            var planDate = startDate.AddDays(i);
            if (!usedByDay.TryGetValue(planDate, out var usedToday))
            {
                usedByDay[planDate] = usedToday = new HashSet<Guid>();
            }

            foreach (var mealType in slots.Where(m => !occupied.Contains((planDate, m))))
            {
                var pool = safeRecipes.Where(r => IsSuitableFor(r, mealType) && !usedToday.Contains(r.Id)).ToList();
                if (pool.Count == 0)
                {
                    pool = safeRecipes.Where(r => !usedToday.Contains(r.Id)).ToList();
                }

                if (pool.Count == 0)
                {
                    pool = safeRecipes;
                }

                var pick = pool[random.Next(pool.Count)];
                usedToday.Add(pick.Id);
                newPlans.Add(new MealPlan { UserId = userId, PlanDate = planDate, MealType = mealType, RecipeId = pick.Id });
            }
        }

        _db.MealPlans.AddRange(newPlans);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            return ApiResponse<WeeklyMealPlanDto>.Fail("Thực đơn đang được cập nhật ở nơi khác, vui lòng thử lại.", null, ApiErrorKind.Conflict);
        }

        return await GetWeeklyPlanAsync(userId, startDate);
    }

    // ───────────────────────────── Nội bộ ─────────────────────────────

    private static bool IsSuitableFor(Recipe recipe, string mealType) =>
        string.IsNullOrEmpty(recipe.MealTypes) || recipe.MealTypes.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Contains(mealType);

    private static PlannedMealItemDto ToItemDto(MealPlan plan, Recipe recipe) => new()
    {
        MealPlanId = plan.Id,
        MealType = plan.MealType,
        RecipeId = recipe.Id,
        RecipeTitle = recipe.Title,
        RecipeImageUrl = recipe.ImageUrl,
        Calories = recipe.CaloriesPerServing,
        Carbs = recipe.CarbsPerServing,
        Protein = recipe.ProteinPerServing,
        Fat = recipe.FatPerServing,
        CookingTimeMinutes = recipe.PrepTimeMinutes + recipe.CookTimeMinutes,
        IsCompleted = plan.IsCompleted
    };

    private static int MealOrder(string mealType)
    {
        var index = MealTypes.All.ToList().FindIndex(m => string.Equals(m, mealType, StringComparison.OrdinalIgnoreCase));
        return index < 0 ? int.MaxValue : index;
    }

    private static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };

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
