using System.Net;
using System.Net.Http.Headers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SmartMeal.Application.Common;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Tests.Infrastructure;
using Xunit;

namespace SmartMeal.Tests;

// Bản sao kiểu của các DTO Admin (đọc JSON camelCase) dùng riêng cho test.
public sealed record AdminUserItem(
    Guid Id, string Email, string FullName, string Role, bool IsPro, string SubscriptionStatus, DateTime? ProExpiresAt,
    string? ProPlanId, int FailedLoginCount, DateTime? LockoutEnd, bool IsLocked, DateTime CreatedAt);

public sealed record AdminHealthSummary(
    string? Gender, int? Age, double? HeightCm, double? CurrentWeightKg, double? TargetWeightKg, string? ActivityLevel,
    string? Goal, double? TargetCalories);

public sealed record AdminTransactionItem(
    Guid Id, Guid? UserId, string UserEmail, string UserFullName, string PlanId, string PlanName, decimal AmountVnd,
    string PaymentMethod, string Status, string SessionId, long? OrderCode, DateTime CreatedAt, DateTime? PaidAt);

public sealed record AdminUserDetail(
    Guid Id, string Email, string FullName, string Role, bool IsPro, bool IsLocked, AdminHealthSummary? HealthProfile,
    int FavoritesCount, int DiariesCount, int MealPlansCount, List<AdminTransactionItem> Transactions);

public sealed record AdminPlanStats(
    string Id, string Name, decimal PriceVnd, string BillingCycle, int DurationDays, bool IsPopular, List<string> Features,
    int ActiveSubscribers, decimal TotalRevenueVnd);

public sealed record AdminStats(
    int TotalUsers, int ActiveUsers, int LockedUsers, int ProUsers, int FreeUsers, int TotalRecipes, int TotalTransactions,
    decimal TotalRevenueVnd, decimal MonthlyRevenueVnd, List<AdminUserItem> RecentUsers, List<AdminTransactionItem> RecentTransactions,
    Dictionary<string, int> RecipesByMealType, List<AdminPlanStats> PopularPlans);

public sealed record AdminIngredientItem(Guid IngredientId, string Name, string Category, double Amount, string Unit, decimal EstimatedPriceVnd);

public sealed record AdminRecipe(
    Guid Id, string Title, string Description, string ImageUrl, string Instructions, int PrepTimeMinutes, int CookTimeMinutes,
    int TotalTimeMinutes, int Servings, string Difficulty, bool IsPremium, string MealTypes, double CaloriesPerServing,
    double ProteinPerServing, double CarbsPerServing, double FatPerServing, List<string> Tags, List<string> TagCodes,
    List<AdminIngredientItem> Ingredients);

public sealed record AdminChallenge(
    Guid Id, string Title, string Description, string ImageUrl, int DurationDays, string Category, int TargetValuePerDay,
    int RewardExp, string RewardBadge, bool IsActive, int ParticipantCount, int CompletedCount);

public sealed record AdminBadge(string BadgeId, string Name, string Description, string Category, int UnlockedCount);

public sealed record AdminXpEvent(Guid Id, Guid UserId, string UserFullName, string UserEmail, string EventKey, string Kind, int Xp, DateTime CreatedAt);

public sealed record AdminDiaryActivity(Guid Id, string UserFullName, string MealType, double Calories, DateTime Date);

public sealed record AdminSecurityEvent(string EventType, string TargetUser, string Details, DateTime Timestamp);

public sealed record AdminSystemActivity(
    double ServerUptimeHours, DateTime ServerTimeUtc, string DatabaseStatus, int TotalAiRequestsToday,
    List<AdminDiaryActivity> RecentDiaryLogs, List<AdminSecurityEvent> RecentSecurityEvents, double? DatabaseLatencyMs = null);

public sealed record AdminRevenuePeriod(string PeriodLabel, decimal AmountVnd, int TransactionCount);

public sealed record AdminRevenueReport(
    decimal TotalRevenue, decimal MonthlyRevenue, decimal YearlyRevenue, decimal AverageRevenuePerPayingUser, int TotalTransactions,
    int SuccessfulTransactions, int PendingTransactions, int FailedTransactions, double SuccessRatePercentage,
    List<AdminRevenuePeriod> RevenueByPeriod, Dictionary<string, decimal> RevenueByMethod, Dictionary<string, decimal> RevenueByPlan);

public sealed record AdminEngagedUser(Guid UserId, string FullName, string Email, int DiariesCount, int TotalXp, int PetLevel, DateTime? LastActiveAt);

public sealed record AdminEngagement(
    int EstimatedDau, int EstimatedWau, int EstimatedMau, int TotalDiariesLogged, int TotalWaterLogs, long TotalStepsSynced,
    int TotalAiScans, double ChallengeCompletionRate, double AveragePetLevel, List<AdminEngagedUser> TopEngagedUsers);

