using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.API.Infrastructure;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Gamification;
using SmartMeal.Application.Services;

namespace SmartMeal.API.Controllers;

/// <summary>
/// Pet, XP, thử thách, huy hiệu, trang phục. Tham số <c>date</c> (yyyy-MM-dd) là "hôm nay" theo múi giờ của người dùng; bỏ trống = ngày UTC,
/// và luôn bị giới hạn trong ±1 ngày so với UTC.
/// </summary>
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

    /// <summary>Trạng thái pet: cấp độ, XP, nhiệm vụ hôm nay. Mở màn này cũng cộng XP cho nhiệm vụ đã làm xong (đúng một lần mỗi ngày).</summary>
    [HttpGet("pet")]
    public async Task<ActionResult<ApiResponse<HealthPetStatusDto>>> GetPetStatus([FromQuery] DateOnly? date)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<HealthPetStatusDto>();
        return this.ToActionResult(await _gamificationService.GetPetStatusAsync(userId, date));
    }

    [HttpGet("streak")]
    public async Task<ActionResult<ApiResponse<StreakStatusDto>>> GetStreak([FromQuery] DateOnly? date)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<StreakStatusDto>();
        return this.ToActionResult(await _gamificationService.GetStreakStatusAsync(userId, date));
    }

    [HttpGet("challenges")]
    public async Task<ActionResult<ApiResponse<List<ChallengeDto>>>> GetChallenges([FromQuery] DateOnly? date)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<List<ChallengeDto>>();
        return this.ToActionResult(await _gamificationService.GetChallengesAsync(userId, date));
    }

    /// <summary>Tham gia thử thách (idempotent): bắt đầu khung ngày từ hôm nay; đã tham gia thì trả lại bản cũ.</summary>
    [HttpPost("challenges/{id:guid}/join")]
    public async Task<ActionResult<ApiResponse<ChallengeDto>>> JoinChallenge(Guid id, [FromQuery] DateOnly? date)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<ChallengeDto>();
        return this.ToActionResult(await _gamificationService.JoinChallengeAsync(userId, id, date));
    }

    [HttpGet("badges")]
    public async Task<ActionResult<ApiResponse<BadgesSummaryDto>>> GetBadges([FromQuery] DateOnly? date)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<BadgesSummaryDto>();
        return this.ToActionResult(await _gamificationService.GetBadgesAsync(userId, date));
    }

    /// <summary>Mặc một trang phục đã mở (400 nếu chưa mở khóa, 404 nếu không có).</summary>
    [HttpPost("costumes/{costumeId}/equip")]
    public async Task<ActionResult<ApiResponse<BadgesSummaryDto>>> EquipCostume(string costumeId, [FromQuery] DateOnly? date)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<BadgesSummaryDto>();
        return this.ToActionResult(await _gamificationService.EquipCostumeAsync(userId, costumeId, date));
    }

    /// <summary>Cởi trang phục đang mặc.</summary>
    [HttpDelete("costumes/equipped")]
    public async Task<ActionResult<ApiResponse<BadgesSummaryDto>>> UnequipCostume([FromQuery] DateOnly? date)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<BadgesSummaryDto>();
        return this.ToActionResult(await _gamificationService.EquipCostumeAsync(userId, null, date));
    }
}
