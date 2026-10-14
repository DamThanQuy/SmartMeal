using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.API.Infrastructure;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Auth;
using SmartMeal.Application.Services;

namespace SmartMeal.API.Controllers;

/// <summary>Thao tác trên dữ liệu cá nhân của chính người dùng đang đăng nhập.</summary>
[Authorize]
[ApiController]
[Route("api/me")]
public class MeController : ControllerBase
{
    private readonly IAccountService _accountService;

    public MeController(IAccountService accountService)
    {
        _accountService = accountService;
    }

    /// <summary>
    /// Xóa dữ liệu cá nhân (nhật ký, nước, hồ sơ sức khỏe và cân nặng, thực đơn, danh sách đi chợ, yêu thích/bộ sưu tập,
    /// pet và thử thách) nhưng giữ tài khoản. Lịch sử giao dịch thanh toán được giữ lại (BR-271).
    /// </summary>
    [HttpDelete("data")]
    public async Task<ActionResult<ApiResponse<DeleteDataResultDto>>> DeleteMyData()
    {
        if (!this.TryGetUserId(out var userId)) return this.InvalidSession<DeleteDataResultDto>();

        return this.ToActionResult(await _accountService.DeleteMyDataAsync(userId));
    }
}
