using System.ComponentModel.DataAnnotations;

namespace SmartMeal.Application.DTOs.Admin;

public class AdminLoginRequestDto
{
    [Required(ErrorMessage = "Email là bắt buộc.")]
    [EmailAddress(ErrorMessage = "Email không đúng định dạng.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Mật khẩu là bắt buộc.")]
    public string Password { get; set; } = string.Empty;
}

public class AdminDashboardStatsDto
{
    public int TotalUsers { get; set; }
    public int ActiveUsers { get; set; }
    public int LockedUsers { get; set; }
    public int ProUsers { get; set; }
    public int FreeUsers { get; set; }
    public int TotalRecipes { get; set; }
    public int TotalTransactions { get; set; }
    public decimal TotalRevenueVnd { get; set; }
    public decimal MonthlyRevenueVnd { get; set; }
    public List<AdminUserItemDto> RecentUsers { get; set; } = new();
    public List<AdminTransactionItemDto> RecentTransactions { get; set; } = new();
    public Dictionary<string, int> RecipesByMealType { get; set; } = new();
    public List<AdminPlanStatsDto> PopularPlans { get; set; } = new();
}

public class AdminUserItemDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string Role { get; set; } = "User";
    public bool IsPro { get; set; }
    public string SubscriptionStatus { get; set; } = "Free";
    public DateTime? ProExpiresAt { get; set; }
    public string? ProPlanId { get; set; }
    public int FailedLoginCount { get; set; }
    public DateTime? LockoutEnd { get; set; }
    public bool IsLocked { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? HealthGoal { get; set; }
}

public class AdminUserDetailDto : AdminUserItemDto
{
    public AdminHealthProfileSummaryDto? HealthProfile { get; set; }
    public int FavoritesCount { get; set; }
    public int DiariesCount { get; set; }
    public int MealPlansCount { get; set; }
    public List<AdminTransactionItemDto> Transactions { get; set; } = new();
}

public class AdminHealthProfileSummaryDto
{
    public string? Gender { get; set; }
    public int? Age { get; set; }
    public double? HeightCm { get; set; }
    public double? CurrentWeightKg { get; set; }
    public double? TargetWeightKg { get; set; }
    public string? ActivityLevel { get; set; }
    public string? Goal { get; set; }
    public double? TargetCalories { get; set; }
}

public class AdminUpdateUserStatusDto
{
    public bool IsLocked { get; set; }
    public string? Reason { get; set; }
}

public class AdminUpdateUserRoleDto
{
    [Required]
    public string Role { get; set; } = "User"; // "Admin", "User"
}

public class AdminUpdateUserSubscriptionDto
{
    public bool IsPro { get; set; }
    public string? PlanId { get; set; } = "PRO_MONTHLY";

    [Range(1, 3650, ErrorMessage = "Số ngày Pro phải từ 1 đến 3650.")]
    public int? DurationDays { get; set; } = 30;

    /// <summary>Không còn dùng: cấp Pro luôn đặt trạng thái Premium, hủy Pro luôn về Free.</summary>
    public string? Status { get; set; } = "Premium";
}

public class AdminRecipeIngredientInputDto
{
    [Required]
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "Other";
    public string Unit { get; set; } = "g";

    [Range(0, 100000, ErrorMessage = "Số lượng nguyên liệu không được âm.")]
    public double Amount { get; set; } = 100;

    [Range(0, 1000, ErrorMessage = "Calo / 100g phải từ 0 đến 1000.")]
    public double CaloriesPer100g { get; set; }

    [Range(0, 100, ErrorMessage = "Protein / 100g phải từ 0 đến 100.")]
    public double ProteinPer100g { get; set; }

    [Range(0, 100, ErrorMessage = "Carbs / 100g phải từ 0 đến 100.")]
    public double CarbsPer100g { get; set; }

    [Range(0, 100, ErrorMessage = "Fat / 100g phải từ 0 đến 100.")]
    public double FatPer100g { get; set; }

    [Range(typeof(decimal), "0", "100000000", ErrorMessage = "Giá nguyên liệu không được âm.")]
    public decimal EstimatedPriceVnd { get; set; }
}

public class AdminRecipeIngredientItemDto
{
    public Guid IngredientId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public double Amount { get; set; }
    public string Unit { get; set; } = string.Empty;
    public double CaloriesPer100g { get; set; }
    public double ProteinPer100g { get; set; }
    public double CarbsPer100g { get; set; }
    public double FatPer100g { get; set; }
    public decimal EstimatedPriceVnd { get; set; }
}

public class AdminCreateRecipeDto
{
    [Required(ErrorMessage = "Tiêu đề món ăn là bắt buộc.")]
    [StringLength(200, MinimumLength = 2, ErrorMessage = "Tiêu đề từ 2 đến 200 ký tự.")]
    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string Instructions { get; set; } = string.Empty;

