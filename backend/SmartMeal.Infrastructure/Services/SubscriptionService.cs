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

/// <summary>
/// Dịch vụ quản lý các gói đăng ký hội viên SmartMeal Pro và tích hợp các cổng thanh toán số (PayOS &amp; SePay VietQR):
/// - Cung cấp danh mục gói cước hội viên (Tháng, Năm, Trọn đời).
/// - Khởi tạo phiên thanh toán (Checkout Session) qua cổng PayOS hoặc quét mã VietQR tự động qua SePay.
/// - Xử lý Webhook tức thời từ PayOS và SePay khi nhận được chuyển khoản ngân hàng.
/// - Cơ chế thăm dò (Polling) đối soát giao dịch dự phòng khi Webhook gặp sự cố mạng.
/// - Kích hoạt gói Pro, gia hạn dồn ngày sử dụng nếu gói cũ còn hạn, và gửi thông báo hệ thống.
/// - Quản lý lịch sử giao dịch và hủy tự động gia hạn gói cước.
/// </summary>
public class SubscriptionService : ISubscriptionService
{
    /// <summary>PayOS giới hạn mô tả chuyển khoản tối đa 25 ký tự theo quy định Napas.</summary>
    private const int PayOSDescriptionMaxLength = 25;

    private readonly ApplicationDbContext _db;
    private readonly SubscriptionOptions _options;
    private readonly IHostEnvironment _environment;
    private readonly IPayOSGateway _payOS;
    private readonly ISePayGateway _sePay;
    private readonly ILogger<SubscriptionService> _logger;
    private readonly NotificationWriter _notifications;

