namespace SmartMeal.Domain.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    public string? PasswordHash { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? GoogleId { get; set; }
    public bool IsEmailVerified { get; set; } = false;
    public bool IsPro { get; set; } = false;
    public string Role { get; set; } = "User"; // "User", "Admin"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation Properties
    public HealthProfile? HealthProfile { get; set; }
    public ICollection<NutritionDiary> NutritionDiaries { get; set; } = new List<NutritionDiary>();
    public ICollection<MealPlan> MealPlans { get; set; } = new List<MealPlan>();
    public ICollection<UserFavorite> Favorites { get; set; } = new List<UserFavorite>();
}