    [Range(0, 1440, ErrorMessage = "Thời gian chuẩn bị phải từ 0 đến 1440 phút.")]
    public int PrepTimeMinutes { get; set; } = 10;

    [Range(0, 1440, ErrorMessage = "Thời gian nấu phải từ 0 đến 1440 phút.")]
    public int CookTimeMinutes { get; set; } = 15;

    [Range(1, 100, ErrorMessage = "Khẩu phần phải từ 1 đến 100.")]
    public int Servings { get; set; } = 1;

    /// <summary>App chỉ hiểu 3 mức độ khó này.</summary>
    [Required(ErrorMessage = "Độ khó là bắt buộc.")]
    [RegularExpression("^(Easy|Medium|Hard)$", ErrorMessage = "Độ khó phải là Easy, Medium hoặc Hard.")]
    public string Difficulty { get; set; } = "Easy";

    public bool IsPremium { get; set; }

    /// <summary>Danh sách phân tách bằng dấu phẩy, mỗi phần tử thuộc Breakfast / Lunch / Dinner / Snack (kiểm tra ở controller).</summary>
    public string MealTypes { get; set; } = "Breakfast";

    [Range(0, 10000, ErrorMessage = "Calo mỗi khẩu phần phải từ 0 đến 10000.")]
    public double CaloriesPerServing { get; set; }

    [Range(0, 1000, ErrorMessage = "Protein mỗi khẩu phần phải từ 0 đến 1000 g.")]
    public double ProteinPerServing { get; set; }

    [Range(0, 1000, ErrorMessage = "Carbs mỗi khẩu phần phải từ 0 đến 1000 g.")]
    public double CarbsPerServing { get; set; }

    [Range(0, 1000, ErrorMessage = "Fat mỗi khẩu phần phải từ 0 đến 1000 g.")]
    public double FatPerServing { get; set; }

    public List<string> TagCodes { get; set; } = new();
    public List<AdminRecipeIngredientInputDto> Ingredients { get; set; } = new();
}

public class AdminUpdateRecipeDto : AdminCreateRecipeDto
{
}

public class AdminRecipeDetailDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string Instructions { get; set; } = string.Empty;
    public int PrepTimeMinutes { get; set; }
    public int CookTimeMinutes { get; set; }
    public int TotalTimeMinutes => PrepTimeMinutes + CookTimeMinutes;
    public int Servings { get; set; }
    public string Difficulty { get; set; } = "Easy";
    public bool IsPremium { get; set; }
    public string MealTypes { get; set; } = string.Empty;
    public double CaloriesPerServing { get; set; }
    public double ProteinPerServing { get; set; }
    public double CarbsPerServing { get; set; }
    public double FatPerServing { get; set; }
    public List<string> Tags { get; set; } = new();
    public List<string> TagCodes { get; set; } = new();
    public List<AdminRecipeIngredientItemDto> Ingredients { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

public class AdminPlanStatsDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal PriceVnd { get; set; }
    public string BillingCycle { get; set; } = "Monthly";
    public int DurationDays { get; set; } = 30;
    public bool IsPopular { get; set; }
    public List<string> Features { get; set; } = new();
    public int ActiveSubscribers { get; set; }
    public decimal TotalRevenueVnd { get; set; }
}

