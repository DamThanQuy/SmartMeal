using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SmartMeal.Application.DTOs.AI;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Infrastructure.Options;

namespace SmartMeal.Infrastructure.Services;

public class AiQuotaService : IAiQuotaService
{
    private readonly ApplicationDbContext _db;
    private readonly AiOptions _options;

    public AiQuotaService(ApplicationDbContext db, IOptions<AiOptions> options)
    {
        _db = db;
        _options = options.Value;
    }

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
