using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Subscription;
using SmartMeal.Application.Services;
using System.Security.Claims;

namespace SmartMeal.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SubscriptionController : ControllerBase
{
    private readonly ISubscriptionService _subscriptionService;

    public SubscriptionController(ISubscriptionService subscriptionService)
    {
        _subscriptionService = subscriptionService;
    }

    [HttpGet("plans")]
    public async Task<ActionResult<ApiResponse<List<SubscriptionPlanDto>>>> GetPlans()
    {
        var result = await _subscriptionService.GetPlansAsync();
        return Ok(result);
    }

    [Authorize]
    [HttpPost("create-checkout-session")]
    public async Task<ActionResult<ApiResponse<CheckoutSessionResponseDto>>> CreateCheckoutSession([FromBody] CreateCheckoutSessionRequestDto dto)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized(ApiResponse<CheckoutSessionResponseDto>.Fail("Phiên đăng nhập không hợp lệ."));

        var result = await _subscriptionService.CreateCheckoutSessionAsync(userId, dto);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    [Authorize]
    [HttpPost("activate-mock")]
    public async Task<ActionResult<ApiResponse<bool>>> ActivateMock([FromBody] CreateCheckoutSessionRequestDto dto)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized(ApiResponse<bool>.Fail("Phiên đăng nhập không hợp lệ."));

        var result = await _subscriptionService.ActivateProPlanAsync(userId, dto.PlanId);
        return Ok(result);
    }
}
