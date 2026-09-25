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
    public int Servings { get; set; }
    public string Difficulty { get; set; } = "Easy";
    public bool IsPremium { get; set; }
    public double CaloriesPerServing { get; set; }
    public double CarbsPerServing { get; set; }
    public double FatPerServing { get; set; }
    public double ProteinPerServing { get; set; }
    public List<string> Tags { get; set; } = new();
    public List<RecipeIngredientDto> Ingredients { get; set; } = new();
}

public class RecipeIngredientDto
{
    public Guid IngredientId { get; set; }
    public string Name { get; set; } = string.Empty;
    public double Amount { get; set; }
    public string Unit { get; set; } = "g";
    public decimal EstimatedPriceVnd { get; set; }
}

public class PantrySuggestionRequestDto
{
    public List<string> AvailableIngredients { get; set; } = new();
}
