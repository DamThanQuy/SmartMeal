using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Subscription;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Infrastructure.Options;

namespace SmartMeal.Infrastructure.Services;

public class SubscriptionService : ISubscriptionService
{
    private readonly ApplicationDbContext _db;
    private readonly SubscriptionOptions _options;
    private readonly IHostEnvironment _environment;

    public SubscriptionService(ApplicationDbContext db, IOptions<SubscriptionOptions> options, IHostEnvironment environment)
    {
        _db = db;
        _options = options.Value;
        _environment = environment;
    }

    private bool MockActivationAllowed => _options.AllowMockActivation ?? _environment.IsDevelopment();

    public Task<ApiResponse<List<SubscriptionPlanDto>>> GetPlansAsync()
    {
        var plans = SubscriptionCatalog.Plans.Select(p => new SubscriptionPlanDto
        {
            Id = p.Id,
            Name = p.Name,
            PriceVnd = p.PriceVnd,
            BillingCycle = p.BillingCycle,
            IsPopular = p.IsPopular,
            Features = p.Features.ToList()
        }).ToList();

        return Task.FromResult(ApiResponse<List<SubscriptionPlanDto>>.Ok(plans));
    }

    public async Task<ApiResponse<CheckoutSessionResponseDto>> CreateCheckoutSessionAsync(Guid userId, CreateCheckoutSessionRequestDto dto)
    {
        var plan = SubscriptionCatalog.Find(dto.PlanId);
        if (plan is null)
        {
            return ApiResponse<CheckoutSessionResponseDto>.Fail(
                $"planId không hợp lệ. Các gói hiện có: {string.Join(", ", SubscriptionCatalog.Plans.Select(p => p.Id))}.");
        }

        var method = SubscriptionCatalog.PaymentMethods
            .FirstOrDefault(m => string.Equals(m, dto.PaymentMethod?.Trim(), StringComparison.OrdinalIgnoreCase));
        if (method is null)
        {
            return ApiResponse<CheckoutSessionResponseDto>.Fail(
                $"paymentMethod phải là một trong: {string.Join(", ", SubscriptionCatalog.PaymentMethods)}.");
        }

        var user = await _db.Users.FindAsync(userId);
        if (user == null)
        {
            return ApiResponse<CheckoutSessionResponseDto>.Fail("Không tìm thấy thông tin tài khoản.", null, ApiErrorKind.NotFound);
        }

        var sessionId = $"SES_{Guid.NewGuid():N}";
        _db.PaymentTransactions.Add(NewTransaction(userId, plan, method, sessionId));
        await _db.SaveChangesAsync();

        // Đường dẫn thanh toán sandbox (chưa tích hợp cổng thật). Cổng thật sẽ gọi webhook với sessionId này.
        var paymentUrl = $"https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Session={sessionId}&vnp_Amount={plan.PriceVnd * 100}&vnp_OrderInfo={plan.Id}";
        var qrCodeUrl = $"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={Uri.EscapeDataString(paymentUrl)}";

        return ApiResponse<CheckoutSessionResponseDto>.Ok(new CheckoutSessionResponseDto
        {
            SessionId = sessionId,
            PaymentUrl = paymentUrl,
            QrCodeUrl = qrCodeUrl,
            AmountVnd = plan.PriceVnd,
            Message = "Tạo phiên thanh toán thành công. Gói Pro chỉ được kích hoạt sau khi cổng thanh toán xác nhận giao dịch."
        });
    }

