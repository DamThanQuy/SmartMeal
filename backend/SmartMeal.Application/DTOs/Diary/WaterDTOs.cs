namespace SmartMeal.Application.DTOs.Diary;

public class LogWaterRequestDto
{
    public int AmountMl { get; set; } = 250;
    public DateOnly? Date { get; set; }
}

public class WaterSummaryDto
{
    public DateOnly Date { get; set; }
    public int TotalWaterMl { get; set; }
    public int GoalWaterMl { get; set; } = 2000;
    public double Percentage { get; set; }
}
