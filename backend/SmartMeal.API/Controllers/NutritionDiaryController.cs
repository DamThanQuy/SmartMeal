using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Diary;
using SmartMeal.Application.Services;
using System.Security.Claims;

namespace SmartMeal.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class NutritionDiaryController : ControllerBase
{
    private readonly INutritionDiaryService _diaryService;

    public NutritionDiaryController(INutritionDiaryService diaryService)
    {
        _diaryService = diaryService;
    }

    [HttpPost("log")]
    public async Task<ActionResult<ApiResponse<DiaryItemDto>>> LogMeal([FromBody] LogMealRequestDto dto)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized(ApiResponse<DiaryItemDto>.Fail("Phiên đăng nhập không hợp lệ."));

        var result = await _diaryService.LogMealAsync(userId, dto);
        return Ok(result);
    }

    [HttpGet("daily")]
    public async Task<ActionResult<ApiResponse<DailyDiarySummaryDto>>> GetDailySummary([FromQuery] DateOnly? date)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized(ApiResponse<DailyDiarySummaryDto>.Fail("Phiên đăng nhập không hợp lệ."));

        var targetDate = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var result = await _diaryService.GetDailySummaryAsync(userId, targetDate);
        return Ok(result);
    }

    [HttpGet("weekly-progress")]
    public async Task<ActionResult<ApiResponse<WeeklyProgressDto>>> GetWeeklyProgress([FromQuery] DateOnly? startDate)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized(ApiResponse<WeeklyProgressDto>.Fail("Phiên đăng nhập không hợp lệ."));

        var start = startDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-6));
        var result = await _diaryService.GetWeeklyProgressAsync(userId, start);
        return Ok(result);
    }

    [HttpDelete("items/{itemId:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteItem(Guid itemId)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized(ApiResponse<bool>.Fail("Phiên đăng nhập không hợp lệ."));

        var result = await _diaryService.DeleteDiaryItemAsync(userId, itemId);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    [HttpPost("water")]
    public async Task<ActionResult<ApiResponse<WaterSummaryDto>>> LogWater([FromBody] LogWaterRequestDto dto)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized(ApiResponse<WaterSummaryDto>.Fail("Phiên đăng nhập không hợp lệ."));

        var result = await _diaryService.LogWaterAsync(userId, dto);
        return Ok(result);
    }
}
