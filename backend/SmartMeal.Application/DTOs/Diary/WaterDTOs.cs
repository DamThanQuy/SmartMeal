using System.ComponentModel.DataAnnotations;
using SmartMeal.Application.Common.Validation;

namespace SmartMeal.Application.DTOs.Diary;

public class LogWaterRequestDto
{
    [Range(1, 5000, ErrorMessage = "Lượng nước phải từ 1 đến 5000 ml.")]
    public int AmountMl { get; set; } = 250;

    [DateNotAfterToday(1)]
    public DateOnly? Date { get; set; }
}

/// <summary>Tổng nước uống của một ngày. Khi vừa ghi/xóa một lần uống, kèm id của lần uống đó.</summary>
public class WaterSummaryDto
{
    /// <summary>Id lần uống vừa ghi (POST) — dùng cho "Hoàn tác" qua DELETE.</summary>
    public Guid? EntryId { get; set; }

    public DateOnly Date { get; set; }
    public int TotalWaterMl { get; set; }
    public int GoalWaterMl { get; set; } = 2000;
    public double Percentage { get; set; }
}

public class WaterEntryDto
{
    public Guid Id { get; set; }
    public int AmountMl { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class WaterDayDto
{
    public DateOnly Date { get; set; }
    public int TotalMl { get; set; }
    public List<WaterEntryDto> Entries { get; set; } = new();
}

/// <summary>Lịch sử nước uống N ngày kết thúc ở ngày yêu cầu (tăng dần), gồm cả ngày không có log (TotalMl = 0).</summary>
public class WaterHistoryDto
{
    public int GoalMl { get; set; } = 2000;
    public List<WaterDayDto> Days { get; set; } = new();
}
