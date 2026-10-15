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
/// Cài đặt <see cref="ISePayGateway"/>: ảnh VietQR từ dịch vụ QR của SePay, webhook xác thực bằng API Key
/// (<c>Authorization: Apikey ...</c>) và API giao dịch <c>GET /userapi/transactions/list</c> (<c>Authorization: Bearer ...</c>).
/// </summary>
public sealed class SePayGateway : ISePayGateway
{
    /// <summary>SePay ghi thời gian giao dịch theo giờ Việt Nam.</summary>
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    private const string ApiKeyScheme = "Apikey ";

    private readonly HttpClient _httpClient;
    private readonly SePayOptions _options;
    private readonly ILogger<SePayGateway> _logger;

    public SePayGateway(HttpClient httpClient, IOptions<SePayOptions> options, ILogger<SePayGateway> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public bool IsConfigured => _options.IsConfigured;
    public bool CanQueryTransactions => _options.HasBankAccount && _options.CanQueryTransactions;
    public string PaymentCodePrefix => _options.PaymentCodePrefix.Trim().ToUpperInvariant();
    public int ExpiryMinutes => _options.ExpiryMinutes;
    public int StatusCheckIntervalSeconds => _options.StatusCheckIntervalSeconds;

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

    /// <summary>Chỉ nhận khoản tiền vào có id và số tiền dương.</summary>
    private static SePayIncomingTransfer? ToTransfer(string? id, decimal amount, string? content, string? code, string? reference) =>
        string.IsNullOrWhiteSpace(id) || amount <= 0
            ? null
            : new SePayIncomingTransfer(id, amount, content ?? string.Empty, EmptyToNull(code), EmptyToNull(reference));

    private static string? EmptyToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    /// <summary>SePay có thể trả số dưới dạng chuỗi ("79000.00") — đọc cả hai.</summary>
    private static string? GetString(JsonElement element, string name) =>
        element.TryGetProperty(name, out var value)
            ? value.ValueKind switch
            {
                JsonValueKind.String => value.GetString(),
                JsonValueKind.Number => value.GetRawText(),
                _ => null
            }
            : null;

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
