using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using SmartMeal.Application.Common.Validation;

namespace SmartMeal.Application.DTOs.HealthSync;

/// <summary>
/// Nguồn dữ liệu vận động hợp lệ, xếp theo ưu tiên giảm dần. Khi một ngày có nhiều nguồn, số liệu lấy từ MỘT nguồn
/// ưu tiên cao nhất (không cộng dồn) để không đếm trùng cùng một hoạt động (BR-042).
/// </summary>
public static class HealthSyncSources
{
    public const string HealthConnect = "HealthConnect";
    public const string AppleHealth = "AppleHealth";
    public const string GoogleFit = "GoogleFit";
    public const string Manual = "Manual";

    public static readonly string[] ByPriority = { HealthConnect, AppleHealth, GoogleFit, Manual };

    public static string? Canonical(string? value)
    {
        var trimmed = value?.Trim();
        return ByPriority.FirstOrDefault(s => string.Equals(s, trimmed, StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>Thứ hạng ưu tiên (0 = cao nhất); nguồn lạ xếp cuối.</summary>
    public static int Rank(string source)
    {
        var index = Array.IndexOf(ByPriority, source);
        return index < 0 ? ByPriority.Length : index;
    }
}

/// <summary>
/// Gửi TỔNG của một ngày từ một nguồn. Gửi lại cùng (ngày, nguồn) sẽ thay thế giá trị trước đó, không cộng dồn.
/// </summary>
public class SyncHealthMetricsRequestDto
{
    [DateNotAfterToday(1)]
    public DateOnly? Date { get; set; }

    [JsonPropertyName("steps")]
    [Range(0, 200000, ErrorMessage = "Số bước phải từ 0 đến 200000.")]
    public int Steps { get; set; }

    public int StepCount { get => Steps; set => Steps = value; }

    [JsonPropertyName("burnedCalories")]
    [Range(0, 20000, ErrorMessage = "Calo tiêu hao phải từ 0 đến 20000.")]
    public double BurnedCalories { get; set; }

    public double ActiveCaloriesBurned { get => BurnedCalories; set => BurnedCalories = value; }

    [Range(0, 500000, ErrorMessage = "Quãng đường phải từ 0 đến 500000 m.")]
    public double DistanceMeters { get; set; }

    [OneOfIgnoreCase(HealthSyncSources.HealthConnect, HealthSyncSources.AppleHealth, HealthSyncSources.GoogleFit, HealthSyncSources.Manual)]
    public string Source { get; set; } = HealthSyncSources.GoogleFit;
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

    /// <summary>Số bước/calo/quãng đường lấy từ nguồn ưu tiên cao nhất có dữ liệu trong ngày (<see cref="ActiveSource"/>).</summary>
    public int Steps { get; set; }
    public int StepGoal { get; set; } = 10000;
    public double BurnedCalories { get; set; }
    public double ConsumedCalories { get; set; }
    public double NetCalories { get; set; }
    public double TargetCalories { get; set; }
    public double RemainingCalories { get; set; }
    public double DistanceMeters { get; set; }

    /// <summary>Các nguồn đã có dữ liệu trong ngày (ưu tiên giảm dần). Rỗng nếu chưa đồng bộ gì.</summary>
    public List<string> Sources { get; set; } = new();

    /// <summary>Nguồn đang được dùng để tính số liệu; null nếu chưa có dữ liệu.</summary>
    public string? ActiveSource { get; set; }

    /// <summary>Lần đồng bộ gần nhất trong ngày; null nếu chưa đồng bộ.</summary>
    public DateTime? LastSyncedAt { get; set; }
}
