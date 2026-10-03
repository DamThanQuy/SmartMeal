using Microsoft.EntityFrameworkCore;
using Npgsql;
using SmartMeal.Application.Common;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Diary;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.Infrastructure.Services;

public class NutritionDiaryService : INutritionDiaryService
{
    private const int DefaultWaterGoalMl = 2000;
    private const double DefaultTargetCalories = 2000;
    private const double DefaultTargetCarbs = 250;
    private const double DefaultTargetFat = 55;
    private const double DefaultTargetProtein = 125;

    private static readonly string[] LogMethods = { "Manual", "AiImage", "Voice", "Barcode", "Ocr" };

    private readonly ApplicationDbContext _db;

    public NutritionDiaryService(ApplicationDbContext db)
    {
        _db = db;
    }

    // ───────────────────────────── Ghi món ─────────────────────────────

    public async Task<ApiResponse<DiaryItemDto>> LogMealAsync(Guid userId, LogMealRequestDto dto)
    {
        var mealType = MealTypes.Normalize(dto.MealType);
        if (mealType is null)
        {
            return ApiResponse<DiaryItemDto>.Fail(InvalidMealTypeMessage);
        }

        var invalidReference = await FindInvalidReferenceAsync(new[] { dto });
        if (invalidReference is not null)
        {
            return ApiResponse<DiaryItemDto>.Fail(invalidReference);
        }

        var diary = await GetOrCreateDiaryAsync(userId, dto.LogDate, mealType);
        var item = NewItem(dto, diary.Id);
        _db.DiaryItems.Add(item);
        await _db.SaveChangesAsync();

        return ApiResponse<DiaryItemDto>.Ok(ToDto(item, diary), "Ghi nhận bữa ăn thành công.");
    }

    public async Task<ApiResponse<List<DiaryItemDto>>> LogMealBatchAsync(Guid userId, LogMealBatchRequestDto dto)
    {
        var mealType = MealTypes.Normalize(dto.MealType);
        if (mealType is null)
        {
            return ApiResponse<List<DiaryItemDto>>.Fail(InvalidMealTypeMessage);
        }

        if (dto.Items.Count == 0)
        {
            return ApiResponse<List<DiaryItemDto>>.Fail("Cần ít nhất một món ăn.");
        }

        var invalidReference = await FindInvalidReferenceAsync(dto.Items);
        if (invalidReference is not null)
        {
            return ApiResponse<List<DiaryItemDto>>.Fail(invalidReference);
        }

        // Dòng nhóm được tạo (nếu cần) trước; việc thêm các món là MỘT lần SaveChanges nên hoặc tất cả được lưu hoặc không món nào.
        var diary = await GetOrCreateDiaryAsync(userId, dto.LogDate, mealType);
        var now = UtcNowMicroseconds();
        var items = dto.Items
            .Select((input, index) =>
            {
                var item = NewItem(input, diary.Id);
                item.CreatedAt = now.AddMilliseconds(index); // giữ đúng thứ tự người dùng nhập
                return item;
            })
            .ToList();

        _db.DiaryItems.AddRange(items);
        await _db.SaveChangesAsync();

        return ApiResponse<List<DiaryItemDto>>.Ok(items.Select(i => ToDto(i, diary)).ToList(), "Ghi nhận bữa ăn thành công.");
    }

    // ───────────────────────────── Sửa / xóa món ─────────────────────────────

