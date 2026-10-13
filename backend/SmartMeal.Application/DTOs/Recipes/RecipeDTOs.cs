using System.ComponentModel.DataAnnotations;

namespace SmartMeal.Application.DTOs.Recipes;

public class RecipeDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public string Instructions { get; set; } = string.Empty;
    public int PrepTimeMinutes { get; set; }
    public int CookTimeMinutes { get; set; }

    /// <summary>Tổng thời gian chuẩn bị + nấu (phút).</summary>
    public int TotalTimeMinutes { get; set; }

    public int Servings { get; set; }
    public string Difficulty { get; set; } = "Easy";
    public bool IsPremium { get; set; }
    public double CaloriesPerServing { get; set; }
    public double CarbsPerServing { get; set; }
    public double FatPerServing { get; set; }
    public double ProteinPerServing { get; set; }
    public List<string> Tags { get; set; } = new();

    /// <summary>Các bữa phù hợp (Breakfast/Lunch/Dinner/Snack); rỗng = phù hợp mọi bữa.</summary>
    public List<string> MealTypes { get; set; } = new();

    /// <summary>Id (/meta/allergies) của MỌI chất gây dị ứng trong công thức (gộp từ các nguyên liệu) — dùng để lọc theo BR-101/102.</summary>
    public List<int> AllergyIds { get; set; } = new();

    /// <summary>Công thức nằm trong danh sách yêu thích của người dùng đang đăng nhập (false nếu chưa đăng nhập).</summary>
    public bool IsFavorite { get; set; }

    public List<RecipeIngredientDto> Ingredients { get; set; } = new();
}

public class RecipeIngredientDto
{
    public Guid IngredientId { get; set; }
    public string Name { get; set; } = string.Empty;
    public double Amount { get; set; }
    public string Unit { get; set; } = "g";
    public decimal EstimatedPriceVnd { get; set; }

    /// <summary>Chất gây dị ứng của riêng nguyên liệu này.</summary>
    public List<int> AllergyIds { get; set; } = new();
}

public class PantrySuggestionRequestDto
{
    [Required(ErrorMessage = "Cần cung cấp ít nhất 1 nguyên liệu.")]
    [MinLength(1, ErrorMessage = "Cần cung cấp ít nhất 1 nguyên liệu.")]
    [MaxLength(50, ErrorMessage = "Tối đa 50 nguyên liệu.")]
    public List<string> AvailableIngredients { get; set; } = new();
}

/// <summary>Điều kiện tìm công thức. <c>Page</c>/<c>PageSize</c> để trống = trả tất cả.</summary>
public class RecipeQuery
{
    public string? Search { get; set; }
    public string? Tag { get; set; }
    public string? Difficulty { get; set; }
    public int? MaxCalories { get; set; }

    /// <summary>Breakfast | Lunch | Dinner | Snack (không phân biệt hoa/thường).</summary>
    public string? MealType { get; set; }

    /// <summary>Tổng thời gian chuẩn bị + nấu tối đa (phút) — khớp thời gian hiển thị trên thẻ món ở FE.</summary>
    public int? MaxTotalMinutes { get; set; }

    public int? Page { get; set; }
    public int? PageSize { get; set; }

    /// <summary>Loại các công thức chứa chất gây dị ứng của người dùng (cần đăng nhập).</summary>
    public bool ExcludeMyAllergens { get; set; }
}
