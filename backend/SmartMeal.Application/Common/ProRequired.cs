namespace SmartMeal.Application.Common;

/// <summary>Lỗi 403 khi tài khoản Free gọi tính năng chỉ dành cho Pro (BR-230/231) — app mở màn nâng cấp Pro.</summary>
public static class ProRequired
{
    public const string Code = "pro_required";
    public const string Message = "Tính năng này dành cho gói Pro. Nâng cấp Pro để sử dụng.";
}
