namespace SmartMeal.Application.DTOs.Gamification;

public class PetTaskDto
{
    /// <summary>breakfast | protein | water.</summary>
    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int XpReward { get; set; }
    public double ProgressCurrent { get; set; }
    public double ProgressTarget { get; set; }

    /// <summary>Đơn vị của tiến độ: "bữa", "g" hoặc "ml".</summary>
    public string Unit { get; set; } = string.Empty;

    public bool Completed { get; set; }
}

public class HealthPetStatusDto
{
    public string PetName { get; set; } = "Bé Mầm";
    public string PetType { get; set; } = "Dino";
    public int Level { get; set; } = 1;

    /// <summary>XP đang có trong cấp hiện tại (0 → <see cref="XpPerLevel"/>). Giữ tên cũ để tương thích.</summary>
    public int Exp { get; set; } = 0;

    /// <summary>XP cần cho một cấp (500). Giữ tên cũ để tương thích.</summary>
    public int NextLevelExp { get; set; } = 500;

    public int TotalXp { get; set; }
    public int XpIntoLevel { get; set; }
    public int XpPerLevel { get; set; } = 500;
    public string Stage { get; set; } = "Baby";
    public string Mood { get; set; } = "Happy"; // Happy, Hungry
    public string StatusMessage { get; set; } = string.Empty;

    /// <summary>Id trang phục đang mặc; "Default" = không mặc.</summary>
    public string CurrentOutfit { get; set; } = "Default";

    public double NutritionScoreToday { get; set; }

    /// <summary>Nhiệm vụ hôm nay (ghi bữa sáng, đạt protein, uống đủ nước) kèm tiến độ; làm xong được cộng XP đúng một lần mỗi ngày (BR-202).</summary>
    public List<PetTaskDto> Tasks { get; set; } = new();
}

public class StreakStatusDto
{
    /// <summary>Số ngày liên tiếp có ghi nhật ký tính đến hôm nay (hôm nay chưa ghi thì tính tới hôm qua). 0 nếu chưa có.</summary>
    public int CurrentStreak { get; set; }
    public int LongestStreak { get; set; }
    public int TotalActiveDays { get; set; }
    public bool HasLoggedToday { get; set; }
    public List<StreakDayDto> RecentActivity { get; set; } = new();
}

public class StreakDayDto
{
    public DateOnly Date { get; set; }
    public string DayOfWeek { get; set; } = string.Empty;
    public bool HasLogged { get; set; }
}

public class ChallengeDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public int DurationDays { get; set; }

    /// <summary>Số ngày trong khung đã đạt mục tiêu của thử thách.</summary>
    public int CompletedDays { get; set; }

    public int RewardExp { get; set; }
    public string RewardBadge { get; set; } = string.Empty;
    public bool IsJoined { get; set; }
    public bool IsCompleted { get; set; }

    /// <summary>DrinkWater | EatClean | Exercise | NoSugar.</summary>
    public string Category { get; set; } = string.Empty;

    /// <summary>Mục tiêu mỗi ngày: ml nước (DrinkWater), số nhóm bữa đã ghi (EatClean), số bước (Exercise).</summary>
    public int TargetValuePerDay { get; set; }

    /// <summary>Ngày bắt đầu/kết thúc khung của người dùng (null khi chưa tham gia). Kết thúc = bắt đầu + durationDays − 1.</summary>
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }

    /// <summary>Hôm nay là ngày thứ mấy của khung (1…durationDays); 0 khi chưa tham gia.</summary>
    public int CurrentDay { get; set; }

    /// <summary>Đã hết khung mà chưa hoàn thành — tham gia lại sẽ bắt đầu khung mới.</summary>
    public bool IsExpired { get; set; }
}

public class BadgeDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool Unlocked { get; set; }
    public DateTime? UnlockedAt { get; set; }
}

public class CostumeDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string UnlockDescription { get; set; } = string.Empty;
    public bool Unlocked { get; set; }
    public bool Equipped { get; set; }
}

public class BadgesSummaryDto
{
    public string PetName { get; set; } = "Bé Mầm";
    public int Level { get; set; }
    public int StreakDays { get; set; }
    public int UnlockedBadgeCount { get; set; }
    public int TotalBadgeCount { get; set; }
    public List<BadgeDto> Badges { get; set; } = new();
    public List<CostumeDto> Costumes { get; set; } = new();
}
