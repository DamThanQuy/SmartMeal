using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;
using SmartMeal.Application.Common;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.MealPlanner;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Infrastructure.Options;

namespace SmartMeal.Infrastructure.Services;

/// <summary>
/// Dịch vụ quản lý kế hoạch thực đơn dinh dưỡng (Meal Planner):
/// - Lấy lịch thực đơn tuần kèm phân tích tổng Calo và Macros mỗi ngày so với mục tiêu người dùng.
/// - Gán, đổi món, cập nhật trạng thái đã nấu và xóa món khỏi thực đơn tuần.
/// - Kiểm tra nghiêm ngặt an toàn dị ứng (BR-101/102/162): Chặn tuyệt đối không cho phép xếp món chứa chất gây dị ứng vào thực đơn.
/// - Thuật toán tự động sinh thực đơn 7 ngày (Auto Generate Plan - Đặc quyền Pro):
///   + Loại trừ chất gây dị ứng và món vi phạm bệnh lý nền (BR-110/111).
///   + Cân bằng năng lượng theo tỷ lệ calo các bữa ăn và chế độ ăn mong muốn (Keto, Chay, Eat Clean,...).
///   + Hỗ trợ giữ nguyên món hiện có (KeepExisting) và làm ngẫu nhiên đa dạng món ăn.
/// </summary>
public class MealPlannerService : IMealPlannerService
{
    /// <summary>Mã lỗi (trong <c>errors</c>) khi món chứa chất gây dị ứng của người dùng — FE dựa vào mã này, không dựa vào câu chữ.</summary>
    public const string AllergenConflictError = "allergen_conflict";

    /// <summary>Mã lỗi khi không còn công thức nào hợp dị ứng/bệnh lý để tạo thực đơn tự động.</summary>
    public const string NoSuitableRecipesError = "no_suitable_recipes";

    /// <summary>Tỉ lệ calo mục tiêu của từng bữa khi tạo thực đơn tự động (có bữa phụ: 25% Sáng, 35% Trưa, 30% Tối, 10% Phụ).</summary>
    private static readonly Dictionary<string, double> MealShareWithSnack = new()
    {
        [MealTypes.Breakfast] = 0.25, [MealTypes.Lunch] = 0.35, [MealTypes.Dinner] = 0.30, [MealTypes.Snack] = 0.10
    };

    /// <summary>Tỉ lệ calo mục tiêu của từng bữa khi tạo thực đơn tự động (không có bữa phụ: 28% Sáng, 38% Trưa, 34% Tối).</summary>
    private static readonly Dictionary<string, double> MealShareWithoutSnack = new()
    {
        [MealTypes.Breakfast] = 0.28, [MealTypes.Lunch] = 0.38, [MealTypes.Dinner] = 0.34
    };

    /// <summary>Chọn ngẫu nhiên trong vài món gần mục tiêu calo nhất để thực đơn không lặp lại y hệt mỗi lần tạo.</summary>
    private const int CandidatesPerSlot = 3;

    private readonly ApplicationDbContext _db;
    private readonly ILogger<MealPlannerService> _logger;
    private readonly HealthConditionLimitsOptions _limits;

    /// <summary>
    /// Khởi tạo instance mới của <see cref="MealPlannerService"/>.
    /// </summary>
    /// <param name="db">Database context của ứng dụng.</param>
    /// <param name="logger">Logger phục vụ ghi log theo dõi thuật toán sinh thực đơn.</param>
    /// <param name="limits">Cấu hình giới hạn ngưỡng dinh dưỡng theo bệnh lý nền (HealthConditionLimitsOptions).</param>
    public MealPlannerService(ApplicationDbContext db, ILogger<MealPlannerService> logger, IOptions<HealthConditionLimitsOptions> limits)
    {
        _db = db;
        _logger = logger;
        _limits = limits.Value;
    }

