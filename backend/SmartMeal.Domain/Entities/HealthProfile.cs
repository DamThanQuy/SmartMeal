namespace SmartMeal.Domain.Entities;

public class HealthProfile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string Gender { get; set; } = "Male"; // Male, Female, Other
    public int Age { get; set; }
    public double HeightCm { get; set; }
    public double CurrentWeightKg { get; set; }
    public double TargetWeightKg { get; set; }
    
    // Activity Level: Sedentary (1.2), Light (1.375), Moderate (1.55), Active (1.725), VeryActive (1.9)
    public string ActivityLevel { get; set; } = "Moderate";
    public string Goal { get; set; } = "Maintain"; // LoseWeight, Maintain, GainWeight, GainMuscle

    // Calculated fields
    public double BMI { get; set; }
    public double BMR { get; set; }
    public double TDEE { get; set; }
    public double DailyCaloriesTarget { get; set; }
    public double DailyCarbsTargetGrams { get; set; }
    public double DailyFatTargetGrams { get; set; }
    public double DailyProteinTargetGrams { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<UserAllergy> UserAllergies { get; set; } = new List<UserAllergy>();
    public ICollection<UserCondition> UserConditions { get; set; } = new List<UserCondition>();
    public ICollection<WeightHistory> WeightHistories { get; set; } = new List<WeightHistory>();
}

public class WeightHistory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid HealthProfileId { get; set; }
    public HealthProfile HealthProfile { get; set; } = null!;
    public double WeightKg { get; set; }
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
}

public class Allergy
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty; // Peanuts, Seafood, Dairy, Eggs, Gluten, Soy
    public string? Description { get; set; }
    public ICollection<UserAllergy> UserAllergies { get; set; } = new List<UserAllergy>();
}

public class UserAllergy
{
    public Guid HealthProfileId { get; set; }
    public HealthProfile HealthProfile { get; set; } = null!;
    public int AllergyId { get; set; }
    public Allergy Allergy { get; set; } = null!;
}

public class MedicalCondition
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty; // Diabetes, Gout, Hypertension, KidneyDisease
    public string? Description { get; set; }
    public ICollection<UserCondition> UserConditions { get; set; } = new List<UserCondition>();
}

public class UserCondition
{
    public Guid HealthProfileId { get; set; }
    public HealthProfile HealthProfile { get; set; } = null!;
    public int MedicalConditionId { get; set; }
    public MedicalCondition MedicalCondition { get; set; } = null!;
}
