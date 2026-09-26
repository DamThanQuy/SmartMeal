using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

    private Guid GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(claim, out var id) ? id : Guid.Empty;
    }

    /// <summary>
    /// Lấy danh sách đi chợ hiện tại của người dùng (nhóm theo quầy siêu thị & tính tổng chi phí ước tính).
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<GrocerySummaryDto>>> GetGroceryList()
    {
        var result = await _groceryService.GetGroceryListAsync(GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tự động tổng hợp và sinh danh sách đi chợ thông minh từ thực đơn tuần đã lên kế hoạch.
    /// </summary>
    [HttpPost("generate-from-plan")]
    public async Task<ActionResult<ApiResponse<GrocerySummaryDto>>> GenerateFromPlan([FromBody] GenerateGroceryRequestDto dto)
    {
        var result = await _groceryService.GenerateFromMealPlanAsync(GetUserId(), dto);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Thêm thủ công một món hàng cần mua vào danh sách đi chợ.
    /// </summary>
    [HttpPost("items")]
    public async Task<ActionResult<ApiResponse<GroceryItemDto>>> AddCustomItem([FromBody] AddCustomGroceryItemDto dto)
    {
        var result = await _groceryService.AddCustomItemAsync(GetUserId(), dto);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Đánh dấu đã mua hoặc bỏ đánh dấu cho một món đồ trong danh sách đi chợ.
    /// </summary>
    [HttpPatch("items/{id:guid}/check")]
    public async Task<ActionResult<ApiResponse<GroceryItemDto>>> ToggleCheck(Guid id, [FromBody] ToggleGroceryItemRequestDto dto)
    {
        var result = await _groceryService.ToggleItemCheckedAsync(GetUserId(), id, dto.IsChecked);
        if (!result.Success)
        {
            return NotFound(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Xóa một món đồ khỏi danh sách đi chợ.
    /// </summary>
    [HttpDelete("items/{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteItem(Guid id)
    {
        var result = await _groceryService.DeleteItemAsync(GetUserId(), id);
        if (!result.Success)
        {
            return NotFound(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Dọn dẹp toàn bộ các món đồ đã đánh dấu mua (Clear Checked Items).
    /// </summary>
    [HttpDelete("clear-checked")]
    public async Task<ActionResult<ApiResponse<bool>>> ClearChecked()
    {
        var result = await _groceryService.ClearCheckedItemsAsync(GetUserId());
        return Ok(result);
    }
}
