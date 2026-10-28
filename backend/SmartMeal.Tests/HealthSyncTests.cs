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

/// <summary>Đồng bộ bước chân/calo vận động (Health Connect) đã bỏ ngày 27/10/2026: các endpoint /health-sync không còn.</summary>
public class HealthSyncTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public HealthSyncTests(ApiFactory factory) => _factory = factory;

    [DbFact]
    public async Task Health_sync_endpoints_are_gone()
    {
        var user = await _factory.RegisterUserAsync();

        var sync = await user.Client.PostJsonAsync("/api/health-sync/steps-and-calories",
            new { date = "2026-08-02", source = "Manual", steps = 1000, burnedCalories = 40 });
        var summary = await user.Client.GetAsync("/api/health-sync/daily-summary?date=2026-08-02");

        Assert.Equal(HttpStatusCode.NotFound, sync.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, summary.StatusCode);
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
