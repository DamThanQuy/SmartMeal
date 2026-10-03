using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Subscription;

namespace SmartMeal.Application.Services;

public interface ISubscriptionService
{
    Task<ApiResponse<List<SubscriptionPlanDto>>> GetPlansAsync();
    Task<ApiResponse<CheckoutSessionResponseDto>> CreateCheckoutSessionAsync(Guid userId, CreateCheckoutSessionRequestDto dto);

    /// <summary>Chỉ dùng khi phát triển (Subscription:AllowMockActivation): mô phỏng cổng thanh toán xác nhận thành công.</summary>
    Task<ApiResponse<bool>> ActivateProPlanAsync(Guid userId, string planId);

    /// <summary>Xử lý webhook của cổng thanh toán. <paramref name="signature"/> là HMAC-SHA256 (hex) của <paramref name="rawBody"/>.</summary>
    Task<ApiResponse<bool>> HandleWebhookAsync(string rawBody, string? signature);

    Task<ApiResponse<SubscriptionStatusDto>> GetStatusAsync(Guid userId);
    Task<ApiResponse<List<PaymentTransactionDto>>> GetTransactionsAsync(Guid userId);

    /// <summary>Hủy gia hạn: giữ quyền Pro tới hết hạn rồi chuyển sang Expired.</summary>
    Task<ApiResponse<SubscriptionStatusDto>> CancelAsync(Guid userId);
}
