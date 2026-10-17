using Microsoft.EntityFrameworkCore;
using SmartMeal.Application.Common;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Health;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.Infrastructure.Services;

/// <summary>
/// Dịch vụ quản lý hồ sơ sức khỏe và tính toán chỉ số dinh dưỡng sinh học (Health Profile &amp; Biometrics):
/// - Khảo sát sức khỏe ban đầu (Submit Survey): Khởi tạo hoặc cập nhật toàn diện hồ sơ thể trạng người dùng.
/// - Thuật toán tính toán dinh dưỡng sinh học: BMI, BMR theo công thức Mifflin-St Jeor, TDEE và mục tiêu Calo/Macro (Carbs, Protein, Fat) hàng ngày.
/// - Cập nhật từng phần (Partial Update) thông tin sức khỏe, mức độ vận động và mục tiêu thể hình.
/// - Đồng bộ quan hệ N-N danh mục dị ứng thực phẩm, bệnh lý nền và chế độ ăn kiêng.
/// - Ghi nhận lịch sử cân nặng (Weight Log), tự động cập nhật cân nặng hiện tại và truy xuất biểu đồ biến thiên cân nặng theo thời gian.
/// </summary>
public class HealthProfileService : IHealthProfileService
{
    private const double WeightEpsilonKg = 0.001;
    private const string NoProfileMessage = "Chưa hoàn thành khảo sát sức khỏe ban đầu.";

    private readonly ApplicationDbContext _db;

    /// <summary>
    /// Khởi tạo instance mới của <see cref="HealthProfileService"/>.
    /// </summary>
    /// <param name="db">Database context của ứng dụng.</param>
    public HealthProfileService(ApplicationDbContext db)
    {
        _db = db;
    }

    // ───────────────────────────── Khảo sát (tạo / ghi đè toàn bộ) ─────────────────────────────

    /// <summary>
    /// Nộp kết quả khảo sát sức khỏe (Onboarding Survey):
    /// - Chuẩn hóa và kiểm tra tính hợp lệ của giới tính, mức độ vận động và mục tiêu thể hình.
    /// - Tính toán tuổi chính xác từ DateOfBirth (hoặc Age).
    /// - Xác thực các khóa ngoại AllergyIds, MedicalConditionIds, DietaryPreferenceIds trong CSDL.
    /// - Tính toán lại toàn bộ chỉ số sinh học (BMI, BMR, TDEE, Calo, Macros) và lượng nước khuyến nghị.
    /// - Đồng bộ danh sách dị ứng, bệnh lý và sở thích ăn uống.
    /// - Tự động tạo điểm ghi cân nặng ban đầu vào lịch sử cân nặng (WeightHistory).
    /// </summary>
    /// <param name="userId">Mã định danh duy nhất của người dùng.</param>
    /// <param name="dto">Dữ liệu khảo sát sức khỏe toàn diện.</param>
    /// <returns>Đối tượng <see cref="HealthProfileDto"/> hồ sơ sức khỏe vừa được lưu.</returns>
    public async Task<ApiResponse<HealthProfileDto>> SubmitSurveyAsync(Guid userId, HealthSurveyRequestDto dto)
    {
        var gender = HealthOptions.Canonical(dto.Gender, HealthOptions.Genders);
        var activity = HealthOptions.Canonical(dto.ActivityLevel, HealthOptions.ActivityLevels);
        var goal = HealthOptions.Canonical(dto.Goal, HealthOptions.Goals);
        if (gender is null || activity is null || goal is null)
        {
            return ApiResponse<HealthProfileDto>.Fail("Giới tính, mức độ vận động hoặc mục tiêu không hợp lệ.");
        }

        var today = Today();
        if (!TryResolveAge(dto.DateOfBirth, dto.Age, today, out var age, out var ageError))
        {
            return ApiResponse<HealthProfileDto>.Fail(ageError!);
        }

        var referenceError = await ValidateReferencesAsync(dto.AllergyIds, dto.MedicalConditionIds, dto.DietaryPreferenceIds);
        if (referenceError is not null)
        {
            return ApiResponse<HealthProfileDto>.Fail(referenceError);
        }

        var profile = await LoadProfileAsync(userId);
        var isNew = profile is null;
        double? previousWeight = profile?.CurrentWeightKg;

        if (profile is null)
        {
            profile = new HealthProfile { UserId = userId };
            _db.HealthProfiles.Add(profile);
        }

        profile.Gender = gender;
        profile.Age = age;
        // Giữ ngày sinh đã lưu nếu client cũ chỉ gửi tuổi mà tuổi đó vẫn khớp.
        profile.DateOfBirth = dto.DateOfBirth
            ?? (profile.DateOfBirth is { } known && NutritionCalculator.CalculateAge(known, today) == age ? known : null);
        profile.HeightCm = dto.HeightCm;
        profile.CurrentWeightKg = dto.CurrentWeightKg;
        profile.TargetWeightKg = dto.TargetWeightKg;
        profile.ActivityLevel = activity;
        profile.Goal = goal;
        if (dto.WaterGoalMl.HasValue)
        {
            profile.WaterGoalMl = dto.WaterGoalMl.Value;
        }

        // Khảo sát ghi đè toàn bộ hồ sơ: không gửi = không có dị ứng khác.
        profile.OtherAllergies = CustomAllergens.Normalize(dto.OtherAllergies);

        ApplyMetrics(profile, today);

        SyncJoin(profile.UserAllergies, dto.AllergyIds, ua => ua.AllergyId,
            id => new UserAllergy { HealthProfileId = profile.Id, AllergyId = id });
        SyncJoin(profile.UserConditions, dto.MedicalConditionIds, uc => uc.MedicalConditionId,
            id => new UserCondition { HealthProfileId = profile.Id, MedicalConditionId = id });
        SyncJoin(profile.DietaryPreferences, dto.DietaryPreferenceIds, dp => dp.TagId,
            id => new UserDietaryPreference { HealthProfileId = profile.Id, TagId = id });

        // Chỉ thêm điểm cân nặng khi là hồ sơ mới hoặc cân nặng thực sự đổi (không còn dòng thừa mỗi lần lưu).
        if (isNew || WeightChanged(previousWeight, profile.CurrentWeightKg))
        {
            _db.WeightHistories.Add(NewWeightPoint(profile));
        }

        await _db.SaveChangesAsync();

        return ApiResponse<HealthProfileDto>.Ok(await MapToDtoAsync(profile.Id), "Cập nhật hồ sơ sức khỏe và chỉ số dinh dưỡng thành công.");
    }

