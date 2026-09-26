namespace SmartMeal.Application.DTOs.Foods;

public class FoodItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public string Category { get; set; } = "General";
    public string DefaultUnit { get; set; } = "g";
    public decimal EstimatedPriceVnd { get; set; }

    public double CaloriesPer100g { get; set; }
    public double CarbsPer100g { get; set; }
    public double FatPer100g { get; set; }
    public double ProteinPer100g { get; set; }
    public double FiberPer100g { get; set; }
    public double SugarPer100g { get; set; }
    public double SodiumMgPer100g { get; set; }

    public int? AllergyId { get; set; }
    public string? AllergyName { get; set; }
}
