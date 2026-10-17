using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using SmartMeal.Application.Common;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Diary;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.Infrastructure.Services;

/// <summary>
/// Dịch vụ quản lý nhật ký dinh dưỡng và theo dõi lượng nước uống hằng ngày của người dùng.
/// Cung cấp các thao tác ghi nhận bữa ăn đơn lẻ/hàng loạt, chỉnh sửa, xóa món ăn,
/// tổng hợp dinh dưỡng theo ngày, thống kê tiến độ calo và macro theo tuần/khoảng ngày,
/// cùng hệ thống theo dõi lượng nước uống và tự động kích hoạt đánh giá Gamification (chuỗi ngày, huy hiệu).
/// </summary>
public class NutritionDiaryService : INutritionDiaryService
{
    private const int DefaultWaterGoalMl = 2000;
    private const double DefaultTargetCalories = 2000;
    private const double DefaultTargetCarbs = 250;
    private const double DefaultTargetFat = 55;
    private const double DefaultTargetProtein = 125;

    /// <summary>Số ngày tối đa của một lần xem tiến độ (đủ cho một tháng).</summary>
    public const int MaxProgressDays = 31;

    private static readonly string[] LogMethods = { "Manual", "AiImage", "Voice", "Barcode", "Ocr" };

    private readonly ApplicationDbContext _db;
    private readonly IGamificationService _gamification;
    private readonly IMealPhotoService _mealPhotos;
    private readonly ILogger<NutritionDiaryService> _logger;

    /// <summary>
    /// Khởi tạo instance mới của <see cref="NutritionDiaryService"/>.
    /// </summary>
    /// <param name="db">DbContext kết nối cơ sở dữ liệu ứng dụng.</param>
    /// <param name="gamification">Dịch vụ quản lý Gamification để đánh giá chuỗi ngày và huy hiệu sau khi log nhật ký.</param>
    /// <param name="mealPhotos">Dịch vụ quản lý hình ảnh món ăn để dọn dẹp file rác khi xóa nhật ký.</param>
    /// <param name="logger">Logger ghi log hoạt động và lỗi phát sinh trong quá trình xử lý nhật ký.</param>
    public NutritionDiaryService(
        ApplicationDbContext db,
        IGamificationService gamification,
        IMealPhotoService mealPhotos,
        ILogger<NutritionDiaryService> logger)
    {
        _db = db;
        _gamification = gamification;
        _mealPhotos = mealPhotos;
        _logger = logger;
    }

    // ───────────────────────────── Ghi món ─────────────────────────────

    /// <summary>
    /// Ghi nhận một món ăn vào nhật ký dinh dưỡng của người dùng theo ngày và bữa ăn chỉ định.
    /// Kiểm tra tính hợp lệ của loại bữa ăn, tham chiếu món ăn/công thức, tạo hoặc tái sử dụng dòng nhật ký nhóm,
    /// lưu món ăn và kích hoạt đánh giá Gamification.
    /// </summary>
    /// <param name="userId">Định danh người dùng ghi nhật ký.</param>
    /// <param name="dto">Dữ liệu chi tiết về món ăn, ngày ghi và loại bữa ăn.</param>
    /// <returns>Đối tượng <see cref="ApiResponse{T}"/> chứa thông tin món ăn đã được ghi nhận thành công.</returns>
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
        await _gamification.EvaluateAfterChangeAsync(_logger, userId, dto.LogDate, "diary");