    public async Task<ApiResponse<DiaryItemDto>> UpdateDiaryItemAsync(Guid userId, Guid itemId, UpdateDiaryItemRequestDto dto)
    {
        var item = await _db.DiaryItems
            .Include(i => i.NutritionDiary)
            .FirstOrDefaultAsync(i => i.Id == itemId && i.NutritionDiary.UserId == userId);

        if (item is null)
        {
            return ApiResponse<DiaryItemDto>.Fail("Không tìm thấy mục nhật ký dinh dưỡng cần sửa.", null, ApiErrorKind.NotFound);
        }

        var foodName = dto.FoodName?.Trim();
        if (foodName is { Length: 0 })
        {
            return ApiResponse<DiaryItemDto>.Fail("Tên món ăn không được để trống.");
        }

        var unit = dto.Unit?.Trim();
        if (unit is { Length: 0 })
        {
            return ApiResponse<DiaryItemDto>.Fail("Đơn vị không được để trống.");
        }

        var currentMeal = CanonicalMealType(item.NutritionDiary.MealType);
        var targetMeal = dto.MealType is null ? currentMeal : MealTypes.Normalize(dto.MealType);
        if (targetMeal is null)
        {
            return ApiResponse<DiaryItemDto>.Fail(InvalidMealTypeMessage);
        }

        var diary = item.NutritionDiary;
        var targetDate = dto.LogDate ?? diary.LogDate;

        // Chuyển bữa/ngày = chuyển món sang đúng dòng nhóm (tìm-hoặc-tạo) của bữa/ngày mới.
        if (targetDate != diary.LogDate || !string.Equals(targetMeal, diary.MealType, StringComparison.Ordinal))
        {
            diary = await GetOrCreateDiaryAsync(userId, targetDate, targetMeal);
            item.NutritionDiaryId = diary.Id;
            item.NutritionDiary = diary;
        }

        if (foodName is not null) item.FoodName = foodName;
        if (unit is not null) item.Unit = unit;
        if (dto.ServingSize.HasValue) item.ServingSize = dto.ServingSize.Value;
        if (dto.Calories.HasValue) item.Calories = dto.Calories.Value;
        if (dto.CarbsGrams.HasValue) item.CarbsGrams = dto.CarbsGrams.Value;
        if (dto.FatGrams.HasValue) item.FatGrams = dto.FatGrams.Value;
        if (dto.ProteinGrams.HasValue) item.ProteinGrams = dto.ProteinGrams.Value;

        await _db.SaveChangesAsync();

        return ApiResponse<DiaryItemDto>.Ok(ToDto(item, diary), "Cập nhật món ăn thành công.");
    }

    public async Task<ApiResponse<bool>> DeleteDiaryItemAsync(Guid userId, Guid itemId)
    {
        var item = await _db.DiaryItems
            .Include(i => i.NutritionDiary)
            .FirstOrDefaultAsync(i => i.Id == itemId && i.NutritionDiary.UserId == userId);

        if (item == null)
        {
            return ApiResponse<bool>.Fail("Không tìm thấy mục nhật ký dinh dưỡng cần xóa.", null, ApiErrorKind.NotFound);
        }

        _db.DiaryItems.Remove(item);
        await _db.SaveChangesAsync();

        return ApiResponse<bool>.Ok(true, "Xóa thành công.");
    }

    // ───────────────────────────── Đọc nhật ký ─────────────────────────────

