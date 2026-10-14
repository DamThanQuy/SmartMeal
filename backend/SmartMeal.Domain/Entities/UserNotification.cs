namespace SmartMeal.Domain.Entities;

/// <summary>
/// Thông báo trong ứng dụng, do server tạo từ sự kiện thật (lên cấp, mở huy hiệu, hoàn thành thử thách, danh sách đi chợ,
/// gói Pro). <see cref="DedupKey"/> duy nhất theo người dùng nên cùng một sự kiện chỉ tạo một thông báo dù được đánh giá
/// lại nhiều lần hay đồng thời.
/// </summary>
public class UserNotification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    /// <summary>Nhóm để app chọn biểu tượng/màn đích: xem <c>NotificationCategories</c>.</summary>
    public string Category { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;

    /// <summary>Khóa của sự kiện gốc, vd. <c>level-3</c>, <c>badge-streak-7</c>.</summary>
    public string DedupKey { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }
}
