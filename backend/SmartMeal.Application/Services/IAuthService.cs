using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Auth;

namespace SmartMeal.Application.Services;

public interface IAuthService
{
    Task<ApiResponse<AuthResponseDto>> RegisterAsync(RegisterRequestDto dto);
    Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginRequestDto dto);
    Task<ApiResponse<AuthResponseDto>> GoogleLoginAsync(GoogleAuthRequestDto dto);
    Task<ApiResponse<UserDto>> GetCurrentUserAsync(Guid userId);
}
