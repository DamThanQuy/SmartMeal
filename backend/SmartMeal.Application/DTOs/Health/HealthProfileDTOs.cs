namespace SmartMeal.Application.DTOs.Health;

public class HealthSurveyRequestDto
{
    public string Gender { get; set; } = "Male"; // "Male", "Female"
    public int Age { get; set; }
    public double HeightCm { get; set; }
    public double CurrentWeightKg { get; set; }
    public double TargetWeightKg { get; set; }
    public string ActivityLevel { get; set; } = "Moderate"; // Sedentary, Light, Moderate, Active, VeryActive
    public string Goal { get; set; } = "Maintain"; // LoseWeight, Maintain, GainWeight, GainMuscle
    public List<int> AllergyIds { get; set; } = new();
    public List<int> MedicalConditionIds { get; set; } = new();
}

public class HealthProfileDto
{
    public Guid Id { get; set; }
    public string Gender { get; set; } = string.Empty;
    public int Age { get; set; }
    public double HeightCm { get; set; }
    public double CurrentWeightKg { get; set; }
    public double TargetWeightKg { get; set; }
    public string ActivityLevel { get; set; } = string.Empty;
    public string Goal { get; set; } = string.Empty;
    public double BMI { get; set; }
    public string BmiClassification { get; set; } = string.Empty;
    public double BMR { get; set; }
    public double TDEE { get; set; }
    public double DailyCaloriesTarget { get; set; }
    public double DailyCarbsTargetGrams { get; set; }
    public double DailyFatTargetGrams { get; set; }
    public double DailyProteinTargetGrams { get; set; }
    public List<string> Allergies { get; set; } = new();
    public List<string> MedicalConditions { get; set; } = new();
}
