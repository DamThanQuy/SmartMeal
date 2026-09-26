namespace SmartMeal.Application.DTOs.Subscription;

public class SubscriptionPlanDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal PriceVnd { get; set; }
    public string BillingCycle { get; set; } = "Monthly"; // Monthly, Yearly
    public List<string> Features { get; set; } = new();
    public bool IsPopular { get; set; }
}

public class CreateCheckoutSessionRequestDto
{
    public string PlanId { get; set; } = "PRO_MONTHLY";
    public string PaymentMethod { get; set; } = "VNPAY"; // VNPAY, MOMO, STRIPE
}

public class CheckoutSessionResponseDto
{
    public string SessionId { get; set; } = string.Empty;
    public string PaymentUrl { get; set; } = string.Empty;
    public string? QrCodeUrl { get; set; }
    public decimal AmountVnd { get; set; }
    public string Message { get; set; } = string.Empty;
}
