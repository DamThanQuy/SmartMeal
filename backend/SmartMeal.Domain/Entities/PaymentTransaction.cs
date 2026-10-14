namespace SmartMeal.Domain.Entities;

public class PaymentTransaction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public long OrderCode { get; set; }
    public decimal Amount { get; set; }
    public string PlanId { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = "PAYOS";
    public string Status { get; set; } = "PENDING"; // PENDING, PAID, CANCELLED, FAILED
    public string? PaymentUrl { get; set; }
    public string? QrCode { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PaidAt { get; set; }

    // Navigation Properties
    public User? User { get; set; }
}
