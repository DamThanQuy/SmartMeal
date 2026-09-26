using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Subscription;

namespace SmartMeal.Application.Services;

public interface ISubscriptionService
{
    Task<ApiResponse<List<SubscriptionPlanDto>>> GetPlansAsync();
    Task<ApiResponse<CheckoutSessionResponseDto>> CreateCheckoutSessionAsync(Guid userId, CreateCheckoutSessionRequestDto dto);
    Task<ApiResponse<bool>> ActivateProPlanAsync(Guid userId, string planId);
}