    public async Task<ApiResponse<DailyDiarySummaryDto>> GetDailySummaryAsync(Guid userId, DateOnly date)
    {
        var profile = await _db.HealthProfiles.AsNoTracking().FirstOrDefaultAsync(hp => hp.UserId == userId);

        var diaries = await _db.NutritionDiaries
            .Include(nd => nd.Items)
            .Where(nd => nd.UserId == userId && nd.LogDate == date)
            .AsNoTracking()
            .ToListAsync();

        // Mọi món đều thuộc đúng một trong 4 nhóm chuẩn (kể cả dữ liệu cũ có dòng nhóm trùng/lệch hoa-thường),
        // nên tổng calo luôn bằng tổng các món được liệt kê.
        var entries = diaries
            .SelectMany(d => d.Items.Select(i => ToDto(i, d)))
            .ToList();

        var summary = new DailyDiarySummaryDto
        {
            Date = date,
            TotalCalories = entries.Sum(i => i.Calories),
            TotalCarbs = entries.Sum(i => i.CarbsGrams),
            TotalFat = entries.Sum(i => i.FatGrams),
            TotalProtein = entries.Sum(i => i.ProteinGrams),
            TargetCalories = profile?.DailyCaloriesTarget ?? DefaultTargetCalories,
            TargetCarbs = profile?.DailyCarbsTargetGrams ?? DefaultTargetCarbs,
            TargetFat = profile?.DailyFatTargetGrams ?? DefaultTargetFat,
            TargetProtein = profile?.DailyProteinTargetGrams ?? DefaultTargetProtein,
            Meals = MealTypes.All
                .Select(mealType =>
                {
                    var items = entries
                        .Where(e => e.MealType == mealType)
                        .OrderBy(e => e.CreatedAt)
                        .ThenBy(e => e.Id)
                        .ToList();

                    return new MealGroupDto
                    {
                        MealType = mealType,
                        SubtotalCalories = items.Sum(i => i.Calories),
                        Items = items
                    };
                })
                .ToList()
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

        var targetCalories = profile?.DailyCaloriesTarget ?? DefaultTargetCalories;
        var targetCarbs = profile?.DailyCarbsTargetGrams ?? DefaultTargetCarbs;
        var targetFat = profile?.DailyFatTargetGrams ?? DefaultTargetFat;
        var targetProtein = profile?.DailyProteinTargetGrams ?? DefaultTargetProtein;

        var days = new List<DailyProgressPointDto>();
        for (int i = 0; i < 7; i++)
        {
            var curDate = startDate.AddDays(i);
            var dayItems = diaries.Where(d => d.LogDate == curDate).SelectMany(d => d.Items).ToList();

            days.Add(new DailyProgressPointDto
            {
                Date = curDate,
                DayOfWeek = curDate.DayOfWeek.ToString(),
                Calories = dayItems.Sum(item => item.Calories),
                TargetCalories = targetCalories,
                ProteinGrams = dayItems.Sum(item => item.ProteinGrams),
                CarbsGrams = dayItems.Sum(item => item.CarbsGrams),
                FatGrams = dayItems.Sum(item => item.FatGrams),
                TargetProteinGrams = targetProtein,
                TargetCarbsGrams = targetCarbs,
                TargetFatGrams = targetFat
            });
        }

        return ApiResponse<WeeklyProgressDto>.Ok(new WeeklyProgressDto { Days = days });
    }

    // ───────────────────────────── Nước uống ─────────────────────────────

    public async Task<ApiResponse<WaterSummaryDto>> LogWaterAsync(Guid userId, LogWaterRequestDto dto)
    {
        var targetDate = dto.Date ?? DateOnly.FromDateTime(DateTime.UtcNow);

        var waterLog = new WaterLog
        {
            UserId = userId,
            LogDate = targetDate,
            AmountMl = dto.AmountMl,
            CreatedAt = UtcNowMicroseconds()
        };

        _db.WaterLogs.Add(waterLog);
        await _db.SaveChangesAsync();

        var summary = await BuildWaterSummaryAsync(userId, targetDate);
        summary.EntryId = waterLog.Id;
        return ApiResponse<WaterSummaryDto>.Ok(summary, "Ghi nhận lượng nước uống thành công.");
    }

    public async Task<ApiResponse<WaterHistoryDto>> GetWaterHistoryAsync(Guid userId, DateOnly endDate, int days)
    {
        days = Math.Clamp(days, 1, 31);
        var startDate = endDate.AddDays(-(days - 1));

        var logs = await _db.WaterLogs
            .Where(w => w.UserId == userId && w.LogDate >= startDate && w.LogDate <= endDate)
            .OrderBy(w => w.CreatedAt)
            .AsNoTracking()
            .ToListAsync();

        var history = new WaterHistoryDto
        {
            GoalMl = await GetWaterGoalMlAsync(userId),
            Days = Enumerable.Range(0, days)
                .Select(offset =>
                {
                    var date = startDate.AddDays(offset);
                    var entries = logs
                        .Where(l => l.LogDate == date)
                        .Select(l => new WaterEntryDto { Id = l.Id, AmountMl = l.AmountMl, CreatedAt = l.CreatedAt })
                        .ToList();

                    return new WaterDayDto { Date = date, TotalMl = entries.Sum(e => e.AmountMl), Entries = entries };
                })
                .ToList()
        };

        return ApiResponse<WaterHistoryDto>.Ok(history);
    }

    public async Task<ApiResponse<WaterSummaryDto>> DeleteWaterEntryAsync(Guid userId, Guid entryId)
    {
        var entry = await _db.WaterLogs.FirstOrDefaultAsync(w => w.Id == entryId && w.UserId == userId);
        if (entry is null)
        {
            return ApiResponse<WaterSummaryDto>.Fail("Không tìm thấy lần uống nước cần xóa.", null, ApiErrorKind.NotFound);
        }

        var date = entry.LogDate;
        _db.WaterLogs.Remove(entry);
        await _db.SaveChangesAsync();

        return ApiResponse<WaterSummaryDto>.Ok(await BuildWaterSummaryAsync(userId, date), "Đã xóa lần uống nước.");
    }

    // ───────────────────────────── Nội bộ ─────────────────────────────

    private const string InvalidMealTypeMessage = "mealType phải là một trong các giá trị: Breakfast, Lunch, Dinner, Snack.";

    /// <summary>
    /// Lấy dòng nhóm của (người dùng, ngày, bữa) hoặc tạo mới. Ràng buộc duy nhất ở DB đảm bảo chỉ có một dòng;
    /// nếu request song song vừa tạo trước thì dùng lại dòng đó thay vì tạo trùng.
    /// </summary>
    private async Task<NutritionDiary> GetOrCreateDiaryAsync(Guid userId, DateOnly date, string mealType)
    {
        var existing = await _db.NutritionDiaries
            .FirstOrDefaultAsync(d => d.UserId == userId && d.LogDate == date && d.MealType == mealType);
        if (existing is not null)
        {
            return existing;
        }

        var diary = new NutritionDiary { UserId = userId, LogDate = date, MealType = mealType };
        _db.NutritionDiaries.Add(diary);
        try
        {
            await _db.SaveChangesAsync();
            return diary;
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            _db.Entry(diary).State = EntityState.Detached;
            return await _db.NutritionDiaries
                .FirstAsync(d => d.UserId == userId && d.LogDate == date && d.MealType == mealType);
        }
    }

    private async Task<string?> FindInvalidReferenceAsync(IEnumerable<DiaryItemInputDto> inputs)
    {
        var list = inputs.ToList();

        var recipeIds = list.Where(i => i.RecipeId.HasValue).Select(i => i.RecipeId!.Value).Distinct().ToList();
        if (recipeIds.Count > 0 && await _db.Recipes.CountAsync(r => recipeIds.Contains(r.Id)) != recipeIds.Count)
        {
            return "Không tìm thấy công thức món ăn được tham chiếu.";
        }

        var ingredientIds = list.Where(i => i.IngredientId.HasValue).Select(i => i.IngredientId!.Value).Distinct().ToList();
        if (ingredientIds.Count > 0 && await _db.Ingredients.CountAsync(i => ingredientIds.Contains(i.Id)) != ingredientIds.Count)
        {
            return "Không tìm thấy thực phẩm được tham chiếu.";
        }

        return null;
    }

    private static DiaryItem NewItem(DiaryItemInputDto input, Guid diaryId) => new()
    {
        NutritionDiaryId = diaryId,
        FoodName = input.FoodName.Trim(),
        RecipeId = input.RecipeId,
        IngredientId = input.IngredientId,
        ServingSize = input.ServingSize,
        Unit = input.Unit.Trim(),
        Calories = input.Calories,
        CarbsGrams = input.CarbsGrams,
        FatGrams = input.FatGrams,
        ProteinGrams = input.ProteinGrams,
        LogMethod = LogMethods.FirstOrDefault(m => string.Equals(m, input.LogMethod?.Trim(), StringComparison.OrdinalIgnoreCase)) ?? "Manual",
        ImageUrl = input.ImageUrl,
        CreatedAt = UtcNowMicroseconds()
    };

    /// <summary>PostgreSQL lưu thời gian tới microsecond; làm tròn xuống để giá trị trả về bằng giá trị đã lưu.</summary>
    private static DateTime UtcNowMicroseconds()
    {
        var now = DateTime.UtcNow;
        return new DateTime(now.Ticks - now.Ticks % 10, DateTimeKind.Utc);
    }

    private static string CanonicalMealType(string stored) => MealTypes.Normalize(stored) ?? MealTypes.Snack;

    private static DiaryItemDto ToDto(DiaryItem item, NutritionDiary diary) => new()
    {
        Id = item.Id,
        FoodName = item.FoodName,
        ServingSize = item.ServingSize,
        Unit = item.Unit,
        Calories = item.Calories,
        CarbsGrams = item.CarbsGrams,
        FatGrams = item.FatGrams,
        ProteinGrams = item.ProteinGrams,
        LogMethod = item.LogMethod,
        MealType = CanonicalMealType(diary.MealType),
        LogDate = diary.LogDate,
        CreatedAt = item.CreatedAt,
        RecipeId = item.RecipeId,
        IngredientId = item.IngredientId,
        ImageUrl = item.ImageUrl
    };

    private async Task<WaterSummaryDto> BuildWaterSummaryAsync(Guid userId, DateOnly date)
    {
        var total = await _db.WaterLogs
            .Where(w => w.UserId == userId && w.LogDate == date)
            .SumAsync(w => w.AmountMl);

        var goal = await GetWaterGoalMlAsync(userId);
        return new WaterSummaryDto
        {
            Date = date,
            TotalWaterMl = total,
            GoalWaterMl = goal,
            Percentage = Math.Round(total * 100.0 / goal, 1)
        };
    }

    private Task<int> GetWaterGoalMlAsync(Guid userId) => Task.FromResult(DefaultWaterGoalMl);
}
