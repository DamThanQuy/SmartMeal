using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.API.Infrastructure;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Grocery;
using SmartMeal.Application.Services;

namespace SmartMeal.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GroceryController : ControllerBase
{
    private readonly IGroceryService _groceryService;

    public GroceryController(IGroceryService groceryService)
    {
        _groceryService = groceryService;
    }

    /// <summary>
    /// Lấy danh sách đi chợ hiện tại của người dùng (nhóm theo quầy siêu thị & tính tổng chi phí ước tính).
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<GrocerySummaryDto>>> GetGroceryList()
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<GrocerySummaryDto>();
        return this.ToActionResult(await _groceryService.GetGroceryListAsync(userId));
    }

    /// <summary>
    /// Tự động tổng hợp danh sách đi chợ từ thực đơn trong khoảng ngày (gộp nguyên liệu cùng tên/đơn vị, kèm số bữa đã gộp).
    /// </summary>
    [HttpPost("generate-from-plan")]
    public async Task<ActionResult<ApiResponse<GrocerySummaryDto>>> GenerateFromPlan([FromBody] GenerateGroceryRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<GrocerySummaryDto>();
        return this.ToActionResult(await _groceryService.GenerateFromMealPlanAsync(userId, dto));
    }

    /// <summary>
    /// Thêm thủ công một món hàng cần mua vào danh sách đi chợ.
    /// </summary>
    [HttpPost("items")]
    public async Task<ActionResult<ApiResponse<GroceryItemDto>>> AddCustomItem([FromBody] AddCustomGroceryItemDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<GroceryItemDto>();
        return this.ToActionResult(await _groceryService.AddCustomItemAsync(userId, dto));
    }

    /// <summary>
    /// Đánh dấu đã mua (hoặc bỏ đánh dấu) toàn bộ danh sách trong một lần. Body bỏ trống = đã mua tất cả. Trả danh sách mới.
    /// </summary>
    [HttpPatch("items/check-all")]
    public async Task<ActionResult<ApiResponse<GrocerySummaryDto>>> CheckAll([FromBody] CheckAllGroceryItemsRequestDto? dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<GrocerySummaryDto>();
        return this.ToActionResult(await _groceryService.SetAllCheckedAsync(userId, dto?.IsChecked ?? true));
    }

    /// <summary>
    /// Đánh dấu đã mua hoặc bỏ đánh dấu cho một món đồ trong danh sách đi chợ.
    /// </summary>
    [HttpPatch("items/{id:guid}/check")]
    public async Task<ActionResult<ApiResponse<GroceryItemDto>>> ToggleCheck(Guid id, [FromBody] ToggleGroceryItemRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<GroceryItemDto>();
        return this.ToActionResult(await _groceryService.ToggleItemCheckedAsync(userId, id, dto.IsChecked));
    }

    /// <summary>
    /// Xóa một món đồ khỏi danh sách đi chợ.
    /// </summary>
    [HttpDelete("items/{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteItem(Guid id)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<bool>();
        return this.ToActionResult(await _groceryService.DeleteItemAsync(userId, id));
    }

    /// <summary>
    /// Dọn dẹp toàn bộ các món đồ đã đánh dấu mua (Clear Checked Items).
    /// </summary>
    [HttpDelete("clear-checked")]
    public async Task<ActionResult<ApiResponse<bool>>> ClearChecked()
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<bool>();
        return this.ToActionResult(await _groceryService.ClearCheckedItemsAsync(userId));
    }
}
