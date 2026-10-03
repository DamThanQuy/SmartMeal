using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Recipes;

namespace SmartMeal.Application.Services;

public interface IRecipeService
{
    /// <summary>Tìm công thức (sắp xếp theo tên). <paramref name="userId"/> để đánh dấu yêu thích và lọc dị ứng.</summary>
    Task<ApiResponse<PagedResult<RecipeDto>>> GetRecipesAsync(RecipeQuery query, Guid? userId);

    Task<ApiResponse<RecipeDto>> GetRecipeByIdAsync(Guid id, Guid? userId);

    /// <summary>Gợi ý theo nguyên liệu có sẵn. Có <paramref name="userId"/> thì KHÔNG trả công thức chứa chất gây dị ứng của người đó.</summary>
    Task<ApiResponse<List<RecipeDto>>> SuggestByPantryAsync(PantrySuggestionRequestDto dto, Guid? userId);

    Task<ApiResponse<FavoriteToggleResponseDto>> ToggleFavoriteAsync(Guid userId, Guid recipeId);
    Task<ApiResponse<List<RecipeDto>>> GetFavoritesAsync(Guid userId);

    Task<ApiResponse<List<RecipeCollectionDto>>> GetCollectionsAsync(Guid userId);
    Task<ApiResponse<RecipeCollectionDto>> GetCollectionAsync(Guid userId, Guid collectionId);
    Task<ApiResponse<RecipeCollectionDto>> CreateCollectionAsync(Guid userId, CreateCollectionRequestDto dto);
    Task<ApiResponse<RecipeCollectionDto>> UpdateCollectionAsync(Guid userId, Guid collectionId, UpdateCollectionRequestDto dto);
    Task<ApiResponse<bool>> DeleteCollectionAsync(Guid userId, Guid collectionId);
    Task<ApiResponse<bool>> AddRecipeToCollectionAsync(Guid userId, Guid collectionId, Guid recipeId);
    Task<ApiResponse<bool>> RemoveRecipeFromCollectionAsync(Guid userId, Guid collectionId, Guid recipeId);
}
