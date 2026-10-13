using System.ComponentModel.DataAnnotations;
using SmartMeal.Application.Common.Validation;

namespace SmartMeal.Application.DTOs.Health;

public class WeightLogRequestDto
{
    [Range(30, 300, ErrorMessage = "Cân nặng phải từ 30 đến 300 kg.")]
    public double WeightKg { get; set; }

    /// <summary>Thời điểm đo (ISO 8601). Bỏ trống = bây giờ. Không được ở tương lai.</summary>
    [DateNotAfterToday(1)]
    public DateTime? RecordedAt { get; set; }
}

public class WeightPointDto
{
    public Guid Id { get; set; }
    public double WeightKg { get; set; }
    public DateTime RecordedAt { get; set; }
    public double DiffFromTargetKg { get; set; }
}

public class WeightHistoryResponseDto
{
    public double CurrentWeightKg { get; set; }
    public double TargetWeightKg { get; set; }
    public double InitialWeightKg { get; set; }
    public double TotalWeightChangedKg { get; set; }
    public double BMI { get; set; }
    public string BMICategory { get; set; } = "Bình thường";
    public List<WeightPointDto> History { get; set; } = new();
}
