using Microsoft.EntityFrameworkCore;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Gamification;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.Infrastructure.Services;

public class GamificationService : IGamificationService
{
    private readonly ApplicationDbContext _db;

    public GamificationService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<ApiResponse<HealthPetStatusDto>> GetPetStatusAsync(Guid userId)
    {
        var pet = await _db.HealthPets.FirstOrDefaultAsync(p => p.UserId == userId);
        if (pet == null)
        {
            pet = new HealthPet
            {
                UserId = userId,
                PetName = "Dino Healthy",
                PetType = "Dino",
                Level = 1,
                Exp = 20,
                Stage = "Baby",
                Mood = "Happy",
                CurrentOutfit = "Default",
                StatusMessage = "Dino đang rất vui vẻ và sẵn sàng cho bữa ăn lành mạnh!"
            };
            _db.HealthPets.Add(pet);
            await _db.SaveChangesAsync();
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var diaries = await _db.NutritionDiaries
            .Include(d => d.Items)
            .Where(d => d.UserId == userId && d.LogDate == today)
            .ToListAsync();

        double loggedCalories = diaries.SelectMany(d => d.Items).Sum(i => i.Calories);
        double nutritionScore = loggedCalories > 0 ? Math.Min(100.0, 70.0 + (diaries.Count * 10)) : 50.0;

        return ApiResponse<HealthPetStatusDto>.Ok(new HealthPetStatusDto
        {
            PetName = pet.PetName,
            PetType = pet.PetType,
            Level = pet.Level,
            Exp = pet.Exp,
            NextLevelExp = pet.Level * 100,
            Stage = pet.Stage,
            Mood = pet.Mood,
            StatusMessage = pet.StatusMessage,
            CurrentOutfit = pet.CurrentOutfit,
            NutritionScoreToday = nutritionScore
        });
    }

    public async Task<ApiResponse<StreakStatusDto>> GetStreakStatusAsync(Guid userId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var loggedDates = await _db.NutritionDiaries
            .Where(d => d.UserId == userId)
            .Select(d => d.LogDate)
            .Distinct()
            .OrderByDescending(d => d)
            .ToListAsync();

        bool hasLoggedToday = loggedDates.Contains(today);

        // Calculate current streak
        int currentStreak = 0;
        var checkDate = hasLoggedToday ? today : today.AddDays(-1);

        while (loggedDates.Contains(checkDate))
        {
            currentStreak++;
            checkDate = checkDate.AddDays(-1);
        }

        if (currentStreak == 0 && hasLoggedToday) currentStreak = 1;

        // Longest streak
        int longestStreak = Math.Max(currentStreak, 1);
        int tempStreak = 0;
        var orderedAsc = loggedDates.OrderBy(d => d).ToList();
        for (int i = 0; i < orderedAsc.Count; i++)
        {
            if (i > 0 && orderedAsc[i] == orderedAsc[i - 1].AddDays(1))
            {
                tempStreak++;
            }
            else
            {
                tempStreak = 1;
            }
            if (tempStreak > longestStreak) longestStreak = tempStreak;
        }

        // Recent 7 days activity
        var recentDays = new List<StreakDayDto>();
        for (int i = 6; i >= 0; i--)
        {
            var d = today.AddDays(-i);
            recentDays.Add(new StreakDayDto
            {
                Date = d,
                DayOfWeek = d.DayOfWeek.ToString().Substring(0, 3),
                HasLogged = loggedDates.Contains(d)
            });
        }

        var result = new StreakStatusDto
        {
            CurrentStreak = currentStreak == 0 ? 1 : currentStreak,
            LongestStreak = longestStreak,
            TotalActiveDays = Math.Max(loggedDates.Count, 1),
            HasLoggedToday = hasLoggedToday,
            RecentActivity = recentDays
        };

        return ApiResponse<StreakStatusDto>.Ok(result);
    }

    public async Task<ApiResponse<List<ChallengeDto>>> GetChallengesAsync(Guid userId)
    {
        var challenges = await _db.Challenges
            .Where(c => c.IsActive)
            .AsNoTracking()
            .ToListAsync();

        var userChallenges = await _db.UserChallenges
            .Where(uc => uc.UserId == userId)
            .AsNoTracking()
            .ToListAsync();

        var list = challenges.Select(c =>
        {
            var uc = userChallenges.FirstOrDefault(u => u.ChallengeId == c.Id);
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
                IsCompleted = uc?.IsCompleted ?? false
            };
        }).ToList();

        return ApiResponse<List<ChallengeDto>>.Ok(list);
    }

    public async Task<ApiResponse<ChallengeDto>> JoinChallengeAsync(Guid userId, Guid challengeId)
    {
        var challenge = await _db.Challenges.FindAsync(challengeId);
        if (challenge == null)
            return ApiResponse<ChallengeDto>.Fail("Không tìm thấy thử thách.");

        var existing = await _db.UserChallenges
            .FirstOrDefaultAsync(uc => uc.UserId == userId && uc.ChallengeId == challengeId);

        if (existing == null)
        {
            existing = new UserChallenge
            {
                UserId = userId,
                ChallengeId = challengeId,
                JoinedAt = DateTime.UtcNow,
                CompletedDays = 1,
                IsCompleted = false
            };
            _db.UserChallenges.Add(existing);
            await _db.SaveChangesAsync();
        }

        var dto = new ChallengeDto
        {
            Id = challenge.Id,
            Title = challenge.Title,
            Description = challenge.Description,
            ImageUrl = challenge.ImageUrl,
            DurationDays = challenge.DurationDays,
            CompletedDays = existing.CompletedDays,
            RewardExp = challenge.RewardExp,
            RewardBadge = challenge.RewardBadge,
            IsJoined = true,
            IsCompleted = existing.IsCompleted
        };

        return ApiResponse<ChallengeDto>.Ok(dto, "Tham gia thử thách thành công.");
    }
}
