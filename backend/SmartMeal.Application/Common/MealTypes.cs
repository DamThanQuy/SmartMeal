namespace SmartMeal.Application.Common;

/// <summary>Các loại bữa ăn hợp lệ (BR-051). Giá trị lưu DB luôn ở dạng chuẩn dưới đây.</summary>
public static class MealTypes
{
    public const string Breakfast = "Breakfast";
    public const string Lunch = "Lunch";
    public const string Dinner = "Dinner";
    public const string Snack = "Snack";

    public static readonly IReadOnlyList<string> All = new[] { Breakfast, Lunch, Dinner, Snack };

    /// <summary>Trả dạng chuẩn ("breakfast " → "Breakfast") hoặc null nếu không phải loại bữa ăn hợp lệ.</summary>
    public static string? Normalize(string? value)
    {
        var trimmed = value?.Trim();
        return All.FirstOrDefault(m => string.Equals(m, trimmed, StringComparison.OrdinalIgnoreCase));
    }
}