    public async Task<ApiResponse<bool>> ActivateProPlanAsync(Guid userId, string planId)
    {
        // Ngoài môi trường phát triển endpoint này coi như không tồn tại: không ai được tự nâng cấp không thanh toán.
        if (!MockActivationAllowed)
        {
            return ApiResponse<bool>.Fail("Không tìm thấy tài nguyên yêu cầu.", null, ApiErrorKind.NotFound);
        }

        var plan = SubscriptionCatalog.Find(planId);
        if (plan is null)
        {
            return ApiResponse<bool>.Fail($"planId không hợp lệ. Các gói hiện có: {string.Join(", ", SubscriptionCatalog.Plans.Select(p => p.Id))}.");
        }

        var user = await _db.Users.FindAsync(userId);
        if (user == null)
        {
            return ApiResponse<bool>.Fail("Không tìm thấy người dùng.", null, ApiErrorKind.NotFound);
        }

        var now = DateTime.UtcNow;
        var transaction = NewTransaction(userId, plan, "MOCK", $"MOCK_{Guid.NewGuid():N}");
        transaction.Status = PaymentStatuses.Paid;
        transaction.PaidAt = now;
        transaction.ProviderTransactionId = "mock";
        _db.PaymentTransactions.Add(transaction);

        Activate(user, plan, now);
        await _db.SaveChangesAsync();

        return ApiResponse<bool>.Ok(true, "Kích hoạt gói Pro thành công (chế độ phát triển).");
    }

