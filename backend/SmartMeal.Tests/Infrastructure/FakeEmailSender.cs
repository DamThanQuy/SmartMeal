using System.Collections.Concurrent;
using System.Text.RegularExpressions;
using SmartMeal.Application.Services;

namespace SmartMeal.Tests.Infrastructure;

/// <summary>Thay bộ gửi email thật trong test: giữ lại các email đã "gửi" để đọc mã OTP.</summary>
public sealed partial class FakeEmailSender : IEmailSender
{
    private readonly ConcurrentQueue<EmailMessage> _sent = new();

    public IReadOnlyList<EmailMessage> Sent => _sent.ToArray();

    public Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        _sent.Enqueue(message);
        return Task.CompletedTask;
    }

    public IReadOnlyList<EmailMessage> To(string email) =>
        Sent.Where(m => string.Equals(m.To, email, StringComparison.OrdinalIgnoreCase)).ToList();

    /// <summary>Mã 6 số trong email gần nhất gửi tới địa chỉ này; null nếu chưa có email nào.</summary>
    public string? LastCodeFor(string email)
    {
        var last = To(email).LastOrDefault();
        return last is null ? null : SixDigits().Match(last.TextBody).Value;
    }

    [GeneratedRegex(@"\b\d{6}\b")]
    private static partial Regex SixDigits();
}
