using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.HealthSync;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.Infrastructure.Services;

/// <summary>
/// Dịch vụ đồng bộ dữ liệu sức khỏe thể chất từ các nền tảng thiết bị (Apple Health, Google Fit/Health Connect, Garmin,...).
/// Lưu trữ số bước chân, calo tiêu hao khi vận động, quãng đường di chuyển và tính toán calo ròng (Net Calories = Calo nạp - Calo tiêu hao).
/// Áp dụng cơ chế xếp hạng nguồn dữ liệu ưu tiên cao nhất tránh trùng lặp số liệu (BR-042).
/// </summary>
public class HealthSyncService : IHealthSyncService
{
    private const double DefaultTargetCalories = 2000;

    private readonly ApplicationDbContext _db;
    private readonly IGamificationService _gamification;
    private readonly ILogger<HealthSyncService> _logger;

    /// <summary>
    /// Khởi tạo instance mới của <see cref="HealthSyncService"/>.
    /// </summary>
    /// <param name="db">DbContext kết nối cơ sở dữ liệu ứng dụng.</param>
    /// <param name="gamification">Dịch vụ Gamification cập nhật tiến độ thử thách vận động và nhận XP.</param>
    /// <param name="logger">Logger ghi log hoạt động đồng bộ sức khỏe.</param>
    public HealthSyncService(ApplicationDbContext db, IGamificationService gamification, ILogger<HealthSyncService> logger)
    {
        _db = db;
        _gamification = gamification;
        _logger = logger;
    }

    /// <summary>
    /// Đồng bộ số bước chân, calo tiêu thụ và quãng đường di chuyển của một ngày từ một nguồn cụ thể (AppleHealth, GoogleFit, Garmin,...).
    /// Dữ liệu được lưu dạng Idempotent (ghi đè tổng số liệu trong ngày của nguồn đó, không cộng dồn trùng lặp).
    /// </summary>
    /// <param name="userId">Định danh người dùng.</param>
    /// <param name="dto">Dữ liệu đồng bộ gồm số bước, calo vận động, quãng đường (m), nguồn và ngày đồng bộ.</param>
    /// <returns>Đối tượng <see cref="ApiResponse{T}"/> chứa thông tin số liệu sức khỏe sau khi đồng bộ.</returns>
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

        await _gamification.EvaluateAfterChangeAsync(_logger, userId, date, "health-sync");

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

    /// <summary>
    /// Lấy tổng kết sức khỏe trong ngày của người dùng: số bước (so với mục tiêu 10.000 bước), calo tiêu hao vận động,
    /// calo nạp từ nhật ký dinh dưỡng, calo ròng (Net Calories = Nạp - Tiêu hao), và calo còn lại so với mục tiêu.
    /// Số liệu vận động được lấy từ nguồn có độ ưu tiên cao nhất trong ngày (BR-042).
    /// </summary>
    /// <param name="userId">Định danh người dùng.</param>
    /// <param name="date">Ngày cần lấy tổng kết sức khỏe.</param>
    /// <returns>Đối tượng <see cref="ApiResponse{T}"/> chứa tổng hợp các chỉ số sức khỏe trong ngày.</returns>
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

    /// <summary>Gán các giá trị từ DTO yêu cầu vào thực thể nhật ký đồng bộ sức khỏe.</summary>
    private static void Apply(HealthSyncLog log, SyncHealthMetricsRequestDto dto, DateTime syncedAt)
    {
        log.StepCount = dto.Steps;
        log.ActiveCaloriesBurned = dto.BurnedCalories;
        log.DistanceMeters = dto.DistanceMeters;
        log.SyncedAt = syncedAt;
    }
}
