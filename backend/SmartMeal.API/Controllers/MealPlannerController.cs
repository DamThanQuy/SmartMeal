using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.API.Infrastructure;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.MealPlanner;
using SmartMeal.Application.Services;

namespace SmartMeal.API.Controllers;

/// <summary>
/// Controller quản lý lập kế hoạch thực đơn dinh dưỡng (Meal Planner):
/// - Lên thực đơn chi tiết 7 ngày trong tuần cho các bữa: Sáng (Breakfast), Trưa (Lunch), Tối (Dinner), và Bữa phụ (Snack).
/// - Phân tích và tính toán tổng năng lượng (Calories) và phân bổ dưỡng chất đa lượng (Carbs, Protein, Fat) từng ngày.
/// - Gán, đổi món, xóa món hoặc đánh dấu trạng thái đã nấu/đã ăn.
/// - Thuật toán AI tự động gợi ý và sinh thực đơn 7 ngày thông minh, đảm bảo an toàn tuyệt đối với hồ sơ dị ứng và bệnh lý.
/// Yêu cầu xác thực tài khoản người dùng cho toàn bộ API.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MealPlannerController : ControllerBase
{
    private readonly IMealPlannerService _mealPlannerService;

    /// <summary>
    /// Khởi tạo instance mới của <see cref="MealPlannerController"/>.
    /// </summary>
    /// <param name="mealPlannerService">Dịch vụ quản lý thực đơn tuần và thuật toán sinh thực đơn tự động.</param>
    public MealPlannerController(IMealPlannerService mealPlannerService)
    {
        _mealPlannerService = mealPlannerService;
    }

    /// <summary>
    /// Lấy kế hoạch thực đơn trong vòng 7 ngày liên tiếp tính từ ngày bắt đầu:
    /// - Hiển thị chi tiết các món ăn được phân bổ vào 4 bữa chính/phụ mỗi ngày.
    /// - Thống kê tổng hàm lượng Calo và các chỉ số dinh dưỡng đạt được so với mục tiêu dinh dưỡng cá nhân.
    /// </summary>
    /// <param name="startDate">Ngày bắt đầu tuần (yyyy-MM-dd); nếu để trống mặc định lấy ngày hiện tại (UTC).</param>
    /// <returns>Đối tượng <see cref="WeeklyMealPlanDto"/> chứa lịch thực đơn 7 ngày và số liệu dinh dưỡng tương ứng.</returns>
    [HttpGet("week")]
    public async Task<ActionResult<ApiResponse<WeeklyMealPlanDto>>> GetWeeklyPlan([FromQuery] DateOnly? startDate)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<WeeklyMealPlanDto>();

        var start = startDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        return this.ToActionResult(await _mealPlannerService.GetWeeklyPlanAsync(userId, start));
    }

    /// <summary>
    /// Gán hoặc thay đổi một món ăn vào một bữa cụ thể trong thực đơn tuần:
    /// Quy tắc: Mỗi ô (Ngày, Bữa ăn) chỉ chứa một món ăn chính; nếu ô đã có món ăn, hệ thống sẽ thực hiện cập nhật thay thế món mới.
    /// </summary>
    /// <param name="dto">Dữ liệu phân bổ gồm ngày, loại bữa ăn (Breakfast, Lunch, Dinner, Snack), mã món ăn (RecipeId/FoodId) và số phần ăn.</param>
    /// <returns>Đối tượng <see cref="PlannedMealItemDto"/> biểu diễn món ăn vừa được xếp lịch.</returns>
    [HttpPost("assign")]
    public async Task<ActionResult<ApiResponse<PlannedMealItemDto>>> AssignMeal([FromBody] AssignMealPlanRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<PlannedMealItemDto>();
        return this.ToActionResult(await _mealPlannerService.AssignMealAsync(userId, dto));
    }

    /// <summary>
    /// Cập nhật trạng thái hoàn thành (Đã nấu / Đã ăn) cho một món trong thực đơn:
    /// Giúp người dùng theo dõi mức độ tuân thủ thực đơn dinh dưỡng thực tế.
    /// Nếu body để trống hoặc IsCompleted = true, món ăn được đánh dấu là đã hoàn thành.
    /// </summary>
    /// <param name="id">Mã định danh duy nhất (GUID) của món ăn trong thực đơn.</param>
    /// <param name="dto">Tùy chọn trạng thái hoàn thành (IsCompleted: true/false).</param>
    /// <returns>Đối tượng <see cref="PlannedMealItemDto"/> với trạng thái hoàn thành vừa cập nhật.</returns>
    [HttpPatch("{id:guid}/complete")]
    public async Task<ActionResult<ApiResponse<PlannedMealItemDto>>> Complete(Guid id, [FromBody] CompleteMealPlanRequestDto? dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<PlannedMealItemDto>();
        return this.ToActionResult(await _mealPlannerService.SetCompletedAsync(userId, id, dto?.IsCompleted ?? true));
    }

    /// <summary>
    /// Xóa một món ăn đã lên lịch ra khỏi thực đơn tuần:
    /// Ô lịch tại bữa ăn đó sẽ trở về trạng thái trống (chưa có món).
    /// </summary>
    /// <param name="id">Mã định danh duy nhất của mục thực đơn cần xóa.</param>
    /// <returns>True nếu xóa thành công.</returns>
    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteMealPlan(Guid id)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<bool>();
        return this.ToActionResult(await _mealPlannerService.DeleteMealPlanItemAsync(userId, id));
    }

    /// <summary>
    /// Tự động sinh thực đơn dinh dưỡng 7 ngày thông minh:
    /// - Tự động đối chiếu hồ sơ sức khỏe: loại trừ tuyệt đối các món ăn chứa thành phần gây dị ứng hoặc chống chỉ định với bệnh lý người dùng.
    /// - Cân bằng định lượng Calo hàng ngày bám sát mục tiêu giảm cân/tăng cơ.
    /// - Hỗ trợ tùy chọn 'keepExisting = true': chỉ tự động điền vào các bữa ăn còn trống, giữ nguyên các món người dùng đã tự tay xếp trước đó.
    /// </summary>
    /// <param name="dto">Tham số yêu cầu tự động sinh thực đơn gồm ngày bắt đầu và cờ giữ nguyên món hiện có.</param>
    /// <returns>Thực đơn tuần mới hoàn chỉnh <see cref="WeeklyMealPlanDto"/> sau khi thuật toán hoàn tất.</returns>
    [HttpPost("auto-generate")]
    public async Task<ActionResult<ApiResponse<WeeklyMealPlanDto>>> AutoGenerateWeeklyPlan([FromBody] AutoGeneratePlanRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<WeeklyMealPlanDto>();
        return this.ToActionResult(await _mealPlannerService.AutoGenerateWeeklyPlanAsync(userId, dto));
    }
}
