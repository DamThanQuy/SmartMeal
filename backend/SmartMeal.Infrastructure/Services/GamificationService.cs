using Microsoft.EntityFrameworkCore;
using Npgsql;
using SmartMeal.Application.Common;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Gamification;
using SmartMeal.Application.DTOs.HealthSync;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.Infrastructure.Services;

public class GamificationService : IGamificationService
{
    /// <summary>Số ngày sau khi hết khung mà tiến độ thử thách vẫn còn được tính.</summary>
    private const int ChallengeGraceDays = 7;

    private readonly ApplicationDbContext _db;

    public GamificationService(ApplicationDbContext db)
    {
        _db = db;
    }

    // ───────────────────────────── Pet ─────────────────────────────

    public async Task<ApiResponse<HealthPetStatusDto>> GetPetStatusAsync(Guid userId, DateOnly? date = null)
    {
        var today = ResolveToday(date);
        var state = await EvaluateCoreAsync(userId, today);
        var pet = await _db.HealthPets.AsNoTracking().FirstAsync(p => p.UserId == userId);
        var (level, xpIntoLevel) = GamificationRules.LevelOf(pet.TotalXp);

        var stats = state.Today;
        var tasks = new List<PetTaskDto>
        {
            new()
            {
                Id = "breakfast", Label = "Ghi bữa sáng", XpReward = GamificationRules.BreakfastXp, Unit = "bữa",
                ProgressCurrent = Math.Min(stats.BreakfastItems, 1), ProgressTarget = 1, Completed = stats.BreakfastItems > 0
            },
            new()
            {
                Id = "protein", Label = "Đạt mục tiêu protein", XpReward = GamificationRules.ProteinXp, Unit = "g",
                ProgressCurrent = Math.Round(stats.ProteinGrams, 1), ProgressTarget = state.ProteinTargetGrams,
                Completed = state.ProteinTargetGrams > 0 && stats.ProteinGrams >= state.ProteinTargetGrams
            },
            new()
            {
                Id = "water", Label = "Uống đủ nước", XpReward = GamificationRules.WaterXp, Unit = "ml",
                ProgressCurrent = stats.WaterMl, ProgressTarget = state.WaterGoalMl, Completed = stats.WaterMl >= state.WaterGoalMl
            }
        };

        var loggedToday = stats.MealGroups > 0;
        var message = !loggedToday
            ? $"{pet.PetName} đang đói — hãy ghi bữa ăn đầu tiên hôm nay nhé!"
            : tasks.All(t => t.Completed)
                ? $"Hôm nay bạn làm rất tốt! {pet.PetName} rất vui."
                : $"{pet.PetName} đang vui vẻ. Hoàn thành thêm nhiệm vụ để nhận XP nhé!";

        return ApiResponse<HealthPetStatusDto>.Ok(new HealthPetStatusDto
        {
            PetName = pet.PetName,
            PetType = pet.PetType,
            Level = level,
            Exp = xpIntoLevel,
            NextLevelExp = GamificationRules.XpPerLevel,
            TotalXp = pet.TotalXp,
            XpIntoLevel = xpIntoLevel,
            XpPerLevel = GamificationRules.XpPerLevel,
            Stage = GamificationRules.StageOf(level),
            Mood = loggedToday ? "Happy" : "Hungry",
            StatusMessage = message,
            CurrentOutfit = pet.CurrentOutfit,
            NutritionScoreToday = stats.Calories > 0 ? Math.Min(100.0, 70.0 + stats.MealGroups * 10) : 50.0,
            Tasks = tasks
        });
    }

    // ───────────────────────────── Streak ─────────────────────────────

    public async Task<ApiResponse<StreakStatusDto>> GetStreakStatusAsync(Guid userId, DateOnly? date = null)
    {
        var today = ResolveToday(date);
        var loggedDates = await LoggedDatesAsync(userId, today);
        var (current, longest) = StreakOf(loggedDates, today);

        var recent = new List<StreakDayDto>();
        for (var i = 6; i >= 0; i--)
        {
            var d = today.AddDays(-i);
            recent.Add(new StreakDayDto { Date = d, DayOfWeek = d.DayOfWeek.ToString()[..3], HasLogged = loggedDates.Contains(d) });
        }

        return ApiResponse<StreakStatusDto>.Ok(new StreakStatusDto
        {
            CurrentStreak = current,
            LongestStreak = longest,
            TotalActiveDays = loggedDates.Count,
            HasLoggedToday = loggedDates.Contains(today),
            RecentActivity = recent
        });
    }

