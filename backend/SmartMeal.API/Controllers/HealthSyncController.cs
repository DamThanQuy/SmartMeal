using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.HealthSync;
using SmartMeal.Application.Services;
using System.Security.Claims;

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

    [HttpPost("steps-and-calories")]
    public async Task<ActionResult<ApiResponse<SyncHealthMetricsResponseDto>>> SyncStepsAndCalories([FromBody] SyncHealthMetricsRequestDto dto)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized(ApiResponse<SyncHealthMetricsResponseDto>.Fail("Phiên đăng nhập không hợp lệ."));

        var result = await _healthSyncService.SyncStepsAndCaloriesAsync(userId, dto);
        return Ok(result);
    }

    [HttpGet("daily-summary")]
    public async Task<ActionResult<ApiResponse<DailyHealthSyncSummaryDto>>> GetDailySummary([FromQuery] DateOnly? date)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized(ApiResponse<DailyHealthSyncSummaryDto>.Fail("Phiên đăng nhập không hợp lệ."));

        var targetDate = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var result = await _healthSyncService.GetDailySummaryAsync(userId, targetDate);
        return Ok(result);
    }
}
