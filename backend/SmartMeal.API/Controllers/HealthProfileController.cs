using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Health;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;
using System.Security.Claims;

namespace SmartMeal.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class HealthProfileController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public HealthProfileController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpPost("survey")]
    public async Task<ActionResult<ApiResponse<HealthProfileDto>>> SubmitSurvey([FromBody] HealthSurveyRequestDto dto)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized(ApiResponse<HealthProfileDto>.Fail("Phiên đăng nhập không hợp lệ."));

        // Calculate Metrics
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

        // Add Allergies
        foreach (var allergyId in dto.AllergyIds)
        {
            profile.UserAllergies.Add(new UserAllergy { HealthProfileId = profile.Id, AllergyId = allergyId });
        }

        // Add Conditions
        foreach (var condId in dto.MedicalConditionIds)
        {
            profile.UserConditions.Add(new UserCondition { HealthProfileId = profile.Id, MedicalConditionId = condId });
        }

        // Add initial Weight History
        profile.WeightHistories.Add(new WeightHistory
        {
            HealthProfileId = profile.Id,
            WeightKg = dto.CurrentWeightKg,
            RecordedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        return Ok(ApiResponse<HealthProfileDto>.Ok(await MapToDto(profile.Id), "Cập nhật hồ sơ sức khỏe và chỉ số dinh dưỡng thành công."));
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<HealthProfileDto>>> GetProfile()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized(ApiResponse<HealthProfileDto>.Fail("Phiên đăng nhập không hợp lệ."));

        var profile = await _db.HealthProfiles.FirstOrDefaultAsync(hp => hp.UserId == userId);
        if (profile == null)
            return NotFound(ApiResponse<HealthProfileDto>.Fail("Chưa hoàn thành khảo sát sức khỏe ban đầu."));

        return Ok(ApiResponse<HealthProfileDto>.Ok(await MapToDto(profile.Id)));
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
