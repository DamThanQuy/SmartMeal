namespace SmartMeal.Application.DTOs.Notifications;

public class NotificationDto
{
    public Guid Id { get; set; }

    /// <summary>pet | badge | challenge | grocery | premium — app chọn biểu tượng và màn đích theo nhóm này.</summary>
    public string Category { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;

    /// <summary>Thời điểm tạo (UTC).</summary>
    public DateTime CreatedAt { get; set; }

    public bool IsRead { get; set; }
}

public class NotificationListDto
{
    /// <summary>Mới → cũ.</summary>
    public List<NotificationDto> Items { get; set; } = new();

    /// <summary>Số thông báo chưa đọc (toàn bộ, không chỉ trong trang này).</summary>
    public int UnreadCount { get; set; }
}

public class MarkAllNotificationsReadResultDto
{
    /// <summary>Số thông báo vừa được đánh dấu đã đọc.</summary>
    public int Updated { get; set; }
}
