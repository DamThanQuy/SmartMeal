using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SmartMeal.Infrastructure.Data;
using SmartMeal.Tests.Infrastructure;
using Xunit;
using static SmartMeal.Tests.Infrastructure.SqlHelper;

namespace SmartMeal.Tests;

/// <summary>Migration FoodCatalog + bước bù dữ liệu lúc khởi động trên một database cũ đã có nguyên liệu.</summary>
public class FoodMigrationTests
{
    private const string PreviousMigration = "20261003035659_GroceryMergedCount";
    private const string TargetMigration = "20261003040410_FoodCatalog";

    [DbFact]
    public async Task Legacy_ingredients_become_verified_and_startup_fills_servings_search_text_and_dishes_once()
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
                VALUES ('40000000-0000-0000-0000-000000000001','Trứng gà','Dairy','quả',4000,155,1.1,11,13,0,0,0,4);
                """);

            await using (var db = new ApplicationDbContext(options))
            {
                await db.GetService<IMigrator>().MigrateAsync(TargetMigration);
            }

            Assert.True(await ScalarAsync<bool>(connection, """SELECT "IsVerified" FROM "Ingredients" """));
            Assert.True(await ScalarAsync<bool>(connection, """SELECT "OwnerUserId" IS NULL FROM "Ingredients" """));
            Assert.Equal(string.Empty, await ScalarAsync<string>(connection, """SELECT "SearchText" FROM "Ingredients" """));

            // Khởi động hai lần liên tiếp: lần hai không được tạo trùng gì.
            for (var run = 0; run < 2; run++)
            {
                await using var db = new ApplicationDbContext(options);
                await DbInitializer.SeedAsync(db);
            }

            Assert.Equal("trung ga", await ScalarAsync<string>(connection, """SELECT "SearchText" FROM "Ingredients" WHERE "Name" = 'Trứng gà' """));
            Assert.Equal(2L, await ScalarAsync<long>(connection, """SELECT COUNT(*) FROM "FoodServings" WHERE "IngredientId" = '40000000-0000-0000-0000-000000000001' """));
            Assert.Equal(1L, await ScalarAsync<long>(connection, """SELECT COUNT(*) FROM "Ingredients" WHERE "Name" = 'Phở bò' """));
            Assert.Equal(1L, await ScalarAsync<long>(connection, """SELECT COUNT(*) FROM "FoodServings" s JOIN "Ingredients" i ON i."Id" = s."IngredientId" WHERE i."Name" = 'Phở bò' AND s."IsDefault" """));
            Assert.Equal(1L, await ScalarAsync<long>(connection, """SELECT COUNT(*) FROM "IngredientAllergies" WHERE "IngredientId" = '40000000-0000-0000-0000-000000000001' """));
            Assert.False(await ScalarAsync<bool>(connection, """SELECT "IsVerified" FROM "Ingredients" WHERE "Name" = 'Phở bò' """));
        }
        finally
        {
            await DropDatabaseAsync(admin, dbName);
        }
    }
}
