using System.Net;
using System.Threading.Channels;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.Extensions.DependencyInjection;
using SmartMeal.Domain.Entities;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Tests.Infrastructure;
using Xunit;

namespace SmartMeal.Tests;

/// <summary>
/// Thông báo real-time (SignalR, /api/hubs/notifications): thông báo mới được đẩy ngay lúc sự kiện xảy ra (không đợi app đọc
/// danh sách), đúng người, đúng một lần, chỉ sau khi đã lưu; kết nối cần token hợp lệ gửi qua query như app.
/// </summary>
public class NotificationRealtimeTests : IClassFixture<ApiFactory>, IClassFixture<MockPaymentsFixture>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.UtcNow);
    private static readonly TimeSpan PushTimeout = TimeSpan.FromSeconds(10);

    private readonly ApiFactory _factory;
    private readonly ApiFactory _payments;

    public NotificationRealtimeTests(ApiFactory factory, MockPaymentsFixture payments)
    {
        _factory = factory;
        _payments = payments.Factory;
    }

    private static string Iso(DateOnly d) => d.ToString("yyyy-MM-dd");

    /// <summary>Kết nối như app: WebSocket, bỏ negotiate, token ở query <c>access_token</c> (WebSocket không có header).</summary>
    private sealed class Listener : IAsyncDisposable
    {
        private readonly Channel<NotificationPayload> _received = Channel.CreateUnbounded<NotificationPayload>();
        private readonly HubConnection _connection;

        private Listener(HubConnection connection)
        {
            _connection = connection;
            _connection.On<NotificationPayload>("notification", n => _received.Writer.TryWrite(n));
        }

        public static async Task<Listener> ConnectAsync(ApiFactory factory, string? token)
        {
            var query = token is null ? "" : "?access_token=" + Uri.EscapeDataString(token);
            var connection = new HubConnectionBuilder()
                .WithUrl(new Uri(factory.Server.BaseAddress, "api/hubs/notifications" + query), HttpTransportType.WebSockets, options =>
                {
                    options.SkipNegotiation = true;
                    options.WebSocketFactory = async (context, cancellationToken) =>
                        await factory.Server.CreateWebSocketClient().ConnectAsync(context.Uri, cancellationToken);
                })
                .Build();

            var listener = new Listener(connection);
            await connection.StartAsync();
            return listener;
        }

        public async Task<NotificationPayload> NextAsync()
        {
            using var timeout = new CancellationTokenSource(PushTimeout);
            return await _received.Reader.ReadAsync(timeout.Token);
        }

        public async Task<List<NotificationPayload>> NextAsync(int count)
        {
            var items = new List<NotificationPayload>();
            for (var i = 0; i < count; i++) items.Add(await NextAsync());
            return items;
        }

        public bool HasMore => _received.Reader.TryPeek(out _);

        public ValueTask DisposeAsync() => _connection.DisposeAsync();
    }

    private static async Task<NotificationListPayload> ListAsync(HttpClient client)
    {
        var response = await client.GetAsync($"/api/notifications?date={Iso(Today)}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.ReadEnvelopeAsync<NotificationListPayload>()).Data!;
    }

    [DbFact]
    public async Task Logging_the_first_meal_pushes_its_badge_right_away_to_that_user_only()
    {
        var user = await _factory.RegisterUserAsync();
        var other = await _factory.RegisterUserAsync();
        await using var mine = await Listener.ConnectAsync(_factory, user.Token);
        await using var theirs = await Listener.ConnectAsync(_factory, other.Token);

        var logged = await user.Client.PostJsonAsync("/api/nutritiondiary/log", new
        {
            logDate = Iso(Today), mealType = "Lunch", foodName = "Cơm gà", servingSize = 200, unit = "g", calories = 400,
            carbsGrams = 50, fatGrams = 10, proteinGrams = 25, logMethod = "Manual"
        });
        Assert.Equal(HttpStatusCode.OK, logged.StatusCode);

        // Có ngay lúc ghi món — chưa hề gọi GET /notifications hay /gamification.
        var pushed = await mine.NextAsync();
        Assert.Equal("badge", pushed.Category);
        Assert.Contains("Khởi đầu", pushed.Title);
        Assert.False(pushed.IsRead);

        // Đọc danh sách (đánh giá lại) không tạo/đẩy thêm; bản đẩy chính là bản đã lưu.
        var listed = Assert.Single((await ListAsync(user.Client)).Items);
        Assert.Equal(pushed.Id, listed.Id);
        Assert.Equal(pushed.CreatedAt, listed.CreatedAt);
        Assert.False(mine.HasMore);
        Assert.False(theirs.HasMore);
    }

    [DbFact]
    public async Task Completing_a_challenge_pushes_it_and_the_level_ups_awarded_in_the_same_transaction()
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
        await using var listener = await Listener.ConnectAsync(factory, user.Token);

        var water = await user.Client.PostJsonAsync("/api/nutritiondiary/water", new { amountMl = 1500, date = Iso(Today) });
        Assert.Equal(HttpStatusCode.OK, water.StatusCode);

        // Thông báo hoàn thành ghi ngoài transaction; lên cấp 2 và 3 ghi cùng transaction cộng XP và chỉ được đẩy khi đã commit.
        var pushed = await listener.NextAsync(3);
        Assert.Equal(
            new[] { "Bé Mầm đã lên Level 2", "Bé Mầm đã lên Level 3", "Hoàn thành thử thách: Một ngày đủ nước" },
            pushed.Select(n => n.Title).Order().ToArray());
        var saved = (await ListAsync(user.Client)).Items.Select(n => n.Id).ToHashSet();
        Assert.All(pushed, n => Assert.Contains(n.Id, saved));
        Assert.False(listener.HasMore);
    }

    [DbFact]
    public async Task Activating_pro_pushes_the_premium_notification()
    {
        var user = await _payments.RegisterUserAsync();
        await using var listener = await Listener.ConnectAsync(_payments, user.Token);

        Assert.Equal(HttpStatusCode.OK, (await user.Client.PostJsonAsync("/api/subscription/activate-mock", new { planId = "PRO_MONTHLY" })).StatusCode);

        var pushed = await listener.NextAsync();
        Assert.Equal("premium", pushed.Category);
        Assert.Equal("Đã kích hoạt SmartMeal Pro", pushed.Title);
    }

    [DbFact]
    public async Task The_hub_needs_a_valid_token_and_the_query_token_only_works_for_the_hub()
    {
        var user = await _factory.RegisterUserAsync();

        await Assert.ThrowsAnyAsync<Exception>(() => Listener.ConnectAsync(_factory, token: null));
        await Assert.ThrowsAnyAsync<Exception>(() => Listener.ConnectAsync(_factory, "not-a-jwt"));

        var viaQuery = await _factory.CreateClient().GetAsync($"/api/notifications?access_token={Uri.EscapeDataString(user.Token)}");
        Assert.Equal(HttpStatusCode.Unauthorized, viaQuery.StatusCode);
    }
}