    /// <summary>
    /// Lấy lịch thực đơn tuần trong vòng 7 ngày tính từ ngày bắt đầu:
    /// - Truy vấn mục tiêu Calo hàng ngày từ hồ sơ sức khỏe người dùng (mặc định 2000 kcal nếu chưa khảo sát).
    /// - Nhóm các món ăn theo từng ngày và tính tổng Calo, Carbs, Protein, Fat đạt được trong ngày.
    /// - Sắp xếp các bữa ăn theo thứ tự hợp lý: Sáng -> Trưa -> Tối -> Phụ.
    /// </summary>
    /// <param name="userId">Mã định danh duy nhất của người dùng.</param>
    /// <param name="startDate">Ngày bắt đầu tuần thực đơn.</param>
    /// <returns>Đối tượng <see cref="WeeklyMealPlanDto"/> chứa lịch chi tiết 7 ngày.</returns>
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

    /// <summary>
    /// Gán hoặc thay đổi một món ăn vào một bữa cụ thể trong ngày:
    /// - Kiểm tra công thức nấu ăn tồn tại.
    /// - Kiểm tra dị ứng nghiêm ngặt: Từ chối nếu công thức chứa thành phần dị ứng đã khai báo của người dùng (AllergenConflictError).
    /// - Thực hiện cơ chế Upsert an toàn (chống Unique Violation tranh chấp): nếu bữa ăn ngày đó đã có món thì ghi đè món mới.
    /// </summary>
    /// <param name="userId">Mã định danh duy nhất của người dùng.</param>
    /// <param name="dto">Dữ liệu phân bổ món ăn gồm ngày, loại bữa và RecipeId.</param>
    /// <returns>Đối tượng <see cref="PlannedMealItemDto"/> của món vừa được xếp lịch.</returns>
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

        var recipe = await _db.Recipes.AsNoTracking()
            .Include(r => r.RecipeIngredients).ThenInclude(ri => ri.Ingredient).ThenInclude(i => i.IngredientAllergies)
            .AsSplitQuery()
            .FirstOrDefaultAsync(r => r.Id == dto.RecipeId);
        if (recipe == null)
        {
            return ApiResponse<PlannedMealItemDto>.Fail("Không tìm thấy công thức món ăn yêu cầu.", null, ApiErrorKind.NotFound);
        }

        // BR-101/102/162: không xếp món chứa chất gây dị ứng của người dùng vào thực đơn, kể cả khi client bỏ qua cảnh báo.
        var userAllergyIds = await UserAllergyIdsAsync(userId);
        var conflicts = recipe.RecipeIngredients
            .SelectMany(ri => ri.Ingredient.IngredientAllergies.Select(a => a.AllergyId))
            .Where(userAllergyIds.Contains)
            .Distinct()
            .ToList();
        if (conflicts.Count > 0)
        {
            var names = await _db.Allergies.AsNoTracking().Where(a => conflicts.Contains(a.Id)).Select(a => a.Name).ToListAsync();
            return ApiResponse<PlannedMealItemDto>.Fail(
                $"Món '{recipe.Title}' chứa chất gây dị ứng của bạn ({string.Join(", ", names)}) nên không thể thêm vào thực đơn.",
                new List<string> { AllergenConflictError });
        }

