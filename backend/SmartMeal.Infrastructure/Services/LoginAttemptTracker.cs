using Microsoft.Extensions.Options;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Infrastructure.Options;

namespace SmartMeal.Infrastructure.Services;

/// <summary>
/// Đếm lần nhập sai mật khẩu và khóa tạm thời tài khoản (SEC-02). Dùng chung cho mọi thao tác kiểm tra mật khẩu
/// (đăng nhập, đổi mật khẩu, xóa tài khoản) để kẻ cầm access token bị đánh cắp cũng không dò được mật khẩu.
/// </summary>
public interface ILoginAttemptTracker
{
    /// <summary>Tài khoản đang bị khóa thì trả thời gian còn lại, ngược lại null.</summary>
    TimeSpan? RemainingLockout(User user, DateTime now);

    /// <summary>Ghi nhận một lần sai; đủ ngưỡng thì khóa và trả thời điểm hết khóa, ngược lại null.</summary>
    Task<DateTime?> RegisterFailureAsync(User user, DateTime now);

    /// <summary>Xóa bộ đếm và trạng thái khóa (đăng nhập đúng hoặc đã đặt lại mật khẩu).</summary>
    Task ResetAsync(User user);
}

public sealed class LoginAttemptTracker : ILoginAttemptTracker
{
    private readonly ApplicationDbContext _db;
    private readonly AuthOptions _auth;

    public LoginAttemptTracker(ApplicationDbContext db, IOptions<AuthOptions> auth)
    {
        _db = db;
        _auth = auth.Value;
    }

    public TimeSpan? RemainingLockout(User user, DateTime now) =>
        user.LockoutEnd is { } end && end > now ? end - now : null;

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
