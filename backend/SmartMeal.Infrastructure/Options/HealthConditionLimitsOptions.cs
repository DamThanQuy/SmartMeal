using System.ComponentModel.DataAnnotations;

namespace SmartMeal.Infrastructure.Options;

/// <summary>
/// Ngưỡng tham khảo cho MỘT khẩu phần khi người dùng khai báo bệnh lý (BR-110/111), mục "HealthConditionLimits".
/// Dùng để loại món khỏi thực đơn tự tạo và để cảnh báo ở chi tiết công thức. Đây là ngưỡng tham khảo, đổi được qua cấu hình,
/// không thay thế chẩn đoán hay tư vấn của bác sĩ/chuyên gia dinh dưỡng (BR-112).
/// </summary>
public sealed class HealthConditionLimitsOptions
{
    public const string SectionName = "HealthConditionLimits";

    /// <summary>Tiểu đường: đường tối đa mỗi khẩu phần (g). Ước tính từ nguyên liệu có số liệu đường.</summary>
    [Range(0, 500)]
    public double DiabetesMaxSugarGrams { get; set; } = 15;

    /// <summary>Tiểu đường: carbohydrate tối đa mỗi khẩu phần (g).</summary>
    [Range(0, 1000)]
    public double DiabetesMaxCarbsGrams { get; set; } = 60;

    /// <summary>Cao huyết áp: natri tối đa mỗi khẩu phần (mg). Ước tính từ nguyên liệu có số liệu natri.</summary>
    [Range(0, 20000)]
    public double HypertensionMaxSodiumMg { get; set; } = 800;

    /// <summary>Mỡ máu cao: chất béo tối đa mỗi khẩu phần (g).</summary>
    [Range(0, 500)]
    public double DyslipidemiaMaxFatGrams { get; set; } = 20;

    /// <summary>Gout: nhóm nguyên liệu nhiều purin cần tránh, so với <c>Ingredient.Category</c> (không phân biệt hoa/thường).</summary>
    public string[] GoutAvoidCategories { get; set; } = { "Seafood", "Organ" };
}
