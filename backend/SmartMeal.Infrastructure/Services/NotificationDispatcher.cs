using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Logging;
using SmartMeal.Application.DTOs.Notifications;
using SmartMeal.Application.Services;

namespace SmartMeal.Infrastructure.Services;

/// <summary>
/// Đẩy thông báo vừa ghi tới app (real-time) chỉ khi nó đã thật sự nằm trong database: ghi ngoài transaction thì gửi ngay; ghi
/// trong transaction (vd. lên cấp cùng lúc cộng XP) thì giữ lại tới khi commit, rollback thì bỏ — app không bao giờ nhận thông
/// báo không tồn tại. Mỗi DbContext (scoped) có một instance, gắn vào DbContext dưới dạng interceptor để biết lúc transaction
/// kết thúc (chỉ theo dõi API async — toàn bộ app dùng async). Lỗi gửi chỉ ghi log: real-time là kênh phụ, thao tác chính không
/// được hỏng vì nó.
/// </summary>
public sealed class NotificationDispatcher : DbTransactionInterceptor
{
    private readonly INotificationPublisher _publisher;
    private readonly ILogger<NotificationDispatcher> _logger;
    private readonly List<(Guid UserId, NotificationDto Notification)> _afterCommit = new();

    public NotificationDispatcher(INotificationPublisher publisher, ILogger<NotificationDispatcher> logger)
    {
        _publisher = publisher;
        _logger = logger;
    }

    public Task DispatchAsync(DatabaseFacade database, Guid userId, NotificationDto notification)
    {
        if (database.CurrentTransaction is null) return PublishAsync(userId, notification);

        _afterCommit.Add((userId, notification));
        return Task.CompletedTask;
    }

    public override async Task TransactionCommittedAsync(
        DbTransaction transaction, TransactionEndEventData eventData, CancellationToken cancellationToken = default)
    {
        var committed = _afterCommit.ToList();
        _afterCommit.Clear();
        foreach (var (userId, notification) in committed)
        {
            await PublishAsync(userId, notification);
        }
    }

    public override Task TransactionRolledBackAsync(
        DbTransaction transaction, TransactionEndEventData eventData, CancellationToken cancellationToken = default)
    {
        _afterCommit.Clear();
        return Task.CompletedTask;
    }

    public override Task TransactionFailedAsync(
        DbTransaction transaction, TransactionErrorEventData eventData, CancellationToken cancellationToken = default)
    {
        _afterCommit.Clear();
        return Task.CompletedTask;
    }

    // Transaction bị dispose khi chưa commit (rollback ngầm vì exception) không phát sự kiện nào: transaction kế tiếp bắt đầu
    // nghĩa là những thông báo còn giữ thuộc về transaction đã bị hủy.
    public override ValueTask<DbTransaction> TransactionStartedAsync(
        DbConnection connection, TransactionEndEventData eventData, DbTransaction result, CancellationToken cancellationToken = default)
    {
        _afterCommit.Clear();
        return ValueTask.FromResult(result);
    }

    private async Task PublishAsync(Guid userId, NotificationDto notification)
    {
        try
        {
            await _publisher.PublishAsync(userId, notification);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Real-time push of notification {NotificationId} to user {UserId} failed.", notification.Id, userId);
        }
    }
}
