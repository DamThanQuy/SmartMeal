using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SmartMeal.Application.Common;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Subscription;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Infrastructure.Options;

namespace SmartMeal.Infrastructure.Services;

public class SubscriptionService : ISubscriptionService
{
    /// <summary>PayOS giới hạn mô tả chuyển khoản 25 ký tự.</summary>
    private const int PayOSDescriptionMaxLength = 25;

    private readonly ApplicationDbContext _db;
    private readonly SubscriptionOptions _options;
    private readonly IHostEnvironment _environment;
    private readonly IPayOSGateway _payOS;
    private readonly ILogger<SubscriptionService> _logger;

    public SubscriptionService(
        ApplicationDbContext db,
        IOptions<SubscriptionOptions> options,
        IHostEnvironment environment,
        IPayOSGateway payOS,
        ILogger<SubscriptionService> logger)
    {
        _db = db;
        _options = options.Value;
        _environment = environment;
        _payOS = payOS;
        _logger = logger;
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

        if (method == SubscriptionCatalog.PayOS)
        {
            return await CreatePayOSCheckoutAsync(userId, plan);
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
        await NotifyActivatedAsync(user.Id, plan, transaction.Id);

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

        var confirmError = await ConfirmPaidAsync(transaction, payload.ProviderTransactionId);
        return confirmError is null
            ? ApiResponse<bool>.Ok(true, "Đã xác nhận thanh toán và kích hoạt gói Pro.")
            : ApiResponse<bool>.Fail(confirmError);
    }

    // ───────────────────────────── PayOS ─────────────────────────────

    private async Task<ApiResponse<CheckoutSessionResponseDto>> CreatePayOSCheckoutAsync(Guid userId, SubscriptionCatalog.Plan plan)
    {
        if (!_payOS.IsConfigured)
        {
            return ApiResponse<CheckoutSessionResponseDto>.Fail(
                "Thanh toán PayOS chưa được cấu hình trên máy chủ.", new List<string> { "payos_not_configured" }, ApiErrorKind.Unavailable);
        }

        var amount = (int)plan.PriceVnd;
        var description = $"SmartMeal {plan.Id}";
        if (description.Length > PayOSDescriptionMaxLength) description = description[..PayOSDescriptionMaxLength];

        // Mã đơn PayOS phải là số dương duy nhất: mili-giây hiện tại × 100 + số ngẫu nhiên, thử lại nếu trùng.
        for (var attempt = 0; attempt < 3; attempt++)
        {
            var orderCode = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() * 100 + Random.Shared.Next(0, 100);
            if (await _db.PaymentTransactions.AnyAsync(t => t.OrderCode == orderCode))
            {
                continue;
            }

            PayOSPaymentLink link;
            try
            {
                link = await _payOS.CreatePaymentLinkAsync(orderCode, amount, description, plan.Name);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Không tạo được link PayOS cho đơn {OrderCode}.", orderCode);
                return ApiResponse<CheckoutSessionResponseDto>.Fail(
                    "Không tạo được link thanh toán PayOS, vui lòng thử lại sau.", new List<string> { "payos_error" }, ApiErrorKind.UpstreamFailure);
            }

            var transaction = NewTransaction(userId, plan, SubscriptionCatalog.PayOS, $"PAYOS_{orderCode}");
            transaction.OrderCode = orderCode;
            transaction.CheckoutUrl = link.CheckoutUrl;
            transaction.QrCode = link.QrCode;
            _db.PaymentTransactions.Add(transaction);
            await _db.SaveChangesAsync();

            var qrData = string.IsNullOrEmpty(link.QrCode) ? link.CheckoutUrl : link.QrCode;
            return ApiResponse<CheckoutSessionResponseDto>.Ok(new CheckoutSessionResponseDto
            {
                SessionId = transaction.SessionId,
                OrderCode = orderCode,
                PaymentUrl = link.CheckoutUrl,
                QrCode = link.QrCode,
                QrCodeUrl = $"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={Uri.EscapeDataString(qrData)}",
                AmountVnd = plan.PriceVnd,
                Message = "Quét mã VietQR hoặc mở trang PayOS để chuyển khoản. Gói Pro được kích hoạt ngay khi PayOS xác nhận đã nhận tiền."
            });
        }

        return ApiResponse<CheckoutSessionResponseDto>.Fail("Không tạo được mã đơn thanh toán, vui lòng thử lại.");
    }

    public async Task<ApiResponse<PaymentTransactionStatusDto>> CheckPaymentStatusAsync(Guid userId, long orderCode)
    {
        // Chỉ chủ giao dịch được xem; giao dịch của người khác coi như không tồn tại.
        var transaction = await _db.PaymentTransactions.FirstOrDefaultAsync(t => t.OrderCode == orderCode && t.UserId == userId);
        if (transaction is null)
        {
            return ApiResponse<PaymentTransactionStatusDto>.Fail("Không tìm thấy giao dịch.", null, ApiErrorKind.NotFound);
        }

        if (transaction.Status == PaymentStatuses.Pending && transaction.PaymentMethod == SubscriptionCatalog.PayOS && _payOS.IsConfigured)
        {
            try
            {
                var info = await _payOS.GetPaymentInfoAsync(orderCode);
                if (string.Equals(info.Status, "PAID", StringComparison.OrdinalIgnoreCase) && info.AmountPaid >= transaction.AmountVnd)
                {
                    var confirmError = await ConfirmPaidAsync(transaction, info.Reference);
                    if (confirmError is not null)
                    {
                        return ApiResponse<PaymentTransactionStatusDto>.Fail(confirmError);
                    }
                }
                else if (info.Status.ToUpperInvariant() is "CANCELLED" or "EXPIRED")
                {
                    transaction.Status = PaymentStatuses.Failed;
                    await _db.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                // PayOS tạm lỗi: trả trạng thái đang có, lần hỏi sau thử lại.
                _logger.LogWarning(ex, "Không hỏi được PayOS trạng thái đơn {OrderCode}.", orderCode);
            }
        }

        return ApiResponse<PaymentTransactionStatusDto>.Ok(new PaymentTransactionStatusDto
        {
            OrderCode = orderCode,
            Status = transaction.Status,
            IsPaid = transaction.Status == PaymentStatuses.Paid,
            PlanId = transaction.PlanId,
            AmountVnd = transaction.AmountVnd,
            PaidAt = transaction.PaidAt
        });
    }

    public async Task<ApiResponse<bool>> HandlePayOSWebhookAsync(string rawBody)
    {
        if (!_payOS.IsConfigured)
        {
            return ApiResponse<bool>.Fail("Thanh toán PayOS chưa được cấu hình.", null, ApiErrorKind.Unavailable);
        }

        var payment = _payOS.VerifyWebhook(rawBody);
        if (payment is null)
        {
            return ApiResponse<bool>.Fail("Chữ ký webhook PayOS không hợp lệ.", null, ApiErrorKind.Unauthorized);
        }

        var transaction = await _db.PaymentTransactions.FirstOrDefaultAsync(t => t.OrderCode == payment.OrderCode);

        // PayOS gửi một webhook thử (mã đơn không có trong hệ thống) khi đăng ký URL: phải trả 200.
        if (transaction is null || payment.Code != "00")
        {
            return ApiResponse<bool>.Ok(true, "Đã nhận webhook.");
        }

        if (transaction.Status == PaymentStatuses.Paid)
        {
            return ApiResponse<bool>.Ok(true, "Giao dịch đã được xác nhận trước đó.");
        }

        if (payment.Amount < transaction.AmountVnd)
        {
            return ApiResponse<bool>.Fail("Số tiền thanh toán không khớp với đơn.");
        }

        var confirmError = await ConfirmPaidAsync(transaction, payment.Reference);
        return confirmError is null
            ? ApiResponse<bool>.Ok(true, "Đã xác nhận thanh toán và kích hoạt gói Pro.")
            : ApiResponse<bool>.Fail(confirmError);
    }

    /// <summary>
    /// Ghi nhận giao dịch đã thanh toán và kích hoạt/gia hạn Pro cho chủ giao dịch (dùng chung cho mọi cổng). Idempotent: giao
    /// dịch đã Paid thì không làm gì. Trả thông báo lỗi hoặc null khi thành công.
    /// </summary>
    private async Task<string?> ConfirmPaidAsync(PaymentTransaction transaction, string? providerTransactionId)
    {
        if (transaction.Status == PaymentStatuses.Paid)
        {
            return null;
        }

        var plan = SubscriptionCatalog.Find(transaction.PlanId);
        if (plan is null)
        {
            return "Gói của phiên thanh toán không còn tồn tại.";
        }

        var now = DateTime.UtcNow;

        // Webhook và app hỏi trạng thái có thể tới cùng lúc: chỉ một bên "giành" được giao dịch chưa Paid, nên Pro không bị
        // cộng thời hạn hai lần.
        var claimed = await _db.PaymentTransactions
            .Where(t => t.Id == transaction.Id && t.Status != PaymentStatuses.Paid)
            .ExecuteUpdateAsync(s => s
                .SetProperty(t => t.Status, PaymentStatuses.Paid)
                .SetProperty(t => t.PaidAt, now)
                .SetProperty(t => t.ProviderTransactionId, providerTransactionId));
        transaction.Status = PaymentStatuses.Paid;
        transaction.PaidAt = now;
        transaction.ProviderTransactionId = providerTransactionId;
        if (claimed == 0)
        {
            return null;
        }

        User? activated = null;
        if (transaction.UserId is { } userId && await _db.Users.FindAsync(userId) is { } user)
        {
            Activate(user, plan, now);
            activated = user;
        }

        await _db.SaveChangesAsync();
        if (activated is not null)
        {
            await NotifyActivatedAsync(activated.Id, plan, transaction.Id);
        }

        return null;
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

    private Task NotifyActivatedAsync(Guid userId, SubscriptionCatalog.Plan plan, Guid transactionId) =>
        NotificationWriter.TryAddAsync(_db, userId, NotificationCategories.Premium, "Đã kích hoạt SmartMeal Pro",
            $"{plan.Name}: thêm {plan.DurationDays} ngày dùng toàn bộ tính năng Pro.", $"subscription-{transactionId}");

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
