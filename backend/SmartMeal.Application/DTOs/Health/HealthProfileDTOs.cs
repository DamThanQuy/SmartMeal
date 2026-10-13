using System.ComponentModel.DataAnnotations;
using SmartMeal.Application.Common.Validation;

namespace SmartMeal.Application.DTOs.Health;

/// <summary>Các giá trị hợp lệ của hồ sơ sức khỏe (dạng chuẩn lưu trong DB). Đầu vào không phân biệt hoa/thường.</summary>
public static class HealthOptions
{
    public const string Male = "Male";
    public const string Female = "Female";
    public const string Other = "Other";

    public const string Sedentary = "Sedentary";
    public const string Light = "Light";
    public const string Moderate = "Moderate";
    public const string Active = "Active";
    public const string VeryActive = "VeryActive";

    public const string LoseWeight = "LoseWeight";
    public const string Maintain = "Maintain";
    public const string GainWeight = "GainWeight";
    public const string GainMuscle = "GainMuscle";

    public static readonly string[] Genders = { Male, Female, Other };
    public static readonly string[] ActivityLevels = { Sedentary, Light, Moderate, Active, VeryActive };
    public static readonly string[] Goals = { LoseWeight, Maintain, GainWeight, GainMuscle };

    /// <summary>Trả giá trị ở dạng chuẩn (không phân biệt hoa/thường, bỏ khoảng trắng) hoặc null nếu không hợp lệ.</summary>
    public static string? Canonical(string? value, IEnumerable<string> allowed)
    {
        var trimmed = value?.Trim();
        return allowed.FirstOrDefault(a => string.Equals(a, trimmed, StringComparison.OrdinalIgnoreCase));
    }
}

/// <summary>Khảo sát sức khỏe: tạo mới hoặc ghi đè toàn bộ hồ sơ. Cần <c>dateOfBirth</c> hoặc <c>age</c>.</summary>
public class HealthSurveyRequestDto
{
    [Required(ErrorMessage = "Giới tính là bắt buộc.")]
    [OneOfIgnoreCase(HealthOptions.Male, HealthOptions.Female, HealthOptions.Other)]
    public string Gender { get; set; } = HealthOptions.Male;

    /// <summary>Tuổi (13–100). Bỏ qua nếu có <see cref="DateOfBirth"/>.</summary>
    [Range(13, 100, ErrorMessage = "Tuổi phải từ 13 đến 100.")]
    public int? Age { get; set; }

    /// <summary>Ngày sinh (BR-001), định dạng yyyy-MM-dd. Ưu tiên hơn <see cref="Age"/>.</summary>
    public DateOnly? DateOfBirth { get; set; }

    [Range(100, 250, ErrorMessage = "Chiều cao phải từ 100 đến 250 cm.")]
    public double HeightCm { get; set; }

    [Range(30, 300, ErrorMessage = "Cân nặng hiện tại phải từ 30 đến 300 kg.")]
    public double CurrentWeightKg { get; set; }

    [Range(30, 300, ErrorMessage = "Cân nặng mục tiêu phải từ 30 đến 300 kg.")]
    public double TargetWeightKg { get; set; }

    [Required(ErrorMessage = "Mức độ vận động là bắt buộc.")]
    [OneOfIgnoreCase(HealthOptions.Sedentary, HealthOptions.Light, HealthOptions.Moderate, HealthOptions.Active, HealthOptions.VeryActive)]
    public string ActivityLevel { get; set; } = HealthOptions.Moderate;

    [Required(ErrorMessage = "Mục tiêu là bắt buộc.")]
    [OneOfIgnoreCase(HealthOptions.LoseWeight, HealthOptions.Maintain, HealthOptions.GainWeight, HealthOptions.GainMuscle)]
    public string Goal { get; set; } = HealthOptions.Maintain;

    /// <summary>Id trong /meta/allergies.</summary>
    public List<int> AllergyIds { get; set; } = new();

