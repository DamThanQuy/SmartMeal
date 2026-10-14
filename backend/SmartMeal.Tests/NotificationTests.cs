using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Tests.Infrastructure;
using Xunit;

namespace SmartMeal.Tests;

/// <summary>
/// Thông báo trong ứng dụng: chỉ tạo từ sự kiện thật (huy hiệu, thử thách, lên cấp, danh sách đi chợ, gói Pro), mỗi sự kiện
/// đúng một lần, của ai người nấy thấy, đánh dấu đã đọc từng cái hoặc tất cả, bị xóa cùng dữ liệu cá nhân.
/// </summary>
public class NotificationTests : IClassFixture<ApiFactory>, IClassFixture<MockPaymentsFixture>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.UtcNow);

    private readonly ApiFactory _factory;
    private readonly ApiFactory _payments;

    public NotificationTests(ApiFactory factory, MockPaymentsFixture payments)
    {
        _factory = factory;
        _payments = payments.Factory;
    }

    private static string Iso(DateOnly d) => d.ToString("yyyy-MM-dd");

    private static async Task<NotificationListPayload> ListAsync(HttpClient client, string query = "")
    {
        var response = await client.GetAsync($"/api/notifications?date={Iso(Today)}{query}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.ReadEnvelopeAsync<NotificationListPayload>()).Data!;
    }

    private static async Task LogMealAsync(HttpClient client, DateOnly date)
    {
        var response = await client.PostJsonAsync("/api/nutritiondiary/log", new
        {
            logDate = Iso(date), mealType = "Lunch", foodName = "Cơm gà", servingSize = 200, unit = "g", calories = 400,
            carbsGrams = 50, fatGrams = 10, proteinGrams = 25, logMethod = "Manual"
        });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private static async Task LogWaterAsync(HttpClient client, DateOnly date, int ml)
    {
        var response = await client.PostJsonAsync("/api/nutritiondiary/water", new { amountMl = ml, date = Iso(date) });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [DbFact]
    public async Task A_new_account_has_no_notifications()
    {
        var user = await _factory.RegisterUserAsync();

        var list = await ListAsync(user.Client);

        Assert.Empty(list.Items);
        Assert.Equal(0, list.UnreadCount);
    }

    [DbFact]
    public async Task The_first_logged_meal_creates_one_badge_notification_however_often_it_is_evaluated()
    {
        var user = await _factory.RegisterUserAsync();
        await LogMealAsync(user.Client, Today);

        var first = await ListAsync(user.Client);
        await user.Client.GetAsync($"/api/gamification/badges?date={Iso(Today)}");
        var again = await ListAsync(user.Client);

        var badge = Assert.Single(first.Items);
        Assert.Equal("badge", badge.Category);
        Assert.Contains("Khởi đầu", badge.Title);
        Assert.False(badge.IsRead);
        Assert.Equal(1, first.UnreadCount);
        Assert.Equal(badge.Id, Assert.Single(again.Items).Id);
    }

    [DbFact]
    public async Task Completing_a_challenge_notifies_the_completion_and_the_level_up_once()
    {
        await using var factory = new ApiFactory();
        Guid challengeId;
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var challenge = new Challenge
            {
                Title = "Một ngày đủ nước", Description = "x", Category = "DrinkWater", TargetValuePerDay = 1500, DurationDays = 1,
                RewardExp = 1000, RewardBadge = "Test"
            };
            db.Challenges.Add(challenge);
            await db.SaveChangesAsync();
            challengeId = challenge.Id;
        }

        var user = await factory.RegisterUserAsync();
        Assert.Equal(HttpStatusCode.OK, (await user.Client.PostAsync($"/api/gamification/challenges/{challengeId}/join?date={Iso(Today)}", null)).StatusCode);
        await LogWaterAsync(user.Client, Today, 1500);

        var list = await ListAsync(user.Client);
        await ListAsync(user.Client);
        var again = await ListAsync(user.Client);

        var challengeDone = Assert.Single(list.Items, n => n.Category == "challenge");
        Assert.Contains("Một ngày đủ nước", challengeDone.Title);
        Assert.Contains("+1000 XP", challengeDone.Body);
        // 1000 XP = cấp 3 (chưa đủ nước theo mục tiêu mặc định nên không có XP nhiệm vụ): báo cả cấp 2 và cấp 3; cấp 3 mở Mũ lá.
        var levels = list.Items.Where(n => n.Category == "pet").Select(n => n.Title).ToList();
        Assert.Contains("Bé Mầm đã lên Level 2", levels);
        Assert.Contains("Bé Mầm đã lên Level 3", levels);
        Assert.Contains("Mũ lá", list.Items.Single(n => n.Title == "Bé Mầm đã lên Level 3").Body);
        Assert.Equal(list.Items.Count, again.Items.Count);
    }

    [DbFact]
    public async Task Notifications_can_be_marked_read_one_by_one_or_all_at_once_and_stay_private()
    {
        var user = await _factory.RegisterUserAsync();
        var other = await _factory.RegisterUserAsync();
        await LogMealAsync(user.Client, Today);
        await LogWaterAsync(user.Client, Today, 2000); // huy hiệu "Đủ nước"
        var list = await ListAsync(user.Client);
        Assert.True(list.UnreadCount >= 2);
        var target = list.Items[0];

        Assert.Equal(HttpStatusCode.NotFound, (await other.Client.PatchAsync($"/api/notifications/{target.Id}/read", null)).StatusCode);
        Assert.Empty((await ListAsync(other.Client)).Items);

        var read = await user.Client.PatchAsync($"/api/notifications/{target.Id}/read", null);
        Assert.Equal(HttpStatusCode.OK, read.StatusCode);
        Assert.True((await read.ReadEnvelopeAsync<NotificationPayload>()).Data!.IsRead);
        Assert.Equal(list.UnreadCount - 1, (await ListAsync(user.Client)).UnreadCount);

        var all = await user.Client.PostAsync("/api/notifications/read-all", null);
        Assert.Equal(HttpStatusCode.OK, all.StatusCode);
        Assert.Equal(list.UnreadCount - 1, (await all.ReadEnvelopeAsync<MarkAllReadPayload>()).Data!.Updated);
        var after = await ListAsync(user.Client);
        Assert.Equal(0, after.UnreadCount);
        Assert.All(after.Items, n => Assert.True(n.IsRead));
    }

    [DbFact]
    public async Task Generating_a_grocery_list_notifies_once_per_period()
    {
        var user = await _factory.RegisterUserAsync();
        var recipes = (await (await user.Client.GetAsync("/api/recipes")).ReadEnvelopeAsync<List<RecipePayload>>()).Data!;
        var start = Today.AddDays(1);
        var assign = await user.Client.PostJsonAsync("/api/mealplanner/assign", new { planDate = Iso(start), mealType = "Lunch", recipeId = recipes[0].Id });
        Assert.Equal(HttpStatusCode.OK, assign.StatusCode);

        for (var i = 0; i < 2; i++)
        {
            var generated = await user.Client.PostJsonAsync("/api/grocery/generate-from-plan", new { startDate = Iso(start), endDate = Iso(start.AddDays(6)) });
            Assert.Equal(HttpStatusCode.OK, generated.StatusCode);
        }

        var grocery = Assert.Single((await ListAsync(user.Client)).Items, n => n.Category == "grocery");
        Assert.Equal("Danh sách đi chợ đã sẵn sàng", grocery.Title);
        Assert.Contains($"{start:dd/MM}–{start.AddDays(6):dd/MM}", grocery.Body);
    }

    [DbFact]
    public async Task Activating_pro_and_nearing_its_expiry_are_notified()
    {
        var user = await _payments.RegisterUserAsync();
        Assert.Equal(HttpStatusCode.OK, (await user.Client.PostJsonAsync("/api/subscription/activate-mock", new { planId = "PRO_MONTHLY" })).StatusCode);

        var activated = Assert.Single((await ListAsync(user.Client)).Items, n => n.Category == "premium");
        Assert.Equal("Đã kích hoạt SmartMeal Pro", activated.Title);

        await using (var scope = _payments.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            await db.Users.Where(u => u.Id == user.Id).ExecuteUpdateAsync(s => s.SetProperty(u => u.ProExpiresAt, DateTime.UtcNow.AddDays(2)));
        }

        var premium = (await ListAsync(user.Client)).Items.Where(n => n.Category == "premium").ToList();
        Assert.Equal(2, premium.Count);
        Assert.Contains(premium, n => n.Title == "Gói Pro sắp hết hạn" && n.Body.Contains("2 ngày"));
        Assert.Equal(2, (await ListAsync(user.Client)).Items.Count(n => n.Category == "premium"));
    }

    [DbFact]
    public async Task Deleting_personal_data_removes_notifications_and_bad_limits_are_rejected()
    {
        var user = await _factory.RegisterUserAsync();
        await LogMealAsync(user.Client, Today);
        Assert.NotEmpty((await ListAsync(user.Client)).Items);

        Assert.Equal(HttpStatusCode.BadRequest, (await user.Client.GetAsync("/api/notifications?limit=0")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await user.Client.GetAsync("/api/notifications?limit=101")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _factory.CreateClient().GetAsync("/api/notifications")).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await user.Client.DeleteAsync("/api/me/data")).StatusCode);
        Assert.Empty((await ListAsync(user.Client)).Items);
    }
}
