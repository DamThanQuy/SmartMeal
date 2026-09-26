namespace SmartMeal.Application.DTOs.Grocery;

public class GrocerySummaryDto
{
    public int TotalItems { get; set; }
    public int CheckedItems { get; set; }
    public decimal TotalEstimatedCostVnd { get; set; }
    public List<GroceryCategoryDto> Categories { get; set; } = new();
}

public class GroceryCategoryDto
{
    public string CategoryName { get; set; } = string.Empty;
    public List<GroceryItemDto> Items { get; set; } = new();
}

public class GroceryItemDto
{
    public Guid Id { get; set; }
    public string IngredientName { get; set; } = string.Empty;
    public double Amount { get; set; }
    public string Unit { get; set; } = "g";
    public string Category { get; set; } = "Rau củ";
    public decimal EstimatedPriceVnd { get; set; }
    public bool IsChecked { get; set; }
    public string? RecipeTitle { get; set; }
}

public class GenerateGroceryRequestDto
{
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public bool ClearExisting { get; set; } = true;
}

public class AddCustomGroceryItemDto
{
    public string IngredientName { get; set; } = string.Empty;
    public double Amount { get; set; } = 1.0;
    public string Unit { get; set; } = "phần";
    public string? Category { get; set; }
    public decimal? EstimatedPriceVnd { get; set; }
}

public class ToggleGroceryItemRequestDto
{
    public bool IsChecked { get; set; }
}