public class AdminTransactionItemDto
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string UserEmail { get; set; } = string.Empty;
    public string UserFullName { get; set; } = string.Empty;
    public string PlanId { get; set; } = string.Empty;
    public string PlanName { get; set; } = string.Empty;
    public decimal AmountVnd { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string SessionId { get; set; } = string.Empty;
    public long? OrderCode { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? PaidAt { get; set; }
}

// ==========================================
// USE CASE: MANAGE USER (BAN USER & MODERATE ACCOUNT)
// ==========================================
public class AdminBanUserRequestDto
{
    public bool IsBanned { get; set; }
    public string? Reason { get; set; }
    public int? DurationDays { get; set; } // null = vĩnh viễn (50 năm)
}

public class AdminModerateAccountRequestDto
{
    public string? FullName { get; set; }
    public bool? IsEmailVerified { get; set; }
    public string? ResetPassword { get; set; }
    public bool ClearLockout { get; set; }
    public string? Role { get; set; }
}

// ==========================================
// USE CASE: MANAGE REWARD SYSTEM (CHALLENGES, BADGES, XP)
// ==========================================
public class AdminChallengeItemDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public int DurationDays { get; set; }
    public string Category { get; set; } = "EatClean";
    public int TargetValuePerDay { get; set; }
    public int RewardExp { get; set; }
    public string RewardBadge { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int ParticipantCount { get; set; }
    public int CompletedCount { get; set; }
}

public class AdminCreateChallengeDto
{
    [Required]
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public int DurationDays { get; set; } = 7;
    public string Category { get; set; } = "EatClean"; // một trong ChallengeCategories.All: EatClean, DrinkWater, Exercise
    public int TargetValuePerDay { get; set; } = 3;
    public int RewardExp { get; set; } = 150;
    public string RewardBadge { get; set; } = "Clean Eater";
    public bool IsActive { get; set; } = true;
}

public class AdminBadgeItemDto
{
    public string BadgeId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int UnlockedCount { get; set; }
}

public class AdminXpEventItemDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserFullName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string EventKey { get; set; } = string.Empty;
    public string Kind { get; set; } = string.Empty;
    public int Xp { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AdminGrantXpRequestDto
{
    [Required]
    public Guid UserId { get; set; }
    [Range(1, 10000)]
    public int Xp { get; set; } = 100;
    public string Reason { get; set; } = "Admin thưởng điểm chuyên cần";
}

// ==========================================
// USE CASE: MONITOR SYSTEM ACTIVITY
// ==========================================
public class AdminSystemActivityDto
{
    /// <summary>Số giờ tiến trình API đã chạy (tính từ lúc khởi động).</summary>
    public double ServerUptimeHours { get; set; }
    public DateTime ServerTimeUtc { get; set; } = DateTime.UtcNow;

    /// <summary>"Healthy" khi kết nối được PostgreSQL, "Unavailable" khi không.</summary>
    public string DatabaseStatus { get; set; } = "Healthy";

    /// <summary>Thời gian (ms) của lần kiểm tra kết nối database vừa đo; null khi không kết nối được.</summary>
    public double? DatabaseLatencyMs { get; set; }
    public int TotalAiRequestsToday { get; set; }
    public Dictionary<string, int> AiRequestsByKind { get; set; } = new();
    public List<AdminAiLogItemDto> RecentAiLogs { get; set; } = new();
    public List<AdminDiaryActivityDto> RecentDiaryLogs { get; set; } = new();
    public List<AdminSecurityEventDto> RecentSecurityEvents { get; set; } = new();
}

public class AdminAiLogItemDto
{
    public Guid Id { get; set; }
    public string UserFullName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string Kind { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class AdminDiaryActivityDto
{
    public Guid Id { get; set; }
    public string UserFullName { get; set; } = string.Empty;
    public string MealType { get; set; } = string.Empty;
    public double Calories { get; set; }
    public DateTime Date { get; set; }
}

public class AdminSecurityEventDto
{
    public string EventType { get; set; } = string.Empty;
    public string TargetUser { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

// ==========================================
// USE CASE: VIEW REVENUE REPORT
// ==========================================
public class AdminRevenueReportDto
{
    public decimal TotalRevenue { get; set; }
    public decimal MonthlyRevenue { get; set; }
    public decimal YearlyRevenue { get; set; }
    public decimal AverageRevenuePerPayingUser { get; set; }
    public int TotalTransactions { get; set; }
    public int SuccessfulTransactions { get; set; }
    public int PendingTransactions { get; set; }
    public int FailedTransactions { get; set; }
    public double SuccessRatePercentage { get; set; }
    public List<AdminRevenuePeriodDto> RevenueByPeriod { get; set; } = new();
    public Dictionary<string, decimal> RevenueByMethod { get; set; } = new();
    public Dictionary<string, decimal> RevenueByPlan { get; set; } = new();
}

public class AdminRevenuePeriodDto
{
    public string PeriodLabel { get; set; } = string.Empty;
    public decimal AmountVnd { get; set; }
    public int TransactionCount { get; set; }
}

// ==========================================
// USE CASE: VIEW ENGAGEMENT ANALYTICS
// ==========================================
public class AdminEngagementAnalyticsDto
{
    public int EstimatedDau { get; set; }
    public int EstimatedWau { get; set; }
    public int EstimatedMau { get; set; }
    public int TotalDiariesLogged { get; set; }
    public int TotalWaterLogs { get; set; }
    public long TotalStepsSynced { get; set; }
    public int TotalAiScans { get; set; }
    public double ChallengeCompletionRate { get; set; }
    public double AveragePetLevel { get; set; }
    public List<AdminEngagedUserDto> TopEngagedUsers { get; set; } = new();
    public Dictionary<string, int> ActivityByHour { get; set; } = new();
}

public class AdminEngagedUserDto
{
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int DiariesCount { get; set; }
    public int TotalXp { get; set; }
    public int PetLevel { get; set; }
    public DateTime? LastActiveAt { get; set; }
}

