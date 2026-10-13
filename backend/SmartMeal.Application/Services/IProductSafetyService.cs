using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.AI;

namespace SmartMeal.Application.Services;

/// <summary>Kiểm tra an toàn sản phẩm theo mã vạch bằng dữ liệu trong CSDL — không dùng AI để đoán sản phẩm (BR-120/140).</summary>
public interface IProductSafetyService
{
    /// <summary>404 kèm <c>errors: ["product_not_found"]</c> khi chưa có sản phẩm với mã vạch này.</summary>
    Task<ApiResponse<CheckSafetyResponseDto>> CheckBarcodeAsync(string barcode, Guid userId);
}
