namespace SmartMeal.Application.Services;

/// <summary>
/// Sản phẩm đóng gói tra được từ nguồn dữ liệu bên ngoài theo mã vạch (BR-120). Số liệu dinh dưỡng tính trên 100 g;
/// <see cref="AllergenCodes"/> là mã trong /meta/allergies (vd. "dairy", "peanut").
/// </summary>
public sealed record ExternalProduct(
    string Barcode,
    string Name,
    string? Brand,
    string? ImageUrl,
    double CaloriesPer100g,
    double ProteinPer100g,
    double CarbsPer100g,
    double FatPer100g,
    double FiberPer100g,
    double SugarPer100g,
    double SodiumMgPer100g,
    double? ServingGrams,
    IReadOnlyList<string> AllergenCodes,
    string Source);

public interface IProductCatalogLookup
{
    /// <summary>
    /// Tra sản phẩm theo mã vạch. Trả null khi không có sản phẩm, sản phẩm thiếu tên/năng lượng, số liệu vô lý,
    /// nguồn bị tắt hoặc gặp lỗi mạng — không bao giờ tự bịa số liệu.
    /// </summary>
    Task<ExternalProduct?> FindByBarcodeAsync(string barcode, CancellationToken cancellationToken = default);
}