/// <summary>
/// API quản trị cho Admin Web (<c>/api/admin/*</c>): đăng nhập, phân quyền, thống kê, quản lý người dùng (ban / kiểm duyệt),
/// món ăn, gói & giao dịch, phần thưởng, giám sát hệ thống, báo cáo doanh thu và tương tác.
/// </summary>
public class AdminApiTests : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.UtcNow);

    private readonly ApiFactory _factory;

    public AdminApiTests(ApiFactory factory) => _factory = factory;

    // ───────────────────────────── Helpers ─────────────────────────────

    private static string Iso(DateOnly d) => d.ToString("yyyy-MM-dd");

    private static async Task<T> DataAsync<T>(HttpResponseMessage response)
    {
        Assert.True(response.IsSuccessStatusCode, $"HTTP {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
        return (await response.ReadEnvelopeAsync<T>()).Data!;
    }

    private static async Task<T> GetDataAsync<T>(HttpClient client, string url) => await DataAsync<T>(await client.GetAsync(url));

    private static async Task WithDbAsync(ApiFactory factory, Func<ApplicationDbContext, Task> action)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        await action(scope.ServiceProvider.GetRequiredService<ApplicationDbContext>());
    }

    private static Task SetRoleAsync(ApiFactory factory, Guid userId, string role) =>
        WithDbAsync(factory, db => db.Users.Where(u => u.Id == userId).ExecuteUpdateAsync(s => s.SetProperty(u => u.Role, role)));

    private static Task<HttpResponseMessage> AdminLoginAsync(HttpClient client, string email, string password) =>
        client.PostJsonAsync("/api/admin/auth/login", new { email, password });

    /// <summary>Tài khoản admin riêng của test: đăng ký thường, nâng quyền trong DB rồi đăng nhập qua cổng Admin.</summary>
    private static async Task<TestUser> CreateAdminAsync(ApiFactory factory)
    {
        var registered = await factory.RegisterUserAsync(fullName: "Admin Tester");
        await SetRoleAsync(factory, registered.Id, "Admin");

        var client = factory.CreateClient();
        var auth = await DataAsync<AuthPayload>(await AdminLoginAsync(client, registered.Email, registered.Password));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);
        return new TestUser
        {
            Client = client, Id = registered.Id, Email = registered.Email, Password = registered.Password,
            Token = auth.Token, RefreshToken = auth.RefreshToken
        };
    }

    private Task<TestUser> CreateAdminAsync() => CreateAdminAsync(_factory);

    private static async Task<Guid> AddTransactionAsync(
        ApiFactory factory, Guid? userId, string status, decimal amount = 79000, string planId = "PRO_MONTHLY",
        string method = "SEPAY", DateTime? createdAt = null)
    {
        var when = createdAt ?? DateTime.UtcNow;
        var tx = new PaymentTransaction
        {
            UserId = userId,
            UserRef = "admin-tests",
            PlanId = planId,
            AmountVnd = amount,
            PaymentMethod = method,
            Status = status,
            SessionId = "admin-test-" + Guid.NewGuid().ToString("N"),
            CreatedAt = when,
            PaidAt = status == PaymentStatuses.Paid ? when : null
        };
        await WithDbAsync(factory, async db =>
        {
            db.PaymentTransactions.Add(tx);
            await db.SaveChangesAsync();
        });
        return tx.Id;
    }

    private static async Task<DiaryItemPayload> LogMealAsync(HttpClient client, string name = "Cơm gà", double calories = 200, Guid? recipeId = null)
    {
        var response = await client.PostJsonAsync("/api/nutritiondiary/log", new
        {
            logDate = Iso(Today), mealType = "Lunch", foodName = name, servingSize = 1, unit = "phần", calories,
            carbsGrams = 20, fatGrams = 5, proteinGrams = 15, logMethod = "Manual", recipeId
        });
        return await DataAsync<DiaryItemPayload>(response);
    }

    private static Task<HttpResponseMessage> UserLoginAsync(ApiFactory factory, string email, string password) =>
        factory.CreateClient().PostJsonAsync("/api/auth/login", new { email, password });

    private static object RecipeBody(string title, string difficulty = "Medium", double calories = 420, string mealTypes = "Lunch,Dinner",
        string[]? tagCodes = null, object[]? ingredients = null) => new
    {
        title,
        description = "Món kiểm thử của Admin",
        imageUrl = "",
        instructions = "1. Sơ chế\n2. Nấu chín",
        prepTimeMinutes = 5,
        cookTimeMinutes = 10,
        servings = 2,
        difficulty,
        isPremium = false,
        mealTypes,
        caloriesPerServing = calories,
        proteinPerServing = 35,
        carbsPerServing = 30,
        fatPerServing = 12,
        tagCodes = tagCodes ?? new[] { "eatClean", "highProtein" },
        ingredients = ingredients ?? new object[]
        {
            new { name = "Ức gà phi lê", category = "Meat", unit = "g", amount = 150, caloriesPer100g = 165, proteinPer100g = 31, carbsPer100g = 0, fatPer100g = 3.6, estimatedPriceVnd = 18000 }
        }
    };

    private static async Task<AdminRecipe> CreateRecipeAsync(HttpClient admin, string? title = null, object? body = null)
    {
        title ??= "Món admin " + Guid.NewGuid().ToString("N")[..8];
        return await DataAsync<AdminRecipe>(await admin.PostJsonAsync("/api/admin/recipes", body ?? RecipeBody(title)));
    }

    private static readonly string[] ProtectedEndpoints =
    {
        "/api/admin/stats", "/api/admin/users", "/api/admin/recipes", "/api/admin/plans", "/api/admin/transactions",
        "/api/admin/rewards/challenges", "/api/admin/rewards/badges", "/api/admin/rewards/xp-events",
        "/api/admin/system/activity", "/api/admin/reports/revenue", "/api/admin/reports/engagement"
    };

    // ───────────────────────────── Đăng nhập & phân quyền ─────────────────────────────

    [DbFact]
    public async Task Admin_login_returns_a_token_and_the_admin_profile()
    {
        var registered = await _factory.RegisterUserAsync(fullName: "Quản trị viên A");
        await SetRoleAsync(_factory, registered.Id, "Admin");

        var auth = await DataAsync<AuthPayload>(await AdminLoginAsync(_factory.CreateClient(), registered.Email.ToUpperInvariant(), registered.Password));

        Assert.False(string.IsNullOrWhiteSpace(auth.Token));
        Assert.Equal("Admin", auth.User.Role);
        Assert.Equal(registered.Id, auth.User.Id);
        Assert.True(auth.ExpiresAt > DateTime.UtcNow);
    }

    [DbFact]
    public async Task Admin_login_with_a_wrong_password_is_rejected_with_401()
    {
        var admin = await CreateAdminAsync();

        var response = await AdminLoginAsync(_factory.CreateClient(), admin.Email, "Wrong-Passw0rd!");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.False((await response.ReadEnvelopeAsync<object>()).Success);
    }

    [DbFact]
    public async Task Admin_login_refuses_a_regular_user_with_403()
    {
        var user = await _factory.RegisterUserAsync();

        var response = await AdminLoginAsync(_factory.CreateClient(), user.Email, user.Password);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [DbFact]
    public async Task Admin_login_validates_the_email_format()
    {
        var response = await AdminLoginAsync(_factory.CreateClient(), "not-an-email", "whatever");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [DbFact]
    public async Task Admin_login_locks_the_account_after_five_wrong_passwords_like_the_app_login()
    {
        var admin = await CreateAdminAsync();
        var client = _factory.CreateClient();

        for (var i = 0; i < 5; i++)
        {
            await AdminLoginAsync(client, admin.Email, $"Wrong-{i}-Passw0rd!");
        }

        // Ứng dụng di động khóa tài khoản 15 phút sau 5 lần sai (BR chống dò mật khẩu) — cổng Admin quyền cao hơn càng phải có.
        var correct = await AdminLoginAsync(client, admin.Email, admin.Password);
        Assert.Equal((HttpStatusCode)423, correct.StatusCode);
    }

    [DbFact]
    public async Task The_refresh_token_returned_by_admin_login_can_renew_the_session()
    {
        var admin = await CreateAdminAsync();

        var response = await _factory.CreateClient().PostJsonAsync("/api/auth/refresh", new { refreshToken = admin.RefreshToken });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [DbFact]
    public async Task The_default_admin_password_does_not_work_outside_development()
    {
        // Môi trường Testing (không phải Development) — tài khoản/mật khẩu mặc định in sẵn trên trang đăng nhập Admin Web
        // không được tồn tại, giống tài khoản dev (smartmealuser@gmail.com) chỉ seed ở Development.
        var response = await AdminLoginAsync(_factory.CreateClient(), DbInitializer.AdminAccountEmail, DbInitializer.DefaultAdminPassword);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [DbFact]
    public async Task The_admin_account_is_created_with_the_configured_password()
    {
        using var configured = new ApiFactory().WithSetting("Seed:AdminPassword", "Configured-Adm1n!");
        var client = configured.CreateClient();

        var withConfigured = await AdminLoginAsync(client, DbInitializer.AdminAccountEmail, "Configured-Adm1n!");
        var withDefault = await AdminLoginAsync(client, DbInitializer.AdminAccountEmail, DbInitializer.DefaultAdminPassword);

        Assert.Equal(HttpStatusCode.OK, withConfigured.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, withDefault.StatusCode);
    }

    [DbFact]
    public async Task Seeding_the_admin_over_an_existing_regular_account_takes_it_away_from_its_registrant()
    {
        // Ai đó đăng ký trước bằng email sẽ dùng làm admin: khi seed, tài khoản được nâng quyền nhưng mật khẩu và mọi
        // phiên của người đăng ký trước đều mất hiệu lực.
        var squatter = await _factory.RegisterUserAsync();
        await WithDbAsync(_factory, db => DbInitializer.EnsureAdminAccountAsync(db, "Seeded-Adm1n!", squatter.Email));

        Assert.Equal(HttpStatusCode.Unauthorized, (await AdminLoginAsync(_factory.CreateClient(), squatter.Email, squatter.Password)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await squatter.Client.GetAsync("/api/admin/stats")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await AdminLoginAsync(_factory.CreateClient(), squatter.Email, "Seeded-Adm1n!")).StatusCode);
    }

    [DbFact]
    public async Task Every_admin_endpoint_requires_a_token()
    {
        var anonymous = _factory.CreateClient();

        foreach (var url in ProtectedEndpoints)
        {
            var response = await anonymous.GetAsync(url);
            Assert.True(response.StatusCode == HttpStatusCode.Unauthorized, $"{url} → {(int)response.StatusCode}");
        }
    }

    [DbFact]
    public async Task Every_admin_endpoint_refuses_a_regular_user_token()
    {
        var user = await _factory.RegisterUserAsync();

        foreach (var url in ProtectedEndpoints)
        {
            var response = await user.Client.GetAsync(url);
            Assert.True(response.StatusCode == HttpStatusCode.Forbidden, $"{url} → {(int)response.StatusCode}");
        }

        var write = await user.Client.PutJsonAsync($"/api/admin/users/{user.Id}/role", new { role = "Admin" });
        Assert.Equal(HttpStatusCode.Forbidden, write.StatusCode);
    }

    // ───────────────────────────── Thống kê tổng quan ─────────────────────────────

    [DbFact]
    public async Task Dashboard_stats_count_users_pro_locked_recipes_and_paid_revenue()
    {
        var admin = await CreateAdminAsync();
        var before = await GetDataAsync<AdminStats>(admin.Client, "/api/admin/stats");

        var proUser = await _factory.RegisterUserAsync();
        var lockedUser = await _factory.RegisterUserAsync();
        var newest = await _factory.RegisterUserAsync(fullName: "Người mới nhất");
        await DataAsync<bool>(await admin.Client.PutJsonAsync($"/api/admin/users/{proUser.Id}/subscription", new { isPro = true, planId = "PRO_MONTHLY", durationDays = 30 }));
        await DataAsync<bool>(await admin.Client.PutJsonAsync($"/api/admin/users/{lockedUser.Id}/ban", new { isBanned = true, reason = "spam", durationDays = 7 }));
        await AddTransactionAsync(_factory, proUser.Id, PaymentStatuses.Paid, 100000);
        await AddTransactionAsync(_factory, proUser.Id, PaymentStatuses.Pending, 79000);

        var after = await GetDataAsync<AdminStats>(admin.Client, "/api/admin/stats");

        Assert.Equal(before.TotalUsers + 3, after.TotalUsers);
        Assert.Equal(before.ProUsers + 1, after.ProUsers);
        Assert.Equal(before.LockedUsers + 1, after.LockedUsers);
        Assert.Equal(after.TotalUsers - after.LockedUsers, after.ActiveUsers);
        Assert.Equal(before.TotalTransactions + 2, after.TotalTransactions);
        Assert.Equal(before.TotalRevenueVnd + 100000, after.TotalRevenueVnd);
        Assert.Equal(before.MonthlyRevenueVnd + 100000, after.MonthlyRevenueVnd);
        Assert.Equal(newest.Id, after.RecentUsers[0].Id);
        Assert.True(after.TotalRecipes > 0);
        Assert.Equal(new[] { "Breakfast", "Dinner", "Lunch", "Snack" }, after.RecipesByMealType.Keys.OrderBy(k => k));
        Assert.Equal(2, after.PopularPlans.Count);
    }

    // ───────────────────────────── Quản lý người dùng ─────────────────────────────

    [DbFact]
    public async Task User_list_filters_by_search_role_status_and_subscription()
    {
        var admin = await CreateAdminAsync();
        var tag = Guid.NewGuid().ToString("N")[..10];
        var pro = await _factory.RegisterUserAsync(fullName: $"Pro {tag}");
        var banned = await _factory.RegisterUserAsync(fullName: $"Banned {tag}");
        var free = await _factory.RegisterUserAsync(fullName: $"Free {tag}");
        await DataAsync<bool>(await admin.Client.PutJsonAsync($"/api/admin/users/{pro.Id}/subscription", new { isPro = true }));
        await DataAsync<bool>(await admin.Client.PutJsonAsync($"/api/admin/users/{banned.Id}/ban", new { isBanned = true }));

        var bySearch = await GetDataAsync<List<AdminUserItem>>(admin.Client, $"/api/admin/users?search={tag.ToUpperInvariant()}&pageSize=50");
        var premium = await GetDataAsync<List<AdminUserItem>>(admin.Client, $"/api/admin/users?search={tag}&subscription=premium");
        var freeOnly = await GetDataAsync<List<AdminUserItem>>(admin.Client, $"/api/admin/users?search={tag}&subscription=free");
        var locked = await GetDataAsync<List<AdminUserItem>>(admin.Client, $"/api/admin/users?search={tag}&status=locked");
        var active = await GetDataAsync<List<AdminUserItem>>(admin.Client, $"/api/admin/users?search={tag}&status=active");
        var admins = await GetDataAsync<List<AdminUserItem>>(admin.Client, "/api/admin/users?role=Admin&pageSize=100");

        Assert.Equal(3, bySearch.Count);
        Assert.Equal(new[] { pro.Id }, premium.Select(u => u.Id));
        Assert.Equal(new[] { banned.Id, free.Id }.OrderBy(i => i), freeOnly.Select(u => u.Id).OrderBy(i => i));
        Assert.Equal(new[] { banned.Id }, locked.Select(u => u.Id));
        Assert.True(locked[0].IsLocked);
        Assert.DoesNotContain(active, u => u.Id == banned.Id);
        Assert.All(admins, u => Assert.Equal("Admin", u.Role));
        Assert.Contains(admins, u => u.Id == admin.Id);
    }

    [DbFact]
    public async Task User_list_is_paginated_newest_first_and_exposes_the_total_count()
    {
        var admin = await CreateAdminAsync();
        var tag = Guid.NewGuid().ToString("N")[..10];
        var created = new List<TestUser>();
        for (var i = 0; i < 3; i++) created.Add(await _factory.RegisterUserAsync(fullName: $"Paging {tag} {i}"));

        var page1 = await admin.Client.GetAsync($"/api/admin/users?search={tag}&page=1&pageSize=2");
        var page2 = await admin.Client.GetAsync($"/api/admin/users?search={tag}&page=2&pageSize=2");
        var first = await DataAsync<List<AdminUserItem>>(page1);
        var second = await DataAsync<List<AdminUserItem>>(page2);

        Assert.Equal("3", page1.Headers.GetValues("X-Total-Count").Single());
        Assert.Equal(2, first.Count);
        Assert.Single(second);
        Assert.Equal(created[2].Id, first[0].Id);
        Assert.Equal(created[0].Id, second[0].Id);
    }

    [DbFact]
    public async Task User_detail_includes_the_health_profile_and_activity_counts()
    {
        var admin = await CreateAdminAsync();
        var user = await _factory.RegisterUserAsync(fullName: "Chi Tiết");
        (await user.Client.PostJsonAsync("/api/healthprofile/survey", new
        {
            gender = "Female", age = 28, heightCm = 160, currentWeightKg = 58, targetWeightKg = 52, activityLevel = "Moderate",
            goal = "LoseWeight", allergyIds = Array.Empty<int>(), medicalConditionIds = Array.Empty<int>(), dietaryPreferenceIds = Array.Empty<int>()
        })).EnsureSuccessStatusCode();
        await LogMealAsync(user.Client);
        var recipe = (await GetDataAsync<List<RecipePayload>>(user.Client, "/api/recipes?pageSize=1"))[0];
        (await user.Client.PostAsync($"/api/recipes/{recipe.Id}/favorite", null)).EnsureSuccessStatusCode();

        var detail = await GetDataAsync<AdminUserDetail>(admin.Client, $"/api/admin/users/{user.Id}");

        Assert.Equal(user.Email, detail.Email);
        Assert.NotNull(detail.HealthProfile);
        Assert.Equal("Female", detail.HealthProfile!.Gender);
        Assert.Equal(160, detail.HealthProfile.HeightCm);
        Assert.True(detail.HealthProfile.TargetCalories > 0);
        Assert.Equal(1, detail.DiariesCount);
        Assert.Equal(1, detail.FavoritesCount);
        Assert.Equal(0, detail.MealPlansCount);
    }

    [DbFact]
    public async Task Unknown_users_return_404_on_every_user_action()
    {
        var admin = await CreateAdminAsync();
        var id = Guid.NewGuid();

        Assert.Equal(HttpStatusCode.NotFound, (await admin.Client.GetAsync($"/api/admin/users/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.Client.PutJsonAsync($"/api/admin/users/{id}/role", new { role = "User" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.Client.PutJsonAsync($"/api/admin/users/{id}/ban", new { isBanned = true })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.Client.PutJsonAsync($"/api/admin/users/{id}/moderate", new { fullName = "X" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.Client.PutJsonAsync($"/api/admin/users/{id}/subscription", new { isPro = true })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.Client.PutJsonAsync($"/api/admin/users/{id}/status", new { isLocked = false })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.Client.DeleteAsync($"/api/admin/users/{id}")).StatusCode);
    }

    [DbFact]
    public async Task Expired_pro_users_are_listed_separately_and_users_without_a_profile_have_an_empty_detail()
    {
        var admin = await CreateAdminAsync();
        var tag = Guid.NewGuid().ToString("N")[..10];
        var expired = await _factory.RegisterUserAsync(fullName: $"Expired {tag}");
        await WithDbAsync(_factory, db => db.Users.Where(u => u.Id == expired.Id).ExecuteUpdateAsync(s => s
            .SetProperty(u => u.IsPro, true)
            .SetProperty(u => u.ProPlanId, "PRO_MONTHLY")
            .SetProperty(u => u.ProExpiresAt, DateTime.UtcNow.AddDays(-3))));

        var expiredList = await GetDataAsync<List<AdminUserItem>>(admin.Client, $"/api/admin/users?search={tag}&subscription=expired");
        var premiumList = await GetDataAsync<List<AdminUserItem>>(admin.Client, $"/api/admin/users?search={tag}&subscription=premium");
        var detail = await GetDataAsync<AdminUserDetail>(admin.Client, $"/api/admin/users/{expired.Id}");

        Assert.Equal(new[] { expired.Id }, expiredList.Select(u => u.Id));
        Assert.False(expiredList[0].IsPro);
        Assert.Empty(premiumList);
        Assert.Null(detail.HealthProfile);
        Assert.Equal((0, 0, 0), (detail.DiariesCount, detail.FavoritesCount, detail.MealPlansCount));
    }

    [DbFact]
    public async Task Promoting_a_user_to_admin_opens_the_admin_portal_and_demoting_closes_it()
    {
        var admin = await CreateAdminAsync();
        var user = await _factory.RegisterUserAsync();

        await DataAsync<bool>(await admin.Client.PutJsonAsync($"/api/admin/users/{user.Id}/role", new { role = "admin" }));
        var asAdmin = await AdminLoginAsync(_factory.CreateClient(), user.Email, user.Password);
        await DataAsync<bool>(await admin.Client.PutJsonAsync($"/api/admin/users/{user.Id}/role", new { role = "User" }));
        var asUser = await AdminLoginAsync(_factory.CreateClient(), user.Email, user.Password);

        Assert.Equal(HttpStatusCode.OK, asAdmin.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, asUser.StatusCode);
    }

    [DbFact]
    public async Task A_demoted_admin_loses_admin_access_with_the_token_already_issued()
    {
        var admin = await CreateAdminAsync();
        var other = await CreateAdminAsync();

        await DataAsync<bool>(await admin.Client.PutJsonAsync($"/api/admin/users/{other.Id}/role", new { role = "User" }));

        // Token cũ vẫn mang claim Role=Admin: thu hồi quyền phải có hiệu lực ngay, không đợi token hết hạn.
        var response = await other.Client.GetAsync("/api/admin/users");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [DbFact]
    public async Task A_promoted_user_gets_admin_access_with_the_token_already_issued()
    {
        var admin = await CreateAdminAsync();
        var user = await _factory.RegisterUserAsync();
        Assert.Equal(HttpStatusCode.Forbidden, (await user.Client.GetAsync("/api/admin/stats")).StatusCode);

        await DataAsync<bool>(await admin.Client.PutJsonAsync($"/api/admin/users/{user.Id}/role", new { role = "Admin" }));

        Assert.Equal(HttpStatusCode.OK, (await user.Client.GetAsync("/api/admin/stats")).StatusCode);
    }

    [DbFact]
    public async Task An_unknown_role_is_rejected_instead_of_silently_demoting()
    {
        var admin = await CreateAdminAsync();
        var other = await CreateAdminAsync();

        var response = await admin.Client.PutJsonAsync($"/api/admin/users/{other.Id}/role", new { role = "SuperAdmin" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await other.Client.GetAsync("/api/admin/stats")).StatusCode);
    }

    [DbFact]
    public async Task An_admin_cannot_demote_their_own_account_through_moderation()
    {
        var admin = await CreateAdminAsync();

        var response = await admin.Client.PutJsonAsync($"/api/admin/users/{admin.Id}/moderate", new { role = "User" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [DbFact]
    public async Task An_admin_cannot_demote_their_own_account()
    {
        var admin = await CreateAdminAsync();

        var response = await admin.Client.PutJsonAsync($"/api/admin/users/{admin.Id}/role", new { role = "User" });

        // Đã chặn tự xóa / tự cấm (400) — tự hạ quyền cũng làm admin mất quyền quản trị (và có thể không còn admin nào).
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [DbFact]
    public async Task An_admin_cannot_lock_their_own_account_through_the_status_endpoint()
    {
        var admin = await CreateAdminAsync();

        var response = await admin.Client.PutJsonAsync($"/api/admin/users/{admin.Id}/status", new { isLocked = true, reason = "test" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [DbFact]
    public async Task Status_endpoint_locks_and_unlocks_an_account()
    {
        var admin = await CreateAdminAsync();
        var user = await _factory.RegisterUserAsync();

        await DataAsync<bool>(await admin.Client.PutJsonAsync($"/api/admin/users/{user.Id}/status", new { isLocked = true }));
        var lockedLogin = await UserLoginAsync(_factory, user.Email, user.Password);
        await DataAsync<bool>(await admin.Client.PutJsonAsync($"/api/admin/users/{user.Id}/status", new { isLocked = false }));
        var unlockedLogin = await UserLoginAsync(_factory, user.Email, user.Password);

        Assert.Equal((HttpStatusCode)423, lockedLogin.StatusCode);
        Assert.Equal(HttpStatusCode.OK, unlockedLogin.StatusCode);
    }

    [DbFact]
    public async Task Locking_an_account_signs_it_out_everywhere()
    {
        var admin = await CreateAdminAsync();
        var user = await _factory.RegisterUserAsync();

        await DataAsync<bool>(await admin.Client.PutJsonAsync($"/api/admin/users/{user.Id}/status", new { isLocked = true }));

        Assert.Equal(HttpStatusCode.Unauthorized, (await user.Client.GetAsync("/api/auth/me")).StatusCode);
        var refresh = await _factory.CreateClient().PostJsonAsync("/api/auth/refresh", new { refreshToken = user.RefreshToken });
        Assert.Equal(HttpStatusCode.Unauthorized, refresh.StatusCode);
    }

    [DbFact]
    public async Task Granting_and_revoking_pro_is_reflected_in_the_users_subscription_status()
    {
        var admin = await CreateAdminAsync();
        var user = await _factory.RegisterUserAsync();

        await DataAsync<bool>(await admin.Client.PutJsonAsync($"/api/admin/users/{user.Id}/subscription", new { isPro = true, planId = "PRO_YEARLY", durationDays = 365 }));
        var granted = await GetDataAsync<SubscriptionStatusPayload>(user.Client, "/api/subscription/status");
        await DataAsync<bool>(await admin.Client.PutJsonAsync($"/api/admin/users/{user.Id}/subscription", new { isPro = false }));
        var revoked = await GetDataAsync<SubscriptionStatusPayload>(user.Client, "/api/subscription/status");

        Assert.True(granted.IsPro);
        Assert.Equal("PRO_YEARLY", granted.PlanId);
        Assert.InRange(granted.ProExpiresAt!.Value, DateTime.UtcNow.AddDays(364), DateTime.UtcNow.AddDays(366));
        Assert.False(revoked.IsPro);
        Assert.Equal("Free", revoked.Status);
    }

    [DbFact]
    public async Task Granting_pro_rejects_an_unknown_plan()
    {
        var admin = await CreateAdminAsync();
        var user = await _factory.RegisterUserAsync();

        var response = await admin.Client.PutJsonAsync($"/api/admin/users/{user.Id}/subscription", new { isPro = true, planId = "PRO_LIFETIME", durationDays = 30 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.False((await GetDataAsync<SubscriptionStatusPayload>(user.Client, "/api/subscription/status")).IsPro);
    }

    [DbTheory]
    [InlineData(0)]
    [InlineData(-30)]
    public async Task Granting_pro_rejects_a_non_positive_duration(int days)
    {
        var admin = await CreateAdminAsync();
        var user = await _factory.RegisterUserAsync();

        var response = await admin.Client.PutJsonAsync($"/api/admin/users/{user.Id}/subscription", new { isPro = true, durationDays = days });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [DbFact]
    public async Task Deleting_a_user_removes_the_account_but_keeps_their_payment_history()
    {
        var admin = await CreateAdminAsync();
        var user = await _factory.RegisterUserAsync();
        var txId = await AddTransactionAsync(_factory, user.Id, PaymentStatuses.Paid);

        await DataAsync<bool>(await admin.Client.DeleteAsync($"/api/admin/users/{user.Id}"));

        Assert.Equal(HttpStatusCode.NotFound, (await admin.Client.GetAsync($"/api/admin/users/{user.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await user.Client.GetAsync("/api/auth/me")).StatusCode);
        var transactions = await GetDataAsync<List<AdminTransactionItem>>(admin.Client, "/api/admin/transactions?pageSize=100");
        var kept = Assert.Single(transactions, t => t.Id == txId);
        Assert.Null(kept.UserId);
        Assert.Equal("Đã xóa tài khoản", kept.UserEmail);
    }

    [DbFact]
    public async Task An_admin_cannot_delete_or_ban_their_own_account()
    {
        var admin = await CreateAdminAsync();

        var delete = await admin.Client.DeleteAsync($"/api/admin/users/{admin.Id}");
        var ban = await admin.Client.PutJsonAsync($"/api/admin/users/{admin.Id}/ban", new { isBanned = true });

        Assert.Equal(HttpStatusCode.BadRequest, delete.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, ban.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await admin.Client.GetAsync("/api/admin/stats")).StatusCode);
    }

    // ───────────────────────────── UC1: Ban user ─────────────────────────────

    [DbFact]
    public async Task A_banned_user_cannot_log_in_until_unbanned()
    {
        var admin = await CreateAdminAsync();
        var user = await _factory.RegisterUserAsync();

        await DataAsync<bool>(await admin.Client.PutJsonAsync($"/api/admin/users/{user.Id}/ban", new { isBanned = true, reason = "Spam", durationDays = 30 }));
        var whileBanned = await UserLoginAsync(_factory, user.Email, user.Password);
        await DataAsync<bool>(await admin.Client.PutJsonAsync($"/api/admin/users/{user.Id}/ban", new { isBanned = false }));
        var afterUnban = await UserLoginAsync(_factory, user.Email, user.Password);

        Assert.Equal((HttpStatusCode)423, whileBanned.StatusCode);
        Assert.Equal(HttpStatusCode.OK, afterUnban.StatusCode);
    }

    [DbTheory]
    [InlineData(1)]
    [InlineData(30)]
    [InlineData(null)]
    public async Task Ban_duration_sets_the_lockout_end(int? days)
    {
        var admin = await CreateAdminAsync();
        var user = await _factory.RegisterUserAsync();

        await DataAsync<bool>(await admin.Client.PutJsonAsync($"/api/admin/users/{user.Id}/ban", new { isBanned = true, durationDays = days }));
        var detail = (await GetDataAsync<List<AdminUserItem>>(admin.Client, $"/api/admin/users?search={user.Email}")).Single();

        Assert.True(detail.IsLocked);
        var expected = DateTime.UtcNow.AddDays(days ?? 365 * 50);
        Assert.InRange(detail.LockoutEnd!.Value, expected.AddMinutes(-5), expected.AddMinutes(5));
    }

    [DbFact]
    public async Task Banning_a_user_revokes_their_current_access_token()
    {
        var admin = await CreateAdminAsync();
        var user = await _factory.RegisterUserAsync();
        Assert.Equal(HttpStatusCode.OK, (await user.Client.GetAsync("/api/auth/me")).StatusCode);

        await DataAsync<bool>(await admin.Client.PutJsonAsync($"/api/admin/users/{user.Id}/ban", new { isBanned = true, durationDays = 30 }));

        // Admin Web hứa: "Người dùng sẽ bị thu hồi token ngay lập tức và không thể truy cập SmartMeal."
        var response = await user.Client.GetAsync("/api/auth/me");
        Assert.NotEqual(HttpStatusCode.OK, response.StatusCode);
    }

    [DbFact]
    public async Task Banning_a_user_revokes_their_refresh_token()
    {
        var admin = await CreateAdminAsync();
        var user = await _factory.RegisterUserAsync();

        await DataAsync<bool>(await admin.Client.PutJsonAsync($"/api/admin/users/{user.Id}/ban", new { isBanned = true, durationDays = 30 }));

        var refresh = await _factory.CreateClient().PostJsonAsync("/api/auth/refresh", new { refreshToken = user.RefreshToken });
        Assert.NotEqual(HttpStatusCode.OK, refresh.StatusCode);
    }

    // ───────────────────────────── UC2: Moderate account ─────────────────────────────

    [DbFact]
    public async Task Moderation_renames_verifies_and_resets_the_password()
    {
        var admin = await CreateAdminAsync();
        var user = await _factory.RegisterUserAsync(fullName: "Tên thô tục");

        await DataAsync<bool>(await admin.Client.PutJsonAsync($"/api/admin/users/{user.Id}/moderate", new
        {
            fullName = "  Tên Hợp Lệ  ", isEmailVerified = true, resetPassword = "NewPassw0rd!", clearLockout = true, role = "User"
        }));

        var oldPassword = await UserLoginAsync(_factory, user.Email, user.Password);
        var newPassword = await UserLoginAsync(_factory, user.Email, "NewPassw0rd!");
        var me = (await newPassword.ReadEnvelopeAsync<AuthPayload>()).Data!;

        Assert.Equal(HttpStatusCode.Unauthorized, oldPassword.StatusCode);
        Assert.Equal(HttpStatusCode.OK, newPassword.StatusCode);
        Assert.Equal("Tên Hợp Lệ", me.User.FullName);
        Assert.Equal("User", me.User.Role);
    }

    [DbFact]
    public async Task Moderation_clears_a_brute_force_lockout()
    {
        var admin = await CreateAdminAsync();
        var user = await _factory.RegisterUserAsync();
        for (var i = 0; i < 5; i++) await UserLoginAsync(_factory, user.Email, $"Wrong-{i}-Passw0rd!");
        Assert.Equal((HttpStatusCode)423, (await UserLoginAsync(_factory, user.Email, user.Password)).StatusCode);

        await DataAsync<bool>(await admin.Client.PutJsonAsync($"/api/admin/users/{user.Id}/moderate", new { clearLockout = true }));

        Assert.Equal(HttpStatusCode.OK, (await UserLoginAsync(_factory, user.Email, user.Password)).StatusCode);
    }

    [DbFact]
    public async Task Moderation_password_reset_follows_the_password_policy()
    {
        var admin = await CreateAdminAsync();
        var user = await _factory.RegisterUserAsync();

        // Đăng ký/đổi mật khẩu đều yêu cầu 8–128 ký tự.
        var response = await admin.Client.PutJsonAsync($"/api/admin/users/{user.Id}/moderate", new { resetPassword = "123" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [DbFact]
    public async Task Moderation_password_reset_signs_out_existing_sessions()
    {
        var admin = await CreateAdminAsync();
        var user = await _factory.RegisterUserAsync();

        await DataAsync<bool>(await admin.Client.PutJsonAsync($"/api/admin/users/{user.Id}/moderate", new { resetPassword = "Reset-Passw0rd!" }));

        // Người dùng tự đổi mật khẩu thì mọi refresh token bị thu hồi; admin đặt lại (tài khoản bị xâm phạm) cũng phải vậy.
        var refresh = await _factory.CreateClient().PostJsonAsync("/api/auth/refresh", new { refreshToken = user.RefreshToken });
        Assert.Equal(HttpStatusCode.Unauthorized, refresh.StatusCode);
    }

    // ───────────────────────────── Quản lý món ăn ─────────────────────────────

    [DbFact]
    public async Task A_recipe_created_by_the_admin_appears_in_the_app_catalog_with_tags_and_ingredients()
    {
        var admin = await CreateAdminAsync();
        var user = await _factory.RegisterUserAsync();
        var title = "Gà áp chảo hạt chia " + Guid.NewGuid().ToString("N")[..6];
        var newIngredient = "Hạt chia " + Guid.NewGuid().ToString("N")[..6];

        var created = await CreateRecipeAsync(admin.Client, body: RecipeBody(title, ingredients: new object[]
        {
            new { name = "Ức gà phi lê", category = "Meat", unit = "g", amount = 150, caloriesPer100g = 165, proteinPer100g = 31, carbsPer100g = 0, fatPer100g = 3.6, estimatedPriceVnd = 18000 },
            new { name = newIngredient, category = "Grain", unit = "g", amount = 10, caloriesPer100g = 486, proteinPer100g = 17, carbsPer100g = 42, fatPer100g = 31, estimatedPriceVnd = 3000 }
        }));
        var inApp = await GetDataAsync<RecipePayload>(user.Client, $"/api/recipes/{created.Id}");

        Assert.Equal(title, created.Title);
        Assert.Equal(15, created.TotalTimeMinutes);
        Assert.Equal(new[] { "eatClean", "highProtein" }, created.TagCodes.OrderBy(c => c));
        Assert.Equal(2, created.Ingredients.Count);
        // Nguyên liệu có sẵn được dùng lại (không tạo bản trùng), nguyên liệu mới được thêm vào danh mục.
        await WithDbAsync(_factory, async db =>
        {
            Assert.Equal(1, await db.Ingredients.CountAsync(i => i.Name == "Ức gà phi lê"));
            Assert.Equal(1, await db.Ingredients.CountAsync(i => i.Name == newIngredient));
        });
        Assert.Equal(title, inApp.Title);
        Assert.Equal(new[] { "Dinner", "Lunch" }, inApp.MealTypes.OrderBy(m => m));
        Assert.Equal(new[] { "eatClean", "highProtein" }, inApp.TagCodes.OrderBy(c => c));
        Assert.Equal(2, inApp.Ingredients.Count);
    }

    [DbFact]
    public async Task Creating_a_recipe_with_an_existing_title_is_rejected()
    {
        var admin = await CreateAdminAsync();
        var created = await CreateRecipeAsync(admin.Client);

        var duplicate = await admin.Client.PostJsonAsync("/api/admin/recipes", RecipeBody("  " + created.Title.ToUpperInvariant() + " "));

        Assert.Equal(HttpStatusCode.BadRequest, duplicate.StatusCode);
    }

    [DbTheory]
    [InlineData("difficulty")]
    [InlineData("calories")]
    [InlineData("mealTypes")]
    public async Task Creating_a_recipe_rejects_values_the_app_cannot_handle(string field)
    {
        var admin = await CreateAdminAsync();
        var title = "Món sai dữ liệu " + Guid.NewGuid().ToString("N")[..6];
        var body = field switch
        {
            "difficulty" => RecipeBody(title, difficulty: "Impossible"), // app chỉ hiểu Easy / Medium / Hard
            "calories" => RecipeBody(title, calories: -250),
            _ => RecipeBody(title, mealTypes: "Brunch") // app chỉ có Breakfast / Lunch / Dinner / Snack
        };

        var response = await admin.Client.PostJsonAsync("/api/admin/recipes", body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [DbFact]
    public async Task The_quick_tag_is_only_accepted_for_recipes_of_at_most_15_minutes()
    {
        var admin = await CreateAdminAsync();
        var quickTitle = "Món nhanh " + Guid.NewGuid().ToString("N")[..6];

        // RecipeBody: chuẩn bị 5 + nấu 10 = 15 phút → hợp lệ; món nấu 20 phút (tổng 25 phút) thì bị từ chối.
        var slow = await admin.Client.PostJsonAsync("/api/admin/recipes", new
        {
            title = "Món chậm " + Guid.NewGuid().ToString("N")[..6], description = "", imageUrl = "", instructions = "",
            prepTimeMinutes = 5, cookTimeMinutes = 20, servings = 1, difficulty = "Easy", isPremium = false, mealTypes = "Lunch",
            caloriesPerServing = 300, proteinPerServing = 20, carbsPerServing = 30, fatPerServing = 10,
            tagCodes = new[] { "quick" }, ingredients = Array.Empty<object>()
        });
        var quick = await CreateRecipeAsync(admin.Client, body: RecipeBody(quickTitle, tagCodes: new[] { "quick" }));

        Assert.Equal(HttpStatusCode.BadRequest, slow.StatusCode);
        Assert.Contains("15", (await slow.ReadEnvelopeAsync<object>()).Message);
        Assert.Equal(new[] { "quick" }, quick.TagCodes);
    }

    [DbFact]
    public async Task Recipe_list_filters_by_search_meal_type_difficulty_and_premium()
    {
        var admin = await CreateAdminAsync();
        var tag = Guid.NewGuid().ToString("N")[..8];
        var dinner = await CreateRecipeAsync(admin.Client, body: RecipeBody($"Tối {tag}", difficulty: "Hard", mealTypes: "Dinner"));
        var breakfast = await CreateRecipeAsync(admin.Client, body: RecipeBody($"Sáng {tag}", difficulty: "Easy", mealTypes: "Breakfast"));

        var all = await admin.Client.GetAsync($"/api/admin/recipes?search={tag}");
        var byMeal = await GetDataAsync<List<AdminRecipe>>(admin.Client, $"/api/admin/recipes?search={tag}&mealType=Dinner");
        var byDifficulty = await GetDataAsync<List<AdminRecipe>>(admin.Client, $"/api/admin/recipes?search={tag}&difficulty=easy");
        var premium = await GetDataAsync<List<AdminRecipe>>(admin.Client, $"/api/admin/recipes?search={tag}&isPremium=true");

        Assert.Equal(2, (await DataAsync<List<AdminRecipe>>(all)).Count);
        Assert.Equal("2", all.Headers.GetValues("X-Total-Count").Single());
        Assert.Equal(new[] { dinner.Id }, byMeal.Select(r => r.Id));
        Assert.Equal(new[] { breakfast.Id }, byDifficulty.Select(r => r.Id));
        Assert.Empty(premium);
    }

    [DbFact]
    public async Task Updating_a_recipe_replaces_its_fields_tags_and_ingredients()
    {
        var admin = await CreateAdminAsync();
        var created = await CreateRecipeAsync(admin.Client);
        var newTitle = created.Title + " (mới)";

        var updated = await DataAsync<AdminRecipe>(await admin.Client.PutJsonAsync($"/api/admin/recipes/{created.Id}", RecipeBody(
            newTitle, difficulty: "Hard", calories: 510, mealTypes: "Breakfast", tagCodes: new[] { "keto" }, ingredients: new object[]
            {
                new { name = "Trứng gà", category = "Dairy", unit = "quả", amount = 2, caloriesPer100g = 155, proteinPer100g = 13, carbsPer100g = 1.1, fatPer100g = 11, estimatedPriceVnd = 4000 }
            })));

        Assert.Equal(newTitle, updated.Title);
        Assert.Equal("Hard", updated.Difficulty);
        Assert.Equal(510, updated.CaloriesPerServing);
        Assert.Equal("Breakfast", updated.MealTypes);
        Assert.Equal(new[] { "keto" }, updated.TagCodes);
        var ingredient = Assert.Single(updated.Ingredients);
        Assert.Equal("Trứng gà", ingredient.Name);
        Assert.Equal("quả", ingredient.Unit);
    }

    [DbFact]
    public async Task Updating_a_recipe_to_another_recipes_title_is_rejected()
    {
        var admin = await CreateAdminAsync();
        var first = await CreateRecipeAsync(admin.Client);
        var second = await CreateRecipeAsync(admin.Client);

        // Tạo mới đã chặn trùng tên (400) — sửa cũng không được tạo ra hai món cùng tên.
        var response = await admin.Client.PutJsonAsync($"/api/admin/recipes/{second.Id}", RecipeBody(first.Title));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [DbFact]
    public async Task Deleting_a_recipe_removes_it_from_the_admin_list_and_the_app()
    {
        var admin = await CreateAdminAsync();
        var user = await _factory.RegisterUserAsync();
        var created = await CreateRecipeAsync(admin.Client);
        (await user.Client.PostAsync($"/api/recipes/{created.Id}/favorite", null)).EnsureSuccessStatusCode();

        await DataAsync<bool>(await admin.Client.DeleteAsync($"/api/admin/recipes/{created.Id}"));

        Assert.Equal(HttpStatusCode.NotFound, (await admin.Client.GetAsync($"/api/admin/recipes/{created.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await user.Client.GetAsync($"/api/recipes/{created.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.Client.DeleteAsync($"/api/admin/recipes/{created.Id}")).StatusCode);
    }

    [DbFact]
    public async Task Deleting_a_recipe_that_a_user_logged_in_the_diary_keeps_the_diary_entry()
    {
        var admin = await CreateAdminAsync();
        var user = await _factory.RegisterUserAsync();
        var created = await CreateRecipeAsync(admin.Client);
        var entry = await LogMealAsync(user.Client, created.Title, 420, created.Id);
        var groceryId = Guid.NewGuid();
        await WithDbAsync(_factory, async db =>
        {
            db.GroceryItems.Add(new GroceryItem { Id = groceryId, UserId = user.Id, IngredientName = "Ức gà phi lê", Amount = 150, RecipeId = created.Id });
            await db.SaveChangesAsync();
        });

        var response = await admin.Client.DeleteAsync($"/api/admin/recipes/{created.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await WithDbAsync(_factory, async db =>
        {
            var diary = await db.DiaryItems.AsNoTracking().SingleAsync(d => d.Id == entry.Id);
            var grocery = await db.GroceryItems.AsNoTracking().SingleAsync(g => g.Id == groceryId);
            Assert.Null(diary.RecipeId);
            Assert.Equal(created.Title, diary.FoodName);
            Assert.Equal(420, diary.Calories);
            Assert.Null(grocery.RecipeId);
        });
    }

    // ───────────────────────────── Gói & giao dịch ─────────────────────────────

    [DbFact]
    public async Task Plans_match_the_public_subscription_catalog()
    {
        var admin = await CreateAdminAsync();

        var adminPlans = await GetDataAsync<List<AdminPlanStats>>(admin.Client, "/api/admin/plans");
        var publicPlans = await GetDataAsync<List<PlanPayload>>(_factory.CreateClient(), "/api/subscription/plans");

        Assert.Equal(publicPlans.Select(p => (p.Id, p.PriceVnd, p.BillingCycle)).OrderBy(p => p.Id),
            adminPlans.Select(p => (p.Id, p.PriceVnd, p.BillingCycle)).OrderBy(p => p.Id));
    }

    [DbFact]
    public async Task Transactions_filter_by_status_and_search()
    {
        var admin = await CreateAdminAsync();
        var user = await _factory.RegisterUserAsync();
        var pending = await AddTransactionAsync(_factory, user.Id, PaymentStatuses.Pending);
        var paid = await AddTransactionAsync(_factory, user.Id, PaymentStatuses.Paid, planId: "PRO_YEARLY", amount: 699000);

        var pendingOnly = await GetDataAsync<List<AdminTransactionItem>>(admin.Client, $"/api/admin/transactions?status=pending&search={user.Email}");
        var all = await GetDataAsync<List<AdminTransactionItem>>(admin.Client, $"/api/admin/transactions?status=all&search={user.Email}");

        Assert.Equal(new[] { pending }, pendingOnly.Select(t => t.Id));
        Assert.Equal(new[] { paid, pending }.OrderBy(i => i), all.Select(t => t.Id).OrderBy(i => i));
        Assert.Equal("Gói Năm (Pro Yearly)", all.Single(t => t.Id == paid).PlanName);
    }

    [DbFact]
    public async Task Approving_a_pending_transaction_activates_pro_for_the_plan_duration()
    {
        var admin = await CreateAdminAsync();
        var user = await _factory.RegisterUserAsync();
        var txId = await AddTransactionAsync(_factory, user.Id, PaymentStatuses.Pending, 699000, "PRO_YEARLY");

        await DataAsync<bool>(await admin.Client.PutAsync($"/api/admin/transactions/{txId}/approve", null));

        var status = await GetDataAsync<SubscriptionStatusPayload>(user.Client, "/api/subscription/status");
        var tx = (await GetDataAsync<List<AdminTransactionItem>>(admin.Client, $"/api/admin/transactions?search={user.Email}")).Single();
        Assert.True(status.IsPro);
        Assert.Equal("PRO_YEARLY", status.PlanId);
        Assert.InRange(status.ProExpiresAt!.Value, DateTime.UtcNow.AddDays(364), DateTime.UtcNow.AddDays(366));
        Assert.Equal("Paid", tx.Status);
        Assert.NotNull(tx.PaidAt);
    }

    [DbFact]
    public async Task Approving_the_same_transaction_twice_does_not_extend_pro_twice()
    {
        var admin = await CreateAdminAsync();
        var user = await _factory.RegisterUserAsync();
        var txId = await AddTransactionAsync(_factory, user.Id, PaymentStatuses.Pending);

        await DataAsync<bool>(await admin.Client.PutAsync($"/api/admin/transactions/{txId}/approve", null));
        var once = (await GetDataAsync<SubscriptionStatusPayload>(user.Client, "/api/subscription/status")).ProExpiresAt!.Value;
        var again = await admin.Client.PutAsync($"/api/admin/transactions/{txId}/approve", null);
        var twice = (await GetDataAsync<SubscriptionStatusPayload>(user.Client, "/api/subscription/status")).ProExpiresAt!.Value;

        // Một lần thanh toán 79.000đ chỉ được 30 ngày Pro, duyệt lại (bấm 2 lần, hai admin cùng duyệt) không cộng thêm.
        Assert.Equal(HttpStatusCode.Conflict, again.StatusCode);
        Assert.InRange(twice, once.AddMinutes(-1), once.AddMinutes(1));
    }

    [DbFact]
    public async Task Approving_a_transaction_notifies_the_user_like_a_gateway_payment()
    {
        var admin = await CreateAdminAsync();
        var user = await _factory.RegisterUserAsync();
        var txId = await AddTransactionAsync(_factory, user.Id, PaymentStatuses.Pending);

        await DataAsync<bool>(await admin.Client.PutAsync($"/api/admin/transactions/{txId}/approve", null));

        // Duyệt tay đi qua cùng luồng xác nhận với webhook SePay/PayOS nên người dùng nhận thông báo kích hoạt Pro.
        var inbox = await GetDataAsync<NotificationListPayload>(user.Client, "/api/notifications");
        Assert.Contains(inbox.Items, n => n.Category == NotificationCategories.Premium && n.Title.Contains("Pro"));
    }

    [DbFact]
    public async Task Approving_an_unknown_transaction_returns_404()
    {
        var admin = await CreateAdminAsync();

        var response = await admin.Client.PutAsync($"/api/admin/transactions/{Guid.NewGuid()}/approve", null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ───────────────────────────── UC3: Hệ thống phần thưởng ─────────────────────────────

    [DbFact]
    public async Task A_challenge_created_updated_and_deleted_by_the_admin_is_mirrored_in_the_app()
    {
        var admin = await CreateAdminAsync();
        var user = await _factory.RegisterUserAsync();
        var title = "Uống nước admin " + Guid.NewGuid().ToString("N")[..6];

        var created = await DataAsync<AdminChallenge>(await admin.Client.PostJsonAsync("/api/admin/rewards/challenges", new
        {
            title, description = "Uống 1,5 lít mỗi ngày", category = "DrinkWater", durationDays = 5, targetValuePerDay = 1500,
            rewardExp = 200, rewardBadge = "Hydro", isActive = true
        }));
        var listed = await GetDataAsync<List<ChallengePayload>>(user.Client, $"/api/gamification/challenges?date={Iso(Today)}");
        await DataAsync<bool>(await admin.Client.PutJsonAsync($"/api/admin/rewards/challenges/{created.Id}", new
        {
            title = title + " v2", description = "Mới", category = "DrinkWater", durationDays = 7, targetValuePerDay = 2000,
            rewardExp = 5, rewardBadge = "", isActive = true
        }));
        var adminList = await GetDataAsync<List<AdminChallenge>>(admin.Client, "/api/admin/rewards/challenges");
        await DataAsync<bool>(await admin.Client.DeleteAsync($"/api/admin/rewards/challenges/{created.Id}"));
        var afterDelete = await GetDataAsync<List<ChallengePayload>>(user.Client, $"/api/gamification/challenges?date={Iso(Today)}");

        Assert.Contains(listed, c => c.Id == created.Id && c.Title == title && c.TargetValuePerDay == 1500);
        var edited = Assert.Single(adminList, c => c.Id == created.Id);
        Assert.Equal(title + " v2", edited.Title);
        Assert.Equal(10, edited.RewardExp);      // tối thiểu 10 XP
        Assert.Equal("Hydro", edited.RewardBadge); // để trống thì giữ huy hiệu cũ
        Assert.DoesNotContain(afterDelete, c => c.Id == created.Id);
    }

    [DbTheory]
    [InlineData("NoSugar")]
    [InlineData("Sleep")]
    public async Task A_challenge_category_the_app_cannot_score_is_rejected(string category)
    {
        var admin = await CreateAdminAsync();

        // GamificationService chỉ chấm DrinkWater / EatClean / Exercise; loại khác không bao giờ hoàn thành được.
        var response = await admin.Client.PostJsonAsync("/api/admin/rewards/challenges", new
        {
            title = "Thử thách " + category, description = "", category, durationDays = 7, targetValuePerDay = 1, rewardExp = 100,
            rewardBadge = "X", isActive = true
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [DbFact]
    public async Task Badge_list_uses_the_app_badge_catalog_and_counts_real_unlocks()
    {
        var admin = await CreateAdminAsync();
        var user = await _factory.RegisterUserAsync();
        await LogMealAsync(user.Client);
        var appBadges = await GetDataAsync<BadgesPayload>(user.Client, $"/api/gamification/badges?date={Iso(Today)}");
        Assert.Contains(appBadges.Badges, b => b.Id == GamificationCatalog.FirstLog && b.Unlocked);

        var adminBadges = await GetDataAsync<List<AdminBadge>>(admin.Client, "/api/admin/rewards/badges");

        var catalogIds = GamificationCatalog.Badges.Select(b => b.Id).ToHashSet();
        var unknown = adminBadges.Where(b => !catalogIds.Contains(b.BadgeId)).Select(b => b.BadgeId).ToList();
        Assert.True(unknown.Count == 0, "Huy hiệu không có trong app: " + string.Join(", ", unknown));
        Assert.True(adminBadges.Single(b => b.BadgeId == GamificationCatalog.FirstLog).UnlockedCount >= 1);
    }

    [DbFact]
    public async Task Updating_a_challenge_validates_its_category_and_keeps_omitted_fields()
    {
        var admin = await CreateAdminAsync();
        var created = await DataAsync<AdminChallenge>(await admin.Client.PostJsonAsync("/api/admin/rewards/challenges", new
        {
            title = "Bước chân " + Guid.NewGuid().ToString("N")[..6], description = "", category = "exercise", durationDays = 7,
            targetValuePerDay = 8000, rewardExp = 100, rewardBadge = "Walker", isActive = true
        }));

        var invalid = await admin.Client.PutJsonAsync($"/api/admin/rewards/challenges/{created.Id}", new
        {
            title = created.Title, description = "", category = "NoSugar", durationDays = 7, targetValuePerDay = 8000, rewardExp = 100, isActive = true
        });
        await DataAsync<bool>(await admin.Client.PutJsonAsync($"/api/admin/rewards/challenges/{created.Id}", new
        {
            title = created.Title, description = "Mới", imageUrl = "https://img.example.com/walk.jpg", category = "", durationDays = 10,
            targetValuePerDay = 9000, rewardExp = 120, rewardBadge = "", isActive = false
        }));
        var updated = (await GetDataAsync<List<AdminChallenge>>(admin.Client, "/api/admin/rewards/challenges")).Single(c => c.Id == created.Id);

        Assert.Equal("Exercise", created.Category); // chuẩn hóa hoa / thường
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        Assert.Equal("Exercise", updated.Category); // để trống thì giữ loại cũ
        Assert.Equal("https://img.example.com/walk.jpg", updated.ImageUrl);
        Assert.Equal("Walker", updated.RewardBadge);
        Assert.False(updated.IsActive);
    }

    [DbFact]
    public async Task Unknown_recipes_and_challenges_return_404_and_invalid_recipe_updates_are_rejected()
    {
        var admin = await CreateAdminAsync();
        var id = Guid.NewGuid();
        var recipe = await CreateRecipeAsync(admin.Client);

        Assert.Equal(HttpStatusCode.NotFound, (await admin.Client.PutJsonAsync($"/api/admin/recipes/{id}", RecipeBody("Không có " + id))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.Client.PutJsonAsync($"/api/admin/recipes/{recipe.Id}", RecipeBody(recipe.Title, mealTypes: "Lunch,Brunch"))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.Client.PutJsonAsync($"/api/admin/rewards/challenges/{id}", new { title = "X", description = "", durationDays = 7, targetValuePerDay = 1, rewardExp = 10, isActive = true })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.Client.DeleteAsync($"/api/admin/rewards/challenges/{id}")).StatusCode);
    }

    [DbFact]
    public async Task Updating_a_recipe_can_add_a_new_ingredient_and_change_its_image()
    {
        var admin = await CreateAdminAsync();
        var recipe = await CreateRecipeAsync(admin.Client);
        var newIngredient = "Nấm đùi gà " + Guid.NewGuid().ToString("N")[..6];
        var body = new
        {
            title = recipe.Title, description = "", imageUrl = "https://img.example.com/new.jpg", instructions = "", prepTimeMinutes = 5,
            cookTimeMinutes = 10, servings = 1, difficulty = "Easy", isPremium = true, mealTypes = "dinner, Dinner, snack",
            caloriesPerServing = 200, proteinPerServing = 10, carbsPerServing = 20, fatPerServing = 5, tagCodes = Array.Empty<string>(),
            ingredients = new object[] { new { name = newIngredient, category = "", unit = "", amount = 0, caloriesPer100g = 35, proteinPer100g = 3, carbsPer100g = 6, fatPer100g = 0.4, estimatedPriceVnd = 9000 } }
        };

        var updated = await DataAsync<AdminRecipe>(await admin.Client.PutJsonAsync($"/api/admin/recipes/{recipe.Id}", body));

        Assert.Equal("https://img.example.com/new.jpg", updated.ImageUrl);
        Assert.Equal("Dinner,Snack", updated.MealTypes); // chuẩn hóa và bỏ trùng
        Assert.True(updated.IsPremium);
        var ingredient = Assert.Single(updated.Ingredients);
        Assert.Equal(newIngredient, ingredient.Name);
        Assert.Equal(100, ingredient.Amount); // số lượng 0 → mặc định 100
        Assert.Equal("Other", ingredient.Category);
        Assert.Equal("g", ingredient.Unit);
    }

    [DbFact]
    public async Task Granting_xp_levels_up_the_pet_and_is_logged_as_an_admin_reward()
    {
        var admin = await CreateAdminAsync();
        var user = await _factory.RegisterUserAsync();

        await DataAsync<bool>(await admin.Client.PostJsonAsync("/api/admin/rewards/grant-xp", new { userId = user.Id, xp = 600, reason = "Sự kiện" }));

        var pet = await GetDataAsync<PetPayload>(user.Client, $"/api/gamification/pet?date={Iso(Today)}");
        var events = await GetDataAsync<List<AdminXpEvent>>(admin.Client, "/api/admin/rewards/xp-events?limit=100");
        Assert.Equal(600, pet.TotalXp);
        Assert.Equal(2, pet.Level);
        Assert.Equal(100, pet.XpIntoLevel);
        Assert.Contains(events, e => e.UserId == user.Id && e.Kind == "AdminReward" && e.Xp == 600);
    }

    [DbTheory]
    [InlineData(0)]
    [InlineData(-50)]
    [InlineData(10001)]
    public async Task Granting_xp_outside_1_to_10000_is_rejected(int xp)
    {
        var admin = await CreateAdminAsync();
        var user = await _factory.RegisterUserAsync();

        var response = await admin.Client.PostJsonAsync("/api/admin/rewards/grant-xp", new { userId = user.Id, xp, reason = "x" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [DbFact]
    public async Task Granting_xp_to_an_unknown_user_returns_404()
    {
        var admin = await CreateAdminAsync();

        var response = await admin.Client.PostJsonAsync("/api/admin/rewards/grant-xp", new { userId = Guid.NewGuid(), xp = 10, reason = "x" });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ───────────────────────────── UC4: Giám sát hệ thống ─────────────────────────────

    [DbFact]
    public async Task System_activity_shows_the_latest_meal_logs_and_locked_accounts()
    {
        var admin = await CreateAdminAsync();
        var eaterName = "Người Ăn " + Guid.NewGuid().ToString("N")[..6];
        var eater = await _factory.RegisterUserAsync(fullName: eaterName);
        var banned = await _factory.RegisterUserAsync();
        await LogMealAsync(eater.Client, "Bún bò", 480);
        await DataAsync<bool>(await admin.Client.PutJsonAsync($"/api/admin/users/{banned.Id}/ban", new { isBanned = true, durationDays = 3 }));

        var activity = await GetDataAsync<AdminSystemActivity>(admin.Client, "/api/admin/system/activity");

        var meal = Assert.Single(activity.RecentDiaryLogs, d => d.UserFullName == eaterName);
        Assert.Equal(480, meal.Calories);
        Assert.Equal("Lunch", meal.MealType);
        Assert.Contains(activity.RecentSecurityEvents, e => e.EventType == "AccountLocked" && e.TargetUser.Contains(banned.Email));
    }

    [DbFact]
    public async Task System_activity_reports_the_real_server_uptime()
    {
        var admin = await CreateAdminAsync();

        var activity = await GetDataAsync<AdminSystemActivity>(admin.Client, "/api/admin/system/activity");

        // API trong test vừa khởi động (vài phút) — số giờ uptime phải nhỏ hơn 1, không phải "giờ trong ngày + 24".
        Assert.InRange(activity.ServerUptimeHours, 0, 1);
        Assert.Equal("Healthy", activity.DatabaseStatus);
        Assert.NotNull(activity.DatabaseLatencyMs);
        Assert.True(activity.DatabaseLatencyMs >= 0);
    }

    // ───────────────────────────── UC5: Báo cáo doanh thu ─────────────────────────────

    [DbFact]
    public async Task Revenue_report_totals_paid_transactions_by_method_and_plan()
    {
        var admin = await CreateAdminAsync();
        var user = await _factory.RegisterUserAsync();
        var before = await GetDataAsync<AdminRevenueReport>(admin.Client, "/api/admin/reports/revenue");

        await AddTransactionAsync(_factory, user.Id, PaymentStatuses.Paid, 79000, "PRO_MONTHLY", "SEPAY");
        await AddTransactionAsync(_factory, user.Id, PaymentStatuses.Paid, 699000, "PRO_YEARLY", "PAYOS");
        await AddTransactionAsync(_factory, user.Id, PaymentStatuses.Pending, 79000);
        await AddTransactionAsync(_factory, user.Id, PaymentStatuses.Failed, 79000);
        var after = await GetDataAsync<AdminRevenueReport>(admin.Client, "/api/admin/reports/revenue");

        decimal Delta(Dictionary<string, decimal> a, Dictionary<string, decimal> b, string key) => a.GetValueOrDefault(key) - b.GetValueOrDefault(key);
        Assert.Equal(778000, after.TotalRevenue - before.TotalRevenue);
        Assert.Equal(778000, after.MonthlyRevenue - before.MonthlyRevenue);
        Assert.Equal(4, after.TotalTransactions - before.TotalTransactions);
        Assert.Equal(2, after.SuccessfulTransactions - before.SuccessfulTransactions);
        Assert.Equal(1, after.PendingTransactions - before.PendingTransactions);
        Assert.Equal(1, after.FailedTransactions - before.FailedTransactions);
        Assert.Equal(79000, Delta(after.RevenueByMethod, before.RevenueByMethod, "SEPAY"));
        Assert.Equal(699000, Delta(after.RevenueByMethod, before.RevenueByMethod, "PAYOS"));
        Assert.Equal(699000, Delta(after.RevenueByPlan, before.RevenueByPlan, "Gói Năm (Pro Yearly)"));
        Assert.Equal(7, after.RevenueByPeriod.Count);
        Assert.Equal(778000, after.RevenueByPeriod[^1].AmountVnd - before.RevenueByPeriod[^1].AmountVnd);
        Assert.InRange(after.SuccessRatePercentage, 0, 100);
    }

    [DbFact]
    public async Task Revenue_report_honours_the_date_range_chosen_on_the_web()
    {
        var admin = await CreateAdminAsync();
        var user = await _factory.RegisterUserAsync();
        await AddTransactionAsync(_factory, user.Id, PaymentStatuses.Paid, 123000, createdAt: new DateTime(2025, 1, 15, 3, 0, 0, DateTimeKind.Utc));
        await AddTransactionAsync(_factory, user.Id, PaymentStatuses.Paid, 79000);

        // Admin Web gửi ?startDate=&endDate= khi bấm "Lọc Báo Cáo".
        var report = await GetDataAsync<AdminRevenueReport>(admin.Client, "/api/admin/reports/revenue?startDate=2025-01-01&endDate=2025-01-31");

        Assert.Equal(123000, report.TotalRevenue);
        Assert.Equal(1, report.SuccessfulTransactions);
        // Biểu đồ theo từng ngày của khoảng đã chọn.
        Assert.Equal(31, report.RevenueByPeriod.Count);
        Assert.Equal(123000, report.RevenueByPeriod.Single(p => p.PeriodLabel == "15/01").AmountVnd);
    }

    [DbFact]
    public async Task Revenue_report_groups_long_ranges_by_month_and_rejects_reversed_ranges()
    {
        var admin = await CreateAdminAsync();

        var yearly = await GetDataAsync<AdminRevenueReport>(admin.Client, "/api/admin/reports/revenue?startDate=2025-01-01&endDate=2025-12-31");
        var reversed = await admin.Client.GetAsync("/api/admin/reports/revenue?startDate=2025-02-01&endDate=2025-01-01");

        Assert.Equal(12, yearly.RevenueByPeriod.Count);
        Assert.Equal("01/2025", yearly.RevenueByPeriod[0].PeriodLabel);
        Assert.Equal(HttpStatusCode.BadRequest, reversed.StatusCode);
    }

    // ───────────────────────────── UC6: Phân tích tương tác ─────────────────────────────

    [DbFact]
    public async Task Engagement_counts_users_who_logged_meals_today()
    {
        var admin = await CreateAdminAsync();
        var before = await GetDataAsync<AdminEngagement>(admin.Client, "/api/admin/reports/engagement");
        var a = await _factory.RegisterUserAsync();
        var b = await _factory.RegisterUserAsync();
        await LogMealAsync(a.Client);
        await LogMealAsync(b.Client);

        var after = await GetDataAsync<AdminEngagement>(admin.Client, "/api/admin/reports/engagement");

        Assert.True(after.EstimatedDau >= 2);
        Assert.True(after.EstimatedWau >= after.EstimatedDau);
        Assert.True(after.EstimatedMau >= after.EstimatedWau);
        Assert.Equal(2, after.TotalDiariesLogged - before.TotalDiariesLogged); // mỗi bữa (người dùng + ngày + loại bữa) là một nhật ký
    }

    [DbFact]
    public async Task Engagement_reports_zero_active_users_when_nobody_was_active()
    {
        using var fresh = new ApiFactory();
        var admin = await CreateAdminAsync(fresh);

        var report = await GetDataAsync<AdminEngagement>(admin.Client, "/api/admin/reports/engagement");

        Assert.Equal(0, report.TotalDiariesLogged);
        Assert.Equal((0, 0, 0), (report.EstimatedDau, report.EstimatedWau, report.EstimatedMau));
    }

    [DbFact]
    public async Task Top_engaged_users_are_ranked_by_xp_across_all_users()
    {
        var admin = await CreateAdminAsync();
        TestUser? champion = null;
        for (var i = 0; i < 12; i++) champion = await _factory.RegisterUserAsync(fullName: $"Engaged {i}");
        await DataAsync<bool>(await admin.Client.PostJsonAsync("/api/admin/rewards/grant-xp", new { userId = champion!.Id, xp = 10000, reason = "Top" }));

        var report = await GetDataAsync<AdminEngagement>(admin.Client, "/api/admin/reports/engagement");

        Assert.Equal(report.TopEngagedUsers.OrderByDescending(u => u.TotalXp).Select(u => u.UserId), report.TopEngagedUsers.Select(u => u.UserId));
        Assert.Equal(champion.Id, report.TopEngagedUsers[0].UserId);
    }
}
