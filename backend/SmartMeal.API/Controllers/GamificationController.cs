using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Gamification;
using SmartMeal.Application.Services;
using System.Security.Claims;

namespace SmartMeal.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class GamificationController : ControllerBase
{
    private readonly IGamificationService _gamificationService;

    public GamificationController(IGamificationService gamificationService)
    {
        _gamificationService = gamificationService;
    }

    [HttpGet("pet")]
    public async Task<ActionResult<ApiResponse<HealthPetStatusDto>>> GetPetStatus()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized(ApiResponse<HealthPetStatusDto>.Fail("Phiên đăng nhập không hợp lệ."));

        var result = await _gamificationService.GetPetStatusAsync(userId);
        return Ok(result);
    }

    [HttpGet("streak")]
    public async Task<ActionResult<ApiResponse<StreakStatusDto>>> GetStreak()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized(ApiResponse<StreakStatusDto>.Fail("Phiên đăng nhập không hợp lệ."));

        var result = await _gamificationService.GetStreakStatusAsync(userId);
        return Ok(result);
    }

    [HttpGet("challenges")]
    public async Task<ActionResult<ApiResponse<List<ChallengeDto>>>> GetChallenges()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized(ApiResponse<List<ChallengeDto>>.Fail("Phiên đăng nhập không hợp lệ."));

        var result = await _gamificationService.GetChallengesAsync(userId);
        return Ok(result);
    }

    [HttpPost("challenges/{id:guid}/join")]
    public async Task<ActionResult<ApiResponse<ChallengeDto>>> JoinChallenge(Guid id)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized(ApiResponse<ChallengeDto>.Fail("Phiên đăng nhập không hợp lệ."));

        var result = await _gamificationService.JoinChallengeAsync(userId, id);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }
}
