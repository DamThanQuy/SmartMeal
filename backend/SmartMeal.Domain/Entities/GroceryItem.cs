namespace SmartMeal.Domain.Entities;

public class GroceryItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string IngredientName { get; set; } = string.Empty;
    public double Amount { get; set; }
    public string Unit { get; set; } = "g";
    public string Category { get; set; } = "Rau củ"; // Rau củ, Thịt cá, Gia vị, Sữa & Trứng, Đồ khô, Khác
    public decimal EstimatedPriceVnd { get; set; }
    public bool IsChecked { get; set; } = false;

    public Guid? RecipeId { get; set; }
    public Recipe? Recipe { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
