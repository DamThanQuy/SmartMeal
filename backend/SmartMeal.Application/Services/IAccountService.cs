using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Auth;

namespace SmartMeal.Application.Services;

/// <summary>Ảnh đại diện, xóa dữ liệu cá nhân và xóa tài khoản (BR-271).</summary>
public interface IAccountService
{
    /// <summary>Lưu ảnh đại diện (đã kiểm tra loại file bằng nội dung, không tin tên/Content-Type) và cập nhật người dùng.</summary>
    Task<ApiResponse<UserDto>> UploadAvatarAsync(Guid userId, Stream content, long length, string publicBaseUrl);

    /// <summary>
    /// Xóa dữ liệu cá nhân nhưng giữ tài khoản: nhật ký, nước, hồ sơ sức khỏe + cân nặng, thực đơn, danh sách đi chợ,
    /// yêu thích/bộ sưu tập, tiến độ pet/thử thách. Giữ lịch sử giao dịch thanh toán.
    /// </summary>
    Task<ApiResponse<DeleteDataResultDto>> DeleteMyDataAsync(Guid userId);

    /// <summary>Xóa vĩnh viễn tài khoản và mọi dữ liệu (trừ lịch sử giao dịch thanh toán, được ẩn danh và giữ lại).</summary>
    Task<ApiResponse<bool>> DeleteAccountAsync(Guid userId, DeleteAccountRequestDto dto);
}
