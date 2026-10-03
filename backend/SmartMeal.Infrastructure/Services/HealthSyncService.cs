using Microsoft.EntityFrameworkCore;
using Npgsql;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.HealthSync;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.Infrastructure.Services;

public class HealthSyncService : IHealthSyncService
{
    private const double DefaultTargetCalories = 2000;

    private readonly ApplicationDbContext _db;

    public HealthSyncService(ApplicationDbContext db)
    {
        _db = db;
    }

    /// <summary>Lưu (thay thế) tổng của một ngày từ một nguồn: gửi lại cùng (ngày, nguồn) không làm số liệu nhân đôi.</summary>
    public async Task<ApiResponse<SyncHealthMetricsResponseDto>> SyncStepsAndCaloriesAsync(Guid userId, SyncHealthMetricsRequestDto dto)
    {
        var source = HealthSyncSources.Canonical(dto.Source);
        if (source is null)
        {
            return ApiResponse<SyncHealthMetricsResponseDto>.Fail(
                $"source phải là một trong các giá trị: {string.Join(", ", HealthSyncSources.ByPriority)}.");
        }

        var date = dto.Date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var now = DateTime.UtcNow;
        var syncedAt = new DateTime(now.Ticks - now.Ticks % 10, DateTimeKind.Utc); // PostgreSQL lưu tới microsecond

        var log = await _db.HealthSyncLogs.FirstOrDefaultAsync(l => l.UserId == userId && l.SyncDate == date && l.Source == source);
        if (log is null)
        {
            log = new HealthSyncLog { UserId = userId, SyncDate = date, Source = source };
            _db.HealthSyncLogs.Add(log);
            Apply(log, dto, syncedAt);

            try
            {
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
            {
                // Request song song vừa tạo bản ghi (ngày, nguồn) này: thay thế bản đó.
                _db.Entry(log).State = EntityState.Detached;
                log = await _db.HealthSyncLogs.FirstAsync(l => l.UserId == userId && l.SyncDate == date && l.Source == source);
                Apply(log, dto, syncedAt);
                await _db.SaveChangesAsync();
            }
        }
        else
        {
            Apply(log, dto, syncedAt);
            await _db.SaveChangesAsync();
        }

        var response = new SyncHealthMetricsResponseDto
        {
            Date = log.SyncDate,
            Steps = log.StepCount,
            BurnedCalories = log.ActiveCaloriesBurned,
            DistanceMeters = log.DistanceMeters,
            Source = log.Source,
            SyncedAt = log.SyncedAt
        };

        return ApiResponse<SyncHealthMetricsResponseDto>.Ok(response, "Đồng bộ dữ liệu sức khỏe thành công.");
    }

    public async Task<ApiResponse<DailyHealthSyncSummaryDto>> GetDailySummaryAsync(Guid userId, DateOnly date)
    {
        var syncLogs = await _db.HealthSyncLogs
            .Where(l => l.UserId == userId && l.SyncDate == date)
            .AsNoTracking()
            .ToListAsync();

        var profile = await _db.HealthProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(hp => hp.UserId == userId);

        var diaries = await _db.NutritionDiaries
            .Include(d => d.Items)
            .Where(d => d.UserId == userId && d.LogDate == date)
            .AsNoTracking()
            .ToListAsync();

        // Mỗi nguồn chỉ có một bản ghi/ngày; lấy số liệu từ nguồn ưu tiên cao nhất thay vì cộng các nguồn lại (BR-042).
        var ordered = syncLogs.OrderBy(l => HealthSyncSources.Rank(l.Source)).ToList();
        var active = ordered.FirstOrDefault();

        double burned = active?.ActiveCaloriesBurned ?? 0;
        double consumed = diaries.SelectMany(d => d.Items).Sum(i => i.Calories);
        double target = profile?.DailyCaloriesTarget ?? DefaultTargetCalories;
        double net = consumed - burned;
        double remaining = target - net;

        var result = new DailyHealthSyncSummaryDto
        {
            Date = date,
            Steps = active?.StepCount ?? 0,
            StepGoal = 10000,
            BurnedCalories = Math.Round(burned, 1),
            ConsumedCalories = Math.Round(consumed, 1),
            NetCalories = Math.Round(net, 1),
            TargetCalories = Math.Round(target, 1),
            RemainingCalories = Math.Round(remaining, 1),
            DistanceMeters = Math.Round(active?.DistanceMeters ?? 0, 1),
            Sources = ordered.Select(l => l.Source).ToList(),
            ActiveSource = active?.Source,
            LastSyncedAt = syncLogs.Count > 0 ? syncLogs.Max(l => l.SyncedAt) : null
        };

        return ApiResponse<DailyHealthSyncSummaryDto>.Ok(result);
    }

    private static void Apply(HealthSyncLog log, SyncHealthMetricsRequestDto dto, DateTime syncedAt)
    {
        log.StepCount = dto.Steps;
        log.ActiveCaloriesBurned = dto.BurnedCalories;
        log.DistanceMeters = dto.DistanceMeters;
        log.SyncedAt = syncedAt;
    }
}
