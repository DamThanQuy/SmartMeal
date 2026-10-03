using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Auth;

namespace SmartMeal.Application.Services;

/// <summary>Quên / xác minh OTP / đặt lại mật khẩu. Các hàm gửi OTP luôn trả thành công để không lộ email nào đã đăng ký.</summary>
public interface IPasswordService
{
    Task<ApiResponse<bool>> ForgotPasswordAsync(ForgotPasswordRequestDto dto);
    Task<ApiResponse<bool>> ResendOtpAsync(ResendOtpRequestDto dto);
    Task<ApiResponse<VerifyOtpResponseDto>> VerifyOtpAsync(VerifyOtpRequestDto dto);
    Task<ApiResponse<bool>> ResetPasswordAsync(ResetPasswordRequestDto dto);
}
