using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SmartMeal.Application.DTOs.AI;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Infrastructure.Options;

namespace SmartMeal.Infrastructure.Services;

/// <summary>
/// Dịch vụ quản lý hạn ngạch (Quota) sử dụng tính năng AI (nhận diện món ăn, bóc tách hóa đơn, menu, phân tích dinh dưỡng).
/// Người dùng gói Pro được sử dụng không giới hạn (Unlimited); người dùng miễn phí có hạn mức cố định theo ngày
/// và tự động làm mới hạn ngạch vào 00:00 theo múi giờ địa phương (GMT+7).
/// </summary>
public class AiQuotaService : IAiQuotaService
{
    private readonly ApplicationDbContext _db;
    private readonly AiOptions _options;

    /// <summary>
    /// Khởi tạo instance mới của <see cref="AiQuotaService"/>.
    /// </summary>
    /// <param name="db">DbContext kết nối cơ sở dữ liệu ứng dụng.</param>
    /// <param name="options">Cấu hình tham số AI (hạn mức miễn phí hằng ngày, múi giờ reset).</param>
    public AiQuotaService(ApplicationDbContext db, IOptions<AiOptions> options)
    {
        _db = db;
        _options = options.Value;
    }

    /// <summary>
    /// Lấy thông tin hạn ngạch AI hiện tại của người dùng (tổng hạn mức, số lượt đã dùng, số lượt còn lại và thời điểm làm mới).
    /// </summary>
    /// <param name="userId">Định danh người dùng.</param>
    /// <returns>Đối tượng <see cref="AiQuotaDto"/> chứa thông tin chi tiết về hạn mức AI.</returns>
    public async Task<AiQuotaDto> GetAsync(Guid userId)
    {
        var now = DateTime.UtcNow;
        var (startUtc, resetsAt) = CurrentWindow(now);

        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user is not null && user.IsProActive(now))
        {
            return new AiQuotaDto { IsUnlimited = true, Used = 0, ResetsAt = resetsAt };
        }

        var used = await _db.AiUsageLogs.CountAsync(l => l.UserId == userId && l.CreatedAt >= startUtc);
        var limit = _options.FreeDailyLimit;
        return new AiQuotaDto
        {
            IsUnlimited = false,
            Limit = limit,
            Used = used,
            Remaining = Math.Max(0, limit - used),
            ResetsAt = resetsAt
        };
    }

    /// <summary>
    /// Ghi nhận một lượt sử dụng tính năng AI vào nhật ký kiểm toán sử dụng (<see cref="AiUsageLog"/>).
    /// </summary>
    /// <param name="userId">Định danh người dùng thực hiện gọi AI.</param>
    /// <param name="kind">Loại tác vụ AI (Vision, OCR, Chat,...).</param>
    public async Task RecordUseAsync(Guid userId, string kind)
    {
        _db.AiUsageLogs.Add(new AiUsageLog { UserId = userId, Kind = kind, CreatedAt = DateTime.UtcNow });
        await _db.SaveChangesAsync();
    }

    /// <summary>Khung "ngày" theo múi giờ cấu hình: [00:00 hôm nay, 00:00 ngày mai) quy về UTC.</summary>
    private (DateTime StartUtc, DateTime ResetsAtUtc) CurrentWindow(DateTime nowUtc)
    {
        var offset = TimeSpan.FromHours(_options.QuotaUtcOffsetHours);
        var localMidnight = (nowUtc + offset).Date;
        var startUtc = DateTime.SpecifyKind(localMidnight - offset, DateTimeKind.Utc);
        return (startUtc, startUtc.AddDays(1));
    }
}