    public async Task<ApiResponse<bool>> HandleWebhookAsync(string rawBody, string? signature)
    {
        var secret = _options.WebhookSecret;
        if (string.IsNullOrWhiteSpace(secret))
        {
            return ApiResponse<bool>.Fail("Webhook thanh toán chưa được cấu hình.", null, ApiErrorKind.Unavailable);
        }

        if (!IsValidSignature(rawBody, signature, secret))
        {
            return ApiResponse<bool>.Fail("Chữ ký webhook không hợp lệ.", null, ApiErrorKind.Unauthorized);
        }

        PaymentWebhookDto? payload;
        try
        {
            payload = JsonSerializer.Deserialize<PaymentWebhookDto>(rawBody, JsonSerializerOptions.Web);
        }
        catch (JsonException)
        {
            return ApiResponse<bool>.Fail("Nội dung webhook không phải JSON hợp lệ.");
        }

        if (payload is null || string.IsNullOrWhiteSpace(payload.SessionId) ||
            !(string.Equals(payload.Status, "paid", StringComparison.OrdinalIgnoreCase) ||
              string.Equals(payload.Status, "failed", StringComparison.OrdinalIgnoreCase)))
        {
            return ApiResponse<bool>.Fail("Webhook cần sessionId và status là paid hoặc failed.");
        }

        var transaction = await _db.PaymentTransactions.FirstOrDefaultAsync(t => t.SessionId == payload.SessionId);
        if (transaction is null)
        {
            return ApiResponse<bool>.Fail("Không tìm thấy phiên thanh toán.", null, ApiErrorKind.NotFound);
        }

        // Cổng thanh toán có thể gửi lại cùng một thông báo: xử lý idempotent.
        if (transaction.Status == PaymentStatuses.Paid)
        {
            return ApiResponse<bool>.Ok(true, "Giao dịch đã được xác nhận trước đó.");
        }

        if (string.Equals(payload.Status, "failed", StringComparison.OrdinalIgnoreCase))
        {
            transaction.Status = PaymentStatuses.Failed;
            transaction.ProviderTransactionId = payload.ProviderTransactionId;
            await _db.SaveChangesAsync();
            return ApiResponse<bool>.Ok(true, "Đã ghi nhận giao dịch thất bại.");
        }

        if (payload.AmountVnd != transaction.AmountVnd)
        {
            return ApiResponse<bool>.Fail("Số tiền thanh toán không khớp với phiên.");
        }

        var plan = SubscriptionCatalog.Find(transaction.PlanId);
        if (plan is null)
        {
            return ApiResponse<bool>.Fail("Gói của phiên thanh toán không còn tồn tại.");
        }

        var now = DateTime.UtcNow;
        transaction.Status = PaymentStatuses.Paid;
        transaction.PaidAt = now;
        transaction.ProviderTransactionId = payload.ProviderTransactionId;

        if (transaction.UserId is { } userId && await _db.Users.FindAsync(userId) is { } user)
        {
            Activate(user, plan, now);
        }

        await _db.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true, "Đã xác nhận thanh toán và kích hoạt gói Pro.");
    }

    public async Task<ApiResponse<SubscriptionStatusDto>> GetStatusAsync(Guid userId)
    {
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null)
        {
            return ApiResponse<SubscriptionStatusDto>.Fail("Không tìm thấy người dùng.", null, ApiErrorKind.NotFound);
        }

        return ApiResponse<SubscriptionStatusDto>.Ok(ToStatus(user, DateTime.UtcNow));
    }

    public async Task<ApiResponse<List<PaymentTransactionDto>>> GetTransactionsAsync(Guid userId)
    {
        var list = await _db.PaymentTransactions
            .AsNoTracking()
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new PaymentTransactionDto
            {
                Id = t.Id,
                SessionId = t.SessionId,
                PlanId = t.PlanId,
                AmountVnd = t.AmountVnd,
                PaymentMethod = t.PaymentMethod,
                Status = t.Status,
                CreatedAt = t.CreatedAt,
                PaidAt = t.PaidAt
            })
            .ToListAsync();

        return ApiResponse<List<PaymentTransactionDto>>.Ok(list);
    }

    public async Task<ApiResponse<SubscriptionStatusDto>> CancelAsync(Guid userId)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null)
        {
            return ApiResponse<SubscriptionStatusDto>.Fail("Không tìm thấy người dùng.", null, ApiErrorKind.NotFound);
        }

        var now = DateTime.UtcNow;
        if (!user.IsProActive(now))
        {
            return ApiResponse<SubscriptionStatusDto>.Fail("Bạn chưa có gói Pro đang hoạt động để hủy.");
        }

        user.SubscriptionStatus = SubscriptionStatuses.Cancelled;
        user.UpdatedAt = now;
        await _db.SaveChangesAsync();

        return ApiResponse<SubscriptionStatusDto>.Ok(ToStatus(user, now), "Đã hủy gia hạn. Bạn vẫn dùng Pro tới hết hạn.");
    }

    // ───────────────────────────── Nội bộ ─────────────────────────────

    private static PaymentTransaction NewTransaction(Guid userId, SubscriptionCatalog.Plan plan, string method, string sessionId) => new()
    {
        UserId = userId,
        UserRef = Convert.ToHexString(SHA256.HashData(userId.ToByteArray())),
        PlanId = plan.Id,
        AmountVnd = plan.PriceVnd,
        PaymentMethod = method,
        Status = PaymentStatuses.Pending,
        SessionId = sessionId,
        CreatedAt = DateTime.UtcNow
    };

    /// <summary>Kích hoạt/gia hạn Pro: cộng thời hạn vào cuối kỳ hiện tại nếu còn hạn, ngược lại tính từ bây giờ.</summary>
    private static void Activate(User user, SubscriptionCatalog.Plan plan, DateTime now)
    {
        var start = user.IsProActive(now) && user.ProExpiresAt is { } current ? current : now;
        user.IsPro = true;
        user.ProPlanId = plan.Id;
        user.ProExpiresAt = start.AddDays(plan.DurationDays);
        user.SubscriptionStatus = SubscriptionStatuses.Premium;
        user.UpdatedAt = now;
    }

    private static SubscriptionStatusDto ToStatus(User user, DateTime now) => new()
    {
        Status = user.EffectiveSubscriptionStatus(now),
        IsPro = user.IsProActive(now),
        PlanId = user.ProPlanId,
        ProExpiresAt = user.ProExpiresAt
    };

    private static bool IsValidSignature(string body, string? signature, string secret)
    {
        if (string.IsNullOrWhiteSpace(signature))
        {
            return false;
        }

        var provided = signature.Trim();
        if (provided.StartsWith("sha256=", StringComparison.OrdinalIgnoreCase))
        {
            provided = provided["sha256=".Length..];
        }

        var expected = Convert.ToHexString(HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(body)));
        return provided.Length == expected.Length &&
               CryptographicOperations.FixedTimeEquals(
                   Encoding.ASCII.GetBytes(provided.ToUpperInvariant()),
                   Encoding.ASCII.GetBytes(expected));
    }
}
