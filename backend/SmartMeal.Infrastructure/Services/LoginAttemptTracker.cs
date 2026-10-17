using Microsoft.Extensions.Options;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Infrastructure.Options;

namespace SmartMeal.Infrastructure.Services;

/// <summary>
/// Giao diện dịch vụ theo dõi số lần đăng nhập sai và cơ chế khóa tài khoản tạm thời (Brute-Force Protection - SEC-02):
/// Dùng chung cho tất cả các luồng xác minh mật khẩu (Đăng nhập, Đổi mật khẩu, Xác nhận xóa tài khoản).
/// </summary>
public interface ILoginAttemptTracker
{
    /// <summary>
    /// Kiểm tra tài khoản người dùng có đang trong trạng thái bị khóa tạm thời hay không:
    /// Trả về khoảng thời gian còn lại trước khi tài khoản được mở khóa tự động, hoặc null nếu không bị khóa.
    /// </summary>
    /// <param name="user">Thực thể người dùng cần kiểm tra.</param>
    /// <param name="now">Thời điểm hiện tại (UTC).</param>
    /// <returns>TimeSpan khoảng thời gian còn bị khóa hoặc null nếu bình thường.</returns>
    TimeSpan? RemainingLockout(User user, DateTime now);

    /// <summary>
    /// Ghi nhận một lần nhập sai mật khẩu của người dùng:
    /// Tăng biến đếm FailedLoginCount; nếu vượt ngưỡng MaxFailedLoginAttempts cấu hình, hệ thống thiết lập LockoutEnd và khóa tạm thời tài khoản.
    /// </summary>
    /// <param name="user">Thực thể người dùng nhập sai.</param>
    /// <param name="now">Thời điểm hiện tại (UTC).</param>
    /// <returns>Mốc thời gian UTC kết thúc khóa nếu vừa bị khóa, hoặc null nếu chưa đạt ngưỡng khóa.</returns>
    Task<DateTime?> RegisterFailureAsync(User user, DateTime now);

    /// <summary>
    /// Xóa bỏ bộ đếm số lần nhập sai và gỡ bỏ trạng thái khóa tạm thời khi người dùng nhập đúng mật khẩu hoặc đã đặt lại mật khẩu thành công.
    /// </summary>
    /// <param name="user">Thực thể người dùng cần reset.</param>
    Task ResetAsync(User user);
}

/// <summary>
/// Cài đặt dịch vụ theo dõi đăng nhập sai và khóa tài khoản người dùng (LoginAttemptTracker):
/// Lưu trữ trực tiếp số lần sai (FailedLoginCount) và thời điểm hết hạn khóa (LockoutEnd) vào bảng Users trong PostgreSQL.
/// </summary>
public sealed class LoginAttemptTracker : ILoginAttemptTracker
{
    private readonly ApplicationDbContext _db;
    private readonly AuthOptions _auth;

    /// <summary>
    /// Khởi tạo instance mới của <see cref="LoginAttemptTracker"/>.
    /// </summary>
    /// <param name="db">Database context của ứng dụng.</param>
    /// <param name="auth">Tùy chọn cấu hình xác thực (số lần sai tối đa, số phút khóa).</param>
    public LoginAttemptTracker(ApplicationDbContext db, IOptions<AuthOptions> auth)
    {
        _db = db;
        _auth = auth.Value;
    }

    /// <summary>
    /// Tính toán thời gian còn lại của lệnh khóa tạm thời:
    /// Nếu thời điểm LockoutEnd lớn hơn thời điểm hiện tại thì trả về hiệu số TimeSpan, ngược lại trả về null.
    /// </summary>
    /// <param name="user">Thực thể người dùng.</param>
    /// <param name="now">Mốc thời gian hiện tại (UTC).</param>
    /// <returns>Thời gian còn bị khóa hoặc null nếu không bị khóa.</returns>
    public TimeSpan? RemainingLockout(User user, DateTime now) =>
        user.LockoutEnd is { } end && end > now ? end - now : null;

    /// <summary>
    /// Tăng số lần thử sai của người dùng lên 1:
    /// - Nếu đạt ngưỡng MaxFailedLoginAttempts: Tính toán thời điểm hết khóa (now + LockoutMinutes), cập nhật LockoutEnd và reset FailedLoginCount.
    /// - Lưu thay đổi trực tiếp vào database.
    /// </summary>
    /// <param name="user">Thực thể người dùng.</param>
    /// <param name="now">Mốc thời gian hiện tại (UTC).</param>
    /// <returns>Thời điểm hết khóa (UTC) nếu bị kích hoạt khóa, ngược lại trả về null.</returns>
    public async Task<DateTime?> RegisterFailureAsync(User user, DateTime now)
    {
        user.FailedLoginCount++;
        DateTime? lockedUntil = null;
        if (user.FailedLoginCount >= _auth.MaxFailedLoginAttempts)
        {
            lockedUntil = now.AddMinutes(_auth.LockoutMinutes);
            user.FailedLoginCount = 0;
            user.LockoutEnd = lockedUntil;
        }

        await _db.SaveChangesAsync();
        return lockedUntil;
    }

    /// <summary>
    /// Đặt lại bộ đếm số lần đăng nhập sai (FailedLoginCount = 0) và xóa thời hạn khóa (LockoutEnd = null):
    /// Bỏ qua nếu người dùng vốn không có vi phạm nào để tối ưu hiệu năng không gọi SaveChangesAsync thừa thãi.
    /// </summary>
    /// <param name="user">Thực thể người dùng.</param>
    public async Task ResetAsync(User user)
    {
        if (user.FailedLoginCount == 0 && user.LockoutEnd is null)
        {
            return;
        }

        user.FailedLoginCount = 0;
        user.LockoutEnd = null;
        await _db.SaveChangesAsync();
    }
}
