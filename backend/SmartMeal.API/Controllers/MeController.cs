using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.API.Infrastructure;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Auth;
using SmartMeal.Application.Services;

namespace SmartMeal.API.Controllers;

/// <summary>
/// Controller xử lý các quyền riêng tư dữ liệu cá nhân của người dùng hiện tại (GDPR / Privacy Compliance):
/// - Xóa sạch dữ liệu hoạt động cá nhân (Nhật ký ăn uống, lượng nước uống, hồ sơ thể trạng, thực đơn, đi chợ, thành tựu gamification).
/// - Giữ lại tài khoản người dùng và bảo lưu lịch sử giao dịch hóa đơn thanh toán phục vụ đối soát kế toán (BR-271).
/// Yêu cầu xác thực tài khoản qua Bearer Token.
/// </summary>
[Authorize]
[ApiController]
[Route("api/me")]
public class MeController : ControllerBase
{
    private readonly IAccountService _accountService;

    /// <summary>
    /// Khởi tạo instance mới của <see cref="MeController"/>.
    /// </summary>
    /// <param name="accountService">Dịch vụ quản trị tài khoản và xử lý dọn dẹp dữ liệu người dùng.</param>
    public MeController(IAccountService accountService)
    {
        _accountService = accountService;
    }

    /// <summary>
    /// Xóa toàn bộ dữ liệu hoạt động cá nhân của người dùng nhưng vẫn giữ lại tài khoản để tiếp tục sử dụng:
    /// - Dữ liệu bị xóa gồm: Nhật ký bữa ăn, nhật ký uống nước, hồ sơ sức khỏe và lịch sử cân nặng, kế hoạch thực đơn tuần, danh sách đi chợ, món ăn yêu thích, tiến trình thú cưng và các thử thách.
    /// - Dữ liệu được bảo lưu: Tài khoản đăng nhập (Email/Password hoặc Google ID) và lịch sử giao dịch thanh toán gói Pro (PaymentTransactions) theo quy định kiểm toán và BR-271.
    /// </summary>
    /// <returns>Đối tượng <see cref="DeleteDataResultDto"/> chứa báo cáo số lượng bản ghi đã được dọn dẹp ở từng bảng.</returns>
    [HttpDelete("data")]
    public async Task<ActionResult<ApiResponse<DeleteDataResultDto>>> DeleteMyData()
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<DeleteDataResultDto>();

        return this.ToActionResult(await _accountService.DeleteMyDataAsync(userId));
    }
}
