using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.API.Infrastructure;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Diary;
using SmartMeal.Application.Services;

namespace SmartMeal.API.Controllers;

/// <summary>
/// Controller quản lý nhật ký dinh dưỡng hàng ngày (Nutrition Diary &amp; Water Tracker):
/// - Ghi chép từng món ăn đơn lẻ hoặc hàng loạt (Batch Log) vào các bữa ăn trong ngày (Sáng, Trưa, Tối, Phụ).
/// - Xem bảng tổng kết dinh dưỡng theo ngày (Daily Summary) kèm cảnh báo vượt ngưỡng vi chất (Nutrient Alerts).
/// - Theo dõi tiến độ dinh dưỡng theo tuần/tháng (Weekly &amp; Monthly Progress) để đánh giá mức độ thâm hụt/dư thừa năng lượng.
/// - Cập nhật số lượng, khẩu phần ăn hoặc xóa món khỏi nhật ký.
/// - Theo dõi lượng nước uống hàng ngày (Water Log) và lịch sử uống nước theo thời gian.
/// Yêu cầu xác thực tài khoản người dùng qua Bearer Token.
/// </summary>
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class NutritionDiaryController : ControllerBase
{
    private readonly INutritionDiaryService _diaryService;

    /// <summary>
    /// Khởi tạo instance mới của <see cref="NutritionDiaryController"/>.
    /// </summary>
    /// <param name="diaryService">Dịch vụ quản trị nhật ký dinh dưỡng và theo dõi lượng nước uống.</param>
    public NutritionDiaryController(INutritionDiaryService diaryService)
    {
        _diaryService = diaryService;
    }

    /// <summary>
    /// Ghi nhận một món ăn vào nhật ký dinh dưỡng trong ngày:
    /// - Tiếp nhận loại bữa ăn ('Breakfast', 'Lunch', 'Dinner', 'Snack' - không phân biệt hoa thường),
    ///   tên món, số lượng khẩu phần và các chỉ số dinh dưỡng (Calories, Carbs, Protein, Fat, v.v.).
    /// - Tự động đối chiếu với mục tiêu dinh dưỡng cá nhân và kiểm tra các cảnh báo sức khỏe nếu có.
    /// </summary>
    /// <param name="dto">Dữ liệu món ăn ghi vào nhật ký.</param>
    /// <returns>Đối tượng <see cref="DiaryItemDto"/> chứa thông tin bản ghi vừa được tạo.</returns>
    [HttpPost("log")]
    public async Task<ActionResult<ApiResponse<DiaryItemDto>>> LogMeal([FromBody] LogMealRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<DiaryItemDto>();

        return this.ToActionResult(await _diaryService.LogMealAsync(userId, dto));
    }

    /// <summary>
    /// Ghi nhận đồng thời nhiều món ăn vào cùng một bữa trong một Transaction nguyên tử:
    /// Đảm bảo tính nhất quán (All-or-Nothing): toàn bộ danh sách món ăn được lưu thành công hoặc rollback nếu có bất kỳ lỗi nào xảy ra.
    /// Thường dùng khi bóc tách kết quả từ AI Snap &amp; Track hoặc AI Voice Log.
    /// </summary>
    /// <param name="dto">Dữ liệu danh sách các món ăn trong cùng một bữa.</param>
    /// <returns>Danh sách các đối tượng <see cref="DiaryItemDto"/> vừa được ghi thành công.</returns>
    [HttpPost("log/batch")]
    public async Task<ActionResult<ApiResponse<List<DiaryItemDto>>>> LogMealBatch([FromBody] LogMealBatchRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<List<DiaryItemDto>>();

        return this.ToActionResult(await _diaryService.LogMealBatchAsync(userId, dto));
    }

    /// <summary>
    /// Lấy bảng tổng hợp dinh dưỡng trong ngày (Daily Diary Summary):
    /// - Danh sách các món ăn đã ăn phân theo từng bữa (Sáng, Trưa, Tối, Phụ).
    /// - Tổng Calo đã nạp vào so với mục tiêu Calo hàng ngày.
    /// - Tổng lượng dưỡng chất đa lượng đã tiêu thụ: Carbs, Protein, Fat và tỷ lệ phần trăm phân bổ.
    /// - Cảnh báo vượt ngưỡng chất nguy hại (đường, muối natri, chất béo bão hòa) nếu người dùng có bệnh lý liên quan.
    /// </summary>
    /// <param name="date">Ngày cần xem nhật ký (yyyy-MM-dd); nếu null mặc định lấy ngày hiện tại (UTC).</param>
    /// <returns>Đối tượng <see cref="DailyDiarySummaryDto"/> tổng hợp nhật ký ngày.</returns>
    [HttpGet("daily")]
    public async Task<ActionResult<ApiResponse<DailyDiarySummaryDto>>> GetDailySummary([FromQuery] DateOnly? date)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<DailyDiarySummaryDto>();

        var targetDate = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        return this.ToActionResult(await _diaryService.GetDailySummaryAsync(userId, targetDate));
    }

    /// <summary>
    /// Lấy báo cáo tiến độ dinh dưỡng 7 ngày liên tiếp tính từ ngày bắt đầu:
    /// Dùng để vẽ biểu đồ thanh (Bar Chart) lượng Calo tiêu thụ mỗi ngày trong tuần so với đường định mức mục tiêu.
    /// </summary>
    /// <param name="startDate">Ngày bắt đầu tuần (yyyy-MM-dd); mặc định là 6 ngày trước ngày hiện tại.</param>
    /// <returns>Đối tượng <see cref="WeeklyProgressDto"/> chứa dữ liệu tiến trình từng ngày trong tuần.</returns>
    [HttpGet("weekly-progress")]
    public async Task<ActionResult<ApiResponse<WeeklyProgressDto>>> GetWeeklyProgress([FromQuery] DateOnly? startDate)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<WeeklyProgressDto>();

        var start = startDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-6));
        return this.ToActionResult(await _diaryService.GetWeeklyProgressAsync(userId, start));
    }

    /// <summary>
    /// Lấy báo cáo tiến độ dinh dưỡng trong khoảng thời gian tùy biến [startDate, endDate] (tối đa 31 ngày):
    /// Thích hợp để render biểu đồ tháng (Monthly Chart) trên ứng dụng di động.
    /// Mặc định endDate là ngày hôm nay, startDate là 29 ngày trước đó.
    /// </summary>
    /// <param name="startDate">Ngày bắt đầu khoảng thời gian (yyyy-MM-dd).</param>
    /// <param name="endDate">Ngày kết thúc khoảng thời gian (yyyy-MM-dd).</param>
    /// <returns>Đối tượng <see cref="WeeklyProgressDto"/> chứa chuỗi dữ liệu các ngày trong khoảng thời gian.</returns>
    [HttpGet("progress")]
    public async Task<ActionResult<ApiResponse<WeeklyProgressDto>>> GetProgress([FromQuery] DateOnly? startDate, [FromQuery] DateOnly? endDate)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<WeeklyProgressDto>();

        var end = endDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var start = startDate ?? end.AddDays(-29);
        return this.ToActionResult(await _diaryService.GetProgressAsync(userId, start, end));
    }

    /// <summary>
    /// Cập nhật thông tin của một món ăn đã ghi trong nhật ký:
    /// - Cho phép thay đổi số lượng khẩu phần ăn, chuyển món sang bữa khác (ví dụ: chuyển từ Sáng sang Trưa) hoặc đổi ngày ghi chép.
    /// - Áp dụng cập nhật từng phần: Chỉ những trường có giá trị trong DTO mới được thay đổi.
    /// </summary>
    /// <param name="itemId">Mã định danh duy nhất (GUID) của mục nhật ký cần sửa.</param>
    /// <param name="dto">Dữ liệu các trường cần cập nhật.</param>
    /// <returns>Mục nhật ký <see cref="DiaryItemDto"/> sau khi được cập nhật.</returns>
    [HttpPut("items/{itemId:guid}")]
    public async Task<ActionResult<ApiResponse<DiaryItemDto>>> UpdateItem(Guid itemId, [FromBody] UpdateDiaryItemRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<DiaryItemDto>();

        return this.ToActionResult(await _diaryService.UpdateDiaryItemAsync(userId, itemId, dto));
    }

    /// <summary>
    /// Xóa một món ăn đã ghi khỏi nhật ký dinh dưỡng:
    /// Sau khi xóa, lượng Calo và các chỉ số dinh dưỡng của ngày tương ứng sẽ tự động được khấu trừ.
    /// </summary>
    /// <param name="itemId">Mã định danh duy nhất của mục nhật ký cần xóa.</param>
    /// <returns>True nếu xóa thành công.</returns>
    [HttpDelete("items/{itemId:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteItem(Guid itemId)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<bool>();

        return this.ToActionResult(await _diaryService.DeleteDiaryItemAsync(userId, itemId));
    }

    /// <summary>
    /// Ghi nhận một lần uống nước (Water Intake) vào nhật ký:
    /// - Tiếp nhận lượng nước uống (ml, ví dụ: 250ml, 500ml) và thời điểm uống.
    /// - Tự động cộng dồn vào tổng lượng nước uống trong ngày và so sánh với mục tiêu khuyến nghị.
    /// - Trả về mã EntryId của lần uống để hỗ trợ người dùng xóa hoàn tác nếu bấm nhầm.
    /// </summary>
    /// <param name="dto">Dữ liệu lượng nước ghi nhận (ml) và thời điểm.</param>
    /// <returns>Đối tượng <see cref="WaterSummaryDto"/> phản ánh tổng lượng nước đã uống trong ngày.</returns>
    [HttpPost("water")]
    public async Task<ActionResult<ApiResponse<WaterSummaryDto>>> LogWater([FromBody] LogWaterRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<WaterSummaryDto>();

        return this.ToActionResult(await _diaryService.LogWaterAsync(userId, dto));
    }

    /// <summary>
    /// Lấy lịch sử theo dõi lượng nước uống trong N ngày gần nhất (tối đa 31 ngày) kết thúc tại ngày chỉ định:
    /// Chuỗi dữ liệu sắp xếp tăng dần theo thời gian, bao gồm cả những ngày không có ghi nhận uống nước để đảm bảo biểu đồ liên tục.
    /// </summary>
    /// <param name="date">Ngày kết thúc mốc báo cáo (yyyy-MM-dd); mặc định là ngày hôm nay.</param>
    /// <param name="days">Số ngày muốn trích xuất dữ liệu (từ 1 đến 31 ngày; mặc định là 1 ngày).</param>
    /// <returns>Đối tượng <see cref="WaterHistoryDto"/> tóm tắt lịch sử nước uống.</returns>
    [HttpGet("water")]
    public async Task<ActionResult<ApiResponse<WaterHistoryDto>>> GetWater(
        [FromQuery] DateOnly? date,
        [FromQuery][Range(1, 31, ErrorMessage = "days phải từ 1 đến 31.")] int days = 1)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<WaterHistoryDto>();

        var endDate = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        return this.ToActionResult(await _diaryService.GetWaterHistoryAsync(userId, endDate, days));
    }

    /// <summary>
    /// Xóa một lần ghi nhận uống nước theo mã định danh (EntryId):
    /// Giúp người dùng hủy bỏ lần bấm nhầm và khấu trừ lượng nước tương ứng khỏi tổng số trong ngày.
    /// </summary>
    /// <param name="entryId">Mã định danh duy nhất (GUID) của lần uống nước cần xóa.</param>
    /// <returns>Đối tượng <see cref="WaterSummaryDto"/> cập nhật lại tổng lượng nước sau khi xóa.</returns>
    [HttpDelete("water/{entryId:guid}")]
    public async Task<ActionResult<ApiResponse<WaterSummaryDto>>> DeleteWater(Guid entryId)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<WaterSummaryDto>();

        return this.ToActionResult(await _diaryService.DeleteWaterEntryAsync(userId, entryId));
    }
}
