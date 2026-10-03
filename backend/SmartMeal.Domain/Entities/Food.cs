namespace SmartMeal.Domain.Entities;

/// <summary>Khẩu phần của một thực phẩm, vd. "1 tô" = 500 g.</summary>
public class FoodServing
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid IngredientId { get; set; }
    public Ingredient Ingredient { get; set; } = null!;
    public string Label { get; set; } = string.Empty;
    public double Grams { get; set; }
    public bool IsDefault { get; set; }
}

/// <summary>Thực phẩm người dùng đánh dấu yêu thích.</summary>
public class UserFavoriteFood
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public Guid IngredientId { get; set; }
    public Ingredient Ingredient { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
