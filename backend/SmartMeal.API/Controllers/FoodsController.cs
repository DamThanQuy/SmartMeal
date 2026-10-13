using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.API.Infrastructure;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Foods;
using SmartMeal.Application.Services;

namespace SmartMeal.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FoodsController : ControllerBase
{
    private readonly IFoodService _foodService;

    public FoodsController(IFoodService foodService)
    {
        _foodService = foodService;
    }

    /// <summary>Id người dùng nếu request có token hợp lệ; null khi ẩn danh (danh mục chung vẫn xem được).</summary>
    private Guid? OptionalUserId() => this.TryGetUserId(out var id) ? id : null;

    /// <summary>
    /// Tìm thực phẩm (nguyên liệu + món ăn). <c>scope</c>: all (mặc định) | mine | recent | favorite — ba mục sau cần đăng nhập.
    /// Tìm kiếm không phân biệt hoa/thường và dấu tiếng Việt.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<FoodItemDto>>>> GetFoods([FromQuery] FoodQuery query) =>
        this.ToActionResult(await _foodService.GetFoodsAsync(query, OptionalUserId()));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<FoodItemDto>>> GetFoodById(Guid id) =>
        this.ToActionResult(await _foodService.GetFoodByIdAsync(id, OptionalUserId()));

    /// <summary>Tra mã vạch (8–14 chữ số). 404 nếu chưa có sản phẩm — không đoán số liệu (BR-120/130).</summary>
    [HttpGet("barcode/{code}")]
    public async Task<ActionResult<ApiResponse<FoodItemDto>>> GetByBarcode(string code) =>
        this.ToActionResult(await _foodService.GetFoodByBarcodeAsync(code, OptionalUserId()));

    /// <summary>Người dùng tự nhập một món (BR-120/121): gắn nhãn "do người dùng nhập", chỉ chủ sở hữu thấy.</summary>
    [Authorize]
    [HttpPost]
    public async Task<ActionResult<ApiResponse<FoodItemDto>>> CreateFood([FromBody] CreateFoodRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<FoodItemDto>();
        return this.ToActionResult(await _foodService.CreateFoodAsync(userId, dto));
    }

    [Authorize]
    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteFood(Guid id)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<bool>();
        return this.ToActionResult(await _foodService.DeleteFoodAsync(userId, id));
    }

    [Authorize]
    [HttpPost("{id:guid}/favorite")]
    public async Task<ActionResult<ApiResponse<FoodFavoriteDto>>> AddFavorite(Guid id)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<FoodFavoriteDto>();
        return this.ToActionResult(await _foodService.SetFavoriteAsync(userId, id, true));
    }

    [Authorize]
    [HttpDelete("{id:guid}/favorite")]
    public async Task<ActionResult<ApiResponse<FoodFavoriteDto>>> RemoveFavorite(Guid id)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<FoodFavoriteDto>();
        return this.ToActionResult(await _foodService.SetFavoriteAsync(userId, id, false));
    }
}
