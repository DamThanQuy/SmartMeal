using System.Net;
using System.Net.Http.Json;
using SmartMeal.Tests.Infrastructure;
using Xunit;

namespace SmartMeal.Tests;

/// <summary>Idempotency-Key (báo cáo gap F12, BR-261): hàng đợi offline gửi lại cùng request không được ghi trùng dữ liệu.</summary>
public class IdempotencyTests : IClassFixture<ApiFactory>
{
    private const string Date = "2026-09-20";

    private readonly ApiFactory _factory;

    public IdempotencyTests(ApiFactory factory) => _factory = factory;

    private static object Meal(string name, double calories = 300) => new
    {
        logDate = Date,
        mealType = "Lunch",
        foodName = name,
        servingSize = 200,
        unit = "g",
        calories,
        carbsGrams = 30,
        fatGrams = 10,
        proteinGrams = 20,
        logMethod = "Manual"
    };

    private static Task<HttpResponseMessage> SendAsync(HttpClient client, string url, object body, string? key)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = JsonContent.Create(body, options: ApiTestHelpers.Json) };
        if (key is not null)
        {
            request.Headers.Add("Idempotency-Key", key);
        }

        return client.SendAsync(request);
    }

    private static async Task<int> ItemsOnDateAsync(HttpClient client)
    {
        var day = (await (await client.GetAsync($"/api/nutritiondiary/daily?date={Date}")).ReadEnvelopeAsync<DailyPayload>()).Data!;
        return day.Meals.Sum(m => m.Items.Count);
    }

    [DbFact]
    public async Task Sending_the_same_request_twice_with_a_key_writes_once_and_replays_the_first_answer()
    {
        var user = await _factory.RegisterUserAsync();

        var first = await SendAsync(user.Client, "/api/nutritiondiary/log", Meal("Phở bò"), "offline-0001");
        var second = await SendAsync(user.Client, "/api/nutritiondiary/log", Meal("Phở bò"), "offline-0001");

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Assert.False(first.Headers.Contains("Idempotency-Replayed"));
        Assert.Equal("true", second.Headers.GetValues("Idempotency-Replayed").Single());
        Assert.Equal(await first.Content.ReadAsStringAsync(), await second.Content.ReadAsStringAsync());
        Assert.Equal(1, await ItemsOnDateAsync(user.Client));
    }

    [DbFact]
    public async Task Without_a_key_or_with_different_keys_each_request_is_written()
    {
        var user = await _factory.RegisterUserAsync();

        await SendAsync(user.Client, "/api/nutritiondiary/log", Meal("Cơm"), null);
        await SendAsync(user.Client, "/api/nutritiondiary/log", Meal("Cơm"), null);
        await SendAsync(user.Client, "/api/nutritiondiary/log", Meal("Cơm"), "k-1");
        await SendAsync(user.Client, "/api/nutritiondiary/log", Meal("Cơm"), "k-2");

        Assert.Equal(4, await ItemsOnDateAsync(user.Client));
    }

    [DbFact]
    public async Task Reusing_a_key_for_a_different_request_is_refused()
    {
        var user = await _factory.RegisterUserAsync();
        await SendAsync(user.Client, "/api/nutritiondiary/log", Meal("Bún chả"), "reused-key");

        var other = await SendAsync(user.Client, "/api/nutritiondiary/log", Meal("Bún chả", calories: 999), "reused-key");

        Assert.Equal(HttpStatusCode.Conflict, other.StatusCode);
        Assert.Contains("idempotency_key_reused", (await other.ReadEnvelopeAsync<object>()).Errors!);
        Assert.Equal(1, await ItemsOnDateAsync(user.Client));
    }

    [DbFact]
    public async Task Keys_belong_to_each_user_and_invalid_keys_are_rejected()
    {
        var alice = await _factory.RegisterUserAsync();
        var bob = await _factory.RegisterUserAsync();

        Assert.Equal(HttpStatusCode.OK, (await SendAsync(alice.Client, "/api/nutritiondiary/water", new { amountMl = 250, date = Date }, "water-1")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await SendAsync(bob.Client, "/api/nutritiondiary/water", new { amountMl = 250, date = Date }, "water-1")).StatusCode);
        var bobHistory = (await (await bob.Client.GetAsync($"/api/nutritiondiary/water?date={Date}&days=1")).ReadEnvelopeAsync<WaterHistoryPayload>()).Data!;
        Assert.Equal(250, bobHistory.Days.Single().TotalMl);

        var invalid = await SendAsync(alice.Client, "/api/nutritiondiary/log", Meal("Xôi"), "khóa có dấu cách");
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        Assert.Contains("idempotency_key_invalid", (await invalid.ReadEnvelopeAsync<object>()).Errors!);
    }

    [DbFact]
    public async Task Validation_errors_are_replayed_but_a_fixed_request_needs_a_new_key()
    {
        var user = await _factory.RegisterUserAsync();
        var bad = new { logDate = Date, mealType = "Brunch", foodName = "Bánh", servingSize = 1, unit = "g", calories = 10 };

        var first = await SendAsync(user.Client, "/api/nutritiondiary/log", bad, "bad-1");
        var again = await SendAsync(user.Client, "/api/nutritiondiary/log", bad, "bad-1");

        Assert.Equal(HttpStatusCode.BadRequest, first.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, again.StatusCode);
        Assert.Equal("true", again.Headers.GetValues("Idempotency-Replayed").Single());
        Assert.Equal(0, await ItemsOnDateAsync(user.Client));
    }
}
