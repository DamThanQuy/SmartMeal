namespace SmartMeal.Domain.Entities;

public class Ingredient
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public string Category { get; set; } = "General"; // Vegetable, Meat, Seafood, Fruit, Dairy, Grain, Spice
    public string DefaultUnit { get; set; } = "g"; // g, ml, piece
    public decimal EstimatedPriceVnd { get; set; }

    // Nutrition per 100g or 1 unit
    public double CaloriesPer100g { get; set; }
    public double CarbsPer100g { get; set; }
    public double FatPer100g { get; set; }
    public double ProteinPer100g { get; set; }
    public double FiberPer100g { get; set; }
    public double SugarPer100g { get; set; }
    public double SodiumMgPer100g { get; set; }

    /// <summary>Chất gây dị ứng chính (giữ để tương thích). Nguồn đầy đủ là <see cref="IngredientAllergies"/> vì một nguyên liệu có thể chứa nhiều chất gây dị ứng.</summary>
    public int? AllergyId { get; set; }
    public Allergy? Allergy { get; set; }

    /// <summary>Mọi chất gây dị ứng của nguyên liệu (BR-101/102).</summary>
    public ICollection<IngredientAllergy> IngredientAllergies { get; set; } = new List<IngredientAllergy>();

    // ── Danh mục thực phẩm (nguyên liệu và món ăn dùng chung một bảng để nhật ký ghi theo IngredientId) ──

    /// <summary>Số liệu đã được kiểm chứng. Món người dùng tự nhập và món mẫu chưa kiểm chứng thì false (BR-120/121).</summary>
    public bool IsVerified { get; set; } = true;

    /// <summary>null = thực phẩm chung của hệ thống; có giá trị = do người dùng đó tự nhập và chỉ họ thấy.</summary>
    public Guid? OwnerUserId { get; set; }
    public User? Owner { get; set; }

    /// <summary>Mã vạch (chỉ chữ số) nếu có.</summary>
    public string? Barcode { get; set; }

    /// <summary>Tên + mô tả đã bỏ dấu, viết thường — để tìm "pho bo" ra "Phở bò" bằng một câu SQL.</summary>
    public string SearchText { get; set; } = string.Empty;

    public ICollection<FoodServing> Servings { get; set; } = new List<FoodServing>();

    public ICollection<RecipeIngredient> RecipeIngredients { get; set; } = new List<RecipeIngredient>();
}

public class IngredientAllergy
{
    public Guid IngredientId { get; set; }
    public Ingredient Ingredient { get; set; } = null!;
    public int AllergyId { get; set; }
    public Allergy Allergy { get; set; } = null!;
}

public class Recipe
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public string Instructions { get; set; } = string.Empty; // Step-by-step markdown or text
    public int PrepTimeMinutes { get; set; }
    public int CookTimeMinutes { get; set; }
    public int Servings { get; set; } = 1;
    public string Difficulty { get; set; } = "Easy"; // Easy, Medium, Hard
    public bool IsPremium { get; set; } = false;

    /// <summary>Các bữa phù hợp, phân tách bằng dấu phẩy (Breakfast,Lunch,Dinner,Snack). Rỗng = phù hợp mọi bữa.</summary>
    public string MealTypes { get; set; } = string.Empty;

    // Total Nutrition per Serving
    public double CaloriesPerServing { get; set; }
    public double CarbsPerServing { get; set; }
    public double FatPerServing { get; set; }
    public double ProteinPerServing { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<RecipeIngredient> RecipeIngredients { get; set; } = new List<RecipeIngredient>();
    public ICollection<RecipeTag> RecipeTags { get; set; } = new List<RecipeTag>();
    public ICollection<UserFavorite> Favorites { get; set; } = new List<UserFavorite>();
}

public class RecipeIngredient
{
    public Guid RecipeId { get; set; }
    public Recipe Recipe { get; set; } = null!;
    public Guid IngredientId { get; set; }
    public Ingredient Ingredient { get; set; } = null!;
    public double Amount { get; set; }
    public string Unit { get; set; } = "g";
}

public class Tag
{
    public int Id { get; set; }

    /// <summary>Mã ổn định (slug), vd. "eatClean", "keto".</summary>
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty; // EatClean, Keto, Vegan, HighProtein, QuickMeal
    public ICollection<RecipeTag> RecipeTags { get; set; } = new List<RecipeTag>();
}

public class RecipeTag
{
    public Guid RecipeId { get; set; }
    public Recipe Recipe { get; set; } = null!;
    public int TagId { get; set; }
    public Tag Tag { get; set; } = null!;
}
