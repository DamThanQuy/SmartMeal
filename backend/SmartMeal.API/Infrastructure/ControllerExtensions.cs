using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using SmartMeal.Application.Common.Models;

namespace SmartMeal.API.Infrastructure;

public static class ControllerExtensions
{
    /// <summary>Lấy id người dùng từ claim của JWT.</summary>
    public static bool TryGetUserId(this ControllerBase controller, out Guid userId) =>
        Guid.TryParse(controller.User.FindFirstValue(ClaimTypes.NameIdentifier), out userId);

    /// <summary>Phản hồi 401 theo envelope chuẩn khi token thiếu claim người dùng hợp lệ.</summary>
    public static ActionResult<ApiResponse<T>> InvalidSession<T>(this ControllerBase controller) =>
        controller.Unauthorized(ApiResponse<T>.Fail("Phiên đăng nhập không hợp lệ.", null, ApiErrorKind.Unauthorized));

    /// <summary>200 khi thành công; khi thất bại trả status theo <see cref="ApiResponse{T}.ErrorKind"/> (mặc định 400).</summary>
    public static ActionResult<ApiResponse<T>> ToActionResult<T>(this ControllerBase controller, ApiResponse<T> response)
    {
        if (response.Success)
        {
            return controller.Ok(response);
        }

        var status = response.ErrorKind switch
        {
            ApiErrorKind.Unauthorized => StatusCodes.Status401Unauthorized,
            ApiErrorKind.Forbidden => StatusCodes.Status403Forbidden,
            ApiErrorKind.NotFound => StatusCodes.Status404NotFound,
            ApiErrorKind.Conflict => StatusCodes.Status409Conflict,
            ApiErrorKind.Locked => StatusCodes.Status423Locked,
            ApiErrorKind.TooManyRequests => StatusCodes.Status429TooManyRequests,
            ApiErrorKind.Unavailable => StatusCodes.Status503ServiceUnavailable,
            ApiErrorKind.UpstreamFailure => StatusCodes.Status502BadGateway,
            _ => StatusCodes.Status400BadRequest
        };

        return controller.StatusCode(status, response);
    }
}
