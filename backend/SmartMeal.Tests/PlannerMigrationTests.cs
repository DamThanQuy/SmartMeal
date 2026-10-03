using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Tests.Infrastructure;
using Xunit;
using static SmartMeal.Tests.Infrastructure.SqlHelper;

namespace SmartMeal.Tests;

/// <summary>Migration MealPlanUniqueSlot trên thực đơn cũ có ô bị trùng và tên bữa viết thường.</summary>
public class PlannerMigrationTests
{
    private const string PreviousMigration = "20261003034105_IngredientAllergens";
    private const string TargetMigration = "20261003034927_MealPlanUniqueSlot";

    [DbFact]
    public async Task Duplicate_slots_are_merged_keeping_the_completed_one_and_the_slot_becomes_unique()
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
                INSERT INTO "Users" ("Id","Email","FullName","IsEmailVerified","IsPro","Role","CreatedAt","FailedLoginCount")
                VALUES ('00000000-0000-0000-0000-0000000000f1','plan@example.com','Plan',true,false,'User',now(),0);

                INSERT INTO "Recipes" ("Id","Title","Instructions","PrepTimeMinutes","CookTimeMinutes","Servings","Difficulty","IsPremium",
                    "CaloriesPerServing","CarbsPerServing","FatPerServing","ProteinPerServing","CreatedAt")
                VALUES ('50000000-0000-0000-0000-0000000000a1','A','x',5,5,1,'Easy',false,300,10,10,20,now()),
                       ('50000000-0000-0000-0000-0000000000a2','B','x',5,5,1,'Easy',false,300,10,10,20,now());

                INSERT INTO "MealPlans" ("Id","UserId","PlanDate","MealType","RecipeId","IsCompleted") VALUES
                 ('60000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000f1','2026-08-03','Lunch','50000000-0000-0000-0000-0000000000a1',false),
                 ('60000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000f1','2026-08-03','lunch ','50000000-0000-0000-0000-0000000000a2',true),
                 ('60000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-0000000000f1','2026-08-03','dinner','50000000-0000-0000-0000-0000000000a1',false),
                 ('60000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-0000000000f1','2026-08-04','Lunch','50000000-0000-0000-0000-0000000000a1',false);
                """);

            await using (var db = new ApplicationDbContext(options))
            {
                await db.GetService<IMigrator>().MigrateAsync(TargetMigration);
            }

            Assert.Equal(3L, await ScalarAsync<long>(connection, """SELECT COUNT(*) FROM "MealPlans" """));
            Assert.Equal("60000000-0000-0000-0000-000000000002", (await ScalarAsync<Guid>(connection,
                """SELECT "Id" FROM "MealPlans" WHERE "PlanDate" = '2026-08-03' AND "MealType" = 'Lunch' """)).ToString());
            Assert.Equal(1L, await ScalarAsync<long>(connection, """SELECT COUNT(*) FROM "MealPlans" WHERE "MealType" = 'Dinner' """));

            var duplicate = await Assert.ThrowsAsync<PostgresException>(() => ExecuteAsync(connection, """
                INSERT INTO "MealPlans" ("Id","UserId","PlanDate","MealType","RecipeId","IsCompleted")
                VALUES ('60000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-0000000000f1','2026-08-03','Lunch','50000000-0000-0000-0000-0000000000a1',false);
                """));
            Assert.Equal(PostgresErrorCodes.UniqueViolation, duplicate.SqlState);
        }
        finally
        {
            await DropDatabaseAsync(admin, dbName);
        }
    }
}
