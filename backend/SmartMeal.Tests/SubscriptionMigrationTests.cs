using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Tests.Infrastructure;
using Xunit;
using static SmartMeal.Tests.Infrastructure.SqlHelper;

namespace SmartMeal.Tests;

public class SubscriptionMigrationTests
{
    private const string PreviousMigration = "20261003021213_OtpFlow";
    private const string TargetMigration = "20261003032115_SubscriptionPayments";

    [DbFact]
    public async Task Existing_pro_accounts_become_premium_without_expiry_and_others_stay_free()
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
                INSERT INTO "Users" ("Id","Email","FullName","IsEmailVerified","IsPro","Role","CreatedAt","FailedLoginCount") VALUES
                 ('00000000-0000-0000-0000-0000000000e1','pro@example.com','Pro',true,true,'User',now(),0),
                 ('00000000-0000-0000-0000-0000000000e2','free@example.com','Free',true,false,'User',now(),0);
                """);

            await using (var db = new ApplicationDbContext(options))
            {
                await db.GetService<IMigrator>().MigrateAsync(TargetMigration);
            }

            Assert.Equal("Premium", await ScalarAsync<string>(connection, """SELECT "SubscriptionStatus" FROM "Users" WHERE "Email" = 'pro@example.com' """));
            Assert.Equal("Free", await ScalarAsync<string>(connection, """SELECT "SubscriptionStatus" FROM "Users" WHERE "Email" = 'free@example.com' """));
            Assert.True(await ScalarAsync<bool>(connection, """SELECT "ProExpiresAt" IS NULL FROM "Users" WHERE "Email" = 'pro@example.com' """));
            Assert.Equal(0L, await ScalarAsync<long>(connection, """SELECT COUNT(*) FROM "PaymentTransactions" """));
        }
        finally
        {
            await DropDatabaseAsync(admin, dbName);
        }
    }
}
