using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Options;

namespace SmartMeal.Infrastructure.Services;

/// <summary>
/// Đại diện cho kết quả cấp phát Access Token mới phát hành kèm thời điểm hết hạn tính theo giờ chuẩn quốc tế (UTC).
/// </summary>
/// <param name="Value">Chuỗi ký tự mã JWT Access Token đã được ký số.</param>
/// <param name="ExpiresAtUtc">Mốc thời gian UTC chính xác khi token hết hạn.</param>
public sealed record AccessToken(string Value, DateTime ExpiresAtUtc);

/// <summary>
/// Giao diện dịch vụ sinh và ký số JSON Web Token (JWT) cho người dùng hệ thống.
/// </summary>
public interface IJwtTokenService
{
    /// <summary>
    /// Tạo mới một JWT Access Token chứa các Claims nhận diện danh tính và phân quyền của người dùng:
    /// UserId (NameIdentifier), Email, Họ tên (Name), Vai trò (Role) và cờ trạng thái hội viên (isPro).
    /// </summary>
    /// <param name="user">Thực thể người dùng được cấp token.</param>
    /// <returns>Đối tượng <see cref="AccessToken"/> chứa chuỗi token và thời gian hết hạn.</returns>
    AccessToken CreateAccessToken(User user);
}

/// <summary>
/// Cài đặt dịch vụ tạo JSON Web Token (JWT) theo chuẩn mã hóa đối xứng HMAC-SHA256:
/// Sử dụng cấu hình JwtOptions (Issuer, Audience, Secret Key, AccessTokenMinutes).
/// </summary>
public class JwtTokenService : IJwtTokenService
{
    private readonly JwtOptions _options;

    /// <summary>
    /// Khởi tạo instance mới của <see cref="JwtTokenService"/>.
    /// </summary>
    /// <param name="options">Cấu hình tham số JWT.</param>
    public JwtTokenService(IOptions<JwtOptions> options)
    {
        _options = options.Value;
    }

    /// <summary>
    /// Sinh Access Token cho người dùng:
    /// - Ký số bảo mật bằng thuật toán HmacSha256 với khóa bí mật hệ thống.
    /// - Đóng gói các Claims thiết yếu vào Payload của Token.
    /// - Thiết lập thời hạn sống của token theo cấu hình AccessTokenMinutes (thường là 15-60 phút).
    /// </summary>
    /// <param name="user">Thực thể người dùng.</param>
    /// <returns>Đối tượng <see cref="AccessToken"/> gồm chuỗi token ký số và thời điểm hết hạn.</returns>
    public AccessToken CreateAccessToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Key));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.FullName),
            new(ClaimTypes.Role, user.Role),
            // Chỉ để tham khảo: sẽ cũ sau khi nâng cấp/hết hạn. Nguồn đáng tin là GET /auth/me.
            new("isPro", user.IsProActive(DateTime.UtcNow).ToString().ToLower())
        };

        var expiresAt = DateTime.UtcNow.AddMinutes(_options.AccessTokenMinutes);
        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: creds
        );

        return new AccessToken(new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}
