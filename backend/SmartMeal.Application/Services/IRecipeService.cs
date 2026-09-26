using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Recipes;

namespace SmartMeal.Application.Services;

public interface IRecipeService
{
    Task<ApiResponse<List<RecipeDto>>> GetRecipesAsync(string? search, string? tag, string? difficulty, int? maxCalories);
    Task<ApiResponse<RecipeDto>> GetRecipeByIdAsync(Guid id);
    Task<ApiResponse<List<RecipeDto>>> SuggestByPantryAsync(PantrySuggestionRequestDto dto);
    Task<ApiResponse<FavoriteToggleResponseDto>> ToggleFavoriteAsync(Guid userId, Guid recipeId);
    Task<ApiResponse<List<RecipeDto>>> GetFavoritesAsync(Guid userId);
    Task<ApiResponse<List<RecipeCollectionDto>>> GetCollectionsAsync(Guid userId);
    Task<ApiResponse<RecipeCollectionDto>> CreateCollectionAsync(Guid userId, CreateCollectionRequestDto dto);
    Task<ApiResponse<bool>> AddRecipeToCollectionAsync(Guid userId, Guid collectionId, Guid recipeId);
}