        return ApiResponse<DiaryItemDto>.Ok(ToDto(item, diary), "Ghi nhận bữa ăn thành công.");
    }

    /// <summary>
    /// Ghi nhận danh sách nhiều món ăn cùng lúc vào một bữa ăn trong ngày.
    /// Giúp người dùng hoặc tính năng AI Vision/Barcode log toàn bộ món ăn trong bữa với một thao tác duy nhất.
    /// Toàn bộ món ăn được thêm trong một transaction SaveChanges duy nhất để bảo đảm tính toàn vẹn dữ liệu.
    /// </summary>
    /// <param name="userId">Định danh người dùng ghi nhật ký.</param>
    /// <param name="dto">Dữ liệu lô món ăn gồm ngày ghi, loại bữa ăn và danh sách các món chi tiết.</param>
    /// <returns>Đối tượng <see cref="ApiResponse{T}"/> chứa danh sách các món ăn đã được ghi nhận thành công.</returns>
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
        await _gamification.EvaluateAfterChangeAsync(_logger, userId, dto.LogDate, "diary");

        return ApiResponse<List<DiaryItemDto>>.Ok(items.Select(i => ToDto(i, diary)).ToList(), "Ghi nhận bữa ăn thành công.");
    }

    // ───────────────────────────── Sửa / xóa món ─────────────────────────────

    /// <summary>
    /// Cập nhật thông tin chi tiết một món ăn đã ghi trong nhật ký dinh dưỡng (tên món, khẩu phần, calo, macro, bữa, ngày).
    /// Nếu thay đổi ngày hoặc loại bữa ăn, món ăn sẽ tự động được chuyển sang dòng nhật ký nhóm tương ứng.
    /// </summary>
    /// <param name="userId">Định danh người dùng sở hữu món ăn.</param>
    /// <param name="itemId">Định danh món ăn trong nhật ký cần cập nhật.</param>
    /// <param name="dto">Dữ liệu các trường cần cập nhật.</param>
    /// <returns>Đối tượng <see cref="ApiResponse{T}"/> chứa thông tin món ăn sau khi cập nhật.</returns>
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
        await _gamification.EvaluateAfterChangeAsync(_logger, userId, diary.LogDate, "diary");

        return ApiResponse<DiaryItemDto>.Ok(ToDto(item, diary), "Cập nhật món ăn thành công.");
    }

    /// <summary>
    /// Xóa một món ăn khỏi nhật ký dinh dưỡng của người dùng.
    /// Nếu món ăn có gắn kèm ảnh chụp và ảnh đó không còn dùng ở nhật ký nào khác, dịch vụ sẽ xóa file ảnh vật lý.
    /// </summary>
    /// <param name="userId">Định danh người dùng sở hữu món ăn.</param>
    /// <param name="itemId">Định danh món ăn cần xóa.</param>
    /// <returns>Đối tượng <see cref="ApiResponse{T}"/> xác nhận kết quả xóa thành công.</returns>
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
        await _mealPhotos.DeleteIfUnusedAsync(userId, item.ImageUrl);

        return ApiResponse<bool>.Ok(true, "Xóa thành công.");
    }

    // ───────────────────────────── Đọc nhật ký ─────────────────────────────

    /// <summary>
    /// Lấy tổng kết nhật ký dinh dưỡng trong một ngày cụ thể của người dùng.
    /// Bao gồm tổng calo, carb, fat, protein đã nạp, mục tiêu dinh dưỡng cá nhân từ hồ sơ sức khỏe,
    /// và danh sách các món ăn được phân loại theo 4 bữa chuẩn (Breakfast, Lunch, Dinner, Snack).
    /// </summary>
    /// <param name="userId">Định danh người dùng.</param>
    /// <param name="date">Ngày cần lấy tổng kết dinh dưỡng.</param>
    /// <returns>Đối tượng <see cref="ApiResponse{T}"/> chứa thông tin tổng kết dinh dưỡng trong ngày.</returns>
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

    /// <summary>
    /// Lấy thống kê tiến độ dinh dưỡng trong vòng 7 ngày (1 tuần) bắt đầu từ ngày chỉ định.
    /// </summary>
    /// <param name="userId">Định danh người dùng.</param>
    /// <param name="startDate">Ngày bắt đầu tuần theo dõi.</param>
    /// <returns>Đối tượng <see cref="ApiResponse{T}"/> chứa dữ liệu tiến độ dinh dưỡng theo từng ngày trong tuần.</returns>
    public Task<ApiResponse<WeeklyProgressDto>> GetWeeklyProgressAsync(Guid userId, DateOnly startDate) =>
        GetProgressAsync(userId, startDate, startDate.AddDays(6));

    /// <summary>
    /// Lấy thống kê tiến độ dinh dưỡng trong một khoảng ngày tùy chọn (tối đa 31 ngày).
    /// Tính toán tổng calo và các chỉ số macro (protein, carb, fat) thực tế nạp vào so với mục tiêu đề ra cho mỗi ngày.
    /// </summary>
    /// <param name="userId">Định danh người dùng.</param>
    /// <param name="startDate">Ngày bắt đầu khoảng thời gian.</param>
    /// <param name="endDate">Ngày kết thúc khoảng thời gian (không vượt quá 31 ngày so với ngày bắt đầu).</param>
    /// <returns>Đối tượng <see cref="ApiResponse{T}"/> chứa danh sách điểm dữ liệu tiến độ từng ngày.</returns>
    public async Task<ApiResponse<WeeklyProgressDto>> GetProgressAsync(Guid userId, DateOnly startDate, DateOnly endDate)
    {
        if (endDate < startDate)
        {
            return ApiResponse<WeeklyProgressDto>.Fail("endDate phải sau hoặc trùng startDate.");
        }

        var dayCount = endDate.DayNumber - startDate.DayNumber + 1;
        if (dayCount > MaxProgressDays)
        {
            return ApiResponse<WeeklyProgressDto>.Fail($"Chỉ xem được tối đa {MaxProgressDays} ngày mỗi lần.");
        }

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
        for (int i = 0; i < dayCount; i++)
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

    /// <summary>
    /// Ghi nhận một lần uống nước (thể tích ml) vào ngày chỉ định hoặc ngày hiện tại.
    /// Kích hoạt cập nhật Gamification và trả về tổng kết lượng nước đã uống cùng phần trăm mục tiêu đạt được.
    /// </summary>
    /// <param name="userId">Định danh người dùng.</param>
    /// <param name="dto">Dữ liệu lượt uống nước gồm thể tích (ml) và ngày (tùy chọn).</param>
    /// <returns>Đối tượng <see cref="ApiResponse{T}"/> chứa thông tin tổng kết nước trong ngày.</returns>
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
        await _gamification.EvaluateAfterChangeAsync(_logger, userId, targetDate, "water");

        var summary = await BuildWaterSummaryAsync(userId, targetDate);
        summary.EntryId = waterLog.Id;
        return ApiResponse<WaterSummaryDto>.Ok(summary, "Ghi nhận lượng nước uống thành công.");
    }

    /// <summary>
    /// Lấy lịch sử uống nước theo từng ngày trong một khoảng thời gian (1 đến 31 ngày) tính lùi từ ngày kết thúc.
    /// </summary>
    /// <param name="userId">Định danh người dùng.</param>
    /// <param name="endDate">Ngày kết thúc của khoảng thời gian.</param>
    /// <param name="days">Số lượng ngày cần truy vấn (từ 1 đến 31).</param>
    /// <returns>Đối tượng <see cref="ApiResponse{T}"/> chứa lịch sử các lần uống nước và tổng lượng nước mỗi ngày.</returns>
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

    /// <summary>
    /// Xóa một lần uống nước cụ thể theo mã định danh của lượt uống.
    /// </summary>
    /// <param name="userId">Định danh người dùng sở hữu bản ghi.</param>
    /// <param name="entryId">Định danh lượt uống nước cần xóa.</param>
    /// <returns>Đối tượng <see cref="ApiResponse{T}"/> chứa tổng kết lượng nước cập nhật sau khi xóa.</returns>
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

    /// <summary>
    /// Kiểm tra tính hợp lệ của RecipeId và IngredientId được tham chiếu trong danh sách món ăn đầu vào.
    /// </summary>
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

    /// <summary>
    /// Khởi tạo thực thể <see cref="DiaryItem"/> từ dữ liệu đầu vào.
    /// </summary>
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

    /// <summary>Chuẩn hóa chuỗi tên bữa ăn về chuẩn MealTypes hoặc mặc định là Snack.</summary>
    private static string CanonicalMealType(string stored) => MealTypes.Normalize(stored) ?? MealTypes.Snack;

    /// <summary>
    /// Chuyển đổi thực thể <see cref="DiaryItem"/> và <see cref="NutritionDiary"/> sang DTO <see cref="DiaryItemDto"/>.
    /// </summary>
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

    /// <summary>
    /// Tính toán tổng lượng nước đã uống trong ngày so với mục tiêu và tỷ lệ phần trăm đạt được.
    /// </summary>
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

    /// <summary>Mục tiêu nước lấy từ hồ sơ sức khỏe; chưa có hồ sơ thì dùng mặc định.</summary>
    private async Task<int> GetWaterGoalMlAsync(Guid userId)
    {
        var goal = await _db.HealthProfiles
            .Where(hp => hp.UserId == userId)
            .Select(hp => hp.WaterGoalMl)
            .FirstOrDefaultAsync();

        return goal > 0 ? goal : DefaultWaterGoalMl;
    }
}
