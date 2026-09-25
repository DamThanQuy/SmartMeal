using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Recipes;

namespace SmartMeal.Application.Services;

public interface IRecipeService
{
    Task<ApiResponse<List<RecipeDto>>> GetRecipesAsync(string? search, string? tag, string? difficulty, int? maxCalories);
    Task<ApiResponse<RecipeDto>> GetRecipeByIdAsync(Guid id);
    Task<ApiResponse<List<RecipeDto>>> SuggestByPantryAsync(PantrySuggestionRequestDto dto);
}
