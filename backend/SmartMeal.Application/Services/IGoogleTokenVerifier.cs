namespace SmartMeal.Application.Services;

/// <summary>Danh tính đã được Google xác nhận qua ID token.</summary>
public sealed record GoogleIdentity(string Subject, string Email, bool EmailVerified, string? Name, string? PictureUrl);

/// <summary>Xác minh Google ID token phía server (chữ ký, audience, hạn dùng).</summary>
public interface IGoogleTokenVerifier
{
    /// <summary>False khi chưa cấu hình Google:ClientIds — khi đó đăng nhập Google bị tắt (fail closed).</summary>
    bool IsConfigured { get; }

    /// <summary>Trả danh tính nếu token hợp lệ cho một trong các client id đã cấu hình, ngược lại null.</summary>
    Task<GoogleIdentity?> VerifyAsync(string idToken, CancellationToken cancellationToken = default);
}