    // ───────────────────────────── Cập nhật từng phần ─────────────────────────────

    /// <summary>
    /// Cập nhật từng phần hồ sơ sức khỏe đã tồn tại của người dùng:
    /// - Chỉ cập nhật các trường có mặt trong DTO request (Partial Patch).
    /// - Tự động tính toán lại BMI, BMR, TDEE và mục tiêu Calories / Macros nếu có thay đổi về chiều cao, cân nặng, mục tiêu hoặc mức độ vận động.
    /// - Tự động bổ sung bản ghi biến động cân nặng nếu người dùng cập nhật CurrentWeightKg mới.
    /// </summary>
    /// <param name="userId">Mã định danh duy nhất của người dùng.</param>
    /// <param name="dto">Dữ liệu các trường cần cập nhật.</param>
    /// <returns>Hồ sơ sức khỏe <see cref="HealthProfileDto"/> sau khi cập nhật.</returns>
    public async Task<ApiResponse<HealthProfileDto>> UpdateProfileAsync(Guid userId, UpdateHealthProfileRequestDto dto)
    {
        var profile = await LoadProfileAsync(userId);
        if (profile is null)
        {
            return ApiResponse<HealthProfileDto>.Fail(NoProfileMessage, null, ApiErrorKind.NotFound);
        }

        var today = Today();
        var previousWeight = profile.CurrentWeightKg;

        if (dto.Gender is not null)
        {
            var gender = HealthOptions.Canonical(dto.Gender, HealthOptions.Genders);
            if (gender is null) return ApiResponse<HealthProfileDto>.Fail("Giới tính không hợp lệ.");
            profile.Gender = gender;
        }

        if (dto.ActivityLevel is not null)
        {
            var activity = HealthOptions.Canonical(dto.ActivityLevel, HealthOptions.ActivityLevels);
            if (activity is null) return ApiResponse<HealthProfileDto>.Fail("Mức độ vận động không hợp lệ.");
            profile.ActivityLevel = activity;
        }

        if (dto.Goal is not null)
        {
            var goal = HealthOptions.Canonical(dto.Goal, HealthOptions.Goals);
            if (goal is null) return ApiResponse<HealthProfileDto>.Fail("Mục tiêu không hợp lệ.");
            profile.Goal = goal;
        }

        if (dto.DateOfBirth.HasValue)
        {
            if (!TryResolveAge(dto.DateOfBirth, null, today, out var age, out var ageError))
            {
                return ApiResponse<HealthProfileDto>.Fail(ageError!);
            }

            profile.DateOfBirth = dto.DateOfBirth;
            profile.Age = age;
        }
        else if (dto.Age.HasValue)
        {
            profile.Age = dto.Age.Value;
            if (profile.DateOfBirth is { } known && NutritionCalculator.CalculateAge(known, today) != dto.Age.Value)
            {
                profile.DateOfBirth = null; // tuổi mới mâu thuẫn với ngày sinh cũ
            }
        }

        if (dto.HeightCm.HasValue) profile.HeightCm = dto.HeightCm.Value;
        if (dto.CurrentWeightKg.HasValue) profile.CurrentWeightKg = dto.CurrentWeightKg.Value;
        if (dto.TargetWeightKg.HasValue) profile.TargetWeightKg = dto.TargetWeightKg.Value;
        if (dto.WaterGoalMl.HasValue) profile.WaterGoalMl = dto.WaterGoalMl.Value;
        if (dto.OtherAllergies is not null) profile.OtherAllergies = CustomAllergens.Normalize(dto.OtherAllergies);

        var referenceError = await ValidateReferencesAsync(
            dto.AllergyIds ?? new List<int>(),
            dto.MedicalConditionIds ?? new List<int>(),
            dto.DietaryPreferenceIds ?? new List<int>());
        if (referenceError is not null)
        {
            return ApiResponse<HealthProfileDto>.Fail(referenceError);
        }

        ApplyMetrics(profile, today);

        if (dto.AllergyIds is not null)
        {
            SyncJoin(profile.UserAllergies, dto.AllergyIds, ua => ua.AllergyId,
                id => new UserAllergy { HealthProfileId = profile.Id, AllergyId = id });
        }

        if (dto.MedicalConditionIds is not null)
        {
            SyncJoin(profile.UserConditions, dto.MedicalConditionIds, uc => uc.MedicalConditionId,
                id => new UserCondition { HealthProfileId = profile.Id, MedicalConditionId = id });
        }

        if (dto.DietaryPreferenceIds is not null)
        {
            SyncJoin(profile.DietaryPreferences, dto.DietaryPreferenceIds, dp => dp.TagId,
                id => new UserDietaryPreference { HealthProfileId = profile.Id, TagId = id });
        }

        if (dto.CurrentWeightKg.HasValue && WeightChanged(previousWeight, profile.CurrentWeightKg))
        {
            _db.WeightHistories.Add(NewWeightPoint(profile));
        }

        await _db.SaveChangesAsync();

        return ApiResponse<HealthProfileDto>.Ok(await MapToDtoAsync(profile.Id), "Cập nhật hồ sơ sức khỏe thành công.");
    }

