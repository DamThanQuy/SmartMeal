using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.API.Infrastructure;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.HealthSync;
using SmartMeal.Application.Services;

namespace SmartMeal.API.Controllers;

/// <summary>
/// Controller xử lý đồng bộ dữ liệu sức khỏe và thể chất từ các thiết bị và nền tảng theo dõi sức khỏe:
/// - Tích hợp và đồng bộ số bước chân (Steps) và lượng Calo tiêu hao do vận động (Active Burned Calories) từ Apple Health, Google Fit / Health Connect.
/// - Cung cấp báo cáo tổng hợp chỉ số vận động trong ngày phục vụ tính toán cán cân năng lượng (Energy Balance: Calo nạp vào vs Calo tiêu hao).
/// Yêu cầu xác thực tài khoản người dùng cho toàn bộ API.
/// </summary>
[Authorize]
[ApiController]
[Route("api/health-sync")]
public class HealthSyncController : ControllerBase
{
    private readonly IHealthSyncService _healthSyncService;

    /// <summary>
    /// Khởi tạo instance mới của <see cref="HealthSyncController"/>.
    /// </summary>
    /// <param name="healthSyncService">Dịch vụ xử lý đồng bộ và tổng hợp dữ liệu vận động thể chất.</param>
    public HealthSyncController(IHealthSyncService healthSyncService)
    {
        _healthSyncService = healthSyncService;
    }

    /// <summary>
    /// Đồng bộ dữ liệu số bước chân và Calo vận động tiêu hao trong ngày từ thiết bị ngoại vi:
    /// - Tiếp nhận dữ liệu từ các nguồn ứng dụng như Apple HealthKit, Google Health Connect hoặc cảm biến bước chân trên điện thoại.
    /// - Cơ chế Upsert mang tính Idempotent: Nếu gửi lại cùng một cặp (Ngày, Nguồn đồng bộ), hệ thống sẽ cập nhật ghi đè giá trị mới nhất thay vì cộng dồn sai lệch.
    /// </summary>
    /// <param name="dto">Dữ liệu đồng bộ gồm ngày, tên nguồn (Source), số bước chân và lượng Calo tiêu hao.</param>
    /// <returns>Đối tượng <see cref="SyncHealthMetricsResponseDto"/> xác nhận trạng thái đồng bộ thành công.</returns>
    [HttpPost("steps-and-calories")]
    public async Task<ActionResult<ApiResponse<SyncHealthMetricsResponseDto>>> SyncStepsAndCalories([FromBody] SyncHealthMetricsRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<SyncHealthMetricsResponseDto>();

        return this.ToActionResult(await _healthSyncService.SyncStepsAndCaloriesAsync(userId, dto));
    }

    /// <summary>
    /// Lấy báo cáo tổng hợp các chỉ số vận động thể chất trong một ngày cụ thể:
    /// - Tổng số bước chân tích lũy từ các nguồn thiết bị.
    /// - Tổng lượng Calo tiêu hao từ các hoạt động thể chất trong ngày.
    /// - So sánh với mục tiêu vận động hàng ngày để hỗ trợ tính toán cán cân Calo trong nhật ký ăn uống.
    /// </summary>
    /// <param name="date">Ngày cần lấy báo cáo (yyyy-MM-dd); nếu null sẽ mặc định lấy ngày hiện tại (UTC).</param>
    /// <returns>Đối tượng <see cref="DailyHealthSyncSummaryDto"/> tóm tắt tổng chỉ số vận động trong ngày.</returns>
    [HttpGet("daily-summary")]
    public async Task<ActionResult<ApiResponse<DailyHealthSyncSummaryDto>>> GetDailySummary([FromQuery] DateOnly? date)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<DailyHealthSyncSummaryDto>();

        var targetDate = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        return this.ToActionResult(await _healthSyncService.GetDailySummaryAsync(userId, targetDate));
    }
}
