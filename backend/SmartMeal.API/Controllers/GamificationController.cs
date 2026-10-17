using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.API.Infrastructure;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Gamification;
using SmartMeal.Application.Services;

namespace SmartMeal.API.Controllers;

/// <summary>
/// Controller quản lý hệ thống Gamification (Trò chơi hóa) tạo động lực duy trì lối sống lành mạnh:
/// - Thú cưng sức khỏe (Health Pet): Quản lý cấp độ (Level), điểm kinh nghiệm (XP), nhiệm vụ hàng ngày và tâm trạng thú cưng.
/// - Chuỗi ngày liên tiếp (Streak): Theo dõi chuỗi ngày đăng nhập và ghi chép nhật ký dinh dưỡng liên tục.
/// - Thử thách dinh dưỡng (Challenges): Danh sách thử thách tuần/tháng và tiến độ tham gia.
/// - Huy hiệu và Trang phục (Badges &amp; Costumes): Mở khóa thành tựu và cá nhân hóa trang phục cho Pet.
/// Mọi endpoint đều yêu cầu xác thực người dùng.
/// </summary>
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class GamificationController : ControllerBase
{
    private readonly IGamificationService _gamificationService;

    /// <summary>
    /// Khởi tạo instance mới của <see cref="GamificationController"/>.
    /// </summary>
    /// <param name="gamificationService">Dịch vụ quản lý logic gamification, pet, nhiệm vụ và huy hiệu.</param>
    public GamificationController(IGamificationService gamificationService)
    {
        _gamificationService = gamificationService;
    }

    /// <summary>
    /// Lấy thông tin trạng thái toàn diện của thú cưng sức khỏe (Health Pet) của người dùng:
    /// - Bao gồm cấp độ hiện tại, tổng XP, phần trăm tiến trình lên cấp tiếp theo.
    /// - Danh sách các nhiệm vụ hàng ngày (Daily Quests) kèm trạng thái hoàn thành.
    /// - Khi gọi API này, hệ thống tự động kiểm tra và cộng XP cho các nhiệm vụ đã hoàn thành trong ngày (idempotent, chỉ cộng 1 lần/ngày).
    /// </summary>
    /// <param name="date">Ngày theo dõi theo múi giờ client (định dạng yyyy-MM-dd); nếu null sẽ lấy ngày hiện tại.</param>
    /// <returns>Đối tượng <see cref="HealthPetStatusDto"/> chứa trạng thái pet, cấp độ, XP và nhiệm vụ.</returns>
    [HttpGet("pet")]
    public async Task<ActionResult<ApiResponse<HealthPetStatusDto>>> GetPetStatus([FromQuery] DateOnly? date)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<HealthPetStatusDto>();
        return this.ToActionResult(await _gamificationService.GetPetStatusAsync(userId, date));
    }

    /// <summary>
    /// Lấy thông tin chuỗi ngày liên tiếp (Streak) của người dùng:
    /// - Số ngày duy trì streak hiện tại (Current Streak) và kỷ lục chuỗi ngày dài nhất (Longest Streak).
    /// - Cờ kiểm tra hôm nay đã ghi nhật ký chưa để nhắc nhở người dùng bảo vệ chuỗi ngày.
    /// </summary>
    /// <param name="date">Ngày kiểm tra theo múi giờ client (định dạng yyyy-MM-dd); mặc định là ngày hôm nay.</param>
    /// <returns>Đối tượng <see cref="StreakStatusDto"/> chứa các số liệu streak.</returns>
    [HttpGet("streak")]
    public async Task<ActionResult<ApiResponse<StreakStatusDto>>> GetStreak([FromQuery] DateOnly? date)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<StreakStatusDto>();
        return this.ToActionResult(await _gamificationService.GetStreakStatusAsync(userId, date));
    }

    /// <summary>
    /// Lấy danh sách các thử thách dinh dưỡng và lối sống lành mạnh (Challenges):
    /// - Bao gồm các thử thách đang diễn ra, thử thách đã hoàn thành và thử thách khả dụng để đăng ký.
    /// - Hiển thị tiến độ hoàn thành (phần trăm, số ngày đã thực hiện / tổng số ngày thử thách) và phần thưởng XP.
    /// </summary>
    /// <param name="date">Ngày tham chiếu theo múi giờ client (yyyy-MM-dd); mặc định là ngày hiện tại.</param>
    /// <returns>Danh sách <see cref="ChallengeDto"/> các thử thách dinh dưỡng.</returns>
    [HttpGet("challenges")]
    public async Task<ActionResult<ApiResponse<List<ChallengeDto>>>> GetChallenges([FromQuery] DateOnly? date)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<List<ChallengeDto>>();
        return this.ToActionResult(await _gamificationService.GetChallengesAsync(userId, date));
    }

    /// <summary>
    /// Đăng ký tham gia một thử thách dinh dưỡng mới:
    /// - Thiết lập mốc thời gian bắt đầu từ ngày hôm nay theo múi giờ của người dùng.
    /// - Thao tác mang tính idempotent: Nếu người dùng đã tham gia thử thách này từ trước, hệ thống trả về thông tin thử thách hiện tại mà không bị reset tiến độ.
    /// </summary>
    /// <param name="id">Mã định danh duy nhất (GUID) của thử thách cần tham gia.</param>
    /// <param name="date">Ngày bắt đầu tham gia thử thách (yyyy-MM-dd).</param>
    /// <returns>Đối tượng <see cref="ChallengeDto"/> biểu diễn thử thách kèm tiến độ khởi tạo.</returns>
    [HttpPost("challenges/{id:guid}/join")]
    public async Task<ActionResult<ApiResponse<ChallengeDto>>> JoinChallenge(Guid id, [FromQuery] DateOnly? date)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<ChallengeDto>();
        return this.ToActionResult(await _gamificationService.JoinChallengeAsync(userId, id, date));
    }

    /// <summary>
    /// Lấy bảng tổng hợp thành tựu, huy hiệu danh dự và bộ sưu tập trang phục của thú cưng:
    /// - Danh sách các huy hiệu đã mở khóa và các huy hiệu chưa đạt được kèm điều kiện mở khóa.
    /// - Danh sách trang phục (Costumes) hiện có trong tủ đồ và ID trang phục đang được trang bị trên Pet.
    /// </summary>
    /// <param name="date">Ngày tham chiếu (yyyy-MM-dd).</param>
    /// <returns>Đối tượng <see cref="BadgesSummaryDto"/> tóm tắt toàn bộ huy hiệu và trang phục.</returns>
    [HttpGet("badges")]
    public async Task<ActionResult<ApiResponse<BadgesSummaryDto>>> GetBadges([FromQuery] DateOnly? date)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<BadgesSummaryDto>();
        return this.ToActionResult(await _gamificationService.GetBadgesAsync(userId, date));
    }

    /// <summary>
    /// Trang bị một bộ trang phục (Costume) cho thú cưng sức khỏe:
    /// - Kiểm tra trang phục tồn tại và người dùng đã mở khóa hay chưa.
    /// - Trả về mã lỗi 400 Bad Request nếu trang phục chưa được mở khóa, hoặc 404 Not Found nếu mã trang phục không tồn tại.
    /// - Cập nhật diện mạo mới cho pet ngay lập tức.
    /// </summary>
    /// <param name="costumeId">Mã định danh dạng chuỗi của bộ trang phục muốn mặc.</param>
    /// <param name="date">Ngày áp dụng (yyyy-MM-dd).</param>
    /// <returns>Đối tượng <see cref="BadgesSummaryDto"/> phản ánh trạng thái trang phục mới.</returns>
    [HttpPost("costumes/{costumeId}/equip")]
    public async Task<ActionResult<ApiResponse<BadgesSummaryDto>>> EquipCostume(string costumeId, [FromQuery] DateOnly? date)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<BadgesSummaryDto>();
        return this.ToActionResult(await _gamificationService.EquipCostumeAsync(userId, costumeId, date));
    }

    /// <summary>
    /// Gỡ bỏ trang phục đang mặc trên thú cưng sức khỏe:
    /// Đưa diện mạo của thú cưng trở về trạng thái nguyên bản mặc định (không mặc trang sức/phụ kiện).
    /// </summary>
    /// <param name="date">Ngày áp dụng (yyyy-MM-dd).</param>
    /// <returns>Đối tượng <see cref="BadgesSummaryDto"/> sau khi đã tháo bỏ trang phục.</returns>
    [HttpDelete("costumes/equipped")]
    public async Task<ActionResult<ApiResponse<BadgesSummaryDto>>> UnequipCostume([FromQuery] DateOnly? date)
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<BadgesSummaryDto>();
        return this.ToActionResult(await _gamificationService.EquipCostumeAsync(userId, null, date));
    }
}
