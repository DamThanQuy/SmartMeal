namespace SmartMeal.Application.Common;

/// <summary>Hằng số và công thức XP/cấp độ — một nơi duy nhất để client và server không lệch nhau.</summary>
public static class GamificationRules
{
    /// <summary>Số XP cần cho mỗi cấp (design Pet: "Level 5, 400/500 XP").</summary>
    public const int XpPerLevel = 500;

    public const int BreakfastXp = 10;
    public const int ProteinXp = 20;
    public const int WaterXp = 10;

    /// <summary>Mục tiêu nước mặc định (ml) khi người dùng chưa có hồ sơ sức khỏe.</summary>
    public const int DefaultWaterGoalMl = 2000;

    public static (int Level, int XpIntoLevel) LevelOf(int totalXp)
    {
        var xp = Math.Max(0, totalXp);
        return (xp / XpPerLevel + 1, xp % XpPerLevel);
    }

    public static string StageOf(int level) => level switch
    {
        < 3 => "Baby",
        < 6 => "Child",
        < 10 => "Teen",
        _ => "Adult"
    };
}

public sealed record BadgeDefinition(string Id, string Title, string Description);

public sealed record CostumeDefinition(string Id, string Title, string UnlockDescription);

/// <summary>Danh mục huy hiệu và trang phục theo design (Badges.dc.html). Id ổn định, client lưu và so khớp theo id.</summary>
public static class GamificationCatalog
{
    public const string FirstLog = "first-log";
    public const string Streak3 = "streak-3";
    public const string Hydrated = "hydrated";
    public const string Streak7 = "streak-7";
    public const string EatClean7 = "eat-clean-7";
    public const string GroceryShopper = "grocery-shopper";
    public const string AiSnap10 = "ai-snap-10";
    public const string ProteinGoal = "protein-goal";
    public const string Resilient30 = "resilient-30";

    public const string StrawHat = "straw-hat";
    public const string Sunglasses = "sunglasses";
    public const string GreenScarf = "green-scarf";
    public const string Backpack = "backpack";

    /// <summary>Giá trị lưu khi không mặc trang phục nào.</summary>
    public const string NoOutfit = "Default";

    /// <summary>Số bản ghi AI Snap cần cho huy hiệu "AI Snap 10".</summary>
    public const int AiSnapTarget = 10;

    /// <summary>Số ngày đạt mục tiêu protein cần cho huy hiệu "Đủ protein".</summary>
    public const int ProteinGoalDays = 5;

    public static readonly IReadOnlyList<BadgeDefinition> Badges = new[]
    {
        new BadgeDefinition(FirstLog, "Khởi đầu", "Ghi bữa đầu tiên"),
        new BadgeDefinition(Streak3, "Chuỗi 3 ngày", "3 ngày liên tiếp"),
        new BadgeDefinition(Hydrated, "Đủ nước", "Uống đủ mục tiêu nước trong một ngày"),
        new BadgeDefinition(Streak7, "Chuỗi 7 ngày", "7 ngày liên tiếp"),
        new BadgeDefinition(EatClean7, "Eat Clean", "Hoàn thành thử thách Eat Clean"),
        new BadgeDefinition(GroceryShopper, "Người đi chợ", "Hoàn tất 1 lần đi chợ"),
        new BadgeDefinition(AiSnap10, "AI Snap 10", "Chụp 10 bữa"),
        new BadgeDefinition(ProteinGoal, "Đủ protein", "Đạt mục tiêu protein 5 ngày"),
        new BadgeDefinition(Resilient30, "Bền bỉ", "30 ngày liên tiếp")
    };

    public static readonly IReadOnlyList<CostumeDefinition> Costumes = new[]
    {
        new CostumeDefinition(StrawHat, "Mũ lá", "Mở ở Level 3"),
        new CostumeDefinition(Sunglasses, "Kính râm", "Mở ở Level 6"),
        new CostumeDefinition(GreenScarf, "Khăn xanh", "Mở khi đạt chuỗi 7 ngày"),
        new CostumeDefinition(Backpack, "Ba lô", "Mở khi hoàn thành 1 thử thách")
    };

    /// <summary>
    /// Trang phục đã mở hay chưa. Chuỗi dùng chuỗi dài nhất từng đạt (không "khóa lại" khi chuỗi hiện tại đứt).
    /// </summary>
    public static bool IsCostumeUnlocked(string costumeId, int level, int longestStreak, int completedChallenges) => costumeId switch
    {
        StrawHat => level >= 3,
        Sunglasses => level >= 6,
        GreenScarf => longestStreak >= 7,
        Backpack => completedChallenges > 0,
        _ => false
    };
}