        if (MatchOtherAllergen(recipe, await OtherAllergensAsync(userId)) is { } keyword)
        {
            return ApiResponse<PlannedMealItemDto>.Fail(
                $"Món '{recipe.Title}' có thể chứa \"{keyword}\" (dị ứng khác của bạn) nên không thể thêm vào thực đơn.",
                new List<string> { AllergenConflictError });
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

    /// <summary>
    /// Đánh dấu một món ăn trong thực đơn đã nấu xong hoặc đã ăn:
    /// Giúp người dùng theo dõi mức độ tuân thủ thực đơn dinh dưỡng.
    /// </summary>
    /// <param name="userId">Mã định danh người dùng.</param>
    /// <param name="mealPlanId">Mã định danh duy nhất của mục thực đơn.</param>
    /// <param name="isCompleted">Trạng thái hoàn thành mới.</param>
    /// <returns>Đối tượng <see cref="PlannedMealItemDto"/> sau khi cập nhật.</returns>
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

    /// <summary>
    /// Xóa một món ăn ra khỏi kế hoạch thực đơn tuần:
    /// </summary>
    /// <param name="userId">Mã định danh người dùng.</param>
    /// <param name="mealPlanId">Mã mục thực đơn cần xóa.</param>
    /// <returns>True nếu xóa thành công.</returns>
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

    /// <summary>
    /// Thuật toán AI tự động gợi ý và sinh thực đơn tuần 7 ngày thông minh (Đặc quyền gói Pro, BR-230/231):
    /// 1. Kiểm tra quyền hạn gói Pro ở tầng máy chủ (chặn 403 nếu tài khoản Free).
    /// 2. Thu thập hồ sơ: danh sách chất dị ứng, bệnh lý nền và chế độ ăn ưu tiên.
    /// 3. Lọc danh sách công thức an toàn: loại bỏ tuyệt đối món chứa chất gây dị ứng và món vi phạm bệnh lý nền.
    /// 4. Phân bổ Calo từng bữa theo tỷ lệ khoa học và chọn lọc ngẫu nhiên các món gần mục tiêu năng lượng nhất để tránh trùng lặp.
    /// 5. Hỗ trợ tùy chọn 'KeepExisting' để giữ nguyên các bữa người dùng đã lên lịch trước đó.
    /// </summary>
    /// <param name="userId">Mã định danh người dùng.</param>
    /// <param name="dto">Dữ liệu yêu cầu gồm ngày bắt đầu, cờ giữ món cũ, cờ bữa phụ và tag chế độ ăn.</param>
    /// <returns>Đối tượng <see cref="WeeklyMealPlanDto"/> chứa thực đơn 7 ngày mới sinh.</returns>
    public async Task<ApiResponse<WeeklyMealPlanDto>> AutoGenerateWeeklyPlanAsync(Guid userId, AutoGeneratePlanRequestDto dto)
    {
        // "Tự tạo thực đơn tuần" là quyền lợi Pro (BR-230/231): chặn ở máy chủ, không chỉ ẩn nút trên app.
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null || !user.IsProActive(DateTime.UtcNow))
        {
            return ApiResponse<WeeklyMealPlanDto>.Fail(ProRequired.Message, new List<string> { ProRequired.Code }, ApiErrorKind.Forbidden);
        }

        var startDate = dto.StartDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var endDate = startDate.AddDays(6);

        // 1. Hồ sơ người dùng: dị ứng, bệnh lý, chế độ ăn ưu tiên và mục tiêu calo mỗi ngày.
        var userAllergyIds = await UserAllergyIdsAsync(userId);
        var conditions = await _db.UserConditions.AsNoTracking()
            .Where(uc => uc.HealthProfile.UserId == userId)
            .Select(uc => new { uc.MedicalCondition.Code, uc.MedicalCondition.Name })
            .ToListAsync();
        var profileTagIds = await _db.UserDietaryPreferences.AsNoTracking()
            .Where(p => p.HealthProfile.UserId == userId)
            .Select(p => p.TagId)
            .ToListAsync();
        var profileTarget = await _db.HealthProfiles.AsNoTracking()
            .Where(hp => hp.UserId == userId)
            .Select(hp => (double?)hp.DailyCaloriesTarget)
            .FirstOrDefaultAsync();
        var dailyTarget = dto.TargetDailyCalories is > 0 ? dto.TargetDailyCalories.Value
            : profileTarget is > 0 ? profileTarget.Value
            : 2000.0;

        // 2. Công thức ứng viên
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

        // Thứ tự ưu tiên (business_rule §12): Dị ứng → Bệnh lý → Mục tiêu dinh dưỡng → Chế độ ăn.
        // BR-102: loại hẳn công thức chứa chất gây dị ứng của người dùng, không bao giờ "tạm chấp nhận".
        var otherAllergens = await OtherAllergensAsync(userId);
        var safeRecipes = allRecipes
            .Where(r => !ContainsAllergen(r, userAllergyIds) && MatchOtherAllergen(r, otherAllergens) is null)
            .ToList();
        if (!safeRecipes.Any())
        {
            // Không tạo gì cả (và không đụng vào thực đơn đang có) thay vì xếp món chứa chất gây dị ứng.
            return ApiResponse<WeeklyMealPlanDto>.Fail(
                "Không có công thức nào phù hợp với danh sách dị ứng của bạn nên chưa tạo được thực đơn. Thực đơn hiện tại được giữ nguyên.",
                new List<string> { NoSuitableRecipesError });
        }

        // BR-110/111: bỏ món vượt ngưỡng tham khảo của bệnh lý đã khai báo.
        var notes = new List<string>();
        if (conditions.Count > 0)
        {
            var codes = conditions.Select(c => c.Code).ToList();
            var conditionNames = string.Join(", ", conditions.Select(c => c.Name));
            var suitable = safeRecipes.Where(r => HealthConditionRules.Evaluate(r, codes, _limits).Count == 0).ToList();
            if (suitable.Count == 0)
            {
                return ApiResponse<WeeklyMealPlanDto>.Fail(
                    $"Chưa có công thức nào hợp với bệnh lý bạn đã khai báo ({conditionNames}) nên chưa tạo được thực đơn. Thực đơn hiện tại được giữ nguyên.",
                    new List<string> { NoSuitableRecipesError });
            }

            if (suitable.Count < safeRecipes.Count)
            {
                notes.Add($"Đã bỏ {safeRecipes.Count - suitable.Count} món không hợp với {conditionNames} theo ngưỡng tham khảo — không thay thế tư vấn của bác sĩ.");
            }

            safeRecipes = suitable;
        }

        // Chế độ ăn là ưu tiên mềm: dietTag của request, không có thì chế độ ăn trong hồ sơ. Ô nào không có món đúng chế độ
        // thì dùng món khác và báo rõ trong message thay vì lặng lẽ bỏ qua.
        HashSet<Guid> preferredIds;
        string? dietLabel = null;
        if (!string.IsNullOrWhiteSpace(dto.DietTag))
        {
            preferredIds = safeRecipes
                .Where(r => r.RecipeTags.Any(t => t.Tag.Name.Contains(dto.DietTag, StringComparison.OrdinalIgnoreCase) || t.Tag.Code.Equals(dto.DietTag, StringComparison.OrdinalIgnoreCase)))
                .Select(r => r.Id)
                .ToHashSet();
            dietLabel = $"chế độ \"{dto.DietTag.Trim()}\"";
        }
        else if (profileTagIds.Count > 0)
        {
            preferredIds = safeRecipes.Where(r => r.RecipeTags.Any(t => profileTagIds.Contains(t.TagId))).Select(r => r.Id).ToHashSet();
            dietLabel = "chế độ ăn trong hồ sơ";
        }
        else
        {
            preferredIds = new HashSet<Guid>();
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

        // 4. Điền các ô còn trống: món hợp loại bữa, chưa dùng trong ngày, đúng chế độ ăn nếu có, và gần phần calo của bữa đó
        // (mục tiêu ngày × tỉ lệ bữa). Chọn ngẫu nhiên trong vài món gần nhất để mỗi lần tạo có chút khác nhau.
        var random = new Random();
        var shares = dto.IncludeSnack ? MealShareWithSnack : MealShareWithoutSnack;
        var slots = MealTypes.All.Where(shares.ContainsKey).ToList();

        var newPlans = new List<MealPlan>();
        var offDietSlots = 0;
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

                if (dietLabel != null)
                {
                    var onDiet = pool.Where(r => preferredIds.Contains(r.Id)).ToList();
                    if (onDiet.Count > 0)
                    {
                        pool = onDiet;
                    }
                    else
                    {
                        offDietSlots++;
                    }
                }

                var slotCalories = dailyTarget * shares[mealType];
                var ranked = pool
                    .Select(r => (Recipe: r, Gap: Math.Abs(r.CaloriesPerServing - slotCalories)))
                    .OrderBy(x => x.Gap)
                    .ToList();
                // Chỉ chọn ngẫu nhiên giữa các món gần mục tiêu ngang nhau (lệch thêm tối đa 15% phần calo của bữa, ít nhất 50 kcal)
                // để vẫn có thay đổi giữa các lần tạo mà không kéo thực đơn xa mục tiêu.
                var tolerance = Math.Max(50, slotCalories * 0.15);
                var closest = ranked
                    .Where(x => x.Gap <= ranked[0].Gap + tolerance)
                    .Take(CandidatesPerSlot)
                    .Select(x => x.Recipe)
                    .ToList();
                var pick = closest[random.Next(closest.Count)];
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

        if (dietLabel != null && offDietSlots > 0)
        {
            notes.Add($"Chưa đủ món thuộc {dietLabel} nên {offDietSlots} bữa dùng món khác.");
        }

        var result = await GetWeeklyPlanAsync(userId, startDate);
        result.Message = string.Join(" ", new[]
        {
            $"Đã xếp {newPlans.Count} bữa theo mục tiêu khoảng {dailyTarget:0} kcal/ngày."
        }.Concat(notes));
        return result;
    }

    // ───────────────────────────── Nội bộ ─────────────────────────────

    /// <summary>Truy vấn danh sách Id các dị ứng của người dùng từ CSDL.</summary>
    private async Task<HashSet<int>> UserAllergyIdsAsync(Guid userId) =>
        (await _db.UserAllergies.AsNoTracking()
            .Where(ua => ua.HealthProfile.UserId == userId)
            .Select(ua => ua.AllergyId)
            .ToListAsync()).ToHashSet();

    /// <summary>Kiểm tra công thức có chứa chất gây dị ứng nào trong danh sách allergyIds hay không.</summary>
    private static bool ContainsAllergen(Recipe recipe, HashSet<int> allergyIds) =>
        allergyIds.Count > 0 && recipe.RecipeIngredients.Any(ri => ri.Ingredient.IngredientAllergies.Any(a => allergyIds.Contains(a.AllergyId)));

    /// <summary>"Dị ứng khác" người dùng tự nhập (từ khóa tự do, BR-101/102).</summary>
    private async Task<IReadOnlyList<string>> OtherAllergensAsync(Guid userId) =>
        CustomAllergens.Keywords(await _db.HealthProfiles.AsNoTracking()
            .Where(hp => hp.UserId == userId)
            .Select(hp => hp.OtherAllergies)
            .FirstOrDefaultAsync());

    /// <summary>Kiểm tra xem tên món ăn hoặc nguyên liệu có chứa từ khóa dị ứng tùy chỉnh không.</summary>
    private static string? MatchOtherAllergen(Recipe recipe, IReadOnlyList<string> otherAllergens) =>
        CustomAllergens.FindMatch(otherAllergens, recipe.RecipeIngredients.Select(ri => ri.Ingredient.Name).Prepend(recipe.Title));

    /// <summary>Kiểm tra công thức có phù hợp với loại bữa ăn chỉ định (Breakfast, Lunch, Dinner, Snack) không.</summary>
    private static bool IsSuitableFor(Recipe recipe, string mealType) =>
        string.IsNullOrEmpty(recipe.MealTypes) || recipe.MealTypes.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Contains(mealType);

    /// <summary>Chuyển đổi thực thể MealPlan và Recipe sang PlannedMealItemDto.</summary>
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

    /// <summary>Lấy số thứ tự hiển thị của loại bữa ăn trong ngày.</summary>
    private static int MealOrder(string mealType)
    {
        var index = MealTypes.All.ToList().FindIndex(m => string.Equals(m, mealType, StringComparison.OrdinalIgnoreCase));
        return index < 0 ? int.MaxValue : index;
    }

    /// <summary>Kiểm tra lỗi vi phạm khóa duy nhất trong Postgres.</summary>
    private static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };

    /// <summary>Chuyển đổi DayOfWeek sang tên tiếng Việt (Thứ Hai, Thứ Ba,...).</summary>
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
