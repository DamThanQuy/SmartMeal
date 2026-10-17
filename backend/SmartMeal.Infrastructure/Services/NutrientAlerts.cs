using SmartMeal.Application.DTOs.AI;
using SmartMeal.Infrastructure.Options;

namespace SmartMeal.Infrastructure.Services;

/// <summary>
/// Cảnh báo đường/natri/chất béo/calo vượt ngưỡng trên 100 g (BR-140), tính bằng code chứ không chỉ tin mô hình AI.
/// Chỉ so khi quy đổi được về 100 g (nhãn ghi theo 100 g, hoặc biết khối lượng một khẩu phần) để không cảnh báo sai.
/// </summary>
internal static class NutrientAlerts
{
    /// <summary>
    /// Áp dụng kiểm tra các ngưỡng dinh dưỡng (đường, muối, chất béo, calo) quy đổi về 100g lên kết quả an toàn thực phẩm.
    /// Tự động nâng mức độ cảnh báo lên DANGER nếu người dùng có bệnh lý nền liên quan (tiểu đường, cao huyết áp, mỡ máu).
    /// </summary>
    /// <param name="result">Đối tượng kết quả kiểm tra an toàn thực phẩm cần áp dụng cảnh báo.</param>
    /// <param name="conditionCodes">Tập hợp các mã bệnh lý của người dùng.</param>
    /// <param name="limits">Cấu hình các ngưỡng giới hạn dinh dưỡng an toàn.</param>
    public static void Apply(CheckSafetyResponseDto result, IReadOnlyCollection<string> conditionCodes, ProductSafetyOptions limits)
    {
        var nutrition = result.ExtractedNutrition;
        double? factor = nutrition is null ? null
            : string.Equals(nutrition.Basis, "per100g", StringComparison.OrdinalIgnoreCase) ? 1.0
            : nutrition.ServingGrams is > 0 ? 100.0 / nutrition.ServingGrams.Value
            : null;

        if (nutrition is not null && factor is { } f)
        {
            var codes = conditionCodes.Select(c => c.ToLowerInvariant()).ToHashSet();
            Check(result, "HIGH_SUGAR", nutrition.SugarGrams * f, limits.HighSugarGramsPer100g, "đường", "g",
                codes.Contains(HealthConditionRules.Diabetes) ? "tiểu đường" : null);
            Check(result, "HIGH_SODIUM", nutrition.SodiumMg * f, limits.HighSodiumMgPer100g, "natri (muối)", "mg",
                codes.Contains(HealthConditionRules.Hypertension) ? "cao huyết áp" : null);
            Check(result, "HIGH_FAT", nutrition.TotalFatGrams * f, limits.HighFatGramsPer100g, "chất béo", "g",
                codes.Contains(HealthConditionRules.Dyslipidemia) ? "mỡ máu cao" : null);
            Check(result, "HIGH_CALORIES", nutrition.CaloriesPerServing * f, limits.HighCaloriesPer100g, "năng lượng", "kcal", null, "INFO");
        }

        result.IsSafe = result.IsSafe && !result.Alerts.Any(a => string.Equals(a.Severity, "DANGER", StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>
    /// Kiểm tra chỉ số dinh dưỡng cụ thể theo ngưỡng 100g và bổ sung cảnh báo tương ứng vào danh sách alerts.
    /// </summary>
    /// <param name="result">Đối tượng kết quả kiểm tra an toàn.</param>
    /// <param name="type">Mã loại cảnh báo (HIGH_SUGAR, HIGH_SODIUM, HIGH_FAT, HIGH_CALORIES).</param>
    /// <param name="valuePer100g">Giá trị dinh dưỡng thực tế quy về 100g.</param>
    /// <param name="limit">Ngưỡng giới hạn cho phép trên 100g.</param>
    /// <param name="label">Tên hiển thị của chất dinh dưỡng.</param>
    /// <param name="unit">Đơn vị đo lường (g, mg, kcal).</param>
    /// <param name="relatedCondition">Tên bệnh lý nền liên quan nếu người dùng mắc phải.</param>
    /// <param name="severity">Mức độ cảnh báo mặc định (WARNING hoặc INFO).</param>
    private static void Check(
        CheckSafetyResponseDto result, string type, double valuePer100g, double limit, string label, string unit,
        string? relatedCondition, string severity = "WARNING")
    {
        if (valuePer100g <= limit)
        {
            return;
        }

        var existing = result.Alerts.FirstOrDefault(a => string.Equals(a.Type, type, StringComparison.OrdinalIgnoreCase));
        if (existing is not null)
        {
            // Mô hình đã cảnh báo: chỉ nâng mức nếu người dùng có bệnh lý liên quan.
            if (relatedCondition is not null)
            {
                existing.Severity = "DANGER";
            }

            return;
        }

        var message = $"Hàm lượng {label} cao (≈{valuePer100g:0.#} {unit}/100 g, ngưỡng tham khảo {limit:0.#} {unit}).";
        if (relatedCondition is not null)
        {
            message += $" Cần hạn chế vì bạn khai báo {relatedCondition}.";
        }

        result.Alerts.Add(new SafetyAlertDto
        {
            Type = type,
            Message = message,
            Severity = relatedCondition is not null ? "DANGER" : severity
        });
    }
}
