using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace SmartMeal.API.Hubs;

/// <summary>
/// Kênh real-time của thông báo trong ứng dụng (SignalR qua WebSocket). App mở kết nối khi đã đăng nhập; mỗi khi server tạo một
/// thông báo mới cho người dùng (lên cấp, huy hiệu, thử thách, danh sách đi chợ, gói Pro), sự kiện <see cref="NotificationMethod"/>
/// với payload là <c>NotificationDto</c> được đẩy tới mọi thiết bị đang kết nối của đúng người đó. Client chỉ nghe, không gọi
/// method nào lên hub. WebSocket không gửi được header nên token đi qua query <c>access_token</c> — chỉ được chấp nhận ở đường dẫn
/// này (Program.cs).
/// </summary>
[Authorize]
public sealed class NotificationsHub : Hub
{
    public const string Path = "/api/hubs/notifications";

    /// <summary>Tên sự kiện server → app khi có thông báo mới.</summary>
    public const string NotificationMethod = "notification";
}
