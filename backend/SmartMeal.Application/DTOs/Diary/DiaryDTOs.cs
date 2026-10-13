using System.ComponentModel.DataAnnotations;
using SmartMeal.Application.Common;
using SmartMeal.Application.Common.Validation;

namespace SmartMeal.Application.DTOs.Diary;

/// <summary>Một món ăn cần ghi vào nhật ký (dùng chung cho ghi đơn lẻ và ghi hàng loạt).</summary>
public class DiaryItemInputDto
{
    [Required(ErrorMessage = "Tên món ăn là bắt buộc.")]
    [StringLength(200, ErrorMessage = "Tên món ăn tối đa 200 ký tự.")]
    public string FoodName { get; set; } = string.Empty;

    public Guid? RecipeId { get; set; }
    public Guid? IngredientId { get; set; }

    [Range(0.01, 100000, ErrorMessage = "Khẩu phần phải lớn hơn 0.")]
    public double ServingSize { get; set; } = 1.0;

    [Required(ErrorMessage = "Đơn vị là bắt buộc.")]
    [StringLength(30, ErrorMessage = "Đơn vị tối đa 30 ký tự.")]
    public string Unit { get; set; } = "phần";

    [Range(0, 10000, ErrorMessage = "Calo phải từ 0 đến 10000.")]
    public double Calories { get; set; }

    [Range(0, 2000, ErrorMessage = "Carbs phải từ 0 đến 2000 g.")]
    public double CarbsGrams { get; set; }

    [Range(0, 2000, ErrorMessage = "Chất béo phải từ 0 đến 2000 g.")]
    public double FatGrams { get; set; }

    [Range(0, 2000, ErrorMessage = "Protein phải từ 0 đến 2000 g.")]
    public double ProteinGrams { get; set; }

    [OneOfIgnoreCase("Manual", "AiImage", "Voice", "Barcode", "Ocr")]
    public string LogMethod { get; set; } = "Manual"; // Manual, AiImage, Voice, Barcode, Ocr

    [StringLength(500, ErrorMessage = "Đường dẫn ảnh tối đa 500 ký tự.")]
    public string? ImageUrl { get; set; }
}

public class LogMealRequestDto : DiaryItemInputDto
{
    [DateNotAfterToday(1)]
    public DateOnly LogDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);

    [Required(ErrorMessage = "mealType là bắt buộc.")]
    [OneOfIgnoreCase("Breakfast", "Lunch", "Dinner", "Snack")]
    public string MealType { get; set; } = MealTypes.Breakfast; // Breakfast, Lunch, Dinner, Snack (không phân biệt hoa/thường)
}

/// <summary>Ghi nhiều món vào cùng một bữa trong một lần gọi — hoặc tất cả được lưu, hoặc không món nào.</summary>
public class LogMealBatchRequestDto
{
    [DateNotAfterToday(1)]
    public DateOnly LogDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);

    [Required(ErrorMessage = "mealType là bắt buộc.")]
    [OneOfIgnoreCase("Breakfast", "Lunch", "Dinner", "Snack")]
    public string MealType { get; set; } = MealTypes.Breakfast;

    [Required(ErrorMessage = "Danh sách món ăn là bắt buộc.")]
    [MinLength(1, ErrorMessage = "Cần ít nhất một món ăn.")]
    [MaxLength(50, ErrorMessage = "Mỗi lần ghi tối đa 50 món.")]
    public List<DiaryItemInputDto> Items { get; set; } = new();
}

/// <summary>Sửa một món đã ghi (BR-053). Chỉ các trường có mặt mới được thay đổi.</summary>
public class UpdateDiaryItemRequestDto
{
    [OneOfIgnoreCase("Breakfast", "Lunch", "Dinner", "Snack")]
    public string? MealType { get; set; }

    [DateNotAfterToday(1)]
    public DateOnly? LogDate { get; set; }

    [StringLength(200, MinimumLength = 1, ErrorMessage = "Tên món ăn phải từ 1 đến 200 ký tự.")]
    public string? FoodName { get; set; }

    [Range(0.01, 100000, ErrorMessage = "Khẩu phần phải lớn hơn 0.")]
    public double? ServingSize { get; set; }

    [StringLength(30, MinimumLength = 1, ErrorMessage = "Đơn vị phải từ 1 đến 30 ký tự.")]
    public string? Unit { get; set; }

    [Range(0, 10000, ErrorMessage = "Calo phải từ 0 đến 10000.")]
    public double? Calories { get; set; }

    [Range(0, 2000, ErrorMessage = "Carbs phải từ 0 đến 2000 g.")]
    public double? CarbsGrams { get; set; }

    [Range(0, 2000, ErrorMessage = "Chất béo phải từ 0 đến 2000 g.")]
    public double? FatGrams { get; set; }

    [Range(0, 2000, ErrorMessage = "Protein phải từ 0 đến 2000 g.")]
    public double? ProteinGrams { get; set; }
}

public class DailyDiarySummaryDto
{
    public DateOnly Date { get; set; }
    public double TotalCalories { get; set; }
    public double TotalCarbs { get; set; }
    public double TotalFat { get; set; }
    public double TotalProtein { get; set; }

    // Targets from health profile
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

    /// <summary>Bữa ăn chứa món này (dạng chuẩn Breakfast/Lunch/Dinner/Snack).</summary>
    public string MealType { get; set; } = MealTypes.Breakfast;

    /// <summary>Ngày của nhật ký chứa món này.</summary>
    public DateOnly LogDate { get; set; }

    /// <summary>Thời điểm ghi món (UTC).</summary>
    public DateTime CreatedAt { get; set; }

    public Guid? RecipeId { get; set; }
    public Guid? IngredientId { get; set; }
    public string? ImageUrl { get; set; }
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

    public double ProteinGrams { get; set; }
    public double CarbsGrams { get; set; }
    public double FatGrams { get; set; }
    public double TargetProteinGrams { get; set; }
    public double TargetCarbsGrams { get; set; }
    public double TargetFatGrams { get; set; }
}
