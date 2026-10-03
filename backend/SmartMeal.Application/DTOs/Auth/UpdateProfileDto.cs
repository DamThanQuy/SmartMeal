using System.ComponentModel.DataAnnotations;

namespace SmartMeal.Application.DTOs.Auth;

public class UpdateProfileRequestDto
{
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Họ tên phải từ 2 đến 100 ký tự.")]
    public string? FullName { get; set; }

    [StringLength(500, ErrorMessage = "Đường dẫn ảnh đại diện tối đa 500 ký tự.")]
    public string? AvatarUrl { get; set; }
}