    /// <summary>
    /// Lấy thông tin hồ sơ sức khỏe chi tiết của người dùng:
    /// Trả về toàn bộ các chỉ số thể trạng, phân loại BMI, định mức Calories/Macros và danh sách dị ứng, bệnh lý.
    /// </summary>
    /// <param name="userId">Mã định danh duy nhất của người dùng.</param>
    /// <returns>Đối tượng <see cref="HealthProfileDto"/> chứa hồ sơ sức khỏe đầy đủ.</returns>
    public async Task<ApiResponse<HealthProfileDto>> GetProfileAsync(Guid userId)
    {
        var profile = await _db.HealthProfiles.AsNoTracking().FirstOrDefaultAsync(hp => hp.UserId == userId);
        if (profile == null)
        {
            return ApiResponse<HealthProfileDto>.Fail(NoProfileMessage, null, ApiErrorKind.NotFound);
        }

        return ApiResponse<HealthProfileDto>.Ok(await MapToDtoAsync(profile.Id));
    }

    // ───────────────────────────── Cân nặng ─────────────────────────────

    /// <summary>
    /// Ghi nhận điểm đo cân nặng mới vào lịch sử thể trạng (Weight Log):
    /// - Lưu mốc cân nặng và thời điểm đo vào bảng WeightHistories.
    /// - Nếu thời điểm đo mới nhất lớn hơn hoặc bằng lần đo gần nhất: Tự động cập nhật CurrentWeightKg trong hồ sơ sức khỏe và tính lại BMI tức thời.
    /// - Tính toán độ lệch chênh lệch so với cân nặng mục tiêu (DiffFromTargetKg).
    /// </summary>
    /// <param name="userId">Mã định danh người dùng.</param>
    /// <param name="dto">Dữ liệu ghi cân nặng (kg) và thời điểm đo.</param>
    /// <returns>Đối tượng <see cref="WeightPointDto"/> chứa điểm đo vừa tạo.</returns>
    public async Task<ApiResponse<WeightPointDto>> LogWeightAsync(Guid userId, WeightLogRequestDto dto)
    {
        var profile = await _db.HealthProfiles.FirstOrDefaultAsync(hp => hp.UserId == userId);
        if (profile == null)
        {
            return ApiResponse<WeightPointDto>.Fail("Vui lòng hoàn thành khảo sát sức khỏe trước khi ghi nhận cân nặng.");
        }

        var recordedAt = ToUtc(dto.RecordedAt ?? DateTime.UtcNow);
        var latest = await _db.WeightHistories
            .Where(w => w.HealthProfileId == profile.Id)
            .MaxAsync(w => (DateTime?)w.RecordedAt);

        // Chỉ lần đo MỚI NHẤT mới đổi cân nặng hiện tại; ghi bù một lần đo cũ không được ghi đè cân nặng hiện tại.
        if (latest is null || recordedAt >= latest.Value)
        {
            profile.CurrentWeightKg = dto.WeightKg;
            ApplyMetrics(profile, Today());
        }

        var weightHistory = new WeightHistory
        {
            HealthProfileId = profile.Id,
            WeightKg = dto.WeightKg,
            RecordedAt = recordedAt
        };

        _db.WeightHistories.Add(weightHistory);
        await _db.SaveChangesAsync();

        var pointDto = new WeightPointDto
        {
            Id = weightHistory.Id,
            WeightKg = weightHistory.WeightKg,
            RecordedAt = weightHistory.RecordedAt,
            DiffFromTargetKg = Math.Round(weightHistory.WeightKg - profile.TargetWeightKg, 1)
        };

        return ApiResponse<WeightPointDto>.Ok(pointDto, "Ghi nhận cân nặng thành công.");
    }

