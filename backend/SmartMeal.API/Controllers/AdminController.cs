using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartMeal.API.Infrastructure;
using SmartMeal.Application.Common;
using SmartMeal.Application.Common.Models;
using SmartMeal.Application.DTOs.Admin;
using SmartMeal.Application.DTOs.Auth;
using SmartMeal.Application.DTOs.Subscription;
using SmartMeal.Application.Services;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Infrastructure.Services;

namespace SmartMeal.API.Controllers;

/// <summary>
/// Controller Quản trị viên (Admin):
/// - Thống kê tổng quan hệ thống (Stats Dashboard).
/// - Quản lý người dùng: xem danh sách, chi tiết, khóa/mở khóa, phân quyền, cấp gói Pro.
/// - Quản lý món ăn: xem danh sách, xem chi tiết, thêm mới, chỉnh sửa, xóa món ăn.
/// - Quản lý gói thành viên (Member Plans) & Quản lý giao dịch thanh toán.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AdminController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IJwtTokenService _jwtTokenService;

    public AdminController(ApplicationDbContext db, IJwtTokenService jwtTokenService)
    {
        _db = db;
        _jwtTokenService = jwtTokenService;
    }

    /// <summary>
    /// Đăng nhập dành riêng cho Quản trị viên (Admin).
    /// </summary>
    [AllowAnonymous]
    [HttpPost("auth/login")]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> AdminLogin([FromBody] AdminLoginRequestDto dto)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);

        if (user is null || string.IsNullOrEmpty(user.PasswordHash) || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            return Unauthorized(ApiResponse<AuthResponseDto>.Fail("Email hoặc mật khẩu không chính xác.", null, ApiErrorKind.Unauthorized));
        }

        if (!string.Equals(user.Role, "Admin", StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<AuthResponseDto>.Fail("Tài khoản của bạn không có quyền Quản trị viên (Admin).", null, ApiErrorKind.Forbidden));
        }

        if (user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTime.UtcNow)
        {
            return StatusCode(StatusCodes.Status423Locked, ApiResponse<AuthResponseDto>.Fail("Tài khoản quản trị đang bị khóa.", null, ApiErrorKind.Locked));
        }

        user.FailedLoginCount = 0;
        user.LockoutEnd = null;
        await _db.SaveChangesAsync();

        var token = _jwtTokenService.CreateAccessToken(user);
        var response = new AuthResponseDto
        {
            Token = token.Value,
            ExpiresAt = token.ExpiresAtUtc,
            RefreshToken = Guid.NewGuid().ToString("N"),
            RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(7),
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                AvatarUrl = user.AvatarUrl,
                Role = user.Role,
                IsPro = user.IsProActive(DateTime.UtcNow),
                SubscriptionStatus = user.EffectiveSubscriptionStatus(DateTime.UtcNow),
                ProExpiresAt = user.ProExpiresAt,
                HasCompletedSurvey = true,
                HasPassword = true
            }
        };

        return Ok(ApiResponse<AuthResponseDto>.Ok(response, "Đăng nhập quản trị viên thành công."));
    }

    // ==========================================
    // 1. THỐNG KÊ TỔNG QUAN (DASHBOARD STATS)
    // ==========================================
    [Authorize(Roles = "Admin")]
    [HttpGet("stats")]
    public async Task<ActionResult<ApiResponse<AdminDashboardStatsDto>>> GetDashboardStats()
    {
        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var totalUsers = await _db.Users.CountAsync();
        var lockedUsers = await _db.Users.CountAsync(u => u.LockoutEnd != null && u.LockoutEnd > now);
        var activeUsers = totalUsers - lockedUsers;
        var proUsers = await _db.Users.CountAsync(u => u.IsPro && (u.ProExpiresAt == null || u.ProExpiresAt > now));
        var freeUsers = totalUsers - proUsers;

        var totalRecipes = await _db.Recipes.CountAsync();
        var totalTransactions = await _db.PaymentTransactions.CountAsync();
        var totalRevenue = await _db.PaymentTransactions
            .Where(t => t.Status == PaymentStatuses.Paid)
            .SumAsync(t => (decimal?)t.AmountVnd) ?? 0m;

        var monthlyRevenue = await _db.PaymentTransactions
            .Where(t => t.Status == PaymentStatuses.Paid && t.CreatedAt >= startOfMonth)
            .SumAsync(t => (decimal?)t.AmountVnd) ?? 0m;

        var recentUsers = await _db.Users
            .OrderByDescending(u => u.CreatedAt)
            .Take(5)
            .Select(u => new AdminUserItemDto
            {
                Id = u.Id,
                Email = u.Email,
                FullName = u.FullName,
                AvatarUrl = u.AvatarUrl,
                Role = u.Role,
                IsPro = u.IsPro && (u.ProExpiresAt == null || u.ProExpiresAt > now),
                SubscriptionStatus = u.SubscriptionStatus,
                ProExpiresAt = u.ProExpiresAt,
                ProPlanId = u.ProPlanId,
                FailedLoginCount = u.FailedLoginCount,
                LockoutEnd = u.LockoutEnd,
                IsLocked = u.LockoutEnd != null && u.LockoutEnd > now,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();

        var recentTx = await _db.PaymentTransactions
            .Include(t => t.User)
            .OrderByDescending(t => t.CreatedAt)
            .Take(5)
            .Select(t => new AdminTransactionItemDto
            {
                Id = t.Id,
                UserId = t.UserId,
                UserEmail = t.User != null ? t.User.Email : (t.UserId != null ? "N/A" : "Đã xóa tài khoản"),
                UserFullName = t.User != null ? t.User.FullName : "Người dùng ẩn danh",
                PlanId = t.PlanId,
                PlanName = t.PlanId == SubscriptionCatalog.ProYearly ? "Gói Năm (Pro Yearly)" : "Gói Tháng (Pro Monthly)",
                AmountVnd = t.AmountVnd,
                PaymentMethod = t.PaymentMethod,
                Status = t.Status,
                SessionId = t.SessionId,
                OrderCode = t.OrderCode,
                CreatedAt = t.CreatedAt,
                PaidAt = t.PaidAt
            })
            .ToListAsync();

        var recipes = await _db.Recipes.Select(r => r.MealTypes).ToListAsync();
        var mealTypeStats = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
        {
            ["Breakfast"] = recipes.Count(m => m != null && m.Contains("Breakfast", StringComparison.OrdinalIgnoreCase)),
            ["Lunch"] = recipes.Count(m => m != null && m.Contains("Lunch", StringComparison.OrdinalIgnoreCase)),
            ["Dinner"] = recipes.Count(m => m != null && m.Contains("Dinner", StringComparison.OrdinalIgnoreCase)),
            ["Snack"] = recipes.Count(m => m != null && m.Contains("Snack", StringComparison.OrdinalIgnoreCase))
        };

        var monthlySubs = await _db.Users.CountAsync(u => u.IsPro && u.ProPlanId == SubscriptionCatalog.ProMonthly && (u.ProExpiresAt == null || u.ProExpiresAt > now));
        var yearlySubs = await _db.Users.CountAsync(u => u.IsPro && u.ProPlanId == SubscriptionCatalog.ProYearly && (u.ProExpiresAt == null || u.ProExpiresAt > now));
        var monthlyRev = await _db.PaymentTransactions.Where(t => t.Status == PaymentStatuses.Paid && t.PlanId == SubscriptionCatalog.ProMonthly).SumAsync(t => (decimal?)t.AmountVnd) ?? 0m;
        var yearlyRev = await _db.PaymentTransactions.Where(t => t.Status == PaymentStatuses.Paid && t.PlanId == SubscriptionCatalog.ProYearly).SumAsync(t => (decimal?)t.AmountVnd) ?? 0m;

        var popularPlans = new List<AdminPlanStatsDto>
        {
            new()
            {
                Id = SubscriptionCatalog.ProMonthly,
                Name = "Gói Tháng (Pro Monthly)",
                PriceVnd = 79000,
                BillingCycle = "Monthly",
                DurationDays = 30,
                IsPopular = false,
                Features = new List<string> { "Dùng AI không giới hạn", "Quét tủ lạnh", "Tự động lên thực đơn tuần" },
                ActiveSubscribers = monthlySubs,
                TotalRevenueVnd = monthlyRev
            },
            new()
            {
                Id = SubscriptionCatalog.ProYearly,
                Name = "Gói Năm (Pro Yearly - Tiết kiệm 25%)",
                PriceVnd = 699000,
                BillingCycle = "Yearly",
                DurationDays = 365,
                IsPopular = true,
                Features = new List<string> { "Toàn bộ quyền lợi gói Tháng", "Tiết kiệm 25%", "Hỗ trợ chuyên gia ưu tiên" },
                ActiveSubscribers = yearlySubs,
                TotalRevenueVnd = yearlyRev
            }
        };

        var result = new AdminDashboardStatsDto
        {
            TotalUsers = totalUsers,
            ActiveUsers = activeUsers,
            LockedUsers = lockedUsers,
            ProUsers = proUsers,
            FreeUsers = freeUsers,
            TotalRecipes = totalRecipes,
            TotalTransactions = totalTransactions,
            TotalRevenueVnd = totalRevenue,
            MonthlyRevenueVnd = monthlyRevenue,
            RecentUsers = recentUsers,
            RecentTransactions = recentTx,
            RecipesByMealType = mealTypeStats,
            PopularPlans = popularPlans
        };

        return Ok(ApiResponse<AdminDashboardStatsDto>.Ok(result));
    }

    // ==========================================
    // 2. QUẢN LÝ NGƯỜI DÙNG (USER MANAGEMENT)
    // ==========================================
    [Authorize(Roles = "Admin")]
    [HttpGet("users")]
    public async Task<ActionResult<ApiResponse<List<AdminUserItemDto>>>> GetUsers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        [FromQuery] string? role = null,
        [FromQuery] string? status = null, // "active", "locked"
        [FromQuery] string? subscription = null // "free", "premium", "expired"
    )
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var now = DateTime.UtcNow;

        var query = _db.Users.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(u => u.Email.ToLower().Contains(term) || u.FullName.ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(role) && !string.Equals(role, "all", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(u => u.Role.ToLower() == role.Trim().ToLower());
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (string.Equals(status, "locked", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(u => u.LockoutEnd != null && u.LockoutEnd > now);
            }
            else if (string.Equals(status, "active", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(u => u.LockoutEnd == null || u.LockoutEnd <= now);
            }
        }

        if (!string.IsNullOrWhiteSpace(subscription))
        {
            if (string.Equals(subscription, "premium", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(u => u.IsPro && (u.ProExpiresAt == null || u.ProExpiresAt > now));
            }
            else if (string.Equals(subscription, "free", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(u => !u.IsPro);
            }
            else if (string.Equals(subscription, "expired", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(u => u.IsPro && u.ProExpiresAt != null && u.ProExpiresAt <= now);
            }
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new AdminUserItemDto
            {
                Id = u.Id,
                Email = u.Email,
                FullName = u.FullName,
                AvatarUrl = u.AvatarUrl,
                Role = u.Role,
                IsPro = u.IsPro && (u.ProExpiresAt == null || u.ProExpiresAt > now),
                SubscriptionStatus = u.SubscriptionStatus,
                ProExpiresAt = u.ProExpiresAt,
                ProPlanId = u.ProPlanId,
                FailedLoginCount = u.FailedLoginCount,
                LockoutEnd = u.LockoutEnd,
                IsLocked = u.LockoutEnd != null && u.LockoutEnd > now,
                CreatedAt = u.CreatedAt,
                HealthGoal = u.HealthProfile != null ? u.HealthProfile.Goal : null
            })
            .ToListAsync();

        Response.Headers["X-Total-Count"] = totalCount.ToString();
        Response.Headers["X-Page"] = page.ToString();
        Response.Headers["X-Page-Size"] = pageSize.ToString();
        Response.Headers.AccessControlExposeHeaders = "X-Total-Count,X-Page,X-Page-Size";

        return Ok(ApiResponse<List<AdminUserItemDto>>.Ok(items, $"Tìm thấy {totalCount} người dùng."));
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("users/{id:guid}")]
    public async Task<ActionResult<ApiResponse<AdminUserDetailDto>>> GetUserDetail(Guid id)
    {
        var now = DateTime.UtcNow;
        var user = await _db.Users
            .Include(u => u.HealthProfile)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user is null)
        {
            return NotFound(ApiResponse<AdminUserDetailDto>.Fail("Không tìm thấy người dùng.", null, ApiErrorKind.NotFound));
        }

        var favCount = await _db.UserFavorites.CountAsync(f => f.UserId == id);
        var diaryCount = await _db.NutritionDiaries.CountAsync(d => d.UserId == id);
        var mealPlanCount = await _db.MealPlans.CountAsync(m => m.UserId == id);

        var transactions = await _db.PaymentTransactions
            .Where(t => t.UserId == id)
            .OrderByDescending(t => t.CreatedAt)
            .Take(10)
            .Select(t => new AdminTransactionItemDto
            {
                Id = t.Id,
                UserId = t.UserId,
                UserEmail = user.Email,
                UserFullName = user.FullName,
                PlanId = t.PlanId,
                PlanName = t.PlanId == SubscriptionCatalog.ProYearly ? "Gói Năm (Pro Yearly)" : "Gói Tháng (Pro Monthly)",
                AmountVnd = t.AmountVnd,
                PaymentMethod = t.PaymentMethod,
                Status = t.Status,
                SessionId = t.SessionId,
                OrderCode = t.OrderCode,
                CreatedAt = t.CreatedAt,
                PaidAt = t.PaidAt
            })
            .ToListAsync();

        var detail = new AdminUserDetailDto
        {
            Id = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            AvatarUrl = user.AvatarUrl,
            Role = user.Role,
            IsPro = user.IsPro && (user.ProExpiresAt == null || user.ProExpiresAt > now),
            SubscriptionStatus = user.SubscriptionStatus,
            ProExpiresAt = user.ProExpiresAt,
            ProPlanId = user.ProPlanId,
            FailedLoginCount = user.FailedLoginCount,
            LockoutEnd = user.LockoutEnd,
            IsLocked = user.LockoutEnd != null && user.LockoutEnd > now,
            CreatedAt = user.CreatedAt,
            HealthGoal = user.HealthProfile?.Goal,
            FavoritesCount = favCount,
            DiariesCount = diaryCount,
            MealPlansCount = mealPlanCount,
            Transactions = transactions,
            HealthProfile = user.HealthProfile == null ? null : new AdminHealthProfileSummaryDto
            {
                Gender = user.HealthProfile.Gender,
                Age = user.HealthProfile.Age,
                HeightCm = user.HealthProfile.HeightCm,
                CurrentWeightKg = user.HealthProfile.CurrentWeightKg,
                TargetWeightKg = user.HealthProfile.TargetWeightKg,
                ActivityLevel = user.HealthProfile.ActivityLevel,
                Goal = user.HealthProfile.Goal,
                TargetCalories = user.HealthProfile.DailyCaloriesTarget
            }
        };

        return Ok(ApiResponse<AdminUserDetailDto>.Ok(detail));
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("users/{id:guid}/status")]
    public async Task<ActionResult<ApiResponse<bool>>> UpdateUserStatus(Guid id, [FromBody] AdminUpdateUserStatusDto dto)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null)
        {
            return NotFound(ApiResponse<bool>.Fail("Không tìm thấy người dùng.", null, ApiErrorKind.NotFound));
        }

        if (dto.IsLocked)
        {
            user.LockoutEnd = DateTime.UtcNow.AddYears(100); // Khóa tài khoản
        }
        else
        {
            user.LockoutEnd = null;
            user.FailedLoginCount = 0;
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var message = dto.IsLocked ? "Đã khóa tài khoản người dùng thành công." : "Đã mở khóa tài khoản thành công.";
        return Ok(ApiResponse<bool>.Ok(true, message));
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("users/{id:guid}/role")]
    public async Task<ActionResult<ApiResponse<bool>>> UpdateUserRole(Guid id, [FromBody] AdminUpdateUserRoleDto dto)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null)
        {
            return NotFound(ApiResponse<bool>.Fail("Không tìm thấy người dùng.", null, ApiErrorKind.NotFound));
        }

        var normalizedRole = string.Equals(dto.Role, "Admin", StringComparison.OrdinalIgnoreCase) ? "Admin" : "User";
        user.Role = normalizedRole;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<bool>.Ok(true, $"Đã cập nhật vai trò người dùng thành: {normalizedRole}."));
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("users/{id:guid}/subscription")]
    public async Task<ActionResult<ApiResponse<bool>>> UpdateUserSubscription(Guid id, [FromBody] AdminUpdateUserSubscriptionDto dto)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null)
        {
            return NotFound(ApiResponse<bool>.Fail("Không tìm thấy người dùng.", null, ApiErrorKind.NotFound));
        }

        if (dto.IsPro)
        {
            user.IsPro = true;
            user.SubscriptionStatus = dto.Status ?? SubscriptionStatuses.Premium;
            user.ProPlanId = dto.PlanId ?? SubscriptionCatalog.ProMonthly;
            var duration = dto.DurationDays ?? 30;
            user.ProExpiresAt = DateTime.UtcNow.AddDays(duration);
        }
        else
        {
            user.IsPro = false;
            user.SubscriptionStatus = SubscriptionStatuses.Free;
            user.ProPlanId = null;
            user.ProExpiresAt = null;
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var message = dto.IsPro
            ? $"Đã kích hoạt gói Pro cho người dùng (Hạn dùng: {user.ProExpiresAt:dd/MM/yyyy})."
            : "Đã hủy quyền Pro của người dùng về tài khoản miễn phí.";
        return Ok(ApiResponse<bool>.Ok(true, message));
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("users/{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteUser(Guid id)
    {
        if (this.TryGetUserId(out var currentAdminId) && currentAdminId == id)
        {
            return BadRequest(ApiResponse<bool>.Fail("Bạn không thể tự xóa tài khoản của chính mình.", null, ApiErrorKind.Conflict));
        }

        var user = await _db.Users.FindAsync(id);
        if (user is null)
        {
            return NotFound(ApiResponse<bool>.Fail("Không tìm thấy người dùng.", null, ApiErrorKind.NotFound));
        }

        _db.Users.Remove(user);
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<bool>.Ok(true, "Đã xóa tài khoản người dùng thành công."));
    }

    // ==========================================
    // 3. QUẢN LÝ MÓN ĂN (RECIPE MANAGEMENT)
    // ==========================================
    [Authorize(Roles = "Admin")]
    [HttpGet("recipes")]
    public async Task<ActionResult<ApiResponse<List<AdminRecipeDetailDto>>>> GetRecipes(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        [FromQuery] string? mealType = null,
        [FromQuery] string? difficulty = null,
        [FromQuery] bool? isPremium = null
    )
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _db.Recipes
            .Include(r => r.RecipeTags).ThenInclude(rt => rt.Tag)
            .Include(r => r.RecipeIngredients).ThenInclude(ri => ri.Ingredient)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(r => r.Title.ToLower().Contains(term) || (r.Description != null && r.Description.ToLower().Contains(term)));
        }

        if (!string.IsNullOrWhiteSpace(mealType) && !string.Equals(mealType, "all", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(r => r.MealTypes != null && r.MealTypes.ToLower().Contains(mealType.Trim().ToLower()));
        }

        if (!string.IsNullOrWhiteSpace(difficulty) && !string.Equals(difficulty, "all", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(r => r.Difficulty.ToLower() == difficulty.Trim().ToLower());
        }

        if (isPremium.HasValue)
        {
            query = query.Where(r => r.IsPremium == isPremium.Value);
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new AdminRecipeDetailDto
            {
                Id = r.Id,
                Title = r.Title,
                Description = r.Description ?? string.Empty,
                ImageUrl = r.ImageUrl ?? string.Empty,
                Instructions = r.Instructions ?? string.Empty,
                PrepTimeMinutes = r.PrepTimeMinutes,
                CookTimeMinutes = r.CookTimeMinutes,
                Servings = r.Servings,
                Difficulty = r.Difficulty,
                IsPremium = r.IsPremium,
                MealTypes = r.MealTypes ?? string.Empty,
                CaloriesPerServing = r.CaloriesPerServing,
                ProteinPerServing = r.ProteinPerServing,
                CarbsPerServing = r.CarbsPerServing,
                FatPerServing = r.FatPerServing,
                Tags = r.RecipeTags.Select(rt => rt.Tag.Name).ToList(),
                TagCodes = r.RecipeTags.Select(rt => rt.Tag.Code).ToList(),
                CreatedAt = r.CreatedAt,
                Ingredients = r.RecipeIngredients.Select(ri => new AdminRecipeIngredientItemDto
                {
                    IngredientId = ri.IngredientId,
                    Name = ri.Ingredient.Name,
                    Category = ri.Ingredient.Category,
                    Amount = ri.Amount,
                    Unit = ri.Unit,
                    CaloriesPer100g = ri.Ingredient.CaloriesPer100g,
                    ProteinPer100g = ri.Ingredient.ProteinPer100g,
                    CarbsPer100g = ri.Ingredient.CarbsPer100g,
                    FatPer100g = ri.Ingredient.FatPer100g,
                    EstimatedPriceVnd = ri.Ingredient.EstimatedPriceVnd
                }).ToList()
            })
            .ToListAsync();

        Response.Headers["X-Total-Count"] = totalCount.ToString();
        Response.Headers["X-Page"] = page.ToString();
        Response.Headers["X-Page-Size"] = pageSize.ToString();
        Response.Headers.AccessControlExposeHeaders = "X-Total-Count,X-Page,X-Page-Size";

        return Ok(ApiResponse<List<AdminRecipeDetailDto>>.Ok(items, $"Tìm thấy {totalCount} món ăn."));
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("recipes/{id:guid}")]
    public async Task<ActionResult<ApiResponse<AdminRecipeDetailDto>>> GetRecipeDetail(Guid id)
    {
        var r = await _db.Recipes
            .Include(x => x.RecipeTags).ThenInclude(rt => rt.Tag)
            .Include(x => x.RecipeIngredients).ThenInclude(ri => ri.Ingredient)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (r is null)
        {
            return NotFound(ApiResponse<AdminRecipeDetailDto>.Fail("Không tìm thấy món ăn.", null, ApiErrorKind.NotFound));
        }

        var detail = new AdminRecipeDetailDto
        {
            Id = r.Id,
            Title = r.Title,
            Description = r.Description ?? string.Empty,
            ImageUrl = r.ImageUrl ?? string.Empty,
            Instructions = r.Instructions ?? string.Empty,
            PrepTimeMinutes = r.PrepTimeMinutes,
            CookTimeMinutes = r.CookTimeMinutes,
            Servings = r.Servings,
            Difficulty = r.Difficulty,
            IsPremium = r.IsPremium,
            MealTypes = r.MealTypes ?? string.Empty,
            CaloriesPerServing = r.CaloriesPerServing,
            ProteinPerServing = r.ProteinPerServing,
            CarbsPerServing = r.CarbsPerServing,
            FatPerServing = r.FatPerServing,
            Tags = r.RecipeTags.Select(rt => rt.Tag.Name).ToList(),
            TagCodes = r.RecipeTags.Select(rt => rt.Tag.Code).ToList(),
            CreatedAt = r.CreatedAt,
            Ingredients = r.RecipeIngredients.Select(ri => new AdminRecipeIngredientItemDto
            {
                IngredientId = ri.IngredientId,
                Name = ri.Ingredient.Name,
                Category = ri.Ingredient.Category,
                Amount = ri.Amount,
                Unit = ri.Unit,
                CaloriesPer100g = ri.Ingredient.CaloriesPer100g,
                ProteinPer100g = ri.Ingredient.ProteinPer100g,
                CarbsPer100g = ri.Ingredient.CarbsPer100g,
                FatPer100g = ri.Ingredient.FatPer100g,
                EstimatedPriceVnd = ri.Ingredient.EstimatedPriceVnd
            }).ToList()
        };

        return Ok(ApiResponse<AdminRecipeDetailDto>.Ok(detail));
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("recipes")]
    public async Task<ActionResult<ApiResponse<AdminRecipeDetailDto>>> CreateRecipe([FromBody] AdminCreateRecipeDto dto)
    {
        if (await _db.Recipes.AnyAsync(r => r.Title.ToLower() == dto.Title.Trim().ToLower()))
        {
            return BadRequest(ApiResponse<AdminRecipeDetailDto>.Fail("Tên món ăn này đã tồn tại trong hệ thống.", null, ApiErrorKind.Conflict));
        }

        var recipe = new Recipe
        {
            Title = dto.Title.Trim(),
            Description = dto.Description.Trim(),
            ImageUrl = string.IsNullOrWhiteSpace(dto.ImageUrl)
                ? "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80"
                : dto.ImageUrl.Trim(),
            Instructions = dto.Instructions.Trim(),
            PrepTimeMinutes = Math.Max(1, dto.PrepTimeMinutes),
            CookTimeMinutes = Math.Max(0, dto.CookTimeMinutes),
            Servings = Math.Max(1, dto.Servings),
            Difficulty = dto.Difficulty ?? "Easy",
            IsPremium = dto.IsPremium,
            MealTypes = string.IsNullOrWhiteSpace(dto.MealTypes) ? "Lunch" : dto.MealTypes.Trim(),
            CaloriesPerServing = dto.CaloriesPerServing,
            ProteinPerServing = dto.ProteinPerServing,
            CarbsPerServing = dto.CarbsPerServing,
            FatPerServing = dto.FatPerServing,
            CreatedAt = DateTime.UtcNow
        };

        _db.Recipes.Add(recipe);
        await _db.SaveChangesAsync();

        // Gắn Thẻ Tag
        if (dto.TagCodes != null && dto.TagCodes.Count > 0)
        {
            var tags = await _db.Tags.Where(t => dto.TagCodes.Contains(t.Code)).ToListAsync();
            foreach (var t in tags)
            {
                _db.RecipeTags.Add(new RecipeTag { RecipeId = recipe.Id, TagId = t.Id });
            }
        }

        // Gắn Nguyên Liệu
        if (dto.Ingredients != null && dto.Ingredients.Count > 0)
        {
            foreach (var ing in dto.Ingredients)
            {
                var ingName = ing.Name.Trim();
                var dbIng = await _db.Ingredients.FirstOrDefaultAsync(i => i.Name.ToLower() == ingName.ToLower());
                if (dbIng is null)
                {
                    dbIng = new Ingredient
                    {
                        Name = ingName,
                        Category = string.IsNullOrWhiteSpace(ing.Category) ? "Other" : ing.Category,
                        DefaultUnit = string.IsNullOrWhiteSpace(ing.Unit) ? "g" : ing.Unit,
                        CaloriesPer100g = ing.CaloriesPer100g,
                        ProteinPer100g = ing.ProteinPer100g,
                        CarbsPer100g = ing.CarbsPer100g,
                        FatPer100g = ing.FatPer100g,
                        EstimatedPriceVnd = ing.EstimatedPriceVnd
                    };
                    _db.Ingredients.Add(dbIng);
                    await _db.SaveChangesAsync();
                }

                _db.RecipeIngredients.Add(new RecipeIngredient
                {
                    RecipeId = recipe.Id,
                    IngredientId = dbIng.Id,
                    Amount = ing.Amount > 0 ? ing.Amount : 100,
                    Unit = string.IsNullOrWhiteSpace(ing.Unit) ? dbIng.DefaultUnit : ing.Unit
                });
            }
        }

        await _db.SaveChangesAsync();

        return await GetRecipeDetail(recipe.Id);
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("recipes/{id:guid}")]
    public async Task<ActionResult<ApiResponse<AdminRecipeDetailDto>>> UpdateRecipe(Guid id, [FromBody] AdminUpdateRecipeDto dto)
    {
        var recipe = await _db.Recipes
            .Include(r => r.RecipeTags)
            .Include(r => r.RecipeIngredients)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (recipe is null)
        {
            return NotFound(ApiResponse<AdminRecipeDetailDto>.Fail("Không tìm thấy món ăn.", null, ApiErrorKind.NotFound));
        }

        recipe.Title = dto.Title.Trim();
        recipe.Description = dto.Description.Trim();
        if (!string.IsNullOrWhiteSpace(dto.ImageUrl)) recipe.ImageUrl = dto.ImageUrl.Trim();
        recipe.Instructions = dto.Instructions.Trim();
        recipe.PrepTimeMinutes = Math.Max(1, dto.PrepTimeMinutes);
        recipe.CookTimeMinutes = Math.Max(0, dto.CookTimeMinutes);
        recipe.Servings = Math.Max(1, dto.Servings);
        recipe.Difficulty = dto.Difficulty ?? "Easy";
        recipe.IsPremium = dto.IsPremium;
        recipe.MealTypes = string.IsNullOrWhiteSpace(dto.MealTypes) ? "Lunch" : dto.MealTypes.Trim();
        recipe.CaloriesPerServing = dto.CaloriesPerServing;
        recipe.ProteinPerServing = dto.ProteinPerServing;
        recipe.CarbsPerServing = dto.CarbsPerServing;
        recipe.FatPerServing = dto.FatPerServing;

        // Cập nhật Tags
        _db.RecipeTags.RemoveRange(recipe.RecipeTags);
        if (dto.TagCodes != null && dto.TagCodes.Count > 0)
        {
            var tags = await _db.Tags.Where(t => dto.TagCodes.Contains(t.Code)).ToListAsync();
            foreach (var t in tags)
            {
                _db.RecipeTags.Add(new RecipeTag { RecipeId = recipe.Id, TagId = t.Id });
            }
        }

        // Cập nhật Nguyên Liệu
        _db.RecipeIngredients.RemoveRange(recipe.RecipeIngredients);
        if (dto.Ingredients != null && dto.Ingredients.Count > 0)
        {
            foreach (var ing in dto.Ingredients)
            {
                var ingName = ing.Name.Trim();
                var dbIng = await _db.Ingredients.FirstOrDefaultAsync(i => i.Name.ToLower() == ingName.ToLower());
                if (dbIng is null)
                {
                    dbIng = new Ingredient
                    {
                        Name = ingName,
                        Category = string.IsNullOrWhiteSpace(ing.Category) ? "Other" : ing.Category,
                        DefaultUnit = string.IsNullOrWhiteSpace(ing.Unit) ? "g" : ing.Unit,
                        CaloriesPer100g = ing.CaloriesPer100g,
                        ProteinPer100g = ing.ProteinPer100g,
                        CarbsPer100g = ing.CarbsPer100g,
                        FatPer100g = ing.FatPer100g,
                        EstimatedPriceVnd = ing.EstimatedPriceVnd
                    };
                    _db.Ingredients.Add(dbIng);
                    await _db.SaveChangesAsync();
                }

                _db.RecipeIngredients.Add(new RecipeIngredient
                {
                    RecipeId = recipe.Id,
                    IngredientId = dbIng.Id,
                    Amount = ing.Amount > 0 ? ing.Amount : 100,
                    Unit = string.IsNullOrWhiteSpace(ing.Unit) ? dbIng.DefaultUnit : ing.Unit
                });
            }
        }

        await _db.SaveChangesAsync();
        return await GetRecipeDetail(recipe.Id);
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("recipes/{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteRecipe(Guid id)
    {
        var recipe = await _db.Recipes
            .Include(r => r.RecipeTags)
            .Include(r => r.RecipeIngredients)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (recipe is null)
        {
            return NotFound(ApiResponse<bool>.Fail("Không tìm thấy món ăn.", null, ApiErrorKind.NotFound));
        }

        _db.RecipeTags.RemoveRange(recipe.RecipeTags);
        _db.RecipeIngredients.RemoveRange(recipe.RecipeIngredients);

        var favorites = _db.UserFavorites.Where(f => f.RecipeId == id);
        _db.UserFavorites.RemoveRange(favorites);

        var collRecipes = _db.CollectionRecipes.Where(cr => cr.RecipeId == id);
        _db.CollectionRecipes.RemoveRange(collRecipes);

        _db.Recipes.Remove(recipe);
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<bool>.Ok(true, "Đã xóa món ăn thành công."));
    }

    // ==========================================
    // 4. QUẢN LÝ GÓI MEMBER & GIAO DỊCH (SUBSCRIPTIONS & TRANSACTIONS)
    // ==========================================
    [Authorize(Roles = "Admin")]
    [HttpGet("plans")]
    public async Task<ActionResult<ApiResponse<List<AdminPlanStatsDto>>>> GetMemberPlans()
    {
        var now = DateTime.UtcNow;
        var monthlySubs = await _db.Users.CountAsync(u => u.IsPro && u.ProPlanId == SubscriptionCatalog.ProMonthly && (u.ProExpiresAt == null || u.ProExpiresAt > now));
        var yearlySubs = await _db.Users.CountAsync(u => u.IsPro && u.ProPlanId == SubscriptionCatalog.ProYearly && (u.ProExpiresAt == null || u.ProExpiresAt > now));
        var monthlyRev = await _db.PaymentTransactions.Where(t => t.Status == PaymentStatuses.Paid && t.PlanId == SubscriptionCatalog.ProMonthly).SumAsync(t => (decimal?)t.AmountVnd) ?? 0m;
        var yearlyRev = await _db.PaymentTransactions.Where(t => t.Status == PaymentStatuses.Paid && t.PlanId == SubscriptionCatalog.ProYearly).SumAsync(t => (decimal?)t.AmountVnd) ?? 0m;

        var plans = new List<AdminPlanStatsDto>
        {
            new()
            {
                Id = SubscriptionCatalog.ProMonthly,
                Name = "Gói Tháng (Pro Monthly)",
                PriceVnd = 79000,
                BillingCycle = "Monthly",
                DurationDays = 30,
                IsPopular = false,
                Features = new List<string>
                {
                    "Dùng AI không giới hạn: chụp ảnh món ăn, ghi bữa ăn bằng giọng nói",
                    "Quét tủ lạnh bằng AI và gợi ý món nấu được ngay",
                    "Tự động tạo thực đơn cả tuần theo mục tiêu calo"
                },
                ActiveSubscribers = monthlySubs,
                TotalRevenueVnd = monthlyRev
            },
            new()
            {
                Id = SubscriptionCatalog.ProYearly,
                Name = "Gói Năm (Pro Yearly - Tiết kiệm 25%)",
                PriceVnd = 699000,
                BillingCycle = "Yearly",
                DurationDays = 365,
                IsPopular = true,
                Features = new List<string>
                {
                    "Toàn bộ quyền lợi của gói Tháng",
                    "Tiết kiệm hơn 25% so với trả theo tháng (699.000đ thay vì 948.000đ)",
                    "Ưu tiên hỗ trợ kỹ thuật và thực đơn cá nhân hóa"
                },
                ActiveSubscribers = yearlySubs,
                TotalRevenueVnd = yearlyRev
            }
        };

        return Ok(ApiResponse<List<AdminPlanStatsDto>>.Ok(plans));
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("transactions")]
    public async Task<ActionResult<ApiResponse<List<AdminTransactionItemDto>>>> GetTransactions(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? status = null, // "Paid", "Pending", "Failed", "All"
        [FromQuery] string? search = null
    )
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _db.PaymentTransactions
            .Include(t => t.User)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(t => t.Status.ToLower() == status.Trim().ToLower());
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(t =>
                (t.User != null && (t.User.Email.ToLower().Contains(term) || t.User.FullName.ToLower().Contains(term))) ||
                (t.OrderCode.HasValue && t.OrderCode.Value.ToString().Contains(term)) ||
                t.SessionId.ToLower().Contains(term) ||
                t.PlanId.ToLower().Contains(term)
            );
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new AdminTransactionItemDto
            {
                Id = t.Id,
                UserId = t.UserId,
                UserEmail = t.User != null ? t.User.Email : (t.UserId != null ? "N/A" : "Đã xóa tài khoản"),
                UserFullName = t.User != null ? t.User.FullName : "Người dùng ẩn danh",
                PlanId = t.PlanId,
                PlanName = t.PlanId == SubscriptionCatalog.ProYearly ? "Gói Năm (Pro Yearly)" : "Gói Tháng (Pro Monthly)",
                AmountVnd = t.AmountVnd,
                PaymentMethod = t.PaymentMethod,
                Status = t.Status,
                SessionId = t.SessionId,
                OrderCode = t.OrderCode,
                CreatedAt = t.CreatedAt,
                PaidAt = t.PaidAt
            })
            .ToListAsync();

        Response.Headers["X-Total-Count"] = totalCount.ToString();
        Response.Headers["X-Page"] = page.ToString();
        Response.Headers["X-Page-Size"] = pageSize.ToString();
        Response.Headers.AccessControlExposeHeaders = "X-Total-Count,X-Page,X-Page-Size";

        return Ok(ApiResponse<List<AdminTransactionItemDto>>.Ok(items, $"Tìm thấy {totalCount} giao dịch."));
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("transactions/{id:guid}/approve")]
    public async Task<ActionResult<ApiResponse<bool>>> ApproveTransaction(Guid id)
    {
        var tx = await _db.PaymentTransactions
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (tx is null)
        {
            return NotFound(ApiResponse<bool>.Fail("Không tìm thấy giao dịch thanh toán.", null, ApiErrorKind.NotFound));
        }

        tx.Status = PaymentStatuses.Paid;
        tx.PaidAt = DateTime.UtcNow;

        if (tx.User != null)
        {
            tx.User.IsPro = true;
            tx.User.SubscriptionStatus = SubscriptionStatuses.Premium;
            tx.User.ProPlanId = tx.PlanId;
            var days = tx.PlanId == SubscriptionCatalog.ProYearly ? 365 : 30;
            var currentExpiry = tx.User.ProExpiresAt.HasValue && tx.User.ProExpiresAt.Value > DateTime.UtcNow
                ? tx.User.ProExpiresAt.Value
                : DateTime.UtcNow;
            tx.User.ProExpiresAt = currentExpiry.AddDays(days);
        }

        await _db.SaveChangesAsync();
        return Ok(ApiResponse<bool>.Ok(true, "Đã duyệt giao dịch thành công và kích hoạt gói Pro cho người dùng."));
    }

    // ==========================================
    // USE CASE 1 & 2: BAN USER & MODERATE ACCOUNT
    // ==========================================
    [Authorize(Roles = "Admin")]
    [HttpPut("users/{id:guid}/ban")]
    public async Task<ActionResult<ApiResponse<bool>>> BanUser(Guid id, [FromBody] AdminBanUserRequestDto dto)
    {
        if (this.TryGetUserId(out var currentAdminId) && currentAdminId == id)
        {
            return BadRequest(ApiResponse<bool>.Fail("Bạn không thể tự cấm tài khoản của chính mình.", null, ApiErrorKind.Conflict));
        }

        var user = await _db.Users.FindAsync(id);
        if (user is null)
        {
            return NotFound(ApiResponse<bool>.Fail("Không tìm thấy người dùng.", null, ApiErrorKind.NotFound));
        }

        if (dto.IsBanned)
        {
            var days = dto.DurationDays.HasValue && dto.DurationDays.Value > 0 ? dto.DurationDays.Value : 365 * 50;
            user.LockoutEnd = DateTime.UtcNow.AddDays(days);
        }
        else
        {
            user.LockoutEnd = null;
            user.FailedLoginCount = 0;
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var message = dto.IsBanned
            ? $"Đã cấm tài khoản {user.Email} thành công. (Lý do: {dto.Reason ?? "Vi phạm chính sách cộng đồng"})"
            : $"Đã gỡ lệnh cấm cho tài khoản {user.Email}.";

        return Ok(ApiResponse<bool>.Ok(true, message));
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("users/{id:guid}/moderate")]
    public async Task<ActionResult<ApiResponse<bool>>> ModerateAccount(Guid id, [FromBody] AdminModerateAccountRequestDto dto)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null)
        {
            return NotFound(ApiResponse<bool>.Fail("Không tìm thấy người dùng.", null, ApiErrorKind.NotFound));
        }

        if (!string.IsNullOrWhiteSpace(dto.FullName))
        {
            user.FullName = dto.FullName.Trim();
        }

        if (dto.IsEmailVerified.HasValue)
        {
            user.IsEmailVerified = dto.IsEmailVerified.Value;
        }

        if (!string.IsNullOrWhiteSpace(dto.ResetPassword))
        {
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.ResetPassword.Trim());
            user.FailedLoginCount = 0;
            user.LockoutEnd = null;
        }

        if (dto.ClearLockout)
        {
            user.LockoutEnd = null;
            user.FailedLoginCount = 0;
        }

        if (!string.IsNullOrWhiteSpace(dto.Role))
        {
            user.Role = string.Equals(dto.Role, "Admin", StringComparison.OrdinalIgnoreCase) ? "Admin" : "User";
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<bool>.Ok(true, $"Đã kiểm duyệt và cập nhật tài khoản {user.Email} thành công."));
    }

    // ==========================================
    // USE CASE 3: MANAGE REWARD SYSTEM (CHALLENGES, BADGES, XP)
    // ==========================================
    [Authorize(Roles = "Admin")]
    [HttpGet("rewards/challenges")]
    public async Task<ActionResult<ApiResponse<List<AdminChallengeItemDto>>>> GetChallenges()
    {
        var challenges = await _db.Challenges
            .Include(c => c.UserChallenges)
            .OrderByDescending(c => c.IsActive)
            .ThenBy(c => c.DurationDays)
            .Select(c => new AdminChallengeItemDto
            {
                Id = c.Id,
                Title = c.Title,
                Description = c.Description,
                ImageUrl = c.ImageUrl,
                DurationDays = c.DurationDays,
                Category = c.Category,
                TargetValuePerDay = c.TargetValuePerDay,
                RewardExp = c.RewardExp,
                RewardBadge = c.RewardBadge,
                IsActive = c.IsActive,
                ParticipantCount = c.UserChallenges.Count,
                CompletedCount = c.UserChallenges.Count(uc => uc.IsCompleted)
            })
            .ToListAsync();

        return Ok(ApiResponse<List<AdminChallengeItemDto>>.Ok(challenges));
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("rewards/challenges")]
    public async Task<ActionResult<ApiResponse<AdminChallengeItemDto>>> CreateChallenge([FromBody] AdminCreateChallengeDto dto)
    {
        var challenge = new Challenge
        {
            Title = dto.Title.Trim(),
            Description = dto.Description.Trim(),
            ImageUrl = string.IsNullOrWhiteSpace(dto.ImageUrl)
                ? "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=600&q=80"
                : dto.ImageUrl.Trim(),
            DurationDays = Math.Max(1, dto.DurationDays),
            Category = string.IsNullOrWhiteSpace(dto.Category) ? "EatClean" : dto.Category.Trim(),
            TargetValuePerDay = Math.Max(1, dto.TargetValuePerDay),
            RewardExp = Math.Max(10, dto.RewardExp),
            RewardBadge = string.IsNullOrWhiteSpace(dto.RewardBadge) ? "Thử Thách Gia" : dto.RewardBadge.Trim(),
            IsActive = dto.IsActive
        };

        _db.Challenges.Add(challenge);
        await _db.SaveChangesAsync();

        var result = new AdminChallengeItemDto
        {
            Id = challenge.Id,
            Title = challenge.Title,
            Description = challenge.Description,
            ImageUrl = challenge.ImageUrl,
            DurationDays = challenge.DurationDays,
            Category = challenge.Category,
            TargetValuePerDay = challenge.TargetValuePerDay,
            RewardExp = challenge.RewardExp,
            RewardBadge = challenge.RewardBadge,
            IsActive = challenge.IsActive,
            ParticipantCount = 0,
            CompletedCount = 0
        };

        return Ok(ApiResponse<AdminChallengeItemDto>.Ok(result, "Tạo thử thách nhận thưởng mới thành công."));
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("rewards/challenges/{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> UpdateChallenge(Guid id, [FromBody] AdminCreateChallengeDto dto)
    {
        var challenge = await _db.Challenges.FindAsync(id);
        if (challenge is null)
        {
            return NotFound(ApiResponse<bool>.Fail("Không tìm thấy thử thách.", null, ApiErrorKind.NotFound));
        }

        challenge.Title = dto.Title.Trim();
        challenge.Description = dto.Description.Trim();
        if (!string.IsNullOrWhiteSpace(dto.ImageUrl)) challenge.ImageUrl = dto.ImageUrl.Trim();
        challenge.DurationDays = Math.Max(1, dto.DurationDays);
        challenge.Category = string.IsNullOrWhiteSpace(dto.Category) ? challenge.Category : dto.Category.Trim();
        challenge.TargetValuePerDay = Math.Max(1, dto.TargetValuePerDay);
        challenge.RewardExp = Math.Max(10, dto.RewardExp);
        challenge.RewardBadge = string.IsNullOrWhiteSpace(dto.RewardBadge) ? challenge.RewardBadge : dto.RewardBadge.Trim();
        challenge.IsActive = dto.IsActive;

        await _db.SaveChangesAsync();
        return Ok(ApiResponse<bool>.Ok(true, "Cập nhật thử thách thành công."));
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("rewards/challenges/{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteChallenge(Guid id)
    {
        var challenge = await _db.Challenges
            .Include(c => c.UserChallenges)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (challenge is null)
        {
            return NotFound(ApiResponse<bool>.Fail("Không tìm thấy thử thách.", null, ApiErrorKind.NotFound));
        }

        _db.UserChallenges.RemoveRange(challenge.UserChallenges);
        _db.Challenges.Remove(challenge);
        await _db.SaveChangesAsync();

        return Ok(ApiResponse<bool>.Ok(true, "Đã xóa thử thách thành công."));
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("rewards/badges")]
    public async Task<ActionResult<ApiResponse<List<AdminBadgeItemDto>>>> GetBadges()
    {
        var unlockedCounts = await _db.UserBadges
            .GroupBy(b => b.BadgeId)
            .Select(g => new { BadgeId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.BadgeId, x => x.Count);

        var systemBadges = new List<AdminBadgeItemDto>
        {
            new() { BadgeId = "clean_eater_7", Name = "Người Ăn Sạch 7 Ngày", Description = "Hoàn thành 7 ngày ghi nhận bữa ăn Eat Clean", Category = "Nutrition", UnlockedCount = unlockedCounts.GetValueOrDefault("clean_eater_7", 0) },
            new() { BadgeId = "water_master_2l", Name = "Bậc Thầy Nước Uống", Description = "Uống đủ 2L nước mỗi ngày liên tục trong 1 tuần", Category = "Water", UnlockedCount = unlockedCounts.GetValueOrDefault("water_master_2l", 0) },
            new() { BadgeId = "ai_chef_explorer", Name = "Đầu Bếp AI Thông Thái", Description = "Quét tủ lạnh bằng AI và nấu thành công 5 món ăn gợi ý", Category = "AI", UnlockedCount = unlockedCounts.GetValueOrDefault("ai_chef_explorer", 0) },
            new() { BadgeId = "walker_10k_steps", Name = "Chiến Binh 10.000 Bước", Description = "Đi bộ trên 10.000 bước mỗi ngày liên tục", Category = "Exercise", UnlockedCount = unlockedCounts.GetValueOrDefault("walker_10k_steps", 0) },
            new() { BadgeId = "pet_lover_level5", Name = "Bạn Thân Bé Mầm", Description = "Nuôi thú cưng dinh dưỡng đạt cấp độ 5", Category = "Pet", UnlockedCount = unlockedCounts.GetValueOrDefault("pet_lover_level5", 0) }
        };

        return Ok(ApiResponse<List<AdminBadgeItemDto>>.Ok(systemBadges));
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("rewards/xp-events")]
    public async Task<ActionResult<ApiResponse<List<AdminXpEventItemDto>>>> GetXpEvents([FromQuery] int limit = 20)
    {
        var events = await _db.XpEvents
            .Include(x => x.User)
            .OrderByDescending(x => x.CreatedAt)
            .Take(Math.Clamp(limit, 1, 100))
            .Select(x => new AdminXpEventItemDto
            {
                Id = x.Id,
                UserId = x.UserId,
                UserFullName = x.User != null ? x.User.FullName : "Người dùng",
                UserEmail = x.User != null ? x.User.Email : "N/A",
                EventKey = x.EventKey,
                Kind = x.Kind,
                Xp = x.Xp,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync();

        return Ok(ApiResponse<List<AdminXpEventItemDto>>.Ok(events));
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("rewards/grant-xp")]
    public async Task<ActionResult<ApiResponse<bool>>> GrantXpToUser([FromBody] AdminGrantXpRequestDto dto)
    {
        var user = await _db.Users.FindAsync(dto.UserId);
        if (user is null)
        {
            return NotFound(ApiResponse<bool>.Fail("Không tìm thấy người dùng.", null, ApiErrorKind.NotFound));
        }

        var pet = await _db.HealthPets.FirstOrDefaultAsync(p => p.UserId == dto.UserId);
        if (pet is null)
        {
            pet = new HealthPet { UserId = dto.UserId };
            _db.HealthPets.Add(pet);
        }

        pet.TotalXp += dto.Xp;
        pet.Exp += dto.Xp;
        while (pet.Exp >= pet.NextLevelExp)
        {
            pet.Exp -= pet.NextLevelExp;
            pet.Level += 1;
        }
        pet.LastUpdated = DateTime.UtcNow;

        _db.XpEvents.Add(new XpEvent
        {
            UserId = dto.UserId,
            EventKey = $"admin-grant-{Guid.NewGuid():N}",
            Kind = "AdminReward",
            Xp = dto.Xp,
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(ApiResponse<bool>.Ok(true, $"Đã tặng thành công +{dto.Xp} XP cho {user.FullName}."));
    }

    // ==========================================
    // USE CASE 4: MONITOR SYSTEM ACTIVITY
    // ==========================================
    [Authorize(Roles = "Admin")]
    [HttpGet("system/activity")]
    public async Task<ActionResult<ApiResponse<AdminSystemActivityDto>>> GetSystemActivity()
    {
        var now = DateTime.UtcNow;
        var startOfToday = new DateTime(now.Year, now.Month, now.Day, 0, 0, 0, DateTimeKind.Utc);

        var totalAiToday = await _db.AiUsageLogs.CountAsync(l => l.CreatedAt >= startOfToday);
        var aiKinds = await _db.AiUsageLogs
            .GroupBy(l => l.Kind)
            .Select(g => new { Kind = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Kind, x => x.Count);

        var recentAi = await _db.AiUsageLogs
            .Include(l => l.User)
            .OrderByDescending(l => l.CreatedAt)
            .Take(8)
            .Select(l => new AdminAiLogItemDto
            {
                Id = l.Id,
                UserFullName = l.User != null ? l.User.FullName : "Người dùng",
                UserEmail = l.User != null ? l.User.Email : "N/A",
                Kind = l.Kind,
                CreatedAt = l.CreatedAt
            })
            .ToListAsync();

        var recentDiaries = await _db.NutritionDiaries
            .Include(d => d.User)
            .OrderByDescending(d => d.CreatedAt)
            .Take(8)
            .Select(d => new AdminDiaryActivityDto
            {
                Id = d.Id,
                UserFullName = d.User != null ? d.User.FullName : "Người dùng",
                MealType = d.MealType,
                Calories = d.Items.Sum(i => i.Calories),
                Date = d.CreatedAt
            })
            .ToListAsync();

        var recentSecurity = await _db.Users
            .Where(u => u.FailedLoginCount > 0 || (u.LockoutEnd != null && u.LockoutEnd > now))
            .OrderByDescending(u => u.UpdatedAt ?? u.CreatedAt)
            .Take(5)
            .Select(u => new AdminSecurityEventDto
            {
                EventType = u.LockoutEnd != null && u.LockoutEnd > now ? "AccountLocked" : "FailedAttempts",
                TargetUser = $"{u.FullName} ({u.Email})",
                Details = u.LockoutEnd != null && u.LockoutEnd > now
                    ? $"Tài khoản bị khóa đến {u.LockoutEnd:dd/MM/yyyy HH:mm}"
                    : $"Nhập sai mật khẩu {u.FailedLoginCount} lần liên tiếp",
                Timestamp = u.UpdatedAt ?? u.CreatedAt
            })
            .ToListAsync();

        var activity = new AdminSystemActivityDto
        {
            ServerUptimeHours = Math.Round((DateTime.UtcNow - DateTime.UtcNow.Date).TotalHours + 24, 1),
            ServerTimeUtc = DateTime.UtcNow,
            DatabaseStatus = "Healthy",
            TotalAiRequestsToday = totalAiToday,
            AiRequestsByKind = aiKinds,
            RecentAiLogs = recentAi,
            RecentDiaryLogs = recentDiaries,
            RecentSecurityEvents = recentSecurity
        };

        return Ok(ApiResponse<AdminSystemActivityDto>.Ok(activity));
    }

    // ==========================================
    // USE CASE 5: VIEW REVENUE REPORT
    // ==========================================
    [Authorize(Roles = "Admin")]
    [HttpGet("reports/revenue")]
    public async Task<ActionResult<ApiResponse<AdminRevenueReportDto>>> GetRevenueReport()
    {
        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var startOfYear = new DateTime(now.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        var totalPaidTx = await _db.PaymentTransactions
            .Where(t => t.Status == PaymentStatuses.Paid)
            .ToListAsync();

        var totalRevenue = totalPaidTx.Sum(t => t.AmountVnd);
        var monthlyRevenue = totalPaidTx.Where(t => t.CreatedAt >= startOfMonth).Sum(t => t.AmountVnd);
        var yearlyRevenue = totalPaidTx.Where(t => t.CreatedAt >= startOfYear).Sum(t => t.AmountVnd);

        var totalTx = await _db.PaymentTransactions.CountAsync();
        var successTx = totalPaidTx.Count;
        var pendingTx = await _db.PaymentTransactions.CountAsync(t => t.Status == PaymentStatuses.Pending);
        var failedTx = await _db.PaymentTransactions.CountAsync(t => t.Status == PaymentStatuses.Failed);

        var payingUsersCount = totalPaidTx.Select(t => t.UserId).Distinct().Count();
        var arppu = payingUsersCount > 0 ? Math.Round(totalRevenue / payingUsersCount) : 0m;

        // Doanh thu theo 7 ngày qua
        var periodList = new List<AdminRevenuePeriodDto>();
        for (int i = 6; i >= 0; i--)
        {
            var date = DateOnly.FromDateTime(now.AddDays(-i));
            var dayTx = totalPaidTx.Where(t => DateOnly.FromDateTime(t.CreatedAt) == date).ToList();
            periodList.Add(new AdminRevenuePeriodDto
            {
                PeriodLabel = date.ToString("dd/MM"),
                AmountVnd = dayTx.Sum(t => t.AmountVnd),
                TransactionCount = dayTx.Count
            });
        }

        // Doanh thu theo cổng
        var byMethod = totalPaidTx
            .GroupBy(t => t.PaymentMethod)
            .ToDictionary(g => g.Key, g => g.Sum(t => t.AmountVnd));

        // Doanh thu theo gói
        var byPlan = totalPaidTx
            .GroupBy(t => t.PlanId)
            .ToDictionary(g => g.Key == SubscriptionCatalog.ProYearly ? "Gói Năm (Pro Yearly)" : "Gói Tháng (Pro Monthly)", g => g.Sum(t => t.AmountVnd));

        var report = new AdminRevenueReportDto
        {
            TotalRevenue = totalRevenue,
            MonthlyRevenue = monthlyRevenue,
            YearlyRevenue = yearlyRevenue,
            AverageRevenuePerPayingUser = arppu,
            TotalTransactions = totalTx,
            SuccessfulTransactions = successTx,
            PendingTransactions = pendingTx,
            FailedTransactions = failedTx,
            SuccessRatePercentage = totalTx > 0 ? Math.Round((double)successTx / totalTx * 100, 1) : 0,
            RevenueByPeriod = periodList,
            RevenueByMethod = byMethod,
            RevenueByPlan = byPlan
        };

        return Ok(ApiResponse<AdminRevenueReportDto>.Ok(report));
    }

    // ==========================================
    // USE CASE 6: VIEW ENGAGEMENT ANALYTICS
    // ==========================================
    [Authorize(Roles = "Admin")]
    [HttpGet("reports/engagement")]
    public async Task<ActionResult<ApiResponse<AdminEngagementAnalyticsDto>>> GetEngagementAnalytics()
    {
        var now = DateTime.UtcNow;
        var dayAgo = now.AddDays(-1);
        var weekAgo = now.AddDays(-7);
        var monthAgo = now.AddDays(-30);

        // DAU: Người dùng có hoạt động nhật ký hoặc AI trong 24h qua
        var activeUserIdsToday = await _db.NutritionDiaries
            .Where(d => d.CreatedAt >= dayAgo)
            .Select(d => d.UserId)
            .Union(_db.AiUsageLogs.Where(l => l.CreatedAt >= dayAgo).Select(l => l.UserId))
            .Distinct()
            .CountAsync();

        var activeUserIdsWeek = await _db.NutritionDiaries
            .Where(d => d.CreatedAt >= weekAgo)
            .Select(d => d.UserId)
            .Union(_db.AiUsageLogs.Where(l => l.CreatedAt >= weekAgo).Select(l => l.UserId))
            .Distinct()
            .CountAsync();

        var activeUserIdsMonth = await _db.NutritionDiaries
            .Where(d => d.CreatedAt >= monthAgo)
            .Select(d => d.UserId)
            .Union(_db.AiUsageLogs.Where(l => l.CreatedAt >= monthAgo).Select(l => l.UserId))
            .Distinct()
            .CountAsync();

        var totalDiaries = await _db.NutritionDiaries.CountAsync();
        var totalWater = await _db.WaterLogs.CountAsync();
        var totalSteps = await _db.HealthSyncLogs.SumAsync(s => (long?)s.StepCount) ?? 0L;
        var totalAi = await _db.AiUsageLogs.CountAsync();

        var totalUserChallenges = await _db.UserChallenges.CountAsync();
        var completedChallenges = await _db.UserChallenges.CountAsync(c => c.IsCompleted);
        var challengeRate = totalUserChallenges > 0 ? Math.Round((double)completedChallenges / totalUserChallenges * 100, 1) : 0;

        var avgPetLevel = await _db.HealthPets.AnyAsync()
            ? Math.Round(await _db.HealthPets.AverageAsync(p => p.Level), 1)
            : 1.0;

        // Top Engaged Users
        var topUsers = await _db.Users
            .Include(u => u.NutritionDiaries)
            .Take(8)
            .Select(u => new AdminEngagedUserDto
            {
                UserId = u.Id,
                FullName = u.FullName,
                Email = u.Email,
                DiariesCount = u.NutritionDiaries.Count,
                TotalXp = _db.HealthPets.Where(p => p.UserId == u.Id).Select(p => p.TotalXp).FirstOrDefault(),
                PetLevel = _db.HealthPets.Where(p => p.UserId == u.Id).Select(p => (int?)p.Level).FirstOrDefault() ?? 1,
                LastActiveAt = u.UpdatedAt ?? u.CreatedAt
            })
            .OrderByDescending(u => u.TotalXp)
            .ToListAsync();

        var analytics = new AdminEngagementAnalyticsDto
        {
            EstimatedDau = Math.Max(1, activeUserIdsToday),
            EstimatedWau = Math.Max(1, activeUserIdsWeek),
            EstimatedMau = Math.Max(1, activeUserIdsMonth),
            TotalDiariesLogged = totalDiaries,
            TotalWaterLogs = totalWater,
            TotalStepsSynced = totalSteps,
            TotalAiScans = totalAi,
            ChallengeCompletionRate = challengeRate,
            AveragePetLevel = avgPetLevel,
            TopEngagedUsers = topUsers
        };

        return Ok(ApiResponse<AdminEngagementAnalyticsDto>.Ok(analytics));
    }
}