    // ───────────────────────────── Thử thách ─────────────────────────────

    public async Task<ApiResponse<List<ChallengeDto>>> GetChallengesAsync(Guid userId, DateOnly? date = null)
    {
        var today = ResolveToday(date);
        await EvaluateCoreAsync(userId, today);
        return ApiResponse<List<ChallengeDto>>.Ok(await BuildChallengeListAsync(userId, today));
    }

    public async Task<ApiResponse<ChallengeDto>> JoinChallengeAsync(Guid userId, Guid challengeId, DateOnly? date = null)
    {
        var today = ResolveToday(date);
        var challenge = await _db.Challenges.AsNoTracking().FirstOrDefaultAsync(c => c.Id == challengeId && c.IsActive);
        if (challenge == null)
            return ApiResponse<ChallengeDto>.Fail("Không tìm thấy thử thách.", null, ApiErrorKind.NotFound);

        // Tham gia là idempotent: đang tham gia hoặc đã hoàn thành thì trả lại bản ghi cũ; hết khung mà chưa xong thì bắt đầu khung mới.
        for (var attempt = 0; attempt < 2; attempt++)
        {
            var existing = await _db.UserChallenges.FirstOrDefaultAsync(uc => uc.UserId == userId && uc.ChallengeId == challengeId);
            if (existing == null)
            {
                _db.UserChallenges.Add(new UserChallenge { UserId = userId, ChallengeId = challengeId, StartDate = today, CompletedDays = 0 });
            }
            else if (!existing.IsCompleted && today > existing.StartDate.AddDays(challenge.DurationDays - 1))
            {
                existing.StartDate = today;
                existing.CompletedDays = 0;
                existing.JoinedAt = DateTime.UtcNow;
            }

            try
            {
                await _db.SaveChangesAsync();
                break;
            }
            catch (DbUpdateException ex) when (attempt == 0 && IsUniqueViolation(ex))
            {
                // Hai lần bấm đồng thời: bản kia đã tạo, đọc lại.
                _db.ChangeTracker.Clear();
            }
        }

        await EvaluateCoreAsync(userId, today);
        var dto = (await BuildChallengeListAsync(userId, today)).Single(c => c.Id == challengeId);
        return ApiResponse<ChallengeDto>.Ok(dto, "Tham gia thử thách thành công.");
    }

    // ───────────────────────────── Huy hiệu & trang phục ─────────────────────────────

    public async Task<ApiResponse<BadgesSummaryDto>> GetBadgesAsync(Guid userId, DateOnly? date = null)
    {
        var today = ResolveToday(date);
        await EvaluateCoreAsync(userId, today);
        return ApiResponse<BadgesSummaryDto>.Ok(await BuildBadgesSummaryAsync(userId, today));
    }

    public async Task<ApiResponse<BadgesSummaryDto>> EquipCostumeAsync(Guid userId, string? costumeId, DateOnly? date = null)
    {
        var today = ResolveToday(date);
        await EvaluateCoreAsync(userId, today);

        string outfit;
        if (string.IsNullOrWhiteSpace(costumeId))
        {
            outfit = GamificationCatalog.NoOutfit;
        }
        else
        {
            var costume = GamificationCatalog.Costumes.FirstOrDefault(c => string.Equals(c.Id, costumeId.Trim(), StringComparison.OrdinalIgnoreCase));
            if (costume == null)
                return ApiResponse<BadgesSummaryDto>.Fail("Không tìm thấy trang phục.", null, ApiErrorKind.NotFound);

            var summary = await BuildBadgesSummaryAsync(userId, today);
            if (!summary.Costumes.Single(c => c.Id == costume.Id).Unlocked)
                return ApiResponse<BadgesSummaryDto>.Fail($"Trang phục \"{costume.Title}\" chưa mở khóa ({costume.UnlockDescription.ToLowerInvariant()}).");

            outfit = costume.Id;
        }

        await _db.HealthPets.Where(p => p.UserId == userId).ExecuteUpdateAsync(s => s
            .SetProperty(p => p.CurrentOutfit, outfit)
            .SetProperty(p => p.LastUpdated, DateTime.UtcNow));

        return ApiResponse<BadgesSummaryDto>.Ok(
            await BuildBadgesSummaryAsync(userId, today),
            outfit == GamificationCatalog.NoOutfit ? "Đã cởi trang phục." : "Đã đổi trang phục.");
    }

