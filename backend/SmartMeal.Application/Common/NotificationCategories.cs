namespace SmartMeal.Application.Common;

/// <summary>Nhóm thông báo — app dựa vào đây để chọn biểu tượng và màn đích khi người dùng bấm.</summary>
public static class NotificationCategories
{
    /// <summary>Bé Mầm lên cấp (mở màn Pet).</summary>
    public const string Pet = "pet";

    /// <summary>Mở khóa huy hiệu (màn Huy hiệu).</summary>
    public const string Badge = "badge";

    /// <summary>Hoàn thành thử thách (màn Thử thách).</summary>
    public const string Challenge = "challenge";

    /// <summary>Danh sách đi chợ đã tạo từ thực đơn (màn Đi chợ).</summary>
    public const string Grocery = "grocery";

    /// <summary>Gói Pro: kích hoạt, sắp hết hạn (màn Gói của tôi).</summary>
    public const string Premium = "premium";
}
