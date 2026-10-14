namespace SmartMeal.Application.Services;

public sealed record EmailMessage(string To, string Subject, string TextBody);

/// <summary>Gửi email giao dịch (OTP...). Cấu hình SMTP ở mục "Smtp"; chưa cấu hình thì chỉ ghi log.</summary>
public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default);
}
