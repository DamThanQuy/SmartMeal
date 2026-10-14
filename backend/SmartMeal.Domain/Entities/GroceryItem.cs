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

    /// <summary>
    /// Số bữa trong thực đơn đã được gộp vào dòng này khi tạo từ thực đơn (≥ 1). 0 = người dùng tự thêm,
    /// nên không bị xóa khi tạo lại danh sách từ thực đơn.
    /// </summary>
    public int MergedFromRecipeCount { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Thông tin danh sách đi chợ hiện tại của một người dùng (mỗi người một danh sách): khoảng ngày thực đơn của lần tạo gần
/// nhất, để client biết danh sách đang thuộc tuần nào.
/// </summary>
public class GroceryList
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public DateOnly? PeriodStart { get; set; }
    public DateOnly? PeriodEnd { get; set; }
    public DateTime? GeneratedAt { get; set; }
}

/// <summary>Một lần "Hoàn tất mua sắm": chi phí ước tính và chi phí thực tế người dùng nhập (BR-174), số món đã mua/giữ lại.</summary>
public class GroceryTrip
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public DateOnly? PeriodStart { get; set; }
    public DateOnly? PeriodEnd { get; set; }
    public int PurchasedItems { get; set; }
    public int PendingItemsKept { get; set; }
    public decimal EstimatedCostVnd { get; set; }
    public decimal? ActualCostVnd { get; set; }
    public DateTime CompletedAt { get; set; } = DateTime.UtcNow;
}
