using System.Net;
using System.Net.Mail;
using System.Text;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SmartMeal.Application.Services;
using SmartMeal.Infrastructure.Options;

namespace SmartMeal.Infrastructure.Services;

/// <summary>Gửi email thật qua SMTP (cấu hình ở mục "Smtp").</summary>
public sealed class SmtpEmailSender : IEmailSender
{
    private readonly SmtpOptions _options;

    public SmtpEmailSender(IOptions<SmtpOptions> options)
    {
        _options = options.Value;
    }

    public async Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        using var client = new SmtpClient(_options.Host, _options.Port)
        {
            EnableSsl = _options.EnableSsl,
            DeliveryMethod = SmtpDeliveryMethod.Network
        };

        if (!string.IsNullOrWhiteSpace(_options.User))
        {
            client.Credentials = new NetworkCredential(_options.User, _options.Password);
        }

        var from = new MailAddress(_options.From, _options.FromName, Encoding.UTF8);
        using var mail = new MailMessage(from, new MailAddress(message.To))
        {
            Subject = message.Subject,
            Body = message.TextBody,
            IsBodyHtml = false,
            SubjectEncoding = Encoding.UTF8,
            BodyEncoding = Encoding.UTF8
        };

        await client.SendMailAsync(mail, cancellationToken);
    }
}

/// <summary>
/// Dùng khi chưa cấu hình SMTP: không gửi gì. Ở Development ghi nội dung email (có mã OTP) ra log để thử luồng
/// mà không cần máy chủ mail; môi trường khác chỉ cảnh báo, tuyệt đối không ghi mã OTP.
/// </summary>
public sealed class LogOnlyEmailSender : IEmailSender
{
    private readonly ILogger<LogOnlyEmailSender> _logger;
    private readonly IHostEnvironment _environment;

    public LogOnlyEmailSender(ILogger<LogOnlyEmailSender> logger, IHostEnvironment environment)
    {
        _logger = logger;
        _environment = environment;
    }

    public Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        if (_environment.IsDevelopment())
        {
            _logger.LogInformation("[DEV EMAIL - SMTP chưa cấu hình] To: {To} | Subject: {Subject}\n{Body}", message.To, message.Subject, message.TextBody);
        }
        else
        {
            _logger.LogWarning("SMTP chưa được cấu hình (mục Smtp) nên email tới {To} ('{Subject}') không được gửi.", message.To, message.Subject);
        }

        return Task.CompletedTask;
    }
}
