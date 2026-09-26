using Microsoft.EntityFrameworkCore;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Subscription;
using SmartMeal.Application.Services;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.Infrastructure.Services;

public class SubscriptionService : ISubscriptionService
{
    private readonly ApplicationDbContext _db;

    public SubscriptionService(ApplicationDbContext db)
    {
        _db = db;
    }

    public Task<ApiResponse<List<SubscriptionPlanDto>>> GetPlansAsync()
    {
        var plans = new List<SubscriptionPlanDto>
        {
            new SubscriptionPlanDto
            {
                Id = "PRO_MONTHLY",
                Name = "Gói Tháng (Pro Monthly)",
                PriceVnd = 79000,
                BillingCycle = "Monthly",
                IsPopular = false,
                Features = new List<string>
                {
                    "Quét tủ lạnh & gợi ý món ăn không giới hạn với Gemini AI",
                    "Ghi chép bữa ăn bằng giọng nói & chụp ảnh AI Vision",
                    "Tự động tạo thực đơn tuần cá nhân hóa theo TDEE",
                    "Truy cập toàn bộ công thức Premium & Video hướng dẫn",
                    "Tạo danh sách đi chợ thông minh tự động",
                    "Đồng bộ Apple Health / Google Fit nâng cao"
                }
            },
            new SubscriptionPlanDto
            {
                Id = "PRO_YEARLY",
                Name = "Gói Năm (Pro Yearly - Tiết kiệm 25%)",
                PriceVnd = 699000,
                BillingCycle = "Yearly",
                IsPopular = true,
                Features = new List<string>
                {
                    "Toàn bộ đặc quyền của gói Pro Monthly",
                    "Tiết kiệm 25% chi phí so với trả hàng tháng",
                    "Mở khóa pet độc quyền & huy hiệu Pro VIP",
                    "Hỗ trợ ưu tiên 24/7 từ chuyên gia dinh dưỡng"
                }
            }
        };

        return Task.FromResult(ApiResponse<List<SubscriptionPlanDto>>.Ok(plans));
    }

    public async Task<ApiResponse<CheckoutSessionResponseDto>> CreateCheckoutSessionAsync(Guid userId, CreateCheckoutSessionRequestDto dto)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null)
            return ApiResponse<CheckoutSessionResponseDto>.Fail("Không tìm thấy thông tin tài khoản.");

        decimal amount = dto.PlanId == "PRO_YEARLY" ? 699000 : 79000;
        var sessionId = $"SES_{Guid.NewGuid():N}";
        var paymentUrl = $"https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Session={sessionId}&vnp_Amount={amount * 100}&vnp_OrderInfo={dto.PlanId}";
        var qrCodeUrl = $"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={paymentUrl}";

        var response = new CheckoutSessionResponseDto
        {
            SessionId = sessionId,
            PaymentUrl = paymentUrl,
            QrCodeUrl = qrCodeUrl,
            AmountVnd = amount,
            Message = "Tạo phiên thanh toán thành công. Vui lòng quét mã QR hoặc mở liên kết thanh toán."
        };

        return ApiResponse<CheckoutSessionResponseDto>.Ok(response);
    }

    public async Task<ApiResponse<bool>> ActivateProPlanAsync(Guid userId, string planId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null)
            return ApiResponse<bool>.Fail("Không tìm thấy người dùng.");

        user.IsPro = true;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return ApiResponse<bool>.Ok(true, "Kích hoạt gói Pro thành công!");
    }
}
