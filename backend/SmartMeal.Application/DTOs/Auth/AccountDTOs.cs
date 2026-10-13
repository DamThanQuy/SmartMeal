using System.ComponentModel.DataAnnotations;

namespace SmartMeal.Application.DTOs.Auth;

/// <summary>Xóa tài khoản: tài khoản có mật khẩu gửi <c>password</c>; tài khoản chỉ đăng nhập Google gửi <c>confirmEmail</c> (đúng email của mình).</summary>
public class DeleteAccountRequestDto
{
    [StringLength(128)]
    public string? Password { get; set; }

    [StringLength(254)]
    public string? ConfirmEmail { get; set; }
}

/// <summary>Kết quả xóa dữ liệu cá nhân: số bản ghi đã xóa theo từng nhóm.</summary>
public class DeleteDataResultDto
{
    public Dictionary<string, int> Deleted { get; set; } = new();
}
