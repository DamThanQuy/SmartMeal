namespace SmartMeal.Domain.Entities;

public class HealthProfile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string Gender { get; set; } = "Male"; // Male, Female, Other

    /// <summary>Tuổi tại lần cập nhật gần nhất. Khi có <see cref="DateOfBirth"/>, tuổi hiện tại được tính từ ngày sinh.</summary>
    public int Age { get; set; }

    /// <summary>Ngày sinh (BR-001). Có thể trống với hồ sơ tạo trước khi hệ thống lưu ngày sinh.</summary>
    public DateOnly? DateOfBirth { get; set; }

    public double HeightCm { get; set; }
    public double CurrentWeightKg { get; set; }
    public double TargetWeightKg { get; set; }

    // Activity Level: Sedentary (1.2), Light (1.375), Moderate (1.55), Active (1.725), VeryActive (1.9)
    public string ActivityLevel { get; set; } = "Moderate";
    public string Goal { get; set; } = "Maintain"; // LoseWeight, Maintain, GainWeight, GainMuscle

    /// <summary>Mục tiêu nước uống mỗi ngày (ml).</summary>
    public int WaterGoalMl { get; set; } = 2000;

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
    public ICollection<UserDietaryPreference> DietaryPreferences { get; set; } = new List<UserDietaryPreference>();
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

    /// <summary>Mã ổn định (slug) để client không phải dựa vào id hay tên hiển thị, vd. "seafood", "peanut".</summary>
    public string Code { get; set; } = string.Empty;

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

    /// <summary>Mã ổn định (slug), vd. "diabetes", "gout".</summary>
    public string Code { get; set; } = string.Empty;

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

/// <summary>Chế độ ăn người dùng ưu tiên (BR-100), tham chiếu bảng <see cref="Tag"/> (Eat Clean, Keto, Vegan...).</summary>
public class UserDietaryPreference
{
    public Guid HealthProfileId { get; set; }
    public HealthProfile HealthProfile { get; set; } = null!;
    public int TagId { get; set; }
    public Tag Tag { get; set; } = null!;
}