    /// <summary>
    /// Khởi tạo instance mới của <see cref="SubscriptionService"/>.
    /// </summary>
    /// <param name="db">Database context của ứng dụng để ghi nhận giao dịch và cập nhật trạng thái User.</param>
    /// <param name="options">Tùy chọn cấu hình gói đăng ký và môi trường thanh toán.</param>
    /// <param name="environment">Môi trường máy chủ (Development/Staging/Production).</param>
    /// <param name="payOS">Cổng thanh toán PayOS.</param>
    /// <param name="sePay">Cổng thanh toán tự động VietQR SePay.</param>
    /// <param name="logger">Logger phục vụ ghi vết các sự kiện đối soát thanh toán.</param>
    /// <param name="notifications">Dịch vụ ghi thông báo nội bộ hệ thống.</param>
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
        _options = options.Value;
        _environment = environment;
        _payOS = payOS;
        _sePay = sePay;
        _logger = logger;
        _notifications = notifications;
    }

    /// <summary>
    /// Cờ kiểm tra xem có cho phép kích hoạt Pro giả lập (Mock Activation) hay không.
    /// Chỉ bật khi được cấu hình rõ ràng hoặc đang chạy trên môi trường Development.
    /// </summary>
    private bool MockActivationAllowed => _options.AllowMockActivation ?? _environment.IsDevelopment();

    /// <summary>
    /// Lấy danh sách toàn bộ các gói đăng ký SmartMeal Pro đang được mở bán:
    /// Bao gồm giá tiền (VNĐ), chu kỳ thanh toán, huy hiệu nổi bật và danh sách đặc quyền tính năng.
    /// </summary>
    /// <returns>Danh sách các gói cước <see cref="SubscriptionPlanDto"/>.</returns>
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

    /// <summary>
    /// Khởi tạo phiên thanh toán nâng cấp gói Pro cho người dùng:
    /// - Kiểm tra tính hợp lệ của mã gói (planId) và phương thức thanh toán ('payos', 'sepay' hoặc 'bank_app'); với PayOS,
    ///   <c>returnUrl</c> (nếu có) phải là deep link của app SmartMeal.
    /// - Tạo bản ghi giao dịch thanh toán (PaymentTransaction) ở trạng thái 'Pending'.
    /// - Sinh liên kết thanh toán PayOS hoặc mã chuyển khoản VietQR kèm nội dung đối soát SePay duy nhất.
    /// </summary>
    /// <param name="userId">Mã định danh của người dùng yêu cầu nâng cấp.</param>
    /// <param name="dto">Dữ liệu yêu cầu gồm mã gói cước và phương thức thanh toán.</param>
    /// <returns>Đối tượng <see cref="CheckoutSessionResponseDto"/> chứa URL thanh toán, mã QR và thông tin chuyển khoản.</returns>
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

    /// <summary>
    /// Kích hoạt giả lập gói Pro ngay lập tức mà không cần qua cổng thanh toán thực tế:
    /// Chỉ khả dụng trên môi trường Development hoặc kiểm thử nội bộ phục vụ phát triển ứng dụng di động.
    /// Tuyệt đối bị vô hiệu hóa trên môi trường Production để ngăn chặn nâng cấp trái phép.
    /// </summary>
    /// <param name="userId">Mã người dùng cần kích hoạt.</param>
    /// <param name="planId">Mã gói cước muốn kích hoạt giả lập.</param>
    /// <returns>True nếu kích hoạt thành công.</returns>
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

    /// <summary>Bảng chữ cái sinh mã chuyển khoản SePay: loại trừ 0, O, 1, I để tránh nhầm lẫn khi người dùng gõ tay.</summary>
    private const string SePayCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private const int SePayCodeLength = 8;

    /// <summary>Bộ đệm ghi nhớ mốc thời gian hỏi trạng thái SePay gần nhất cho từng đơn hàng nhằm chống spam API.</summary>
    private static readonly ConcurrentDictionary<Guid, DateTime> SePayLastQueriedAt = new();

    /// <summary>
    /// Tạo phiên thanh toán chuyển khoản ngân hàng tự động qua cổng SePay:
    /// - Sinh mã chuyển khoản ngẫu nhiên (SessionId) không trùng lặp và mã đơn hàng (OrderCode).
    /// - Tạo mã VietQR chứa đầy đủ thông tin: Ngân hàng, Số tài khoản, Số tiền chính xác và Nội dung chuyển khoản.
    /// - Lưu giao dịch Pending vào database.
    /// <paramref name="method"/> = SEPAY: kèm mã VietQR để quét; BANK_APP: không QR — số tài khoản + nội dung +
    /// <c>vietQrBankCode</c> để app mở app ngân hàng điền sẵn thông tin.
    /// </summary>
    /// <param name="userId">Mã người dùng mua gói.</param>
    /// <param name="plan">Thông tin gói cước người dùng lựa chọn.</param>
    /// <param name="method">Phương thức chuyển khoản qua SePay: SEPAY (quét QR) hoặc BANK_APP (mở app ngân hàng).</param>
    /// <returns>Đối tượng phản hồi chứa mã QR VietQR và thông tin chuyển khoản.</returns>
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

    /// <summary>
    /// Tiếp nhận và xử lý Webhook thông báo biến động số dư từ hệ thống SePay:
    /// - Xác thực mã API Key Webhook gửi từ SePay qua Authorization header.
    /// - Bóc tách nội dung giao dịch ngân hàng để trích xuất mã đơn hàng.
    /// - Đối soát số tiền thực tế nhận được với giá trị gói cước và kích hoạt Pro tức thì.
    /// </summary>
    /// <param name="authorizationHeader">Giá trị header Authorization chứa SePay API Key.</param>
    /// <param name="rawBody">Chuỗi JSON gốc do SePay Webhook bắn tới.</param>
    /// <returns>True nếu xử lý Webhook thành công.</returns>
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

    /// <summary>
    /// Chủ động truy vấn danh sách giao dịch SePay (Polling Fallback):
    /// Dùng khi thiết bị người dùng kiểm tra trạng thái mà Webhook chưa kịp bắn tới (hoặc môi trường dev local).
    /// Áp dụng cơ chế giới hạn tần suất (Throttle) để không gây quá tải API SePay.
    /// </summary>
    /// <param name="transaction">Bản ghi giao dịch đang ở trạng thái Pending cần kiểm tra.</param>
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

    /// <summary>
    /// Áp dụng kết quả chuyển khoản SePay vào đơn hàng:
    /// - Kiểm tra số tiền chuyển thực tế có đủ bằng giá trị gói cước hay không.
    /// - Nếu đủ tiền: chuyển trạng thái đơn hàng sang 'Paid' và kích hoạt thời hạn Pro cho người dùng.
    /// - Nếu thiếu tiền: giữ nguyên đơn ở trạng thái Pending và ghi log để ban quản trị đối soát thủ công.
    /// </summary>
    /// <param name="transaction">Giao dịch thanh toán cần đối soát.</param>
    /// <param name="transfer">Dữ liệu khoản tiền vào từ SePay.</param>
    /// <returns>True nếu xử lý thành công.</returns>
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
    /// Phân tích và trích xuất danh sách các mã thanh toán tiềm năng có trong nội dung chuyển khoản ngân hàng:
    /// Xử lý chuẩn hóa chuỗi (bỏ dấu cách, dấu chấm, ký tự đặc biệt) để tránh lỗi người dùng gõ sai định dạng.
    /// </summary>
    /// <param name="transfer">Dữ liệu biến động số dư ngân hàng.</param>
    /// <returns>Danh sách các chuỗi mã thanh toán ứng viên.</returns>
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

    /// <summary>
    /// Tạo phiên thanh toán trực tuyến qua cổng PayOS:
    /// - Tạo mã đơn hàng duy nhất dạng số nguyên dương theo quy định của PayOS.
    /// - Gọi API PayOS SDK tạo Payment Link kèm mã QR thanh toán Napas 24/7.
    /// - Lưu bản ghi giao dịch Pending và trả về đường link thanh toán cho client.
    /// </summary>
    /// <param name="userId">Mã người dùng mua gói.</param>
    /// <param name="plan">Thông tin gói cước người dùng lựa chọn.</param>
    /// <param name="returnUrl">Deep link của app (đã kiểm tra) để PayOS quay về sau khi thanh toán; null thì dùng PayOS:ReturnUrl của máy chủ.</param>
    /// <returns>Đối tượng phản hồi chứa CheckoutUrl và mã QR PayOS.</returns>
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

    /// <summary>
    /// Kiểm tra trạng thái giao dịch thanh toán theo mã đơn hàng (OrderCode):
    /// - Chỉ cho phép người dùng sở hữu giao dịch mới có quyền tra cứu.
    /// - Nếu đơn hàng đang ở trạng thái 'Pending', dịch vụ sẽ chủ động gọi API sang PayOS hoặc SePay để cập nhật kết quả mới nhất.
    /// - Tự động kích hoạt Pro nếu trạng thái thanh toán đã thành công.
    /// </summary>
    /// <param name="userId">Mã định danh người dùng yêu cầu.</param>
    /// <param name="orderCode">Mã đơn hàng cần kiểm tra.</param>
    /// <returns>Đối tượng <see cref="PaymentTransactionStatusDto"/> phản ánh trạng thái đơn hàng và cờ IsPaid.</returns>
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

        // SePay: dự phòng khi webhook không tới được máy chủ (vd. máy dev) — tự hỏi API giao dịch của SePay.
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

    /// <summary>
    /// Tiếp nhận và xử lý Webhook thanh toán gửi đến từ máy chủ PayOS:
    /// - Kiểm tra tính toàn vẹn và chữ ký điện tử HMAC-SHA256 của Webhook payload bằng Checksum Key.
    /// - Tìm giao dịch tương ứng theo OrderCode.
    /// - Cập nhật trạng thái 'Paid' và kích hoạt thời hạn Pro cho tài khoản người dùng.
    /// </summary>
    /// <param name="rawBody">Toàn bộ chuỗi JSON thô nhận được trong body của Webhook request.</param>
    /// <returns>True nếu xử lý Webhook thành công.</returns>
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
    /// Quản trị viên xác nhận tay một giao dịch (vd. khách chuyển khoản nhưng webhook không tới): đi qua đúng luồng
    /// <see cref="ConfirmPaidAsync"/> của cổng thanh toán — giao dịch đã Paid trả 409 và không cộng thêm ngày Pro.
    /// </summary>
    /// <param name="transactionId">Mã giao dịch cần duyệt.</param>
    public async Task<ApiResponse<bool>> ApproveTransactionAsync(Guid transactionId)
    {
        var transaction = await _db.PaymentTransactions.FirstOrDefaultAsync(t => t.Id == transactionId);
        if (transaction is null)
        {
            return ApiResponse<bool>.Fail("Không tìm thấy giao dịch thanh toán.", null, ApiErrorKind.NotFound);
        }

        if (transaction.Status == PaymentStatuses.Paid)
        {
            return ApiResponse<bool>.Fail("Giao dịch đã được thanh toán trước đó, không thể duyệt lại.", null, ApiErrorKind.Conflict);
        }

        var confirmError = await ConfirmPaidAsync(transaction, transaction.ProviderTransactionId ?? "admin-approval");
        return confirmError is null
            ? ApiResponse<bool>.Ok(true, "Đã duyệt giao dịch thành công và kích hoạt gói Pro cho người dùng.")
            : ApiResponse<bool>.Fail(confirmError);
    }

    /// <summary>
    /// Ghi nhận giao dịch đã thanh toán và kích hoạt/gia hạn gói Pro cho người dùng (Logic dùng chung cho mọi cổng thanh toán):
    /// - Đảm bảo tính Idempotent: Sử dụng câu lệnh ExecuteUpdateAsync có điều kiện để giải quyết tranh chấp (Race Condition)
    ///   khi Webhook và client Polling đến cùng một lúc, cam đoan thời hạn Pro không bao giờ bị cộng thừa 2 lần.
    /// - Kích hoạt gói Pro, cập nhật ngày hết hạn và tạo thông báo chúc mừng tới người dùng.
    /// </summary>
    /// <param name="transaction">Đối tượng giao dịch thanh toán.</param>
    /// <param name="providerTransactionId">Mã tham chiếu giao dịch từ phía đối tác thanh toán.</param>
    /// <returns>Chuỗi thông báo lỗi nếu thất bại, hoặc null nếu xác nhận thành công.</returns>
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

    /// <summary>
    /// Lấy thông tin trạng thái gói đăng ký hiện tại của người dùng:
    /// Kiểm tra gói Pro còn hiệu lực hay đã hết hạn, ngày hết hạn và mã gói đang sử dụng.
    /// </summary>
    /// <param name="userId">Mã định danh người dùng.</param>
    /// <returns>Đối tượng <see cref="SubscriptionStatusDto"/> chi tiết trạng thái Pro.</returns>
    public async Task<ApiResponse<SubscriptionStatusDto>> GetStatusAsync(Guid userId)
    {
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null)
        {
            return ApiResponse<SubscriptionStatusDto>.Fail("Không tìm thấy người dùng.", null, ApiErrorKind.NotFound);
        }

        return ApiResponse<SubscriptionStatusDto>.Ok(ToStatus(user, DateTime.UtcNow));
    }

    /// <summary>
    /// Lấy lịch sử tất cả các giao dịch thanh toán gói Pro của người dùng:
    /// Sắp xếp theo thứ tự giao dịch mới nhất lên đầu, bao gồm số tiền, cổng thanh toán và trạng thái.
    /// </summary>
    /// <param name="userId">Mã định danh người dùng.</param>
    /// <returns>Danh sách các giao dịch thanh toán <see cref="PaymentTransactionDto"/>.</returns>
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

    /// <summary>
    /// Hủy đăng ký gia hạn tự động gói Pro của người dùng:
    /// Chuyển trạng thái gói sang 'Cancelled'. Người dùng vẫn tiếp tục được hưởng trọn vẹn đặc quyền Pro cho đến hết thời hạn đã thanh toán.
    /// </summary>
    /// <param name="userId">Mã định danh người dùng.</param>
    /// <returns>Trạng thái gói cước sau khi hủy gia hạn.</returns>
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

    /// <summary>
    /// Khởi tạo một đối tượng bản ghi giao dịch thanh toán mới với các giá trị mặc định chuẩn:
    /// Sinh mã băm bảo mật UserRef (SHA-256) để bảo vệ quyền riêng tư người dùng trong log thanh toán.
    /// </summary>
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

    /// <summary>
    /// Tạo và gửi thông báo chúc mừng kích hoạt thành công gói SmartMeal Pro vào hòm thư thông báo nội bộ của người dùng.
    /// </summary>
    private Task NotifyActivatedAsync(Guid userId, SubscriptionCatalog.Plan plan, Guid transactionId) =>
        _notifications.TryAddAsync(userId, NotificationCategories.Premium, "Đã kích hoạt SmartMeal Pro",
            $"{plan.Name}: thêm {plan.DurationDays} ngày dùng toàn bộ tính năng Pro.", $"subscription-{transactionId}");

    /// <summary>
    /// Thuật toán kích hoạt và gia hạn thời hạn Pro:
    /// Nếu gói Pro của người dùng hiện vẫn còn hạn, thời hạn mới sẽ được cộng nối tiếp vào sau ngày hết hạn cũ.
    /// Nếu gói Pro đã hết hạn hoặc chưa từng đăng ký, thời hạn mới sẽ được tính từ thời điểm hiện tại.
    /// </summary>
    private static void Activate(User user, SubscriptionCatalog.Plan plan, DateTime now)
    {
        var start = user.IsProActive(now) && user.ProExpiresAt is { } current ? current : now;
        user.IsPro = true;
        user.ProPlanId = plan.Id;
        user.ProExpiresAt = start.AddDays(plan.DurationDays);
        user.SubscriptionStatus = SubscriptionStatuses.Premium;
        user.UpdatedAt = now;
    }

    /// <summary>
    /// Chuyển đổi thực thể User sang DTO trạng thái gói cước (SubscriptionStatusDto).
    /// </summary>
    private static SubscriptionStatusDto ToStatus(User user, DateTime now) => new()
    {
        Status = user.EffectiveSubscriptionStatus(now),
        IsPro = user.IsProActive(now),
        PlanId = user.ProPlanId,
        ProExpiresAt = user.ProExpiresAt
    };
}
