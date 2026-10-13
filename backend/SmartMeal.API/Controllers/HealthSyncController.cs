using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.API.Infrastructure;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.HealthSync;
using SmartMeal.Application.Services;

namespace SmartMeal.API.Controllers;

[Authorize]
[ApiController]
[Route("api/health-sync")]
public class HealthSyncController : ControllerBase
{
    private readonly IHealthSyncService _healthSyncService;

    public HealthSyncController(IHealthSyncService healthSyncService)
    {
        _healthSyncService = healthSyncService;
    }

    /// <summary>Gửi tổng của một ngày từ một nguồn. Gửi lại cùng (ngày, nguồn) thay thế giá trị cũ, không cộng dồn.</summary>
    [HttpPost("steps-and-calories")]
    public async Task<ActionResult<ApiResponse<SyncHealthMetricsResponseDto>>> SyncStepsAndCalories([FromBody] SyncHealthMetricsRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<SyncHealthMetricsResponseDto>();

        return this.ToActionResult(await _healthSyncService.SyncStepsAndCaloriesAsync(userId, dto));
    }

    [HttpGet("daily-summary")]
    public async Task<ActionResult<ApiResponse<DailyHealthSyncSummaryDto>>> GetDailySummary([FromQuery] DateOnly? date)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<DailyHealthSyncSummaryDto>();

        var targetDate = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        return this.ToActionResult(await _healthSyncService.GetDailySummaryAsync(userId, targetDate));
    }
}
