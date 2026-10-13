using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Grocery;

namespace SmartMeal.Application.Services;

public interface IGroceryService
{
    Task<ApiResponse<GrocerySummaryDto>> GetGroceryListAsync(Guid userId);
    Task<ApiResponse<GrocerySummaryDto>> GenerateFromMealPlanAsync(Guid userId, GenerateGroceryRequestDto dto);
    Task<ApiResponse<GroceryItemDto>> AddCustomItemAsync(Guid userId, AddCustomGroceryItemDto dto);
    Task<ApiResponse<GroceryItemDto>> ToggleItemCheckedAsync(Guid userId, Guid itemId, bool isChecked);

    /// <summary>Đánh dấu/bỏ đánh dấu mua toàn bộ danh sách trong một lần; trả danh sách mới.</summary>
    Task<ApiResponse<GrocerySummaryDto>> SetAllCheckedAsync(Guid userId, bool isChecked);

    Task<ApiResponse<bool>> DeleteItemAsync(Guid userId, Guid itemId);
    Task<ApiResponse<bool>> ClearCheckedItemsAsync(Guid userId);

    /// <summary>"Hoàn tất mua sắm" trong một transaction: ghi lại lần mua, bỏ món đã mua, giữ/bỏ món chưa mua, tùy chọn cộng thực đơn kỳ sau.</summary>
    Task<ApiResponse<GrocerySummaryDto>> CompleteShoppingAsync(Guid userId, CompleteGroceryRequestDto dto);
}
