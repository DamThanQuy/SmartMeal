using Microsoft.AspNetCore.SignalR;
using SmartMeal.Application.DTOs.Notifications;
using SmartMeal.Application.Services;

namespace SmartMeal.API.Hubs;

/// <summary>Đẩy thông báo qua <see cref="NotificationsHub"/> tới mọi kết nối của người dùng (SignalR nhận diện theo claim NameIdentifier).</summary>
public sealed class SignalRNotificationPublisher : INotificationPublisher
{
    private readonly IHubContext<NotificationsHub> _hub;

    public SignalRNotificationPublisher(IHubContext<NotificationsHub> hub)
    {
        _hub = hub;
    }

    public Task PublishAsync(Guid userId, NotificationDto notification, CancellationToken cancellationToken = default) =>
        _hub.Clients.User(userId.ToString()).SendAsync(NotificationsHub.NotificationMethod, notification, cancellationToken);
}
