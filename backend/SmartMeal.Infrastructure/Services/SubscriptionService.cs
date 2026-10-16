using System.Collections.Concurrent;
using System.Globalization;
using System.Security.Cryptography;
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
    private readonly ISePayGateway _sePay;
    private readonly ILogger<SubscriptionService> _logger;
    private readonly NotificationWriter _notifications;

    public SubscriptionService(
        ApplicationDbContext db,
        IOptions<SubscriptionOptions> options,
        IHostEnvironment environment,
        IPayOSGateway payOS,
        ISePayGateway sePay,
        ILogger<SubscriptionService> logger,
        NotificationWriter notifications)
    {
        _db = db;
        _notifications = notifications;
        _options = options.Value;
        _environment = environment;
        _payOS = payOS;
        _sePay = sePay;
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

        if (method != SubscriptionCatalog.PayOS)
        {
            return await CreateSePayCheckoutAsync(userId, plan, method);
        }

        var returnUrl = dto.ReturnUrl?.Trim();
        if (!string.IsNullOrEmpty(returnUrl) && !AppDeepLink.IsAllowed(returnUrl, _environment.IsDevelopment()))
        {
            return ApiResponse<CheckoutSessionResponseDto>.Fail(
                "returnUrl không hợp lệ: chỉ nhận deep link của app SmartMeal.", new List<string> { "invalid_return_url" });
        }

        return await CreatePayOSCheckoutAsync(userId, plan, string.IsNullOrEmpty(returnUrl) ? null : returnUrl);
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

    // ───────────────────────────── SePay (chuyển khoản VietQR) ─────────────────────────────

    /// <summary>Ký tự của mã thanh toán: bỏ 0/O/1/I dễ nhầm khi người dùng phải gõ tay nội dung chuyển khoản.</summary>
    private const string SePayCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private const int SePayCodeLength = 8;

    /// <summary>Lần cuối hỏi API giao dịch SePay cho từng đơn — app hỏi trạng thái mỗi 3 giây, không gọi SePay dồn dập.</summary>
    private static readonly ConcurrentDictionary<Guid, DateTime> SePayLastQueriedAt = new();

    /// <summary>
    /// Đơn chuyển khoản vào tài khoản đã liên kết SePay. <paramref name="method"/> = SEPAY: kèm mã VietQR để quét;
    /// BANK_APP: không QR — số tài khoản + nội dung + <c>vietQrBankCode</c> để app mở app ngân hàng điền sẵn thông tin.
    /// </summary>
    private async Task<ApiResponse<CheckoutSessionResponseDto>> CreateSePayCheckoutAsync(Guid userId, SubscriptionCatalog.Plan plan, string method)
    {
        if (!_sePay.IsConfigured)
        {
            return ApiResponse<CheckoutSessionResponseDto>.Fail(
                "Thanh toán chuyển khoản (SePay) chưa được cấu hình trên máy chủ.", new List<string> { "sepay_not_configured" }, ApiErrorKind.Unavailable);
        }

        for (var attempt = 0; attempt < 5; attempt++)
        {
            var code = _sePay.PaymentCodePrefix + RandomNumberGenerator.GetString(SePayCodeAlphabet, SePayCodeLength);
            var orderCode = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() * 100 + Random.Shared.Next(0, 100);
            if (await _db.PaymentTransactions.AnyAsync(t => t.SessionId == code || t.OrderCode == orderCode))
            {
                continue;
            }

            var transfer = _sePay.BuildTransferInfo(plan.PriceVnd, code);
            var withQr = method == SubscriptionCatalog.SePay;
            // Mã thanh toán chính là nội dung chuyển khoản; SessionId duy nhất nên mỗi mã chỉ khớp một đơn.
            var transaction = NewTransaction(userId, plan, method, code);
            transaction.OrderCode = orderCode;
            transaction.CheckoutUrl = withQr ? transfer.QrImageUrl : null;
            _db.PaymentTransactions.Add(transaction);
            await _db.SaveChangesAsync();

            var amount = plan.PriceVnd.ToString("N0", CultureInfo.GetCultureInfo("vi-VN"));
            return ApiResponse<CheckoutSessionResponseDto>.Ok(new CheckoutSessionResponseDto
            {
                SessionId = code,
                OrderCode = orderCode,
                PaymentUrl = withQr ? transfer.QrImageUrl : string.Empty,
                QrCodeUrl = withQr ? transfer.QrImageUrl : null,
                AmountVnd = plan.PriceVnd,
                BankCode = transfer.BankCode,
                AccountNumber = transfer.AccountNumber,
                AccountName = transfer.AccountName,
                TransferContent = code,
                ExpiresAt = transaction.CreatedAt.AddMinutes(_sePay.ExpiryMinutes),
                VietQrBankCode = VietQrBanks.FindCode(transfer.BankCode),
                Message = withQr
                    ? $"Quét mã VietQR bằng app ngân hàng, hoặc chuyển {amount}đ với nội dung {code}. Gói Pro được kích hoạt ngay khi nhận được tiền."
                    : $"Chuyển {amount}đ tới số tài khoản {transfer.AccountNumber} ({transfer.BankCode}) với nội dung {code}. Gói Pro được kích hoạt ngay khi nhận được tiền."
            });
        }

        return ApiResponse<CheckoutSessionResponseDto>.Fail("Không tạo được mã thanh toán, vui lòng thử lại.");
    }

    public async Task<ApiResponse<bool>> HandleSePayWebhookAsync(string? authorizationHeader, string rawBody)
    {
        if (!_sePay.IsConfigured)
        {
            return ApiResponse<bool>.Fail("Thanh toán SePay chưa được cấu hình.", null, ApiErrorKind.Unavailable);
        }

        var webhook = _sePay.ReadWebhook(authorizationHeader, rawBody);
        if (!webhook.Authorized)
        {
            return ApiResponse<bool>.Fail("API key webhook SePay không hợp lệ.", null, ApiErrorKind.Unauthorized);
        }

        // Mọi trường hợp đã xử lý xong đều trả {"success": true} để SePay không gửi lại (tiền ra, nội dung lạ, chuyển thiếu...).
        if (webhook.Transfer is not { } transfer)
        {
            return ApiResponse<bool>.Ok(true, "Bỏ qua giao dịch không phải tiền vào.");
        }

        var candidates = SePayCodeCandidates(transfer);
        var transaction = candidates.Count == 0
            ? null
            : await _db.PaymentTransactions.FirstOrDefaultAsync(t =>
                SubscriptionCatalog.SePayMethods.Contains(t.PaymentMethod) && candidates.Contains(t.SessionId));
        if (transaction is null)
        {
            _logger.LogInformation("SePay transfer {TransferId} ({Amount}đ) does not match any SePay order.", transfer.Id, transfer.Amount);
            return ApiResponse<bool>.Ok(true, "Không có đơn nào khớp nội dung chuyển khoản.");
        }

        return await ApplySePayTransferAsync(transaction, transfer);
    }

    /// <summary>Đơn SePay còn chờ: hỏi API giao dịch của SePay (giới hạn tần suất) và xác nhận nếu đã có tiền vào đúng mã.</summary>
    private async Task CheckSePayTransferAsync(PaymentTransaction transaction)
    {
        var now = DateTime.UtcNow;
        if (SePayLastQueriedAt.TryGetValue(transaction.Id, out var last) &&
            now - last < TimeSpan.FromSeconds(_sePay.StatusCheckIntervalSeconds))
        {
            return;
        }

        SePayLastQueriedAt[transaction.Id] = now;
        if (SePayLastQueriedAt.Count > 1000)
        {
            foreach (var stale in SePayLastQueriedAt.Where(entry => now - entry.Value > TimeSpan.FromHours(1)).Select(entry => entry.Key).ToList())
            {
                SePayLastQueriedAt.TryRemove(stale, out _);
            }
        }

        try
        {
            var transfers = await _sePay.GetIncomingTransfersAsync(transaction.CreatedAt);
            var match = transfers.FirstOrDefault(transfer => SePayCodeCandidates(transfer).Contains(transaction.SessionId));
            if (match is not null)
            {
                await ApplySePayTransferAsync(transaction, match);
            }
        }
        catch (Exception ex)
        {
            // SePay tạm lỗi: trả trạng thái đang có, lần hỏi sau thử lại.
            _logger.LogWarning(ex, "Could not query SePay transactions for order {OrderCode}.", transaction.OrderCode);
        }
    }

    /// <summary>Đủ tiền → Paid + kích hoạt Pro (idempotent); thiếu tiền → giữ chờ, ghi log để đối soát thủ công.</summary>
    private async Task<ApiResponse<bool>> ApplySePayTransferAsync(PaymentTransaction transaction, SePayIncomingTransfer transfer)
    {
        if (transaction.Status == PaymentStatuses.Paid)
        {
            return ApiResponse<bool>.Ok(true, "Giao dịch đã được xác nhận trước đó.");
        }

        if (transfer.Amount < transaction.AmountVnd)
        {
            _logger.LogWarning("SePay transfer {TransferId} for {Code}: received {Amount}đ, expected {Expected}đ — Pro not activated.",
                transfer.Id, transaction.SessionId, transfer.Amount, transaction.AmountVnd);
            return ApiResponse<bool>.Ok(true, "Số tiền chuyển chưa đủ — chưa kích hoạt gói Pro.");
        }

        var confirmError = await ConfirmPaidAsync(transaction, $"SEPAY-{transfer.Id}");
        return confirmError is null
            ? ApiResponse<bool>.Ok(true, "Đã xác nhận thanh toán và kích hoạt gói Pro.")
            : ApiResponse<bool>.Fail(confirmError);
    }

    /// <summary>
    /// Các mã thanh toán có thể có trong một khoản tiền vào: mã SePay tự nhận ra (<c>code</c>) và mọi chuỗi "tiền tố + 8 ký tự"
    /// trong nội dung chuyển khoản. Ngân hàng hay chèn thêm chữ/dấu chấm hoặc viết hoa, nên so trên chuỗi chỉ còn chữ-số in hoa.
    /// </summary>
    private List<string> SePayCodeCandidates(SePayIncomingTransfer transfer)
    {
        var prefix = _sePay.PaymentCodePrefix;
        var candidates = new List<string>();
        if (transfer.Code is { } code)
        {
            candidates.Add(code.Trim().ToUpperInvariant());
        }

        var normalized = new string(transfer.Content.ToUpperInvariant().Where(char.IsAsciiLetterOrDigit).ToArray());
        for (var index = normalized.IndexOf(prefix, StringComparison.Ordinal);
             index >= 0 && index + prefix.Length + SePayCodeLength <= normalized.Length;
             index = normalized.IndexOf(prefix, index + 1, StringComparison.Ordinal))
        {
            candidates.Add(normalized.Substring(index, prefix.Length + SePayCodeLength));
        }

        return candidates.Distinct().ToList();
    }

    // ───────────────────────────── PayOS ─────────────────────────────

    private async Task<ApiResponse<CheckoutSessionResponseDto>> CreatePayOSCheckoutAsync(Guid userId, SubscriptionCatalog.Plan plan, string? returnUrl)
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
                link = await _payOS.CreatePaymentLinkAsync(orderCode, amount, description, plan.Name, returnUrl);
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

        // SePay/mở app ngân hàng: dự phòng khi webhook không tới được máy chủ (vd. máy dev) — tự hỏi API giao dịch của SePay.
        if (transaction.Status == PaymentStatuses.Pending && SubscriptionCatalog.SePayMethods.Contains(transaction.PaymentMethod) && _sePay.CanQueryTransactions)
        {
            await CheckSePayTransferAsync(transaction);
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
        _notifications.TryAddAsync(userId, NotificationCategories.Premium, "Đã kích hoạt SmartMeal Pro",
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
}
