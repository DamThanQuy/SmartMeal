using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Net.payOS;
using Net.payOS.Types;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Subscription;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.Infrastructure.Services;

public class SubscriptionService : ISubscriptionService
{
    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _config;

    public SubscriptionService(ApplicationDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    private PayOS GetPayOSClient()
    {
        var clientId = _config["PayOS:ClientId"] ?? "f222d523-5c08-4bdb-b216-3f78f7e9a6b5";
        var apiKey = _config["PayOS:ApiKey"] ?? "0ff53c5c-baca-4bbc-954a-92c7ebe4fe53";
        var checksumKey = _config["PayOS:ChecksumKey"] ?? "4269156b92bb565c0e340b92a5e77027c28548d350ea9a256b89c1115cd89bb1";
        return new PayOS(clientId, apiKey, checksumKey);
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
        long orderCode = DateTimeOffset.UtcNow.ToUnixTimeSeconds() * 1000 + Random.Shared.Next(100, 999);

        string paymentUrl = string.Empty;
        string qrCodeUrl = string.Empty;
        string? rawQrCode = null;

        if (dto.PaymentMethod == "PAYOS")
        {
            var payOS = GetPayOSClient();
            var paymentData = new PaymentData(
                orderCode,
                (int)amount,
                $"SmartMeal {dto.PlanId}",
                new List<ItemData> { new ItemData(dto.PlanId, 1, (int)amount) },
                "smartmeal://payment-cancel",
                "smartmeal://payment-success"
            );

            CreatePaymentResult createPayment = await payOS.createPaymentLink(paymentData);
            paymentUrl = createPayment.checkoutUrl;
            rawQrCode = createPayment.qrCode;

            // Generate direct QR code image URL from raw VietQR string or checkoutUrl
            var qrData = !string.IsNullOrEmpty(rawQrCode) ? rawQrCode : paymentUrl;
            qrCodeUrl = $"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={Uri.EscapeDataString(qrData)}";
        }
        else
        {
            paymentUrl = $"https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Session={sessionId}&vnp_Amount={amount * 100}&vnp_OrderInfo={dto.PlanId}";
            qrCodeUrl = $"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={Uri.EscapeDataString(paymentUrl)}";
        }

        // Persist transaction record into database
        var transaction = new PaymentTransaction
        {
            UserId = userId,
            OrderCode = orderCode,
            Amount = amount,
            PlanId = dto.PlanId,
            PaymentMethod = dto.PaymentMethod,
            Status = "PENDING",
            PaymentUrl = paymentUrl,
            QrCode = rawQrCode,
            CreatedAt = DateTime.UtcNow
        };

        await _db.PaymentTransactions.AddAsync(transaction);
        await _db.SaveChangesAsync();

        var response = new CheckoutSessionResponseDto
        {
            SessionId = sessionId,
            OrderCode = orderCode,
            PaymentUrl = paymentUrl,
            QrCodeUrl = qrCodeUrl,
            AmountVnd = amount,
            Message = "Tạo phiên thanh toán thành công. Vui lòng quét mã QR hoặc mở liên kết thanh toán."
        };

        return ApiResponse<CheckoutSessionResponseDto>.Ok(response);
    }

    public async Task<ApiResponse<PaymentTransactionStatusDto>> CheckPaymentStatusAsync(long orderCode)
    {
        var tx = await _db.PaymentTransactions
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.OrderCode == orderCode);

        if (tx == null)
            return ApiResponse<PaymentTransactionStatusDto>.Fail("Không tìm thấy thông tin giao dịch.");

        if (tx.Status == "PAID")
        {
            return ApiResponse<PaymentTransactionStatusDto>.Ok(new PaymentTransactionStatusDto
            {
                OrderCode = tx.OrderCode,
                Status = "PAID",
                IsPaid = true,
                Amount = tx.Amount,
                PlanId = tx.PlanId,
                PaidAt = tx.PaidAt
            });
        }

        if (tx.Status == "PENDING" && tx.PaymentMethod == "PAYOS")
        {
            try
            {
                var payOS = GetPayOSClient();
                PaymentLinkInformation info = await payOS.getPaymentLinkInformation(orderCode);
                if (info != null && info.status == "PAID")
                {
                    tx.Status = "PAID";
                    tx.PaidAt = DateTime.UtcNow;
                    if (tx.User != null)
                    {
                        tx.User.IsPro = true;
                        tx.User.UpdatedAt = DateTime.UtcNow;
                    }
                    await _db.SaveChangesAsync();

                    return ApiResponse<PaymentTransactionStatusDto>.Ok(new PaymentTransactionStatusDto
                    {
                        OrderCode = tx.OrderCode,
                        Status = "PAID",
                        IsPaid = true,
                        Amount = tx.Amount,
                        PlanId = tx.PlanId,
                        PaidAt = tx.PaidAt
                    });
                }
                else if (info != null && info.status == "CANCELLED")
                {
                    tx.Status = "CANCELLED";
                    await _db.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PayOS] Check status error for {orderCode}: {ex.Message}");
            }
        }

        return ApiResponse<PaymentTransactionStatusDto>.Ok(new PaymentTransactionStatusDto
        {
            OrderCode = tx.OrderCode,
            Status = tx.Status,
            IsPaid = tx.Status == "PAID",
            Amount = tx.Amount,
            PlanId = tx.PlanId,
            PaidAt = tx.PaidAt
        });
    }

    public async Task<ApiResponse<bool>> HandlePayOSWebhookAsync(WebhookType webhookBody)
    {
        try
        {
            var payOS = GetPayOSClient();
            WebhookData verifiedData = payOS.verifyPaymentWebhookData(webhookBody);

            if (verifiedData != null && verifiedData.code == "00")
            {
                var tx = await _db.PaymentTransactions
                    .Include(t => t.User)
                    .FirstOrDefaultAsync(t => t.OrderCode == verifiedData.orderCode);

                if (tx != null)
                {
                    tx.Status = "PAID";
                    tx.PaidAt = DateTime.UtcNow;
                    if (tx.User != null)
                    {
                        tx.User.IsPro = true;
                        tx.User.UpdatedAt = DateTime.UtcNow;
                    }
                    await _db.SaveChangesAsync();
                    return ApiResponse<bool>.Ok(true, "Kích hoạt giao dịch thành công.");
                }
            }

            return ApiResponse<bool>.Ok(true, "Webhook hợp lệ.");
        }
        catch (Exception ex)
        {
            return ApiResponse<bool>.Fail($"Xác thực webhook thất bại: {ex.Message}");
        }
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
