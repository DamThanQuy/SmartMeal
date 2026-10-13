using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Tests.Infrastructure;
using Xunit;
using static SmartMeal.Tests.Infrastructure.SqlHelper;

namespace SmartMeal.Tests;

/// <summary>P1-BE-09: đồng bộ sức khỏe idempotent theo (ngày, nguồn), không cộng trùng nguồn, trạng thái "chưa đồng bộ".</summary>
public class HealthSyncTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public HealthSyncTests(ApiFactory factory) => _factory = factory;

    private static async Task<HealthSyncSummaryPayload> GetSummaryAsync(HttpClient client, string date)
    {
        var response = await client.GetAsync($"/api/health-sync/daily-summary?date={date}");
        response.EnsureSuccessStatusCode();
        return (await response.ReadEnvelopeAsync<HealthSyncSummaryPayload>()).Data!;
    }

    private static Task<HttpResponseMessage> SyncAsync(HttpClient client, string date, string source, int steps, double burned, double distance = 0) =>
        client.PostJsonAsync("/api/health-sync/steps-and-calories", new { date, source, steps, burnedCalories = burned, distanceMeters = distance });

    [DbFact]
    public async Task A_day_without_any_sync_reports_no_sources_and_no_last_synced_time()
    {
        var user = await _factory.RegisterUserAsync();

        var summary = await GetSummaryAsync(user.Client, "2026-08-01");

        Assert.Empty(summary.Sources);
        Assert.Null(summary.ActiveSource);
        Assert.Null(summary.LastSyncedAt);
        Assert.Equal(0, summary.Steps);
        Assert.Equal(0, summary.BurnedCalories);
        Assert.Equal(10000, summary.StepGoal);
    }

    [DbFact]
    public async Task Posting_the_same_day_and_source_again_replaces_the_values()
    {
        var user = await _factory.RegisterUserAsync();

        (await SyncAsync(user.Client, "2026-08-02", "GoogleFit", 1000, 40)).EnsureSuccessStatusCode();
        var second = await SyncAsync(user.Client, "2026-08-02", "GoogleFit", 6240, 180, 4300);
        (await SyncAsync(user.Client, "2026-08-02", "GoogleFit", 6240, 180, 4300)).EnsureSuccessStatusCode(); // gửi lặp y hệt

        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Assert.Equal(6240, (await second.ReadEnvelopeAsync<SyncResultPayload>()).Data!.Steps);

        var summary = await GetSummaryAsync(user.Client, "2026-08-02");
        Assert.Equal(6240, summary.Steps);               // không phải 13480 như khi còn cộng dồn
        Assert.Equal(180, summary.BurnedCalories);
        Assert.Equal(4300, summary.DistanceMeters);
        Assert.Equal(new[] { "GoogleFit" }, summary.Sources);
        Assert.NotNull(summary.LastSyncedAt);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Equal(1, await db.HealthSyncLogs.CountAsync(l => l.UserId == user.Id));
    }

    [DbFact]
    public async Task The_highest_priority_source_is_used_and_sources_are_never_summed()
    {
        var user = await _factory.RegisterUserAsync();

        (await SyncAsync(user.Client, "2026-08-03", "GoogleFit", 5000, 200)).EnsureSuccessStatusCode();
        (await SyncAsync(user.Client, "2026-08-03", "HealthConnect", 6000, 250)).EnsureSuccessStatusCode();
        (await SyncAsync(user.Client, "2026-08-03", "Manual", 100, 5)).EnsureSuccessStatusCode();

        var summary = await GetSummaryAsync(user.Client, "2026-08-03");

        Assert.Equal(6000, summary.Steps);
        Assert.Equal(250, summary.BurnedCalories);
        Assert.Equal("HealthConnect", summary.ActiveSource);
        Assert.Equal(new[] { "HealthConnect", "GoogleFit", "Manual" }, summary.Sources);
    }

    [DbFact]
    public async Task Source_is_case_insensitive_and_an_unknown_source_is_rejected()
    {
        var user = await _factory.RegisterUserAsync();

        var lower = await SyncAsync(user.Client, "2026-08-04", "healthconnect", 100, 5);
        var unknown = await SyncAsync(user.Client, "2026-08-04", "Fitbit", 100, 5);

        Assert.Equal(HttpStatusCode.OK, lower.StatusCode);
        Assert.Equal("HealthConnect", (await lower.ReadEnvelopeAsync<SyncResultPayload>()).Data!.Source);
        Assert.Equal(HttpStatusCode.BadRequest, unknown.StatusCode);
    }

    [DbFact]
    public async Task Concurrent_syncs_for_one_day_and_source_end_with_a_single_record()
    {
        var user = await _factory.RegisterUserAsync();

        var responses = await Task.WhenAll(Enumerable.Range(1, 8).Select(i =>
            SyncAsync(user.Client, "2026-08-05", "AppleHealth", i * 1000, i * 10)));

        Assert.All(responses, r => Assert.Equal(HttpStatusCode.OK, r.StatusCode));
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Equal(1, await db.HealthSyncLogs.CountAsync(l => l.UserId == user.Id));
    }

    [DbFact]
    public async Task Invalid_values_are_rejected()
    {
        var user = await _factory.RegisterUserAsync();

        var negative = await SyncAsync(user.Client, "2026-08-06", "Manual", -1, 0);
        var huge = await SyncAsync(user.Client, "2026-08-06", "Manual", 100, 999999);
        var future = await SyncAsync(user.Client, "2999-01-01", "Manual", 100, 5);

        Assert.Equal(HttpStatusCode.BadRequest, negative.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, huge.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, future.StatusCode);
    }

    [DbFact]
    public async Task Summary_combines_eaten_and_burned_calories_with_the_target()
    {
        var user = await _factory.RegisterUserAsync();
        (await user.Client.PostJsonAsync("/api/nutritiondiary/log", new
        {
            logDate = "2026-08-07", mealType = "Lunch", foodName = "Cơm", servingSize = 100, unit = "g", calories = 500,
            carbsGrams = 1, fatGrams = 1, proteinGrams = 1, logMethod = "Manual"
        })).EnsureSuccessStatusCode();
        (await SyncAsync(user.Client, "2026-08-07", "HealthConnect", 8000, 200)).EnsureSuccessStatusCode();

        var summary = await GetSummaryAsync(user.Client, "2026-08-07");

        Assert.Equal(500, summary.ConsumedCalories);
        Assert.Equal(200, summary.BurnedCalories);
        Assert.Equal(300, summary.NetCalories);
        Assert.Equal(2000, summary.TargetCalories);      // chưa có hồ sơ → mục tiêu mặc định
        Assert.Equal(1700, summary.RemainingCalories);
    }

    [DbFact]
    public async Task The_legacy_field_names_are_still_accepted()
    {
        var user = await _factory.RegisterUserAsync();

        var response = await user.Client.PostJsonAsync("/api/health-sync/steps-and-calories", new
        {
            date = "2026-08-08", source = "GoogleFit", stepCount = 1234, activeCaloriesBurned = 56.5
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var summary = await GetSummaryAsync(user.Client, "2026-08-08");
        Assert.Equal(1234, summary.Steps);
        Assert.Equal(56.5, summary.BurnedCalories);
    }

    [DbFact]
    public async Task Another_users_data_is_not_visible()
    {
        var owner = await _factory.RegisterUserAsync();
        var other = await _factory.RegisterUserAsync();
        (await SyncAsync(owner.Client, "2026-08-09", "HealthConnect", 9999, 300)).EnsureSuccessStatusCode();

        var summary = await GetSummaryAsync(other.Client, "2026-08-09");

        Assert.Equal(0, summary.Steps);
        Assert.Empty(summary.Sources);
    }
}

/// <summary>Migration HealthSyncUniqueSource trên dữ liệu cũ (nhiều dòng cùng ngày/nguồn, nguồn lạ).</summary>
public class HealthSyncMigrationTests
{
    private const string PreviousMigration = "20261003015022_HealthProfileExtras";
    private const string TargetMigration = "20261003015550_HealthSyncUniqueSource";

    [DbFact]
    public async Task Migration_keeps_the_latest_row_per_day_and_source_and_normalizes_sources()
    {
        var (admin, dbName, connection) = NewDatabase("smartmeal_mig");
        var options = new DbContextOptionsBuilder<ApplicationDbContext>().UseNpgsql(connection).Options;

        try
        {
            await using (var db = new ApplicationDbContext(options))
            {
                await db.GetService<IMigrator>().MigrateAsync(PreviousMigration);
            }

            await ExecuteAsync(connection, """
                INSERT INTO "Users" ("Id","Email","FullName","IsEmailVerified","IsPro","Role","CreatedAt")
                VALUES ('00000000-0000-0000-0000-0000000000c1','legacy@example.com','Legacy',true,false,'User',now());

                INSERT INTO "HealthSyncLogs" ("Id","UserId","SyncDate","StepCount","ActiveCaloriesBurned","DistanceMeters","Source","SyncedAt") VALUES
                 ('40000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c1','2026-02-01',1000,10,100,'GoogleFit','2026-02-01 01:00:00+00'),
                 ('40000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000c1','2026-02-01',6240,180,4300,'googlefit','2026-02-01 03:00:00+00'),
                 ('40000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-0000000000c1','2026-02-01',500,5,50,'DevSample','2026-02-01 02:00:00+00'),
                 ('40000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-0000000000c1','2026-02-02',777,7,70,'HealthConnect','2026-02-02 02:00:00+00');
                """);

            await using (var db = new ApplicationDbContext(options))
            {
                await db.GetService<IMigrator>().MigrateAsync(TargetMigration);
            }

            Assert.Equal(3L, await ScalarAsync<long>(connection, """SELECT COUNT(*) FROM "HealthSyncLogs" """));
            // Bản mới nhất của (ngày 1, GoogleFit) được giữ, bản cũ bị bỏ.
            Assert.Equal(6240, await ScalarAsync<int>(connection, """
                SELECT "StepCount" FROM "HealthSyncLogs" WHERE "SyncDate" = '2026-02-01' AND "Source" = 'GoogleFit'
                """));
            // Nguồn lạ → Manual.
            Assert.Equal(500, await ScalarAsync<int>(connection, """
                SELECT "StepCount" FROM "HealthSyncLogs" WHERE "Source" = 'Manual'
                """));
            Assert.Equal(
                "GoogleFit,HealthConnect,Manual",
                await ScalarAsync<string>(connection, """SELECT string_agg(DISTINCT "Source", ',' ORDER BY "Source") FROM "HealthSyncLogs" """));
        }
        finally
        {
            await DropDatabaseAsync(admin, dbName);
        }
    }
}
