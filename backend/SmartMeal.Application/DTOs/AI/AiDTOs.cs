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
}

public class FridgeScannerResponseDto
{
    public List<string> DetectedIngredients { get; set; } = new();
    public List<FridgeRecipeSuggestionDto> SuggestedRecipes { get; set; } = new();
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

public class CheckSafetyRequestDto
{
    public string? Barcode { get; set; }
    public string? OcrRawText { get; set; }
}

public class CheckSafetyResponseDto
{
    public bool IsSafe { get; set; } = true;
    public List<SafetyAlertDto> Alerts { get; set; } = new();
    public List<string> DetectedIngredients { get; set; } = new();
    public ExtractedNutritionFactsDto? ExtractedNutrition { get; set; }
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