    /// <summary>Id trong /meta/medical-conditions.</summary>
    public List<int> MedicalConditionIds { get; set; } = new();

    /// <summary>Id trong /meta/tags (Eat Clean, Keto...). Bỏ trống = không có chế độ ăn ưu tiên.</summary>
    public List<int> DietaryPreferenceIds { get; set; } = new();

    /// <summary>Mục tiêu nước uống mỗi ngày (ml). Bỏ trống = giữ giá trị hiện có (mặc định 2000).</summary>
    [Range(500, 10000, ErrorMessage = "Mục tiêu nước uống phải từ 500 đến 10000 ml.")]
    public int? WaterGoalMl { get; set; }
}

/// <summary>Cập nhật từng phần hồ sơ đã có. Trường không gửi (null) giữ nguyên; danh sách gửi <c>[]</c> nghĩa là xóa hết.</summary>
public class UpdateHealthProfileRequestDto
{
    [OneOfIgnoreCase(HealthOptions.Male, HealthOptions.Female, HealthOptions.Other)]
    public string? Gender { get; set; }

    [Range(13, 100, ErrorMessage = "Tuổi phải từ 13 đến 100.")]
    public int? Age { get; set; }

    public DateOnly? DateOfBirth { get; set; }

    [Range(100, 250, ErrorMessage = "Chiều cao phải từ 100 đến 250 cm.")]
    public double? HeightCm { get; set; }

    [Range(30, 300, ErrorMessage = "Cân nặng hiện tại phải từ 30 đến 300 kg.")]
    public double? CurrentWeightKg { get; set; }

    [Range(30, 300, ErrorMessage = "Cân nặng mục tiêu phải từ 30 đến 300 kg.")]
    public double? TargetWeightKg { get; set; }

    [OneOfIgnoreCase(HealthOptions.Sedentary, HealthOptions.Light, HealthOptions.Moderate, HealthOptions.Active, HealthOptions.VeryActive)]
    public string? ActivityLevel { get; set; }

    [OneOfIgnoreCase(HealthOptions.LoseWeight, HealthOptions.Maintain, HealthOptions.GainWeight, HealthOptions.GainMuscle)]
    public string? Goal { get; set; }

    public List<int>? AllergyIds { get; set; }
    public List<int>? MedicalConditionIds { get; set; }
    public List<int>? DietaryPreferenceIds { get; set; }

    [Range(500, 10000, ErrorMessage = "Mục tiêu nước uống phải từ 500 đến 10000 ml.")]
    public int? WaterGoalMl { get; set; }
}

public class HealthProfileDto
{
    public Guid Id { get; set; }
    public string Gender { get; set; } = string.Empty;

    /// <summary>Tuổi hiện tại (tính từ ngày sinh nếu có).</summary>
    public int Age { get; set; }

    public DateOnly? DateOfBirth { get; set; }
    public double HeightCm { get; set; }
    public double CurrentWeightKg { get; set; }
    public double TargetWeightKg { get; set; }
    public string ActivityLevel { get; set; } = string.Empty;
    public string Goal { get; set; } = string.Empty;
    public int WaterGoalMl { get; set; }
    public double BMI { get; set; }
    public string BmiClassification { get; set; } = string.Empty;
    public double BMR { get; set; }
    public double TDEE { get; set; }
    public double DailyCaloriesTarget { get; set; }
    public double DailyCarbsTargetGrams { get; set; }
    public double DailyFatTargetGrams { get; set; }
    public double DailyProteinTargetGrams { get; set; }

    /// <summary>Tên hiển thị (giữ lại để tương thích); dùng <see cref="AllergyIds"/> cho logic.</summary>
    public List<string> Allergies { get; set; } = new();
    public List<string> MedicalConditions { get; set; } = new();
    public List<string> DietaryPreferences { get; set; } = new();

    public List<int> AllergyIds { get; set; } = new();
    public List<int> MedicalConditionIds { get; set; } = new();
    public List<int> DietaryPreferenceIds { get; set; } = new();
}
