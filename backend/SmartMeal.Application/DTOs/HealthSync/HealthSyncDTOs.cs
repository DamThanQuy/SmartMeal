using System.Text.Json.Serialization;

namespace SmartMeal.Application.DTOs.HealthSync;

public class SyncHealthMetricsRequestDto
{
    public DateOnly? Date { get; set; }
    
    [JsonPropertyName("steps")]
    public int Steps { get; set; }
    
    public int StepCount { get => Steps; set => Steps = value; }

    [JsonPropertyName("burnedCalories")]
    public double BurnedCalories { get; set; }
    
    public double ActiveCaloriesBurned { get => BurnedCalories; set => BurnedCalories = value; }
    
    public double DistanceMeters { get; set; }
    public string Source { get; set; } = "GoogleFit";
}

public class SyncHealthMetricsResponseDto
{
    public DateOnly Date { get; set; }
    public int Steps { get; set; }
    public double BurnedCalories { get; set; }
    public double DistanceMeters { get; set; }
    public string Source { get; set; } = string.Empty;
    public DateTime SyncedAt { get; set; }
}

public class DailyHealthSyncSummaryDto
{
    public DateOnly Date { get; set; }
    public int Steps { get; set; }
    public int StepGoal { get; set; } = 10000;
    public double BurnedCalories { get; set; }
    public double ConsumedCalories { get; set; }
    public double NetCalories { get; set; }
    public double TargetCalories { get; set; }
    public double RemainingCalories { get; set; }
    public double DistanceMeters { get; set; }
    public List<string> Sources { get; set; } = new();
    public DateTime LastSyncedAt { get; set; }
}
