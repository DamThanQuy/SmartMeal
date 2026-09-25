using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Health;
using SmartMeal.Application.Services;
using System.Security.Claims;

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

    [HttpPost("survey")]
    public async Task<ActionResult<ApiResponse<HealthProfileDto>>> SubmitSurvey([FromBody] HealthSurveyRequestDto dto)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized(ApiResponse<HealthProfileDto>.Fail("Phiên đăng nhập không hợp lệ."));

        var result = await _healthProfileService.SubmitSurveyAsync(userId, dto);
        return Ok(result);
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<HealthProfileDto>>> GetProfile()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized(ApiResponse<HealthProfileDto>.Fail("Phiên đăng nhập không hợp lệ."));

        var result = await _healthProfileService.GetProfileAsync(userId);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }
}
