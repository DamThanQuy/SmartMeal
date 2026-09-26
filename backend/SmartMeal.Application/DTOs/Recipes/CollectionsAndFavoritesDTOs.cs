namespace SmartMeal.Application.DTOs.Recipes;

public class CreateCollectionRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? CoverImageUrl { get; set; }
    public bool IsPublic { get; set; } = false;
}

public class RecipeCollectionDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? CoverImageUrl { get; set; }
    public int RecipeCount { get; set; }
    public bool IsPublic { get; set; }
    public List<RecipeDto> Recipes { get; set; } = new();
}

public class AddRecipeToCollectionDto
{
    public Guid RecipeId { get; set; }
}

public class FavoriteToggleResponseDto
{
    public bool IsFavorite { get; set; }
    public int TotalFavorites { get; set; }
}
