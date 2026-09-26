using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

    private Guid GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(claim, out var id) ? id : Guid.Empty;
    }

    /// <summary>
    /// Lấy kế hoạch thực đơn 7 ngày trong tuần (kèm tổng Calo & Macros mỗi ngày).
    /// </summary>
    [HttpGet("week")]
    public async Task<ActionResult<ApiResponse<WeeklyMealPlanDto>>> GetWeeklyPlan([FromQuery] DateOnly? startDate)
    {
        var start = startDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var result = await _mealPlannerService.GetWeeklyPlanAsync(GetUserId(), start);
        return Ok(result);
    }

    /// <summary>
    /// Gán hoặc thay đổi một món ăn vào lịch tuần (Sáng, Trưa, Tối, Phụ).
    /// </summary>
    [HttpPost("assign")]
    public async Task<ActionResult<ApiResponse<PlannedMealItemDto>>> AssignMeal([FromBody] AssignMealPlanRequestDto dto)
    {
        var result = await _mealPlannerService.AssignMealAsync(GetUserId(), dto);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Xóa một món ăn khỏi thực đơn tuần.
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteMealPlan(Guid id)
    {
        var result = await _mealPlannerService.DeleteMealPlanItemAsync(GetUserId(), id);
        if (!result.Success)
        {
            return NotFound(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Thuật toán tự động sinh thực đơn 7 ngày phù hợp với mục tiêu calo và loại trừ dị ứng.
    /// </summary>
    [HttpPost("auto-generate")]
    public async Task<ActionResult<ApiResponse<WeeklyMealPlanDto>>> AutoGenerateWeeklyPlan([FromBody] AutoGeneratePlanRequestDto dto)
    {
        var result = await _mealPlannerService.AutoGenerateWeeklyPlanAsync(GetUserId(), dto);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }
}
