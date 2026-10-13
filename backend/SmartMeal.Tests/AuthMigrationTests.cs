using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Tests.Infrastructure;
using Xunit;
using static SmartMeal.Tests.Infrastructure.SqlHelper;

namespace SmartMeal.Tests;

/// <summary>Migration AuthSecurity trên dữ liệu cũ: GoogleId bị gắn trùng (do đăng nhập Google cũ không xác minh) phải được dọn.</summary>
public class AuthMigrationTests
{
    private const string PreviousMigration = "20261003015550_HealthSyncUniqueSource";
    private const string TargetMigration = "20261003020511_AuthSecurity";

    [DbFact]
    public async Task Migration_clears_duplicate_google_ids_keeping_the_oldest_account_and_enforces_uniqueness()
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
                INSERT INTO "Users" ("Id","Email","FullName","GoogleId","IsEmailVerified","IsPro","Role","CreatedAt") VALUES
                 ('00000000-0000-0000-0000-0000000000d1','old@example.com','Old','google-123',true,false,'User','2026-01-01 00:00:00+00'),
                 ('00000000-0000-0000-0000-0000000000d2','new@example.com','New','google-123',true,false,'User','2026-02-01 00:00:00+00'),
                 ('00000000-0000-0000-0000-0000000000d3','none@example.com','None',NULL,true,false,'User','2026-03-01 00:00:00+00'),
                 ('00000000-0000-0000-0000-0000000000d4','none2@example.com','None2',NULL,true,false,'User','2026-04-01 00:00:00+00');
                """);

            await using (var db = new ApplicationDbContext(options))
            {
                await db.GetService<IMigrator>().MigrateAsync(TargetMigration);
            }

            Assert.Equal("google-123", await ScalarAsync<string>(connection, """SELECT "GoogleId" FROM "Users" WHERE "Email" = 'old@example.com' """));
            Assert.True(await ScalarAsync<bool>(connection, """SELECT "GoogleId" IS NULL FROM "Users" WHERE "Email" = 'new@example.com' """));
            Assert.Equal(0, await ScalarAsync<int>(connection, """SELECT "FailedLoginCount" FROM "Users" WHERE "Email" = 'old@example.com' """));

            // Unique index có hiệu lực với GoogleId nhưng vẫn cho phép nhiều NULL.
            var duplicate = await Assert.ThrowsAsync<PostgresException>(() => ExecuteAsync(connection, """
                UPDATE "Users" SET "GoogleId" = 'google-123' WHERE "Email" = 'none@example.com'
                """));
            Assert.Equal(PostgresErrorCodes.UniqueViolation, duplicate.SqlState);

            Assert.Equal(0L, await ScalarAsync<long>(connection, """SELECT COUNT(*) FROM "RefreshTokens" """));
        }
        finally
        {
            await DropDatabaseAsync(admin, dbName);
        }
    }
}
