using SmartMeal.Application.Common.Models;

namespace SmartMeal.API.Infrastructure;

/// <summary>Ghi lỗi dưới dạng envelope <c>ApiResponse</c> chuẩn cho mọi nơi không đi qua controller (401, 403, 404, 500...).</summary>
public static class ApiErrorWriter
{
    public static async Task WriteAsync(HttpContext context, int statusCode, string message, List<string>? errors = null)
    {
        if (context.Response.HasStarted)
        {
            return;
        }

        // Không Clear(): giữ header đã đặt trước đó (vd. WWW-Authenticate). UseExceptionHandler đã tự reset response.
        context.Response.StatusCode = statusCode;
        await context.Response.WriteAsJsonAsync(ApiResponse<object>.Fail(message, errors));
    }

    /// <summary>Thông điệp mặc định (tiếng Việt) theo HTTP status.</summary>
    public static string DefaultMessage(int statusCode) => statusCode switch
    {
        StatusCodes.Status400BadRequest => "Yêu cầu không hợp lệ.",
        StatusCodes.Status401Unauthorized => "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
        StatusCodes.Status403Forbidden => "Bạn không có quyền thực hiện thao tác này.",
        StatusCodes.Status404NotFound => "Không tìm thấy tài nguyên yêu cầu.",
        StatusCodes.Status405MethodNotAllowed => "Phương thức HTTP không được hỗ trợ cho đường dẫn này.",
        StatusCodes.Status409Conflict => "Dữ liệu xung đột với trạng thái hiện tại.",
        StatusCodes.Status413PayloadTooLarge => "Dữ liệu gửi lên quá lớn.",
        StatusCodes.Status415UnsupportedMediaType => "Định dạng nội dung không được hỗ trợ (cần application/json hoặc multipart/form-data).",
        StatusCodes.Status423Locked => "Tài khoản đang bị khóa tạm thời.",
        StatusCodes.Status429TooManyRequests => "Bạn thao tác quá nhanh, vui lòng thử lại sau.",
        >= 500 => "Máy chủ gặp sự cố, vui lòng thử lại sau.",
        _ => "Yêu cầu không thành công."
    };
}
