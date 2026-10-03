namespace SmartMeal.Tests.Infrastructure;

// Bản sao kiểu của các DTO response (đọc JSON camelCase) dùng riêng cho test.

public sealed record DiaryItemPayload(
    Guid Id, string FoodName, double ServingSize, string Unit, double Calories, double CarbsGrams, double FatGrams,
    double ProteinGrams, string LogMethod, string MealType, DateOnly LogDate, DateTime CreatedAt, Guid? RecipeId,
    Guid? IngredientId, string? ImageUrl);

public sealed record MealGroupPayload(string MealType, double SubtotalCalories, List<DiaryItemPayload> Items);

public sealed record DailyPayload(
    DateOnly Date, double TotalCalories, double TotalCarbs, double TotalFat, double TotalProtein, double TargetCalories,
    double TargetCarbs, double TargetFat, double TargetProtein, List<MealGroupPayload> Meals);

public sealed record DailyProgressPayload(
    DateOnly Date, string DayOfWeek, double Calories, double TargetCalories, double ProteinGrams, double CarbsGrams,
    double FatGrams, double TargetProteinGrams, double TargetCarbsGrams, double TargetFatGrams);

public sealed record WeeklyPayload(List<DailyProgressPayload> Days);

public sealed record WaterSummaryPayload(Guid? EntryId, DateOnly Date, int TotalWaterMl, int GoalWaterMl, double Percentage);

public sealed record WaterEntryPayload(Guid Id, int AmountMl, DateTime CreatedAt);

public sealed record WaterDayPayload(DateOnly Date, int TotalMl, List<WaterEntryPayload> Entries);

public sealed record WaterHistoryPayload(int GoalMl, List<WaterDayPayload> Days);
