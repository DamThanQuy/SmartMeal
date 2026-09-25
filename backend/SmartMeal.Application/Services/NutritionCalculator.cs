namespace SmartMeal.Application.Services;

public static class NutritionCalculator
{
    // BMR using Mifflin-St Jeor Formula
    public static double CalculateBmr(string gender, double weightKg, double heightCm, int age)
    {
        if (gender.Equals("Male", StringComparison.OrdinalIgnoreCase))
        {
            return (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
        }
        else
        {
            return (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
        }
    }

    // Activity Multipliers
    public static double GetActivityMultiplier(string activityLevel)
    {
        return activityLevel.ToLower() switch
        {
            "sedentary" => 1.2,
            "light" => 1.375,
            "moderate" => 1.55,
            "active" => 1.725,
            "veryactive" => 1.9,
            _ => 1.375
        };
    }

    public static double CalculateTdee(double bmr, string activityLevel)
    {
        return Math.Round(bmr * GetActivityMultiplier(activityLevel));
    }

    public static double CalculateBmi(double weightKg, double heightCm)
    {
        var heightMeters = heightCm / 100.0;
        return Math.Round(weightKg / (heightMeters * heightMeters), 1);
    }

    public static string GetBmiClassification(double bmi)
    {
        if (bmi < 18.5) return "Thiếu cân (Underweight)";
        if (bmi < 24.9) return "Bình thường (Normal)";
        if (bmi < 29.9) return "Tiền béo phì (Overweight)";
        return "Béo phì (Obese)";
    }

    // Calculate Daily Target Calories & Macros
    public static (double Calories, double CarbsGrams, double FatGrams, double ProteinGrams) CalculateGoals(double tdee, string goal)
    {
        double targetCalories = goal.ToLower() switch
        {
            "loseweight" => tdee - 500, // Deficit 500 kcal
            "gainweight" => tdee + 400, // Surplus 400 kcal
            "gainmuscle" => tdee + 300, // Surplus 300 kcal
            _ => tdee                  // Maintain
        };

        // Ensure calories don't drop below safe minimum
        if (targetCalories < 1200) targetCalories = 1200;

        // Macro Distribution (Protein 25%, Fat 25%, Carbs 50%)
        // 1g Protein = 4 kcal, 1g Carbs = 4 kcal, 1g Fat = 9 kcal
        double proteinGrams = Math.Round((targetCalories * 0.25) / 4);
        double fatGrams = Math.Round((targetCalories * 0.25) / 9);
        double carbsGrams = Math.Round((targetCalories * 0.50) / 4);

        return (Math.Round(targetCalories), carbsGrams, fatGrams, proteinGrams);
    }
}
