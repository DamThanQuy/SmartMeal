using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.API.Infrastructure;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Diary;
using SmartMeal.Application.Services;

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

    /// <summary>Ghi một món vào nhật ký. <c>mealType</c> không phân biệt hoa/thường, lưu dạng chuẩn.</summary>
    [HttpPost("log")]
    public async Task<ActionResult<ApiResponse<DiaryItemDto>>> LogMeal([FromBody] LogMealRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<DiaryItemDto>();

        return this.ToActionResult(await _diaryService.LogMealAsync(userId, dto));
    }

    /// <summary>Ghi nhiều món vào cùng một bữa — hoặc tất cả được lưu, hoặc không món nào.</summary>
    [HttpPost("log/batch")]
    public async Task<ActionResult<ApiResponse<List<DiaryItemDto>>>> LogMealBatch([FromBody] LogMealBatchRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<List<DiaryItemDto>>();

        return this.ToActionResult(await _diaryService.LogMealBatchAsync(userId, dto));
    }

    [HttpGet("daily")]
    public async Task<ActionResult<ApiResponse<DailyDiarySummaryDto>>> GetDailySummary([FromQuery] DateOnly? date)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<DailyDiarySummaryDto>();

        var targetDate = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        return this.ToActionResult(await _diaryService.GetDailySummaryAsync(userId, targetDate));
    }

    [HttpGet("weekly-progress")]
    public async Task<ActionResult<ApiResponse<WeeklyProgressDto>>> GetWeeklyProgress([FromQuery] DateOnly? startDate)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<WeeklyProgressDto>();

        var start = startDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-6));
        return this.ToActionResult(await _diaryService.GetWeeklyProgressAsync(userId, start));
    }

    /// <summary>Sửa một món đã ghi (khẩu phần, dinh dưỡng, chuyển bữa/ngày). Chỉ các trường có mặt mới đổi.</summary>
    [HttpPut("items/{itemId:guid}")]
    public async Task<ActionResult<ApiResponse<DiaryItemDto>>> UpdateItem(Guid itemId, [FromBody] UpdateDiaryItemRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<DiaryItemDto>();

        return this.ToActionResult(await _diaryService.UpdateDiaryItemAsync(userId, itemId, dto));
    }

    [HttpDelete("items/{itemId:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteItem(Guid itemId)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<bool>();

        return this.ToActionResult(await _diaryService.DeleteDiaryItemAsync(userId, itemId));
    }

    /// <summary>Ghi một lần uống nước. Response có <c>entryId</c> để hoàn tác bằng DELETE.</summary>
    [HttpPost("water")]
    public async Task<ActionResult<ApiResponse<WaterSummaryDto>>> LogWater([FromBody] LogWaterRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<WaterSummaryDto>();

        return this.ToActionResult(await _diaryService.LogWaterAsync(userId, dto));
    }

    /// <summary>Lịch sử nước uống <c>days</c> ngày kết thúc ở <c>date</c> (tăng dần, gồm cả ngày không có log).</summary>
    [HttpGet("water")]
    public async Task<ActionResult<ApiResponse<WaterHistoryDto>>> GetWater(
        [FromQuery] DateOnly? date,
        [FromQuery][Range(1, 31, ErrorMessage = "days phải từ 1 đến 31.")] int days = 1)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<WaterHistoryDto>();

        var endDate = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        return this.ToActionResult(await _diaryService.GetWaterHistoryAsync(userId, endDate, days));
    }

    [HttpDelete("water/{entryId:guid}")]
    public async Task<ActionResult<ApiResponse<WaterSummaryDto>>> DeleteWater(Guid entryId)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<WaterSummaryDto>();

        return this.ToActionResult(await _diaryService.DeleteWaterEntryAsync(userId, entryId));
    }
}