    /// <summary>
    /// Lấy lịch sử diễn biến cân nặng theo thời gian phục vụ vẽ biểu đồ:
    /// - Sắp xếp theo trình tự thời gian tăng dần.
    /// - Thống kê cân nặng khởi điểm (InitialWeightKg), cân nặng hiện tại, cân nặng mục tiêu và tổng số kg đã tăng/giảm.
    /// </summary>
    /// <param name="userId">Mã định danh người dùng.</param>
    /// <param name="days">Số ngày gần nhất cần trích xuất (tùy chọn).</param>
    /// <returns>Đối tượng <see cref="WeightHistoryResponseDto"/> chứa danh sách lịch sử đo và các thống kê tổng quát.</returns>
    public async Task<ApiResponse<WeightHistoryResponseDto>> GetWeightHistoryAsync(Guid userId, int? days = null)
    {
        var profile = await _db.HealthProfiles
            .Include(hp => hp.WeightHistories)
            .AsNoTracking()
            .FirstOrDefaultAsync(hp => hp.UserId == userId);

        if (profile == null)
        {
            return ApiResponse<WeightHistoryResponseDto>.Fail("Chưa có dữ liệu hồ sơ sức khỏe.", null, ApiErrorKind.NotFound);
        }

        var histories = profile.WeightHistories.OrderBy(w => w.RecordedAt).ToList();
        var initialWeight = histories.FirstOrDefault()?.WeightKg ?? profile.CurrentWeightKg;
        var since = days is { } d ? DateTime.UtcNow.AddDays(-d) : DateTime.MinValue;

        var historyDtos = histories.Where(w => w.RecordedAt >= since).Select(w => new WeightPointDto
        {
            Id = w.Id,
            WeightKg = w.WeightKg,
            RecordedAt = w.RecordedAt,
            DiffFromTargetKg = Math.Round(w.WeightKg - profile.TargetWeightKg, 1)
        }).ToList();

        var result = new WeightHistoryResponseDto
        {
            CurrentWeightKg = profile.CurrentWeightKg,
            TargetWeightKg = profile.TargetWeightKg,
            InitialWeightKg = initialWeight,
            TotalWeightChangedKg = Math.Round(profile.CurrentWeightKg - initialWeight, 1),
            BMI = profile.BMI,
            BMICategory = NutritionCalculator.GetBmiClassification(profile.BMI),
            History = historyDtos
        };

        return ApiResponse<WeightHistoryResponseDto>.Ok(result, "Lấy lịch sử cân nặng thành công.");
    }

