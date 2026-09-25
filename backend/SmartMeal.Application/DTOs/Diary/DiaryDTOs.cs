namespace SmartMeal.Application.DTOs.Diary;

public class LogMealRequestDto
{
    public DateOnly LogDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public string MealType { get; set; } = "Breakfast"; // Breakfast, Lunch, Dinner, Snack
    public string FoodName { get; set; } = string.Empty;
    public Guid? RecipeId { get; set; }
    public Guid? IngredientId { get; set; }
    public double ServingSize { get; set; } = 1.0;
    public string Unit { get; set; } = "phần";
    public double Calories { get; set; }
    public double CarbsGrams { get; set; }
    public double FatGrams { get; set; }
    public double ProteinGrams { get; set; }
    public string LogMethod { get; set; } = "Manual"; // Manual, AiImage, Voice, Barcode
    public string? ImageUrl { get; set; }
}

public class DailyDiarySummaryDto
{
    public DateOnly Date { get; set; }
    public double TotalCalories { get; set; }
    public double TotalCarbs { get; set; }
    public double TotalFat { get; set; }
    public double TotalProtein { get; set; }

    // Target Goals
    public double TargetCalories { get; set; }
    public double TargetCarbs { get; set; }
    public double TargetFat { get; set; }
    public double TargetProtein { get; set; }

    public List<MealGroupDto> Meals { get; set; } = new();
}

public class MealGroupDto
{
    public string MealType { get; set; } = string.Empty;
    public double SubtotalCalories { get; set; }
    public List<DiaryItemDto> Items { get; set; } = new();
}

public class DiaryItemDto
{
    public Guid Id { get; set; }
    public string FoodName { get; set; } = string.Empty;
    public double ServingSize { get; set; }
    public string Unit { get; set; } = string.Empty;
    public double Calories { get; set; }
    public double CarbsGrams { get; set; }
    public double FatGrams { get; set; }
    public double ProteinGrams { get; set; }
    public string LogMethod { get; set; } = "Manual";
}

public class WeeklyProgressDto
{
    public List<DailyProgressPointDto> Days { get; set; } = new();
}

public class DailyProgressPointDto
{
    public DateOnly Date { get; set; }
    public string DayOfWeek { get; set; } = string.Empty;
    public double Calories { get; set; }
    public double TargetCalories { get; set; }
}
