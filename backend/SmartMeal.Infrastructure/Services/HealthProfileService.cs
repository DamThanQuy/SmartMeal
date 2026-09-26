using Microsoft.EntityFrameworkCore;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Health;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.Infrastructure.Services;

public class HealthProfileService : IHealthProfileService
{
    private readonly ApplicationDbContext _db;

    public HealthProfileService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<ApiResponse<HealthProfileDto>> SubmitSurveyAsync(Guid userId, HealthSurveyRequestDto dto)
    {
        var bmi = NutritionCalculator.CalculateBmi(dto.CurrentWeightKg, dto.HeightCm);
        var bmr = NutritionCalculator.CalculateBmr(dto.Gender, dto.CurrentWeightKg, dto.HeightCm, dto.Age);
        var tdee = NutritionCalculator.CalculateTdee(bmr, dto.ActivityLevel);
        var (cal, carbs, fat, protein) = NutritionCalculator.CalculateGoals(tdee, dto.Goal);

        var profile = await _db.HealthProfiles
            .Include(hp => hp.UserAllergies)
            .Include(hp => hp.UserConditions)
            .Include(hp => hp.WeightHistories)
            .FirstOrDefaultAsync(hp => hp.UserId == userId);

        if (profile == null)
        {
            profile = new HealthProfile
            {
                UserId = userId,
                Gender = dto.Gender,
                Age = dto.Age,
                HeightCm = dto.HeightCm,
                CurrentWeightKg = dto.CurrentWeightKg,
                TargetWeightKg = dto.TargetWeightKg,
                ActivityLevel = dto.ActivityLevel,
                Goal = dto.Goal,
                BMI = bmi,
                BMR = bmr,
                TDEE = tdee,
                DailyCaloriesTarget = cal,
                DailyCarbsTargetGrams = carbs,
                DailyFatTargetGrams = fat,
                DailyProteinTargetGrams = protein
            };
            _db.HealthProfiles.Add(profile);
        }
        else
        {
            profile.Gender = dto.Gender;
            profile.Age = dto.Age;
            profile.HeightCm = dto.HeightCm;
            profile.CurrentWeightKg = dto.CurrentWeightKg;
            profile.TargetWeightKg = dto.TargetWeightKg;
            profile.ActivityLevel = dto.ActivityLevel;
            profile.Goal = dto.Goal;
            profile.BMI = bmi;
            profile.BMR = bmr;
            profile.TDEE = tdee;
            profile.DailyCaloriesTarget = cal;
            profile.DailyCarbsTargetGrams = carbs;
            profile.DailyFatTargetGrams = fat;
            profile.DailyProteinTargetGrams = protein;
            profile.UpdatedAt = DateTime.UtcNow;

            profile.UserAllergies.Clear();
            profile.UserConditions.Clear();
        }

        foreach (var allergyId in dto.AllergyIds)
        {
            profile.UserAllergies.Add(new UserAllergy { HealthProfileId = profile.Id, AllergyId = allergyId });
        }

        foreach (var condId in dto.MedicalConditionIds)
        {
            profile.UserConditions.Add(new UserCondition { HealthProfileId = profile.Id, MedicalConditionId = condId });
        }

        profile.WeightHistories.Add(new WeightHistory
        {
            HealthProfileId = profile.Id,
            WeightKg = dto.CurrentWeightKg,
            RecordedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        return ApiResponse<HealthProfileDto>.Ok(await MapToDto(profile.Id), "Cập nhật hồ sơ sức khỏe và chỉ số dinh dưỡng thành công.");
    }

    public async Task<ApiResponse<HealthProfileDto>> GetProfileAsync(Guid userId)
    {
        var profile = await _db.HealthProfiles.FirstOrDefaultAsync(hp => hp.UserId == userId);
        if (profile == null)
            return ApiResponse<HealthProfileDto>.Fail("Chưa hoàn thành khảo sát sức khỏe ban đầu.");

        return ApiResponse<HealthProfileDto>.Ok(await MapToDto(profile.Id));
    }

    public async Task<ApiResponse<WeightPointDto>> LogWeightAsync(Guid userId, WeightLogRequestDto dto)
    {
        var profile = await _db.HealthProfiles.FirstOrDefaultAsync(hp => hp.UserId == userId);
        if (profile == null)
            return ApiResponse<WeightPointDto>.Fail("Vui lòng hoàn thành khảo sát sức khỏe trước khi ghi nhận cân nặng.");

        var recordedAt = dto.RecordedAt ?? DateTime.UtcNow;
        profile.CurrentWeightKg = dto.WeightKg;
        profile.BMI = NutritionCalculator.CalculateBmi(dto.WeightKg, profile.HeightCm);
        profile.BMR = NutritionCalculator.CalculateBmr(profile.Gender, dto.WeightKg, profile.HeightCm, profile.Age);
        profile.TDEE = NutritionCalculator.CalculateTdee(profile.BMR, profile.ActivityLevel);
        var (cal, carbs, fat, protein) = NutritionCalculator.CalculateGoals(profile.TDEE, profile.Goal);
        profile.DailyCaloriesTarget = cal;
        profile.DailyCarbsTargetGrams = carbs;
        profile.DailyFatTargetGrams = fat;
        profile.DailyProteinTargetGrams = protein;
        profile.UpdatedAt = DateTime.UtcNow;

        var weightHistory = new WeightHistory
        {
            HealthProfileId = profile.Id,
            WeightKg = dto.WeightKg,
            RecordedAt = recordedAt
        };

        await _db.WeightHistories.AddAsync(weightHistory);
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

    public async Task<ApiResponse<WeightHistoryResponseDto>> GetWeightHistoryAsync(Guid userId)
    {
        var profile = await _db.HealthProfiles
            .Include(hp => hp.WeightHistories)
            .FirstOrDefaultAsync(hp => hp.UserId == userId);

        if (profile == null)
            return ApiResponse<WeightHistoryResponseDto>.Fail("Chưa có dữ liệu hồ sơ sức khỏe.");

        var histories = profile.WeightHistories.OrderBy(w => w.RecordedAt).ToList();
        var initialWeight = histories.FirstOrDefault()?.WeightKg ?? profile.CurrentWeightKg;

        var historyDtos = histories.Select(w => new WeightPointDto
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

    private async Task<HealthProfileDto> MapToDto(Guid profileId)
    {
        var profile = await _db.HealthProfiles
            .Include(hp => hp.UserAllergies).ThenInclude(ua => ua.Allergy)
            .Include(hp => hp.UserConditions).ThenInclude(uc => uc.MedicalCondition)
            .FirstAsync(hp => hp.Id == profileId);

        return new HealthProfileDto
        {
            Id = profile.Id,
            Gender = profile.Gender,
            Age = profile.Age,
            HeightCm = profile.HeightCm,
            CurrentWeightKg = profile.CurrentWeightKg,
            TargetWeightKg = profile.TargetWeightKg,
            ActivityLevel = profile.ActivityLevel,
            Goal = profile.Goal,
            BMI = profile.BMI,
            BmiClassification = NutritionCalculator.GetBmiClassification(profile.BMI),
            BMR = profile.BMR,
            TDEE = profile.TDEE,
            DailyCaloriesTarget = profile.DailyCaloriesTarget,
            DailyCarbsTargetGrams = profile.DailyCarbsTargetGrams,
            DailyFatTargetGrams = profile.DailyFatTargetGrams,
            DailyProteinTargetGrams = profile.DailyProteinTargetGrams,
            Allergies = profile.UserAllergies.Select(ua => ua.Allergy.Name).ToList(),
            MedicalConditions = profile.UserConditions.Select(uc => uc.MedicalCondition.Name).ToList()
        };
    }
}
