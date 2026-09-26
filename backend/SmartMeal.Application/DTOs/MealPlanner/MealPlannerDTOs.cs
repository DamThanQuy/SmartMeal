namespace SmartMeal.Application.DTOs.MealPlanner;

public class WeeklyMealPlanDto
{
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public double TargetDailyCalories { get; set; }
    public List<DailyPlanDto> Days { get; set; } = new();
}

public class DailyPlanDto
{
    public DateOnly Date { get; set; }
    public string DayOfWeek { get; set; } = string.Empty;
    public double TotalCalories { get; set; }
    public double TotalCarbs { get; set; }
    public double TotalProtein { get; set; }
    public double TotalFat { get; set; }
    public List<PlannedMealItemDto> Meals { get; set; } = new();
}

public class PlannedMealItemDto
{
    public Guid MealPlanId { get; set; }
    public string MealType { get; set; } = "Breakfast"; // Breakfast, Lunch, Dinner, Snack
    public Guid RecipeId { get; set; }
    public string RecipeTitle { get; set; } = string.Empty;
    public string? RecipeImageUrl { get; set; }
    public double Calories { get; set; }
    public double Carbs { get; set; }
    public double Protein { get; set; }
    public double Fat { get; set; }
    public int CookingTimeMinutes { get; set; }
    public bool IsCompleted { get; set; }
}

public class AssignMealPlanRequestDto
{
    public DateOnly PlanDate { get; set; }
    public string MealType { get; set; } = "Breakfast";
    public Guid RecipeId { get; set; }
}

public class AutoGeneratePlanRequestDto
{
    public DateOnly? StartDate { get; set; }
    public string? DietTag { get; set; }
    public double? TargetDailyCalories { get; set; }
    public bool IncludeSnack { get; set; } = false;
}
