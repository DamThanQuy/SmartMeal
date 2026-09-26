using Microsoft.EntityFrameworkCore;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.HealthSync;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.Infrastructure.Services;

public class HealthSyncService : IHealthSyncService
{
    private readonly ApplicationDbContext _db;

    public HealthSyncService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<ApiResponse<SyncHealthMetricsResponseDto>> SyncStepsAndCaloriesAsync(Guid userId, SyncHealthMetricsRequestDto dto)
    {
        var targetDate = dto.Date ?? DateOnly.FromDateTime(DateTime.UtcNow);

        var log = new HealthSyncLog
        {
            UserId = userId,
            SyncDate = targetDate,
            StepCount = dto.Steps,
            ActiveCaloriesBurned = dto.BurnedCalories,
            DistanceMeters = dto.DistanceMeters,
            Source = string.IsNullOrWhiteSpace(dto.Source) ? "GoogleFit" : dto.Source,
            SyncedAt = DateTime.UtcNow
        };

        _db.HealthSyncLogs.Add(log);
        await _db.SaveChangesAsync();

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

        int totalSteps = syncLogs.Sum(l => l.StepCount);
        double totalBurned = syncLogs.Sum(l => l.ActiveCaloriesBurned);
        double totalDistance = syncLogs.Sum(l => l.DistanceMeters);
        var sources = syncLogs.Select(l => l.Source).Distinct().ToList();
        if (sources.Count == 0) sources.Add("Manual");

        double consumed = diaries.SelectMany(d => d.Items).Sum(i => i.Calories);
        double target = profile?.DailyCaloriesTarget ?? 2000;
        double net = consumed - totalBurned;
        double remaining = target - net;

        var lastSynced = syncLogs.Count > 0 ? syncLogs.Max(l => l.SyncedAt) : DateTime.UtcNow;

        var result = new DailyHealthSyncSummaryDto
        {
            Date = date,
            Steps = totalSteps,
            StepGoal = 10000,
            BurnedCalories = Math.Round(totalBurned, 1),
            ConsumedCalories = Math.Round(consumed, 1),
            NetCalories = Math.Round(net, 1),
            TargetCalories = Math.Round(target, 1),
            RemainingCalories = Math.Round(remaining, 1),
            DistanceMeters = Math.Round(totalDistance, 1),
            Sources = sources,
            LastSyncedAt = lastSynced
        };

        return ApiResponse<DailyHealthSyncSummaryDto>.Ok(result);
    }
}
