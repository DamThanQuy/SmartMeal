namespace SmartMeal.Domain.Entities;

public class NutritionDiary
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public DateOnly LogDate { get; set; }
    public string MealType { get; set; } = "Breakfast"; // Breakfast, Lunch, Dinner, Snack

    public ICollection<DiaryItem> Items { get; set; } = new List<DiaryItem>();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class DiaryItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid NutritionDiaryId { get; set; }
    public NutritionDiary NutritionDiary { get; set; } = null!;

    public string FoodName { get; set; } = string.Empty;
    public Guid? RecipeId { get; set; }
    public Recipe? Recipe { get; set; }
    public Guid? IngredientId { get; set; }
    public Ingredient? Ingredient { get; set; }

    public double ServingSize { get; set; } = 1.0;
    public string Unit { get; set; } = "phần";

    public double Calories { get; set; }
    public double CarbsGrams { get; set; }
    public double FatGrams { get; set; }
    public double ProteinGrams { get; set; }

    public string LogMethod { get; set; } = "Manual"; // Manual, AiImage, Voice, Barcode
    public string? ImageUrl { get; set; }
}

public class MealPlan
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public DateOnly PlanDate { get; set; }
    public string MealType { get; set; } = "Breakfast"; // Breakfast, Lunch, Dinner, Snack

    public Guid RecipeId { get; set; }
    public Recipe Recipe { get; set; } = null!;
    public bool IsCompleted { get; set; } = false;
}

public class UserFavorite
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public Guid RecipeId { get; set; }
    public Recipe Recipe { get; set; } = null!;
    public string CollectionName { get; set; } = "Favorites";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class OtpVerification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    public string OtpCode { get; set; } = string.Empty;
    public DateTime ExpiredAt { get; set; }
    public bool IsUsed { get; set; } = false;
}
