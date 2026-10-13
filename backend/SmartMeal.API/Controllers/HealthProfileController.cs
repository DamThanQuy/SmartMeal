using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.API.Infrastructure;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Health;
using SmartMeal.Application.Services;

namespace SmartMeal.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class HealthProfileController : ControllerBase
{
    private readonly IHealthProfileService _healthProfileService;

    public HealthProfileController(IHealthProfileService healthProfileService)
    {
        _healthProfileService = healthProfileService;
    }

    /// <summary>Khảo sát sức khỏe: tạo hồ sơ hoặc ghi đè toàn bộ. Cần <c>dateOfBirth</c> hoặc <c>age</c>.</summary>
    [HttpPost("survey")]
    [HttpPost("setup")]
    [HttpPost]
    public async Task<ActionResult<ApiResponse<HealthProfileDto>>> SubmitSurvey([FromBody] HealthSurveyRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<HealthProfileDto>();

        return this.ToActionResult(await _healthProfileService.SubmitSurveyAsync(userId, dto));
    }

    /// <summary>Cập nhật từng phần hồ sơ đã có; tự tính lại BMI/BMR/TDEE/mục tiêu. 404 nếu chưa có hồ sơ.</summary>
    [HttpPut]
    public async Task<ActionResult<ApiResponse<HealthProfileDto>>> UpdateProfile([FromBody] UpdateHealthProfileRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<HealthProfileDto>();

        return this.ToActionResult(await _healthProfileService.UpdateProfileAsync(userId, dto));
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<HealthProfileDto>>> GetProfile()
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<HealthProfileDto>();

        return this.ToActionResult(await _healthProfileService.GetProfileAsync(userId));
    }

    [HttpPost("weight-log")]
    public async Task<ActionResult<ApiResponse<WeightPointDto>>> LogWeight([FromBody] WeightLogRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<WeightPointDto>();

        return this.ToActionResult(await _healthProfileService.LogWeightAsync(userId, dto));
    }

    [HttpGet("weight-history")]
    public async Task<ActionResult<ApiResponse<WeightHistoryResponseDto>>> GetWeightHistory()
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<WeightHistoryResponseDto>();

        return this.ToActionResult(await _healthProfileService.GetWeightHistoryAsync(userId));
    }
}
