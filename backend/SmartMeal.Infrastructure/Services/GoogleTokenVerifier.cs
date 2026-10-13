using Google.Apis.Auth;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SmartMeal.Application.Services;

namespace SmartMeal.Infrastructure.Services;

/// <summary>
/// Xác minh Google ID token bằng chữ ký công khai của Google, kiểm tra audience thuộc <c>Google:ClientIds</c>
/// (danh sách phân tách bằng dấu phẩy: web / Android / iOS) và hạn dùng. Chưa cấu hình thì tắt đăng nhập Google.
/// </summary>
public sealed class GoogleTokenVerifier : IGoogleTokenVerifier
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<GoogleTokenVerifier> _logger;

    public GoogleTokenVerifier(IConfiguration configuration, ILogger<GoogleTokenVerifier> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public bool IsConfigured => ClientIds().Length > 0;

    public async Task<GoogleIdentity?> VerifyAsync(string idToken, CancellationToken cancellationToken = default)
    {
        var clientIds = ClientIds();
        if (clientIds.Length == 0 || string.IsNullOrWhiteSpace(idToken))
        {
            return null;
        }

        try
        {
            var payload = await GoogleJsonWebSignature.ValidateAsync(
                idToken,
                new GoogleJsonWebSignature.ValidationSettings { Audience = clientIds });

            return new GoogleIdentity(payload.Subject, payload.Email, payload.EmailVerified, payload.Name, payload.Picture);
        }
        catch (InvalidJwtException ex)
        {
            _logger.LogWarning("Google ID token rejected: {Reason}", ex.Message);
            return null;
        }
    }

    private string[] ClientIds() =>
        (_configuration["Google:ClientIds"] ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}
