using System.Globalization;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SmartMeal.Application.Services;
using SmartMeal.Infrastructure.Options;

namespace SmartMeal.Infrastructure.Services;

/// <summary>
/// Cổng kết nối tích hợp dịch vụ thanh toán chuyển khoản ngân hàng tự động SePay (VietQR API):
/// - Tạo ảnh mã VietQR động tích hợp đầy đủ số tài khoản, mã ngân hàng, số tiền và nội dung chuyển khoản duy nhất.
/// - Tiếp nhận và xác thực tính hợp lệ của Webhook biến động số dư ngân hàng qua header 'Authorization: Apikey ...'.
/// - Chủ động tra cứu danh sách lịch sử giao dịch tiền vào từ SePay Open API (<c>GET /userapi/transactions/list</c>) để đối soát dự phòng khi Webhook gặp sự cố.
/// </summary>
public sealed class SePayGateway : ISePayGateway
{
    /// <summary>Chênh lệch múi giờ Việt Nam (+7 UTC) dùng để chuyển đổi mốc thời gian truy vấn SePay.</summary>
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    /// <summary>Tiền tố scheme của header xác thực API Key từ SePay Webhook.</summary>
    private const string ApiKeyScheme = "Apikey ";

    private readonly HttpClient _httpClient;
    private readonly SePayOptions _options;
    private readonly ILogger<SePayGateway> _logger;

    /// <summary>
    /// Khởi tạo instance mới của <see cref="SePayGateway"/>.
    /// </summary>
    /// <param name="httpClient">Http Client dùng để gọi REST API sang SePay.</param>
    /// <param name="options">Tùy chọn cấu hình SePay (Số tài khoản, ngân hàng, ApiToken, WebhookApiKey).</param>
    /// <param name="logger">Logger phục vụ ghi log theo dõi giao dịch và bắt lỗi kết nối.</param>
    public SePayGateway(HttpClient httpClient, IOptions<SePayOptions> options, ILogger<SePayGateway> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    /// <summary>
    /// Cờ kiểm tra cấu hình cơ bản của SePay đã đầy đủ (có cấu hình tài khoản ngân hàng nhận tiền) hay chưa.
    /// </summary>
    public bool IsConfigured => _options.IsConfigured;

    /// <summary>
    /// Cờ kiểm tra dịch vụ có khả năng chủ động gọi API lấy danh sách giao dịch hay không (yêu cầu cấu hình ApiToken).
    /// </summary>
    public bool CanQueryTransactions => _options.HasBankAccount && _options.CanQueryTransactions;

    /// <summary>
    /// Tiền tố mã thanh toán (ví dụ: 'SM') gắn ở đầu chuỗi nội dung chuyển khoản.
    /// </summary>
    public string PaymentCodePrefix => _options.PaymentCodePrefix.Trim().ToUpperInvariant();

    /// <summary>
    /// Thời gian hết hạn của phiên chuyển khoản (tính theo phút, mặc định 15 phút).
    /// </summary>
    public int ExpiryMinutes => _options.ExpiryMinutes;

    /// <summary>
    /// Khoảng thời gian tối thiểu giữa 2 lần client gọi hỏi trạng thái đơn hàng (tính bằng giây) để tránh spam API.
    /// </summary>
    public int StatusCheckIntervalSeconds => _options.StatusCheckIntervalSeconds;

    /// <summary>
    /// Khởi tạo thông tin chuyển khoản VietQR:
    /// - Sinh URL ảnh mã QR VietQR động từ dịch vụ VietQR của SePay kèm các tham số tài khoản, số tiền và nội dung chuyển khoản.
    /// </summary>
    /// <param name="amountVnd">Số tiền cần thanh toán tính bằng VNĐ.</param>
    /// <param name="transferContent">Chuỗi mã nội dung chuyển khoản duy nhất đại diện cho đơn hàng.</param>
    /// <returns>Đối tượng <see cref="SePayTransferInfo"/> chứa URL ảnh QR, số tài khoản, mã ngân hàng và tên chủ tài khoản.</returns>
    public SePayTransferInfo BuildTransferInfo(decimal amountVnd, string transferContent)
    {
        var accountNumber = _options.AccountNumber.Trim();
        var bankCode = _options.BankCode.Trim();
        var query = string.Join('&',
            $"acc={Uri.EscapeDataString(accountNumber)}",
            $"bank={Uri.EscapeDataString(bankCode)}",
            $"amount={decimal.ToInt64(decimal.Round(amountVnd)).ToString(CultureInfo.InvariantCulture)}",
            $"des={Uri.EscapeDataString(transferContent)}",
            "template=compact");
        var accountName = string.IsNullOrWhiteSpace(_options.AccountName) ? null : _options.AccountName.Trim();
        return new SePayTransferInfo($"{_options.QrImageBaseUrl.TrimEnd('/')}?{query}", bankCode, accountNumber, accountName);
    }

    /// <summary>
    /// Đọc và giải mã dữ liệu Webhook thông báo biến động số dư nhận được từ SePay:
    /// - Kiểm tra tính hợp lệ của Authorization header bằng so sánh an toàn thời gian cố định (Fixed-time equals).
    /// - Bóc tách giao dịch tiền vào ('transferType == in'), số tiền và nội dung chuyển khoản.
    /// </summary>
    /// <param name="authorizationHeader">Header Authorization kèm API Key.</param>
    /// <param name="rawBody">Chuỗi JSON gốc của Webhook payload.</param>
    /// <returns>Đối tượng <see cref="SePayWebhookResult"/> chứa cờ Authorized và dữ liệu khoản tiền chuyển vào.</returns>
    public SePayWebhookResult ReadWebhook(string? authorizationHeader, string rawBody)
    {
        if (!IsAuthorized(authorizationHeader))
        {
            return new SePayWebhookResult(false, null);
        }

        try
        {
            using var document = JsonDocument.Parse(rawBody);
            var root = document.RootElement;
            if (root.ValueKind != JsonValueKind.Object ||
                !string.Equals(GetString(root, "transferType"), "in", StringComparison.OrdinalIgnoreCase))
            {
                return new SePayWebhookResult(true, null);
            }

            return new SePayWebhookResult(true, ToTransfer(
                GetString(root, "id"), GetDecimal(root, "transferAmount"), GetString(root, "content"),
                GetString(root, "code"), GetString(root, "referenceCode")));
        }
        catch (JsonException)
        {
            return new SePayWebhookResult(true, null);
        }
    }

    /// <summary>
    /// Chủ động gọi REST API sang hệ thống SePay để lấy danh sách các giao dịch tiền vào từ một thời điểm nhất định:
    /// Dùng trong cơ chế Polling dự phòng khi Webhook gặp sự cố hoặc máy chủ thử nghiệm không có IP public.
    /// </summary>
    /// <param name="sinceUtc">Mốc thời gian UTC bắt đầu lọc giao dịch.</param>
    /// <param name="cancellationToken">CancellationToken hủy tác vụ bất đồng bộ.</param>
    /// <returns>Danh sách các giao dịch tiền vào <see cref="SePayIncomingTransfer"/> thỏa mãn điều kiện.</returns>
    public async Task<IReadOnlyList<SePayIncomingTransfer>> GetIncomingTransfersAsync(DateTime sinceUtc, CancellationToken cancellationToken = default)
    {
        if (!CanQueryTransactions)
        {
            return Array.Empty<SePayIncomingTransfer>();
        }

        // Lọc theo ngày (giờ Việt Nam) của lúc tạo đơn — định dạng yyyy-mm-dd theo tài liệu SePay; phần còn lại so mã ở máy chủ.
        var sinceVietnam = DateTime.SpecifyKind(sinceUtc, DateTimeKind.Utc) + VietnamOffset;
        var url = $"{_options.ApiBaseUrl.TrimEnd('/')}/userapi/transactions/list" +
                  $"?account_number={Uri.EscapeDataString(_options.AccountNumber.Trim())}" +
                  $"&transaction_date_min={sinceVietnam.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)}&limit=200";
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiToken.Trim());

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("SePay API returned {StatusCode} when listing transactions.", response.StatusCode);
            return Array.Empty<SePayIncomingTransfer>();
        }

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        if (!document.RootElement.TryGetProperty("transactions", out var transactions) || transactions.ValueKind != JsonValueKind.Array)
        {
            return Array.Empty<SePayIncomingTransfer>();
        }

