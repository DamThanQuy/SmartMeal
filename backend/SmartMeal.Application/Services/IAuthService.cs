using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Auth;

namespace SmartMeal.Application.Services;

public interface IAuthService
{
    Task<ApiResponse<AuthResponseDto>> RegisterAsync(RegisterRequestDto dto);
    Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginRequestDto dto);
    Task<ApiResponse<AuthResponseDto>> GoogleLoginAsync(GoogleLoginRequestDto dto);
    Task<ApiResponse<AuthResponseDto>> RefreshAsync(RefreshTokenRequestDto dto);
    Task<ApiResponse<bool>> LogoutAsync(string? refreshToken);
    Task<ApiResponse<UserDto>> GetCurrentUserAsync(Guid userId);
    Task<ApiResponse<UserDto>> UpdateProfileAsync(Guid userId, UpdateProfileRequestDto dto);

    /// <summary>Đổi mật khẩu: thu hồi mọi phiên cũ và trả cặp token mới cho phiên hiện tại.</summary>
    Task<ApiResponse<AuthResponseDto>> ChangePasswordAsync(Guid userId, ChangePasswordRequestDto dto);
}
