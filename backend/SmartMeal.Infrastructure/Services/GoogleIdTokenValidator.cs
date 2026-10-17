using Google;
using Google.Apis.Auth;
using Microsoft.Extensions.Configuration;
using SmartMeal.Application.Services;

namespace SmartMeal.Infrastructure.Services;

/// <summary>
/// Cài đặt dịch vụ xác thực danh tính Google ID Token (<see cref="IGoogleIdTokenValidator"/>):
/// Sử dụng thư viện chính thức Google.Apis.Auth để giải mã và kiểm tra chữ ký khóa công khai của Google Web Token.
/// </summary>
public sealed class GoogleIdTokenValidator : IGoogleIdTokenValidator
{
    private readonly IConfiguration _configuration;

    /// <summary>
    /// Khởi tạo instance mới của <see cref="GoogleIdTokenValidator"/>.
    /// </summary>
    /// <param name="configuration">Cấu hình ứng dụng dùng để lấy Google ClientId.</param>
    public GoogleIdTokenValidator(IConfiguration configuration) => _configuration = configuration;

    /// <summary>
    /// Xác minh tính hợp lệ của chuỗi Google ID Token nhận được từ client SDK:
    /// - Kiểm tra ClientId đã được cấu hình trong hệ thống.
    /// - Gọi hàm <see cref="GoogleJsonWebSignature.ValidateAsync"/> để kiểm tra Audience, tính toàn vẹn và chữ ký của Google.
    /// - Kiểm tra cờ EmailVerified và bóc tách các thông tin hồ sơ: Google Subject ID, Email, Họ tên và Avatar URL.
    /// - Ném <see cref="GoogleAuthException"/> tương ứng với mã lỗi HTTP khi token sai, hết hạn hoặc dịch vụ Google gặp sự cố.
    /// </summary>
    /// <param name="idToken">Chuỗi JWT ID Token của Google.</param>
    /// <param name="cancellationToken">CancellationToken hủy tác vụ bất đồng bộ.</param>
    /// <returns>Đối tượng <see cref="GoogleIdentity"/> chứa thông tin danh tính người dùng Google.</returns>
    /// <exception cref="GoogleAuthException">Ném ra khi token không hợp lệ, thiếu ClientId hoặc kết nối Google bị lỗi.</exception>
    public async Task<GoogleIdentity> ValidateAsync(string idToken, CancellationToken cancellationToken = default)
    {
        var clientId = _configuration["Google:ClientId"] ?? _configuration["GOOGLE_CLIENT_ID"];
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

            if (string.IsNullOrWhiteSpace(payload.Subject) || string.IsNullOrWhiteSpace(payload.Email) || !payload.EmailVerified)
                throw new GoogleAuthException(401, "Google ID token không chứa email đã xác minh hợp lệ.");

            return new GoogleIdentity(payload.Subject, payload.Email, string.IsNullOrWhiteSpace(payload.Name) ? payload.Email : payload.Name,
                payload.Picture, payload.EmailVerified);
        }
        catch (GoogleAuthException) { throw; }
        catch (InvalidJwtException ex) { throw new GoogleAuthException(401, "Google ID token không hợp lệ hoặc đã hết hạn.", ex); }
        catch (HttpRequestException ex) { throw new GoogleAuthException(503, "Không thể xác minh Google ID token lúc này.", ex); }
        catch (GoogleApiException ex) { throw new GoogleAuthException(503, "Dịch vụ xác minh Google tạm thời không khả dụng.", ex); }
    }
}
