using SmartMeal.Application.DTOs.AI;
using SmartMeal.Infrastructure.Options;

namespace SmartMeal.Infrastructure.Services;

/// <summary>
/// Cảnh báo đường/natri/chất béo/calo vượt ngưỡng trên 100 g (BR-140), tính bằng code chứ không chỉ tin mô hình AI.
/// Chỉ so khi quy đổi được về 100 g (nhãn ghi theo 100 g, hoặc biết khối lượng một khẩu phần) để không cảnh báo sai.
/// </summary>
internal static class NutrientAlerts
{
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
