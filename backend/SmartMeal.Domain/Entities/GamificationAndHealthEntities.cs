namespace SmartMeal.Domain.Entities;

public class WaterLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public DateOnly LogDate { get; set; }
    public int AmountMl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class HealthSyncLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public DateOnly SyncDate { get; set; }
    public int StepCount { get; set; }
    public double ActiveCaloriesBurned { get; set; }
    public double DistanceMeters { get; set; }
    public string Source { get; set; } = "GoogleFit"; // HealthConnect, AppleHealth, GoogleFit, Manual
    public DateTime SyncedAt { get; set; } = DateTime.UtcNow;
}

public class HealthPet
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string PetName { get; set; } = "Bé Mầm";
    public string PetType { get; set; } = "Dino"; // Dino, Cat, Shiba

    /// <summary>Tổng XP đã nhận — nguồn sự thật. Level/Exp bên dưới luôn suy ra từ đây (500 XP mỗi cấp).</summary>
    public int TotalXp { get; set; } = 0;
    public int Level { get; set; } = 1;
    public int Exp { get; set; } = 0;
    public int NextLevelExp { get; set; } = 500;
    public string Stage { get; set; } = "Baby"; // Baby, Child, Teen, Adult
    public string Mood { get; set; } = "Happy"; // Happy, Hungry, Tired, Overfed

    /// <summary>Id trang phục đang mặc ("Default" = không mặc gì).</summary>
    public string CurrentOutfit { get; set; } = "Default";
    public string StatusMessage { get; set; } = "Bé Mầm đang rất vui vẻ và sẵn sàng cho bữa ăn lành mạnh!";

    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Sổ XP (BR-202: không cộng trùng XP cho cùng một sự kiện). <see cref="EventKey"/> xác định sự kiện, vd.
/// "breakfast-2026-08-03", "water-2026-08-03", "challenge-{id}"; (UserId, EventKey) là duy nhất.
/// </summary>
public class XpEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string EventKey { get; set; } = string.Empty;
    public string Kind { get; set; } = string.Empty; // Breakfast, Protein, Water, Challenge
    public int Xp { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Huy hiệu người dùng đã mở (mở rồi thì giữ, kể cả khi dữ liệu nguồn thay đổi sau đó).</summary>
public class UserBadge
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string BadgeId { get; set; } = string.Empty;
    public DateTime UnlockedAt { get; set; } = DateTime.UtcNow;
}

public class Challenge
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public int DurationDays { get; set; } = 7;
    public string Category { get; set; } = "EatClean"; // EatClean, DrinkWater, NoSugar, Exercise
    public int TargetValuePerDay { get; set; }
    public int RewardExp { get; set; } = 150;
    public string RewardBadge { get; set; } = "Clean Eater";
    public bool IsActive { get; set; } = true;

    public ICollection<UserChallenge> UserChallenges { get; set; } = new List<UserChallenge>();
}

public class UserChallenge
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public Guid ChallengeId { get; set; }
    public Challenge Challenge { get; set; } = null!;

    public DateOnly StartDate { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public int CompletedDays { get; set; } = 0;
    public bool IsCompleted { get; set; } = false;
    public DateTime? CompletedAt { get; set; }
}

public class RecipeCollection
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? CoverImageUrl { get; set; }
    public bool IsPublic { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<CollectionRecipe> CollectionRecipes { get; set; } = new List<CollectionRecipe>();
}

public class CollectionRecipe
{
    public Guid CollectionId { get; set; }
    public RecipeCollection Collection { get; set; } = null!;
    public Guid RecipeId { get; set; }
    public Recipe Recipe { get; set; } = null!;
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
}

