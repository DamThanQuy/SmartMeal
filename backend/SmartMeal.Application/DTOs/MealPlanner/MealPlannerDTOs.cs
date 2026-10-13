using System.ComponentModel.DataAnnotations;
using SmartMeal.Application.Common.Validation;

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
    [Required(ErrorMessage = "Vui lòng chọn ngày cho bữa ăn.")]
    public DateOnly PlanDate { get; set; }

    [Required(ErrorMessage = "Vui lòng chọn loại bữa ăn.")]
    [OneOfIgnoreCase("Breakfast", "Lunch", "Dinner", "Snack", ErrorMessage = "Loại bữa ăn phải là một trong các giá trị: Breakfast, Lunch, Dinner, Snack.")]
    public string MealType { get; set; } = "Breakfast";

    [Required(ErrorMessage = "Vui lòng chọn món ăn.")]
    public Guid RecipeId { get; set; }
}

public class CompleteMealPlanRequestDto
{
    /// <summary>true = đã nấu/ăn, false = bỏ đánh dấu. Bỏ trống = true.</summary>
    public bool IsCompleted { get; set; } = true;
}

public class AutoGeneratePlanRequestDto
{
    public DateOnly? StartDate { get; set; }

    [StringLength(50, ErrorMessage = "Chế độ ăn tối đa 50 ký tự.")]
    public string? DietTag { get; set; }

    public double? TargetDailyCalories { get; set; }
    public bool IncludeSnack { get; set; } = false;

    /// <summary>true = chỉ điền các ô còn trống, giữ nguyên món người dùng đã chọn (BR-163). Mặc định false = tạo lại cả tuần.</summary>
    public bool KeepExisting { get; set; } = false;
}