    // ───────────────────────────── Đánh giá sự kiện ─────────────────────────────

    public async Task EvaluateAsync(Guid userId, DateOnly? date = null) =>
        await EvaluateCoreAsync(userId, ResolveToday(date));

    /// <summary>Số liệu của một ngày dùng cho nhiệm vụ và thử thách.</summary>
    private sealed record DayStats(int BreakfastItems, int MealGroups, double Calories, double ProteinGrams, int WaterMl, int Steps)
    {
        public static readonly DayStats Empty = new(0, 0, 0, 0, 0, 0);
    }

    private sealed record EvaluationState(DayStats Today, int WaterGoalMl, double ProteinTargetGrams);

    /// <summary>
    /// Cộng XP cho nhiệm vụ hôm nay, cập nhật tiến độ thử thách, mở huy hiệu mới. Mọi bước idempotent (BR-202): XP chỉ vào sổ
    /// khi (người dùng, sự kiện) chưa có, nên gọi lại hay gọi đồng thời không cộng trùng.
    /// </summary>
    private async Task<EvaluationState> EvaluateCoreAsync(Guid userId, DateOnly today)
    {
        await EnsurePetAsync(userId);

        var profile = await _db.HealthProfiles.AsNoTracking()
            .Where(hp => hp.UserId == userId)
            .Select(hp => new { hp.WaterGoalMl, hp.DailyProteinTargetGrams })
            .FirstOrDefaultAsync();
        var waterGoal = profile is { WaterGoalMl: > 0 } ? profile.WaterGoalMl : GamificationRules.DefaultWaterGoalMl;
        var proteinTarget = profile?.DailyProteinTargetGrams ?? 0;

        // Thử thách đang diễn ra, hoặc vừa hết khung trong vài ngày (để người đã làm đủ mà chưa mở app vẫn được ghi nhận);
        // quá hạn lâu hơn thì coi là bỏ dở và không tính nữa.
        var joined = (await _db.UserChallenges.Include(uc => uc.Challenge)
                .Where(uc => uc.UserId == userId && !uc.IsCompleted)
                .ToListAsync())
            .Where(uc => uc.StartDate.AddDays(uc.Challenge.DurationDays - 1 + ChallengeGraceDays) >= today)
            .ToList();

        var from = joined.Count == 0 ? today : new[] { today, joined.Min(uc => uc.StartDate) }.Min();
        var stats = await LoadDayStatsAsync(userId, from, today);
        var todayStats = stats.GetValueOrDefault(today, DayStats.Empty);

        // 1. Nhiệm vụ hôm nay
        if (todayStats.BreakfastItems > 0)
            await AwardXpAsync(userId, $"breakfast-{today:yyyy-MM-dd}", "Breakfast", GamificationRules.BreakfastXp);
        if (proteinTarget > 0 && todayStats.ProteinGrams >= proteinTarget)
            await AwardXpAsync(userId, $"protein-{today:yyyy-MM-dd}", "Protein", GamificationRules.ProteinXp);
        if (todayStats.WaterMl >= waterGoal)
            await AwardXpAsync(userId, $"water-{today:yyyy-MM-dd}", "Water", GamificationRules.WaterXp);

        // 2. Tiến độ thử thách: đếm số ngày trong khung đạt mục tiêu; đủ số ngày thì hoàn thành và nhận thưởng đúng một lần (BR-212).
        var finished = new List<UserChallenge>();
        foreach (var uc in joined)
        {
            var last = uc.StartDate.AddDays(uc.Challenge.DurationDays - 1);
            var upTo = last < today ? last : today;
            var days = 0;
            for (var d = uc.StartDate; d <= upTo; d = d.AddDays(1))
            {
                if (IsDaySatisfied(uc.Challenge, stats.GetValueOrDefault(d, DayStats.Empty))) days++;
            }

            uc.CompletedDays = days;
            if (days >= uc.Challenge.DurationDays)
            {
                uc.IsCompleted = true;
                uc.CompletedAt = DateTime.UtcNow;
                finished.Add(uc);
            }
        }

        await _db.SaveChangesAsync();
        foreach (var uc in finished)
            await AwardXpAsync(userId, $"challenge-{uc.ChallengeId}", "Challenge", uc.Challenge.RewardExp);

        // 3. Huy hiệu
        await UnlockBadgesAsync(userId, today, waterGoal, proteinTarget);

        return new EvaluationState(todayStats, waterGoal, proteinTarget);
    }

