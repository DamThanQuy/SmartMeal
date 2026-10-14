using System.Net;
using SmartMeal.Tests.Infrastructure;
using Xunit;

namespace SmartMeal.Tests;

/// <summary>P1-BE-06: nước uống đọc/ghi/xóa từng lần và mục tiêu.</summary>
public class WaterTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public WaterTests(ApiFactory factory) => _factory = factory;

    private static async Task<WaterSummaryPayload> LogAsync(HttpClient client, int amountMl, string date)
    {
        var response = await client.PostJsonAsync("/api/nutritiondiary/water", new { amountMl, date });
        response.EnsureSuccessStatusCode();
        return (await response.ReadEnvelopeAsync<WaterSummaryPayload>()).Data!;
    }

    [DbFact]
    public async Task Logging_water_returns_the_entry_id_and_running_total()
    {
        var user = await _factory.RegisterUserAsync();

        var first = await LogAsync(user.Client, 250, "2026-06-01");
        var second = await LogAsync(user.Client, 500, "2026-06-01");

        Assert.NotNull(first.EntryId);
        Assert.NotEqual(first.EntryId, second.EntryId);
        Assert.Equal(250, first.TotalWaterMl);
        Assert.Equal(750, second.TotalWaterMl);
        Assert.Equal(2000, second.GoalWaterMl);
        Assert.Equal(37.5, second.Percentage);
    }

    [DbFact]
    public async Task History_lists_each_entry_and_includes_days_without_logs()
    {
        var user = await _factory.RegisterUserAsync();
        await LogAsync(user.Client, 250, "2026-06-10");
        await LogAsync(user.Client, 300, "2026-06-12");
        await LogAsync(user.Client, 200, "2026-06-12");

        var response = await user.Client.GetAsync("/api/nutritiondiary/water?date=2026-06-12&days=3");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var history = (await response.ReadEnvelopeAsync<WaterHistoryPayload>()).Data!;
        Assert.Equal(2000, history.GoalMl);
        Assert.Equal(new[] { "2026-06-10", "2026-06-11", "2026-06-12" }, history.Days.Select(d => d.Date.ToString("yyyy-MM-dd")));
        Assert.Equal(new[] { 250, 0, 500 }, history.Days.Select(d => d.TotalMl));
        Assert.Empty(history.Days[1].Entries);
        Assert.Equal(new[] { 300, 200 }, history.Days[2].Entries.Select(e => e.AmountMl));
    }

    [DbFact]
    public async Task Deleting_an_entry_lowers_the_total_and_cannot_be_repeated()
    {
        var user = await _factory.RegisterUserAsync();
        var kept = await LogAsync(user.Client, 250, "2026-06-20");
        var undone = await LogAsync(user.Client, 400, "2026-06-20");

        var delete = await user.Client.DeleteAsync($"/api/nutritiondiary/water/{undone.EntryId}");
        var again = await user.Client.DeleteAsync($"/api/nutritiondiary/water/{undone.EntryId}");

        Assert.Equal(HttpStatusCode.OK, delete.StatusCode);
        Assert.Equal(250, (await delete.ReadEnvelopeAsync<WaterSummaryPayload>()).Data!.TotalWaterMl);
        Assert.Equal(HttpStatusCode.NotFound, again.StatusCode);

        var history = (await (await user.Client.GetAsync("/api/nutritiondiary/water?date=2026-06-20"))
            .ReadEnvelopeAsync<WaterHistoryPayload>()).Data!;
        Assert.Equal(kept.EntryId, history.Days.Single().Entries.Single().Id);
    }

    [DbFact]
    public async Task Another_users_water_entry_cannot_be_deleted()
    {
        var owner = await _factory.RegisterUserAsync();
        var intruder = await _factory.RegisterUserAsync();
        var entry = await LogAsync(owner.Client, 250, "2026-06-21");

        var response = await intruder.Client.DeleteAsync($"/api/nutritiondiary/water/{entry.EntryId}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var history = (await (await owner.Client.GetAsync("/api/nutritiondiary/water?date=2026-06-21"))
            .ReadEnvelopeAsync<WaterHistoryPayload>()).Data!;
        Assert.Equal(250, history.Days.Single().TotalMl);
    }

    [DbFact]
    public async Task Water_input_is_validated()
    {
        var user = await _factory.RegisterUserAsync();

        var zero = await user.Client.PostJsonAsync("/api/nutritiondiary/water", new { amountMl = 0 });
        var huge = await user.Client.PostJsonAsync("/api/nutritiondiary/water", new { amountMl = 6000 });
        var future = await user.Client.PostJsonAsync("/api/nutritiondiary/water", new { amountMl = 250, date = "2999-01-01" });
        var badDays = await user.Client.GetAsync("/api/nutritiondiary/water?days=99");

        Assert.Equal(HttpStatusCode.BadRequest, zero.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, huge.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, future.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, badDays.StatusCode);
    }
}