    // ───────────────────────────── Nội bộ ─────────────────────────────

    /// <summary>Lấy ngày hiện tại dạng DateOnly theo giờ UTC.</summary>
    private static DateOnly Today() => DateOnly.FromDateTime(DateTime.UtcNow);

    /// <summary>Truy vấn hồ sơ sức khỏe đầy đủ kèm các quan hệ liên kết N-N từ database.</summary>
    private Task<HealthProfile?> LoadProfileAsync(Guid userId) => _db.HealthProfiles
        .Include(hp => hp.UserAllergies)
        .Include(hp => hp.UserConditions)
        .Include(hp => hp.DietaryPreferences)
        .FirstOrDefaultAsync(hp => hp.UserId == userId);

    /// <summary>Giải quyết và xác thực tuổi người dùng từ ngày sinh hoặc số tuổi trực tiếp (từ 13 đến 100 tuổi).</summary>
    private static bool TryResolveAge(DateOnly? dateOfBirth, int? age, DateOnly today, out int resolved, out string? error)
    {
        resolved = 0;
        error = null;

        if (dateOfBirth.HasValue)
        {
            if (dateOfBirth.Value > today)
            {
                error = "Ngày sinh không được ở tương lai.";
                return false;
            }

            resolved = NutritionCalculator.CalculateAge(dateOfBirth.Value, today);
            if (resolved is < 13 or > 100)
            {
                error = "Tuổi (tính từ ngày sinh) phải từ 13 đến 100.";
                return false;
            }

            return true;
        }

        if (age.HasValue)
        {
            resolved = age.Value;
            return true;
        }

        error = "Cần cung cấp dateOfBirth hoặc age.";
        return false;
    }

    /// <summary>Lấy số tuổi hiệu lực của người dùng tính đến ngày hiện tại.</summary>
    private static int EffectiveAge(HealthProfile profile, DateOnly today) =>
        profile.DateOfBirth is { } dob ? NutritionCalculator.CalculateAge(dob, today) : profile.Age;

