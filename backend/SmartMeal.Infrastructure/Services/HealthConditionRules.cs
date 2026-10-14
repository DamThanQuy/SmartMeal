using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Options;

namespace SmartMeal.Infrastructure.Services;

/// <summary>
/// Đánh giá một công thức theo bệnh lý người dùng đã khai báo (BR-110/111) bằng ngưỡng ở <see cref="HealthConditionLimitsOptions"/>.
/// Đường và natri được ước tính từ những nguyên liệu có số liệu và có đơn vị quy được ra gam/ml, nên là ước tính tối thiểu.
/// </summary>
internal static class HealthConditionRules
{
    public const string Diabetes = "diabetes";
    public const string Hypertension = "hypertension";
    public const string Dyslipidemia = "dyslipidemia";
    public const string Gout = "gout";

    public sealed record Violation(string ConditionCode, string Message);

    /// <summary>Công thức cần nạp sẵn <c>RecipeIngredients.Ingredient</c>.</summary>
    public static List<Violation> Evaluate(Recipe recipe, IReadOnlyCollection<string> conditionCodes, HealthConditionLimitsOptions limits)
    {
        var violations = new List<Violation>();
        if (conditionCodes.Count == 0)
        {
            return violations;
        }

        var servings = Math.Max(1, recipe.Servings);
        var sugarPerServing = EstimatePerServing(recipe, servings, i => i.SugarPer100g);
        var sodiumPerServing = EstimatePerServing(recipe, servings, i => i.SodiumMgPer100g);

        foreach (var code in conditionCodes.Select(c => c.ToLowerInvariant()).Distinct())
        {
            switch (code)
            {
                case Diabetes:
                    if (recipe.CarbsPerServing > limits.DiabetesMaxCarbsGrams)
                    {
                        violations.Add(new Violation(code,
                            $"Nhiều carbohydrate (≈{recipe.CarbsPerServing:0} g/khẩu phần, ngưỡng tham khảo {limits.DiabetesMaxCarbsGrams:0} g) — cần lưu ý với tiểu đường."));
                    }

                    if (sugarPerServing > limits.DiabetesMaxSugarGrams)
                    {
                        violations.Add(new Violation(code,
                            $"Nhiều đường (≈{sugarPerServing:0} g/khẩu phần, ngưỡng tham khảo {limits.DiabetesMaxSugarGrams:0} g) — cần lưu ý với tiểu đường."));
                    }

                    break;

                case Hypertension:
                    if (sodiumPerServing > limits.HypertensionMaxSodiumMg)
                    {
                        violations.Add(new Violation(code,
                            $"Nhiều muối (≈{sodiumPerServing:0} mg natri/khẩu phần, ngưỡng tham khảo {limits.HypertensionMaxSodiumMg:0} mg) — cần lưu ý với cao huyết áp."));
                    }

                    break;

                case Dyslipidemia:
                    if (recipe.FatPerServing > limits.DyslipidemiaMaxFatGrams)
                    {
                        violations.Add(new Violation(code,
                            $"Nhiều chất béo (≈{recipe.FatPerServing:0} g/khẩu phần, ngưỡng tham khảo {limits.DyslipidemiaMaxFatGrams:0} g) — cần lưu ý với mỡ máu cao."));
                    }

                    break;

                case Gout:
                    var purineRich = recipe.RecipeIngredients
                        .Where(ri => limits.GoutAvoidCategories.Any(c => string.Equals(c, ri.Ingredient.Category, StringComparison.OrdinalIgnoreCase)))
                        .Select(ri => ri.Ingredient.Name)
                        .Distinct()
                        .ToList();
                    if (purineRich.Count > 0)
                    {
                        violations.Add(new Violation(code,
                            $"Có nguyên liệu nhiều purin ({string.Join(", ", purineRich)}) — cần hạn chế khi bị gout."));
                    }

                    break;
            }
        }

        return violations;
    }

    private static double EstimatePerServing(Recipe recipe, int servings, Func<Ingredient, double> per100g)
    {
        var total = 0.0;
        foreach (var ri in recipe.RecipeIngredients)
        {
            var grams = ToGrams(ri.Amount, ri.Unit);
            if (grams is { } g && per100g(ri.Ingredient) > 0)
            {
                total += per100g(ri.Ingredient) * g / 100.0;
            }
        }

        return Math.Round(total / servings, 1);
    }

    /// <summary>Đổi lượng nguyên liệu ra gam (ml coi như gam). Đơn vị đếm (quả, muỗng...) không quy đổi được thì trả null.</summary>
    private static double? ToGrams(double amount, string unit) => unit.Trim().ToLowerInvariant() switch
    {
        "g" or "gram" or "gr" or "ml" => amount,
        "kg" or "l" or "lít" or "lit" => amount * 1000,
        _ => null
    };
}
