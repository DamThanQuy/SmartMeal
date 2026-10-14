using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Foods;

namespace SmartMeal.Application.Services;

public interface IFoodService
{
    /// <summary>Tìm thực phẩm; <paramref name="userId"/> để thấy món của mình, đánh dấu yêu thích và dùng scope mine/recent/favorite.</summary>
    Task<ApiResponse<PagedResult<FoodItemDto>>> GetFoodsAsync(FoodQuery query, Guid? userId);

    Task<ApiResponse<FoodItemDto>> GetFoodByIdAsync(Guid id, Guid? userId);

    /// <summary>Tra mã vạch: món của chính người dùng trước, rồi đến thực phẩm chung; không có thì 404 (BR-120/130).</summary>
    Task<ApiResponse<FoodItemDto>> GetFoodByBarcodeAsync(string barcode, Guid? userId);

    Task<ApiResponse<FoodItemDto>> CreateFoodAsync(Guid userId, CreateFoodRequestDto dto);

    /// <summary>Xóa món do chính người dùng nhập (nhật ký đã ghi giữ nguyên số liệu).</summary>
    Task<ApiResponse<bool>> DeleteFoodAsync(Guid userId, Guid id);

    Task<ApiResponse<FoodFavoriteDto>> SetFavoriteAsync(Guid userId, Guid id, bool isFavorite);
}