    /// <summary>Tính lại BMI → BMR → TDEE → mục tiêu calo/macro (BR-003) từ dữ liệu hiện có của hồ sơ.</summary>
    private static void ApplyMetrics(HealthProfile profile, DateOnly today)
    {
        var age = EffectiveAge(profile, today);
        profile.Age = age;
        profile.BMI = NutritionCalculator.CalculateBmi(profile.CurrentWeightKg, profile.HeightCm);
        profile.BMR = NutritionCalculator.CalculateBmr(profile.Gender, profile.CurrentWeightKg, profile.HeightCm, age);
        profile.TDEE = NutritionCalculator.CalculateTdee(profile.BMR, profile.ActivityLevel);
        var (calories, carbs, fat, protein) = NutritionCalculator.CalculateGoals(profile.TDEE, profile.Goal);
        profile.DailyCaloriesTarget = calories;
        profile.DailyCarbsTargetGrams = carbs;
        profile.DailyFatTargetGrams = fat;
        profile.DailyProteinTargetGrams = protein;
        profile.UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Kiểm tra xem cân nặng có sự thay đổi thực sự so với mức cân cũ hay không (vượt ngưỡng sai số Epsilon).</summary>
    private static bool WeightChanged(double? previous, double current) =>
        previous is null || Math.Abs(previous.Value - current) > WeightEpsilonKg;

    /// <summary>Khởi tạo điểm đo cân nặng mới.</summary>
    private static WeightHistory NewWeightPoint(HealthProfile profile) => new()
    {
        HealthProfileId = profile.Id,
        WeightKg = profile.CurrentWeightKg,
        RecordedAt = DateTime.UtcNow
    };

    /// <summary>Chuyển đổi thời gian DateTime về chuẩn DateTimeKind.Utc.</summary>
    private static DateTime ToUtc(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
    };

    /// <summary>
    /// Đồng bộ một tập quan hệ N-N về đúng danh sách id mong muốn bằng hiệu số: chỉ xóa phần bị bỏ và chỉ thêm
    /// phần mới. Không xóa rồi thêm lại cùng khóa (cách đó dễ lỗi khi lưu lại hồ sơ với các lựa chọn cũ).
    /// </summary>
    private void SyncJoin<T>(ICollection<T> current, IEnumerable<int> desiredIds, Func<T, int> idOf, Func<int, T> create)
        where T : class
    {
        var desired = desiredIds.ToHashSet();

        foreach (var row in current.Where(r => !desired.Contains(idOf(r))).ToList())
        {
            _db.Remove(row);
        }

        var kept = current.Where(r => desired.Contains(idOf(r))).Select(idOf).ToHashSet();
        foreach (var id in desired.Where(id => !kept.Contains(id)))
        {
            current.Add(create(id));
        }
    }

    /// <summary>Id dị ứng / bệnh lý / chế độ ăn phải tồn tại — trả thông báo lỗi nếu có id lạ (trước đây gây lỗi FK 500).</summary>
    private async Task<string?> ValidateReferencesAsync(
        IEnumerable<int> allergyIds, IEnumerable<int> conditionIds, IEnumerable<int> tagIds)
    {
        var allergies = allergyIds.Distinct().ToList();
        if (allergies.Count > 0 && await _db.Allergies.CountAsync(a => allergies.Contains(a.Id)) != allergies.Count)
        {
            return "allergyIds chứa id không tồn tại (xem /api/meta/allergies).";
        }

        var conditions = conditionIds.Distinct().ToList();
        if (conditions.Count > 0 && await _db.MedicalConditions.CountAsync(c => conditions.Contains(c.Id)) != conditions.Count)
        {
            return "medicalConditionIds chứa id không tồn tại (xem /api/meta/medical-conditions).";
        }

        var tags = tagIds.Distinct().ToList();
        if (tags.Count > 0 && await _db.Tags.CountAsync(t => tags.Contains(t.Id)) != tags.Count)
        {
            return "dietaryPreferenceIds chứa id không tồn tại (xem /api/meta/tags).";
        }

        return null;
    }

    /// <summary>Ánh xạ thực thể HealthProfile sang HealthProfileDto đầy đủ.</summary>
    private async Task<HealthProfileDto> MapToDtoAsync(Guid profileId)
    {
        var profile = await _db.HealthProfiles
            .AsNoTracking()
            .Include(hp => hp.UserAllergies).ThenInclude(ua => ua.Allergy)
            .Include(hp => hp.UserConditions).ThenInclude(uc => uc.MedicalCondition)
            .Include(hp => hp.DietaryPreferences).ThenInclude(dp => dp.Tag)
            .FirstAsync(hp => hp.Id == profileId);

        var allergies = profile.UserAllergies.OrderBy(ua => ua.AllergyId).ToList();
        var conditions = profile.UserConditions.OrderBy(uc => uc.MedicalConditionId).ToList();
        var diets = profile.DietaryPreferences.OrderBy(dp => dp.TagId).ToList();

        return new HealthProfileDto
        {
            Id = profile.Id,
            Gender = profile.Gender,
            Age = EffectiveAge(profile, Today()),
            DateOfBirth = profile.DateOfBirth,
            HeightCm = profile.HeightCm,
            CurrentWeightKg = profile.CurrentWeightKg,
            TargetWeightKg = profile.TargetWeightKg,
            ActivityLevel = profile.ActivityLevel,
            Goal = profile.Goal,
            WaterGoalMl = profile.WaterGoalMl,
            BMI = profile.BMI,
            BmiClassification = NutritionCalculator.GetBmiClassification(profile.BMI),
            BMR = profile.BMR,
            TDEE = profile.TDEE,
            DailyCaloriesTarget = profile.DailyCaloriesTarget,
            DailyCarbsTargetGrams = profile.DailyCarbsTargetGrams,
            DailyFatTargetGrams = profile.DailyFatTargetGrams,
            DailyProteinTargetGrams = profile.DailyProteinTargetGrams,
            Allergies = allergies.Select(ua => ua.Allergy.Name).ToList(),
            MedicalConditions = conditions.Select(uc => uc.MedicalCondition.Name).ToList(),
            DietaryPreferences = diets.Select(dp => dp.Tag.Name).ToList(),
            AllergyIds = allergies.Select(ua => ua.AllergyId).ToList(),
            MedicalConditionIds = conditions.Select(uc => uc.MedicalConditionId).ToList(),
            DietaryPreferenceIds = diets.Select(dp => dp.TagId).ToList(),
            OtherAllergies = profile.OtherAllergies
        };
    }
}
