namespace SmartMeal.Application.DTOs.Gamification;

public class HealthPetStatusDto
{
    public string PetName { get; set; } = "Dino Healthy";
    public string PetType { get; set; } = "Dino";
    public int Level { get; set; } = 1;
    public int Exp { get; set; } = 0;
    public int NextLevelExp { get; set; } = 100;
    public string Stage { get; set; } = "Baby";
    public string Mood { get; set; } = "Happy"; // Happy, Hungry, Tired, Overfed
    public string StatusMessage { get; set; } = "Dino đang rất vui vẻ và sẵn sàng cho bữa ăn lành mạnh!";
    public string CurrentOutfit { get; set; } = "Default";
    public double NutritionScoreToday { get; set; } = 85.0;
}

public class StreakStatusDto
{
    public int CurrentStreak { get; set; } = 1;
    public int LongestStreak { get; set; } = 1;
    public int TotalActiveDays { get; set; } = 1;
    public bool HasLoggedToday { get; set; } = true;
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
    public int CompletedDays { get; set; }
    public int RewardExp { get; set; }
    public string RewardBadge { get; set; } = string.Empty;
    public bool IsJoined { get; set; }
    public bool IsCompleted { get; set; }
}
