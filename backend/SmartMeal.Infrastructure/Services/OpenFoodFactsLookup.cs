using System.Globalization;
using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SmartMeal.Application.Services;
using SmartMeal.Infrastructure.Options;

namespace SmartMeal.Infrastructure.Services;

/// <summary>
/// Tra sản phẩm đóng gói trên Open Food Facts (API v2 công khai, không cần khóa). Chỉ nhận sản phẩm có tên và năng lượng;
/// số liệu thiếu thì để 0 như nhãn không ghi, số liệu vô lý thì bỏ qua cả sản phẩm.
/// </summary>
public sealed class OpenFoodFactsLookup : IProductCatalogLookup
{
    public const string SourceName = "Open Food Facts";

    private const string Fields =
        "code,product_name,product_name_vi,generic_name,generic_name_vi,brands,image_front_small_url,image_url," +
        "nutriments,serving_quantity,serving_quantity_unit,allergens_tags,traces_tags";

    private const double KjPerKcal = 4.184;

    /// <summary>
    /// Thẻ dị ứng của Open Food Facts → mã trong /meta/allergies. Gộp cả "traces" (có thể chứa vết) vì dị ứng là ràng buộc
    /// an toàn bắt buộc (BR-101/102).
    /// </summary>
    private static readonly Dictionary<string, string> AllergenTagToCode = new(StringComparer.OrdinalIgnoreCase)
    {
        ["en:crustaceans"] = "seafood",
        ["en:molluscs"] = "seafood",
        ["en:fish"] = "seafood",
        ["en:peanuts"] = "peanut",
        ["en:milk"] = "dairy",
        ["en:eggs"] = "egg",
        ["en:gluten"] = "gluten",
        ["en:soybeans"] = "soy",
        ["en:nuts"] = "treeNut",
        ["en:sesame-seeds"] = "sesame"
    };

    private readonly HttpClient _http;
    private readonly OpenFoodFactsOptions _options;
    private readonly ILogger<OpenFoodFactsLookup> _logger;

    /// <summary>
    /// Khởi tạo dịch vụ tra cứu thông tin sản phẩm từ cơ sở dữ liệu mở Open Food Facts.
    /// </summary>
    /// <param name="http">HttpClient để gửi yêu cầu HTTP.</param>
    /// <param name="options">Cấu hình kết nối và giới hạn thời gian timeout cho Open Food Facts.</param>
    /// <param name="logger">Logger phục vụ ghi nhận cảnh báo và lỗi truy vấn.</param>
    public OpenFoodFactsLookup(HttpClient http, IOptions<OpenFoodFactsOptions> options, ILogger<OpenFoodFactsLookup> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;
    }

    /// <summary>
    /// Tra cứu thông tin sản phẩm và chỉ số dinh dưỡng từ Open Food Facts API v2 theo mã vạch.
    /// </summary>
    /// <param name="barcode">Mã vạch sản phẩm dạng chuỗi số.</param>
    /// <param name="cancellationToken">Token hủy thao tác bất đồng bộ.</param>
    /// <returns>Đối tượng <see cref="ExternalProduct"/> chứa thông tin sản phẩm trích xuất hoặc null nếu không tìm thấy hoặc số liệu không hợp lệ.</returns>
    public async Task<ExternalProduct?> FindByBarcodeAsync(string barcode, CancellationToken cancellationToken = default)
    {
        if (!_options.Enabled || string.IsNullOrWhiteSpace(barcode) || !barcode.All(char.IsAsciiDigit))
        {
            return null;
        }

        var url = $"{_options.BaseUrl.TrimEnd('/')}/api/v2/product/{barcode}.json?fields={Fields}";
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.UserAgent.ParseAdd(_options.UserAgent);

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(_options.TimeoutSeconds));

        try
        {
            using var response = await _http.SendAsync(request, timeout.Token);
            if (response.StatusCode == HttpStatusCode.NotFound)
            {
                return null;
            }

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Open Food Facts trả mã {StatusCode} khi tra mã vạch {Barcode}.", (int)response.StatusCode, barcode);
                return null;
            }