    private static bool IsDaySatisfied(Challenge challenge, DayStats day)
    {
        if (challenge.TargetValuePerDay <= 0) return false;
        return challenge.Category switch
        {
            "DrinkWater" => day.WaterMl >= challenge.TargetValuePerDay,
            "EatClean" => day.MealGroups >= challenge.TargetValuePerDay,
            "Exercise" => day.Steps >= challenge.TargetValuePerDay,
            _ => false // NoSugar và các loại khác chưa có dữ liệu để chấm
        };
    }

    private async Task<Dictionary<DateOnly, DayStats>> LoadDayStatsAsync(Guid userId, DateOnly from, DateOnly to)
    {
        var items = await _db.DiaryItems.AsNoTracking()
            .Where(i => i.NutritionDiary.UserId == userId && i.NutritionDiary.LogDate >= from && i.NutritionDiary.LogDate <= to)
            .Select(i => new { i.NutritionDiary.LogDate, i.NutritionDiary.MealType, i.Calories, i.ProteinGrams })
            .ToListAsync();

        var water = await _db.WaterLogs.AsNoTracking()
            .Where(w => w.UserId == userId && w.LogDate >= from && w.LogDate <= to)
            .GroupBy(w => w.LogDate)
            .Select(g => new { Date = g.Key, Total = g.Sum(w => w.AmountMl) })
            .ToListAsync();

        var syncs = await _db.HealthSyncLogs.AsNoTracking()
            .Where(l => l.UserId == userId && l.SyncDate >= from && l.SyncDate <= to)
            .Select(l => new { l.SyncDate, l.Source, l.StepCount })
            .ToListAsync();

        var result = new Dictionary<DateOnly, DayStats>();
        for (var d = from; d <= to; d = d.AddDays(1))
        {
            var dayItems = items.Where(i => i.LogDate == d).ToList();
            // Số bước lấy từ nguồn ưu tiên cao nhất của ngày, không cộng các nguồn lại (BR-042).
            var steps = syncs.Where(s => s.SyncDate == d).OrderBy(s => HealthSyncSources.Rank(s.Source)).Select(s => s.StepCount).FirstOrDefault();
            result[d] = new DayStats(
                BreakfastItems: dayItems.Count(i => i.MealType == MealTypes.Breakfast),
                MealGroups: dayItems.Select(i => i.MealType).Distinct().Count(),
                Calories: dayItems.Sum(i => i.Calories),
                ProteinGrams: dayItems.Sum(i => i.ProteinGrams),
                WaterMl: water.FirstOrDefault(w => w.Date == d)?.Total ?? 0,
                Steps: steps);
        }

        return result;
    }

    // ───────────────────────────── XP ─────────────────────────────

    /// <summary>Tạo pet nếu chưa có (an toàn khi nhiều request cùng lúc nhờ unique index theo người dùng).</summary>
    private async Task EnsurePetAsync(Guid userId)
    {
        if (await _db.HealthPets.AnyAsync(p => p.UserId == userId)) return;

        await _db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO "HealthPets" ("Id","UserId","PetName","PetType","TotalXp","Level","Exp","NextLevelExp","Stage","Mood","CurrentOutfit","StatusMessage","LastUpdated")
            VALUES ({Guid.NewGuid()},{userId},'Bé Mầm','Dino',0,1,0,{GamificationRules.XpPerLevel},'Baby','Happy',{GamificationCatalog.NoOutfit},'',{DateTime.UtcNow})
            ON CONFLICT ("UserId") DO NOTHING
            """);
    }

    /// <summary>
    /// Ghi một sự kiện XP vào sổ rồi cộng vào pet trong cùng transaction. Trả false nếu sự kiện này đã được cộng trước đó (BR-202).
    /// </summary>
    private async Task<bool> AwardXpAsync(Guid userId, string eventKey, string kind, int xp)
    {
        if (xp <= 0) return false;

        await using var transaction = await _db.Database.BeginTransactionAsync();
        var inserted = await _db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO "XpEvents" ("Id","UserId","EventKey","Kind","Xp","CreatedAt")
            VALUES ({Guid.NewGuid()},{userId},{eventKey},{kind},{xp},{DateTime.UtcNow})
            ON CONFLICT ("UserId","EventKey") DO NOTHING
            """);

