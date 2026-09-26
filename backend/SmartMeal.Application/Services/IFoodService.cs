using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Foods;

namespace SmartMeal.Application.Services;

public interface IFoodService
{
    Task<PagedResult<FoodItemDto>> GetFoodsAsync(string? search, string? category, int page, int pageSize);
    Task<ApiResponse<FoodItemDto>> GetFoodByIdAsync(Guid id);
}
