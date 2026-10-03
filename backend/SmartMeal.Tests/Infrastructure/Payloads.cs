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

public sealed record AiQuotaPayload(bool IsUnlimited, int? Limit, int Used, int? Remaining, DateTime ResetsAt);

public sealed record SnapPayload(string DishName, double EstimatedGrams, double Calories, List<string> DetectedIngredients, List<string> AllergyWarnings, bool IsDemo);

public sealed record SafetyAlertPayload(string Type, string Message, string Severity);

public sealed record SafetyPayload(bool IsSafe, List<SafetyAlertPayload> Alerts, List<string> DetectedIngredients, bool IsDemo);

public sealed record VoicePayload(string MealType, double TotalCalories, bool IsDemo);

public sealed record SyncResultPayload(DateOnly Date, int Steps, double BurnedCalories, double DistanceMeters, string Source, DateTime SyncedAt);

public sealed record RecipeIngredientPayload(
    Guid IngredientId, string Name, double Amount, string Unit, decimal EstimatedPriceVnd, List<int> AllergyIds);

public sealed record RecipePayload(
    Guid Id, string Title, string? Description, string? ImageUrl, string Instructions, int PrepTimeMinutes, int CookTimeMinutes,
    int TotalTimeMinutes, int Servings, string Difficulty, bool IsPremium, double CaloriesPerServing, double CarbsPerServing,
    double FatPerServing, double ProteinPerServing, List<string> Tags, List<string> MealTypes, List<int> AllergyIds,
    bool IsFavorite, List<RecipeIngredientPayload> Ingredients);

public sealed record CollectionPayload(
    Guid Id, string Name, string? Description, string? CoverImageUrl, int RecipeCount, bool IsPublic, Guid OwnerId,
    bool IsOwner, List<RecipePayload> Recipes);

public sealed record FavoritePayload(bool IsFavorite, int TotalFavorites);

public sealed record PlannedMealPayload(
    Guid MealPlanId, string MealType, Guid RecipeId, string RecipeTitle, string? RecipeImageUrl, double Calories, double Carbs,
    double Protein, double Fat, int CookingTimeMinutes, bool IsCompleted);

public sealed record PlanDayPayload(
    DateOnly Date, string DayOfWeek, double TotalCalories, double TotalCarbs, double TotalProtein, double TotalFat,
    List<PlannedMealPayload> Meals);

public sealed record WeeklyPlanPayload(DateOnly StartDate, DateOnly EndDate, double TargetDailyCalories, List<PlanDayPayload> Days);

public sealed record GroceryItemPayload(
    Guid Id, string IngredientName, double Amount, string Unit, string Category, decimal EstimatedPriceVnd, bool IsChecked,
    string? RecipeTitle, int MergedFromRecipeCount);

public sealed record GroceryCategoryPayload(string CategoryName, List<GroceryItemPayload> Items);

public sealed record GroceryPayload(int TotalItems, int CheckedItems, decimal TotalEstimatedCostVnd, List<GroceryCategoryPayload> Categories);

public sealed record FoodServingPayload(Guid Id, string Label, double Grams);

public sealed record FoodPayload(
    Guid Id, string Name, string? Description, string? ImageUrl, string Category, string DefaultUnit, decimal EstimatedPriceVnd,
    double CaloriesPer100g, double CarbsPer100g, double FatPer100g, double ProteinPer100g, double FiberPer100g, double SugarPer100g,
    double SodiumMgPer100g, int? AllergyId, string? AllergyName, List<int> AllergyIds, bool IsVerified, bool IsUserCreated,
    bool IsFavorite, string? Barcode, List<FoodServingPayload> Servings, Guid? DefaultServingId);

public sealed record FoodFavoritePayload(bool IsFavorite);