        return transactions.EnumerateArray()
            .Select(item => ToTransfer(
                GetString(item, "id"), GetDecimal(item, "amount_in"), GetString(item, "transaction_content"),
                GetString(item, "code"), GetString(item, "reference_number")))
            .OfType<SePayIncomingTransfer>()
            .ToList();
    }

    /// <summary>
    /// Kiểm tra tính chính xác của Authorization header Webhook từ SePay:
    /// Áp dụng thuật toán so sánh thời gian cố định <see cref="CryptographicOperations.FixedTimeEquals"/> để chống tấn công Timing Attack.
    /// </summary>
    private bool IsAuthorized(string? authorizationHeader)
    {
        if (!_options.CanVerifyWebhook || string.IsNullOrWhiteSpace(authorizationHeader))
        {
            return false;
        }

        var value = authorizationHeader.Trim();
        if (!value.StartsWith(ApiKeyScheme, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(value[ApiKeyScheme.Length..].Trim()),
            Encoding.UTF8.GetBytes(_options.WebhookApiKey.Trim()));
    }

    /// <summary>
    /// Chuyển đổi dữ liệu JSON thô thành đối tượng giao dịch SePayIncomingTransfer:
    /// Chỉ chấp nhận các bản ghi có mã ID hợp lệ và số tiền lớn hơn 0.
    /// </summary>
    private static SePayIncomingTransfer? ToTransfer(string? id, decimal amount, string? content, string? code, string? reference) =>
        string.IsNullOrWhiteSpace(id) || amount <= 0
            ? null
            : new SePayIncomingTransfer(id, amount, content ?? string.Empty, EmptyToNull(code), EmptyToNull(reference));

    /// <summary>
    /// Chuẩn hóa chuỗi văn bản: trả về null nếu chuỗi rỗng hoặc chỉ toàn khoảng trắng.
    /// </summary>
    private static string? EmptyToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    /// <summary>
    /// Đọc thuộc tính kiểu chuỗi từ JsonElement (hỗ trợ cả trường hợp trường đó trả về dạng số trong JSON).
    /// </summary>
    private static string? GetString(JsonElement element, string name) =>
        element.TryGetProperty(name, out var value)
            ? value.ValueKind switch
            {
                JsonValueKind.String => value.GetString(),
                JsonValueKind.Number => value.GetRawText(),
                _ => null
            }
            : null;

    /// <summary>
    /// Đọc thuộc tính kiểu số thực (decimal) từ JsonElement (hỗ trợ cả kiểu số lẫn chuỗi số dạng "79000.00").
    /// </summary>
    private static decimal GetDecimal(JsonElement element, string name)
    {
        if (!element.TryGetProperty(name, out var value))
        {
            return 0;
        }

        return value.ValueKind switch
        {
            JsonValueKind.Number when value.TryGetDecimal(out var number) => number,
            JsonValueKind.String when decimal.TryParse(value.GetString(), NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed) => parsed,
            _ => 0
        };
    }
}
