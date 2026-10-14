using Google.Apis.Auth;
using Google;
using Microsoft.Extensions.Configuration;
using SmartMeal.Application.Services;

namespace SmartMeal.Infrastructure.Services;

public sealed class GoogleIdTokenValidator : IGoogleIdTokenValidator
{
    private readonly IConfiguration _configuration;

    public GoogleIdTokenValidator(IConfiguration configuration) => _configuration = configuration;

    public async Task<GoogleIdentity> ValidateAsync(string idToken, CancellationToken cancellationToken = default)
    {
        var clientId = _configuration["Google:ClientId"];
        if (string.IsNullOrWhiteSpace(clientId))
            clientId = _configuration["GOOGLE_CLIENT_ID"];

        if (string.IsNullOrWhiteSpace(clientId))
            throw new GoogleAuthException(503, "Google Sign-In hiện chưa được cấu hình.");

        if (string.IsNullOrWhiteSpace(idToken))
            throw new GoogleAuthException(400, "Google ID token là bắt buộc.");

        try
        {
            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new[] { clientId.Trim() }
            });

            if (string.IsNullOrWhiteSpace(payload.Subject) || string.IsNullOrWhiteSpace(payload.Email))
                throw new GoogleAuthException(401, "Google ID token không chứa danh tính hợp lệ.");

            return new GoogleIdentity(
                payload.Subject,
                payload.Email,
                string.IsNullOrWhiteSpace(payload.Name) ? payload.Email : payload.Name,
                payload.Picture,
                payload.EmailVerified);
        }
        catch (GoogleAuthException)
        {
            throw;
        }
        catch (InvalidJwtException ex)
        {
            throw new GoogleAuthException(401, "Google ID token không hợp lệ hoặc đã hết hạn.", ex);
        }
        catch (HttpRequestException ex)
        {
            throw new GoogleAuthException(503, "Không thể xác minh Google ID token lúc này.", ex);
        }
        catch (GoogleApiException ex)
        {
            throw new GoogleAuthException(503, "Dịch vụ xác minh Google tạm thời không khả dụng.", ex);
        }
    }
}