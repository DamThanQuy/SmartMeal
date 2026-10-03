using System.ComponentModel.DataAnnotations;

namespace SmartMeal.Application.DTOs.AI;

public class SnapAndTrackResponseDto
{
    public string DishName { get; set; } = string.Empty;
    public double EstimatedGrams { get; set; }
    public double ConfidenceScore { get; set; }
    public double Calories { get; set; }
    public double Carbs { get; set; }
    public double Protein { get; set; }
    public double Fat { get; set; }
    public List<string> DetectedIngredients { get; set; } = new();
    public List<string> AllergyWarnings { get; set; } = new();
    public string? HealthTips { get; set; }

    /// <summary>True khi đây là dữ liệu MẪU (chưa cấu hình Gemini, chỉ ở môi trường phát triển), không phải kết quả thật.</summary>
    public bool IsDemo { get; set; }
}

public class FridgeScannerResponseDto
{
    public List<string> DetectedIngredients { get; set; } = new();
    public List<FridgeRecipeSuggestionDto> SuggestedRecipes { get; set; } = new();
    public bool IsDemo { get; set; }
}

public class FridgeRecipeSuggestionDto
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double Calories { get; set; }
    public int CookingTimeMinutes { get; set; }
    public List<string> MatchingIngredients { get; set; } = new();
    public List<string> MissingIngredients { get; set; } = new();
    public string QuickInstructions { get; set; } = string.Empty;
}

public class VoiceLogRequestDto
{
    [Required(ErrorMessage = "Nội dung giọng nói không được để trống.")]
    [StringLength(1000, MinimumLength = 2, ErrorMessage = "Nội dung giọng nói phải từ 2 đến 1000 ký tự.")]
    public string Transcript { get; set; } = string.Empty;
}

public class VoiceLogResponseDto
{
    public string MealType { get; set; } = "Breakfast"; // Breakfast, Lunch, Dinner, Snack
    public List<ExtractedMealItemDto> ExtractedItems { get; set; } = new();
    public double TotalCalories { get; set; }
    public double TotalCarbs { get; set; }
    public double TotalProtein { get; set; }
    public double TotalFat { get; set; }
    public bool IsDemo { get; set; }
}

public class ExtractedMealItemDto
{
    public string FoodName { get; set; } = string.Empty;
    public string PortionDescription { get; set; } = string.Empty;
    public double PortionGrams { get; set; }
    public double Calories { get; set; }
    public double Carbs { get; set; }
    public double Protein { get; set; }
    public double Fat { get; set; }
}

/// <summary>Cần ít nhất một trong <c>barcode</c> hoặc <c>ocrRawText</c>.</summary>
public class CheckSafetyRequestDto : IValidatableObject
{
    [RegularExpression(@"^[0-9A-Za-z\-]{4,64}$", ErrorMessage = "Mã vạch không hợp lệ.")]
    public string? Barcode { get; set; }

    [StringLength(5000, ErrorMessage = "Văn bản OCR tối đa 5000 ký tự.")]
    public string? OcrRawText { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(Barcode) && string.IsNullOrWhiteSpace(OcrRawText))
        {
            yield return new ValidationResult("Cần cung cấp barcode hoặc ocrRawText.", new[] { nameof(Barcode), nameof(OcrRawText) });
        }
    }
}

public class CheckSafetyResponseDto
{
    public bool IsSafe { get; set; } = true;
    public List<SafetyAlertDto> Alerts { get; set; } = new();
    public List<string> DetectedIngredients { get; set; } = new();
    public ExtractedNutritionFactsDto? ExtractedNutrition { get; set; }
    public bool IsDemo { get; set; }
}

public class SafetyAlertDto
{
    public string Type { get; set; } = "WARNING"; // ALLERGY, HIGH_SODIUM, HIGH_SUGAR, MEDICAL_WARNING
    public string Message { get; set; } = string.Empty;
    public string Severity { get; set; } = "WARNING"; // INFO, WARNING, DANGER
}

public class ExtractedNutritionFactsDto
{
    public double CaloriesPerServing { get; set; }
    public string ServingSize { get; set; } = string.Empty;
    public double SugarGrams { get; set; }
    public double SodiumMg { get; set; }
    public double TotalFatGrams { get; set; }
}

/// <summary>Hạn mức AI trong ngày (BR-233). Tài khoản Pro không giới hạn.</summary>
public class AiQuotaDto
{
    public bool IsUnlimited { get; set; }

    /// <summary>Số lượt miễn phí mỗi ngày; null nếu không giới hạn.</summary>
    public int? Limit { get; set; }

    public int Used { get; set; }

    /// <summary>Số lượt còn lại hôm nay; null nếu không giới hạn.</summary>
    public int? Remaining { get; set; }

    /// <summary>Thời điểm hạn mức được làm mới (UTC).</summary>
    public DateTime ResetsAt { get; set; }
}
