using System.ComponentModel.DataAnnotations;

namespace SmartMeal.Infrastructure.Options;

/// <summary>
/// Ngưỡng "cao" trên 100 g để cảnh báo sản phẩm quét được (BR-140: vượt ngưỡng Calo/Đường/Muối được cấu hình), mục
/// "ProductSafety". Mặc định theo mức "high" của nhãn dinh dưỡng mặt trước bao bì (UK FSA); calo là mức tham khảo cho
/// thực phẩm giàu năng lượng. Người dùng có bệnh lý liên quan nhận cảnh báo mức DANGER thay vì WARNING.
/// </summary>
public sealed class ProductSafetyOptions
{
    public const string SectionName = "ProductSafety";

    [Range(0, 100)]
    public double HighSugarGramsPer100g { get; set; } = 22.5;

    [Range(0, 10000)]
    public double HighSodiumMgPer100g { get; set; } = 600;

    [Range(0, 100)]
    public double HighFatGramsPer100g { get; set; } = 17.5;

    [Range(0, 1000)]
    public double HighCaloriesPer100g { get; set; } = 400;
}
