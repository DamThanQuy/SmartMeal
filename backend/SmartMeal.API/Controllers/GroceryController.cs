using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.API.Infrastructure;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Grocery;
using SmartMeal.Application.Services;

namespace SmartMeal.API.Controllers;

/// <summary>
/// Controller quản lý danh sách đi chợ thông minh (Smart Grocery List):
/// - Tự động tổng hợp và quy đổi nguyên liệu cần mua từ kế hoạch thực đơn trong tuần (Meal Plan).
/// - Thêm, sửa, xóa các mặt hàng mua sắm thủ công.
/// - Phân loại nguyên liệu theo quầy/danh mục hàng hóa siêu thị để tối ưu lộ trình mua sắm.
/// - Đánh dấu trạng thái đã mua (Check/Uncheck) và tính toán tổng chi phí ước tính vs thực tế.
/// - Hoàn tất buổi đi chợ (Checkout/Complete shopping) và chuyển tiếp các món chưa mua sang chu kỳ sau.
/// Yêu cầu xác thực tài khoản người dùng cho toàn bộ API.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GroceryController : ControllerBase
{
    private readonly IGroceryService _groceryService;

    /// <summary>
    /// Khởi tạo instance mới của <see cref="GroceryController"/>.
    /// </summary>
    /// <param name="groceryService">Dịch vụ xử lý nghiệp vụ danh sách đi chợ và tính toán chi phí nguyên liệu.</param>
    public GroceryController(IGroceryService groceryService)
    {
        _groceryService = groceryService;
    }

    /// <summary>
    /// Lấy danh sách đi chợ hiện tại của người dùng:
    /// - Nhóm các mặt hàng theo quầy hàng siêu thị (ví dụ: Rau củ quả, Thịt cá trứng, Gia vị đồ khô, Sữa,...).
    /// - Tính toán tổng số lượng món, số món đã mua, số món còn lại và tổng chi phí ước tính.
    /// </summary>
    /// <returns>Đối tượng <see cref="GrocerySummaryDto"/> chứa danh sách chi tiết các món hàng và bảng tổng hợp chi phí.</returns>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<GrocerySummaryDto>>> GetGroceryList()
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<GrocerySummaryDto>();
        return this.ToActionResult(await _groceryService.GetGroceryListAsync(userId));
    }

    /// <summary>
    /// Tự động sinh danh sách đi chợ từ kế hoạch thực đơn (Meal Plan) trong khoảng thời gian chỉ định:
    /// - Trích xuất toàn bộ nguyên liệu của các món ăn trong kế hoạch.
    /// - Tự động gộp các nguyên liệu trùng tên và cùng đơn vị đo lường (ví dụ: cộng dồn số gram thịt bò qua các bữa).
    /// - Đếm số lượng bữa ăn sử dụng chung nguyên liệu đó.
    /// </summary>
    /// <param name="dto">Dữ liệu yêu cầu gồm khoảng thời gian thực đơn (Từ ngày - Đến ngày) cần tổng hợp.</param>
    /// <returns>Đối tượng <see cref="GrocerySummaryDto"/> phản ánh danh sách đi chợ vừa được cập nhật từ thực đơn.</returns>
    [HttpPost("generate-from-plan")]
    public async Task<ActionResult<ApiResponse<GrocerySummaryDto>>> GenerateFromPlan([FromBody] GenerateGroceryRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<GrocerySummaryDto>();
        return this.ToActionResult(await _groceryService.GenerateFromMealPlanAsync(userId, dto));
    }

    /// <summary>
    /// Thêm thủ công một mặt hàng cần mua vào danh sách đi chợ cá nhân:
    /// Cho phép người dùng bổ sung các mặt hàng tiêu dùng ngoài thực đơn (như đồ dùng gia đình, thức uống, đồ dùng bếp).
    /// </summary>
    /// <param name="dto">Dữ liệu mặt hàng cần thêm gồm tên hàng, số lượng, đơn vị tính, danh mục quầy hàng và đơn giá ước tính.</param>
    /// <returns>Đối tượng <see cref="GroceryItemDto"/> của mặt hàng vừa được tạo.</returns>
    [HttpPost("items")]
    public async Task<ActionResult<ApiResponse<GroceryItemDto>>> AddCustomItem([FromBody] AddCustomGroceryItemDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<GroceryItemDto>();
        return this.ToActionResult(await _groceryService.AddCustomItemAsync(userId, dto));
    }

    /// <summary>
    /// Đánh dấu đã mua (hoặc bỏ đánh dấu) cho toàn bộ danh sách hàng hóa trong một thao tác duy nhất:
    /// Nếu body rỗng hoặc IsChecked = true, toàn bộ danh sách được đánh dấu là đã mua.
    /// </summary>
    /// <param name="dto">Tùy chọn trạng thái đánh dấu (IsChecked: true/false); mặc định là true.</param>
    /// <returns>Danh sách đi chợ sau khi cập nhật trạng thái toàn bộ hàng hóa.</returns>
    [HttpPatch("items/check-all")]
    public async Task<ActionResult<ApiResponse<GrocerySummaryDto>>> CheckAll([FromBody] CheckAllGroceryItemsRequestDto? dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<GrocerySummaryDto>();
        return this.ToActionResult(await _groceryService.SetAllCheckedAsync(userId, dto?.IsChecked ?? true));
    }

    /// <summary>
    /// Bật/Tắt trạng thái đã mua cho một món hàng cụ thể trong danh sách đi chợ:
    /// Hỗ trợ người dùng tích chọn nhanh khi đang đi dạo trong siêu thị.
    /// </summary>
    /// <param name="id">Mã định danh duy nhất (GUID) của món hàng cần cập nhật.</param>
    /// <param name="dto">Trạng thái đã mua mới (IsChecked: true/false).</param>
    /// <returns>Món hàng <see cref="GroceryItemDto"/> với trạng thái vừa cập nhật.</returns>
    [HttpPatch("items/{id:guid}/check")]
    public async Task<ActionResult<ApiResponse<GroceryItemDto>>> ToggleCheck(Guid id, [FromBody] ToggleGroceryItemRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<GroceryItemDto>();
        return this.ToActionResult(await _groceryService.ToggleItemCheckedAsync(userId, id, dto.IsChecked));
    }

    /// <summary>
    /// Xóa một món hàng khỏi danh sách đi chợ hiện tại:
    /// Sử dụng khi người dùng hủy bỏ ý định mua một mặt hàng nào đó.
    /// </summary>
    /// <param name="id">Mã định danh duy nhất của món hàng cần xóa.</param>
    /// <returns>True nếu xóa thành công.</returns>
    [HttpDelete("items/{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteItem(Guid id)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<bool>();
        return this.ToActionResult(await _groceryService.DeleteItemAsync(userId, id));
    }

    /// <summary>
    /// Xóa toàn bộ các món hàng đã được đánh dấu 'Đã mua' khỏi danh sách:
    /// Giúp dọn dẹp danh sách gọn gàng, chỉ để lại những món hàng còn tồn đọng chưa kịp mua.
    /// </summary>
    /// <returns>True nếu dọn dẹp thành công.</returns>
    [HttpDelete("clear-checked")]
    public async Task<ActionResult<ApiResponse<bool>>> ClearChecked()
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<bool>();
        return this.ToActionResult(await _groceryService.ClearCheckedItemsAsync(userId));
    }

    /// <summary>
    /// Hoàn tất buổi mua sắm và chốt chi phí (Tuân thủ BR-174):
    /// - Ghi nhận tổng chi phí chi tiêu thực tế của buổi đi chợ vào lịch sử tài chính dinh dưỡng.
    /// - Tự động xóa các mặt hàng đã mua.
    /// - Đối với các mặt hàng chưa mua: Người dùng có thể tùy chọn giữ lại để dồn vào đợt sau hoặc hủy bỏ.
    /// - Có thể kết hợp gộp thực đơn của tuần tiếp theo vào danh sách còn lại trong cùng một Transaction nguyên tử.
    /// </summary>
    /// <param name="dto">Dữ liệu hoàn tất mua sắm gồm chi phí thực tế và tùy chọn giữ/bỏ hàng chưa mua.</param>
    /// <returns>Danh sách đi chợ mới sau khi hoàn tất phiên mua sắm.</returns>
    [HttpPost("complete")]
    public async Task<ActionResult<ApiResponse<GrocerySummaryDto>>> Complete([FromBody] CompleteGroceryRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<GrocerySummaryDto>();
        return this.ToActionResult(await _groceryService.CompleteShoppingAsync(userId, dto));
    }
}
