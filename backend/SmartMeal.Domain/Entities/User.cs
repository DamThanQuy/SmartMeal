namespace SmartMeal.Domain.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    public string? PasswordHash { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? GoogleId { get; set; }
    public bool IsEmailVerified { get; set; } = false;
    public bool IsPro { get; set; } = false;

    /// <summary>Hạn dùng gói Pro (UTC). Null với dữ liệu cũ nghĩa là không có hạn.</summary>
    public DateTime? ProExpiresAt { get; set; }

    /// <summary>Gói đang dùng (vd. PRO_MONTHLY).</summary>
    public string? ProPlanId { get; set; }

    /// <summary>Free | Premium | Expired | Cancelled. Dùng <c>EffectiveSubscriptionStatus</c> để có trạng thái theo thời điểm hiện tại.</summary>
    public string SubscriptionStatus { get; set; } = SubscriptionStatuses.Free;

    public string Role { get; set; } = "User"; // "User", "Admin"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    /// <summary>Số lần đăng nhập sai liên tiếp (reset khi đăng nhập đúng hoặc khi bị khóa).</summary>
    public int FailedLoginCount { get; set; }

    /// <summary>Tài khoản bị khóa tạm thời tới thời điểm này (UTC) sau khi đăng nhập sai quá nhiều lần.</summary>
    public DateTime? LockoutEnd { get; set; }

    // Navigation Properties
    public HealthProfile? HealthProfile { get; set; }
    public ICollection<NutritionDiary> NutritionDiaries { get; set; } = new List<NutritionDiary>();
    public ICollection<MealPlan> MealPlans { get; set; } = new List<MealPlan>();
    public ICollection<UserFavorite> Favorites { get; set; } = new List<UserFavorite>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}

/// <summary>
/// Refresh token (chỉ lưu bản băm SHA-256). Mỗi lần gia hạn token cũ bị thu hồi và thay bằng token mới (xoay vòng);
/// dùng lại token đã thu hồi bị coi là bị đánh cắp và thu hồi toàn bộ phiên của người dùng.
/// </summary>
public class RefreshToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string TokenHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }

    public DateTime? RevokedAt { get; set; }
    public Guid? ReplacedByTokenId { get; set; }
}
