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

    /// <summary>
    /// URL ảnh vừa phân tích, đã lưu ở máy chủ — app gửi lại trong <c>imageUrl</c> khi ghi món để nhật ký hiện ảnh món.
    /// Null nếu không lưu được ảnh.
    /// </summary>
    public string? ImageUrl { get; set; }
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

    /// <summary>Câu người dùng đã nói: văn bản gửi lên (voice-log) hoặc bản chép lời AI nghe được từ file ghi âm (voice-log/audio).</summary>
    public string Transcript { get; set; } = string.Empty;

    public List<ExtractedMealItemDto> ExtractedItems { get; set; } = new();
    public double TotalCalories { get; set; }
    public double TotalCarbs { get; set; }
    public double TotalProtein { get; set; }
    public double TotalFat { get; set; }
    public bool IsDemo { get; set; }
}

/// <summary>Bản chép lời tạm của đoạn đang ghi âm — app hiện dưới nút micro trong lúc người dùng nói.</summary>
public class VoiceTranscriptDto
{
    public string Transcript { get; set; } = string.Empty;
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
    /// <summary>Không có cảnh báo mức DANGER (dị ứng, hoặc vượt ngưỡng với bệnh lý đã khai báo). Không có nghĩa "an toàn tuyệt đối" (BR-112/291).</summary>
    public bool IsSafe { get; set; } = true;

    public List<SafetyAlertDto> Alerts { get; set; } = new();
    public List<string> DetectedIngredients { get; set; } = new();
    public ExtractedNutritionFactsDto? ExtractedNutrition { get; set; }
    public bool IsDemo { get; set; }

    /// <summary>Nguồn kết quả: <c>database</c> (tra mã vạch trong CSDL, không dùng AI) | <c>ai</c> (AI đọc văn bản/ảnh nhãn) | <c>demo</c> (dữ liệu mẫu).</summary>
    public string Source { get; set; } = "ai";

    /// <summary>Sản phẩm tìm thấy theo mã vạch; null khi phân tích văn bản hoặc ảnh nhãn.</summary>
    public ScannedProductDto? Product { get; set; }

    /// <summary>Tên sản phẩm AI đọc được trên nhãn (chỉ có ở <c>/ai/scan-label</c>).</summary>
    public string? ProductName { get; set; }

    /// <summary>Văn bản AI đọc được trên nhãn (chỉ có ở <c>/ai/scan-label</c>), để người dùng đối chiếu.</summary>
    public string? OcrText { get; set; }
}

/// <summary>Sản phẩm trong CSDL khớp mã vạch (BR-120).</summary>
public class ScannedProductDto
{
    public Guid FoodId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Barcode { get; set; }

    /// <summary>Số liệu đã được kiểm chứng; false với món do người dùng nhập hoặc chưa rà soát (BR-120/121).</summary>
    public bool IsVerified { get; set; }

    public bool IsUserCreated { get; set; }

    /// <summary>Id (/meta/allergies) của mọi chất gây dị ứng trong sản phẩm.</summary>
    public List<int> AllergyIds { get; set; } = new();

    /// <summary>Những chất gây dị ứng của sản phẩm trùng với hồ sơ người dùng.</summary>
    public List<int> MatchedAllergyIds { get; set; } = new();
}

public class SafetyAlertDto
{
    public string Type { get; set; } = "WARNING"; // ALLERGY, HIGH_SODIUM, HIGH_SUGAR, HIGH_FAT, HIGH_CALORIES, MEDICAL_WARNING, UNVERIFIED
    public string Message { get; set; } = string.Empty;
    public string Severity { get; set; } = "WARNING"; // INFO, WARNING, DANGER
}

public class ExtractedNutritionFactsDto
{
    /// <summary>Năng lượng theo <see cref="Basis"/> (giữ tên cũ để tương thích): mỗi khẩu phần, hoặc mỗi 100 g khi Basis = per100g.</summary>
    public double CaloriesPerServing { get; set; }

    public string ServingSize { get; set; } = string.Empty;
    public double SugarGrams { get; set; }
    public double SodiumMg { get; set; }
    public double TotalFatGrams { get; set; }

    /// <summary>Protein theo <see cref="Basis"/>; null khi nhãn không ghi.</summary>
    public double? ProteinGrams { get; set; }

    /// <summary>Carbohydrate theo <see cref="Basis"/>; null khi nhãn không ghi.</summary>
    public double? CarbsGrams { get; set; }

    /// <summary>Khối lượng một khẩu phần (g) nếu biết — để quy đổi về 100 g.</summary>
    public double? ServingGrams { get; set; }

    /// <summary><c>perServing</c> (số liệu cho một khẩu phần) hoặc <c>per100g</c>.</summary>
    public string Basis { get; set; } = "perServing";
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
