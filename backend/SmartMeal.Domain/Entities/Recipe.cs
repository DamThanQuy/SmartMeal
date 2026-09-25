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

    // Allergen flag
    public int? AllergyId { get; set; }
    public Allergy? Allergy { get; set; }

    public ICollection<RecipeIngredient> RecipeIngredients { get; set; } = new List<RecipeIngredient>();
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
