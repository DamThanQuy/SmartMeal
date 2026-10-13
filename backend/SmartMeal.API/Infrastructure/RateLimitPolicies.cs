namespace SmartMeal.API.Infrastructure;

/// <summary>Tên các chính sách giới hạn tần suất (cấu hình ở Program.cs).</summary>
public static class RateLimitPolicies
{
    /// <summary>Đăng ký/đăng nhập/làm mới token/OTP: giới hạn theo IP để chống dò mật khẩu và spam.</summary>
    public const string Auth = "auth";
}