            await using var stream = await response.Content.ReadAsStreamAsync(timeout.Token);
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: timeout.Token);
            return Parse(barcode, document.RootElement);
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException or OperationCanceledException && !cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "Không tra được mã vạch {Barcode} trên Open Food Facts.", barcode);
            return null;
        }
    }

    /// <summary>
    /// Phân tích dữ liệu JSON phản hồi từ API Open Food Facts v2 (<c>{ status, product }</c>) thành đối tượng <see cref="ExternalProduct"/>.
    /// Kiểm tra tính hợp lệ của số liệu dinh dưỡng (calo, macro, natri) và ánh xạ các thẻ dị ứng (allergen tags) sang mã nội bộ.
    /// </summary>
    /// <param name="barcode">Mã vạch sản phẩm.</param>
    /// <param name="root">Gốc phần tử JSON từ phản hồi API.</param>
    /// <returns>Đối tượng <see cref="ExternalProduct"/> hợp lệ hoặc null nếu thiếu thông tin bắt buộc hoặc số liệu bất thường.</returns>
    public static ExternalProduct? Parse(string barcode, JsonElement root)
    {
        if (root.ValueKind != JsonValueKind.Object ||
            (root.TryGetProperty("status", out var status) && ReadNumber(status) is not 1) ||
            !root.TryGetProperty("product", out var product) || product.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        var name = FirstText(product, "product_name_vi", "product_name", "generic_name_vi", "generic_name");
        if (name is null)
        {
            return null;
        }

        var nutriments = product.TryGetProperty("nutriments", out var n) && n.ValueKind == JsonValueKind.Object ? n : default;
        var calories = Nutrient(nutriments, "energy-kcal_100g") ?? Nutrient(nutriments, "energy_100g") / KjPerKcal;
        if (calories is not (>= 0 and <= 900))
        {
            return null;
        }

        var protein = Nutrient(nutriments, "proteins_100g") ?? 0;
        var carbs = Nutrient(nutriments, "carbohydrates_100g") ?? 0;
        var fat = Nutrient(nutriments, "fat_100g") ?? 0;
        var sugar = Nutrient(nutriments, "sugars_100g") ?? 0;
        var fiber = Nutrient(nutriments, "fiber_100g") ?? 0;
        // Natri trên Open Food Facts tính bằng gam; thiếu natri thì suy từ muối (muối ≈ 2,5 × natri).
        var sodiumMg = (Nutrient(nutriments, "sodium_100g") ?? Nutrient(nutriments, "salt_100g") / 2.5 ?? 0) * 1000;

        var values = new[] { protein, carbs, fat, sugar, fiber };
        if (values.Any(v => v is < 0 or > 100) || protein + carbs + fat > 105 || sugar > carbs + 0.5 || sodiumMg is < 0 or > 40000)
        {
            return null;
        }

        double? servingGrams = null;
        if (product.TryGetProperty("serving_quantity", out var serving) && ReadNumber(serving) is { } quantity and > 0 and <= 2000)
        {
            var unit = product.TryGetProperty("serving_quantity_unit", out var u) && u.ValueKind == JsonValueKind.String ? u.GetString() : "g";
            if (string.IsNullOrEmpty(unit) || unit.Equals("g", StringComparison.OrdinalIgnoreCase) || unit.Equals("ml", StringComparison.OrdinalIgnoreCase))
            {
                servingGrams = Math.Round(quantity, 1);
            }
        }

        var allergens = Tags(product, "allergens_tags").Concat(Tags(product, "traces_tags"))
            .Select(tag => AllergenTagToCode.GetValueOrDefault(tag))
            .OfType<string>()
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var brand = FirstText(product, "brands")?.Split(',')[0].Trim();
        var image = FirstText(product, "image_front_small_url", "image_url");

        return new ExternalProduct(
            barcode,
            Truncate(name, 200),
            string.IsNullOrEmpty(brand) ? null : Truncate(brand, 100),
            image is not null && image.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ? image : null,
            Math.Round(calories.Value, 1),
            Math.Round(protein, 1),
            Math.Round(carbs, 1),
            Math.Round(fat, 1),
            Math.Round(fiber, 1),
            Math.Round(sugar, 1),
            Math.Round(sodiumMg, 0),
            servingGrams,
            allergens,
            SourceName);
    }

    private static string? FirstText(JsonElement element, params string[] names)
    {
        foreach (var name in names)
        {
            if (element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String)
            {
                var text = value.GetString()?.Trim();
                if (!string.IsNullOrEmpty(text)) return text;
            }
        }

        return null;
    }

    private static IEnumerable<string> Tags(JsonElement element, string name) =>
        element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.Array
            ? value.EnumerateArray().Where(t => t.ValueKind == JsonValueKind.String).Select(t => t.GetString()!)
            : Enumerable.Empty<string>();

    private static double? Nutrient(JsonElement nutriments, string name) =>
        nutriments.ValueKind == JsonValueKind.Object && nutriments.TryGetProperty(name, out var value) ? ReadNumber(value) : null;

    /// <summary>Open Food Facts trả số lúc dạng number, lúc dạng chuỗi ("12.5").</summary>
    private static double? ReadNumber(JsonElement value) => value.ValueKind switch
    {
        JsonValueKind.Number when value.TryGetDouble(out var d) && double.IsFinite(d) => d,
        JsonValueKind.String when double.TryParse(value.GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out var d) && double.IsFinite(d) => d,
        _ => null
    };

    private static string Truncate(string text, int max) => text.Length <= max ? text : text[..max].TrimEnd();
}
