using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Tests.Infrastructure;
using Xunit;
using static SmartMeal.Tests.Infrastructure.SqlHelper;

namespace SmartMeal.Tests;

/// <summary>Migration GroceryMergedCount: dòng cũ tạo từ thực đơn được đánh dấu để tạo lại thay được, món tự thêm thì không.</summary>
public class GroceryMigrationTests
{
    private const string PreviousMigration = "20261003034927_MealPlanUniqueSlot";
    private const string TargetMigration = "20261003035659_GroceryMergedCount";

    [DbFact]
    public async Task Old_generated_lines_count_as_one_meal_and_custom_lines_stay_at_zero()
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
                VALUES ('00000000-0000-0000-0000-0000000000c1','shop@example.com','Shop',true,false,'User',now(),0);

                INSERT INTO "Recipes" ("Id","Title","Instructions","PrepTimeMinutes","CookTimeMinutes","Servings","Difficulty","IsPremium",
                    "CaloriesPerServing","CarbsPerServing","FatPerServing","ProteinPerServing","CreatedAt")
                VALUES ('50000000-0000-0000-0000-0000000000b1','A','x',5,5,1,'Easy',false,300,10,10,20,now());

                INSERT INTO "GroceryItems" ("Id","UserId","IngredientName","Amount","Unit","Category","EstimatedPriceVnd","IsChecked","RecipeId","CreatedAt") VALUES
                 ('70000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c1','Ức gà',250,'g','Thịt',45000,false,'50000000-0000-0000-0000-0000000000b1',now()),
                 ('70000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000c1','Muối',1,'gói','Khác',0,false,NULL,now());
                """);

            await using (var db = new ApplicationDbContext(options))
            {
                await db.GetService<IMigrator>().MigrateAsync(TargetMigration);
            }

            Assert.Equal(1, await ScalarAsync<int>(connection,
                """SELECT "MergedFromRecipeCount" FROM "GroceryItems" WHERE "IngredientName" = 'Ức gà' """));
            Assert.Equal(0, await ScalarAsync<int>(connection,
                """SELECT "MergedFromRecipeCount" FROM "GroceryItems" WHERE "IngredientName" = 'Muối' """));
        }
        finally
        {
            await DropDatabaseAsync(admin, dbName);
        }
    }
}
