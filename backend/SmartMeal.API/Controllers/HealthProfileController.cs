using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.API.Infrastructure;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Health;
using SmartMeal.Application.Services;

namespace SmartMeal.API.Controllers;

/// <summary>
/// Controller quản lý hồ sơ sức khỏe cá nhân (Health Profile) và theo dõi thể trạng:
/// - Khảo sát sức khỏe ban đầu (Onboarding Health Survey): thu thập chỉ số nhân trắc học, mục tiêu cân nặng, mức độ vận động.
/// - Tự động tính toán các chỉ số sinh học: BMI, BMR (Mifflin-St Jeor), TDEE và nhu cầu Calo/Macro khuyến nghị.
/// - Ghi nhận bệnh lý nền, tiền sử dị ứng thực phẩm và chế độ ăn kiêng cá nhân hóa.
/// - Ghi chép nhật ký cân nặng (Weight Log) và biểu đồ biến thiên cân nặng theo thời gian.
/// Yêu cầu xác thực tài khoản người dùng cho toàn bộ API.
/// </summary>
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class HealthProfileController : ControllerBase
{
    private readonly IHealthProfileService _healthProfileService;

    /// <summary>
    /// Khởi tạo instance mới của <see cref="HealthProfileController"/>.
    /// </summary>
    /// <param name="healthProfileService">Dịch vụ quản trị hồ sơ sức khỏe và thuật toán tính toán dinh dưỡng sinh học.</param>
    public HealthProfileController(IHealthProfileService healthProfileService)
    {
        _healthProfileService = healthProfileService;
    }

    /// <summary>
    /// Nộp kết quả khảo sát sức khỏe ban đầu (Health Onboarding Survey):
    /// - Khởi tạo hoặc ghi đè toàn bộ thông tin hồ sơ sức khỏe người dùng.
    /// - Thu thập chiều cao, cân nặng hiện tại, cân nặng mục tiêu, ngày sinh (hoặc tuổi), giới tính, mức độ vận động, bệnh lý nền và dị ứng.
    /// - Tự động tính toán các chỉ số BMR, TDEE và thiết lập mục tiêu Calories / Macros (Carbs, Protein, Fat) hàng ngày.
    /// Hỗ trợ các route bí danh: /api/healthprofile/survey, /setup, hoặc POST trực tiếp /api/healthprofile.
    /// </summary>
    /// <param name="dto">Dữ liệu khảo sát toàn diện của người dùng.</param>
    /// <returns>Đối tượng <see cref="HealthProfileDto"/> hồ sơ sức khỏe vừa được thiết lập.</returns>
    [HttpPost("survey")]
    [HttpPost("setup")]
    [HttpPost]
    public async Task<ActionResult<ApiResponse<HealthProfileDto>>> SubmitSurvey([FromBody] HealthSurveyRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<HealthProfileDto>();

        return this.ToActionResult(await _healthProfileService.SubmitSurveyAsync(userId, dto));
    }

    /// <summary>
    /// Cập nhật từng phần (Partial Update) hồ sơ sức khỏe đã tồn tại:
    /// - Cho phép thay đổi mục tiêu (giảm cân, giữ cân, tăng cơ), mức độ vận động, danh sách dị ứng thực phẩm hoặc bệnh lý.
    /// - Hệ thống tự động tính toán lại chỉ số BMI, BMR, TDEE và điều chỉnh lại định mức Calories mục tiêu tương ứng.
    /// - Trả về mã lỗi 404 Not Found nếu người dùng chưa từng hoàn thành khảo sát ban đầu.
    /// </summary>
    /// <param name="dto">Dữ liệu các trường cần cập nhật.</param>
    /// <returns>Hồ sơ sức khỏe <see cref="HealthProfileDto"/> sau khi được cập nhật.</returns>
    [HttpPut]
    public async Task<ActionResult<ApiResponse<HealthProfileDto>>> UpdateProfile([FromBody] UpdateHealthProfileRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<HealthProfileDto>();

        return this.ToActionResult(await _healthProfileService.UpdateProfileAsync(userId, dto));
    }

    /// <summary>
    /// Lấy thông tin chi tiết hồ sơ sức khỏe hiện tại của người dùng đang đăng nhập:
    /// Trả về toàn bộ các chỉ số thể trạng (chiều cao, cân nặng, BMI, BMR, TDEE), mục tiêu dinh dưỡng hàng ngày,
    /// danh sách bệnh lý, dị ứng thực phẩm và sở thích ăn uống.
    /// </summary>
    /// <returns>Đối tượng <see cref="HealthProfileDto"/> chứa dữ liệu sức khỏe đầy đủ.</returns>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<HealthProfileDto>>> GetProfile()
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<HealthProfileDto>();

        return this.ToActionResult(await _healthProfileService.GetProfileAsync(userId));
    }

    /// <summary>
    /// Ghi nhận chỉ số cân nặng mới vào nhật ký theo dõi thể trạng (Log Weight):
    /// - Lưu trữ điểm dữ liệu cân nặng kèm thời điểm đo.
    /// - Tự động cập nhật cân nặng hiện tại trong hồ sơ sức khỏe chính và tính lại chỉ số BMI tức thời.
    /// </summary>
    /// <param name="dto">Dữ liệu ghi cân nặng gồm số kg cân nặng và thời gian đo.</param>
    /// <returns>Đối tượng <see cref="WeightPointDto"/> chứa điểm cân nặng vừa ghi nhận.</returns>
    [HttpPost("weight-log")]
    public async Task<ActionResult<ApiResponse<WeightPointDto>>> LogWeight([FromBody] WeightLogRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<WeightPointDto>();

        return this.ToActionResult(await _healthProfileService.LogWeightAsync(userId, dto));
    }

    /// <summary>
    /// Lấy lịch sử biến thiên cân nặng theo thời gian phục vụ vẽ biểu đồ tiến độ:
    /// Dữ liệu được sắp xếp tuần tự theo thời gian từ cũ đến mới.
    /// </summary>
    /// <param name="days">Số ngày gần nhất muốn trích xuất dữ liệu (giá trị hợp lệ từ 1 đến 3650 ngày). Nếu null sẽ lấy toàn bộ lịch sử.</param>
    /// <returns>Đối tượng <see cref="WeightHistoryResponseDto"/> chứa danh sách các điểm đo cân nặng và thống kê mức tăng/giảm.</returns>
    [HttpGet("weight-history")]
    public async Task<ActionResult<ApiResponse<WeightHistoryResponseDto>>> GetWeightHistory([FromQuery] int? days)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<WeightHistoryResponseDto>();
        if (days is < 1 or > 3650)
        {
            return BadRequest(ApiResponse<WeightHistoryResponseDto>.Fail("days phải từ 1 đến 3650."));
        }

        return this.ToActionResult(await _healthProfileService.GetWeightHistoryAsync(userId, days));
    }
}
