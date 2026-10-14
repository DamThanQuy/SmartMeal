using Net.payOS.Types;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Subscription;

namespace SmartMeal.Application.Services;

public interface ISubscriptionService
{
    Task<ApiResponse<List<SubscriptionPlanDto>>> GetPlansAsync();
    Task<ApiResponse<CheckoutSessionResponseDto>> CreateCheckoutSessionAsync(Guid userId, CreateCheckoutSessionRequestDto dto);

    /// <summary>Chỉ dùng khi phát triển (Subscription:AllowMockActivation): mô phỏng cổng thanh toán xác nhận thành công.</summary>
    Task<ApiResponse<bool>> ActivateProPlanAsync(Guid userId, string planId);
    Task<ApiResponse<PaymentTransactionStatusDto>> CheckPaymentStatusAsync(long orderCode);
    Task<ApiResponse<bool>> HandlePayOSWebhookAsync(WebhookType webhookBody);
}
