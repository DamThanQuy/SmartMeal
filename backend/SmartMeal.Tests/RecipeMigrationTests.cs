using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Tests.Infrastructure;
using Xunit;
using static SmartMeal.Tests.Infrastructure.SqlHelper;

namespace SmartMeal.Tests;

/// <summary>Migration IngredientAllergens trên dữ liệu cũ: chất gây dị ứng đơn lẻ được chép sang bảng N-N, công thức cũ không mất.</summary>
public class RecipeMigrationTests
{
    private const string PreviousMigration = "20261003033005_AiUsageQuota";
    private const string TargetMigration = "20261003034105_IngredientAllergens";

    [DbFact]
    public async Task Existing_ingredient_allergens_are_copied_and_old_recipes_default_to_every_meal()
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
                INSERT INTO "Ingredients" ("Id","Name","Category","DefaultUnit","EstimatedPriceVnd","CaloriesPer100g","CarbsPer100g",
                    "FatPer100g","ProteinPer100g","FiberPer100g","SugarPer100g","SodiumMgPer100g","AllergyId")
                VALUES ('40000000-0000-0000-0000-000000000001','Cá hồi','Seafood','g',65000,208,0,13,20,0,0,0,1),
                       ('40000000-0000-0000-0000-000000000002','Gạo lứt','Grain','g',8000,111,23,0.9,2.6,0,0,0,NULL);

                INSERT INTO "Recipes" ("Id","Title","Instructions","PrepTimeMinutes","CookTimeMinutes","Servings","Difficulty","IsPremium",
                    "CaloriesPerServing","CarbsPerServing","FatPerServing","ProteinPerServing","CreatedAt")
                VALUES ('50000000-0000-0000-0000-000000000001','Món cũ','Làm',5,5,1,'Easy',false,300,10,10,20,now());
                """);

            await using (var db = new ApplicationDbContext(options))
            {
                await db.GetService<IMigrator>().MigrateAsync(TargetMigration);
            }

            Assert.Equal(1L, await ScalarAsync<long>(connection, """SELECT COUNT(*) FROM "IngredientAllergies" """));
            Assert.Equal(1, await ScalarAsync<int>(connection,
                """SELECT "AllergyId" FROM "IngredientAllergies" WHERE "IngredientId" = '40000000-0000-0000-0000-000000000001' """));
            Assert.Equal(string.Empty, await ScalarAsync<string>(connection,
                """SELECT "MealTypes" FROM "Recipes" WHERE "Id" = '50000000-0000-0000-0000-000000000001' """));
        }
        finally
        {
            await DropDatabaseAsync(admin, dbName);
        }
    }
}
