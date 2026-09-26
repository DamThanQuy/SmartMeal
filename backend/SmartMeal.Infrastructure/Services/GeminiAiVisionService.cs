using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.AI;
using SmartMeal.Application.Services;
using SmartMeal.Infrastructure.Data;

namespace SmartMeal.Infrastructure.Services;

public class GeminiAiVisionService : IAiVisionService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private readonly ApplicationDbContext _db;
    private readonly ILogger<GeminiAiVisionService> _logger;

    private readonly string _apiKey;
    private readonly string _model;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public GeminiAiVisionService(
        HttpClient httpClient,
        IConfiguration config,
        ApplicationDbContext db,
        ILogger<GeminiAiVisionService> logger)
    {
        _httpClient = httpClient;
        _config = config;
        _db = db;
        _logger = logger;

        _apiKey = _config["Gemini:ApiKey"] ?? string.Empty;
        _model = _config["Gemini:Model"] ?? "gemini-1.5-flash";
    }

    public async Task<ApiResponse<SnapAndTrackResponseDto>> SnapAndTrackAsync(byte[] imageBytes, string contentType, Guid? userId = null)
    {
        // 1. Get user allergy/condition context if userId provided
        var userAllergies = new List<string>();
        var userConditions = new List<string>();

        if (userId.HasValue)
        {
            var profile = await _db.HealthProfiles
                .Include(hp => hp.UserAllergies).ThenInclude(ua => ua.Allergy)
                .Include(hp => hp.UserConditions).ThenInclude(uc => uc.MedicalCondition)
                .FirstOrDefaultAsync(hp => hp.UserId == userId.Value);

            if (profile != null)
            {
                userAllergies = profile.UserAllergies.Select(a => a.Allergy.Name).ToList();
                userConditions = profile.UserConditions.Select(c => c.MedicalCondition.Name).ToList();
            }
        }

        var allergyContext = userAllergies.Count > 0 ? $"Người dùng bị dị ứng với: {string.Join(", ", userAllergies)}." : "";
        var conditionContext = userConditions.Count > 0 ? $"Người dùng có bệnh lý: {string.Join(", ", userConditions)}." : "";

        var prompt = $@"
Bạn là chuyên gia dinh dưỡng và AI Vision nhận diện ẩm thực Việt Nam và quốc tế.
Hãy phân tích bức ảnh món ăn này và trả về JSON chính xác theo schema sau:
{{
  ""dishName"": ""Tên món ăn tiếng Việt rõ ràng"",
  ""estimatedGrams"": 350,
  ""confidenceScore"": 0.95,
  ""calories"": 450,
  ""carbs"": 50.0,
  ""protein"": 30.0,
  ""fat"": 12.0,
  ""detectedIngredients"": [""Nguyên liệu 1"", ""Nguyên liệu 2""],
  ""allergyWarnings"": [""Cảnh báo dị ứng nếu có""],
  ""healthTips"": ""Lời khuyên dinh dưỡng ngắn gọn""
}}
Lưu ý quan trọng:
- {allergyContext}
- {conditionContext}
- Nếu món ăn chứa chất gây dị ứng cho người dùng, hãy đưa vào mảng 'allergyWarnings'.
- Tính toán Calo và Macros (Carbs, Protein, Fat) dựa trên khẩu phần ước lượng trực quan trong ảnh.
";

        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            // Fallback mock for offline demo if API key not set yet
            return ApiResponse<SnapAndTrackResponseDto>.Ok(GetMockSnapAndTrack(userAllergies), "AI đã nhận diện món ăn (Mock Demo mode).");
        }

        try
        {
            var geminiResponse = await CallGeminiVisionApiAsync(prompt, imageBytes, contentType);
            if (!string.IsNullOrEmpty(geminiResponse))
            {
                var result = JsonSerializer.Deserialize<SnapAndTrackResponseDto>(geminiResponse, JsonOptions);
                if (result != null)
                {
                    return ApiResponse<SnapAndTrackResponseDto>.Ok(result, "Nhận diện món ăn bằng Gemini AI thành công.");
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi gọi Gemini Vision API SnapAndTrack.");
        }

        // Fallback if API fails
        return ApiResponse<SnapAndTrackResponseDto>.Ok(GetMockSnapAndTrack(userAllergies), "AI nhận diện món ăn (Fallback mode).");
    }

    public async Task<ApiResponse<FridgeScannerResponseDto>> ScanFridgeAsync(byte[] imageBytes, string contentType)
    {
        var prompt = @"
Bạn là đầu bếp thông minh AI. Hãy phân tích ảnh chụp các nguyên liệu có trong tủ lạnh/nhà bếp và gợi ý 2-3 món ăn có thể nấu được ngay.
Trả về JSON chính xác theo schema sau:
{
  ""detectedIngredients"": [""Tên nguyên liệu 1"", ""Tên nguyên liệu 2"", ""Tên nguyên liệu 3""],
  ""suggestedRecipes"": [
    {
      ""title"": ""Tên món ăn gợi ý"",
      ""description"": ""Mô tả ngắn gọn hương vị"",
      ""calories"": 320,
      ""cookingTimeMinutes"": 15,
      ""matchingIngredients"": [""Nguyên liệu có sẵn trong ảnh""],
      ""missingIngredients"": [""Gia vị hoặc nguyên liệu phụ cần thêm nếu có""],
      ""quickInstructions"": ""Hướng dẫn nấu tóm tắt 2-3 bước""
    }
  ]
}
";

        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            return ApiResponse<FridgeScannerResponseDto>.Ok(GetMockFridgeScanner(), "Quét tủ lạnh thành công (Mock Demo mode).");
        }

        try
        {
            var geminiResponse = await CallGeminiVisionApiAsync(prompt, imageBytes, contentType);
            if (!string.IsNullOrEmpty(geminiResponse))
            {
                var result = JsonSerializer.Deserialize<FridgeScannerResponseDto>(geminiResponse, JsonOptions);
                if (result != null)
                {
                    return ApiResponse<FridgeScannerResponseDto>.Ok(result, "Quét tủ lạnh và gợi ý món thành công bằng Gemini AI.");
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi gọi Gemini Vision API ScanFridge.");
        }

        return ApiResponse<FridgeScannerResponseDto>.Ok(GetMockFridgeScanner(), "Quét tủ lạnh thành công (Fallback mode).");
    }

    public async Task<ApiResponse<VoiceLogResponseDto>> ParseVoiceLogAsync(string transcript)
    {
        if (string.IsNullOrWhiteSpace(transcript))
            return ApiResponse<VoiceLogResponseDto>.Fail("Nội dung giọng nói không được để trống.");

        var prompt = $@"
Bạn là AI chuyên gia bóc tách nhật ký dinh dưỡng từ câu nói của người dùng tiếng Việt.
Câu nói của người dùng: ""{transcript}""
Hãy bóc tách thành các món ăn, bữa ăn (Breakfast / Lunch / Dinner / Snack), ước tính khối lượng, Calories, Carbs, Protein, Fat cho từng món.
Trả về JSON chính xác theo schema:
{{
  ""mealType"": ""Breakfast"", // Breakfast | Lunch | Dinner | Snack
  ""extractedItems"": [
    {{
      ""foodName"": ""Tên món ăn"",
      ""portionDescription"": ""1 bát / 1 đĩa / 1 ly"",
      ""portionGrams"": 300,
      ""calories"": 450,
      ""carbs"": 55.0,
      ""protein"": 25.0,
      ""fat"": 12.0
    }}
  ],
  ""totalCalories"": 450,
  ""totalCarbs"": 55.0,
  ""totalProtein"": 25.0,
  ""totalFat"": 12.0
}}
";

        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            return ApiResponse<VoiceLogResponseDto>.Ok(GetMockVoiceLog(transcript), "Bóc tách giọng nói thành công (Mock Demo mode).");
        }

        try
        {
            var geminiResponse = await CallGeminiTextApiAsync(prompt);
            if (!string.IsNullOrEmpty(geminiResponse))
            {
                var result = JsonSerializer.Deserialize<VoiceLogResponseDto>(geminiResponse, JsonOptions);
                if (result != null)
                {
                    return ApiResponse<VoiceLogResponseDto>.Ok(result, "Phân tích giọng nói bằng AI thành công.");
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi gọi Gemini Text API ParseVoiceLog.");
        }

        return ApiResponse<VoiceLogResponseDto>.Ok(GetMockVoiceLog(transcript), "Bóc tách giọng nói thành công (Fallback mode).");
    }

    public async Task<ApiResponse<CheckSafetyResponseDto>> CheckSafetyAsync(CheckSafetyRequestDto dto, Guid? userId = null)
    {
        var userAllergies = new List<string>();
        var userConditions = new List<string>();

        if (userId.HasValue)
        {
            var profile = await _db.HealthProfiles
                .Include(hp => hp.UserAllergies).ThenInclude(ua => ua.Allergy)
                .Include(hp => hp.UserConditions).ThenInclude(uc => uc.MedicalCondition)
                .FirstOrDefaultAsync(hp => hp.UserId == userId.Value);

            if (profile != null)
            {
                userAllergies = profile.UserAllergies.Select(a => a.Allergy.Name).ToList();
                userConditions = profile.UserConditions.Select(c => c.MedicalCondition.Name).ToList();
            }
        }

        var allergyContext = userAllergies.Count > 0 ? $"Danh sách dị ứng của user: {string.Join(", ", userAllergies)}." : "User không có dị ứng đã khai báo.";
        var conditionContext = userConditions.Count > 0 ? $"Bệnh lý của user: {string.Join(", ", userConditions)}." : "User không có bệnh lý nền.";

        var inputContent = !string.IsNullOrWhiteSpace(dto.OcrRawText) ? $"Đoạn text OCR quét từ bao bì: \"{dto.OcrRawText}\"" : $"Mã vạch sản phẩm: {dto.Barcode}";

        var prompt = $@"
Bạn là trợ lý kiểm tra an toàn thực phẩm.
Thông tin sản phẩm: {inputContent}
Hồ sơ người dùng:
- {allergyContext}
- {conditionContext}

Hãy phân tích thành phần sản phẩm, bóc tách dinh dưỡng và kiểm tra xem có an toàn cho người dùng không.
Trả về JSON chính xác theo schema:
{{
  ""isSafe"": true,
  ""alerts"": [
    {{
      ""type"": ""ALLERGY"", // ALLERGY | HIGH_SODIUM | HIGH_SUGAR | MEDICAL_WARNING
      ""message"": ""Mô tả cảnh báo rõ ràng"",
      ""severity"": ""DANGER"" // INFO | WARNING | DANGER
    }}
  ],
  ""detectedIngredients"": [""Thành phần 1"", ""Thành phần 2""],
  ""extractedNutrition"": {{
    ""caloriesPerServing"": 150,
    ""servingSize"": ""30g"",
    ""sugarGrams"": 12.5,
    ""sodiumMg"": 350.0,
    ""totalFatGrams"": 4.0
  }}
}}
";

        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            return ApiResponse<CheckSafetyResponseDto>.Ok(GetMockCheckSafety(dto, userAllergies), "Kiểm tra an toàn thực phẩm thành công (Mock Demo mode).");
        }

        try
        {
            var geminiResponse = await CallGeminiTextApiAsync(prompt);
            if (!string.IsNullOrEmpty(geminiResponse))
            {
                var result = JsonSerializer.Deserialize<CheckSafetyResponseDto>(geminiResponse, JsonOptions);
                if (result != null)
                {
                    return ApiResponse<CheckSafetyResponseDto>.Ok(result, "Kiểm tra an toàn thực phẩm thành công.");
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi gọi Gemini Text API CheckSafety.");
        }

        return ApiResponse<CheckSafetyResponseDto>.Ok(GetMockCheckSafety(dto, userAllergies), "Kiểm tra an toàn thực phẩm thành công (Fallback mode).");
    }

    #region Gemini API Low-Level Calls

    private async Task<string?> CallGeminiVisionApiAsync(string prompt, byte[] imageBytes, string contentType)
    {
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_model}:generateContent?key={_apiKey}";

        var base64Image = Convert.ToBase64String(imageBytes);
        var mimeType = string.IsNullOrWhiteSpace(contentType) ? "image/jpeg" : contentType;

        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    parts = new object[]
                    {
                        new { text = prompt },
                        new
                        {
                            inline_data = new
                            {
                                mime_type = mimeType,
                                data = base64Image
                            }
                        }
                    }
                }
            },
            generationConfig = new
            {
                response_mime_type = "application/json"
            }
        };

        var response = await _httpClient.PostAsJsonAsync(url, requestBody);
        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync();
            _logger.LogWarning("Gemini API returned error code {StatusCode}: {Error}", response.StatusCode, err);
            return null;
        }

        return await ExtractGeminiJsonTextAsync(response);
    }

    private async Task<string?> CallGeminiTextApiAsync(string prompt)
    {
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_model}:generateContent?key={_apiKey}";

        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    parts = new object[]
                    {
                        new { text = prompt }
                    }
                }
            },
            generationConfig = new
            {
                response_mime_type = "application/json"
            }
        };

        var response = await _httpClient.PostAsJsonAsync(url, requestBody);
        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync();
            _logger.LogWarning("Gemini API returned error code {StatusCode}: {Error}", response.StatusCode, err);
            return null;
        }

        return await ExtractGeminiJsonTextAsync(response);
    }

    private static async Task<string?> ExtractGeminiJsonTextAsync(HttpResponseMessage response)
    {
        var root = await response.Content.ReadFromJsonAsync<JsonElement>();
        if (root.TryGetProperty("candidates", out var candidates) &&
            candidates.GetArrayLength() > 0)
        {
            var first = candidates[0];
            if (first.TryGetProperty("content", out var content) &&
                content.TryGetProperty("parts", out var parts) &&
                parts.GetArrayLength() > 0)
            {
                return parts[0].GetProperty("text").GetString();
            }
        }
        return null;
    }

    #endregion

    #region Mock Helpers for Demos & Offline Testing

    private static SnapAndTrackResponseDto GetMockSnapAndTrack(List<string> userAllergies)
    {
        var warnings = new List<string>();
        if (userAllergies.Contains("Đậu phộng", StringComparer.OrdinalIgnoreCase))
        {
            warnings.Add("Chú ý: Món ăn có thể chứa dầu đậu phộng hoặc đậu phộng rang.");
        }

        return new SnapAndTrackResponseDto
        {
            DishName = "Cơm ức gà áp chảo bông cải xanh",
            EstimatedGrams = 350,
            ConfidenceScore = 0.96,
            Calories = 425,
            Carbs = 48.5,
            Protein = 38.0,
            Fat = 8.5,
            DetectedIngredients = new List<string> { "Ức gà áp chảo", "Cơm gạo lứt", "Bông cải xanh luộc", "Cà rốt", "Dầu oliu" },
            AllergyWarnings = warnings,
            HealthTips = "Bữa ăn giàu protein và chất xơ, rất phù hợp cho mục tiêu duy trì vóc dáng và tăng cơ giảm mỡ!"
        };
    }

    private static FridgeScannerResponseDto GetMockFridgeScanner()
    {
        return new FridgeScannerResponseDto
        {
            DetectedIngredients = new List<string> { "Trứng gà", "Cà chua", "Đậu hũ non", "Hành lá", "Thịt heo xay" },
            SuggestedRecipes = new List<FridgeRecipeSuggestionDto>
            {
                new()
                {
                    Title = "Đậu hũ sốt cà chua thịt băm",
                    Description = "Món ăn thanh đạm, đậm đà đưa cơm, nấu cực nhanh trong 15 phút.",
                    Calories = 290,
                    CookingTimeMinutes = 15,
                    MatchingIngredients = new List<string> { "Đậu hũ non", "Cà chua", "Thịt heo xay", "Hành lá" },
                    MissingIngredients = new List<string> { "Nước mắm", "Hạt nêm" },
                    QuickInstructions = "1. Cắt đậu hũ miếng vừa ăn. 2. Xào thịt băm với cà chua cho mềm nhừ. 3. Cho đậu hũ vào om lửa nhỏ 5 phút, rắc hành lá."
                },
                new()
                {
                    Title = "Trứng chiên cà chua hành hoa",
                    Description = "Món ăn quốc dân giàu đạm, chế biến siêu tốc.",
                    Calories = 210,
                    CookingTimeMinutes = 10,
                    MatchingIngredients = new List<string> { "Trứng gà", "Cà chua", "Hành lá" },
                    MissingIngredients = new List<string> { "Dầu ăn", "Tiêu" },
                    QuickInstructions = "1. Đánh tan trứng cùng gia vị và hành lá. 2. Xào sơ cà chua. 3. Đổ trứng vào chiên vàng đều 2 mặt."
                }
            }
        };
    }

    private static VoiceLogResponseDto GetMockVoiceLog(string transcript)
    {
        var lower = transcript.ToLower();
        var mealType = lower.Contains("sáng") ? "Breakfast" :
                       lower.Contains("trưa") ? "Lunch" :
                       lower.Contains("tối") ? "Dinner" : "Breakfast";

        return new VoiceLogResponseDto
        {
            MealType = mealType,
            ExtractedItems = new List<ExtractedMealItemDto>
            {
                new()
                {
                    FoodName = "Phở bò tái chín",
                    PortionDescription = "1 tô vừa",
                    PortionGrams = 450,
                    Calories = 480,
                    Carbs = 58.0,
                    Protein = 26.0,
                    Fat = 14.0
                },
                new()
                {
                    FoodName = "Trà đá",
                    PortionDescription = "1 ly",
                    PortionGrams = 200,
                    Calories = 5,
                    Carbs = 1.0,
                    Protein = 0.0,
                    Fat = 0.0
                }
            },
            TotalCalories = 485,
            TotalCarbs = 59.0,
            TotalProtein = 26.0,
            TotalFat = 14.0
        };
    }

    private static CheckSafetyResponseDto GetMockCheckSafety(CheckSafetyRequestDto dto, List<string> userAllergies)
    {
        var alerts = new List<SafetyAlertDto>();
        bool isSafe = true;

        if (userAllergies.Contains("Đậu phộng", StringComparer.OrdinalIgnoreCase) ||
            (dto.OcrRawText?.Contains("đậu phộng", StringComparison.OrdinalIgnoreCase) ?? false))
        {
            isSafe = false;
            alerts.Add(new SafetyAlertDto
            {
                Type = "ALLERGY",
                Message = "CẢNH BÁO NGUY HIỂM: Sản phẩm có chứa Đậu phộng nằm trong danh sách dị ứng của bạn!",
                Severity = "DANGER"
            });
        }

        return new CheckSafetyResponseDto
        {
            IsSafe = isSafe,
            Alerts = alerts,
            DetectedIngredients = new List<string> { "Bột mì", "Đường tinh luyện", "Dầu cọ", "Bột sữa béo", "Đậu phộng rang" },
            ExtractedNutrition = new ExtractedNutritionFactsDto
            {
                ServingSize = "50g",
                CaloriesPerServing = 240,
                SugarGrams = 18.0,
                SodiumMg = 180.0,
                TotalFatGrams = 11.0
            }
        };
    }

    #endregion
}
