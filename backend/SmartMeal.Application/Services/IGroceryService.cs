using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Grocery;

namespace SmartMeal.Application.Services;

public interface IGroceryService
{
    Task<ApiResponse<GrocerySummaryDto>> GetGroceryListAsync(Guid userId);
    Task<ApiResponse<GrocerySummaryDto>> GenerateFromMealPlanAsync(Guid userId, GenerateGroceryRequestDto dto);
    Task<ApiResponse<GroceryItemDto>> AddCustomItemAsync(Guid userId, AddCustomGroceryItemDto dto);
    Task<ApiResponse<GroceryItemDto>> ToggleItemCheckedAsync(Guid userId, Guid itemId, bool isChecked);
    Task<ApiResponse<bool>> DeleteItemAsync(Guid userId, Guid itemId);
    Task<ApiResponse<bool>> ClearCheckedItemsAsync(Guid userId);
}
