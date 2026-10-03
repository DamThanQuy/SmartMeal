namespace SmartMeal.Domain.Entities;

/// <summary>Một lượt dùng AI thành công của người dùng — dùng để áp hạn mức hằng ngày cho tài khoản Free (BR-233).</summary>
public class AiUsageLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    /// <summary>snap | voice | fridge.</summary>
    public string Kind { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
