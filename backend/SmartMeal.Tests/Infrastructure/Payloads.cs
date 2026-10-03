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

public sealed record HealthProfilePayload(
    Guid Id, string Gender, int Age, DateOnly? DateOfBirth, double HeightCm, double CurrentWeightKg, double TargetWeightKg,
    string ActivityLevel, string Goal, int WaterGoalMl, double Bmi, string BmiClassification, double Bmr, double Tdee,
    double DailyCaloriesTarget, double DailyCarbsTargetGrams, double DailyFatTargetGrams, double DailyProteinTargetGrams,
    List<string> Allergies, List<string> MedicalConditions, List<string> DietaryPreferences,
    List<int> AllergyIds, List<int> MedicalConditionIds, List<int> DietaryPreferenceIds);

public sealed record WeightPointPayload(Guid Id, double WeightKg, DateTime RecordedAt, double DiffFromTargetKg);

public sealed record WeightHistoryPayload(
    double CurrentWeightKg, double TargetWeightKg, double InitialWeightKg, double TotalWeightChangedKg, double Bmi,
    string BmiCategory, List<WeightPointPayload> History);

public sealed record MetaItemPayload(int Id, string Code, string Name, string? Description);

public sealed record HealthSyncSummaryPayload(
    DateOnly Date, int Steps, int StepGoal, double BurnedCalories, double ConsumedCalories, double NetCalories,
    double TargetCalories, double RemainingCalories, double DistanceMeters, List<string> Sources, string? ActiveSource,
    DateTime? LastSyncedAt);

public sealed record SyncResultPayload(DateOnly Date, int Steps, double BurnedCalories, double DistanceMeters, string Source, DateTime SyncedAt);