        if (inserted == 0)
        {
            await transaction.RollbackAsync();
            return false;
        }

        await _db.HealthPets.Where(p => p.UserId == userId).ExecuteUpdateAsync(s => s
            .SetProperty(p => p.TotalXp, p => p.TotalXp + xp)
            .SetProperty(p => p.Level, p => (p.TotalXp + xp) / GamificationRules.XpPerLevel + 1)
            .SetProperty(p => p.Exp, p => (p.TotalXp + xp) % GamificationRules.XpPerLevel)
            .SetProperty(p => p.LastUpdated, DateTime.UtcNow));
        await transaction.CommitAsync();
        return true;
    }

    // ───────────────────────────── Huy hiệu ─────────────────────────────

    private async Task UnlockBadgesAsync(Guid userId, DateOnly today, int waterGoal, double proteinTarget)
    {
        var have = (await _db.UserBadges.Where(b => b.UserId == userId).Select(b => b.BadgeId).ToListAsync()).ToHashSet();
        var earned = new List<string>();

        void Check(string id, bool condition)
        {
            if (condition && !have.Contains(id)) earned.Add(id);
        }

        var loggedDates = await LoggedDatesAsync(userId, today);
        var (_, longest) = StreakOf(loggedDates, today);
        Check(GamificationCatalog.FirstLog, loggedDates.Count > 0);
        Check(GamificationCatalog.Streak3, longest >= 3);
        Check(GamificationCatalog.Streak7, longest >= 7);
        Check(GamificationCatalog.Resilient30, longest >= 30);

        if (!have.Contains(GamificationCatalog.Hydrated))
            Check(GamificationCatalog.Hydrated, await _db.WaterLogs.Where(w => w.UserId == userId).GroupBy(w => w.LogDate).AnyAsync(g => g.Sum(w => w.AmountMl) >= waterGoal));

        if (!have.Contains(GamificationCatalog.EatClean7))
            Check(GamificationCatalog.EatClean7, await _db.UserChallenges.AnyAsync(uc => uc.UserId == userId && uc.IsCompleted && uc.Challenge.Category == "EatClean"));

        if (!have.Contains(GamificationCatalog.GroceryShopper))
            Check(GamificationCatalog.GroceryShopper, await _db.GroceryItems.AnyAsync(g => g.UserId == userId && g.IsChecked));

        if (!have.Contains(GamificationCatalog.AiSnap10))
            Check(GamificationCatalog.AiSnap10, await _db.DiaryItems.CountAsync(i => i.NutritionDiary.UserId == userId && i.LogMethod == "AiImage") >= GamificationCatalog.AiSnapTarget);

        if (!have.Contains(GamificationCatalog.ProteinGoal) && proteinTarget > 0)
        {
            var goalDays = await _db.DiaryItems
                .Where(i => i.NutritionDiary.UserId == userId)
                .GroupBy(i => i.NutritionDiary.LogDate)
                .CountAsync(g => g.Sum(i => i.ProteinGrams) >= proteinTarget);
            Check(GamificationCatalog.ProteinGoal, goalDays >= GamificationCatalog.ProteinGoalDays);
        }

        foreach (var id in earned)
        {
            await _db.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO "UserBadges" ("UserId","BadgeId","UnlockedAt") VALUES ({userId},{id},{DateTime.UtcNow})
                ON CONFLICT ("UserId","BadgeId") DO NOTHING
                """);
        }
    }

    private async Task<BadgesSummaryDto> BuildBadgesSummaryAsync(Guid userId, DateOnly today)
    {
        var pet = await _db.HealthPets.AsNoTracking().FirstAsync(p => p.UserId == userId);
        var (level, _) = GamificationRules.LevelOf(pet.TotalXp);
        var unlocked = await _db.UserBadges.AsNoTracking().Where(b => b.UserId == userId).ToDictionaryAsync(b => b.BadgeId, b => b.UnlockedAt);
        var loggedDates = await LoggedDatesAsync(userId, today);
        var (current, longest) = StreakOf(loggedDates, today);
        var completed = await _db.UserChallenges.CountAsync(uc => uc.UserId == userId && uc.IsCompleted);

        var badges = GamificationCatalog.Badges.Select(b => new BadgeDto
        {
            Id = b.Id,
            Title = b.Title,
            Description = b.Description,
            Unlocked = unlocked.ContainsKey(b.Id),
            UnlockedAt = unlocked.TryGetValue(b.Id, out var at) ? at : null
        }).ToList();

        return new BadgesSummaryDto
        {
            PetName = pet.PetName,
            Level = level,
            StreakDays = current,
            UnlockedBadgeCount = badges.Count(b => b.Unlocked),
            TotalBadgeCount = badges.Count,
            Badges = badges,
            Costumes = GamificationCatalog.Costumes.Select(c => new CostumeDto
            {
                Id = c.Id,
                Title = c.Title,
                UnlockDescription = c.UnlockDescription,
                Unlocked = GamificationCatalog.IsCostumeUnlocked(c.Id, level, longest, completed),
                Equipped = string.Equals(pet.CurrentOutfit, c.Id, StringComparison.OrdinalIgnoreCase)
            }).ToList()
        };
    }

    // ───────────────────────────── Nội bộ ─────────────────────────────

    private async Task<List<ChallengeDto>> BuildChallengeListAsync(Guid userId, DateOnly today)
    {
        var challenges = await _db.Challenges.AsNoTracking().Where(c => c.IsActive).OrderBy(c => c.DurationDays).ThenBy(c => c.Title).ToListAsync();
        var mine = await _db.UserChallenges.AsNoTracking().Where(uc => uc.UserId == userId).ToDictionaryAsync(uc => uc.ChallengeId);

        return challenges.Select(c =>
        {
            mine.TryGetValue(c.Id, out var uc);
            var end = uc?.StartDate.AddDays(c.DurationDays - 1);
            return new ChallengeDto
            {
                Id = c.Id,
                Title = c.Title,
                Description = c.Description,
                ImageUrl = c.ImageUrl,
                DurationDays = c.DurationDays,
                CompletedDays = uc?.CompletedDays ?? 0,
                RewardExp = c.RewardExp,
                RewardBadge = c.RewardBadge,
                IsJoined = uc != null,
                IsCompleted = uc?.IsCompleted ?? false,
                Category = c.Category,
                TargetValuePerDay = c.TargetValuePerDay,
                StartDate = uc?.StartDate,
                EndDate = end,
                CurrentDay = uc == null ? 0 : Math.Clamp(today.DayNumber - uc.StartDate.DayNumber + 1, 1, c.DurationDays),
                IsExpired = uc != null && !uc.IsCompleted && today > end
            };
        }).ToList();
    }

    /// <summary>Ngày (≤ hôm nay) người dùng có ghi ít nhất một món.</summary>
    private async Task<HashSet<DateOnly>> LoggedDatesAsync(Guid userId, DateOnly today)
    {
        var dates = await _db.DiaryItems.AsNoTracking()
            .Where(i => i.NutritionDiary.UserId == userId && i.NutritionDiary.LogDate <= today)
            .Select(i => i.NutritionDiary.LogDate)
            .Distinct()
            .ToListAsync();
        return dates.ToHashSet();
    }

    /// <summary>Chuỗi hiện tại (hôm nay chưa ghi thì tính tới hôm qua) và chuỗi dài nhất từng đạt; 0 khi chưa ghi gì.</summary>
    private static (int Current, int Longest) StreakOf(HashSet<DateOnly> dates, DateOnly today)
    {
        var current = 0;
        var cursor = dates.Contains(today) ? today : today.AddDays(-1);
        while (dates.Contains(cursor))
        {
            current++;
            cursor = cursor.AddDays(-1);
        }

        var longest = 0;
        var run = 0;
        DateOnly? previous = null;
        foreach (var d in dates.OrderBy(d => d))
        {
            run = previous is { } p && d == p.AddDays(1) ? run + 1 : 1;
            longest = Math.Max(longest, run);
            previous = d;
        }

        return (current, Math.Max(longest, current));
    }

    /// <summary>"Hôm nay" theo client, giới hạn trong ±1 ngày so với UTC (múi giờ lệch tối đa) để không nhận XP của ngày xa.</summary>
    private static DateOnly ResolveToday(DateOnly? date)
    {
        var utc = DateOnly.FromDateTime(DateTime.UtcNow);
        if (date is not { } requested || requested == default) return utc;
        if (requested < utc.AddDays(-1)) return utc.AddDays(-1);
        if (requested > utc.AddDays(1)) return utc.AddDays(1);
        return requested;
    }

    private static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };
}
