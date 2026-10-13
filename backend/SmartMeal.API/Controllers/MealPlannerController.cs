using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.API.Infrastructure;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.MealPlanner;
using SmartMeal.Application.Services;

namespace SmartMeal.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MealPlannerController : ControllerBase
{
    private readonly IMealPlannerService _mealPlannerService;

    public MealPlannerController(IMealPlannerService mealPlannerService)
    {
        _mealPlannerService = mealPlannerService;
    }

    /// <summary>
    /// Lấy kế hoạch thực đơn 7 ngày trong tuần (kèm tổng Calo & Macros mỗi ngày).
    /// </summary>
    [HttpGet("week")]
    public async Task<ActionResult<ApiResponse<WeeklyMealPlanDto>>> GetWeeklyPlan([FromQuery] DateOnly? startDate)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<WeeklyMealPlanDto>();

        var start = startDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        return this.ToActionResult(await _mealPlannerService.GetWeeklyPlanAsync(userId, start));
    }

    /// <summary>
    /// Gán hoặc thay đổi một món ăn vào lịch tuần (Sáng, Trưa, Tối, Phụ). Mỗi (ngày, bữa) chỉ có một món.
    /// </summary>
    [HttpPost("assign")]
    public async Task<ActionResult<ApiResponse<PlannedMealItemDto>>> AssignMeal([FromBody] AssignMealPlanRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<PlannedMealItemDto>();
        return this.ToActionResult(await _mealPlannerService.AssignMealAsync(userId, dto));
    }

    /// <summary>
    /// Đánh dấu một món trong thực đơn là đã nấu/ăn (hoặc bỏ đánh dấu). Body bỏ trống = đã nấu.
    /// </summary>
    [HttpPatch("{id:guid}/complete")]
    public async Task<ActionResult<ApiResponse<PlannedMealItemDto>>> Complete(Guid id, [FromBody] CompleteMealPlanRequestDto? dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<PlannedMealItemDto>();
        return this.ToActionResult(await _mealPlannerService.SetCompletedAsync(userId, id, dto?.IsCompleted ?? true));
    }

    /// <summary>
    /// Xóa một món ăn khỏi thực đơn tuần.
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteMealPlan(Guid id)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<bool>();
        return this.ToActionResult(await _mealPlannerService.DeleteMealPlanItemAsync(userId, id));
    }

    /// <summary>
    /// Tự động sinh thực đơn 7 ngày, loại hẳn món chứa chất gây dị ứng của người dùng. <c>keepExisting=true</c> chỉ điền các ô còn trống.
    /// </summary>
    [HttpPost("auto-generate")]
    public async Task<ActionResult<ApiResponse<WeeklyMealPlanDto>>> AutoGenerateWeeklyPlan([FromBody] AutoGeneratePlanRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<WeeklyMealPlanDto>();
        return this.ToActionResult(await _mealPlannerService.AutoGenerateWeeklyPlanAsync(userId, dto));
    }
}
